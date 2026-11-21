# Changelog

All notable changes to **Neural Network Brain** are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-20

### Added
- **Intelligent Memory Pruning Engine (`MemoryPruningService`):** pure domain service implementing human-like selective forgetting:
  - **Ephemeral TTL Pruning:** automatically identifies ephemeral memories (`plans`, `temp`, `ephemeral`, `daily`, `plan-*`, `post-mortem`) older than a configurable TTL (default: 3 days).
  - **Semantic/Lexical Deduplication:** detects duplicate or superseded memories via Jaccard token similarity (configurable same-kind and cross-kind thresholds), preserving the most recent record.
  - **Core Memory Protection:** long-term core kinds (`identity`, `rules`, `methodology`, `environment`, `team`, `project_architecture`, `runbook`, `preference`) are never auto-pruned as ephemeral.
- **Pruning API Endpoint (`POST /api/v1/brain/prune`):** supports `dryRun` preview mode, custom `ephemeralTtlDays`, and similarity thresholds with Zod validation and cache invalidation.
- **Unit Test Suite (`tests/unit/pruning.test.ts`):** verifies ephemeral TTL pruning, core kind protection, and newest-first deduplication.

## [1.0.0] - 2026-11-20

### Added
- **Initial Public End-User Release (`v1.0.0`):**
  - **Adaptive 3D Anatomical Brain Engine (React 19 + Three.js + TypeScript):** procedural left/right hemispheres, longitudinal fissure, cortical folds, cerebellum, brainstem, corpus callosum, animated synaptic pulses, and 4 dynamic cortical growth stages (*Embryonic*, *Developing*, *Mature*, *Neocortex*).
  - **Plug & Play Local Memory Engine (`LocalJsonStoreAdapter`):** auto-seeds `./data/local-brain.json` from `./data/starter-brain.json` (24 sample neurons, 28 synapses across 6 anatomical lobes) with atomic writes for creating neurons (`POST /api/v1/brain/memories`), linking synapses (`POST /api/v1/brain/edges`), and safe deletion (`DELETE /api/v1/brain/memories/:id`).
  - **Interactive 3D UI:** **+ Nueva Memoria** creation modal, 1-click synapse linking and deletion in `NeuronInspector`, copyable **Ubicaciones Vinculadas** chips (`LocationExtractor`), real-time search & filtering, 5s auto-sync via `GET /api/v1/brain/version`, and non-destructive Growth Simulator (`5–500` neurons).
  - **Optional External Read-Only Connectors (`ENABLE_EXTERNAL_STORES=true`):** safe read-only support for `agentic-memory`, `mem0`, and `ecc-memory-vault`.
  - **SRE & Hexagonal Architecture:** `CircuitBreaker`, `RetryPolicy`, `CacheAside`, `Single-Flight Coalescing`, `RateLimiter`, Zod Fail-Fast config, RFC 7807 errors, JSON structured logging, OpenAPI 3.1, Docker Compose, and Windows 24/7 supervisor scripts.
  - **Copyright & Licensing:** Official **Apache License 2.0** ([LICENSE](LICENSE)) and attribution [NOTICE](NOTICE) for **Fabián Ricardo Trujillo González (`@Trujillo7915`)**.
