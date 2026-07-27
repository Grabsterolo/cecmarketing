export async function onRequestPost({ env }) {
  const {
    META_ACCESS_TOKEN, META_AD_ACCOUNT_ID,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY,
  } = env;

  try {
    // 1. Obtener datos de Meta Ads
    // Costa Rica es UTC-6
    const now = new Date();
    const crOffset = -6 * 60;
    const crTime = new Date(now.getTime() + (crOffset - now.getTimezoneOffset()) * 60000);

    // Ayer en Costa Rica
    const yesterday = new Date(crTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getDate()).padStart(2, "0");
    const lastDay = `${year}-${month}-${day}`;
    const firstDay = lastDay; // mismo día — solo ayer

    const metaFields = "campaign_name,spend,impressions,clicks,reach,cpc,ctr,actions";
    const metaUrl = `https://graph.facebook.com/v19.0/${META_AD_ACCOUNT_ID}/insights?fields=${metaFields}&time_range={"since":"${firstDay}","until":"${lastDay}"}&level=campaign&access_token=${META_ACCESS_TOKEN}`;
    const metaRes = await fetch(metaUrl);
    const metaData = await metaRes.json();

    const metaCampaigns = (metaData.data || []).map(c => ({
      name: c.campaign_name,
      spend: parseFloat(c.spend || 0),
      impressions: parseInt(c.impressions || 0),
      clicks: parseInt(c.clicks || 0),
      leads: parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0),
      cpl: c.actions?.find(a => a.action_type === "lead")?.value > 0
        ? (parseFloat(c.spend) / parseInt(c.actions.find(a => a.action_type === "lead").value)).toFixed(2)
        : null,
    }));

    const metaTotals = {
      spend: metaCampaigns.reduce((s, c) => s + c.spend, 0).toFixed(2),
      leads: metaCampaigns.reduce((s, c) => s + c.leads, 0),
      impressions: metaCampaigns.reduce((s, c) => s + c.impressions, 0),
    };

    // 2. Construir contexto para Sofía
    const dataContext = {
      fecha: lastDay,
      meta: { totals: metaTotals, campaigns: metaCampaigns },
    };

    const prompt = `Eres Sofía, la asistente de marketing del Centro Europeo de Cirugía (CEC) en Costa Rica.
Analiza los datos de marketing del mes actual y genera un reporte ejecutivo breve, claro y accionable.

DATOS DE AYER (${lastDay}):

META ADS:
- Gasto total: $${metaTotals.spend}
- Leads generados: ${metaTotals.leads}
- CPL promedio (solo campañas con leads): ${metaTotals.leads > 0 ? "$" + (parseFloat(metaTotals.spend) / metaTotals.leads).toFixed(2) : "N/A"}

Detalle por campaña:
${metaCampaigns.map(c => `  • ${c.name}: gasto $${c.spend.toFixed(2)}, leads: ${c.leads}${c.cpl ? ", CPL: $" + c.cpl : " (sin leads)"}`).join('\n')}

Genera un análisis en español de los resultados del día analizado.
Escribe como si le explicaras los resultados a alguien del equipo del CEC que no es experto en marketing digital — usa lenguaje simple, directo y humano. Evita tecnicismos. Cuando uses un número, explica qué significa.

Por ejemplo:
- En lugar de "CPL de $3.81" → "cada persona que dejó sus datos costó $3.81"
- En lugar de "tasa de conversión del 8.8%" → "de cada 100 personas que vieron el anuncio, casi 9 hicieron clic"

IMPORTANTE: En las secciones de 'LO QUE ESTÁ FUNCIONANDO' y 'ÁREAS DE ATENCIÓN', SIEMPRE menciona el nombre exacto de cada campaña relevante. Nunca digas 'algunas campañas' o 'varias campañas' sin nombrarlas. Si hay campañas que gastaron sin generar leads, lista cada una por nombre.

Con EXACTAMENTE este formato, sin agregar títulos extra, sin ##, sin --:

**RESUMEN DEL DÍA**
[2-3 oraciones simples explicando cómo le fue al CEC en publicidad. Como si le contaras a un colega en el pasillo.]

**LO QUE ESTÁ FUNCIONANDO**
- [observación positiva en lenguaje simple, con el número y su significado]
- [observación positiva 2]
- [observación positiva 3 si aplica]

**ÁREAS DE ATENCIÓN**
- [algo que merece revisión, explicado simplemente]
- [otro punto si aplica]

**QUÉ HACER HOY**
1. [acción concreta, específica y simple — que cualquiera entienda qué hacer]
2. [acción concreta 2]
3. [acción concreta 3 si aplica]

Máximo 250 palabras. Empieza directamente con **RESUMEN DEL DÍA**.`;

    // 3. Llamar a Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: "Eres Sofía, la asistente de marketing del Centro Europeo de Cirugía (CEC) en Costa Rica. Generas reportes ejecutivos diarios de marketing en lenguaje simple y accionable para el equipo del CEC.",
            cache_control: { type: "ephemeral" },
          }
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const claudeData = await claudeRes.json();
    const analysis = claudeData.content?.[0]?.text || "No se pudo generar el análisis.";

    // 4. Guardar en Supabase
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/sofia_recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        date: lastDay,
        analysis,
        data_snapshot: dataContext,
      }),
    });

    if (!supaRes.ok) {
      const err = await supaRes.text();
      return new Response(JSON.stringify({ error: "Error guardando en Supabase", detail: err }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, date: lastDay, analysis }), {
      status: 200,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
