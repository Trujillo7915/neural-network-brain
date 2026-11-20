import type { BrainLobeCode } from '../value-objects/BrainLobe.js';
import type { GrowthStageDescriptor } from '../value-objects/GrowthStage.js';
import type { MemorySourceCode, NeuronNode } from './NeuronNode.js';
import type { SynapticEdge } from './SynapticEdge.js';

export type StoreHealthStatus = 'ok' | 'degraded' | 'error' | 'skipped';

export interface StoreHealthReport {
  readonly source: MemorySourceCode;
  readonly status: StoreHealthStatus;
  readonly latencyMs: number;
  readonly itemsLoaded: number;
  readonly errorDetail: string | null;
}

export interface LobeStat {
  readonly lobe: BrainLobeCode;
  readonly displayName: string;
  readonly functionalRole: string;
  readonly accentHex: string;
  readonly count: number;
  readonly ratio: number;
}

export interface SourceStat {
  readonly source: MemorySourceCode;
  readonly count: number;
  readonly ratio: number;
}

export interface MorphologyMetrics {
  readonly totalNeurons: number;
  readonly totalEdges: number;
  readonly avgDegree: number;
  readonly avgConfidence: number;
  readonly cortexDensity: number;
  readonly explicitEdgeCount: number;
  readonly semanticEdgeCount: number;
}

export interface BrainSnapshot {
  readonly snapshotId: string;
  readonly revisionToken: string;
  readonly mode: 'live' | 'simulation';
  readonly overallStatus: 'ok' | 'degraded';
  readonly generatedAt: string;
  readonly growthStage: GrowthStageDescriptor;
  readonly morphology: MorphologyMetrics;
  readonly nodes: readonly NeuronNode[];
  readonly edges: readonly SynapticEdge[];
  readonly lobeStats: readonly LobeStat[];
  readonly sourceStats: readonly SourceStat[];
  readonly storeHealth: readonly StoreHealthReport[];
}
