import { COLORS } from "../constants/colors.js";

export const inputStyle = {
  width: "100%", background: "#F7F5F0",
  border: "1.5px solid rgba(31,74,64,0.12)", borderRadius: 8,
  padding: "12px 14px", color: "#1F4A40", fontSize: 16,
  outline: "none", boxSizing: "border-box",
  fontFamily: "'Manrope', sans-serif", transition: "border-color 0.2s", display: "block",
};

export const taStyle = {
  width: "100%", background: COLORS.inputBg, border: `1.5px solid ${COLORS.border}`,
  borderRadius: 8, padding: "10px 14px", color: COLORS.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", resize: "vertical",
  fontFamily: "'Manrope', sans-serif", transition: "border-color 0.2s",
};

export const btnCancelStyle = {
  flex: 1, background: "transparent", border: `1.5px solid ${COLORS.border}`,
  borderRadius: 8, padding: "11px 16px", color: COLORS.textMuted, fontSize: 14,
  fontWeight: 600, cursor: "pointer", fontFamily: "'Manrope', sans-serif",
};

export const btnSubmitStyle = {
  flex: 2, background: `linear-gradient(135deg, ${COLORS.goldSoft}, ${COLORS.gold})`,
  border: "none", borderRadius: 8, padding: "11px 16px", color: "#FFF", fontSize: 14,
  fontWeight: 700, cursor: "pointer", fontFamily: "'Manrope', sans-serif",
  boxShadow: "0 4px 14px rgba(201,162,78,0.4)",
};
