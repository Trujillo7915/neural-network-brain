import type { RawMemoryRecord } from '../entities/NeuronNode.js';
import type { RawEdgeRecord } from '../entities/SynapticEdge.js';
import type { MemoryStorePort } from './MemoryStorePort.js';

export interface CreateMemoryLinkInput {
  readonly targetId: string;
  readonly relationType: string;
}

export interface CreateMemoryInput {
  readonly title: string;
  readonly content: string;
  readonly kind: string;
  readonly tags: readonly string[];
  readonly confidence: number;
  readonly links?: readonly CreateMemoryLinkInput[];
}

export interface CreateEdgeInput {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly weight?: number;
}

export interface WritableMemoryStorePort extends MemoryStorePort {
  createNeuron(input: CreateMemoryInput): Promise<RawMemoryRecord>;
  createEdge(input: CreateEdgeInput): Promise<RawEdgeRecord>;
  deleteNeuron(id: string): Promise<boolean>;
}
