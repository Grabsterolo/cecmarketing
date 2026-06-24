export async function onRequestGet({ env }) {
  const { GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEETS_ID } = env;

  let credentials;
  try {
    credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch {
    return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }

  // 1. Generar JWT para autenticación con Google
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj) => btoa(JSON.stringify(obj))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemKey = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwt = `${signingInput}.${sigB64}`;

  // 2. Obtener Access Token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "No se pudo autenticar con Google" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  // 3. Leer el Google Sheet
  const range = "Sheet1!A1:O100";
  const sheetRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}`,
    { headers: { "Authorization": `Bearer ${accessToken}` } }
  );
  const sheetData = await sheetRes.json();

  if (sheetData.error) {
    return new Response(JSON.stringify({ error: sheetData.error.message }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  const rows = sheetData.values || [];
  if (rows.length < 2) {
    return new Response(JSON.stringify({ campaigns: [], totals: {} }), {
      status: 200, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // 4. Procesar filas — fila 1 es header, fila 2+ son datos
  // Columnas: A=Campaign, B=Campaign state, C=Campaign type,
  // D=Clicks, E=Impr., F=CTR, H=Avg. CPC, I=Cost, L=Conversions,
  // N=Cost/conv., O=Conv. rate
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
