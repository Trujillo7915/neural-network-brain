# Manual Técnico — Neural Network Brain (`v1.0.0`)

**Autor / Copyright:** Fabián Ricardo Trujillo González (`@Trujillo7915`)  
**Licencia:** Apache License 2.0  
**Arquitectura:** Hexagonal (Puertos y Adaptadores) + CQRS + SPA 3D WebGL  

---

## 1. Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Frontend 3D | React 19, TypeScript 5.8, Three.js 0.175, Vite 8 | Cerebro 3D anatómico, modal de creación, Inspector y búsqueda |
| Iconografía | Lucide React (SVG inline `stroke-width=1.75`) | Iconos nítidos sin emojis |
| Backend | Node.js >= 22 (`node:http` nativo), TypeScript ESM `NodeNext` | API REST local + servidor estático SPA |
| Validación | Zod 4 | Fail-Fast de entorno (`env.ts`) y validación HTTP en los bordes |
| Almacenamiento Local | `LocalJsonStoreAdapter` (`./data/local-brain.json`) | Persistencia atómica Plug & Play sin base de datos externa |
| Conectores Opcionales | `AgenticMemoryAdapter`, `Mem0Adapter`, `EccVaultAdapter` | Lectura segura opcional cuando `ENABLE_EXTERNAL_STORES=true` |
| Testing | Vitest 5 + `@vitest/coverage-v8` | Suites unitarias, integración, BDD y Fitness Functions |

---

## 2. Requisitos Previos e Instalación

```bash
git clone https://github.com/Trujillo7915/neural-network-brain.git
cd neural-network-brain
npm install
npm run build
npm start
```

Abre **http://127.0.0.1:4310** en tu navegador.

---

## 3. Variables de Entorno (`.env.example`)

| Variable | Por Defecto | Descripción |
|---|---|---|
| `HOST` | `127.0.0.1` | Interfaz de red local (loopback por seguridad). |
| `PORT` | `4310` | Puerto HTTP de escucha. |
| `LOCAL_BRAIN_PATH` | `./data/local-brain.json` | Archivo de persistencia local de usuario. |
| `STARTER_BRAIN_PATH` | `./data/starter-brain.json` | Plantilla inicial sembrada automáticamente en el primer arranque. |
| `ENABLE_EXTERNAL_STORES` | `false` | Activa `true` para montar conectores externos `.amem`, `mem0` y `.ecc` en modo solo lectura. |
| `CACHE_TTL_MS` | `15000` | TTL en ms de la caché en memoria (`CacheAside`). |
| `RATE_LIMIT_MAX_REQUESTS` | `180` | Límite de peticiones API por ventana deslizante (exime probes liveness/version). |

---

## 4. Especificación de Contratos API
- **OpenAPI 3.1:** [`docs/api/openapi.yaml`](api/openapi.yaml)
- **Colección Postman:** [`docs/api/postman-collection.json`](api/postman-collection.json)
