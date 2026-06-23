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

    // 2. Dividir en chunks granulares (un chunk por procedimiento)
    const isProcedureLine = l => /^\*\*[^*]+\*\*$/.test(l.trim());

    function splitIntoChunks(text) {
      const result = [];
      const sections = text.split(/(?=^## )/m).map(s => s.trim()).filter(Boolean);

      for (const section of sections) {
        const sectionLines = section.split("\n");
        const hasProcedures = sectionLines.some(l => isProcedureLine(l));

        if (!hasProcedures) {
          if (section.length >= 80) {
            const category = sectionLines[0].replace(/^#+\s*/, "").trim();
            result.push({ category, content: section });
          }
          continue;
        }

        const subsections = section.split(/(?=^### )/m).map(s => s.trim()).filter(Boolean);

        for (const sub of subsections) {
          const subLines = sub.split("\n");
          const subHeader = subLines[0];
          const subHasProcedures = subLines.some(l => isProcedureLine(l));

          if (!subHasProcedures) {
            if (sub.length >= 80) {
              const category = subHeader.replace(/^#+\s*/, "").trim();
              result.push({ category, content: sub });
            }
            continue;
          }

          let currentName = null;
          let currentLines = [];

          for (const line of subLines) {
            if (isProcedureLine(line)) {
              if (currentName) {
                const content = currentLines.join("\n").trim();
                if (content.length >= 80) result.push({ category: currentName, content });
              }
              currentName = line.trim().replace(/\*\*/g, "");
              currentLines = [subHeader, line];
            } else if (currentName) {
              currentLines.push(line);
            }
          }

          if (currentName) {
            const content = currentLines.join("\n").trim();
            if (content.length >= 80) result.push({ category: currentName, content });
          }
        }
      }

      return result;
    }

    const chunks = splitIntoChunks(row.knowledge_base);

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
