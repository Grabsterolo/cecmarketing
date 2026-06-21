import React from "react";
import { COLORS } from "../../constants/colors.js";
import { Card } from "./Card.jsx";

export function PendingIntegrationCard({ icon: Icon, title, description }) {
  return (
    <Card style={{ textAlign: "center", padding: "48px 32px" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: COLORS.panelAlt, display: "flex",
        alignItems: "center", justifyContent: "center",
        margin: "0 auto 18px",
      }}>
        <Icon size={26} color={COLORS.textMuted} />
      </div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: COLORS.green, margin: "0 0 8px" }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, maxWidth: 440, margin: "0 auto" }}>
        {description}
      </p>
    </Card>
  );
}
