import React, { useState, useEffect } from "react";
import { Flame, ExternalLink, Copy, Check } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { supabase } from "../../lib/supabase.js";

const WINDOW_DAYS = 14;

// --- Clasificación del procedimiento (0-40 / 22 / 8 pts) -------------------
// Sin distinguir mayúsculas ni tildes, por eso todo se normaliza antes de
// comparar. "ALTO" son cirugías (ticket más alto, decisión más lenta pero
// de mayor valor); el resto de tratamientos no quirúrgicos con nombre
// reconocible caen en "MEDIO"; sin procedimiento identificado o genérico
// ("información general", vacío, etc.) es "BAJO".
function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const CIRUGIA_KEYWORDS = [
  "abdominoplastia", "lifting facial", "rinoplastia", "aumento mamario",
  "mastopexia", "liposuccion", "lipoescultura", "mastectomia",
  "mia femtech", "preserve", "reconstruccion mamaria", "reduccion mamaria",
  "braquioplastia", "ginecomastia", "gluteoplastia", "gem", "mommy makeover",
  "remodelacion costal", "blefaroplastia", "otoplastia", "lobuloplastia",
  "cirugia",
];

const GENERICO_KEYWORDS = [
  "informacion general", "consulta general", "no especificado", "general",
];

function procedureScore(procedureInterest) {
  const p = normalize(procedureInterest);
  if (!p) return 8;
  if (CIRUGIA_KEYWORDS.some((kw) => p.includes(kw))) return 40;
  if (GENERICO_KEYWORDS.some((kw) => p.includes(kw))) return 8;
  return 22; // cualquier tratamiento no quirúrgico con nombre reconocible
}

function sentimentScore(sentiment) {
  const s = normalize(sentiment);
  if (s === "positivo") return 25;
  if (s === "negativo") return 0;
  if (s === "neutral") return 10;
  return 10; // null / sin clasificar
}

function engagementScore(messageCount) {
  const n = messageCount || 0;
  if (n >= 5) return 15;
  if (n >= 2) return 8;
  return 0;
}

function recencyScore(createdAt) {
  if (!createdAt) return 3;
  const hoursAgo = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hoursAgo < 6) return 20;
  if (hoursAgo < 24) return 14;
  if (hoursAgo < 72) return 8;
  return 3;
}

// Score total 0-100: valor del procedimiento (0-40) + sentimiento (0-25) +
// engagement por cantidad de mensajes (0-15) + recencia (0-20). Es una v1
// basada solo en datos que ya existen en sofia_conversations — no incluye
// tiempo de respuesta del asesor humano porque ese timestamp todavía no se
// registra en ningún lado (ver Worker cec-sofia-whatsapp, proyecto aparte).
function computeScore(conv) {
  return (
    procedureScore(conv.procedure_interest) +
    sentimentScore(conv.sentiment) +
    engagementScore(conv.message_count) +
    recencyScore(conv.created_at)
  );
}

function scoreTier(score) {
  if (score >= 70) return "alto";
  if (score >= 40) return "medio";
  return "bajo";
}

const TIER_STYLES = {
  alto: { bg: "rgba(220,38,38,0.1)", fg: "#dc2626" },
  medio: { bg: "rgba(201,162,78,0.14)", fg: COLORS.gold },
  bajo: { bg: "rgba(31,74,64,0.08)", fg: COLORS.textMuted },
};

const SENTIMENT_LABEL = {
  positivo: { label: "Positivo", fg: COLORS.green, bg: "rgba(31,74,64,0.08)" },
  neutral: { label: "Neutral", fg: COLORS.textMuted, bg: "rgba(31,74,64,0.06)" },
  negativo: { label: "Negativo", fg: "#dc2626", bg: "rgba(220,38,38,0.08)" },
};

