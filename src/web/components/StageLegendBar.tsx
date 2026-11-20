import { Activity } from 'lucide-react';
import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import { SOURCE_LABELS } from '../brain3d/brainColorTokens.js';

export interface StageLegendBarProps {
  readonly snapshot: BrainSnapshot | null;
}

export function StageLegendBar({ snapshot }: StageLegendBarProps) {
  if (!snapshot) return null;
  const { growthStage, storeHealth } = snapshot;

  return (
    <footer className="glass-panel stage-bar" aria-label="Evolución morfológica y salud de almacenes">
      <div className="stage-progress-group">
        <Activity size={15} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} aria-hidden="true" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {growthStage.label}
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
              Escala {Math.round(growthStage.cortexScale * 100)}% · Pliegues {Math.round(growthStage.sulciDepth * 100)}%
            </span>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{growthStage.description}</span>
        </div>
        <div className="stage-track" aria-label="Progreso hacia la siguiente etapa cerebral">
          <div className="stage-fill" style={{ width: `${Math.max(8, Math.round(growthStage.progressToNext * 100))}%` }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {storeHealth
          .filter((store) => store.status !== 'skipped' || store.source === 'local-brain')
          .map((store) => {
            const color =
              store.status === 'ok'
                ? 'var(--accent-emerald)'
                : store.status === 'skipped'
                  ? '#a78bfa'
                  : 'var(--accent-rose)';
            return (
              <span
                key={store.source}
                className="badge"
                title={store.errorDetail ?? `${store.itemsLoaded} registros en ${store.latencyMs}ms`}
              >
                <span className="dot" style={{ backgroundColor: color, width: 6, height: 6 }} />
                {SOURCE_LABELS[store.source].split(' ')[0]}
                {store.status === 'ok' ? ` (${store.itemsLoaded})` : ` (${store.status})`}
              </span>
            );
          })}
        <span className="badge" style={{ color: 'var(--text-secondary)' }}>
          © 2026 Fabián Trujillo (@Trujillo7915) · Apache-2.0
        </span>
      </div>
    </footer>
  );
}
