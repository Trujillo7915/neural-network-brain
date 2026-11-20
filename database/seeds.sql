-- ============================================================================
-- Neural Network Brain — Reproducible Seed Data (DML)
-- Populates master catalogs + reference sample snapshot for integrity testing
-- ============================================================================

INSERT INTO memory_sources (source_code, display_name, storage_kind, read_only_enforced) VALUES
    ('local-brain', 'Local Plug & Play Brain JSON', 'json_file', FALSE),
    ('agentic-memory', 'AgenticMemory Cognitive Graph', 'binary_graph', TRUE),
    ('mem0', 'Mem0 Semantic Vector Store', 'vector_sqlite', TRUE),
    ('ecc-memory-vault', 'ECC Structured Memory Vault', 'markdown_vault', TRUE);

INSERT INTO brain_lobes (lobe_code, display_name, functional_role, accent_hex) VALUES
    ('frontal', 'Lóbulo Frontal', 'Decisiones ejecutivas, reglas de trabajo, preferencias y gobernanza', '#f59e0b'),
    ('temporal', 'Lóbulo Temporal', 'Identidad, equipo, proyectos activos y contexto organizacional', '#38bdf8'),
    ('parietal', 'Lóbulo Parietal', 'Hechos técnicos, arquitectura de sistemas, auditorías y correcciones', '#a78bfa'),
    ('occipital', 'Lóbulo Occipital', 'Metodología, estándares de ingeniería, runbooks y handoffs', '#10b981'),
    ('cerebellum', 'Cerebelo', 'Entorno local, puertos, herramientas CLI y contenedores', '#fb7185'),
    ('limbic', 'Sistema Límbico', 'Núcleo asociativo de alta centralidad e integración transversal', '#fbbf24');

INSERT INTO tags (tag_id, tag_name) VALUES
    (1, 'architecture'),
    (2, 'neural-network'),
    (3, 'rules'),
    (4, 'environment'),
    (5, 'onboarding');

INSERT INTO neuron_nodes (
    neuron_id, source_code, lobe_code, external_id, event_kind, title, content,
    confidence, decay_score, access_count, hemisphere, pos_x, pos_y, pos_z, source_created_at
) VALUES
    ('local:core-01', 'local-brain', 'limbic', 'core-01', 'episode',
     'Núcleo Neural Network Brain',
     'Nodo central Plug & Play almacenado en ./data/local-brain.json accesible en http://127.0.0.1:4310.',
     1.000, 0.000, 3, 'left', -0.4500, -0.0500, 0.0800, '2026-11-20T10:00:00.000Z'),
    ('local:frontal-01', 'local-brain', 'frontal', 'frontal-01', 'decision',
     'Arquitectura Hexagonal Pura',
     'Separación estricta entre dominio puro, aplicación CQRS, infraestructura y presentación HTTP.',
     1.000, 0.000, 2, 'right', 1.1500, 0.4500, 1.6500, '2026-11-20T10:10:00.000Z'),
    ('local:cerebellum-01', 'local-brain', 'cerebellum', 'cerebellum-01', 'environment',
     'Runtime Local en Puerto :4310',
     'Ejecución Node.js >= 22 + Vite 8 en http://127.0.0.1:4310 con Docker opcional.',
     0.980, 0.000, 1, 'right', 0.8500, -1.3500, -1.4200, '2026-11-20T11:30:00.000Z');

INSERT INTO neuron_tags (neuron_id, tag_id) VALUES
    ('local:core-01', 2),
    ('local:frontal-01', 1),
    ('local:frontal-01', 3),
    ('local:cerebellum-01', 4);

INSERT INTO synaptic_edges (
    edge_id, source_neuron_id, target_neuron_id, relation_type, edge_origin, weight, created_at
) VALUES
    ('local-edge:1', 'local:frontal-01', 'local:core-01', 'supports', 'local-brain', 0.950, '2026-11-20T10:10:00.000Z'),
    ('sem:local:core-01->local:cerebellum-01', 'local:core-01', 'local:cerebellum-01', 'semantic_link', 'semantic-inferred', 0.620, '2026-11-20T11:35:00.000Z');

INSERT INTO brain_snapshots (
    snapshot_id, mode, growth_stage, total_neurons, total_edges, cortex_density, captured_at
) VALUES
    ('snap-seed-001', 'live', 'embryonic', 3, 2, 0.014, '2026-11-20T12:00:00.000Z');

INSERT INTO snapshot_neurons (snapshot_id, neuron_id, degree_centrality) VALUES
    ('snap-seed-001', 'local:core-01', 2),
    ('snap-seed-001', 'local:frontal-01', 1),
    ('snap-seed-001', 'local:cerebellum-01', 1);

INSERT INTO store_health_logs (
    log_id, snapshot_id, source_code, health_status, latency_ms, items_loaded, error_detail
) VALUES
    (1, 'snap-seed-001', 'local-brain', 'ok', 4, 3, NULL);
