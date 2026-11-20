import { describe, expect, it } from 'vitest';
import { resolveGrowthStage } from '../../src/domain/value-objects/GrowthStage.js';
import { normalizeConfidence } from '../../src/domain/value-objects/ConfidenceScore.js';
import {
  buildBrainSnapshot,
  classifyBrainLobe,
  computeAnatomicalPosition,
} from '../../src/domain/services/BrainMorphologyService.js';
import type { RawMemoryRecord } from '../../src/domain/entities/NeuronNode.js';

function createRawNode(overrides: Partial<RawMemoryRecord> = {}): RawMemoryRecord {
  return {
    id: 'amem:1',
    externalId: '1',
    source: 'agentic-memory',
    kind: 'fact',
    title: 'Arquitectura hexagonal',
    content: 'Sistema de microservicios con MySQL 8 y arquitectura limpia.',
    confidence: 0.95,
    decayScore: 0.1,
    accessCount: 2,
    tags: ['architecture'],
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('GrowthStage (BR-02)', () => {
  it('resolves embryonic stage for 0 to 19 neurons', () => {
    expect(resolveGrowthStage(0).code).toBe('embryonic');
    expect(resolveGrowthStage(19).code).toBe('embryonic');
    expect(resolveGrowthStage(10).cortexScale).toBeCloseTo(0.78, 2);
  });

  it('resolves developing stage for 20 to 59 neurons', () => {
    const stage = resolveGrowthStage(34);
    expect(stage.code).toBe('developing');
    expect(stage.cortexScale).toBeCloseTo(0.92, 2);
    expect(stage.sulciDepth).toBeCloseTo(0.55, 2);
  });

  it('resolves mature stage for 60 to 179 neurons', () => {
    const stage = resolveGrowthStage(120);
    expect(stage.code).toBe('mature');
    expect(stage.cortexScale).toBeCloseTo(1.0, 2);
  });

  it('resolves neocortex stage for 180+ neurons', () => {
    const stage = resolveGrowthStage(250);
    expect(stage.code).toBe('neocortex');
    expect(stage.cortexScale).toBeCloseTo(1.08, 2);
    expect(stage.sulciDepth).toBeCloseTo(1.0, 2);
  });
});

describe('ConfidenceScore (BR-05)', () => {
  it('clamps out-of-range scores and handles missing values safely', () => {
    expect(normalizeConfidence(1.5)).toBe(1);
    expect(normalizeConfidence(-0.3)).toBe(0);
    expect(normalizeConfidence(Number.NaN, 0.9)).toBe(0.9);
    expect(normalizeConfidence(undefined, 0.85)).toBe(0.85);
    expect(normalizeConfidence(0.72)).toBe(0.72);
  });
});

describe('BrainMorphologyService (BR-03 & BR-04)', () => {
  it('classifies memories into functional anatomical lobes deterministically', () => {
    expect(classifyBrainLobe(createRawNode({ kind: 'decision', tags: ['rules'] }))).toBe('frontal');
    expect(classifyBrainLobe(createRawNode({ kind: 'identity', tags: ['team'] }))).toBe('temporal');
    expect(classifyBrainLobe(createRawNode({ kind: 'correction', tags: ['audit'] }))).toBe('parietal');
    expect(classifyBrainLobe(createRawNode({ kind: 'runbook', tags: ['methodology'] }))).toBe('occipital');
    expect(classifyBrainLobe(createRawNode({ kind: 'environment', tags: ['ollama'] }))).toBe('cerebellum');
    expect(classifyBrainLobe(createRawNode({ kind: 'episode', tags: [] }))).toBe('limbic');
  });

  it('promotes high-centrality hub nodes into the deep limbic system', () => {
    const lobe = classifyBrainLobe(createRawNode({ kind: 'fact', tags: [] }), 11);
    expect(lobe).toBe('limbic');
  });

  it('produces reproducible deterministic 3D coordinates for identical node IDs', () => {
    const posA = computeAnatomicalPosition('amem:42', 'frontal', 0.92);
    const posB = computeAnatomicalPosition('amem:42', 'frontal', 0.92);
    const posOther = computeAnatomicalPosition('amem:43', 'frontal', 0.92);

    expect(posA).toEqual(posB);
    expect(posA.position).not.toEqual(posOther.position);
    expect(Math.abs(posA.position.x)).toBeGreaterThan(0.15);
  });

  it('builds an immutable BrainSnapshot with accurate stats and stage', () => {
    const nodes = Array.from({ length: 24 }, (_, idx) =>
      createRawNode({
        id: `amem:${idx}`,
        externalId: String(idx),
        kind: idx % 2 === 0 ? 'decision' : 'fact',
      }),
    );

    const snapshot = buildBrainSnapshot({
      mode: 'live',
      rawNodes: nodes,
      rawEdges: [
        {
          id: 'e1',
          sourceId: 'amem:0',
          targetId: 'amem:1',
          relationType: 'related_to',
          origin: 'agentic-memory',
          weight: 1,
          createdAt: '2026-11-19T00:00:00.000Z',
        },
      ],
      storeHealth: [
        {
          source: 'agentic-memory',
          status: 'ok',
          latencyMs: 12,
          itemsLoaded: 24,
          errorDetail: null,
        },
      ],
    });

    expect(snapshot.growthStage.code).toBe('developing');
    expect(snapshot.nodes).toHaveLength(24);
    expect(snapshot.edges).toHaveLength(1);
    expect(snapshot.morphology.totalNeurons).toBe(24);
    expect(snapshot.lobeStats.reduce((sum, item) => sum + item.count, 0)).toBe(24);
  });
});
