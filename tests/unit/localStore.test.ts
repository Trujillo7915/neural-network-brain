import { describe, expect, it, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LocalJsonStoreAdapter } from '../../src/infrastructure/adapters/LocalJsonStoreAdapter.js';
import { GetBrainSnapshotUseCase } from '../../src/application/use-cases/GetBrainSnapshotUseCase.js';
import { ManageLocalMemoryUseCase } from '../../src/application/use-cases/ManageLocalMemoryUseCase.js';
import {
  ForbiddenOperationError,
  NodeNotFoundError,
  StoreUnavailableError,
  ValidationError,
} from '../../src/domain/errors/DomainErrors.js';

const tempDirs: string[] = [];

function createTempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-brain-test-'));
  tempDirs.push(dir);
  const starterPath = path.join(dir, 'starter-brain.json');
  const localPath = path.join(dir, 'local-brain.json');
  fs.writeFileSync(
    starterPath,
    JSON.stringify({
      nodes: [
        {
          id: 'local:seed-1',
          externalId: 'seed-1',
          kind: 'episode',
          title: 'Seed Core',
          content: 'Initial starter node in ./data/starter-brain.json',
          confidence: 1,
          tags: ['seed'],
          createdAt: '2026-11-20T10:00:00.000Z',
        },
      ],
      edges: [],
    }),
    'utf8',
  );
  return { dir, starterPath, localPath };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('LocalJsonStoreAdapter & ManageLocalMemoryUseCase (Plug & Play)', () => {
  it('auto-initializes local-brain.json from starter-brain.json and supports CRUD with edge cascade', async () => {
    const { starterPath, localPath } = createTempPaths();
    const store = new LocalJsonStoreAdapter({ localBrainPath: localPath, starterBrainPath: starterPath });

    const initial = await store.load();
    expect(initial.nodes).toHaveLength(1);
    expect(fs.existsSync(localPath)).toBe(true);

    const created = await store.createNeuron({
      title: 'API Gateway Design',
      content: 'Runs on http://127.0.0.1:4310 with Zod validation.',
      kind: 'decision',
      tags: ['api', 'design', 'api'],
      confidence: 0.96,
      links: [{ targetId: 'local:seed-1', relationType: 'supports' }],
    });

    expect(created.id).toMatch(/^local:/);
    expect(created.tags).toEqual(['api', 'design']);

    const afterCreate = await store.load();
    expect(afterCreate.nodes).toHaveLength(2);
    expect(afterCreate.edges).toHaveLength(1);
    expect(afterCreate.edges[0]?.targetId).toBe('local:seed-1');

    await store.createEdge({
      sourceId: 'local:seed-1',
      targetId: created.id,
      relationType: 'related_to',
      weight: 0.85,
    });
    expect((await store.load()).edges).toHaveLength(2);

    const deleted = await store.deleteNeuron(created.id);
    expect(deleted).toBe(true);
    const afterDelete = await store.load();
    expect(afterDelete.nodes).toHaveLength(1);
    expect(afterDelete.edges).toHaveLength(0);
    expect(await store.deleteNeuron('local:non-existent')).toBe(false);
  });

  it('validates self-loops and missing nodes on edge creation', async () => {
    const { starterPath, localPath } = createTempPaths();
    const store = new LocalJsonStoreAdapter({ localBrainPath: localPath, starterBrainPath: starterPath });

    await expect(
      store.createEdge({ sourceId: 'local:seed-1', targetId: 'local:seed-1', relationType: 'related_to' }),
    ).rejects.toThrow(ValidationError);

    await expect(
      store.createEdge({ sourceId: 'local:missing', targetId: 'local:seed-1', relationType: 'related_to' }),
    ).rejects.toThrow(NodeNotFoundError);

    await expect(
      store.createEdge({ sourceId: 'local:seed-1', targetId: 'local:missing', relationType: 'related_to' }),
    ).rejects.toThrow(NodeNotFoundError);
  });

  it('ManageLocalMemoryUseCase enforces 403 on external stores and handles invalid inputs cleanly', async () => {
    const { starterPath, localPath } = createTempPaths();
    const store = new LocalJsonStoreAdapter({ localBrainPath: localPath, starterBrainPath: starterPath });
    const silentLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
    const snapshotUc = new GetBrainSnapshotUseCase({ stores: [store], logger: silentLogger });
    const manageUc = new ManageLocalMemoryUseCase(snapshotUc, store);

    const snapAfterCreate = await manageUc.createMemory({
      title: 'Clean Node',
      content: 'Stored locally via ManageLocalMemoryUseCase',
      kind: 'fact',
      tags: ['test'],
      confidence: 0.9,
    });
    expect(snapAfterCreate.nodes).toHaveLength(2);

    const createdId = snapAfterCreate.nodes.find((n) => n.id !== 'local:seed-1')!.id;
    const snapAfterEdge = await manageUc.createSynapse({
      sourceId: createdId,
      targetId: 'local:seed-1',
      relationType: 'part_of',
    });
    expect(snapAfterEdge.edges.some((e) => e.sourceId === createdId)).toBe(true);

    await expect(manageUc.deleteMemory('amem:0')).rejects.toThrow(ForbiddenOperationError);
    await expect(manageUc.deleteMemory('local:does-not-exist')).rejects.toThrow(NodeNotFoundError);
    await expect(
      manageUc.createMemory({ title: '  ', content: 'abc', kind: 'fact', tags: [], confidence: 0.9 }),
    ).rejects.toThrow(ValidationError);
    await expect(
      manageUc.createSynapse({ sourceId: 'local:seed-1', targetId: 'local:seed-1', relationType: 'related_to' }),
    ).rejects.toThrow(ValidationError);

    const snapAfterDelete = await manageUc.deleteMemory(createdId);
    expect(snapAfterDelete.nodes).toHaveLength(1);

    const disabledManage = new ManageLocalMemoryUseCase(snapshotUc, undefined);
    await expect(disabledManage.deleteMemory('local:seed-1')).rejects.toThrow(StoreUnavailableError);
  });
});
