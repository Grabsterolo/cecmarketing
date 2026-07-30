export async function onRequestPost({ request, env }) {
  if (request.headers.get("x-sofia-secret") !== env.SOFIA_CHAT_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const { system: systemFromClient, knowledge_base: kbFromClient, messages } = await request.json();

  let system = systemFromClient;
  let knowledge_base = kbFromClient;

  // Si no vienen del cliente (SofiaPublic), cargarlos desde Supabase
  if (!system || !knowledge_base) {
    try {
      const configRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/sofia_config?select=system_prompt,knowledge_base&limit=1`,
        {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (configRes.ok) {
        const configData = await configRes.json();
        system = system || configData[0]?.system_prompt;
        knowledge_base = knowledge_base || configData[0]?.knowledge_base;
      }
    } catch {}
  }

  // 1. Generar embedding combinando los últimos 2 mensajes del usuario (contexto multi-turno)
  const searchQuery = messages
    .filter(m => m.role === "user")
    .slice(-2)
    .map(m => m.content)
    .join(" ");
  let chunks = [];

  try {
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: searchQuery,
      }),
    });

    if (embedRes.ok) {
      const embedData = await embedRes.json();
      const queryEmbedding = embedData.data[0].embedding;

      // 2. Buscar chunks relevantes en Supabase
      const ragRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/match_sofia_chunks`, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_count: 6,
          // 0.5 estaba por debajo del "piso de ruido" real de este corpus:
          // pares de chunks NO relacionados ya promedian ~0.507 de similitud
          // coseno entre sí (medido sobre los 79 chunks reales), así que el
          // umbral casi nunca filtraba nada — match_sofia_chunks devolvía
          // resultados aunque no hubiera nada realmente relevante, lo cual
          // apagaba el fallback de mandar el knowledge_base completo.
          match_threshold: 0.3,
        }),
      });

      if (ragRes.ok) {
        chunks = await ragRes.json();
      }
    }
  } catch {
    // RAG falla silenciosamente — Sofía responde igual sin chunks
  }

  // Hora actual en Costa Rica (UTC-6)
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
  const horaContexto = `\n\nCONTEXTO DE HORA: Son las ${hourCR}:${String(nowCR.getUTCMinutes()).padStart(2,'0')} en Costa Rica. Es de ${franjaHoraria}.`;

  // 3. Construir system prompt con caching
  const systemBlocks = [
    {
      type: "text",
      text: system + horaContexto,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (chunks.length > 0) {
    systemBlocks.push({
      type: "text",
      text: "BASE DE CONOCIMIENTO RELEVANTE PARA ESTA CONSULTA:\n\n" +
        chunks.map(c => c.content).join("\n\n---\n\n"),
    });
  } else if (knowledge_base) {
    systemBlocks.push({
      type: "text",
      text: "INFORMACIÓN COMPLETA DEL CEC (usa solo lo relevante para la pregunta del paciente):\n\n" + knowledge_base,
      cache_control: { type: "ephemeral" },
    });
  }

  // 4. Llamar a Claude con prompt caching habilitado
  // Los mensajes que vienen del cliente (TestSofiaSection) traen campos
  // propios de la UI (escalated, escalation_reason) pegados a los turnos del
  // asistente para pintar el badge de escalación — la API de Claude rechaza
  // con 400 cualquier campo que no sea role/content ("Extra inputs are not
  // permitted"), así que hay que limpiarlos antes de reenviarlos.
  const claudeMessages = messages.map(({ role, content }) => ({ role, content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemBlocks,
      messages: claudeMessages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: data?.error?.message || "Error llamando a Claude", detail: data }), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  }

  const rawText = data?.content?.[0]?.text ?? "";
  const escalationMatch = rawText.match(/\[ESCALAR:?\s*([^\]]*)\]/i);
  const escalated = !!escalationMatch;
  const escalation_reason = escalated ? (escalationMatch[1].trim() || null) : null;
  const reply = rawText.replace(/\s*\[ESCALAR:?\s*([^\]]*)\]\s*/i, " ").trim();

  return new Response(JSON.stringify({ ...data, reply, escalated, escalation_reason }), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
