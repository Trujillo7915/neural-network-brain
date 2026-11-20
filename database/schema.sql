-- ============================================================================
-- Neural Brain Visualizer — Physical Data Model (DDL)
-- Standard ANSI SQL (Compatible with SQLite 3 / PostgreSQL 16 / MySQL 8)
-- Normalized to 3NF / BCNF — Explicit PK, FK, NOT NULL, UNIQUE, CHECK
-- ============================================================================

CREATE TABLE memory_sources (
    source_code        VARCHAR(32)  NOT NULL,
    display_name       VARCHAR(80)  NOT NULL,
    storage_kind       VARCHAR(32)  NOT NULL,
    read_only_enforced BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_memory_sources PRIMARY KEY (source_code),
    CONSTRAINT uq_memory_sources_name UNIQUE (display_name),
    CONSTRAINT chk_memory_sources_kind CHECK (storage_kind IN ('json_file', 'binary_graph', 'vector_sqlite', 'markdown_vault'))
);

CREATE TABLE brain_lobes (
    lobe_code       VARCHAR(32)  NOT NULL,
    display_name    VARCHAR(80)  NOT NULL,
    functional_role VARCHAR(160) NOT NULL,
    accent_hex      VARCHAR(7)   NOT NULL,
    CONSTRAINT pk_brain_lobes PRIMARY KEY (lobe_code),
    CONSTRAINT uq_brain_lobes_name UNIQUE (display_name),
    CONSTRAINT chk_brain_lobes_code CHECK (lobe_code IN ('frontal', 'temporal', 'parietal', 'occipital', 'cerebellum', 'limbic')),
    CONSTRAINT chk_brain_lobes_hex CHECK (accent_hex LIKE '#%')
);

