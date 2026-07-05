export async function onRequestPost({ request, env }) {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_NUMBER,
    ANTHROPIC_API_KEY,
    OPENAI_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = env;

  // 1. Parsear el body de Twilio (viene como form-urlencoded)
  const formData = await request.formData();
  const incomingMsg = formData.get("Body") || "";
  const from = formData.get("From") || "";

  if (!incomingMsg || !from) {
    return new Response("OK", { status: 200 });
  }

  // 2. Cargar sofia_config desde Supabase
  const configRes = await fetch(
    `${SUPABASE_URL}/rest/v1/sofia_config?select=system_prompt,knowledge_base&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );
  const configData = await configRes.json();
  const { system_prompt, knowledge_base } = configData[0] || {};

  const phoneHash = btoa(from).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);

  const sessionRes = await fetch(
    `${SUPABASE_URL}/rest/v1/sofia_whatsapp_sessions?phone_hash=eq.${phoneHash}&select=messages,updated_at&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  let existingMessages = [];
  if (sessionRes.ok) {
    const sessionData = await sessionRes.json();
    if (sessionData && sessionData.length > 0) {
      const lastUpdate = new Date(sessionData[0].updated_at);
      const hoursSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        existingMessages = sessionData[0].messages || [];
      }
      // Si tiene más de 4 horas: sesión nueva, existingMessages queda vacío
    }
  }

  // Agregar nuevo mensaje del usuario
  const recentMessages = [
    ...existingMessages,
    { role: "user", content: incomingMsg }
  ].slice(-20); // mantener últimos 20 mensajes (10 turnos)

  // 3. Hora actual en Costa Rica para el saludo
  const nowCR = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const hourCR = nowCR.getUTCHours();
  let franjaHoraria;
  if (hourCR >= 4 && hourCR < 12) {
    franjaHoraria = "mañana (usar 'Buenos días')";
  } else if (hourCR >= 12 && hourCR < 19) {
    franjaHoraria = "tarde (usar 'Buenas tardes')";
  } else {
    franjaHoraria = "noche (usar 'Buenas noches')";
  }
  const horaContexto = `\n\nCONTEXTO DE HORA: Son las ${hourCR}:${String(nowCR.getUTCMinutes()).padStart(2, "0")} en Costa Rica. Es de ${franjaHoraria}.`;

  // 4. Generar embedding para RAG
  let chunks = [];
  try {
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: incomingMsg,
      }),
    });
    if (embedRes.ok) {
      const embedData = await embedRes.json();
      const queryEmbedding = embedData.data[0].embedding;
      const ragRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/match_sofia_chunks`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query_embedding: queryEmbedding,
            match_count: 6,
            match_threshold: 0.5,
          }),
        }
      );
      if (ragRes.ok) chunks = await ragRes.json();
    }
  } catch {}

  // 5. Construir system prompt con caching
  const systemBlocks = [
    {
      type: "text",
      text: system_prompt + horaContexto,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (chunks.length > 0) {
    systemBlocks.push({
      type: "text",
      text:
        "BASE DE CONOCIMIENTO RELEVANTE PARA ESTA CONSULTA:\n\n" +
        chunks.map((c) => c.content).join("\n\n---\n\n"),
    });
  } else if (knowledge_base) {
    systemBlocks.push({
      type: "text",
      text:
        "INFORMACIÓN COMPLETA DEL CEC (usa solo lo relevante):\n\n" +
        knowledge_base,
    });
  }

  // 6. Llamar a Claude
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemBlocks,
      messages: recentMessages,
    }),
  });

  const claudeData = await claudeRes.json();
  const reply =
    claudeData.content?.[0]?.text ||
    "Disculpe, en este momento no puedo responder. Por favor contáctenos al 2290-2526.";

  const messagesWithReply = [
    ...recentMessages,
    { role: "assistant", content: reply }
  ].slice(-20);

  try {
    // Intentar actualizar primero
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sofia_whatsapp_sessions?phone_hash=eq.${phoneHash}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          messages: messagesWithReply,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    // Si no existe (0 filas actualizadas), insertar
    const updatedRows = updateRes.ok ? await updateRes.json() : [];
    if (!updateRes.ok || updatedRows.length === 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/sofia_whatsapp_sessions`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          phone_hash: phoneHash,
          messages: messagesWithReply,
          channel: "whatsapp_sandbox",
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } catch (e) {}

  // Detectar procedimiento de interés en el mensaje del usuario
  const procedureKeywords = {
    "aumento mamario": ["aumento", "implante", "senos", "mamaria", "mama", "pecho", "busto", "motiva", "talla"],
    "mastopexia": ["levantamiento", "mastopexia", "caídos", "caidos", "ptosis", "levantar senos"],
    "reducción mamaria": ["reducción", "reduccion", "grandes", "pesados", "reducir senos"],
    "mia femtech": ["mia", "femtech", "inyectable", "diamond"],
    "preserve": ["preservé", "preserve", "preservacion", "tejido propio"],
    "rinoplastia": ["nariz", "rinoplastia", "rino", "punta", "tabique", "puente"],
    "liposucción": ["lipo", "liposucción", "lipoescultura", "grasa", "vaser", "definición muscular"],
    "abdominoplastia": ["abdomen", "abdominoplastia", "tummy", "barriga", "piel suelta", "flacidez abdominal", "posparto", "post parto"],
    "lifting facial": ["lifting", "facelift", "rejuvenecimiento facial", "arrugas", "flacidez facial"],
    "blefaroplastia": ["párpados", "parpados", "ojos", "blefaroplastia", "bolsas ojos"],
    "otoplastia": ["orejas", "otoplastia", "orejas prominentes"],
    "gluteoplastia": ["glúteos", "gluteos", "pompas", "cola", "GEM", "nalgas", "trasero"],
    "ginecomastia": ["ginecomastia", "senos hombre", "pecho hombre"],
    "mommy makeover": ["mommy", "makeover", "posparto", "post embarazo", "múltiple"],
    "braquioplastia": ["brazos", "braquioplastia", "piel brazos", "lifting brazos"],
    "botox": ["botox", "toxina", "arrugas", "botulínica", "xeomin", "dysport", "patas de gallo", "entrecejo"],
    "radiesse": ["radiesse", "volumen", "bioestimulador", "relleno"],
    "harmonycA": ["harmonyce", "harmonyca", "lifting no quirúrgico"],
    "facetite": ["facetite", "papada", "cuello", "mandíbula", "papada grasa", "doble mentón"],
    "bodytite": ["bodytite", "reafirmar", "flacidez corporal"],
    "morpheus": ["morpheus", "microagujas", "radiofrecuencia", "morpheus burst"],
    "ultherapy": ["ultherapy", "ultrasonido facial", "hifu"],
    "liftera": ["liftera"],
    "oxygeneo": ["oxygeneo", "oxigenación", "luminosidad"],
    "limpieza facial": ["limpieza facial", "limpieza de cutis"],
    "cosmelan": ["cosmelan", "manchas", "peeling", "dermamelan", "melasma"],
    "depilación": ["depilación", "depilacion", "vello", "laser vello"],
    "carboxiterapia": ["carboxiterapia", "celulitis", "estrías", "estrias", "ojeras"],
    "paquetes": ["promoción", "promocion", "paquete", "precio", "costo", "cuánto", "cuanto", "oferta", "descuento", "julio"],
    "valoración": ["valoración", "valoracion", "cita", "agendar", "consulta", "quiero operarme", "decidí", "decidi"],
    "lipo papada": ["lipo papada", "papada grasa", "quantum rf", "lili"],
  };

  const msgLower = incomingMsg.toLowerCase();
  let detectedProcedure = null;
  for (const [procedure, keywords] of Object.entries(procedureKeywords)) {
    if (keywords.some(k => msgLower.includes(k))) {
      detectedProcedure = procedure;
      break;
    }
  }

  // Detectar intención de agendar
  const appointmentKeywords = ["agendar", "cita", "valoración", "valoracion", "cuándo", "cuando puedo", "disponible", "horario"];
  const wantsAppointment = appointmentKeywords.some(k => msgLower.includes(k));

  // Detectar si es lead caliente (escalamiento)
  const isHotLead = reply.includes("[ESCALAR");

  // Siempre guardar/actualizar — aunque no haya palabras clave detectadas
  // para registrar el conteo de mensajes y el escalamiento
  {
    const existingConvRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sofia_conversations?phone_hash=eq.${phoneHash}&order=created_at.desc&limit=1&select=id,procedure_interest,message_count,created_at`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const existingConv = await existingConvRes.json();

    // Solo reutilizar si fue creado hace menos de 4 horas (misma sesión)
    const sessionRecord = existingConv?.[0];
    const isActiveSameSession = sessionRecord &&
      (Date.now() - new Date(sessionRecord.created_at).getTime()) < 4 * 60 * 60 * 1000;

    if (isActiveSameSession) {
      // Actualizar registro existente
      await fetch(
        `${SUPABASE_URL}/rest/v1/sofia_conversations?id=eq.${sessionRecord.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            procedure_interest: detectedProcedure || sessionRecord.procedure_interest,
            derived_to_appointment: wantsAppointment || isHotLead,
            sentiment: isHotLead ? "hot_lead" : "neutral",
            message_count: (sessionRecord.message_count || 0) + 1,
          }),
        }
      );
    } else {
      // Crear nuevo registro
      const nowCRDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const period = `${nowCRDate.getUTCFullYear()}-${String(nowCRDate.getUTCMonth() + 1).padStart(2, "0")}`;
      await fetch(`${SUPABASE_URL}/rest/v1/sofia_conversations`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          phone_hash: phoneHash,
          channel: "whatsapp_sandbox",
          procedure_interest: detectedProcedure,
          derived_to_appointment: wantsAppointment || isHotLead,
          message_count: 1,
          sentiment: isHotLead ? "hot_lead" : "neutral",
          period: period,
        }),
      });
    }
  }

  // 7. Responder via Twilio
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: TWILIO_WHATSAPP_NUMBER,
      To: from,
      Body: reply,
    }),
  });

  // 8. Guardar conversación en Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/sofia_conversations`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      phone_hash: btoa(from).substring(0, 32),
      channel: "whatsapp_sandbox",
      message_count: 1,
      period: `${nowCR.getUTCFullYear()}-${String(nowCR.getUTCMonth() + 1).padStart(2, "0")}`,
    }),
  });

  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}
