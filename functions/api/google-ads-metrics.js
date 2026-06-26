export async function onRequestGet({ env }) {
  const { GA_CLIENT_ID, GA_CLIENT_SECRET, GA_REFRESH_TOKEN } = env;

  // 1. Obtener Access Token
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

  // DEBUG TEMPORAL
  const testSearch = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&orderBy=createdTime+desc&pageSize=5&fields=files(id,name,createdTime)`,
    { headers: { "Authorization": `Bearer ${accessToken}` } }
  );
  const testData = await testSearch.json();

  return new Response(JSON.stringify({
    debug: true,
    files: testData.files || [],
    error: testData.error || null,
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  // 2. Buscar el Sheet más reciente en Drive
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name+contains+'Rendimiento+de+Campa%C3%B1a'+and+mimeType='application/vnd.google-apps.spreadsheet'&orderBy=createdTime+desc&pageSize=1&fields=files(id,name,createdTime)`,
    { headers: { "Authorization": `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();

  if (!searchData.files || searchData.files.length === 0) {
    return new Response(JSON.stringify({ error: "No se encontró el reporte de Google Ads en Drive" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const sheetId = searchData.files[0].id;

  // 3. Leer el Sheet
  const range = "Hoja 1!A1:O100";
  const sheetRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
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

  // 4. Procesar filas
  const dataRows = rows.slice(1).filter(row =>
    row[1] === "Enabled" && parseFloat(row[8] || 0) > 0
  );

  const campaigns = dataRows.map(row => ({
    name: (row[0] || "").replace(/^[☀-⛿✀-➿\u{1F300}-\u{1F9FF}●○■□️\s]+/u, "").trim(),
    state: row[1] || "",
    type: row[2] || "",
    clicks: parseInt(row[3] || 0),
    impressions: parseInt(row[4] || 0),
    ctr: row[5] || "0%",
    avgCpc: parseFloat(row[7] || 0),
    cost: parseFloat(row[8] || 0),
    conversions: Math.round(parseFloat(row[11] || 0) * 10) / 10,
    costPerConv: parseFloat(row[13] || 0),
    convRate: row[14] || "0%",
  }));

  const totals = campaigns.reduce((acc, c) => {
    acc.clicks += c.clicks;
    acc.impressions += c.impressions;
    acc.cost += c.cost;
    acc.conversions = Math.round((acc.conversions + c.conversions) * 10) / 10;
    return acc;
  }, { clicks: 0, impressions: 0, cost: 0, conversions: 0 });

  totals.avgCpc = totals.clicks > 0
    ? (totals.cost / totals.clicks).toFixed(2) : 0;
  totals.costPerConv = totals.conversions > 0
    ? (totals.cost / totals.conversions).toFixed(2) : 0;

  return new Response(JSON.stringify({ campaigns, totals, sheetId }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
