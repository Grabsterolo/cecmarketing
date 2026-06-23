# CEC Marketing Dashboard
<!-- test commit 2 -->

Portal interno de mercadeo del Centro Europeo de Cirugía (CEC). Mismo sistema de diseño que `ceccolaboradores` (login, sidebar, paleta de colores, tipografía), construido como proyecto separado para esta función.

## Stack

- React 18 + Vite
- Supabase (auth + base de datos)
- Recharts (gráficos, cuando se conecten Meta/Google)
- Mismo sistema de diseño que el portal de colaboradores: verde `#1F4A40`, dorado `#C9A24E`, crema `#FAFAF8`, Cormorant Garamond + Manrope

## Estructura

```
src/
  components/
    auth/LoginScreen.jsx       — pantalla de login, mismo diseño que ceccolaboradores
    layout/Sidebar.jsx          — navegación lateral (desktop + mobile drawer)
    sections/
      DashboardHome.jsx         — resumen general
      MetricsSection.jsx        — Meta Ads + Google Ads/Analytics (placeholder, Fase 3)
      SofiaConversationsSection.jsx — conversaciones de WhatsApp, conectado a Supabase
      RecommendationsSection.jsx    — recomendaciones de IA (placeholder, Fase 4)
      ConfigureSofiaSection.jsx     — editor del prompt y base de conocimiento de Sofía
    ui/                         — Card, Logo, PasswordInput, PendingIntegrationCard
  constants/colors.js           — paleta y animaciones, idénticas a ceccolaboradores
  constants/nav.js               — items de navegación y estado de fuentes de datos
  lib/supabase.js                — cliente de Supabase
supabase/schema.sql              — SQL para crear las tablas necesarias
```

## Variables de entorno

Crear un archivo `.env.local` (no se sube al repo) con:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
```

Puede ser el mismo proyecto de Supabase que ya usas para CEC, o uno separado — recomendado: mismo proyecto, tablas nuevas (ver `supabase/schema.sql`), para no duplicar autenticación de usuarios.

## Deploy

Mismo flujo que tus otros proyectos: conectar este repo a Cloudflare Pages, configurar:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- Variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en la configuración del proyecto de Cloudflare.

## Roadmap (orden de construcción)

**Fase 1 — Frontend y editor de Sofía (este entregable)**
Login, dashboard, sidebar, y la sección "Configurar a Sofía" ya funcionando contra Supabase. No depende de acceso externo.

**Fase 2 — Conversaciones de Sofía**
La sección ya está construida y lista para mostrar datos reales en cuanto el backend del webhook de WhatsApp empiece a escribir en la tabla `sofia_conversations`.

**Fase 3 — Conectar Meta y Google** *(pendiente: acceso aún no otorgado por CEC)*
Requiere acceso de administrador a Meta Business Manager y a Google Ads / Analytics. La sección `MetricsSection.jsx` está lista para recibir la integración real una vez haya acceso.

**Fase 4 — Motor de recomendaciones**
Solo tiene sentido con datos reales de ambos lados (campañas + conversaciones) para cruzar. `RecommendationsSection.jsx` queda como placeholder hasta entonces.

## Pendientes generales del proyecto CEC (no específicos de este dashboard)

- **Integrar a Sofía dentro de Zenvia** — agente de WhatsApp todavía no está conectado en producción al webhook de Zenvia Conversion. Es prerequisito para que `sofia_conversations` tenga datos reales.
- Pedir a CEC acceso de administrador a Meta Business Manager y Google Ads / Analytics (bloquea Fase 3).
- Workspace dedicado en la consola de Anthropic para separar el costo de Sofía del resto del uso de Claude.
