# Neural Network Brain (`v1.0.0`)

[![Version](https://img.shields.io/badge/release-v1.0.0-amber.svg)](https://github.com/Trujillo7915/neural-network-brain/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](tsconfig.json)
[![Three.js](https://img.shields.io/badge/WebGL-Three.js-000000.svg)](src/web/brain3d/BrainScene.ts)

**An interactive 3D Neural Network Brain Visualizer & Local Memory Graph Engine whose cortical morphology evolves dynamically with your data.**

*Un observatorio cerebral 3D interactivo y motor local de memoria en grafo cuya morfología cortical evoluciona dinámicamente según el volumen de tus datos.*

---

## Highlights / Características Principales

- **Dynamic Anatomical 3D Brain (`Three.js` + `React 19`):** Procedural left/right cerebral hemispheres, longitudinal fissure, cortical gyri/sulci folds, cerebellum, brainstem, corpus callosum, and animated synaptic pulses that grow across **4 morphological stages**:
  1. `embryonic` (*Corteza Embrionaria*, `0–19` neurons)
  2. `developing` (*Corteza en Desarrollo*, `20–59` neurons)
  3. `mature` (*Corteza Madura*, `60–179` neurons)
  4. `neocortex` (*Neocorteza Hiperconectada*, `180+` neurons)
- **Plug & Play From Minute One:** Ships with an atomic local JSON store (`./data/local-brain.json`, auto-seeded from [`data/starter-brain.json`](data/starter-brain.json)) with **24 starter neurons** and **28 synapses** across all **6 functional lobes** (*Frontal, Temporal, Parietal, Occipital, Cerebellum, Limbic*).
- **Create, Link & Inspect in Real Time:**
  - Click **+ Nueva Memoria** in the UI to store ideas, architecture notes, file paths, or URLs and link them to existing neurons.
  - Click any 3D neuron to inspect full content, confidence score, copyable **Linked Locations** (`C:\...`, `./...`, `http://...`, `:port`), tags, and navigable 1-hop synaptic neighbors.
  - Link new synapses in 1 click or remove local memories safely from the Inspector.
- **Growth Simulator (`5–500` neurons):** Preview how the 3D cortex folds and densifies at scale without touching your real stored memories.
- **Optional External AI Memory Connectors (Read-Only):** Set `ENABLE_EXTERNAL_STORES=true` in `.env` to also visualize local `agentic-memory` (`.amem`), `mem0` (Qdrant + SQLite), and `ecc-memory-vault` (Markdown YAML) stores safely in strict read-only mode.
- **Enterprise Engineering & SRE Resilience:** Hexagonal Architecture enforced by automated Fitness Functions, Zod border validation, RFC 7807 error responses, `CircuitBreaker`, `Retry + Exponential Backoff + Jitter`, `CacheAside` with disk-mtime auto-sync (`/api/v1/brain/version`), `Single-Flight Coalescing`, and `RateLimiter`.

---

## Quick Start / Inicio Rápido

### Prerequisites
- **Node.js `>= 22.0.0`** (`npm` included)

### 1. Fork, Clone & Run Locally
```bash
git clone https://github.com/Trujillo7915/neural-network-brain.git
cd neural-network-brain
npm install
npm run build
npm start
```
Open **http://127.0.0.1:4310** in your browser.

### 2. Development Mode (Hot Reload)
```bash
# Terminal 1 — API Server (:4310)
npm run dev:api

# Terminal 2 — Vite Dev Server (:5173 proxying /api -> :4310)
npm run dev:web
```

### 3. Docker Compose (Plug & Play)
```bash
docker compose up --build -d
```
Data persists in `./data/local-brain.json`.

---

## REST API Overview (`http://127.0.0.1:4310`)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/brain` | Live or simulated (`?simulateCount=250`) 3D brain snapshot |
| `GET` | `/api/v1/brain/version` | Lightweight `mtime` revision token for 5s auto-sync |
| `GET` | `/api/v1/brain/nodes/:id` | Full neuron details & 1-hop synaptic neighborhood |
| `GET` | `/api/v1/brain/search` | Filter by query (`q`), `source`, `lobe`, `minConfidence` |
| `POST` | `/api/v1/brain/memories` | Create a local neuron + optional initial links |
| `POST` | `/api/v1/brain/edges` | Create an explicit synapse between two local neurons |
| `DELETE` | `/api/v1/brain/memories/:id` | Delete a local (`local:*`) neuron & its edges |
| `POST` | `/api/v1/brain/refresh` | Invalidate cache & reload from disk |
| `GET` | `/api/v1/health` | Store health, circuit breakers & fast `?mode=liveness` |
| `GET` | `/api/v1/metrics` | JSON & Prometheus metrics |

Full OpenAPI 3.1 contract: [docs/api/openapi.yaml](docs/api/openapi.yaml) · Postman collection: [docs/api/postman-collection.json](docs/api/postman-collection.json).

---

## Verification & Quality Gates

```bash
npm run typecheck
npm run test:coverage
npm run build
npm audit
```

---

## Documentation / Documentación

- **Discovery & Viability:** [docs/discovery.md](docs/discovery.md)
- **Requirements, Business Rules & BDD:** [docs/requirements.md](docs/requirements.md)
- **Data Model (MER, 3NF/BCNF, SQL DDL/DML):** [docs/data-model.md](docs/data-model.md) · [database/schema.sql](database/schema.sql) · [database/seeds.sql](database/seeds.sql)
- **System Architecture & UML Diagrams:** [docs/architecture.md](docs/architecture.md) · [docs/uml-diagrams.md](docs/uml-diagrams.md) · [docs/DESIGN.md](docs/DESIGN.md) · [docs/adr/README.md](docs/adr/README.md)
- **Testing & Quality Report:** [docs/testing.md](docs/testing.md) · [docs/reports/informe-desarrollo-calidad.md](docs/reports/informe-desarrollo-calidad.md)
- **Manuals & Operations:** [docs/manual-usuario.md](docs/manual-usuario.md) · [docs/manual-tecnico.md](docs/manual-tecnico.md) · [docs/manual-operaciones.md](docs/manual-operaciones.md) · [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Copyright & License

**Copyright © 2026 Fabián Ricardo Trujillo González ([https://github.com/Trujillo7915](https://github.com/Trujillo7915))**

Licensed under the **Apache License, Version 2.0** (the "License"); you may not use this project except in compliance with the License.
You may obtain a copy of the License in the [LICENSE](LICENSE) file and required attribution notices in [NOTICE](NOTICE).

Any fork, redistribution, or derivative work **must retain** the original copyright header and [NOTICE](NOTICE) attribution to **Fabián Ricardo Trujillo González (`@Trujillo7915`)**.
