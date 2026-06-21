import React, { useEffect, useState } from "react";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";
import { supabase } from "../../lib/supabase.js";

function ConversationRow({ conv }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: COLORS.panelAlt, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <MessageCircle size={16} color={COLORS.gold} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text }}>
            {conv.topic || "Tema sin clasificar"}
          </span>
          <span style={{ fontSize: 11.5, color: COLORS.textMuted, whiteSpace: "nowrap" }}>
            {new Date(conv.created_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
          </span>
        </div>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "4px 0 0", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {conv.last_message || "—"}
        </p>
        {conv.escalated && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: COLORS.gold, marginTop: 6 }}>
            <ArrowUpRight size={12} /> Escalado a asesor
          </span>
        )}
      </div>
    </div>
  );
}

export function SofiaConversationsSection() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      // Esta tabla se llena cuando el backend de WhatsApp (Zenvia + Sofía)
      // esté en producción. Hasta entonces la consulta puede devolver vacío.
      const { data, error: fetchError } = await supabase
        .from("sofia_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!mounted) return;
      if (fetchError) setError(fetchError.message);
      else setConversations(data || []);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const topicCounts = conversations.reduce((acc, c) => {
    const key = c.topic || "Sin clasificar";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Card>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>Conversaciones (30 más recientes)</span>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: COLORS.green, marginTop: 4 }}>
            {conversations.length}
          </div>
        </Card>
        <Card>
          <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600 }}>Escaladas a un asesor</span>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: COLORS.green, marginTop: 4 }}>
            {conversations.filter(c => c.escalated).length}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Temas más frecuentes" />
        {topTopics.length === 0 ? (
          <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>Todavía no hay conversaciones registradas.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topTopics.map(([topic, count]) => (
              <div key={topic} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: COLORS.text, width: 160, flexShrink: 0, fontWeight: 600 }}>{topic}</span>
                <div style={{ flex: 1, height: 8, background: COLORS.panelAlt, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${(count / topTopics[0][1]) * 100}%`, height: "100%",
                    background: `linear-gradient(90deg, ${COLORS.goldSoft}, ${COLORS.gold})`,
                  }} />
                </div>
                <span style={{ fontSize: 12.5, color: COLORS.textMuted, width: 24, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Conversaciones recientes" />
        {loading && <p style={{ fontSize: 13.5, color: COLORS.textMuted }}>Cargando...</p>}
        {error && (
          <p style={{ fontSize: 13, color: "#e07070", lineHeight: 1.6 }}>
            No se pudo conectar a la tabla de conversaciones todavía. Esto es esperado hasta que el backend de WhatsApp esté escribiendo en Supabase.
          </p>
        )}
        {!loading && !error && conversations.length === 0 && (
          <p style={{ fontSize: 13.5, color: COLORS.textMuted, margin: 0 }}>
            Aún no hay conversaciones. En cuanto el agente de WhatsApp esté en producción, aparecerán aquí automáticamente.
          </p>
        )}
        {conversations.map((conv) => (
          <ConversationRow key={conv.id} conv={conv} />
        ))}
      </Card>
    </div>
  );
}
