# ADR-001: Arquitectura Hexagonal, Almacén Local Editable y Conectores Externos Seguros

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Autor:** Fabián Ricardo Trujillo González (`@Trujillo7915`)

## Contexto
Para distribuir **Neural Network Brain** a clientes finales, cualquier usuario debe poder clonar el proyecto, arrancarlo en un paso y crear/vincular sus propias neuronas y sinapsis desde la interfaz 3D, sin obligarlo a instalar motores externos (`amem`, `mem0` o `.ecc`). Al mismo tiempo, si el usuario decide activar conectores de IA externos (`ENABLE_EXTERNAL_STORES=true`), esos almacenes deben permanecer protegidos en modo estrictamente solo lectura.

## Decisión
Adoptar **Arquitectura Hexagonal** separando:
1. **`WritableMemoryStorePort` (`LocalJsonStoreAdapter`):** almacén Plug & Play persistido atómicamente en `./data/local-brain.json` (auto-inicializado desde `./data/starter-brain.json`) con soporte completo de creación, vinculación y borrado controlado (`local:*`).
2. **`MemoryStorePort` (Adaptadores externos opcionales):** `AgenticMemoryAdapter`, `Mem0Adapter` y `EccVaultAdapter` mantienen invariante estricta de solo lectura verificada por *Fitness Functions* en `tests/architecture/fitness.test.ts` y protegida con `ForbiddenOperationError` (HTTP `403`).

## Consecuencias
- **Positivas:** Experiencia inmediata en un solo comando para cualquier usuario; cero riesgo de corrupción sobre bases externas; dominio 100% desacoplado y testeable.
- **Trade-offs:** Requiere mantener ambos puertos (`MemoryStorePort` y `WritableMemoryStorePort`) y reglas de validación explícitas por prefijo `local:*`.
