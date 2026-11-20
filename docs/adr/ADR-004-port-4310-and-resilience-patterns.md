# ADR-004: Puerto :4310, Vinculación Localhost y Patrones de Resiliencia SRE

- **Estado:** Aceptado
- **Fecha:** 2026-11-20
- **Autor:** Fabián Ricardo Trujillo González (`@Trujillo7915`)

## Contexto
Las aplicaciones locales de escritorio frecuentemente colisionan con puertos comunes como `:3000` u `:8080`. Asimismo, exponer notas personales en `0.0.0.0` abriría información privada a la red local sin autenticación.

## Decisión
1. Asignar el puerto por defecto **`4310`** y vincular estrictamente a **`127.0.0.1`** (validado por Zod al arranque).
2. Incorporar *Circuit Breaker* independiente por adaptador, *Retry con Exponential Backoff + Jitter*, *Cache-Aside* con invalidación automática por versión (`StoreVersionMonitor`), *Single-Flight Coalescing* y *Rate Limiting* en el plano HTTP (eximiendo probes `/api/v1/health?mode=liveness` y `/api/v1/brain/version`).

## Consecuencias
- **Positivas:** Cero conflictos con puertos estándar; superficie de ataque minimizada a loopback; actualización visual automática en `< 5 s` ante cambios en disco.
- **Trade-offs:** Acceso remoto intencional requiere configurar explícitamente `HOST` detrás de un proxy autenticado.
