export async function onRequestPost({ env }) {
  const {
    GA_CLIENT_ID, GA_CLIENT_SECRET, GA_REFRESH_TOKEN,
    META_ACCESS_TOKEN, META_AD_ACCOUNT_ID,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY,
  } = env;

  try {
    // 1. Obtener Access Token de Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GA_CLIENT_ID,
        client_secret: GA_CLIENT_SECRET,
        refresh_token: GA_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    const { access_token } = await tokenRes.json();

    // 2. Obtener datos de Meta Ads
    // Costa Rica es UTC-6
    const now = new Date();
    const crOffset = -6 * 60;
    const crTime = new Date(now.getTime() + (crOffset - now.getTimezoneOffset()) * 60000);
    const year = crTime.getFullYear();
    const month = String(crTime.getMonth() + 1).padStart(2, "0");
    const day = String(crTime.getDate()).padStart(2, "0");
    const lastDay = `${year}-${month}-${day}`;
    const firstDay = `${year}-${month}-01`;

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

    // 3. Obtener datos de Google Ads (Sheet más reciente)
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name+contains+'Rendimiento+de+Campa%C3%B1a'+and+mimeType='application/vnd.google-apps.spreadsheet'&orderBy=createdTime+desc&pageSize=1&fields=files(id,name)`,
      { headers: { "Authorization": `Bearer ${access_token}` } }
    );
    const driveData = await driveRes.json();
    const sheetId = driveData.files?.[0]?.id;

    let googleCampaigns = [];
    let googleTotals = { cost: 0, conversions: 0, clicks: 0 };

    if (sheetId) {
      const sheetRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Hoja 1!A1:O100`,
        { headers: { "Authorization": `Bearer ${access_token}` } }
      );
      const sheetData = await sheetRes.json();
      const rows = (sheetData.values || []).slice(1)
        .filter(r => r[1] === "Enabled" && parseFloat(r[8] || 0) > 0);

      googleCampaigns = rows.map(r => ({
        name: (r[0] || "").replace(/^[☀-⛿●️\s]+/u, "").trim(),
        cost: parseFloat(r[8] || 0),
        clicks: parseInt(r[3] || 0),
        conversions: Math.round(parseFloat(r[11] || 0) * 10) / 10,
        costPerConv: parseFloat(r[13] || 0),
      }));

      googleTotals = {
        cost: googleCampaigns.reduce((s, c) => s + c.cost, 0).toFixed(2),
        conversions: Math.round(googleCampaigns.reduce((s, c) => s + c.conversions, 0)),
        clicks: googleCampaigns.reduce((s, c) => s + c.clicks, 0),
      };
    }

    // 4. Obtener datos de Analytics
    const gaRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/353073837:runReport`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: firstDay, endDate: "today" }],
          dimensions: [{ name: "country" }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "keyEvents" },
          ],
          limit: 5,
        }),
      }
    );
    const gaData = await gaRes.json();
    const gaRows = gaData.rows || [];
    const analyticsTotals = {
      users: gaRows.reduce((s, r) => s + parseInt(r.metricValues[0].value || 0), 0),
      sessions: gaRows.reduce((s, r) => s + parseInt(r.metricValues[1].value || 0), 0),
      keyEvents: gaRows.reduce((s, r) => s + parseInt(r.metricValues[2].value || 0), 0),
      topCountry: gaRows[0]?.dimensionValues[0]?.value || "Costa Rica",
    };

    // 5. Construir contexto para Sofía
    const dataContext = {
      fecha: lastDay,
      meta: { totals: metaTotals, campaigns: metaCampaigns },
      google: { totals: googleTotals, campaigns: googleCampaigns },
      analytics: analyticsTotals,
    };

    const prompt = `Eres Sofía, la asistente de marketing del Centro Europeo de Cirugía (CEC) en Costa Rica.
Analiza los datos de marketing del mes actual y genera un reporte ejecutivo breve, claro y accionable.

DATOS DEL DÍA (${lastDay}):

META ADS:
- Gasto total: $${metaTotals.spend}
- Leads generados: ${metaTotals.leads}
- CPL promedio (solo campañas con leads): ${metaTotals.leads > 0 ? "$" + (parseFloat(metaTotals.spend) / metaTotals.leads).toFixed(2) : "N/A"}
- Campañas activas: ${metaCampaigns.length}
- Mejor campaña (menor CPL): ${metaCampaigns.filter(c => c.cpl).sort((a, b) => parseFloat(a.cpl) - parseFloat(b.cpl))[0]?.name || "N/A"} con CPL de $${metaCampaigns.filter(c => c.cpl).sort((a, b) => parseFloat(a.cpl) - parseFloat(b.cpl))[0]?.cpl || "N/A"}

GOOGLE ADS:
- Gasto total: $${googleTotals.cost}
- Conversiones: ${googleTotals.conversions}
- Clics: ${googleTotals.clicks}
- Costo por conversión: ${googleTotals.conversions > 0 ? "$" + (parseFloat(googleTotals.cost) / googleTotals.conversions).toFixed(2) : "N/A"}

SITIO WEB (cec.cr):
- Usuarios activos: ${analyticsTotals.users.toLocaleString()}
- Sesiones: ${analyticsTotals.sessions.toLocaleString()}
- Eventos clave: ${analyticsTotals.keyEvents}
- País principal: ${analyticsTotals.topCountry}

Genera un análisis en español con EXACTAMENTE este formato. NO agregues títulos adicionales, NO uses #, NO uses --, NO agregues fechas ni encabezados extra. Empieza directamente con **RESUMEN DEL DÍA**:

**RESUMEN DEL DÍA**
[2-3 oraciones con los datos más importantes y el estado general del marketing]

**LO QUE ESTÁ FUNCIONANDO**
- [observación positiva 1]
- [observación positiva 2]
- [observación positiva 3 si aplica]

**ÁREAS DE ATENCIÓN**
- [algo que merece revisión o ajuste]
- [otro punto de atención si aplica]

**RECOMENDACIONES**
1. [acción concreta y específica]
2. [acción concreta y específica]
3. [acción concreta y específica si aplica]

Sé específico con los números. Tono profesional pero directo. Máximo 300 palabras. Empieza con **RESUMEN DEL DÍA** sin nada antes.`;

    // 6. Llamar a Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const claudeData = await claudeRes.json();
    const analysis = claudeData.content?.[0]?.text || "No se pudo generar el análisis.";

    // 7. Guardar en Supabase
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
