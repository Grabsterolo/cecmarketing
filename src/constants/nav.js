import {
  Home, LayoutDashboard, BarChart2, MessageCircle, Sparkles, Settings2, FlaskConical,
} from "lucide-react";

export const ROTATING_WORDS = ["campañas", "conversaciones", "métricas", "recomendaciones", "tu marca"];

// Items de navegación principal. La condición controla qué se muestra
// según si las integraciones ya están conectadas (ver Fase 3 del roadmap).
export const NAV_ITEMS = [
  { key: "inicio", label: "Inicio", icon: Home },
  { key: "metricas", label: "Métricas", icon: LayoutDashboard },
  { key: "analytics", label: "Sitio Web", icon: BarChart2 },
  { key: "sofia", label: "Conversaciones de Sofía", icon: MessageCircle },
  { key: "recomendaciones", label: "Recomendaciones", icon: Sparkles },
  { key: "configurar-sofia", label: "Configurar a Sofía", icon: Settings2 },
  { key: "probar-sofia", label: "Probar a Sofía", icon: FlaskConical },
];

// Fuentes de datos que el dashboard puede mostrar. "connected: false" hasta
// que se complete la Fase 3 (acceso a Meta y Google ya pedido a CEC).
export const DATA_SOURCES = [
  { key: "meta", label: "Meta Ads", connected: true },
  { key: "analytics", label: "Google Analytics", connected: true },
  { key: "google", label: "Google Ads", connected: false },
  { key: "sofia", label: "Conversaciones de Sofía", connected: true },
];
