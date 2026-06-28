import React, { useState, useEffect } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { DATA_SOURCES } from "../../constants/nav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const SOURCE_DOT_COLORS = {
  meta:      SOURCE_COLORS.meta,
  google:    "#4285F4",
  analytics: "#EA4335",
  sofia:     SOURCE_COLORS.sofia,
};

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

  const metaPct = metaData && googleData
    ? Math.round((parseFloat(metaData.totals.spend) /
        (parseFloat(metaData.totals.spend) + parseFloat(googleData.totals.cost))) * 100)
    : null;

  const gastoData = [
    { nombre: "Meta Ads",    gasto: parseFloat(metaData?.totals?.spend || 0),  color: "#1877F2" },
    { nombre: "Google Ads",  gasto: parseFloat(googleData?.totals?.cost || 0),  color: "#4285F4" },
  ];

  const pasos = [
    {
      color: "#1877F2",
      label: "INVERSIÓN PUBLICITARIA",
      numero: (metaLoading || googleLoading)
        ? "..."
        : `$${(parseFloat(metaData?.totals?.spend || 0) + parseFloat(googleData?.totals?.cost || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      desc: "Meta Ads + Google Ads este mes",
      barra: 100,
    },
    {
      color: "#7FA98C",
      label: "IMPRESIONES",
      numero: metaLoading ? "..." : `${parseInt(metaData?.totals?.impressions || 0).toLocaleString()}`,
      desc: "Personas que vieron los anuncios",
      barra: 85,
    },
    {
      color: COLORS.gold,
      label: "LEADS GENERADOS",
      numero: metaLoading ? "..." : `${parseInt(metaData?.totals?.leads || 0)}`,
      desc: "Contactos que dejaron sus datos",
      barra: 60,
    },
    {
      color: COLORS.border,
      label: "CONVERSACIONES SOFÍA",
      numero: "—",
      desc: "Disponible cuando Sofía esté en WhatsApp",
      barra: 0,
      muted: true,
    },
  ];

  const sourceRowStyle = {
    display: "grid",
    gridTemplateColumns: "130px 1fr 1fr 1fr 80px",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: `1px solid ${COLORS.border}`,
  };

  const metricCell = (label, value) => (
    <div>
      <p style={{ margin: "0 0 2px", fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>{value}</p>
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

      {/* SECCIÓN 2 — Embudo + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>

        {/* Columna izquierda — Embudo */}
        <Card>
          <p style={{ margin: "0 0 20px", fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            El embudo de este mes
          </p>

          {pasos.map((paso, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 16,
              padding: "14px 0",
              borderBottom: i < pasos.length - 1 ? `1px solid ${COLORS.border}` : "none",
            }}>
              <div style={{
                width: 3, alignSelf: "stretch", borderRadius: 2,
                background: paso.color, flexShrink: 0, minHeight: 40,
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
                  {paso.label}
                </p>
                <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 700, color: paso.muted ? COLORS.textMuted : paso.color, fontFamily: "'Manrope', sans-serif", lineHeight: 1.1 }}>
                  {paso.numero}
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
                  {paso.desc}
                </p>
                <div style={{ height: 4, background: COLORS.border, borderRadius: 2 }}>
                  <div style={{
                    height: "100%", width: `${paso.barra}%`,
                    background: paso.color, borderRadius: 2,
                    transition: "width 0.8s ease-out",
                  }} />
                </div>
              </div>
            </div>
          ))}

          {metaPct !== null && (
            <div style={{
              background: "rgba(201,162,78,0.08)", border: "1px solid rgba(201,162,78,0.2)",
              borderLeft: `3px solid ${COLORS.gold}`, borderRadius: 8,
              padding: "10px 14px", marginTop: 16,
              fontSize: 13, color: COLORS.text, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6,
            }}>
              ✦ El {metaPct}% de la inversión está en Meta Ads y el {100 - metaPct}% en Google Ads.
              {metaData?.totals?.leads > 0 && ` Cada lead de Meta cuesta $${(parseFloat(metaData.totals.spend) / parseInt(metaData.totals.leads)).toFixed(2)}.`}
            </div>
          )}
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

          {/* Distribución del gasto */}
          <Card>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Distribución del gasto
            </p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={gastoData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="nombre" width={80}
                  tick={{ fontSize: 11, fontFamily: "'Manrope', sans-serif", fill: COLORS.textMuted }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`$${parseFloat(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Gasto"]}
                  contentStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${COLORS.border}` }}
                />
                <Bar dataKey="gasto" radius={[0, 4, 4, 0]}>
                  {gastoData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

        </div>
      </div>

      {/* SECCIÓN 3 — Rendimiento por fuente + Conexiones */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>

        {/* Tabla de fuentes */}
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
            <div style={{ textAlign: "right" }}><ActiveBadge active={!!metaData} /></div>
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
            <div style={{ textAlign: "right" }}><ActiveBadge active={!!googleData} /></div>
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
            <div style={{ textAlign: "right" }}><ActiveBadge active={!!analyticsData} /></div>
          </div>
        </Card>

        {/* Conexiones */}
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

      {/* SECCIÓN 4 — Preparando Sofía */}
      <div style={{
        background: "rgba(31,74,64,0.04)", border: "1px solid rgba(31,74,64,0.1)",
        borderRadius: 12, padding: "18px 22px",
        display: "flex", alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between", flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 14 : 0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color={COLORS.gold} />
            <span style={{ fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Sofía ya analiza tus datos
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6, maxWidth: 520 }}>
            Sofía genera un reporte diario con observaciones y recomendaciones basadas en Meta Ads, Google Ads y Analytics.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 20,
            background: "rgba(201,162,78,0.15)", color: COLORS.gold, fontFamily: "'Manrope', sans-serif",
          }}>
            Nuevo ✦
          </span>
          <button
            onClick={() => setActive?.("recomendaciones")}
            style={{
              background: COLORS.green, color: "white", border: "none",
              borderRadius: 8, padding: "8px 16px", fontSize: 13,
              fontWeight: 600, fontFamily: "'Manrope', sans-serif", cursor: "pointer",
            }}
          >
            Ver análisis →
          </button>
        </div>
      </div>

    </div>
  );
}
