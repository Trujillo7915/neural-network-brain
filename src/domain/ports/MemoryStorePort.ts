import type { MemorySourceCode, RawMemoryRecord } from '../entities/NeuronNode.js';
import type { RawEdgeRecord } from '../entities/SynapticEdge.js';

export interface MemoryStorePayload {
  readonly source: MemorySourceCode;
  readonly nodes: readonly RawMemoryRecord[];
  readonly edges: readonly RawEdgeRecord[];
}

export interface MemoryStorePort {
  readonly source: MemorySourceCode;
  load(): Promise<MemoryStorePayload>;
}
