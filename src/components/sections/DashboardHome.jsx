import React, { useState, useEffect } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { Badge } from "../ui/Badge.jsx";
import { DATA_SOURCES } from "../../constants/nav.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { supabase } from "../../lib/supabase.js";

const SOURCE_DOT_COLORS = {
  meta:  SOURCE_COLORS.meta,
  sofia: SOURCE_COLORS.sofia,
};

function ActiveBadge({ active }) {
  return (
    <Badge variant={active ? "success" : "default"}>
      {active ? "● Activo" : "..."}
    </Badge>
  );
}

export function DashboardHome({ profile, setActive }) {
  const isMobile = useIsMobile();
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [sofiaStats, setSofiaStats] = useState(null);
  const [sofiaLoading, setSofiaLoading] = useState(true);
  const [conversionStats, setConversionStats] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meta-metrics")
      .then(r => r.json())
      .then(data => { if (!data.error) setMetaData(data); })
      .catch(() => {})
      .finally(() => setMetaLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/conversion-stats")
      .then(r => r.json())
      .then(data => { if (!data.error) setConversionStats(data); })
      .catch(() => {})
      .finally(() => setConversionLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadSofiaStats() {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [{ count: total }, { count: escalated }] = await Promise.all([
        supabase.from("sofia_conversations").select("*", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString()),
        supabase.from("sofia_conversations").select("*", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString()).eq("escalated", true),
      ]);
      if (!mounted) return;
      setSofiaStats({ total: total || 0, escalated: escalated || 0 });
      setSofiaLoading(false);
    }
    loadSofiaStats();
    return () => { mounted = false; };
  }, []);

  const totalInvestment = metaLoading
    ? "..."
    : `$${parseFloat(metaData?.totals?.spend || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const bestCampaign = metaData?.campaigns
    ?.filter(c => parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0) > 0)
    ?.sort((a, b) => {
      const cplA = parseFloat(a.spend) / parseInt(a.actions?.find(x => x.action_type === "lead")?.value || 1);
      const cplB = parseFloat(b.spend) / parseInt(b.actions?.find(x => x.action_type === "lead")?.value || 1);
      return cplA - cplB;
    })?.[0];

  // Barras del embudo calculadas a partir de datos reales: cada paso mide su
  // propia tasa de conversión (impresiones por $ invertido, leads por
  // impresión) normalizada contra la mayor de esas dos tasas, para que el
  // ancho refleje la eficiencia real del paso y no un número inventado.
  const investment = parseFloat(metaData?.totals?.spend || 0);
  const impressions = parseInt(metaData?.totals?.impressions || 0);
  const leadsCount = parseInt(metaData?.totals?.leads || 0);
  const impressionsPerDollar = investment > 0 ? impressions / investment : 0;
  const leadsPerImpression = impressions > 0 ? leadsCount / impressions : 0;
  const maxRate = Math.max(impressionsPerDollar, leadsPerImpression, 1e-9);

  const pasos = [
    {
      color: SOURCE_COLORS.meta,
      label: "INVERSIÓN PUBLICITARIA",
      numero: metaLoading
        ? "..."
        : `$${parseFloat(metaData?.totals?.spend || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      desc: "Meta Ads este mes",
      barra: 100,
    },
    {
      color: SOURCE_COLORS.organico,
      label: "IMPRESIONES",
      numero: metaLoading ? "..." : `${parseInt(metaData?.totals?.impressions || 0).toLocaleString()}`,
      desc: "Personas que vieron los anuncios",
      barra: metaLoading ? 0 : Math.round((impressionsPerDollar / maxRate) * 100),
    },
    {
      color: COLORS.gold,
      label: "LEADS GENERADOS",
      numero: metaLoading ? "..." : `${parseInt(metaData?.totals?.leads || 0)}`,
      desc: "Contactos que dejaron sus datos",
      barra: metaLoading ? 0 : Math.round((leadsPerImpression / maxRate) * 100),
    },
    {
      color: SOURCE_COLORS.sofia,
      label: "CONVERSACIONES SOFÍA",
      numero: sofiaLoading ? "..." : `${sofiaStats?.total || 0}`,
      desc: sofiaLoading
        ? "Cargando..."
        : sofiaStats?.total > 0
          ? `${Math.round((sofiaStats.escalated / sofiaStats.total) * 100)}% escaladas a un asesor`
          : "Sin conversaciones este mes todavía",
      // A diferencia de las barras de arriba (que sí forman un embudo real
      // de Meta Ads), Sofía es un canal aparte — la barra aquí representa el
      // % de conversaciones escaladas a un asesor, no un paso del embudo.
      barra: sofiaLoading || !sofiaStats?.total ? 0 : Math.round((sofiaStats.escalated / sofiaStats.total) * 100),
    },
  ];

  // Share relativo por fuente, basado en volumen de actividad real (leads de
  // Meta Ads vs conversaciones de Sofía). "Orgánico" no tiene una fuente de
  // datos conectada todavía (ver DATA_SOURCES en nav.js), así que se omite
  // en vez de inventar un número.
  const sofiaTotal = sofiaStats?.total || 0;
  const sourceVolumeTotal = leadsCount + sofiaTotal;
  const sourceShare = [
    { key: "meta", label: "Meta Ads", color: SOURCE_COLORS.meta, value: leadsCount },
    { key: "sofia", label: "Sofía", color: SOURCE_COLORS.sofia, value: sofiaTotal },
  ].map(s => ({
    ...s,
    pct: sourceVolumeTotal > 0 ? Math.round((s.value / sourceVolumeTotal) * 100) : 0,
  }));

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
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 24 : 0,
        }}>
          {[
            {
              label: "INVERSIÓN TOTAL",
              value: totalInvestment,
              sub: "Meta Ads este mes",
              border: !isMobile,
            },
            {
              label: "LEADS GENERADOS",
              value: metaLoading ? "..." : `${parseInt(metaData?.totals?.leads || 0)}`,
              sub: "Contactos desde Meta Ads",
              border: false,
            },
          ].map((kpi, i) => (
            <div key={i} style={{
              padding: isMobile ? 0 : "0 24px",
              paddingLeft: i === 0 ? 0 : undefined,
              paddingRight: i === 1 ? 0 : undefined,
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
          <h3 style={{ margin: "0 0 20px", fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            El embudo de este mes
          </h3>

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

          {metaData?.totals?.leads > 0 && (
            <div style={{
              background: "rgba(201,162,78,0.08)", border: "1px solid rgba(201,162,78,0.2)",
              borderLeft: `3px solid ${COLORS.gold}`, borderRadius: 8,
              padding: "8px 16px", marginTop: 16,
              fontSize: 13, color: COLORS.text, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6,
              animation: "calloutIn 0.5s ease-out both",
            }}>
              ✦ Cada lead de Meta Ads cuesta ${(parseFloat(metaData.totals.spend) / parseInt(metaData.totals.leads)).toFixed(2)} en promedio este mes.
            </div>
          )}
        </Card>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Mejor campaña Meta */}
          <Card>
            <h4 style={{ margin: "0 0 12px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Mejor campaña Meta
            </h4>
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

          {/* Conversión de Sofía */}
          <Card>
            <h4 style={{ margin: "0 0 12px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Conversión de Sofía
            </h4>
            {conversionLoading ? (
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>Cargando datos...</p>
            ) : conversionStats?.conversationsWithProspectId > 0 && conversionStats?.breakdown ? (
              (() => {
                // breakdown viene de Zenvia: una key por archivingReason real
                // ("converted", "campaignConversion", "sinArchivar", y
                // cualquier otra razón de archivado que Zenvia use para
                // prospectos perdidos/duplicados/etc — no hace falta
                // enumerarlas todas). Se agrupan en 3 buckets porque con
                // pocos días de datos casi nada se ha resuelto todavía en
                // Zenvia (ni ganado ni perdido), y mostrar solo un % de
                // conversión comunica algo falso ("casi nadie convierte")
                // cuando en realidad es "casi nadie se ha resuelto todavía".
                const breakdown = conversionStats.breakdown;
                const convertidos = (breakdown.converted || 0) + (breakdown.campaignConversion || 0);
                const enProceso = breakdown.sinArchivar || 0;
                const cerradosSinVenta = conversionStats.conversationsWithProspectId - convertidos - enProceso;

                const total = convertidos + enProceso + cerradosSinVenta;
                const donutData = [
                  { name: "Convertidos", value: convertidos, color: COLORS.success },
                  { name: "Aún en proceso", value: enProceso, color: COLORS.gold },
                  { name: "Cerrados sin venta", value: cerradosSinVenta, color: COLORS.textMuted },
                ];

                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              dataKey="value"
                              innerRadius="60%"
                              outerRadius="80%"
                              startAngle={90}
                              endAngle={-270}
                              stroke="none"
                              isAnimationActive={true}
                            >
                              {donutData.map((d, i) => (
                                <Cell key={i} fill={d.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{
                          position: "absolute", inset: 0,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          pointerEvents: "none",
                        }}>
                          <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.green, fontFamily: "'Manrope', sans-serif", lineHeight: 1.1 }}>
                            {total}
                          </span>
                          <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
                            total
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                        {donutData.map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>
                              {d.value}
                            </span>
                            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
                              {d.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p style={{ margin: "12px 0 0", fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>
                      Datos desde el 5 de agosto de 2026 — la mayoría de los prospectos recientes todavía sigue en proceso, es normal que "Convertidos" sea bajo con tan pocos días de datos.
                    </p>
                  </>
                );
              })()
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
                Sin datos todavía — este número solo cuenta conversaciones nuevas desde el 5 de agosto de 2026.
              </p>
            )}
          </Card>

        </div>
      </div>

      {/* SECCIÓN 3 — Rendimiento por fuente + Conexiones */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>

        {/* Tabla de fuentes */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 18, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            Rendimiento por fuente
          </h3>

          {/* Share relativo entre fuentes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {sourceShare.map((s) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 62, fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: "'Manrope', sans-serif", flexShrink: 0 }}>
                  {s.label}
                </span>
                <div style={{ flex: 1, height: 8, background: COLORS.border, borderRadius: 4 }}>
                  <div style={{
                    height: "100%", width: `${s.pct}%`,
                    background: s.color, borderRadius: 4,
                    transition: "width 0.8s ease-out",
                  }} />
                </div>
                <span style={{ width: 36, textAlign: "right", fontSize: 12, fontWeight: 700, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", flexShrink: 0 }}>
                  {s.pct}%
                </span>
              </div>
            ))}
          </div>

          {/* Meta Ads */}
          <div style={{ ...sourceRowStyle, borderBottom: "none" }}>
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
        </Card>

        {/* Conexiones */}
        <Card>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            Conexiones
          </h3>
          {DATA_SOURCES.map((source) => (
            <div key={source.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: SOURCE_DOT_COLORS[source.key] || COLORS.textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>{source.label}</span>
              </div>
              <Badge variant={source.connected ? "success" : "danger"}>
                {source.connected ? "Conectado" : "● Pendiente"}
              </Badge>
            </div>
          ))}
        </Card>

      </div>

      {/* SECCIÓN 4 — Preparando Sofía */}
      <div style={{
        background: "rgba(31,74,64,0.04)", border: "1px solid rgba(31,74,64,0.1)",
        borderRadius: 12, padding: "16px 24px",
        display: "flex", alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between", flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 14 : 0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color={COLORS.gold} />
            <h3 style={{ margin: 0, fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Sofía ya analiza tus datos
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6, maxWidth: 520 }}>
            Sofía genera un reporte diario con observaciones y recomendaciones basadas en Meta Ads.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <Badge variant="gold">
            Nuevo ✦
          </Badge>
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
