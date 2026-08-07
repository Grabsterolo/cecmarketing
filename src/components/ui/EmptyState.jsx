import React from "react";
import { COLORS } from "../../constants/colors.js";
import { Card } from "./Card.jsx";

export function EmptyState({ icon, title, description }) {
  return (
    <Card>
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        {icon || <div style={{ fontSize: 28, color: COLORS.gold, marginBottom: 12 }}>✦</div>}
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: COLORS.green, fontFamily: "'Manrope', sans-serif" }}>
          {title}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </Card>
  );
}
