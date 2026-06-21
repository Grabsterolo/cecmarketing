import React from "react";
import { LayoutDashboard } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card, CardHeader } from "../ui/Card.jsx";
import { PendingIntegrationCard } from "../ui/PendingIntegrationCard.jsx";

export function MetricsSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <CardHeader title="Meta Ads y Google Ads / Analytics" />
        <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, margin: 0 }}>
          Esta sección mostrará gasto, alcance, clics y conversiones de las campañas activas, todo en un solo lugar.
        </p>
      </Card>
      <PendingIntegrationCard
        icon={LayoutDashboard}
        title="Esperando acceso a las cuentas"
        description="Para conectar Meta Ads y Google Ads / Analytics se necesita acceso de administrador en ambas plataformas. Una vez CEC lo otorgue, las métricas aparecerán aquí automáticamente."
      />
    </div>
  );
}
