export async function onRequestPost({ env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  const OPENAI_KEY = env.OPENAI_API_KEY;

  const SUPABASE_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Leer knowledge_base de Supabase
    const configRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sofia_config?id=eq.1&select=knowledge_base`,
      { headers: SUPABASE_HEADERS }
    );
    if (!configRes.ok) throw new Error(`Error leyendo sofia_config: ${configRes.status}`);
    const [row] = await configRes.json();
    if (!row?.knowledge_base) throw new Error("knowledge_base está vacío.");

    // 2. Dividir en chunks por sección (## Título), ignorar < 100 chars
    const chunks = row.knowledge_base
      .split(/(?=^## )/m)
      .map(s => s.trim())
      .filter(s => s.length >= 100)
      .map(section => ({
        category: section.split("\n")[0].replace(/^##\s*/, "").trim(),
        content: section,
      }));

    // 3. Generar embeddings con OpenAI
    const chunksWithEmbeddings = await Promise.all(
      chunks.map(async chunk => {
        const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: chunk.content,
          }),
        });
        if (!embedRes.ok) throw new Error(`OpenAI error en "${chunk.category}": ${embedRes.status}`);
        const embedData = await embedRes.json();
        return { ...chunk, embedding: embedData.data[0].embedding };
      })
    );

    // 4. Borrar chunks existentes
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sofia_knowledge_chunks?id=gte.0`,
      { method: "DELETE", headers: SUPABASE_HEADERS }
    );
    if (!deleteRes.ok) throw new Error(`Error borrando chunks: ${deleteRes.status}`);

    // 5. Insertar nuevos chunks
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/sofia_knowledge_chunks`, {
      method: "POST",
      headers: { ...SUPABASE_HEADERS, "Prefer": "return=minimal" },
      body: JSON.stringify(chunksWithEmbeddings.map(({ category, content, embedding }) => ({
        category, content, embedding,
      }))),
    });
    if (!insertRes.ok) throw new Error(`Error insertando chunks: ${insertRes.status}`);

    return new Response(JSON.stringify({ success: true, chunks: chunks.length }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
