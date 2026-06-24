export async function onRequestGet({ env }) {
  const { GA_CLIENT_ID, GA_CLIENT_SECRET, GA_REFRESH_TOKEN, GOOGLE_SHEETS_ID } = env;

  // 1. Obtener Access Token con Refresh Token (mismo mecanismo que Analytics)
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
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "No se pudo autenticar con Google" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // 2. Leer el Google Sheet
  const range = "Hoja 1!A1:O100";
  const sheetRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}`,
    { headers: { "Authorization": `Bearer ${accessToken}` } }
  );
  const sheetData = await sheetRes.json();

  if (sheetData.error) {
    return new Response(JSON.stringify({ error: sheetData.error.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const rows = sheetData.values || [];
  if (rows.length < 2) {
    return new Response(JSON.stringify({ campaigns: [], totals: {} }), {
      status: 200,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 3. Procesar filas — fila 1 es header, fila 2+ son datos
  const dataRows = rows.slice(1).filter(row =>
    row[1] === "Enabled" && parseFloat(row[8] || 0) > 0
  );

  const campaigns = dataRows.map(row => ({
    name: row[0] || "",
    state: row[1] || "",
    type: row[2] || "",
    clicks: parseInt(row[3] || 0),
    impressions: parseInt(row[4] || 0),
    ctr: row[5] || "0%",
    avgCpc: parseFloat(row[7] || 0),
    cost: parseFloat(row[8] || 0),
    conversions: parseFloat(row[11] || 0),
    costPerConv: parseFloat(row[13] || 0),
    convRate: row[14] || "0%",
  }));

  const totals = campaigns.reduce((acc, c) => {
    acc.clicks += c.clicks;
    acc.impressions += c.impressions;
    acc.cost += c.cost;
    acc.conversions += c.conversions;
    return acc;
  }, { clicks: 0, impressions: 0, cost: 0, conversions: 0 });

  totals.avgCpc = totals.clicks > 0
    ? (totals.cost / totals.clicks).toFixed(2) : 0;
  totals.costPerConv = totals.conversions > 0
    ? (totals.cost / totals.conversions).toFixed(2) : 0;

  return new Response(JSON.stringify({ campaigns, totals }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
