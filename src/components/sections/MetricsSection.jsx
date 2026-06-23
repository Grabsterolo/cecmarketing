import React, { useState, useEffect } from "react";
import { LayoutDashboard } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";
import { PendingIntegrationCard } from "../ui/PendingIntegrationCard.jsx";

const cellStyle = {
  padding: "11px 14px", fontSize: 13, fontFamily: "'Manrope', sans-serif",
  color: COLORS.text, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap",
};
const headStyle = {
  ...cellStyle, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.08em", color: COLORS.textMuted, background: COLORS.panelAlt,
};

function Kpi({ label, value, sub }) {
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

  const metaCampaigns = (metaData?.campaigns ?? []).map(c => ({
    nombre: c.campaign_name,
    gasto: `$${parseFloat(c.spend).toFixed(2)}`,
    impresiones: parseInt(c.impressions).toLocaleString(),
    clics: parseInt(c.clicks).toLocaleString(),
    leads: c.actions?.find(a => a.action_type === "lead")?.value || "0",
  }));

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
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20, marginTop: 20 }}>
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
            </div>

            {/* Tabla campañas */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    {["Campaña", "Gasto", "Impresiones", "Clics", "Leads"].map(h => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
