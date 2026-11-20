import { describe, expect, it } from 'vitest';
import type { MemoryStorePort, MemoryStorePayload } from '../../src/domain/ports/MemoryStorePort.js';
import type { LoggerPort } from '../../src/domain/ports/LoggerPort.js';
import { GetBrainSnapshotUseCase } from '../../src/application/use-cases/GetBrainSnapshotUseCase.js';
import { GetNeuronDetailUseCase } from '../../src/application/use-cases/GetNeuronDetailUseCase.js';
import { SearchBrainUseCase } from '../../src/application/use-cases/SearchBrainUseCase.js';
import { NodeNotFoundError } from '../../src/domain/errors/DomainErrors.js';

const silentLogger: LoggerPort = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function stubStore(payload: MemoryStorePayload): MemoryStorePort {
  return {
    source: payload.source,
    load: async () => payload,
  };
}

function failingStore(source: MemoryStorePayload['source'], message: string): MemoryStorePort {
  return {
    source,
    load: async () => {
      throw new Error(message);
    },
  };
}

describe('BDD Acceptance Scenarios (HU-01 through HU-05)', () => {
  it('HU-01: Given 34 memories across 3 stores, When fetching snapshot, Then returns developing stage and 3D coordinates', async () => {
    const amemNodes = Array.from({ length: 15 }, (_, i) => ({
      id: `amem:${i}`,
      externalId: String(i),
      source: 'agentic-memory' as const,
      kind: i % 5 === 0 ? 'decision' : 'fact',
      title: `Memoria AMEM ${i}`,
      content: `Contenido técnico de architecture-core número ${i}`,
      confidence: 1,
      decayScore: 0,
      accessCount: 0,
      tags: ['architecture-core'],
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    }));
    const mem0Nodes = Array.from({ length: 12 }, (_, i) => ({
      id: `mem0:${i}`,
      externalId: String(i),
      source: 'mem0' as const,
      kind: 'project_status',
      title: `Memoria Mem0 ${i}`,
      content: `Estado semántico de architecture-core ${i}`,
      confidence: 0.95,
      decayScore: 0,
      accessCount: 0,
      tags: ['project_status'],
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    }));
    const eccNodes = Array.from({ length: 7 }, (_, i) => ({
      id: `ecc:${i}`,
      externalId: String(i),
      source: 'ecc-memory-vault' as const,
      kind: 'runbook',
      title: `Documento Vault ${i}`,
      content: `Guía de metodología TDD y Clean Code ${i}`,
      confidence: 0.9,
      decayScore: 0,
      accessCount: 0,
      tags: ['methodology'],
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    }));

    const useCase = new GetBrainSnapshotUseCase({
      stores: [
        stubStore({
          source: 'agentic-memory',
          nodes: amemNodes,
          edges: [
            {
              id: 'amem:0->amem:1',
              sourceId: 'amem:0',
              targetId: 'amem:1',
              relationType: 'related_to',
              origin: 'agentic-memory',
              weight: 1,
              createdAt: '2026-11-20T00:00:00.000Z',
            },
          ],
        }),
        stubStore({ source: 'mem0', nodes: mem0Nodes, edges: [] }),
        stubStore({ source: 'ecc-memory-vault', nodes: eccNodes, edges: [] }),
      ],
      logger: silentLogger,
    });

    const snapshot = await useCase.execute({});
    expect(snapshot.nodes).toHaveLength(34);
    expect(snapshot.mode).toBe('live');
    expect(snapshot.growthStage.code).toBe('developing');
    expect(snapshot.overallStatus).toBe('ok');
    expect(snapshot.nodes.every((n) => Number.isFinite(n.position.x))).toBe(true);
  });

  it('HU-02: Given connected neurons, When inspecting neuron detail, Then returns full content and neighbors or 404 error', async () => {
    const snapshotUseCase = new GetBrainSnapshotUseCase({
      stores: [
        stubStore({
          source: 'agentic-memory',
          nodes: [
            {
              id: 'amem:0',
              externalId: '0',
              source: 'agentic-memory',
              kind: 'fact',
              title: 'Core Hub',
              content: 'Architecture core connects domain entities.',
              confidence: 1,
              decayScore: 0,
              accessCount: 1,
              tags: ['identity'],
              createdAt: '2026-11-20T00:00:00.000Z',
              updatedAt: '2026-11-20T00:00:00.000Z',
            },
            {
              id: 'amem:2',
              externalId: '2',
              source: 'agentic-memory',
              kind: 'fact',
              title: 'Stack Core',
              content: 'TypeScript 5.8 and Three.js 0.175.',
              confidence: 1,
              decayScore: 0,
              accessCount: 0,
              tags: ['architecture'],
              createdAt: '2026-11-20T00:00:00.000Z',
              updatedAt: '2026-11-20T00:00:00.000Z',
            },
          ],
          edges: [
            {
              id: 'amem:0->amem:2:related_to',
              sourceId: 'amem:0',
              targetId: 'amem:2',
              relationType: 'related_to',
              origin: 'agentic-memory',
              weight: 1,
              createdAt: '2026-11-20T00:00:00.000Z',
            },
          ],
        }),
      ],
      logger: silentLogger,
    });

    const detailUseCase = new GetNeuronDetailUseCase(snapshotUseCase);
    const detail = await detailUseCase.execute({ id: 'amem:0' });
    expect(detail.node.content).toContain('Architecture core connects');
    expect(detail.connections.some((c) => c.neighbor.id === 'amem:2')).toBe(true);

    await expect(detailUseCase.execute({ id: 'inexistente:999' })).rejects.toThrow(NodeNotFoundError);
  });

  it('HU-03: Given mixed memories, When searching by query and source, Then returns only matching neurons and edges', async () => {
    const snapshotUseCase = new GetBrainSnapshotUseCase({
      stores: [
        stubStore({
          source: 'mem0',
          nodes: [
            {
              id: 'mem0:a',
              externalId: 'a',
              source: 'mem0',
              kind: 'project_architecture',
              title: 'Arquitectura Hexagonal',
              content: 'architecture-core usa puertos y adaptadores.',
              confidence: 0.95,
              decayScore: 0,
              accessCount: 0,
              tags: ['architecture-core'],
              createdAt: '2026-11-20T00:00:00.000Z',
              updatedAt: '2026-11-20T00:00:00.000Z',
            },
            {
              id: 'mem0:b',
              externalId: 'b',
              source: 'mem0',
              kind: 'environment',
              title: 'Local Runtime',
              content: 'Local Node.js runtime on disk.',
              confidence: 0.95,
              decayScore: 0,
              accessCount: 0,
              tags: ['runtime'],
              createdAt: '2026-11-20T00:00:00.000Z',
              updatedAt: '2026-11-20T00:00:00.000Z',
            },
          ],
          edges: [],
        }),
      ],
      logger: silentLogger,
    });

    const searchUseCase = new SearchBrainUseCase(snapshotUseCase);
    const result = await searchUseCase.execute({ q: 'architecture-core', source: 'mem0' });
    expect(result.matchedIds).toEqual(['mem0:a']);
    expect(result.totalMatched).toBe(1);
  });

  it('HU-04: Given simulateCount=250, When requesting brain, Then returns neocortex stage in simulation mode', async () => {
    const useCase = new GetBrainSnapshotUseCase({ stores: [], logger: silentLogger });
    const simulated = await useCase.execute({ simulateCount: 250 });
    expect(simulated.mode).toBe('simulation');
    expect(simulated.nodes).toHaveLength(250);
    expect(simulated.growthStage.code).toBe('neocortex');
  });

  it('HU-05: Given mem0 fails while agentic-memory and ecc succeed, Then returns degraded status with remaining nodes', async () => {
    const useCase = new GetBrainSnapshotUseCase({
      stores: [
        stubStore({
          source: 'agentic-memory',
          nodes: [
            {
              id: 'amem:1',
              externalId: '1',
              source: 'agentic-memory',
              kind: 'fact',
              title: 'Ok 1',
              content: 'Contenido 1',
              confidence: 1,
              decayScore: 0,
              accessCount: 0,
              tags: [],
              createdAt: '2026-11-20T00:00:00.000Z',
              updatedAt: '2026-11-20T00:00:00.000Z',
            },
          ],
          edges: [],
        }),
        failingStore('mem0', 'Qdrant lock unavailable'),
        stubStore({
          source: 'ecc-memory-vault',
          nodes: [
            {
              id: 'ecc:1',
              externalId: '1',
              source: 'ecc-memory-vault',
              kind: 'handoff',
              title: 'Vault 1',
              content: 'Contenido vault',
              confidence: 0.9,
              decayScore: 0,
              accessCount: 0,
              tags: [],
              createdAt: '2026-11-20T00:00:00.000Z',
              updatedAt: '2026-11-20T00:00:00.000Z',
            },
          ],
          edges: [],
        }),
      ],
      logger: silentLogger,
    });

    const snapshot = await useCase.execute({});
    expect(snapshot.nodes).toHaveLength(2);
    expect(snapshot.overallStatus).toBe('degraded');
    const mem0Health = snapshot.storeHealth.find((s) => s.source === 'mem0');
    expect(mem0Health?.status).toBe('error');
  });

  it('coalesces concurrent cold snapshot loads into a single store read (Single-Flight)', async () => {
    let loadCalls = 0;
    const slowStore: MemoryStorePort = {
      source: 'agentic-memory',
      load: async () => {
        loadCalls += 1;
        await new Promise((r) => setTimeout(r, 25));
        return { source: 'agentic-memory', nodes: [], edges: [] };
      },
    };
    const useCase = new GetBrainSnapshotUseCase({ stores: [slowStore], logger: silentLogger });
    const [a, b, c] = await Promise.all([useCase.execute({}), useCase.execute({}), useCase.execute({})]);
    expect(loadCalls).toBe(1);
    expect(a.snapshotId).toBe(b.snapshotId);
    expect(b.snapshotId).toBe(c.snapshotId);
  });
});
