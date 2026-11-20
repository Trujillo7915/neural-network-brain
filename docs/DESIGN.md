# DESIGN.md — Neural Brain Visualizer

Basado en las directrices `awesome-design-md` y `web-design-guidelines`: estética científica futurista minimalista, obsidiana profunda, precisión hairline, vidrio acrílico esmerilado y cero neón estridente.

---

## 1. Visual Theme & Philosophy
- **Tono:** Neurociencia de precisión / Observatorio científico minimalista.
- **Filosofía clave:** El cerebro 3D anatómico es el protagonista absoluto del viewport (`100vw × 100vh`). Los controles flotan en capas acrílicas translúcidas de bajo ruido visual con bordes hairline (`1px solid rgba(255,255,255,0.08)`), jerarquía tipográfica editorial y micro-interacciones físicas a 60 FPS.
- **Anti-patrones prohibidos:** Sin cajas rígidas tipo tabla 2006, sin resplandores neón radiactivos (`#00FF00` / `#FF00FF`), sin emojis como iconos UI (solo SVG inline limpios con `stroke-width="1.75"`).

---

## 2. Color Palette & Tokens

| Token | Hex / Valor | Uso |
|---|---|---|
| `--bg-obsidian` | `#09090b` | Fondo base del observatorio 3D |
| `--bg-radial-glow` | `radial-gradient(ellipse at 50% 35%, rgba(217, 119, 6, 0.06), transparent 65%)` | Iluminación atmosférica sutil |
| `--surface-glass` | `rgba(18, 18, 22, 0.82)` + `backdrop-filter: blur(14px)` | Paneles flotantes (TopBar, Dock, Inspector) |
| `--surface-elevated` | `#16161b` | Tarjetas interactivas dentro del Inspector |
| `--border-hairline` | `rgba(255, 255, 255, 0.08)` | Bordes de precisión |
| `--border-accent` | `rgba(217, 119, 6, 0.45)` | Borde activo/hover |
| `--text-primary` | `#f4f4f5` | Títulos y contenido principal (contraste > 15:1) |
| `--text-secondary` | `#a1a1aa` | Metadatos y subtítulos (contraste > 6.5:1, WCAG AA) |
| `--accent-amem` | `#d97706` / `#f59e0b` | Fuente `agentic-memory` (Ámbar Dorado) |
| `--accent-mem0` | `#38bdf8` | Fuente `mem0` (Azul Cielo Suave) |
| `--accent-ecc` | `#10b981` | Fuente `ecc-memory-vault` (Esmeralda Salvia) |
| `--lobe-frontal` | `#f59e0b` | Lóbulo Frontal (Decisiones / Reglas) |
| `--lobe-temporal` | `#38bdf8` | Lóbulo Temporal (Proyectos / Identidad) |
| `--lobe-parietal` | `#a78bfa` | Lóbulo Parietal (Hechos / Auditorías) |
| `--lobe-occipital` | `#10b981` | Lóbulo Occipital (Metodología / Runbooks) |
| `--lobe-cerebellum` | `#fb7185` | Cerebelo (Entorno / Infraestructura) |
| `--lobe-limbic` | `#fbbf24` | Sistema Límbico (Núcleo / Hubs) |

---

## 3. Typographic Pairing
- **Display & UI:** `Plus Jakarta Sans`, `Inter`, system sans-serif (`font-weight: 700/800`, `letter-spacing: -0.025em` en encabezados).
- **Kicker / Overlines:** `11px`, uppercase, `letter-spacing: 0.12em`, `font-weight: 700`.
- **Telemetría, IDs, Coordenadas y Contadores:** `JetBrains Mono`, monospace con `font-variant-numeric: tabular-nums`.

---

## 4. Motion, Interactivity & Accessibility
- **Curvas:** `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`, duración `150ms–250ms`.
- **Estados:** `default`, `hover` (`translateY(-1px)` + borde sutil), `active` (`scale(0.98)`), `focus-visible` (anillo dorado 2px), `disabled` (`opacity: 0.4`).
- **Accesibilidad:** Todos los controles interactivos tienen área mínima >= `44×44px` en móvil/táctil, contraste WCAG 2.1 AA y un listado navegable por teclado sincronizado con el grafo 3D.
