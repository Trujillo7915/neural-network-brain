import { useEffect, useRef, useState } from 'react';
import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import type { BrainLobeCode } from '../../domain/value-objects/BrainLobe.js';
import { BRAIN_LOBES } from '../../domain/value-objects/BrainLobe.js';
import { BrainScene, type HoverInfo } from '../brain3d/BrainScene.js';
import { SOURCE_COLORS, SOURCE_LABELS, type ColorMode } from '../brain3d/brainColorTokens.js';

export interface BrainCanvasProps {
  readonly snapshot: BrainSnapshot | null;
  readonly colorMode: ColorMode;
  readonly selectedNodeId: string | null;
  readonly highlightedIds: ReadonlySet<string> | null;
  readonly autoRotate: boolean;
  readonly focusLobeRequest: { lobe: BrainLobeCode | null; nonce: number } | null;
  readonly onSelectNode: (nodeId: string | null) => void;
}

export function BrainCanvas({
  snapshot,
  colorMode,
  selectedNodeId,
  highlightedIds,
  autoRotate,
  focusLobeRequest,
  onSelectNode,
}: BrainCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const selectCallbackRef = useRef(onSelectNode);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  selectCallbackRef.current = onSelectNode;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      const brainScene = new BrainScene(el, {
        onSelectNode: (id) => selectCallbackRef.current(id),
        onHoverNode: (info) => setHoverInfo(info),
      });
      sceneRef.current = brainScene;
      return () => {
        brainScene.dispose();
        sceneRef.current = null;
      };
    } catch (error) {
      setWebglError(error instanceof Error ? error.message : 'WebGL no disponible en este navegador.');
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (snapshot && sceneRef.current) {
      sceneRef.current.setSnapshot(snapshot, colorMode);
    }
  }, [snapshot]);

  useEffect(() => {
    sceneRef.current?.setColorMode(colorMode);
  }, [colorMode]);

  useEffect(() => {
    sceneRef.current?.setSelection(selectedNodeId);
  }, [selectedNodeId]);

  useEffect(() => {
    sceneRef.current?.setHighlightedIds(highlightedIds);
  }, [highlightedIds]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    if (focusLobeRequest && sceneRef.current) {
      sceneRef.current.focusLobe(focusLobeRequest.lobe);
    }
  }, [focusLobeRequest]);

  if (webglError) {
    return (
      <div className="brain-viewport" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="glass-panel" style={{ padding: 20, borderRadius: 16, maxWidth: 420 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Renderizado 3D WebGL no disponible</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{webglError}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            Puedes continuar inspeccionando todas las neuronas desde la lista del panel izquierdo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="brain-viewport"
      role="region"
      aria-label="Visualización 3D interactiva del cerebro de memoria neuronal"
    >
      {hoverInfo && (
        <div
          className="glass-panel hover-tooltip"
          style={{ left: hoverInfo.screenX, top: hoverInfo.screenY }}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <span
              className="dot"
              style={{ backgroundColor: SOURCE_COLORS[hoverInfo.node.source] }}
            />
            <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {SOURCE_LABELS[hoverInfo.node.source]}
            </span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>{hoverInfo.node.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
            <span>{BRAIN_LOBES[hoverInfo.node.lobe].shortName}</span>
            <span>·</span>
            <span>Confianza {Math.round(hoverInfo.node.confidence * 100)}%</span>
            <span>·</span>
            <span>{hoverInfo.node.degree} sinapsis</span>
          </div>
        </div>
      )}
    </div>
  );
}
