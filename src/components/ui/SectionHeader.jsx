import React from "react";
import { COLORS } from "../../constants/colors.js";

export function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: subtitle ? 4 : 0 }}>
          {icon}
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: COLORS.green }}>
            {title}
          </h2>
        </div>
        {subtitle && (
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, fontFamily: "'Manrope', sans-serif" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
