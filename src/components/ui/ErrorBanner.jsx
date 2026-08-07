import React from "react";
import { COLORS } from "../../constants/colors.js";

export function ErrorBanner({ children }) {
  return (
    <div style={{
      background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`,
      borderRadius: 8, padding: "8px 16px", fontSize: 13,
      color: COLORS.danger, fontFamily: "'Manrope', sans-serif", marginBottom: 16,
    }}>
      {children}
    </div>
  );
}
