import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { LayoutDashboard } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { PendingIntegrationCard } from "../ui/PendingIntegrationCard.jsx";

const cellStyle = {
  padding: "11px 14px", fontSize: 13, fontFamily: "'Manrope', sans-serif",
  color: COLORS.text, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap",
};
const headStyle = {
  ...cellStyle, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.08em", color: COLORS.textMuted, background: COLORS.panelAlt,
};
const tickStyle = { fontSize: 11, fontFamily: "'Manrope', sans-serif", fill: COLORS.textMuted };

function Kpi({ label, value, sub, note }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 28, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
        {sub}
      </p>
      {note && (
        <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", fontStyle: "italic" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function SourceDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <h4 style={{ margin: 0, fontSize: 15, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
        {label}
      </h4>
    </div>
  );
}

function getMetaInsight(campaigns, totals) {
  const withLeads = (campaigns ?? []).filter(c => {
    const leads = parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0);
    return leads > 0;
  });

  if (withLeads.length > 0) {
    const best = [...withLeads].sort((a, b) => {
      const leadsA = parseInt(a.actions.find(ac => ac.action_type === "lead").value);
      const leadsB = parseInt(b.actions.find(ac => ac.action_type === "lead").value);
      return (parseFloat(a.spend) / leadsA) - (parseFloat(b.spend) / leadsB);
    })[0];
    const bestLeads = parseInt(best.actions.find(a => a.action_type === "lead").value);
    const bestCpl = (parseFloat(best.spend) / bestLeads).toFixed(2);
    return `La campaña con mejor rendimiento este mes es "${best.campaign_name}" con un costo por lead de $${bestCpl}.`;
  }

  if (parseFloat(totals?.spend || 0) > 0) {
    return `Las campañas activas acumulan ${parseInt(totals.impressions).toLocaleString()} impresiones este mes con un gasto total de $${parseFloat(totals.spend).toFixed(2)}.`;
  }

  return null;
}

export function MetricsSection() {
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

  const metaCampaigns = (metaData?.campaigns ?? []).map(c => {
    const leads = parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0);
    const cpl = leads > 0 ? `$${(parseFloat(c.spend) / leads).toFixed(2)}` : "—";
    return {
      nombre: c.campaign_name,
      gasto: `$${parseFloat(c.spend).toFixed(2)}`,
      impresiones: parseInt(c.impressions).toLocaleString(),
      clics: parseInt(c.clicks).toLocaleString(),
      leads,
      cpl,
    };
  });

  const chartData = (metaData?.campaigns ?? []).map(c => ({
    name: c.campaign_name.length > 20 ? c.campaign_name.substring(0, 20) + "..." : c.campaign_name,
    Gasto: parseFloat(c.spend),
    Leads: parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0),
  }));

  const campanasConLeads = (metaData?.campaigns ?? []).filter(c =>
    parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0) > 0
  );
  const cplReal = campanasConLeads.length > 0
    ? (
        campanasConLeads.reduce((sum, c) => sum + parseFloat(c.spend || 0), 0) /
        campanasConLeads.reduce((sum, c) => sum + parseInt(c.actions?.find(a => a.action_type === "lead")?.value || 0), 0)
      ).toFixed(2)
    : 0;
  const cplValue = campanasConLeads.length > 0 ? `$${cplReal}` : "—";

  const insight = metaData ? getMetaInsight(metaData.campaigns, metaData.totals) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Bloque Meta Ads */}
      <Card>
        <SourceDot color={SOURCE_COLORS.meta} label="Meta Ads" />

        {metaLoading && (
          <p style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", textAlign: "center", padding: "32px 0", margin: 0 }}>
            Cargando métricas...
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
          <>
            {/* Insight automático */}
            {insight && (
              <div style={{
                background: "rgba(201,162,78,0.08)",
                border: `1px solid rgba(201,162,78,0.25)`,
                borderLeft: `3px solid ${COLORS.gold}`,
                borderRadius: 8,
                padding: "12px 16px",
                marginTop: 16,
                marginBottom: 4,
                fontSize: 13,
                color: COLORS.text,
                fontFamily: "'Manrope', sans-serif",
                lineHeight: 1.6,
              }}>
                <span style={{ color: COLORS.gold, marginRight: 8 }}>✦</span>
                {insight}
              </div>
            )}

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 20, marginTop: 20 }}>
              <Kpi
                label="Gasto"
                value={`$${parseFloat(metaData.totals.spend).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                sub="Este mes"
              />
              <Kpi
                label="Impresiones"
                value={`${parseInt(metaData.totals.impressions).toLocaleString()}`}
                sub="Alcance total"
              />
              <Kpi
                label="Clics"
                value={`${parseInt(metaData.totals.clicks).toLocaleString()}`}
                sub="Al sitio web"
              />
              <Kpi
                label="Leads"
                value={`${metaData.totals.leads}`}
                sub="Contactos generados"
              />
              <Kpi
                label="Costo por lead"
                value={cplValue}
                sub="Promedio Meta Ads"
                note="Solo campañas con leads"
              />
            </div>

            {/* Tabla campañas */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    {["Campaña", "Gasto", "Impresiones", "Clics", "Leads", "Costo / Lead"].map(h => (
                      <th key={h} style={{ ...headStyle, textAlign: h === "Campaña" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metaCampaigns.map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panelAlt }}>
                      <td style={{ ...cellStyle, fontWeight: 600 }}>{c.nombre}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{c.gasto}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{c.impresiones}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{c.clics}</td>
                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: COLORS.green }}>{c.leads}</td>
                      <td style={{
                        ...cellStyle, textAlign: "right",
                        fontWeight: c.cpl !== "—" ? 700 : 400,
                        color: c.cpl !== "—" ? COLORS.green : COLORS.textMuted,
                      }}>{c.cpl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ margin: "8px 0 0", fontSize: 11, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", fontStyle: "italic" }}>
              * Las campañas de alcance y tráfico no tienen como objetivo generar leads — su costo por lead no es comparable con campañas de conversión.
            </p>

            {/* Gráfico gasto vs leads */}
            <p style={{ margin: "24px 0 12px", fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Gasto vs Leads por campaña
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  orientation="left"  tick={tickStyle} axisLine={false} tickLine={false} width={50} />
                <YAxis yAxisId="right" orientation="right" tick={tickStyle} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    fontFamily: "'Manrope', sans-serif", fontSize: 12,
                    borderRadius: 8, border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel,
                  }}
                  cursor={{ fill: COLORS.panelAlt }}
                />
                <Legend wrapperStyle={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="left"  dataKey="Gasto" fill={SOURCE_COLORS.meta} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Leads" fill={COLORS.gold}        radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      {/* Bloque Google Ads */}
      <PendingIntegrationCard
        icon={LayoutDashboard}
        title="Google Ads — Próximamente"
        description="El acceso a Google Ads está en proceso. Las métricas aparecerán aquí automáticamente cuando se confirme."
      />

    </div>
  );
}
