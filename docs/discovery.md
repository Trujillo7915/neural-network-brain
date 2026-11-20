# Fase 0 — Concepción, Descubrimiento (Discovery) y Viabilidad del Proyecto

**Proyecto:** Neural Network Brain (`neural-network-brain`)  
**Autor / Copyright:** Fabián Ricardo Trujillo González (`@Trujillo7915`)  
**Licencia:** Apache License 2.0 ([LICENSE](../LICENSE) · [NOTICE](../NOTICE))  
**Versión:** 1.0.0  

---

## 1. Problema de Negocio y Business Case

### 1.1 Dolor a Resolver (*Pain Points*)
Las notas técnicas, decisiones arquitectónicas, rutas de proyectos y memorias de asistentes IA suelen quedar dispersas en archivos planos o bases opacas sin una representación visual navegable. Esto produce:
- **Opacidad cognitiva:** resulta difícil comprender qué sabe un repositorio de conocimiento o cómo se conectan decisiones, proyectos, reglas y entornos.
- **Fricción de adopción para usuarios finales:** las herramientas tradicionales exigen configurar servidores externos o consultar grafos genéricos planos en 2D que no reflejan madurez ni densidad temática.

### 1.2 Propuesta de Valor y FinOps
- **Plug & Play desde el minuto 1:** al clonar o hacer *fork*, el usuario arranca con `./data/local-brain.json` (auto-sembrado desde `./data/starter-brain.json`) y puede crear, vincular y eliminar sus propias memorias directamente desde la interfaz 3D, sin dependencias externas ni costos cloud (`$0 USD/mes`).
- **Extensibilidad segura opcional:** usuarios avanzados pueden activar `ENABLE_EXTERNAL_STORES=true` para montar conectores externos (`agentic-memory`, `mem0`, `ecc-memory-vault`) en modo estrictamente solo lectura.

### 1.3 Métricas de Éxito (North Star & KPIs)
- **North Star Metric:** *100% de las memorias activas explorables e inspeccionables en menos de 200 ms con morfología 3D adaptativa y cero pérdida de datos.*
- **KPI-01 (Plug & Play):** Arranque funcional completo en `<= 3` comandos (`npm install && npm run build && npm start`).
- **KPI-02 (Rendimiento):** Renderizado 3D fluido `>= 50 FPS` (hasta 500 neuronas) y API `P95 < 150 ms`.
- **KPI-03 (Calidad):** Cobertura automatizada `>= 80%` en líneas y ramas, `0 CVEs` críticos/altos.

---

## 2. Investigación de Usuarios y Benchmarking

### 2.1 User Personas
1. **Desarrollador / Estudiante / Investigador:** desea construir su segundo cerebro técnico 3D con rutas, comandos, reglas y decisiones vinculadas por áreas cerebrales.
2. **Ingeniero de IA / Power User:** desea visualizar en vivo sus almacenes externos `.amem`, `mem0` y `.ecc` junto con notas locales sin riesgo de corrupción.

### 2.2 Benchmarking (*Build vs. Buy*)
| Alternativa | Ventajas | Limitaciones | Decisión |
|---|---|---|---|
| Obsidian Graph / D3 2D | Madurez en grafos 2D | Grafos genéricos planos; sin morfología cerebral adaptativa ni API Plug & Play | Descartada |
| **Neural Network Brain (React + Three.js + Hexagonal)** | Cerebro anatómico 3D evolutivo, creación/vinculación local atómica + conectores externos opcionales | Requiere geometría procedural propia | **Seleccionada** |

---

## 3. Viabilidad Técnica y Delimitación del MVP (MoSCoW)

| Prioridad | Capacidad |
|---|---|
| **Must Have** | Almacén local Plug & Play atómico (`POST /memories`, `POST /edges`, `DELETE /memories/:id`), cerebro 3D anatómico adaptativo en 4 etapas, 6 lóbulos funcionales, búsqueda por texto/ruta/etiqueta, Inspector interactivo con ubicación copiable, licencia Apache-2.0 + NOTICE y suite >= 80%. |
| **Should Have** | Simulador de Crecimiento (5–500 neuronas), auto-sincronización por revisión de disco (`/api/v1/brain/version`), conectores externos opcionales RO (`ENABLE_EXTERNAL_STORES=true`), Docker Compose y servicio 24/7 en Windows. |
| **Won't Have (v1.0)** | Escritura sobre conectores externos de solo lectura (protegido con HTTP `403`); multi-tenancy remoto en la nube (ejecución local `127.0.0.1`). |

---

## 4. Gobernanza y Acuerdos de Calidad (DoR / DoD)
- **DoR:** Requerimientos numerados (`RF`/`RNF`/`BR`), escenarios BDD Gherkin, esquema de datos 3FN y contrato OpenAPI 3.1.
- **DoD:** Arquitectura Hexagonal validada por *Fitness Functions*, sanitización verificada sin datos privados ni secretos, `npm audit` limpio (`0 CVEs`), cobertura `>= 80%`, compilación sin errores y documentación integral de los 8 Puntos Mandatorios.
