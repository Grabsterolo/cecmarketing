import React, { useState } from "react";
import { COLORS } from "../../constants/colors.js";

export function Logo({ width = 200 }) {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      <img
        src="/logo-blanco.png"
        alt="Centro Europeo de Cirugía"
        style={{ width, height: "auto", display: "block", margin: "0 auto" }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div style={{ textAlign: "center", lineHeight: 1.2 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 18, color: "#FFFFFF", letterSpacing: "0.08em" }}>Centro Europeo</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 22, color: COLORS.goldSoft, letterSpacing: "0.16em" }}>DE CIRUGÍA</div>
    </div>
  );
}
