import { describe, expect, it } from 'vitest';
import {
  computeSemanticLinks,
  tokenizeSpanishEnglish,
} from '../../src/domain/services/SemanticLinkService.js';
import type { RawMemoryRecord } from '../../src/domain/entities/NeuronNode.js';
import type { RawEdgeRecord } from '../../src/domain/entities/SynapticEdge.js';

function makeNode(id: string, source: RawMemoryRecord['source'], content: string, tags: string[] = []): RawMemoryRecord {
  return {
    id,
    externalId: id,
    source,
    kind: 'fact',
    title: id,
    content,
    confidence: 1,
    decayScore: 0,
    accessCount: 0,
    tags,
    createdAt: '2026-11-20T00:00:00.000Z',
    updatedAt: '2026-11-20T00:00:00.000Z',
  };
}

describe('SemanticLinkService (BR-07)', () => {
  it('normalizes Spanish/English tokens removing accents and stopwords', () => {
    const tokens = tokenizeSpanishEnglish('La arquitectura de microservicios en SQL para gestión');
    expect(tokens.has('arquitectura')).toBe(true);
    expect(tokens.has('microservicios')).toBe(true);
    expect(tokens.has('sql')).toBe(true);
    expect(tokens.has('gestion')).toBe(true);
    expect(tokens.has('para')).toBe(false);
  });

  it('connects semantically similar nodes across different memory stores without self-loops', () => {
    const nodes = [
      makeNode('amem:1', 'agentic-memory', 'hexagonal-core microservicios TypeScript Node Vite ThreeJS', ['hexagonal']),
      makeNode('mem0:1', 'mem0', 'hexagonal-core usa TypeScript Node Vite ThreeJS OpenAPI', ['hexagonal']),
      makeNode('ecc:1', 'ecc-memory-vault', 'receta de cocina pasta italiana salsa tomate', ['cocina']),
    ];

    const links = computeSemanticLinks(nodes, []);
    expect(links.length).toBe(1);
    expect(links[0]?.sourceId).toBe('amem:1');
    expect(links[0]?.targetId).toBe('mem0:1');
    expect(links[0]?.relationType).toBe('semantic_link');
    expect(links[0]?.weight).toBeGreaterThanOrEqual(0.24);
  });

  it('does not duplicate edges that already exist explicitly in agentic-memory', () => {
    const nodes = [
      makeNode('amem:1', 'agentic-memory', 'hexagonal-core arquitectura microservicios typescript', ['hexagonal']),
      makeNode('amem:2', 'agentic-memory', 'hexagonal-core arquitectura microservicios typescript', ['hexagonal']),
    ];
    const existing: RawEdgeRecord[] = [
      {
        id: 'amem:1->amem:2',
        sourceId: 'amem:1',
        targetId: 'amem:2',
        relationType: 'related_to',
        origin: 'agentic-memory',
        weight: 1,
        createdAt: '2026-11-20T00:00:00.000Z',
      },
    ];

    const links = computeSemanticLinks(nodes, existing);
    expect(links).toHaveLength(0);
  });

  it('caps outgoing semantic edges per neuron to prevent visual hairball', () => {
    const nodes = Array.from({ length: 12 }, (_, i) =>
      makeNode(
        `mem0:${i}`,
        'mem0',
        `hexagonal-core microservicios arquitectura limpia typescript sql token${i}`,
        ['hexagonal', 'sql'],
      ),
    );

    const links = computeSemanticLinks(nodes, []);
    const degreeBySource = new Map<string, number>();
    for (const edge of links) {
      degreeBySource.set(edge.sourceId, (degreeBySource.get(edge.sourceId) ?? 0) + 1);
    }
    for (const count of degreeBySource.values()) {
      expect(count).toBeLessThanOrEqual(4);
    }
  });
});
