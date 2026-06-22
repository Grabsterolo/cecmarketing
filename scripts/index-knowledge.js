#!/usr/bin/env node
/**
 * Indexa la base de conocimiento de Sofía en sofia_knowledge_chunks.
 *
 * Uso:
 *   node scripts/index-knowledge.js
 *
 * Variables de entorno requeridas (en .env.local):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// ── Cargar .env.local manualmente (sin dependencias extra) ────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // Si no existe .env.local se asume que las vars ya están en el entorno
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Faltan variables de entorno. Asegúrate de tener en .env.local:\n" +
    "  VITE_SUPABASE_URL\n  SUPABASE_SERVICE_ROLE_KEY\n  OPENAI_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── 1. Leer knowledge_base de Supabase ───────────────────────────────────────
async function fetchKnowledgeBase() {
  const { data, error } = await supabase
    .from("sofia_config")
    .select("knowledge_base")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Error leyendo sofia_config: ${error.message}`);
  if (!data?.knowledge_base) throw new Error("knowledge_base está vacío o no existe.");
  return data.knowledge_base;
}

// ── 2. Dividir en chunks por sección (## Título) ─────────────────────────────
function splitIntoChunks(text) {
  const sections = text.split(/(?=^## )/m).map(s => s.trim()).filter(Boolean);
  return sections.map(section => {
    const firstLine = section.split("\n")[0].replace(/^##\s*/, "").trim();
    return { category: firstLine, content: section };
  });
}

// ── 3. Generar embedding con OpenAI text-embedding-3-small ───────────────────
async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings error: ${err}`);
  }

  const json = await res.json();
  return json.data[0].embedding;
}

// ── 4. Upsert en sofia_knowledge_chunks ──────────────────────────────────────
async function upsertChunk(category, content, embedding) {
  const { error } = await supabase
    .from("sofia_knowledge_chunks")
    .upsert(
      { category, content, embedding },
      { onConflict: "category" }
    );

  if (error) throw new Error(`Error en upsert (${category}): ${error.message}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Leyendo knowledge_base de Supabase...");
  const knowledgeBase = await fetchKnowledgeBase();

  const chunks = splitIntoChunks(knowledgeBase);
  console.log(`${chunks.length} secciones encontradas:`);
  chunks.forEach((c, i) => console.log(`  ${i + 1}. ${c.category}`));

  console.log("\nGenerando embeddings e indexando...");
  let indexed = 0;

  for (const chunk of chunks) {
    process.stdout.write(`  → ${chunk.category}... `);
    const embedding = await embed(chunk.content);
    await upsertChunk(chunk.category, chunk.content, embedding);
    console.log("✓");
    indexed++;
  }

  console.log(`\n✅ ${indexed} chunks indexados exitosamente en sofia_knowledge_chunks.`);
}

main().catch(err => {
  console.error("\n❌", err.message);
  process.exit(1);
});
