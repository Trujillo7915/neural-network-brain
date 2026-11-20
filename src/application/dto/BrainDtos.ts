import type { MemorySourceCode, NeuronNode } from '../../domain/entities/NeuronNode.js';
import type { SynapticEdge } from '../../domain/entities/SynapticEdge.js';
import type { BrainLobeCode } from '../../domain/value-objects/BrainLobe.js';

export interface GetBrainQuery {
  readonly simulateCount?: number;
  readonly forceRefresh?: boolean;
}

export interface NeuronDetailQuery {
  readonly id: string;
  readonly simulateCount?: number;
}

export interface NeuronConnectionDto {
  readonly edge: SynapticEdge;
  readonly direction: 'outgoing' | 'incoming';
  readonly neighbor: NeuronNode;
}

export interface NeuronDetailDto {
  readonly node: NeuronNode;
  readonly connections: readonly NeuronConnectionDto[];
  readonly totalConnections: number;
}

export interface SearchBrainQuery {
  readonly q?: string;
  readonly source?: MemorySourceCode;
  readonly lobe?: BrainLobeCode;
  readonly minConfidence?: number;
  readonly simulateCount?: number;
}

export interface SearchBrainResultDto {
  readonly query: SearchBrainQuery;
  readonly totalMatched: number;
  readonly matchedIds: readonly string[];
  readonly nodes: readonly NeuronNode[];
  readonly edges: readonly SynapticEdge[];
}
