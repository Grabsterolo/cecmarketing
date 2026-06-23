export async function onRequestGet({ env }) {
  const { GA_PROPERTY_ID, GA_CLIENT_ID, GA_CLIENT_SECRET, GA_REFRESH_TOKEN } = env;

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
    return new Response(JSON.stringify({ error: "No se pudo obtener el access token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [gaRes, pagesRes] = await Promise.all([
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: firstDay, endDate: "today" }],
        dimensions: [{ name: "country" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "keyEvents" },
        ],
        limit: 20,
      }),
    }),
    fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: firstDay, endDate: "today" }],
        dimensions: [
          { name: "pageTitle" },
          { name: "pagePath" },
        ],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
    }),
  ]);

  const [gaData, pagesData] = await Promise.all([gaRes.json(), pagesRes.json()]);

  if (gaData.error) {
    return new Response(JSON.stringify({ error: gaData.error.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const rows = gaData.rows || [];

  const totals = rows.reduce((acc, row) => {
    acc.users += parseInt(row.metricValues[0].value || 0);
    acc.sessions += parseInt(row.metricValues[1].value || 0);
    acc.pageViews += parseInt(row.metricValues[2].value || 0);
    acc.keyEvents += parseInt(row.metricValues[5].value || 0);
    return acc;
  }, { users: 0, sessions: 0, pageViews: 0, keyEvents: 0 });

  const countriesMap = {};
  rows.forEach(row => {
    const country = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value || 0);
    countriesMap[country] = (countriesMap[country] || 0) + users;
  });
  const topCountries = Object.entries(countriesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, users]) => ({ country, users }));

  const channelsMap = {};
  rows.forEach(row => {
    const channel = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[1].value || 0);
    channelsMap[channel] = (channelsMap[channel] || 0) + sessions;
  });
  const channels = Object.entries(channelsMap)
    .sort((a, b) => b[1] - a[1])
    .map(([channel, sessions]) => ({ channel, sessions }));

  const topPages = (pagesData.rows || []).map(row => ({
    title: row.dimensionValues[0].value,
    path: row.dimensionValues[1].value,
    views: parseInt(row.metricValues[0].value || 0),
    users: parseInt(row.metricValues[1].value || 0),
    avgDuration: Math.round(parseFloat(row.metricValues[2].value || 0)),
  }));

  return new Response(JSON.stringify({ totals, topCountries, channels, topPages }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
