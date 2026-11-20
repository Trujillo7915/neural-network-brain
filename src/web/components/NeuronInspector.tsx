import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Cpu,
  GitBranch,
  MapPin,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { NeuronDetailDto } from '../../application/dto/BrainDtos.js';
import type { NeuronNode } from '../../domain/entities/NeuronNode.js';
import { BRAIN_LOBES } from '../../domain/value-objects/BrainLobe.js';
import { LOBE_COLORS, SOURCE_COLORS, SOURCE_LABELS } from '../brain3d/brainColorTokens.js';

export interface NeuronInspectorProps {
  readonly detail: NeuronDetailDto | null;
  readonly allNodes: readonly NeuronNode[];
  readonly loading: boolean;
  readonly mutating: boolean;
  readonly onClose: () => void;
  readonly onNavigateNeighbor: (nodeId: string) => void;
  readonly onCreateEdge: (sourceId: string, targetId: string, relationType: string) => Promise<void>;
  readonly onDeleteNode: (nodeId: string) => Promise<void>;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NeuronInspector({
  detail,
  allNodes,
  loading,
  mutating,
  onClose,
  onNavigateNeighbor,
  onCreateEdge,
  onDeleteNode,
}: NeuronInspectorProps) {
  const [copiedLoc, setCopiedLoc] = useState<string | null>(null);
  const [linkTargetId, setLinkTargetId] = useState<string>('');
  const [relationType, setRelationType] = useState<string>('related_to');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCopyLocation = (location: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(location).then(() => {
        setCopiedLoc(location);
        window.setTimeout(() => setCopiedLoc((prev) => (prev === location ? null : prev)), 1500);
      });
    }
  };

