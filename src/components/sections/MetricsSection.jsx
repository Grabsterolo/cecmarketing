import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { LayoutDashboard } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";
import { PendingIntegrationCard } from "../ui/PendingIntegrationCard.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";

const CHART_DATA = [
  { mes: "Ene", Meta: 28, Google: 19 },
  { mes: "Feb", Meta: 31, Google: 24 },
  { mes: "Mar", Meta: 25, Google: 29 },
  { mes: "Abr", Meta: 38, Google: 22 },
  { mes: "May", Meta: 42, Google: 31 },
  { mes: "Jun", Meta: 36, Google: 28 },
];

const GOOGLE_CAMPAIGNS = [
  { nombre: "Mamoplastia CR",       gasto: "₡220,000", clics: 890, leads: 18, cpp: "₡12,222", status: "activa" },
  { nombre: "Bichectomía San José", gasto: "₡130,000", clics: 640, leads: 9,  cpp: "₡14,444", status: "activa" },
  { nombre: "Abdominoplastia",      gasto: "₡105,000", clics: 510, leads: 8,  cpp: "₡13,125", status: "pausada" },
];

function KpiCard({ label, value, sub }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 32, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {sub}
      </p>
    </Card>
  );
}

function StatusBadge({ status }) {
  const active = status === "activa";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 12, fontWeight: 600, fontFamily: "'Manrope', sans-serif",
      color: active ? COLORS.greenSoft : COLORS.textMuted,
    }}>
      <span style={{ fontSize: 9 }}>{active ? "●" : "○"}</span>
      {active ? "Activa" : "Pausada"}
    </span>
  );
}

function CampaignTable({ campaigns }) {
  const cellStyle = {
    padding: "11px 14px", fontSize: 13, fontFamily: "'Manrope', sans-serif",
    color: COLORS.text, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap",
  };
  const headStyle = {
    ...cellStyle, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: COLORS.textMuted, background: COLORS.panelAlt,
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
        <thead>
          <tr>
            {["Campaña", "Gasto", "Clics", "Leads", "Costo / lead", "Estado"].map(h => (
              <th key={h} style={{ ...headStyle, textAlign: h === "Campaña" ? "left" : "right" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panelAlt }}>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{c.nombre}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{c.gasto}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{typeof c.clics === "number" ? c.clics.toLocaleString() : c.clics}</td>
              <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: COLORS.green }}>{c.leads}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}>{c.cpp}</td>
              <td style={{ ...cellStyle, textAlign: "right" }}><StatusBadge status={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceHeader({ label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <h4 style={{ margin: 0, fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
        {label}
      </h4>
    </div>
  );
}

const tickStyle = { fontSize: 11, fontFamily: "'Manrope', sans-serif", fill: COLORS.textMuted };

export function MetricsSection() {
  const isMobile = useIsMobile();
  const [metaData, setMetaData] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);

  useEffect(() => {
    fetch("/api/meta-metrics")
      .then(r => r.json())
      .then(data => {
        if (data.error) setMetaError(data.error);
        else setMetaData(data);
      })
      .catch(err => setMetaError(err.message))
      .finally(() => setMetaLoading(false));
  }, []);

  // Mapear campañas de Meta a formato de tabla
  const metaCampaigns = metaData?.campaigns.map(c => {
    const leadAction = c.actions?.find(a => a.action_type === "lead");
    const leads = leadAction ? parseInt(leadAction.value) : 0;
    const spend = parseFloat(c.spend);
    return {
      nombre: c.campaign_name,
      gasto: `$${spend.toLocaleString()}`,
      clics: parseInt(c.clicks),
      leads,
      cpp: leads > 0 ? `$${(spend / leads).toFixed(2)}` : "N/A",
      status: "activa",
    };
  }) ?? [];

  // KPIs: reales si hay datos, mock si no
  const kpis = metaData ? [
    { label: "Gasto total (Meta)",      value: `$${metaData.totals.spend.toLocaleString()}`,          sub: "Meta Ads · mes actual" },
    { label: "Leads generados",         value: String(metaData.totals.leads),                          sub: "Meta Ads · mes actual" },
    { label: "Costo por lead",          value: `$${metaData.totals.cpl}`,                              sub: "Promedio Meta" },
    { label: "Impresiones",             value: metaData.totals.impressions.toLocaleString(),            sub: "Alcance pagado" },
  ] : [
    { label: "Gasto total",             value: "₡1,240,000",  sub: "Meta + Google · junio 2026" },
    { label: "Leads generados",         value: "87",           sub: "Todos los canales · junio 2026" },
    { label: "Costo por lead prom.",    value: "₡14,253",      sub: "Promedio ponderado" },
    { label: "Mejor CPL",              value: "Meta Ads",      sub: "₡12,576 promedio de campañas" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Banner: demo si no hay datos, conectado si los hay */}
      {!metaData && (
        <div style={{
          padding: "13px 18px", borderRadius: 8,
          background: COLORS.panelAlt, borderLeft: `3px solid ${COLORS.gold}`,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
            <strong style={{ color: COLORS.green }}>Modo demo</strong> — Los datos mostrados son de ejemplo. Las métricas reales aparecerán aquí una vez conectadas las cuentas publicitarias.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
        gap: 16,
      }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Gráfico barras */}
      <Card>
        <CardHeader title="Meta vs Google — Leads por mes" />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={CHART_DATA} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="mes" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{
                fontFamily: "'Manrope', sans-serif", fontSize: 12,
                background: COLORS.panel, border: `1px solid ${COLORS.border}`,
                borderRadius: 8, boxShadow: "0 4px 12px rgba(31,74,64,0.1)",
              }}
              cursor={{ fill: COLORS.panelAlt }}
            />
            <Legend wrapperStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="Meta"   fill={SOURCE_COLORS.meta}   radius={[4, 4, 0, 0]} />
            <Bar dataKey="Google" fill={SOURCE_COLORS.google} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla Meta */}
      <Card>
        <SourceHeader label="Meta Ads" color={SOURCE_COLORS.meta} />
        {metaLoading && (
          <p style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", textAlign: "center", margin: "24px 0" }}>
            Cargando métricas de Meta...
          </p>
        )}
        {!metaLoading && metaError && (
          <PendingIntegrationCard
            icon={LayoutDashboard}
            title="No se pudo conectar con Meta Ads"
            description={metaError}
          />
        )}
        {!metaLoading && !metaError && metaData && (
          <CampaignTable campaigns={metaCampaigns} />
        )}
        {!metaLoading && !metaError && !metaData && (
          <CampaignTable campaigns={[
            { nombre: "Rinoplastia junio",   gasto: "₡280,000", clics: 1420, leads: 22, cpp: "₡12,727", status: "activa" },
            { nombre: "Liposucción verano",  gasto: "₡195,000", clics: 980,  leads: 15, cpp: "₡13,000", status: "activa" },
            { nombre: "Lifting facial mayo", gasto: "₡310,000", clics: 2100, leads: 31, cpp: "₡10,000", status: "pausada" },
          ]} />
        )}
      </Card>

      {/* Tabla Google — mock por ahora */}
      <Card>
        <SourceHeader label="Google Ads" color={SOURCE_COLORS.google} />
        <CampaignTable campaigns={GOOGLE_CAMPAIGNS} />
      </Card>

    </div>
  );
}
