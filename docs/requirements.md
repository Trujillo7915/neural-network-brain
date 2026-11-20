# Fase 1 — Especificación de Requerimientos del Usuario

**Proyecto:** Neural Network Brain (`neural-network-brain`)  
**Versión:** 1.0.0  

---

## 1. Requerimientos Funcionales (RF)

| ID | Prioridad | Descripción | Entradas | Salida Esperada |
|---|---|---|---|---|
| **RF-01** | Must | Almacén local Plug & Play (`local-brain`) auto-inicializado desde `./data/starter-brain.json` en el primer arranque. | `LOCAL_BRAIN_PATH`, `STARTER_BRAIN_PATH` | Archivo `./data/local-brain.json` con neuronas y sinapsis iniciales. |
| **RF-02** | Must | Creación interactiva de memorias locales (`POST /api/v1/brain/memories`) con título, contenido, categoría, confianza, etiquetas y vínculos iniciales opcionales. | `CreateMemoryRequest` | HTTP `201 Created` + `BrainSnapshot` actualizado atómicamente. |
| **RF-03** | Must | Vinculación explícita de sinapsis (`POST /api/v1/brain/edges`) entre neuronas locales desde el modal o el Inspector. | `CreateEdgeRequest` | HTTP `201 Created` + nueva `SynapticEdge` persistida. |
| **RF-04** | Must | Eliminación controlada de memorias locales (`DELETE /api/v1/brain/memories/:id`) con limpieza en cascada de sus aristas incidentes y bloqueo HTTP `403` para fuentes externas RO. | `nodeId` | HTTP `200 OK` + snapshot limpio (o `403` / `404` RFC 7807). |
| **RF-05** | Must | Morfología cerebral 3D adaptativa según volumen de datos (`GrowthStage` en 4 etapas) y clasificación determinística en 6 lóbulos anatómicos. | `BrainSnapshot` | Escena 3D anatómica escalada y plegada acorde al total de neuronas. |
| **RF-06** | Must | Generación automática de sinapsis semánticas transversales (`SemanticLinkService`) y extracción automática de rutas/URLs/puertos (`LocationExtractor`). | Nodos activos | Enlaces semánticos acotados (`<= 4` por nodo) + `NeuronNode.locations`. |
| **RF-07** | Must | Interacción 3D directa, buscador por texto/ruta/etiqueta, filtros por fuente/lóbulo e Inspector con vecindario navegable y chips copiables de ubicación. | Eventos UI / query | Foco de cámara, rutas iluminadas e inspección completa. |
| **RF-08** | Should | Simulador de Crecimiento no destructivo (`5..500` neuronas) para proyectar etapas corticales sin alterar `./data/local-brain.json`. | `simulateCount` | Snapshot con `mode: "simulation"`. |
| **RF-09** | Should | Auto-sincronización ligera mediante `GET /api/v1/brain/version` basada en `mtime`/`size` en disco. | Polling 5s visible | Actualización automática del cerebro 3D cuando cambian los datos. |
| **RF-10** | Should | Conectores externos opcionales de solo lectura (`ENABLE_EXTERNAL_STORES=true`) para `.amem`, `mem0` y `.ecc` con degradación elegante si alguno falla. | Env flags | Fusión multi-fuente sin riesgo de corrupción externa. |

---

## 2. Requerimientos No Funcionales (RNF)

| ID | Categoría | Criterio Medible |
|---|---|---|
| **RNF-01** | Rendimiento API | Latencia `P95 < 150 ms` y `P99 < 300 ms` en lecturas locales concurrentes (`>= 50 RPS`). |
| **RNF-02** | Rendimiento 3D | `>= 50 FPS` en escenas WebGL de hasta 500 neuronas. |
| **RNF-03** | Seguridad | Bind por defecto en `127.0.0.1:4310`; escritura atómica local; body cap `64 KB`; validación `Zod`; respuestas RFC 7807 sin stack traces; `0 CVEs`. |
| **RNF-04** | Resiliencia SRE | *Circuit Breaker*, *Retry + Exponential Backoff + Jitter*, *Cache-Aside* con invalidación por versión, *Single-Flight Coalescing* y *Rate Limiter*. |
| **RNF-05** | Calidad | Arquitectura Hexagonal + Fitness Functions + cobertura `>= 80%` en líneas y ramas. |
| **RNF-06** | Accesibilidad | Contraste WCAG 2.1 AA (`>= 4.5:1`), navegación alternativa completa por teclado e índice lateral accesible. |
| **RNF-07** | Observabilidad | Logs JSON estructurados con `X-Correlation-ID` + `/api/v1/health` + `/api/v1/metrics`. |

---

## 3. Reglas de Negocio (BR)

- **BR-01 (Protección de Fuentes Externas):** Solo las neuronas `local:*` son mutables; cualquier intento de borrar nodos externos retorna HTTP `403 FORBIDDEN_OPERATION`.
- **BR-02 (Etapas de Crecimiento):** `embryonic` (`0–19`), `developing` (`20–59`), `mature` (`60–179`), `neocortex` (`180+`).
- **BR-03 (Mapeo Determinístico a Lóbulos):** *Frontal* (`decision`, `rules`, `preference`), *Temporal* (`projects`, `identity`, `context`), *Parietal* (`fact`, `architecture`, `correction`), *Occipital* (`methodology`, `runbook`, `handoff`), *Cerebelo* (`environment`, `docker`, `cli`), *Límbico* (`episode` o centralidad de grado `>= 10`).
- **BR-04 (Posición 3D Reproducible):** Coordenadas `(x, y, z)` determinísticas mediante hash FNV-1a sobre `node.id`.
- **BR-05 (No Auto-Bucles):** Una sinapsis nunca puede conectar una neurona consigo misma (`sourceId !== targetId`).
- **BR-06 (Aislamiento de Simulación):** Nodos sintéticos prefijados con `sim:` y `mode: "simulation"` sin tocar almacenamiento en disco.

---

## 4. Criterios de Aceptación (BDD / Gherkin)

```gherkin
Feature: Gestión Plug & Play de memorias y morfología cerebral 3D
  Scenario: Crear y vincular una nueva memoria local desde el cliente final
    Given el usuario inicia Neural Network Brain con local-brain habilitado
    When envía POST /api/v1/brain/memories con título, contenido y vínculo hacia "local:core-01"
    Then el servidor responde HTTP 201 con la nueva neurona "local:*" y su arista hacia "local:core-01"
    And la neurona queda persistida atómicamente en disco

  Scenario: Bloquear eliminación de neuronas externas de solo lectura
    Given existe una neurona externa "amem:0"
    When se solicita DELETE /api/v1/brain/memories/amem%3A0
    Then el servidor responde HTTP 403 en formato RFC 7807 Problem Details
```
