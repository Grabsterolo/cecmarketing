import React from "react";
import { COLORS } from "../../constants/colors.js";

const VARIANTS = {
  default: { bg: COLORS.panelAlt, color: COLORS.textMuted },
  gold: { bg: "rgba(201,162,78,0.14)", color: COLORS.gold },
  success: { bg: COLORS.successBg, color: COLORS.success },
  danger: { bg: COLORS.dangerBg, color: COLORS.danger },
};

export function Badge({ children, variant = "default", style }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 20,
      background: v.bg, color: v.color, fontFamily: "'Manrope', sans-serif",
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children}
    </span>
  );
}
