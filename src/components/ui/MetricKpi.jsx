import React from "react";
import { COLORS } from "../../constants/colors.js";

export function MetricKpi({ label, value, sub, note }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 11, letterSpacing: "0.1em",
        textTransform: "uppercase", fontWeight: 600, color: COLORS.textMuted,
        fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 28, fontFamily: "'Manrope', sans-serif",
        fontWeight: 700, color: COLORS.green, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.textMuted,
        fontFamily: "'Manrope', sans-serif" }}>
        {sub}
      </p>
      {note && (
        <p style={{ margin: "2px 0 0", fontSize: 11, color: COLORS.textMuted,
          fontFamily: "'Manrope', sans-serif", fontStyle: "italic" }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function SourceDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%",
        background: color, flexShrink: 0 }} />
      <h4 style={{ margin: 0, fontSize: 15, fontFamily: "'Cormorant Garamond', serif",
        fontWeight: 600, color: COLORS.green }}>
        {label}
      </h4>
    </div>
  );
}

export const tableStyles = {
  cell: {
    padding: "11px 14px", fontSize: 13, fontFamily: "'Manrope', sans-serif",
    color: COLORS.text, borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: "nowrap",
  },
  head: {
    padding: "11px 14px", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: COLORS.textMuted, background: COLORS.panelAlt,
    fontFamily: "'Manrope', sans-serif", whiteSpace: "nowrap",
  },
  tick: {
    fontSize: 11, fontFamily: "'Manrope', sans-serif", fill: COLORS.textMuted,
  },
};
