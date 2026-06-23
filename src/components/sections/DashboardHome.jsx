import React from "react";
import { LayoutDashboard, MessageCircle, Sparkles } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";
import { DATA_SOURCES } from "../../constants/nav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const KPIS = [
  { label: "Gasto total",       value: "₡1,240,000", sub: "Meta + Google este mes" },
  { label: "Leads generados",   value: "87",          sub: "Personas que dejaron sus datos" },
  { label: "Costo por lead",    value: "₡14,253",     sub: "Promedio entre plataformas" },
  { label: "Mejor plataforma",  value: "Meta Ads",    sub: "Menor costo por lead" },
];

function KpiCard({ label, value, sub }) {
  return (
    <Card style={{ borderTop: `3px solid ${COLORS.gold}` }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 30, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {sub}
      </p>
    </Card>
  );
}

function SourceStatusRow({ source }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 14, color: COLORS.text, fontWeight: 600 }}>{source.label}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
        background: source.connected ? "rgba(127,169,140,0.15)" : "rgba(31,74,64,0.08)",
        color: source.connected ? "#4A7C5C" : COLORS.textMuted,
      }}>
        {source.connected ? "Conectado" : "Pendiente"}
      </span>
    </div>
  );
}

export function DashboardHome({ profile, setActive }) {
  const isMobile = useIsMobile();

  const cards = (
    <>
      <Card style={{ cursor: "pointer" }} onClick={() => setActive?.("metricas")}>
        <LayoutDashboard size={22} color={COLORS.gold} />
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: COLORS.green, margin: "12px 0 6px" }}>Métricas</h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>Meta Ads y Google Ads / Analytics en un solo lugar.</p>
      </Card>
      <Card style={{ cursor: "pointer" }} onClick={() => setActive?.("sofia")}>
        <MessageCircle size={22} color={COLORS.gold} />
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: COLORS.green, margin: "12px 0 6px" }}>Conversaciones de Sofía</h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>Qué pregunta la gente por WhatsApp, en tiempo real.</p>
      </Card>
      <Card style={{ cursor: "pointer" }} onClick={() => setActive?.("recomendaciones")}>
        <Sparkles size={22} color={COLORS.gold} />
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: COLORS.green, margin: "12px 0 6px" }}>Recomendaciones</h3>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>Patrones detectados al cruzar campañas y conversaciones.</p>
      </Card>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{cards}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>{cards}</div>
      )}

      <div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", fontStyle: "italic", textAlign: "center" }}>
          Datos de ejemplo · Las métricas reales aparecerán cuando se conecten Meta y Google Ads
        </p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16 }}>
          {KPIS.map(k => <KpiCard key={k.label} {...k} />)}
        </div>
      </div>

      <Card>
        <CardHeader title="Estado de las fuentes de datos" />
        {DATA_SOURCES.map((source) => (
          <SourceStatusRow key={source.key} source={source} />
        ))}
        <p style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
          Meta y Google se conectan una vez CEC otorgue acceso de administrador a las cuentas publicitarias. Mientras tanto, el dashboard funciona con los datos de Sofía.
        </p>
      </Card>
    </div>
  );
}
