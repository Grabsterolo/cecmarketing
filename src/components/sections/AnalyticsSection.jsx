import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Globe } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { PendingIntegrationCard } from "../ui/PendingIntegrationCard.jsx";
import { MetricKpi, SourceDot, tableStyles } from "../ui/MetricKpi.jsx";

export function AnalyticsSection() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/analytics-metrics")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setAnalyticsData(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <SourceDot color={SOURCE_COLORS.google} label="Google Analytics — cec.cr" />

        {loading && (
          <p style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", textAlign: "center", padding: "32px 0", margin: 0 }}>
            Cargando datos del sitio web...
          </p>
        )}

        {!loading && error && (
          <PendingIntegrationCard
            icon={Globe}
            title="No se pudo conectar con Google Analytics"
            description={error}
          />
        )}

        {!loading && !error && analyticsData && (
          <>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 20, marginBottom: 20 }}>
              <MetricKpi
                label="Usuarios activos"
                value={analyticsData.totals.users.toLocaleString()}
                sub="Este mes"
              />
              <MetricKpi
                label="Sesiones"
                value={analyticsData.totals.sessions.toLocaleString()}
                sub="Visitas totales"
              />
              <MetricKpi
                label="Páginas vistas"
                value={analyticsData.totals.pageViews.toLocaleString()}
                sub="Total de páginas"
              />
              <MetricKpi
                label="Eventos clave"
                value={analyticsData.totals.keyEvents.toLocaleString()}
                sub="Consultas y conversiones"
              />
            </div>

            {/* Gráfico de canales */}
            <p style={{ margin: "8px 0 12px", fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Origen del tráfico
            </p>
            <ResponsiveContainer width="100%" height={Math.max(180, analyticsData.channels.length * 40)}>
              <BarChart
                data={analyticsData.channels}
                layout="vertical"
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                <XAxis type="number" tick={tableStyles.tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="channel" width={140} tick={tableStyles.tick} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    fontFamily: "'Manrope', sans-serif", fontSize: 12,
                    borderRadius: 8, border: `1px solid ${COLORS.border}`,
                    background: COLORS.panel,
                  }}
                  cursor={{ fill: COLORS.panelAlt }}
                />
                <Bar dataKey="sessions" fill={SOURCE_COLORS.google} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Tabla países */}
            <p style={{ margin: "24px 0 12px", fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Visitantes por país
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={{ ...tableStyles.head, textAlign: "left" }}>País</th>
                    <th style={{ ...tableStyles.head, textAlign: "right" }}>Usuarios</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.topCountries.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panelAlt }}>
                      <td style={{ ...tableStyles.cell, fontWeight: 600 }}>{row.country}</td>
                      <td style={{ ...tableStyles.cell, textAlign: "right" }}>{row.users.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tabla páginas más visitadas */}
            <p style={{ margin: "24px 0 12px", fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
              Páginas más visitadas
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                  <tr>
                    <th style={{ ...tableStyles.head, textAlign: "left" }}>Página</th>
                    <th style={{ ...tableStyles.head, textAlign: "right" }}>Vistas</th>
                    <th style={{ ...tableStyles.head, textAlign: "right" }}>Usuarios</th>
                    <th style={{ ...tableStyles.head, textAlign: "right" }}>Tiempo promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {(analyticsData.topPages || []).map((p, i) => {
                    const title = p.title.length > 40 ? p.title.substring(0, 40) + "..." : p.title;
                    const duration = p.avgDuration >= 60
                      ? `${Math.floor(p.avgDuration / 60)}m ${p.avgDuration % 60}s`
                      : `${p.avgDuration}s`;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? COLORS.panel : COLORS.panelAlt }}>
                        <td style={tableStyles.cell}>
                          <span style={{ fontWeight: 600, display: "block" }}>{title}</span>
                          <span style={{ fontSize: 11, color: COLORS.textMuted }}>{p.path}</span>
                        </td>
                        <td style={{ ...tableStyles.cell, textAlign: "right" }}>{p.views.toLocaleString()}</td>
                        <td style={{ ...tableStyles.cell, textAlign: "right" }}>{p.users.toLocaleString()}</td>
                        <td style={{ ...tableStyles.cell, textAlign: "right" }}>{duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
