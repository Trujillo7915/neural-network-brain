import type { BrainLobeCode } from '../value-objects/BrainLobe.js';
import type { Hemisphere, Point3D } from '../value-objects/Point3D.js';

export type MemorySourceCode =
  | 'local-brain'
  | 'agentic-memory'
  | 'mem0'
  | 'ecc-memory-vault';

export const ALL_MEMORY_SOURCES: readonly MemorySourceCode[] = Object.freeze([
  'local-brain',
  'agentic-memory',
  'mem0',
  'ecc-memory-vault',
]);

export interface RawMemoryRecord {
  readonly id: string;
  readonly externalId: string;
  readonly source: MemorySourceCode;
  readonly kind: string;
  readonly title: string;
  readonly content: string;
  readonly confidence: number;
  readonly decayScore: number;
  readonly accessCount: number;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sessionId?: number;
  readonly scope?: string;
}

export interface NeuronNode {
  readonly id: string;
  readonly externalId: string;
  readonly source: MemorySourceCode;
  readonly kind: string;
  readonly title: string;
  readonly content: string;
  readonly lobe: BrainLobeCode;
  readonly hemisphere: Hemisphere;
  readonly confidence: number;
  readonly decayScore: number;
  readonly accessCount: number;
  readonly tags: readonly string[];
  readonly locations: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly position: Point3D;
  readonly degree: number;
  readonly isSimulated: boolean;
  readonly sessionId?: number;
  readonly scope?: string;
}
