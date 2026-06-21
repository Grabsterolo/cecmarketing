import React from "react";
import { Sparkles } from "lucide-react";
import { COLORS } from "../../constants/colors.js";
import { Card } from "../ui/Card.jsx";
import { PendingIntegrationCard } from "../ui/PendingIntegrationCard.jsx";

export function RecommendationsSection() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, margin: 0 }}>
          Aquí Claude va a comparar lo que la gente pregunta por WhatsApp contra lo que se está pautando en Meta y Google, y va a plantear oportunidades — nunca decisiones automáticas. Cada sugerencia llega con su razonamiento para que el equipo decida si actúa.
        </p>
      </Card>
      <PendingIntegrationCard
        icon={Sparkles}
        title="Necesita datos de ambos lados"
        description="Las recomendaciones solo tienen sentido cuando hay datos reales de campañas y de conversaciones para cruzar. Esta sección se activa después de conectar Meta, Google, y de tener algunas semanas de conversaciones reales de Sofía."
      />
    </div>
  );
}
