import React, { useState, useCallback } from "react";
import { Menu } from "lucide-react";
import { COLORS } from "../constants/colors.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Logo } from "./ui/Logo.jsx";
import { Sidebar, MobileDrawer } from "./layout/Sidebar.jsx";
import { DashboardHome } from "./sections/DashboardHome.jsx";
import { MetricsSection } from "./sections/MetricsSection.jsx";
import { SofiaConversationsSection } from "./sections/SofiaConversationsSection.jsx";
import { RecommendationsSection } from "./sections/RecommendationsSection.jsx";
import { ConfigureSofiaSection } from "./sections/ConfigureSofiaSection.jsx";

const SECTION_TITLES = {
  inicio: "Inicio",
  metricas: "Métricas",
  sofia: "Conversaciones de Sofía",
  recomendaciones: "Recomendaciones",
  "configurar-sofia": "Configurar a Sofía",
};

export function Dashboard({ onLogout, profile }) {
  const [active, setActive] = useState("inicio");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const noAnim = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [displayActive, setDisplayActive] = useState("inicio");
  const [sectionPhase, setSectionPhase] = useState(null);

  const navigate = useCallback((next) => {
    if (next === displayActive) return;
    setActive(next);
    if (noAnim) { setDisplayActive(next); return; }
    setSectionPhase("out");
    setTimeout(() => { setDisplayActive(next); setSectionPhase("in"); }, 170);
  }, [displayActive, noAnim]);

  const sectionAnim = (!sectionPhase || noAnim) ? {} : sectionPhase === "out"
    ? { animation: "sectionOut 0.17s ease-in both" }
    : { animation: "sectionIn 0.22s ease-out both" };

  const [dashDone, setDashDone] = useState(false);
  const dashboardInAnim = (!dashDone && !noAnim) ? { animation: "dashboardIn 0.45s ease-out both" } : {};

  function renderSection() {
    switch (displayActive) {
      case "inicio": return <DashboardHome profile={profile} setActive={navigate} />;
      case "metricas": return <MetricsSection />;
      case "sofia": return <SofiaConversationsSection />;
      case "recomendaciones": return <RecommendationsSection />;
      case "configurar-sofia": return <ConfigureSofiaSection />;
      default: return null;
    }
  }

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Manrope', sans-serif" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`,
          position: "sticky", top: 0, zIndex: 20,
        }}>
          <Logo width={110} />
          <button onClick={openDrawer} style={{
            border: "none", background: COLORS.panelAlt, borderRadius: 8,
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: COLORS.green,
          }}>
            <Menu size={18} />
          </button>
        </div>
        <MobileDrawer open={drawerOpen} onClose={closeDrawer} active={active} setActive={navigate} onLogout={onLogout} />
        <div style={{ padding: "20px 16px 40px", ...dashboardInAnim }} onAnimationEnd={() => setDashDone(true)}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: COLORS.green, margin: "0 0 18px" }}>
            {SECTION_TITLES[displayActive]}
          </h1>
          <div style={sectionAnim}>{renderSection()}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "'Manrope', sans-serif" }}>
      <Sidebar active={active} setActive={navigate} onLogout={onLogout} />
      <div style={{ flex: 1, padding: "36px 44px 60px", ...dashboardInAnim }} onAnimationEnd={() => setDashDone(true)}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 600, color: COLORS.green, margin: "0 0 24px" }}>
          {SECTION_TITLES[displayActive]}
        </h1>
        <div style={{ maxWidth: 900, ...sectionAnim }}>{renderSection()}</div>
      </div>
    </div>
  );
}
