import { useEffect, useState, type FormEvent } from 'react';
import { GitBranch, Plus, X } from 'lucide-react';
import type { NeuronNode } from '../../domain/entities/NeuronNode.js';
import type { CreateMemoryPayload } from '../api/brainApiClient.js';

export interface CreateMemoryModalProps {
  readonly isOpen: boolean;
  readonly existingNodes: readonly NeuronNode[];
  readonly submitting: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onSubmit: (payload: CreateMemoryPayload) => Promise<void>;
}

const KIND_OPTIONS = [
  { value: 'decision', label: 'Decisión / Regla (Lóbulo Frontal)' },
  { value: 'projects', label: 'Proyecto / Contexto (Lóbulo Temporal)' },
  { value: 'fact', label: 'Hecho / Arquitectura (Lóbulo Parietal)' },
  { value: 'methodology', label: 'Metodología / Runbook (Lóbulo Occipital)' },
  { value: 'environment', label: 'Entorno / Herramienta (Cerebelo)' },
  { value: 'episode', label: 'Hito / Episodio (Sistema Límbico)' },
] as const;

const RELATION_OPTIONS = [
  { value: 'related_to', label: 'related_to (relacionado con)' },
  { value: 'part_of', label: 'part_of (parte de)' },
  { value: 'supports', label: 'supports (respalda a)' },
  { value: 'caused_by', label: 'caused_by (causado por)' },
  { value: 'supersedes', label: 'supersedes (reemplaza a)' },
] as const;

export function CreateMemoryModal({
  isOpen,
  existingNodes,
  submitting,
  error,
  onClose,
  onSubmit,
}: CreateMemoryModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [kind, setKind] = useState('fact');
  const [tagsRaw, setTagsRaw] = useState('');
  const [confidencePct, setConfidencePct] = useState(95);
  const [linkTargetId, setLinkTargetId] = useState('');
  const [relationType, setRelationType] = useState('related_to');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const links = linkTargetId ? [{ targetId: linkTargetId, relationType }] : [];
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      kind,
      tags,
      confidence: Number((confidencePct / 100).toFixed(2)),
      links,
    });

    setTitle('');
    setContent('');
    setTagsRaw('');
    setLinkTargetId('');
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="glass-panel modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-memory-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inspector-header">
          <div>
            <div className="brand-kicker">Nueva Neurona Local</div>
            <h2 id="create-memory-title" className="inspector-title">
              Crear y Vincular Memoria
            </h2>
          </div>
          <button
            type="button"
            className="btn"
            style={{ minHeight: 34, padding: '0 9px' }}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="modal-form">
          <div className="dock-section">
            <label htmlFor="mem-title" className="section-label">
              Título de la Neurona *
            </label>
            <input
              id="mem-title"
              type="text"
              required
              minLength={2}
              maxLength={140}
              className="form-input"
              placeholder="Ej. Arquitectura de Servicio API"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="dock-section">
            <label htmlFor="mem-content" className="section-label">
              Contenido, Rutas o Puertos *
            </label>
            <textarea
              id="mem-content"
              required
              minLength={3}
              maxLength={8000}
              rows={4}
              className="form-input form-textarea"
              placeholder="Describe el conocimiento, ruta local (./src/...) o URL (http://127.0.0.1:4310)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="meta-grid">
            <div className="dock-section">
              <label htmlFor="mem-kind" className="section-label">
                Categoría / Lóbulo
              </label>
              <select
                id="mem-kind"
                className="form-input"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dock-section">
              <label htmlFor="mem-confidence" className="section-label">
                <span>Confianza</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{confidencePct}%</span>
              </label>
              <input
                id="mem-confidence"
                type="range"
                className="sim-slider"
                min={50}
                max={100}
                step={1}
                value={confidencePct}
                onChange={(e) => setConfidencePct(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="dock-section">
            <label htmlFor="mem-tags" className="section-label">
              Etiquetas (separadas por coma)
            </label>
            <input
              id="mem-tags"
              type="text"
              className="form-input"
              placeholder="arquitectura, api, typescript"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </div>

          <div className="sim-box">
            <div className="section-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GitBranch size={12} /> Vincular con Neurona Existente (Opcional)
              </span>
            </div>
            <div className="meta-grid">
              <select
                aria-label="Neurona destino para sinapsis"
                className="form-input"
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
              >
                <option value="">Sin vínculo manual inicial</option>
                {existingNodes.slice(0, 120).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} ({n.id})
                  </option>
                ))}
              </select>
              <select
                aria-label="Tipo de relación sináptica"
                className="form-input"
                value={relationType}
                disabled={!linkTargetId}
                onChange={(e) => setRelationType(e.target.value)}
              >
                {RELATION_OPTIONS.map((rel) => (
                  <option key={rel.value} value={rel.value}>
                    {rel.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div role="alert" style={{ color: '#fda4af', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Plus size={14} strokeWidth={2} />
              {submitting ? 'Guardando…' : 'Guardar Neurona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