  if (!detail && !loading) {
    return (
      <aside className="glass-panel inspector-drawer" aria-label="Inspector de memoria">
        <div className="section-label">
          <span>Inspector de Memoria</span>
        </div>
        <div style={{ padding: '24px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: 'var(--accent-amber)' }}>
            <Cpu size={24} strokeWidth={1.6} />
          </div>
          <h2 className="inspector-title" style={{ margin: 0 }}>
            Selecciona una neurona en el cerebro 3D
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Haz clic sobre cualquier nodo brillante o elígelo en el índice izquierdo para inspeccionar
            el conocimiento almacenado, vincular nuevas sinapsis o crear recuerdos propios con
            <strong> + Nueva Memoria</strong>.
          </p>
        </div>
      </aside>
    );
  }

  if (loading || !detail) {
    return (
      <aside className="glass-panel inspector-drawer" aria-label="Cargando neurona">
        <div className="section-label">
          <span>Inspector de Memoria</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Recuperando datos sinápticos…</p>
      </aside>
    );
  }

  const { node, connections } = detail;
  const lobeMeta = BRAIN_LOBES[node.lobe];
  const isEditableLocal = node.source === 'local-brain' && !node.isSimulated;
  const candidateTargets = allNodes.filter((n) => n.id !== node.id && n.source === 'local-brain');

  const handleAddSynapse = async () => {
    if (!linkTargetId) return;
    await onCreateEdge(node.id, linkTargetId, relationType);
    setLinkTargetId('');
  };

  return (
    <aside className="glass-panel inspector-drawer" aria-label={`Detalle de neurona ${node.title}`}>
      <div className="inspector-header">
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <span className="badge" style={{ borderColor: SOURCE_COLORS[node.source], color: SOURCE_COLORS[node.source] }}>
              {SOURCE_LABELS[node.source]}
            </span>
            <span className="badge" style={{ borderColor: LOBE_COLORS[node.lobe], color: LOBE_COLORS[node.lobe] }}>
              {lobeMeta.shortName}
            </span>
          </div>
          <h2 className="inspector-title">{node.title}</h2>
        </div>
        <button
          type="button"
          className="btn"
          style={{ minHeight: 34, padding: '0 9px' }}
          onClick={onClose}
          aria-label="Cerrar inspector"
        >
          <X size={15} />
        </button>
      </div>

      <div className="dock-section">
        <span className="section-label">Información Almacenada</span>
        <div className="content-card">{node.content}</div>
      </div>

      <div className="meta-grid">
        <div className="meta-cell">
          <div className="metric-label">ID Neurona</div>
          <div className="metric-value" style={{ fontSize: 11.5, wordBreak: 'break-all' }}>{node.id}</div>
        </div>
        <div className="meta-cell">
          <div className="metric-label">Tipo / Categoría</div>
          <div className="metric-value" style={{ fontSize: 12 }}>{node.kind}</div>
        </div>
        <div className="meta-cell">
          <div className="metric-label">Confianza</div>
          <div className="metric-value">{Math.round(node.confidence * 100)}%</div>
          <div className="confidence-bar-track">
            <div className="confidence-bar-fill" style={{ width: `${Math.round(node.confidence * 100)}%` }} />
          </div>
        </div>
        <div className="meta-cell">
          <div className="metric-label">Hemisferio / Grado</div>
          <div className="metric-value" style={{ fontSize: 12 }}>
            {node.hemisphere === 'left' ? 'Izquierdo' : 'Derecho'} · {node.degree} sin.
          </div>
        </div>
        <div className="meta-cell" style={{ gridColumn: 'span 2' }}>
          <div className="metric-label">Función del Lóbulo ({lobeMeta.displayName})</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
            {lobeMeta.functionalRole}
          </div>
        </div>
        <div className="meta-cell" style={{ gridColumn: 'span 2' }}>
          <div className="metric-label">Registrado / Actualizado</div>
          <div className="metric-value" style={{ fontSize: 11.5 }}>{formatDate(node.createdAt)}</div>
        </div>
      </div>

      {node.locations.length > 0 && (
        <div className="dock-section">
          <span className="section-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={11} /> Ubicaciones Vinculadas
            </span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{node.locations.length}</span>
          </span>
          <div className="location-list">
            {node.locations.map((loc) => (
              <button
                key={loc}
                type="button"
                className="location-chip"
                onClick={() => handleCopyLocation(loc)}
                title="Copiar ubicación al portapapeles"
              >
                <span className="location-chip-text">{loc}</span>
                {copiedLoc === loc ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {node.tags.length > 0 && (
        <div className="dock-section">
          <span className="section-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Tag size={11} /> Etiquetas
            </span>
          </span>
          <div className="pill-grid">
            {node.tags.map((tag) => (
              <span key={tag} className="badge">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {isEditableLocal && (
        <div className="sim-box">
          <span className="section-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus size={12} /> Vincular Sinapsis en 1 Clic
            </span>
          </span>
          <select
            aria-label="Seleccionar neurona para vincular"
            className="form-input"
            value={linkTargetId}
            onChange={(e) => setLinkTargetId(e.target.value)}
          >
            <option value="">Elegir neurona destino…</option>
            {candidateTargets.slice(0, 120).map((cand) => (
              <option key={cand.id} value={cand.id}>
                {cand.title}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              aria-label="Relación sináptica"
              className="form-input"
              style={{ flex: 1 }}
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
            >
              <option value="related_to">related_to</option>
              <option value="part_of">part_of</option>
              <option value="supports">supports</option>
              <option value="caused_by">caused_by</option>
              <option value="supersedes">supersedes</option>
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!linkTargetId || mutating}
              onClick={() => void handleAddSynapse()}
            >
              Vincular
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            {confirmDeleteId === node.id ? (
              <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  disabled={mutating}
                  onClick={() => void onDeleteNode(node.id)}
                >
                  Confirmar Borrado
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={mutating}
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-danger"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={mutating}
                onClick={() => setConfirmDeleteId(node.id)}
              >
                <Trash2 size={13} /> Eliminar Memoria Local
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dock-section">
        <span className="section-label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <GitBranch size={12} /> Conexiones Sinápticas
          </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{connections.length}</span>
        </span>
        <div className="neighbor-list">
          {connections.map((conn) => (
            <button
              key={`${conn.edge.id}-${conn.direction}`}
              type="button"
              className="neighbor-card"
              onClick={() => onNavigateNeighbor(conn.neighbor.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-amber)' }}>
                  {conn.direction === 'outgoing' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                  {conn.edge.relationType}
                </span>
                <span>peso {Math.round(conn.edge.weight * 100)}%</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{conn.neighbor.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {conn.neighbor.source} · {BRAIN_LOBES[conn.neighbor.lobe].shortName}
              </div>
            </button>
          ))}
          {connections.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Neurona independiente sin sinapsis directas registradas.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