CREATE TABLE neuron_nodes (
    neuron_id         VARCHAR(128)  NOT NULL,
    source_code       VARCHAR(32)   NOT NULL,
    lobe_code         VARCHAR(32)   NOT NULL,
    external_id       VARCHAR(128)  NOT NULL,
    event_kind        VARCHAR(40)   NOT NULL,
    title             VARCHAR(200)  NOT NULL,
    content           TEXT          NOT NULL,
    confidence        DECIMAL(4,3)  NOT NULL DEFAULT 1.000,
    decay_score       DECIMAL(4,3)  NOT NULL DEFAULT 0.000,
    access_count      INTEGER       NOT NULL DEFAULT 0,
    hemisphere        VARCHAR(16)   NOT NULL,
    pos_x             DECIMAL(8,4)  NOT NULL,
    pos_y             DECIMAL(8,4)  NOT NULL,
    pos_z             DECIMAL(8,4)  NOT NULL,
    source_created_at VARCHAR(40)   NOT NULL,
    CONSTRAINT pk_neuron_nodes PRIMARY KEY (neuron_id),
    CONSTRAINT uq_neuron_source_ext UNIQUE (source_code, external_id),
    CONSTRAINT fk_neuron_nodes_source FOREIGN KEY (source_code)
        REFERENCES memory_sources (source_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_neuron_nodes_lobe FOREIGN KEY (lobe_code)
        REFERENCES brain_lobes (lobe_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_neuron_confidence CHECK (confidence >= 0.000 AND confidence <= 1.000),
    CONSTRAINT chk_neuron_decay CHECK (decay_score >= 0.000 AND decay_score <= 1.000),
    CONSTRAINT chk_neuron_access CHECK (access_count >= 0),
    CONSTRAINT chk_neuron_hemisphere CHECK (hemisphere IN ('left', 'right', 'midline'))
);

CREATE TABLE synaptic_edges (
    edge_id          VARCHAR(160) NOT NULL,
    source_neuron_id VARCHAR(128) NOT NULL,
    target_neuron_id VARCHAR(128) NOT NULL,
    relation_type    VARCHAR(32)  NOT NULL,
    edge_origin      VARCHAR(32)  NOT NULL,
    weight           DECIMAL(4,3) NOT NULL DEFAULT 1.000,
    created_at       VARCHAR(40)  NOT NULL,
    CONSTRAINT pk_synaptic_edges PRIMARY KEY (edge_id),
    CONSTRAINT fk_synaptic_edges_src FOREIGN KEY (source_neuron_id)
        REFERENCES neuron_nodes (neuron_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_synaptic_edges_tgt FOREIGN KEY (target_neuron_id)
        REFERENCES neuron_nodes (neuron_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_synaptic_no_self_loop CHECK (source_neuron_id <> target_neuron_id),
    CONSTRAINT chk_synaptic_weight CHECK (weight > 0.000 AND weight <= 1.000),
    CONSTRAINT chk_synaptic_origin CHECK (edge_origin IN ('local-brain', 'agentic-memory', 'semantic-inferred', 'ecc-link', 'simulation'))
);

CREATE TABLE tags (
    tag_id   INTEGER     NOT NULL,
    tag_name VARCHAR(64) NOT NULL,
    CONSTRAINT pk_tags PRIMARY KEY (tag_id),
    CONSTRAINT uq_tags_name UNIQUE (tag_name)
);

CREATE TABLE neuron_tags (
    neuron_id VARCHAR(128) NOT NULL,
    tag_id    INTEGER      NOT NULL,
    CONSTRAINT pk_neuron_tags PRIMARY KEY (neuron_id, tag_id),
    CONSTRAINT fk_neuron_tags_neuron FOREIGN KEY (neuron_id)
        REFERENCES neuron_nodes (neuron_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_neuron_tags_tag FOREIGN KEY (tag_id)
        REFERENCES tags (tag_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE brain_snapshots (
    snapshot_id    VARCHAR(64)  NOT NULL,
    mode           VARCHAR(16)  NOT NULL,
    growth_stage   VARCHAR(24)  NOT NULL,
    total_neurons  INTEGER      NOT NULL,
    total_edges    INTEGER      NOT NULL,
    cortex_density DECIMAL(4,3) NOT NULL,
    captured_at    VARCHAR(40)  NOT NULL,
    CONSTRAINT pk_brain_snapshots PRIMARY KEY (snapshot_id),
    CONSTRAINT chk_snapshots_mode CHECK (mode IN ('live', 'simulation')),
    CONSTRAINT chk_snapshots_stage CHECK (growth_stage IN ('embryonic', 'developing', 'mature', 'neocortex')),
    CONSTRAINT chk_snapshots_counts CHECK (total_neurons >= 0 AND total_edges >= 0),
    CONSTRAINT chk_snapshots_density CHECK (cortex_density >= 0.000 AND cortex_density <= 1.000)
);

CREATE TABLE snapshot_neurons (
    snapshot_id       VARCHAR(64)  NOT NULL,
    neuron_id         VARCHAR(128) NOT NULL,
    degree_centrality INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT pk_snapshot_neurons PRIMARY KEY (snapshot_id, neuron_id),
    CONSTRAINT fk_snapshot_neurons_snap FOREIGN KEY (snapshot_id)
        REFERENCES brain_snapshots (snapshot_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_snapshot_neurons_node FOREIGN KEY (neuron_id)
        REFERENCES neuron_nodes (neuron_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_snapshot_degree CHECK (degree_centrality >= 0)
);

CREATE TABLE store_health_logs (
    log_id        INTEGER      NOT NULL,
    snapshot_id   VARCHAR(64)  NOT NULL,
    source_code   VARCHAR(32)  NOT NULL,
    health_status VARCHAR(16)  NOT NULL,
    latency_ms    INTEGER      NOT NULL DEFAULT 0,
    items_loaded  INTEGER      NOT NULL DEFAULT 0,
    error_detail  VARCHAR(255) NULL,
    CONSTRAINT pk_store_health_logs PRIMARY KEY (log_id),
    CONSTRAINT fk_store_health_snap FOREIGN KEY (snapshot_id)
        REFERENCES brain_snapshots (snapshot_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_store_health_source FOREIGN KEY (source_code)
        REFERENCES memory_sources (source_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_store_health_status CHECK (health_status IN ('ok', 'degraded', 'error', 'skipped')),
    CONSTRAINT chk_store_health_metrics CHECK (latency_ms >= 0 AND items_loaded >= 0)
);

CREATE INDEX idx_neuron_nodes_source ON neuron_nodes (source_code);
CREATE INDEX idx_neuron_nodes_lobe ON neuron_nodes (lobe_code);
CREATE INDEX idx_synaptic_edges_src ON synaptic_edges (source_neuron_id);
CREATE INDEX idx_synaptic_edges_tgt ON synaptic_edges (target_neuron_id);
CREATE INDEX idx_store_health_snap ON store_health_logs (snapshot_id);
