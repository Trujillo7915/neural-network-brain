# Post-Mortem Sin Culpa (Blameless RCA) — Plantilla Estándar

**ID del Incidente:** INC-YYYYMMDD-001  
**Fecha y Hora (UTC-5):** YYYY-MM-DD HH:MM  
**Severidad:** SEV-1 / SEV-2 / SEV-3  
**Duración Total:** XX minutos  
**Autor / Facilitador:** Nombre  

---

## 1. Resumen Ejecutivo
Breve descripción objetiva del impacto percibido por el usuario (ej. adaptador `mem0` en estado `degraded` durante X minutos, mientras `agentic-memory` y `ecc-memory-vault` permanecieron operativos).

## 2. Línea de Tiempo (Correlacionada con `X-Correlation-ID`)
| Hora | Evento | Evidencia (Log / Métrica) |
|---|---|---|
| HH:MM | Inicio de anomalía | Alerta en `/api/v1/health` |
| HH:MM | Circuit Breaker pasa a `OPEN` | Log JSON `correlationId=...` |
| HH:MM | Mitigación aplicada | Recuperación automática / runbook |
| HH:MM | Cierre y verificación | `/api/v1/health` retorna `status: "ok"` |

## 3. Análisis de Causa Raíz (5 Porqués)
1. ¿Por qué ocurrió? ...
2. ¿Por qué...? ...

## 4. Qué Funcionó Bien vs. Qué Mejorar
- **Funcionó bien:** Degradación elegante, cero pérdida de datos, trazabilidad por `X-Correlation-ID`.
- **A mejorar:** Ajustar umbrales de timeout o cobertura de prueba específica.

## 5. Acciones Preventivas Automatizadas
| Acción | Tipo | Responsable | Fecha Objetivo | Estado |
|---|---|---|---|---|
| Agregar caso de regresión en `tests/` | Test automatizado | Tech Lead | YYYY-MM-DD | Pendiente |
