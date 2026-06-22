export async function onRequestPost({ request, env }) {
  const { system, knowledge_base, messages } = await request.json();

  // 1. Generar embedding del último mensaje del usuario
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
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
        input: lastUserMessage,
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
          match_count: 4,
          match_threshold: 0.7,
        }),
      });

      if (ragRes.ok) {
        chunks = await ragRes.json();
      }
    }
  } catch {
    // RAG falla silenciosamente — Sofía responde igual sin chunks
  }

  // 3. Construir system prompt con caching
  const systemBlocks = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (chunks.length > 0) {
    systemBlocks.push({
      type: "text",
      text: "BASE DE CONOCIMIENTO RELEVANTE PARA ESTA CONSULTA:\n\n" +
        chunks.map(c => c.content).join("\n\n---\n\n"),
    });
  }

  // 4. Llamar a Claude con prompt caching habilitado
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
      messages,
    }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
