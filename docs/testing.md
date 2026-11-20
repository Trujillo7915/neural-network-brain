# Fase 4 — Estrategia de Pruebas y Documentación de Testing

**Proyecto:** Neural Brain Visualizer (`neural-brain-visualizer`)  
**Framework:** Vitest 5 + `@vitest/coverage-v8` + Load Test Node.js  
**Quality Gate Obligatorio:** Cobertura >= 80% en líneas, ramas, funciones y sentencias (bloqueo automático en `vitest.config.ts`).

---

## 1. Pirámide y Tipos de Pruebas Implementados

| Nivel / Tipo | Archivo(s) | Qué Valida |
|---|---|---|
| **Pruebas Unitarias (Dominio y Geometría)** | `tests/unit/morphology.test.ts`, `tests/unit/semanticLinks.test.ts`, `tests/unit/simulator.test.ts`, `tests/unit/brainGeometry.test.ts` | Reglas de negocio BR-02..BR-07, clasificación determinística de lóbulos, coordenadas 3D reproducibles, generación procedural de hemisferios/surcos/cerebelo/tallo/cuerpo calloso. |
| **Pruebas Unitarias (Resiliencia y Configuración)** | `tests/unit/resilience.test.ts`, `tests/unit/configAndLogger.test.ts`, `tests/unit/adapters.test.ts` | `CircuitBreaker` (`CLOSED`/`OPEN`/`HALF_OPEN`), `RetryPolicy` con backoff + jitter, `CacheAside` TTL, `RateLimiter`, Zod Fail-Fast, `JsonLogger` estructurado y parseo seguro de los 3 adaptadores. |
| **Pruebas de Integración HTTP** | `tests/integration/api.test.ts` | Todos los endpoints `/api/v1/*`, cabeceras de seguridad, CORS restringido a localhost, `X-Correlation-ID`, errores RFC 7807 sin stack traces, bloqueo HTTP 405 sobre mutaciones, rate limit HTTP 429 con `Retry-After` y servicio estático seguro sin path traversal. |
| **Pruebas BDD (Aceptación Gherkin)** | `tests/bdd/acceptance.test.ts` | Escenarios end-to-end de negocio HU-01 a HU-05 (Given-When-Then) incluyendo degradación elegante parcial ante caída de `mem0`. |
| **Fitness Functions de Arquitectura** | `tests/architecture/fitness.test.ts` | Valida mecánicamente arquitectura Hexagonal (0 imports de infraestructura/presentación/Node IO desde `domain`, 0 de infra/presentación desde `application`), límite <= 800 líneas por archivo, prohibición de `console.log` en backend e invariante estricta de solo lectura (0 `writeFile`/`unlink`/`exec` en adaptadores). |
| **Pruebas de Carga y Rendimiento (RNF-01)** | `scripts/load-test.mjs` | Simulación concurrente (150 solicitudes / 15 hilos) validando `P95 < 150 ms`, `P99 < 300 ms`, `>= 50 RPS` y `0` errores. |
| **Verificación Visual & E2E en Navegador Real** | Verificación WebGL en `http://127.0.0.1:4310` | Renderizado anatómico 3D, selección de neuronas, Inspector, navegación por vecinos, filtros/búsqueda, Simulador de Crecimiento y 0 errores de consola/red. |

---

## 2. Cómo Ejecutar las Suites de Pruebas

```powershell
cd C:\IA\neural-brain-visualizer

# 1. Verificación estricta de tipos (frontend + backend)
npm run typecheck

# 2. Suite completa con umbral de cobertura >= 80% (Quality Gate)
npm run test:coverage

# 3. Solo Fitness Functions arquitectónicas
npm run test:fitness

# 4. Prueba de carga local contra el observatorio activo (:4310)
npm run load-test
```

No se requieren credenciales externas ni bases de datos remotas para ejecutar las pruebas unitarias, de integración, BDD ni de arquitectura: todas utilizan dobles de prueba aislados y directorios temporales limpiados en `afterEach`/`afterAll` (estado 100% limpio e idempotente).

---

## 3. Matriz de Casos de Prueba Cubiertos

| Categoría | Casos Verificados | Resultado |
|---|---|---|
| **Happy Path** | Ingesta unificada de las 3 fuentes (`38` neuronas reales), cálculo de etapa `developing`, inspección de neurona + vecinos entrantes/salientes, búsqueda con acentos normalizados, refresh de caché, exportación Prometheus y JSON, simulación determinística `5..500`. | PASS |
| **Casos Límite (Edge Cases)** | Confianza fuera de `[0, 1]` o `NaN`, conteo `0`, frontmatter YAML ausente o incompleto, textos largos (> 72 caracteres), directorio `.ecc` inexistente, archivo `.amem` inexistente, tope de 4 sinapsis semánticas salientes por neurona, promoción de nodos hub de alta centralidad al sistema límbico. | PASS |
| **Manejo de Errores y Seguridad** | HTTP 400 por parámetros Zod inválidos (`simulateCount=2`, `source=invalid`), HTTP 404 RFC 7807 en neurona inexistente sin stack traces, HTTP 405 ante `DELETE`/`PUT` sobre superficie solo lectura, HTTP 429 con `Retry-After` al exceder rate limit, Fail-Fast en env inválido. | PASS |
| **Resiliencia y Carga** | Caída simulada de `mem0` -> HTTP 200 parcial con `overallStatus="degraded"`; apertura y recuperación de `CircuitBreaker`; 150 peticiones concurrentes -> `621.39 RPS`, `P95 = 51.42 ms`, `P99 = 60.86 ms`, `0` errores. | PASS |