function formatRelative(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "justo ahora";
  if (mins < 60) return `hace ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function ScoreBadge({ score }) {
  const tier = scoreTier(score);
  const style = TIER_STYLES[tier];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      width: 52, height: 52, borderRadius: 12, background: style.bg, flexShrink: 0,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: style.fg, fontFamily: "'Manrope', sans-serif", lineHeight: 1 }}>
        {score}
      </span>
    </div>
  );
}

function ZenviaButton({ prospectId, phoneNumber }) {
  const [copied, setCopied] = useState(false);
  const zenviaBase = import.meta.env.VITE_ZENVIA_WEB_BASE_URL;

  if (prospectId && zenviaBase) {
    return (
      <a
        href={`${zenviaBase}${prospectId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: COLORS.green, color: "white", border: "none", borderRadius: 8,
          padding: "8px 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "'Manrope', sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        <ExternalLink size={13} />
        Abrir en Zenvia
      </a>
    );
  }

  // Fallback: todavía no está confirmado el formato exacto de la URL de
  // Zenvia Conversion (o no hay prospect_id para esta fila) — copiamos el
  // teléfono para que el equipo lo busque a mano mientras tanto.
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(phoneNumber || "");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard puede fallar por permisos del navegador — no hay
          // mucho más que hacer que dejar el botón como estaba
        }
      }}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: COLORS.panelAlt, color: COLORS.green, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
        fontFamily: "'Manrope', sans-serif", cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copiado — buscalo en Zenvia" : "Copiar teléfono"}
    </button>
  );
}

function LeadRow({ conv }) {
  const score = computeScore(conv);
  const sentimentInfo = SENTIMENT_LABEL[normalize(conv.sentiment)];

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <ScoreBadge score={score} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>
              {conv.procedure_interest || "Procedimiento no especificado"}
            </p>
            {sentimentInfo && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: sentimentInfo.bg, color: sentimentInfo.fg, fontFamily: "'Manrope', sans-serif",
              }}>
                {sentimentInfo.label}
              </span>
            )}
            {conv.escalated && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "rgba(201,162,78,0.14)", color: COLORS.gold, fontFamily: "'Manrope', sans-serif",
              }}>
                Escalada
              </span>
            )}
            <span style={{ fontSize: 11.5, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
              {formatRelative(conv.created_at)}
            </span>
          </div>

          {conv.escalation_reason && (
            <p style={{ margin: "0 0 4px", fontSize: 12.5, color: COLORS.text, fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>
              {conv.escalation_reason}
            </p>
          )}

          <p style={{ margin: 0, fontSize: 11.5, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
            {conv.message_count || 0} mensajes · {conv.channel || "whatsapp"} · {conv.phone_number || "sin número"}
          </p>
        </div>

        <ZenviaButton prospectId={conv.prospect_id} phoneNumber={conv.phone_number} />
      </div>
    </Card>
  );
}

export function LeadsCalientesSection() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("sofia_conversations")
        .select("id, phone_number, procedure_interest, sentiment, message_count, escalated, escalation_reason, created_at, channel, prospect_id")
        .gte("created_at", sinceIso)
        .or("derived_to_appointment.is.null,derived_to_appointment.eq.false")
        .or("escalated.eq.true,and(sentiment.eq.positivo,message_count.gte.3)")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setConversations(data || []);
      setLoading(false);
    })();
  }, []);

  const sorted = [...conversations].sort((a, b) => computeScore(b) - computeScore(a));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Flame size={20} color={COLORS.gold} />
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
          Leads Potenciales
        </h2>
      </div>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        Conversaciones de Sofía de los últimos {WINDOW_DAYS} días con más potencial de venta, ordenadas por score — a quién contactar primero.
      </p>

      {error && (
        <div style={{
          background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: 8, padding: "10px 14px", fontSize: 13,
          color: "#dc2626", fontFamily: "'Manrope', sans-serif", marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {loading && (
        <p style={{ textAlign: "center", fontSize: 14, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", padding: "40px 0" }}>
          Cargando leads...
        </p>
      )}

      {!loading && !error && sorted.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 28, color: COLORS.gold, marginBottom: 12 }}>✦</div>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>
              Sin leads potenciales por ahora
            </p>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
              No hay conversaciones escaladas o con buen engagement en los últimos {WINDOW_DAYS} días que no se hayan convertido ya.
            </p>
          </div>
        </Card>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div>
          {sorted.map((conv) => <LeadRow key={conv.id} conv={conv} />)}
        </div>
      )}
    </div>
  );
}
