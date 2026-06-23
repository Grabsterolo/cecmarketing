export async function onRequestGet({ env }) {
  const accountId = env.META_AD_ACCOUNT_ID;
  const token = env.META_ACCESS_TOKEN;

  const fields = [
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "reach",
    "cpc",
    "ctr",
    "actions",
  ].join(",");

  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = today.toISOString().split("T")[0];

  const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=${fields}&time_range={"since":"${firstDay}","until":"${lastDay}"}&level=campaign&access_token=${token}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const campaigns = data.data || [];
    const totals = campaigns.reduce((acc, c) => {
      acc.spend += parseFloat(c.spend || 0);
      acc.impressions += parseInt(c.impressions || 0);
      acc.clicks += parseInt(c.clicks || 0);
      acc.reach += parseInt(c.reach || 0);
      const leads = c.actions?.find(a => a.action_type === "lead")?.value || 0;
      acc.leads += parseInt(leads);
      return acc;
    }, { spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0 });

    totals.cpl = totals.leads > 0
      ? (totals.spend / totals.leads).toFixed(2)
      : 0;

    return new Response(JSON.stringify({ campaigns, totals }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
