import { Search, Sliders, Sparkles, X } from 'lucide-react';
import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import type { MemorySourceCode, NeuronNode } from '../../domain/entities/NeuronNode.js';
import type { BrainLobeCode } from '../../domain/value-objects/BrainLobe.js';
import { BRAIN_LOBES } from '../../domain/value-objects/BrainLobe.js';
import { LOBE_COLORS, SOURCE_COLORS, SOURCE_LABELS } from '../brain3d/brainColorTokens.js';

export interface ControlDockProps {
  readonly snapshot: BrainSnapshot | null;
  readonly visibleNodes: readonly NeuronNode[];
  readonly selectedNodeId: string | null;
  readonly searchQuery: string;
  readonly activeSource: MemorySourceCode | null;
  readonly activeLobe: BrainLobeCode | null;
  readonly simulationEnabled: boolean;
  readonly simulationCount: number;
  readonly onSearchChange: (q: string) => void;
  readonly onSourceToggle: (source: MemorySourceCode | null) => void;
  readonly onLobeToggle: (lobe: BrainLobeCode | null) => void;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onToggleSimulation: (enabled: boolean) => void;
  readonly onSimulationCountChange: (count: number) => void;
}

export function ControlDock({
  snapshot,
  visibleNodes,
  selectedNodeId,
  searchQuery,
  activeSource,
  activeLobe,
  simulationEnabled,
  simulationCount,
  onSearchChange,
  onSourceToggle,
  onLobeToggle,
  onSelectNode,
  onToggleSimulation,
  onSimulationCountChange,
}: ControlDockProps) {
  return (
    <aside className="glass-panel control-dock" aria-label="Controles de exploración y filtros">
      <div className="dock-section">
        <label htmlFor="brain-search" className="section-label">
          <span>Buscar en la Red Neuronal</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {visibleNodes.length}/{snapshot?.nodes.length ?? 0}
          </span>
        </label>
        <div className="search-wrap">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input
            id="brain-search"
            type="search"
            className="search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Palabra clave, proyecto, regla…"
          />
        </div>
      </div>

      <div className="dock-section">
        <div className="section-label">
          <span>Fuentes de Memoria</span>
          {activeSource && (
            <button
              type="button"
              className="pill-btn"
              style={{ minHeight: 22, padding: '0 7px', fontSize: 10 }}
              onClick={() => onSourceToggle(null)}
            >
              <X size={11} /> Todas
            </button>
          )}
        </div>
        <div className="pill-grid">
          {(snapshot?.sourceStats ?? [])
            .filter((stat) => stat.count > 0 || stat.source === 'local-brain')
            .map((stat) => {
              const isActive = activeSource === stat.source;
              return (
                <button
                  key={stat.source}
                  type="button"
                  className={`pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSourceToggle(isActive ? null : stat.source)}
                  aria-pressed={isActive}
                >
                  <span className="dot" style={{ backgroundColor: SOURCE_COLORS[stat.source] }} />
                  <span>{SOURCE_LABELS[stat.source].split(' ')[0]}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.8 }}>{stat.count}</span>
                </button>
              );
            })}
        </div>
      </div>

      <div className="dock-section">
        <div className="section-label">
          <span>Regiones y Lóbulos</span>
          {activeLobe && (
            <button
              type="button"
              className="pill-btn"
              style={{ minHeight: 22, padding: '0 7px', fontSize: 10 }}
              onClick={() => onLobeToggle(null)}
            >
              <X size={11} /> Ver todo
            </button>
          )}
        </div>
        <div className="pill-grid">
          {(snapshot?.lobeStats ?? []).map((stat) => {
            const isActive = activeLobe === stat.lobe;
            return (
              <button
                key={stat.lobe}
                type="button"
                className={`pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => onLobeToggle(isActive ? null : stat.lobe)}
                aria-pressed={isActive}
                title={stat.functionalRole}
              >
                <span className="dot" style={{ backgroundColor: LOBE_COLORS[stat.lobe] }} />
                <span>{BRAIN_LOBES[stat.lobe].shortName}</span>
                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.8 }}>{stat.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dock-section">
        <div className="section-label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Sliders size={12} /> Simulador de Crecimiento
          </span>
          <button
            type="button"
            className={`btn ${simulationEnabled ? 'btn-sim-active' : ''}`}
            style={{ minHeight: 26, padding: '0 9px', fontSize: 11 }}
            onClick={() => onToggleSimulation(!simulationEnabled)}
            aria-pressed={simulationEnabled}
          >
            <Sparkles size={12} />
            {simulationEnabled ? 'Volver a Real' : 'Probar'}
          </button>
        </div>

        {simulationEnabled && (
          <div className="sim-box">
            <div className="sim-banner">
              Simulación visual activa — tus memorias reales en disco siguen intactas.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Volumen proyectado</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {simulationCount} neuronas
              </span>
            </div>
            <input
              type="range"
              aria-label="Cantidad simulada de neuronas"
              className="sim-slider"
              min={5}
              max={500}
              step={5}
              value={simulationCount}
              onChange={(e) => onSimulationCountChange(Number(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>5 Embrión</span>
              <span>35 Desarrollo</span>
              <span>120 Madura</span>
              <span>500 Neocorteza</span>
            </div>
          </div>
        )}
      </div>

      <div className="dock-section" style={{ flex: 1, minHeight: 120 }}>
        <div className="section-label">
          <span>Índice Accesible de Neuronas</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{visibleNodes.length}</span>
        </div>
        <div className="node-list" role="listbox" aria-label="Listado de memorias neuronales">
          {visibleNodes.slice(0, 80).map((node) => (
            <button
              key={node.id}
              type="button"
              role="option"
              aria-selected={selectedNodeId === node.id}
              className={`node-list-item ${selectedNodeId === node.id ? 'selected' : ''}`}
              onClick={() => onSelectNode(node.id)}
            >
              <span className="node-list-title">{node.title}</span>
              <span className="node-list-meta">
                <span style={{ color: SOURCE_COLORS[node.source] }}>{node.source}</span>
                <span>{BRAIN_LOBES[node.lobe].shortName} · {node.degree} sin.</span>
              </span>
            </button>
          ))}
          {visibleNodes.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: 10 }}>
              Ninguna neurona coincide con los filtros actuales.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
