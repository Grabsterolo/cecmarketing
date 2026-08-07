import React from "react";
import { COLORS } from "../../constants/colors.js";

const VARIANTS = {
  primary: {
    background: COLORS.green, color: "#fff",
    padding: "12px 20px", fontSize: 14, fontWeight: 700,
  },
  gold: {
    background: COLORS.gold, color: "#fff",
    padding: "12px 20px", fontSize: 14, fontWeight: 700,
  },
};

export function Button({ children, variant = "primary", disabled, style, ...props }) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      disabled={disabled}
      style={{
        border: "none", borderRadius: 8, fontFamily: "'Manrope', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer", display: "flex",
        alignItems: "center", justifyContent: "center", gap: 8,
        opacity: disabled ? 0.7 : 1,
        ...variantStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
