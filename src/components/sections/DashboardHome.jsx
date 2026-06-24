import React, { useState, useEffect } from "react";
import { LayoutDashboard, BarChart2, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { DATA_SOURCES } from "../../constants/nav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const NAV_BADGES = {
  metricas:        { label: "Meta conectado", bg: "rgba(74,124,92,0.15)",  color: "#4A7C5C" },
  analytics:       { label: "Conectado",      bg: "rgba(74,124,92,0.15)",  color: "#4A7C5C" },
  sofia:           { label: "Conectado",      bg: "rgba(74,124,92,0.15)",  color: "#4A7C5C" },
  recomendaciones: { label: "Próximamente",   bg: COLORS.panelAlt,         color: COLORS.textMuted },
};

const SOURCE_DOT_COLORS = {
  meta:      SOURCE_COLORS.meta,
  google:    "#4285F4",
  analytics: "#EA4335",
  sofia:     SOURCE_COLORS.sofia,
};

function NavCard({ icon: Icon, title, stat, statLabel, navKey, onClick, hovered, onMouseEnter, onMouseLeave }) {
  const badge = NAV_BADGES[navKey];
  const isHovered = hovered === navKey;
  return (
    <Card
      style={{
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.15s, box-shadow 0.15s",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isHovered ? "0 6px 20px rgba(31,74,64,0.12)" : "0 1px 6px rgba(31,74,64,0.06)",
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {badge && (
        <span style={{
          position: "absolute", top: 12, right: 12,
          fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
          background: badge.bg, color: badge.color, fontFamily: "'Manrope', sans-serif",
        }}>
          {badge.label}
        </span>
      )}
      <Icon size={18} color={COLORS.gold} />
      <p style={{ margin: "10px 0 2px", fontSize: 22, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif", lineHeight: 1 }}>
        {stat}
      </p>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {statLabel}
      </p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>
        {title} →
      </p>
    </Card>
  );
}

function ActiveBadge({ active }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
      background: active ? "rgba(74,124,92,0.15)" : COLORS.panelAlt,
      color: active ? "#4A7C5C" : COLORS.textMuted,
      fontFamily: "'Manrope', sans-serif",
    }}>
      {active ? "● Activo" : "..."}
    </span>
  );
}

export function DashboardHome({ profile, setActive }) {
  const isMobile = useIsMobile();
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [googleData, setGoogleData] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [hovered, setHovered] = useState(null);

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

  useEffect(() => {
    fetch("/api/google-ads-metrics")
      .then(r => r.json())
      .then(data => { if (!data.error) setGoogleData(data); })
      .catch(() => {})
      .finally(() => setGoogleLoading(false));
  }, []);

  const totalInvestment = (metaLoading || googleLoading)
    ? "..."
    : `$${(parseFloat(metaData?.totals?.spend || 0) + parseFloat(googleData?.totals?.cost || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const bestCampaign = metaData?.campaigns
    ?.filter(c => parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0) > 0)
    ?.sort((a, b) => {
      const cplA = parseFloat(a.spend) / parseInt(a.actions?.find(x => x.action_type === "lead")?.value || 1);
      const cplB = parseFloat(b.spend) / parseInt(b.actions?.find(x => x.action_type === "lead")?.value || 1);
      return cplA - cplB;
    })?.[0];

  const bestGoogle = googleData?.campaigns
    ?.filter(c => c.conversions > 0 && c.costPerConv > 0)
    ?.sort((a, b) => a.costPerConv - b.costPerConv)?.[0];

  const sourceRowStyle = {
    display: "grid",
    gridTemplateColumns: "130px 1fr 1fr 1fr 80px",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: `1px solid ${COLORS.border}`,
  };

  const metricCell = (label, value) => (
    <div>
      <p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>{value}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* SECCIÓN 1 — Resumen ejecutivo */}
      <Card style={{ background: COLORS.green, border: "none" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: isMobile ? 24 : 0,
        }}>
          {[
            {
              label: "INVERSIÓN TOTAL",
              value: totalInvestment,
              sub: "Meta Ads + Google Ads este mes",
              border: !isMobile,
            },
            {
              label: "LEADS GENERADOS",
              value: metaLoading ? "..." : `${parseInt(metaData?.totals?.leads || 0)}`,
              sub: "Contactos desde Meta Ads",
              border: !isMobile,
            },
            {
              label: "USUARIOS EN EL SITIO",
              value: analyticsLoading ? "..." : (analyticsData?.totals?.users?.toLocaleString() || "0"),
              sub: "Visitantes en cec.cr este mes",
              border: false,
            },
          ].map((kpi, i) => (
            <div key={i} style={{
              padding: isMobile ? 0 : "0 24px",
              paddingLeft: i === 0 ? 0 : undefined,
              paddingRight: i === 2 ? 0 : undefined,
              borderRight: kpi.border ? "1px solid rgba(255,255,255,0.12)" : "none",
            }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "'Manrope', sans-serif" }}>
                {kpi.label}
              </p>
              <p style={{ margin: "0 0 4px", fontSize: 38, fontWeight: 700, color: "#FFFFFF", fontFamily: "'Manrope', sans-serif", lineHeight: 1.1 }}>
                {kpi.value}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Manrope', sans-serif" }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* SECCIÓN 2 — Tabla de fuentes + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>

        {/* Columna izquierda — Tabla de fuentes */}
        <Card>
          <p style={{ margin: "0 0 16px", fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            Rendimiento por fuente
          </p>

          {/* Meta Ads */}
          <div style={sourceRowStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: SOURCE_COLORS.meta, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>Meta Ads</span>
            </div>
            {metricCell("Gasto", metaLoading ? "..." : `$${parseFloat(metaData?.totals?.spend || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`)}
            {metricCell("CPL", metaLoading ? "..." : (metaData?.totals?.leads > 0
              ? `$${(parseFloat(metaData.totals.spend) / parseInt(metaData.totals.leads)).toFixed(2)}`
              : "—"))}
            {metricCell("Leads", metaLoading ? "..." : `${parseInt(metaData?.totals?.leads || 0)}`)}
            <div style={{ textAlign: "right" }}>
              <ActiveBadge active={!!metaData} />
            </div>
          </div>

          {/* Google Ads */}
          <div style={sourceRowStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4285F4", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>Google Ads</span>
            </div>
            {metricCell("Gasto", googleLoading ? "..." : `$${parseFloat(googleData?.totals?.cost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`)}
            {metricCell("Conversiones", googleLoading ? "..." : `${Math.round(googleData?.totals?.conversions || 0)}`)}
            {metricCell("Costo / conv.", googleLoading ? "..." : `$${parseFloat(googleData?.totals?.costPerConv || 0).toFixed(2)}`)}
            <div style={{ textAlign: "right" }}>
              <ActiveBadge active={!!googleData} />
            </div>
          </div>

          {/* Google Analytics */}
          <div style={{ ...sourceRowStyle, borderBottom: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EA4335", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>Sitio Web</span>
            </div>
            {metricCell("Usuarios", analyticsLoading ? "..." : (analyticsData?.totals?.users?.toLocaleString() || "0"))}
            {metricCell("Sesiones", analyticsLoading ? "..." : (analyticsData?.totals?.sessions?.toLocaleString() || "0"))}
            {metricCell("País principal", analyticsLoading ? "..." : (analyticsData?.topCountries?.[0]?.country || "—"))}
            <div style={{ textAlign: "right" }}>
              <ActiveBadge active={!!analyticsData} />
            </div>
          </div>
        </Card>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Mejor campaña Meta */}
          <Card>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Mejor campaña Meta
            </p>
            {metaLoading ? (
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>Cargando datos...</p>
            ) : bestCampaign ? (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif", lineHeight: 1.4 }}>
                  {bestCampaign.campaign_name}
                </p>
                <p style={{ margin: "0 0 2px", fontSize: 28, fontWeight: 700, color: COLORS.gold, fontFamily: "'Manrope', sans-serif", lineHeight: 1.1 }}>
                  {`$${(parseFloat(bestCampaign.spend) / parseInt(bestCampaign.actions?.find(a => a.action_type === "lead")?.value || 1)).toFixed(2)}`}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
                  Costo por lead
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>Sin campañas con leads</p>
            )}
          </Card>

          {/* Mejor campaña Google */}
          <Card>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Mejor campaña Google
            </p>
            {googleLoading ? (
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>Cargando...</p>
            ) : bestGoogle ? (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif", lineHeight: 1.4 }}>
                  {bestGoogle.name.length > 22 ? bestGoogle.name.substring(0, 22) + "..." : bestGoogle.name}
                </p>
                <p style={{ margin: "0 0 2px", fontSize: 28, fontWeight: 700, color: "#4285F4", fontFamily: "'Manrope', sans-serif", lineHeight: 1.1 }}>
                  {`$${bestGoogle.costPerConv.toFixed(2)}`}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
                  Costo por conversión
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>Sin datos</p>
            )}
          </Card>

          {/* Estado de conexiones */}
          <Card>
            <p style={{ margin: "0 0 10px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Conexiones
            </p>
            {DATA_SOURCES.map((source) => (
              <div key={source.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: SOURCE_DOT_COLORS[source.key] || COLORS.textMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>{source.label}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                  background: source.connected ? "rgba(74,124,92,0.15)" : "rgba(220,38,38,0.08)",
                  color: source.connected ? "#4A7C5C" : "#dc2626",
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  {source.connected ? "Conectado" : "● Pendiente"}
                </span>
              </div>
            ))}
          </Card>

        </div>
      </div>

      {/* SECCIÓN 3 — NavCards con datos */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 16 }}>
        <NavCard
          icon={LayoutDashboard}
          title="Métricas"
          stat={metaLoading ? "..." : `$${parseFloat(metaData?.totals?.spend || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          statLabel="invertidos en Meta este mes"
          navKey="metricas"
          onClick={() => setActive?.("metricas")}
          hovered={hovered}
          onMouseEnter={() => setHovered("metricas")}
          onMouseLeave={() => setHovered(null)}
        />
        <NavCard
          icon={BarChart2}
          title="Sitio Web"
          stat={analyticsLoading ? "..." : (analyticsData?.totals?.users?.toLocaleString() || "0")}
          statLabel="usuarios en cec.cr este mes"
          navKey="analytics"
          onClick={() => setActive?.("analytics")}
          hovered={hovered}
          onMouseEnter={() => setHovered("analytics")}
          onMouseLeave={() => setHovered(null)}
        />
        <NavCard
          icon={MessageCircle}
          title="Conversaciones de Sofía"
          stat="0"
          statLabel="conversaciones este mes"
          navKey="sofia"
          onClick={() => setActive?.("sofia")}
          hovered={hovered}
          onMouseEnter={() => setHovered("sofia")}
          onMouseLeave={() => setHovered(null)}
        />
        <NavCard
          icon={Sparkles}
          title="Recomendaciones"
          stat="3"
          statLabel="fuentes de datos conectadas"
          navKey="recomendaciones"
          onClick={() => setActive?.("recomendaciones")}
          hovered={hovered}
          onMouseEnter={() => setHovered("recomendaciones")}
          onMouseLeave={() => setHovered(null)}
        />
      </div>

    </div>
  );
}
