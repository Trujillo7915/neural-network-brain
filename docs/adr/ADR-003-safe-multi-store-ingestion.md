# ADR-003: Ingesta Multi-Almacén Segura y Almacén Nativo JSON Atómico

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Autor:** Fabián Ricardo Trujillo González (`@Trujillo7915`)

## Contexto
Los usuarios finales necesitan almacenamiento inmediato sin base de datos externa, mientras que los usuarios avanzados pueden conectar opcionalmente `agentic-memory` (`.agentic-brain.amem`), `mem0` (Qdrant + SQLite) y `ecc-memory-vault` (Markdown YAML).

## Decisión
1. Incorporar `LocalJsonStoreAdapter` como almacén principal por defecto con escritura atómica (`archivo temporal .tmp` + `rename`) y cola serializada de escritura.
2. Mantener los 3 conectores externos desactivados por defecto (`ENABLE_EXTERNAL_STORES=false`) y activables vía `.env` usando adaptadores cooperativos de solo lectura (`execFile` sin shell, `portalocker` cooperativo con fallback SQLite `?mode=ro` y lectura UTF-8).

## Consecuencias
- **Positivas:** Cero dependencias externas obligatorias al descargar el repositorio; cero colisiones de bloqueo cuando se activan conectores externos.
- **Trade-offs:** El almacenamiento JSON local está optimizado para cientos/miles de neuronas por archivo; escalas masivas pueden migrar al esquema SQL normalizado provisto en `database/schema.sql`.
