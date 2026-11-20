import type { BrainSnapshot, StoreHealthReport } from '../../domain/entities/BrainSnapshot.js';
import type { MemorySourceCode, RawMemoryRecord } from '../../domain/entities/NeuronNode.js';
import type { RawEdgeRecord } from '../../domain/entities/SynapticEdge.js';
import type { LoggerPort } from '../../domain/ports/LoggerPort.js';
import type { MemoryStorePayload, MemoryStorePort } from '../../domain/ports/MemoryStorePort.js';
import { buildBrainSnapshot } from '../../domain/services/BrainMorphologyService.js';
import { generateSimulatedDataset } from '../../domain/services/GrowthSimulatorService.js';
import { computeSemanticLinks } from '../../domain/services/SemanticLinkService.js';
import type { GetBrainQuery } from '../dto/BrainDtos.js';

export interface SnapshotCachePort {
  get(key: string): BrainSnapshot | undefined;
  set(key: string, value: BrainSnapshot): void;
  invalidateAll(): void;
}

export type StoreExecutionGuard = (
  source: MemorySourceCode,
  operation: () => Promise<MemoryStorePayload>,
) => Promise<MemoryStorePayload>;

export interface GetBrainSnapshotDeps {
  readonly stores: readonly MemoryStorePort[];
  readonly logger: LoggerPort;
  readonly cache?: SnapshotCachePort;
  readonly guard?: StoreExecutionGuard;
  readonly versionProvider?: () => string;
}

const LIVE_CACHE_KEY = 'live-brain-snapshot';

export class GetBrainSnapshotUseCase {
  private readonly stores: readonly MemoryStorePort[];
  private readonly logger: LoggerPort;
  private readonly cache?: SnapshotCachePort;
  private readonly guard?: StoreExecutionGuard;
  private readonly versionProvider?: () => string;
  private inFlightLiveLoad: Promise<BrainSnapshot> | null = null;

  constructor(deps: GetBrainSnapshotDeps) {
    this.stores = deps.stores;
    this.logger = deps.logger;
    this.cache = deps.cache;
    this.guard = deps.guard;
    this.versionProvider = deps.versionProvider;
  }

  getRevisionToken(): string {
    return this.versionProvider ? this.versionProvider() : 'static';
  }

  invalidateCache(): void {
    this.cache?.invalidateAll();
  }

  async execute(query: GetBrainQuery): Promise<BrainSnapshot> {
    if (query.simulateCount !== undefined) {
      return this.buildSimulation(query.simulateCount);
    }

    const currentToken = this.versionProvider ? this.versionProvider() : undefined;

    if (query.forceRefresh) {
      this.cache?.invalidateAll();
    } else {
      const cached = this.cache?.get(LIVE_CACHE_KEY);
      if (cached && (!currentToken || cached.revisionToken === currentToken)) {
        return cached;
      }
      if (cached && currentToken && cached.revisionToken !== currentToken) {
        this.cache?.invalidateAll();
      }
    }

    if (this.inFlightLiveLoad && !query.forceRefresh) {
      return this.inFlightLiveLoad;
    }

    const loadPromise = this.fetchAndBuildLiveSnapshot(currentToken);
    this.inFlightLiveLoad = loadPromise;
    try {
      return await loadPromise;
    } finally {
      if (this.inFlightLiveLoad === loadPromise) {
        this.inFlightLiveLoad = null;
      }
    }
  }

  private async fetchAndBuildLiveSnapshot(revisionToken?: string): Promise<BrainSnapshot> {
    const tokenAtStart = revisionToken ?? (this.versionProvider ? this.versionProvider() : undefined);
    const { nodes, edges, storeHealth } = await this.loadAllStores();
    const semanticLinks = computeSemanticLinks(nodes, edges);
    const snapshot = buildBrainSnapshot({
      mode: 'live',
      rawNodes: nodes,
      rawEdges: [...edges, ...semanticLinks],
      storeHealth,
      revisionToken: tokenAtStart,
    });

    this.cache?.set(LIVE_CACHE_KEY, snapshot);
    return snapshot;
  }

  private buildSimulation(count: number): BrainSnapshot {
    const dataset = generateSimulatedDataset(count);
    const storeHealth: StoreHealthReport[] = [
      { source: 'agentic-memory', status: 'skipped', latencyMs: 0, itemsLoaded: 0, errorDetail: null },
      { source: 'mem0', status: 'skipped', latencyMs: 0, itemsLoaded: 0, errorDetail: null },
      { source: 'ecc-memory-vault', status: 'skipped', latencyMs: 0, itemsLoaded: 0, errorDetail: null },
    ];
    return buildBrainSnapshot({
      mode: 'simulation',
      rawNodes: dataset.nodes,
      rawEdges: dataset.edges,
      storeHealth,
    });
  }

  private async loadAllStores(): Promise<{
    nodes: RawMemoryRecord[];
    edges: RawEdgeRecord[];
    storeHealth: StoreHealthReport[];
  }> {
    const results = await Promise.all(
      this.stores.map((store) => this.loadSingleStore(store)),
    );

    const nodes: RawMemoryRecord[] = [];
    const edges: RawEdgeRecord[] = [];
    const storeHealth: StoreHealthReport[] = [];

    for (const item of results) {
      nodes.push(...item.nodes);
      edges.push(...item.edges);
      storeHealth.push(item.health);
    }
    return { nodes, edges, storeHealth };
  }

  private async loadSingleStore(store: MemoryStorePort): Promise<{
    nodes: readonly RawMemoryRecord[];
    edges: readonly RawEdgeRecord[];
    health: StoreHealthReport;
  }> {
    const startedAt = Date.now();
    try {
      const run = () => store.load();
      const payload = this.guard ? await this.guard(store.source, run) : await run();
      const latencyMs = Date.now() - startedAt;
      this.logger.info('Store loaded successfully', {
        source: store.source,
        nodes: payload.nodes.length,
        edges: payload.edges.length,
        latencyMs,
      });
      return {
        nodes: payload.nodes,
        edges: payload.edges,
        health: Object.freeze({
          source: store.source,
          status: 'ok',
          latencyMs,
          itemsLoaded: payload.nodes.length,
          errorDetail: null,
        }),
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const detail = error instanceof Error ? error.message : 'Unknown store error';
      this.logger.warn('Store load failed; degrading gracefully', {
        source: store.source,
        latencyMs,
        detail,
      });
      return {
        nodes: [],
        edges: [],
        health: Object.freeze({
          source: store.source,
          status: 'error',
          latencyMs,
          itemsLoaded: 0,
          errorDetail: detail,
        }),
      };
    }
  }
}
