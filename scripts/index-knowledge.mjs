#!/usr/bin/env node
/**
 * Re-indexa la base de conocimiento de Sofía en sofia_knowledge_chunks.
 *
 * Uso:
 *   npm run index-knowledge
 *
 * Variables de entorno requeridas (en .env.local):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 */

import { readFileSync } from "fs";

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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error(
    "Faltan variables de entorno. Asegúrate de tener en .env.local:\n" +
    "  VITE_SUPABASE_URL\n  SUPABASE_SERVICE_ROLE_KEY\n  OPENAI_API_KEY"
  );
  process.exit(1);
}

const SUPABASE_HEADERS = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// ── 1. Leer knowledge_base de Supabase ───────────────────────────────────────
async function fetchKnowledgeBase() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sofia_config?id=eq.1&select=knowledge_base`,
    { headers: SUPABASE_HEADERS }
  );
  if (!res.ok) throw new Error(`Error leyendo sofia_config: ${res.status} ${await res.text()}`);
  const [row] = await res.json();
  if (!row?.knowledge_base) throw new Error("knowledge_base está vacío o no existe.");
  return row.knowledge_base;
}

// ── 2. Dividir en chunks por sección (## Título) ─────────────────────────────
function splitIntoChunks(text) {
  return text
    .split(/(?=^## )/m)
    .map(s => s.trim())
    .filter(s => s.length >= 100)
    .map(section => {
      const firstLine = section.split("\n")[0].replace(/^##\s*/, "").trim();
      return { category: firstLine, content: section };
    });
}

// ── 3. Generar embedding con OpenAI text-embedding-3-small ───────────────────
async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

// ── 4. Borrar chunks existentes e insertar los nuevos ────────────────────────
async function deleteAllChunks() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sofia_knowledge_chunks?id=gte.0`,
    { method: "DELETE", headers: SUPABASE_HEADERS }
  );
  if (!res.ok) throw new Error(`Error borrando chunks: ${res.status} ${await res.text()}`);
}

async function insertChunk(category, content, embedding) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sofia_knowledge_chunks`, {
    method: "POST",
    headers: { ...SUPABASE_HEADERS, "Prefer": "return=minimal" },
    body: JSON.stringify({ category, content, embedding }),
  });
  if (!res.ok) throw new Error(`Error insertando chunk "${category}": ${res.status} ${await res.text()}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Leyendo knowledge_base de Supabase...");
  const knowledgeBase = await fetchKnowledgeBase();

  const chunks = splitIntoChunks(knowledgeBase);
  console.log(`${chunks.length} secciones encontradas:`);
  chunks.forEach((c, i) => console.log(`  ${i + 1}. ${c.category}`));

  console.log("\nBorrando índice anterior...");
  await deleteAllChunks();

  console.log("Generando embeddings e indexando...");
  for (const chunk of chunks) {
    process.stdout.write(`  → ${chunk.category}... `);
    const embedding = await embed(chunk.content);
    await insertChunk(chunk.category, chunk.content, embedding);
    console.log("✓");
  }

  console.log(`\n✅ Indexados ${chunks.length} chunks correctamente.`);
}

main().catch(err => {
  console.error("\n❌", err.message);
  process.exit(1);
});
