# Fase 2 — Diagramas Dinámicos UML (Secuencia y Flujos Críticos)

**Proyecto:** Neural Brain Visualizer (`neural-brain-visualizer`)  
**Versión:** 1.0.0  

---

## 1. Secuencia — Carga del Cerebro 3D en Vivo (Con Caché y Resiliencia)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant UI as "React + Three.js BrainScene"
    participant API as "HTTP Presentation (:4310)"
    participant UC as "GetBrainSnapshotUseCase"
    participant Cache as "CacheAside (TTL 15s)"
    participant CB as "CircuitBreaker x3"
    participant Adapters as "Adapters (amem / mem0 / ecc)"
    participant Domain as "Morphology & SemanticLink Services"

    Usuario->>UI: Abre http://127.0.0.1:4310
    UI->>API: GET /api/v1/brain (X-Correlation-ID)
    API->>UC: execute(query)
    UC->>Cache: get("live-snapshot")
    alt Cache Hit
        Cache-->>UC: BrainSnapshot cacheado
    else Cache Miss
        par Lectura concurrente segura
            UC->>CB: execute(agentic-memory)
            CB->>Adapters: execFile("amem", ["export", path])
            Adapters-->>CB: RawNodes + RawEdges
        and
            UC->>CB: execute(mem0)
            CB->>Adapters: read_mem0_readonly.py (portalocker / SQLite RO)
            Adapters-->>CB: RawSemanticNodes
        and
            UC->>CB: execute(ecc-memory-vault)
            CB->>Adapters: readMarkdownFiles(UTF-8)
            Adapters-->>CB: RawVaultNodes
        end
        UC->>Domain: buildSnapshot(rawNodes, rawEdges, storeHealth)
        Domain->>Domain: Clasificar lóbulos + coords 3D + GrowthStage + sinapsis semánticas
        Domain-->>UC: BrainSnapshot inmutable
        UC->>Cache: set("live-snapshot", snapshot, TTL)
    end
    UC-->>API: BrainSnapshotDTO
    API-->>UI: HTTP 200 OK (JSON)
    UI->>UI: Ajustar corteza 3D al GrowthStage + renderizar neuronas y axones
    UI-->>Usuario: Cerebro 3D interactivo listo
```

---

## 2. Secuencia — Inspección Interactiva de una Neurona y Navegación Sináptica

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Scene as "Three.js Raycaster & Camera"
    participant App as "React App State"
    participant API as "GET /api/v1/brain/nodes/:id"
    participant UC as "GetNeuronDetailUseCase"
    participant Inspector as "NeuronInspector Drawer"

    Usuario->>Scene: Clic sobre neurona 3D (ej. amem:0)
    Scene->>Scene: Resaltar neurona + 1-hop sinapsis + enfocar cámara
    Scene->>App: onSelectNeuron("amem:0")
    App->>API: GET /api/v1/brain/nodes/amem%3A0
    API->>UC: execute("amem:0")
    alt Neurona encontrada
        UC-->>API: NeuronDetailDTO (contenido, metadatos, vecinos entrantes/salientes)
        API-->>App: HTTP 200 OK
        App->>Inspector: Renderizar contenido completo y tarjetas de vecinos
        Usuario->>Inspector: Clic en vecino conectado ("amem:2")
        Inspector->>App: onSelectNeuron("amem:2")
        App->>Scene: Transición suave de cámara hacia "amem:2"
    else Neurona inexistente
        UC-->>API: NodeNotFoundError
        API-->>App: HTTP 404 (RFC 7807 Problem Details)
        App-->>Usuario: Mensaje claro de neurona no encontrada
    end
```

---

## 3. Secuencia — Simulador de Crecimiento Cerebral (Sin Afectar Disco)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Dock as "ControlDock (Slider 5..500)"
    participant API as "GET /api/v1/brain?simulateCount=250"
    participant UC as "GetBrainSnapshotUseCase"
    participant Sim as "GrowthSimulatorService"
    participant Morph as "BrainMorphologyService"

    Usuario->>Dock: Activa Simulador y mueve deslizador a 250
    Dock->>API: GET /api/v1/brain?simulateCount=250
    API->>API: Zod valida entero en [5..500]
    API->>UC: execute({ simulateCount: 250 })
    UC->>Sim: generateSyntheticDataset(250)
    Sim-->>UC: 250 nodos y sinapsis determinísticas (prefijo sim:)
    UC->>Morph: buildSnapshot(mode="simulation")
    Morph-->>UC: BrainSnapshot (growthStage="neocortex", scale=1.08, sulci=1.0)
    UC-->>API: BrainSnapshotDTO
    API-->>Dock: HTTP 200 OK (mode="simulation")
    Dock-->>Usuario: Cerebro 3D evoluciona a Neocorteza Hiperconectada
```

---

## 4. Secuencia — Degradación Elegante ante Fallo de Adaptador (Circuit Breaker)

```mermaid
sequenceDiagram
    autonumber
    participant UC as "GetBrainSnapshotUseCase"
    participant CB as "CircuitBreaker(mem0)"
    participant Retry as "RetryPolicy (Backoff + Jitter)"
    participant Mem0 as "Mem0Adapter"

    UC->>CB: execute(loadMem0)
    alt Circuito CLOSED o HALF_OPEN
        CB->>Retry: runWithRetry(loadMem0, maxRetries=2)
        Retry->>Mem0: Intento 1 (portalocker)
        Mem0-->>Retry: TimeoutError
        Retry->>Mem0: Intento 2 (backoff + jitter)
        Mem0-->>Retry: TimeoutError (fallback SQLite RO falló)
        Retry-->>CB: StoreUnavailableError
        CB->>CB: Incrementa failureCount (si >= 3 -> OPEN)
        CB-->>UC: Error capturado
    else Circuito OPEN
        CB-->>UC: CircuitOpenError inmediato (Fail Fast)
    end
    UC->>UC: Registra mem0="error", agrega nodos de amem + ecc
    UC-->>UC: overallStatus="degraded" (HTTP 200 parcial válido)
```
