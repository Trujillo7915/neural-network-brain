import { Brain, Compass, Layers, Pause, Play, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import type { ColorMode } from '../brain3d/brainColorTokens.js';

export interface TopTelemetryBarProps {
  readonly snapshot: BrainSnapshot | null;
  readonly loading: boolean;
  readonly colorMode: ColorMode;
  readonly autoRotate: boolean;
  readonly onOpenCreateModal: () => void;
  readonly onRefresh: () => void;
  readonly onToggleColorMode: () => void;
  readonly onToggleAutoRotate: () => void;
  readonly onResetCamera: () => void;
}

export function TopTelemetryBar({
  snapshot,
  loading,
  colorMode,
  autoRotate,
  onOpenCreateModal,
  onRefresh,
  onToggleColorMode,
  onToggleAutoRotate,
  onResetCamera,
}: TopTelemetryBarProps) {
  const stage = snapshot?.growthStage;
  const morphology = snapshot?.morphology;

  return (
    <header className="glass-panel top-bar">
      <div className="brand-group">
        <div className="brand-mark" aria-hidden="true">
          <Brain size={20} strokeWidth={1.75} />
        </div>
        <div>
          <div className="brand-kicker">
            {snapshot?.mode === 'simulation' ? 'Modo Simulador Morfológico' : 'Red Neuronal Cerebral 3D'}
          </div>
          <h1 className="brand-title">Neural Network Brain</h1>
        </div>
      </div>

      <div className="telemetry-strip" aria-label="Métricas cerebrales en vivo">
        <div className="metric-chip">
          <span className="metric-label">Etapa Cerebral</span>
          <span className="metric-value">{stage?.label ?? 'Cargando…'}</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Neuronas</span>
          <span className="metric-value">{morphology?.totalNeurons ?? 0}</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Sinapsis</span>
          <span className="metric-value">{morphology?.totalEdges ?? 0}</span>
        </div>
        <div className="metric-chip">
          <span className="metric-label">Densidad Cortical</span>
          <span className="metric-value">{Math.round((morphology?.cortexDensity ?? 0) * 100)}%</span>
        </div>
        <div className="metric-chip" title="Motor local Plug & Play con persistencia atómica en JSON">
          <span className="metric-label">Modo</span>
          <span className="metric-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-emerald)' }}>
            <ShieldCheck size={13} strokeWidth={2} />
            Plug & Play · Local
          </span>
        </div>
      </div>

      <div className="action-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenCreateModal}
          title="Crear y vincular una nueva memoria en la red cerebral"
        >
          <Plus size={14} strokeWidth={2} />
          Nueva Memoria
        </button>

        <button
          type="button"
          className="btn"
          onClick={onToggleColorMode}
          title="Alternar coloración entre Lóbulos Anatómicos y Fuentes de Memoria"
        >
          <Layers size={14} strokeWidth={1.75} />
          {colorMode === 'lobe' ? 'Color: Lóbulos' : 'Color: Fuentes'}
        </button>

        <button
          type="button"
          className="btn"
          onClick={onToggleAutoRotate}
          aria-pressed={autoRotate}
          title="Pausar o reanudar rotación orbital"
        >
          {autoRotate ? <Pause size={14} strokeWidth={1.75} /> : <Play size={14} strokeWidth={1.75} />}
          {autoRotate ? 'Pausar' : 'Rotar'}
        </button>

        <button type="button" className="btn" onClick={onResetCamera} title="Restablecer vista 3D">
          <Compass size={14} strokeWidth={1.75} />
          Centrar
        </button>

        <button
          type="button"
          className="btn"
          onClick={onRefresh}
          disabled={loading}
          title="Invalidar caché y sincronizar desde disco"
        >
          <RefreshCw size={14} strokeWidth={1.75} />
          {loading ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>
    </header>
  );
}
