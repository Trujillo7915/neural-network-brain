import type { MemorySourceCode } from '../../domain/entities/NeuronNode.js';
import type { BrainLobeCode } from '../../domain/value-objects/BrainLobe.js';

export type ColorMode = 'lobe' | 'source';

export const SOURCE_COLORS: Readonly<Record<MemorySourceCode, string>> = Object.freeze({
  'local-brain': '#eab308',
  'agentic-memory': '#f59e0b',
  mem0: '#38bdf8',
  'ecc-memory-vault': '#10b981',
});

export const SOURCE_LABELS: Readonly<Record<MemorySourceCode, string>> = Object.freeze({
  'local-brain': 'Local Brain (JSON)',
  'agentic-memory': 'AgenticMemory (.amem)',
  mem0: 'Mem0 (Qdrant 384D)',
  'ecc-memory-vault': 'ECC Memory Vault',
});

export const LOBE_COLORS: Readonly<Record<BrainLobeCode, string>> = Object.freeze({
  frontal: '#f59e0b',
  temporal: '#38bdf8',
  parietal: '#a78bfa',
  occipital: '#10b981',
  cerebellum: '#fb7185',
  limbic: '#fbbf24',
});

export const EDGE_ORIGIN_COLORS: Readonly<Record<string, string>> = Object.freeze({
  'local-brain': '#eab308',
  'agentic-memory': '#f59e0b',
  'semantic-inferred': '#38bdf8',
  'ecc-link': '#10b981',
  simulation: '#a78bfa',
});

export function resolveNeuronColor(
  lobe: BrainLobeCode,
  source: MemorySourceCode,
  mode: ColorMode,
): string {
  return mode === 'lobe' ? LOBE_COLORS[lobe] : SOURCE_COLORS[source];
}
