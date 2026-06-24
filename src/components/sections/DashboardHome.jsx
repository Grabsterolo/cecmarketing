import React, { useState, useEffect } from "react";
import { LayoutDashboard, BarChart2, MessageCircle, Sparkles } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { DATA_SOURCES } from "../../constants/nav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const NAV_BADGES = {
  metricas:        { label: "Meta conectado", bg: "rgba(74,124,92,0.15)",  color: "#4A7C5C" },
  analytics:       { label: "Conectado",      bg: "rgba(74,124,92,0.15)",  color: "#4A7C5C" },
  sofia:           { label: "Conectado",      bg: "rgba(74,124,92,0.15)",  color: "#4A7C5C" },
  recomendaciones: { label: "Próximamente",   bg: COLORS.panelAlt,         color: COLORS.textMuted },
};

function KpiCard({ label, value, sub, prominent, borderColor }) {
  return (
    <Card style={{ borderTop: `3px solid ${borderColor || COLORS.gold}` }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: prominent ? 42 : 30, fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: COLORS.green, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {sub}
      </p>
    </Card>
  );
}

function NavCard({ icon: Icon, title, description, navKey, onClick }) {
  const badge = NAV_BADGES[navKey];
  return (
    <Card style={{ cursor: "pointer", position: "relative" }} onClick={onClick}>
      {badge && (
        <span style={{
          position: "absolute", top: 14, right: 14,
          fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
          background: badge.bg, color: badge.color, fontFamily: "'Manrope', sans-serif",
        }}>
          {badge.label}
        </span>
      )}
      <Icon size={22} color={COLORS.gold} />
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: COLORS.green, margin: "12px 0 6px" }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </Card>
  );
}

function SourceStatusRow({ source }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600, fontFamily: "'Manrope', sans-serif" }}>{source.label}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
        background: source.connected ? "rgba(127,169,140,0.15)" : "rgba(220,38,38,0.08)",
        color: source.connected ? "#4A7C5C" : "#dc2626",
        fontFamily: "'Manrope', sans-serif",
      }}>
        {source.connected ? "Conectado" : "● Pendiente"}
      </span>
    </div>
  );
}

export function DashboardHome({ profile, setActive }) {
  const isMobile = useIsMobile();
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meta-metrics")
      .then(r => r.json())
      .then(data => { if (!data.error) setMetaData(data); })
      .catch(() => {})
      .finally(() => setMetaLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/analytics-metrics")
      .then(r => r.json())
      .then(data => { if (!data.error) setAnalyticsData(data); })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  const t = metaData?.totals;
  const spend = metaLoading ? "..." : `$${parseFloat(t?.spend || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const impressions = metaLoading ? "..." : `${parseInt(t?.impressions || 0).toLocaleString()}`;
  const clicks = metaLoading ? "..." : `${parseInt(t?.clicks || 0).toLocaleString()}`;
  const leads = metaLoading ? "..." : `${t?.leads || 0}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Tarjetas de navegación */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <NavCard icon={LayoutDashboard} title="Métricas"               navKey="metricas"        description="Campañas de Meta Ads en un solo lugar."                   onClick={() => setActive?.("metricas")} />
          <NavCard icon={BarChart2}       title="Sitio Web"              navKey="analytics"       description="Tráfico, usuarios y comportamiento en cec.cr."            onClick={() => setActive?.("analytics")} />
          <NavCard icon={MessageCircle}  title="Conversaciones de Sofía" navKey="sofia"           description="Qué pregunta la gente por WhatsApp, en tiempo real."       onClick={() => setActive?.("sofia")} />
          <NavCard icon={Sparkles}       title="Recomendaciones"         navKey="recomendaciones" description="Patrones detectados al cruzar campañas y conversaciones."  onClick={() => setActive?.("recomendaciones")} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <NavCard icon={LayoutDashboard} title="Métricas"               navKey="metricas"        description="Campañas de Meta Ads en un solo lugar."                   onClick={() => setActive?.("metricas")} />
          <NavCard icon={BarChart2}       title="Sitio Web"              navKey="analytics"       description="Tráfico, usuarios y comportamiento en cec.cr."            onClick={() => setActive?.("analytics")} />
          <NavCard icon={MessageCircle}  title="Conversaciones de Sofía" navKey="sofia"           description="Qué pregunta la gente por WhatsApp, en tiempo real."       onClick={() => setActive?.("sofia")} />
          <NavCard icon={Sparkles}       title="Recomendaciones"         navKey="recomendaciones" description="Patrones detectados al cruzar campañas y conversaciones."  onClick={() => setActive?.("recomendaciones")} />
        </div>
      )}

      {/* Separador */}
      <div style={{ height: 1, background: COLORS.border, margin: "4px 0 12px" }} />

      {/* KPIs — datos reales de Meta */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 16, marginBottom: 4 }}>
        <KpiCard label="Gasto Meta Ads"  value={spend}       sub="Este mes"              prominent={true} />
        <KpiCard label="Impresiones"     value={impressions} sub="Alcance total"         prominent={false} />
        <KpiCard label="Clics"           value={clicks}      sub="Al sitio web"          prominent={false} />
        <KpiCard label="Leads"           value={leads}       sub="Contactos generados"   prominent={false} />
      </div>

      {/* KPIs — Google Analytics */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EA4335", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
            Sitio Web — cec.cr
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16 }}>
          <KpiCard
            label="USUARIOS ACTIVOS"
            value={analyticsLoading ? "..." : analyticsData?.totals?.users?.toLocaleString() || "0"}
            sub="Este mes en cec.cr"
            borderColor="#EA4335"
          />
          <KpiCard
            label="SESIONES"
            value={analyticsLoading ? "..." : analyticsData?.totals?.sessions?.toLocaleString() || "0"}
            sub="Visitas totales"
            borderColor="#EA4335"
          />
          <KpiCard
            label="EVENTOS CLAVE"
            value={analyticsLoading ? "..." : analyticsData?.totals?.keyEvents?.toLocaleString() || "0"}
            sub="Consultas y conversiones"
            borderColor="#EA4335"
          />
          <KpiCard
            label="PAÍS PRINCIPAL"
            value={analyticsLoading ? "..." : analyticsData?.topCountries?.[0]?.country || "—"}
            sub={analyticsLoading ? "" : `${analyticsData?.topCountries?.[0]?.users?.toLocaleString() || 0} usuarios`}
            borderColor="#EA4335"
          />
        </div>
      </div>

      {/* Estado de fuentes */}
      <Card style={{ padding: "16px 20px" }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>
          Estado de las fuentes de datos
        </p>
        {DATA_SOURCES.map((source) => (
          <SourceStatusRow key={source.key} source={source} />
        ))}
        <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "10px 0 0", fontFamily: "'Manrope', sans-serif" }}>
          Meta Ads, Google Analytics y Google Ads conectados.
        </p>
      </Card>

    </div>
  );
}
