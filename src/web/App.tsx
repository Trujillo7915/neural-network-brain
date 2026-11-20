import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BrainSnapshot } from '../domain/entities/BrainSnapshot.js';
import type { MemorySourceCode } from '../domain/entities/NeuronNode.js';
import type { BrainLobeCode } from '../domain/value-objects/BrainLobe.js';
import type { NeuronDetailDto } from '../application/dto/BrainDtos.js';
import {
  createMemoryEdge,
  createMemoryNode,
  deleteMemoryNode,
  fetchBrainSnapshot,
  fetchBrainVersion,
  fetchNeuronDetail,
  refreshBrainSnapshot,
  type CreateMemoryPayload,
} from './api/brainApiClient.js';
import type { ColorMode } from './brain3d/brainColorTokens.js';
import { BrainCanvas } from './components/BrainCanvas.js';
import { ControlDock } from './components/ControlDock.js';
import { CreateMemoryModal } from './components/CreateMemoryModal.js';
import { NeuronInspector } from './components/NeuronInspector.js';
import { StageLegendBar } from './components/StageLegendBar.js';
import { TopTelemetryBar } from './components/TopTelemetryBar.js';

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function App() {
  const [snapshot, setSnapshot] = useState<BrainSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mutating, setMutating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [colorMode, setColorMode] = useState<ColorMode>('lobe');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSource, setActiveSource] = useState<MemorySourceCode | null>(null);
  const [activeLobe, setActiveLobe] = useState<BrainLobeCode | null>(null);
  const [focusLobeRequest, setFocusLobeRequest] = useState<{ lobe: BrainLobeCode | null; nonce: number } | null>(null);

  const [simulationEnabled, setSimulationEnabled] = useState<boolean>(false);
  const [simulationCount, setSimulationCount] = useState<number>(180);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NeuronDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (simCount?: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchBrainSnapshot(simCount);
      setSnapshot(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error cargando la red cerebral.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const simParam = simulationEnabled ? simulationCount : undefined;
    const timer = window.setTimeout(() => {
      void loadSnapshot(simParam);
    }, simulationEnabled ? 120 : 0);
    return () => window.clearTimeout(timer);
  }, [simulationEnabled, simulationCount, loadSnapshot]);

  useEffect(() => {
    if (simulationEnabled || !snapshot?.revisionToken) {
      return undefined;
    }
    const currentRevision = snapshot.revisionToken;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const version = await fetchBrainVersion();
        if (version.revisionToken !== currentRevision) {
          const updated = await fetchBrainSnapshot();
          setSnapshot(updated);
        }
      } catch {
        // Keep current snapshot on transient background poll failures
      }
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [simulationEnabled, snapshot?.revisionToken]);

  useEffect(() => {
    if (!selectedNodeId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    const simParam = simulationEnabled ? simulationCount : undefined;
    fetchNeuronDetail(selectedNodeId, simParam)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNodeId, simulationEnabled, simulationCount, snapshot?.revisionToken]);

  const handleRefresh = useCallback(async () => {
    setSimulationEnabled(false);
    setLoading(true);
    setErrorMessage(null);
    try {
      const fresh = await refreshBrainSnapshot();
      setSnapshot(fresh);
      setSelectedNodeId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error sincronizando almacenes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateMemory = useCallback(async (payload: CreateMemoryPayload) => {
    setMutating(true);
    setCreateError(null);
    try {
      setSimulationEnabled(false);
      const prevIds = new Set(snapshot?.nodes.map((n) => n.id) ?? []);
      const updated = await createMemoryNode(payload);
      setSnapshot(updated);
      setCreateModalOpen(false);
      const created = updated.nodes.find((n) => !prevIds.has(n.id));
      if (created) {
        setSelectedNodeId(created.id);
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'No se pudo guardar la memoria.');
      throw error;
    } finally {
      setMutating(false);
    }
  }, [snapshot?.nodes]);

  const handleCreateEdge = useCallback(async (sourceId: string, targetId: string, relationType: string) => {
    setMutating(true);
    setErrorMessage(null);
    try {
      const updated = await createMemoryEdge({ sourceId, targetId, relationType });
      setSnapshot(updated);
      const refreshedDetail = await fetchNeuronDetail(sourceId);
      setDetail(refreshedDetail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear la sinapsis.');
    } finally {
      setMutating(false);
    }
  }, []);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    setMutating(true);
    setErrorMessage(null);
    try {
      const updated = await deleteMemoryNode(nodeId);
      setSnapshot(updated);
      setSelectedNodeId(null);
      setDetail(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar la memoria.');
    } finally {
      setMutating(false);
    }
  }, []);

  const visibleNodes = useMemo(() => {
    if (!snapshot) return [];
    const needle = normalizeText(searchQuery.trim());
    return snapshot.nodes.filter((node) => {
      if (activeSource && node.source !== activeSource) return false;
      if (activeLobe && node.lobe !== activeLobe) return false;
      if (!needle) return true;
      const hay = normalizeText(
        `${node.id} ${node.title} ${node.content} ${node.kind} ${node.tags.join(' ')} ${node.locations.join(' ')}`,
      );
      return hay.includes(needle);
    });
  }, [snapshot, searchQuery, activeSource, activeLobe]);

  const highlightedIds = useMemo(() => {
    const hasFilter = searchQuery.trim().length > 0 || activeSource !== null || activeLobe !== null;
    if (!hasFilter) return null;
    return new Set(visibleNodes.map((n) => n.id));
  }, [visibleNodes, searchQuery, activeSource, activeLobe]);

  const handleLobeToggle = useCallback((lobe: BrainLobeCode | null) => {
    setActiveLobe(lobe);
    setFocusLobeRequest({ lobe, nonce: Date.now() });
  }, []);

  const handleResetCamera = useCallback(() => {
    setSelectedNodeId(null);
    setActiveLobe(null);
    setFocusLobeRequest({ lobe: null, nonce: Date.now() });
    setAutoRotate(true);
  }, []);

  const handleToggleSimulation = useCallback((enabled: boolean) => {
    setSelectedNodeId(null);
    setSimulationEnabled(enabled);
  }, []);

  return (
    <main className="app-shell">
      <BrainCanvas
        snapshot={snapshot}
        colorMode={colorMode}
        selectedNodeId={selectedNodeId}
        highlightedIds={highlightedIds}
        autoRotate={autoRotate}
        focusLobeRequest={focusLobeRequest}
        onSelectNode={setSelectedNodeId}
      />

      <div className="hud-layer">
        <TopTelemetryBar
          snapshot={snapshot}
          loading={loading}
          colorMode={colorMode}
          autoRotate={autoRotate}
          onOpenCreateModal={() => {
            setCreateError(null);
            setCreateModalOpen(true);
          }}
          onRefresh={handleRefresh}
          onToggleColorMode={() => setColorMode((m) => (m === 'lobe' ? 'source' : 'lobe'))}
          onToggleAutoRotate={() => setAutoRotate((r) => !r)}
          onResetCamera={handleResetCamera}
        />

        {errorMessage && (
          <div role="alert" className="glass-panel error-toast">
            {errorMessage}
          </div>
        )}

        <div className="hud-middle">
          <ControlDock
            snapshot={snapshot}
            visibleNodes={visibleNodes}
            selectedNodeId={selectedNodeId}
            searchQuery={searchQuery}
            activeSource={activeSource}
            activeLobe={activeLobe}
            simulationEnabled={simulationEnabled}
            simulationCount={simulationCount}
            onSearchChange={setSearchQuery}
            onSourceToggle={setActiveSource}
            onLobeToggle={handleLobeToggle}
            onSelectNode={(id) => setSelectedNodeId(id)}
            onToggleSimulation={handleToggleSimulation}
            onSimulationCountChange={setSimulationCount}
          />

          <div className="hud-spacer" aria-hidden="true" />

          <NeuronInspector
            detail={detail}
            allNodes={snapshot?.nodes ?? []}
            loading={detailLoading}
            mutating={mutating}
            onClose={() => setSelectedNodeId(null)}
            onNavigateNeighbor={(id) => setSelectedNodeId(id)}
            onCreateEdge={handleCreateEdge}
            onDeleteNode={handleDeleteNode}
          />
        </div>

        <StageLegendBar snapshot={snapshot} />
      </div>

      <CreateMemoryModal
        isOpen={createModalOpen}
        existingNodes={snapshot?.nodes.filter((n) => n.source === 'local-brain' && !n.isSimulated) ?? []}
        submitting={mutating}
        error={createError}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateMemory}
      />
    </main>
  );
}
