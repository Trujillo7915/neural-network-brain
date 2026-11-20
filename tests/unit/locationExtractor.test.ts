import { describe, expect, it, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractLocations } from '../../src/domain/services/LocationExtractor.js';
import { StoreVersionMonitor } from '../../src/infrastructure/adapters/StoreVersionMonitor.js';
import { GetBrainSnapshotUseCase } from '../../src/application/use-cases/GetBrainSnapshotUseCase.js';
import { CacheAside } from '../../src/infrastructure/resilience/CacheAside.js';
import type { BrainSnapshot } from '../../src/domain/entities/BrainSnapshot.js';
import type { MemoryStorePort } from '../../src/domain/ports/MemoryStorePort.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('LocationExtractor & StoreVersionMonitor', () => {
  it('extracts deduplicated Windows paths, home paths, HTTP URLs and local ports cleanly', () => {
    const text =
      'Servicio activo en http://127.0.0.1:4310, proyecto en C:\\IA\\neural-brain-visualizer, carpeta C:\\IA: reglas en ~/.ecc y MySQL80 en :3306 (evitar :8080).';
    const locations = extractLocations(text);

    expect(locations).toContain('http://127.0.0.1:4310');
    expect(locations).toContain('C:\\IA\\neural-brain-visualizer');
    expect(locations).toContain('C:\\IA');
    expect(locations).toContain('~/.ecc');
    expect(locations).toContain(':3306');
    expect(locations).toContain(':8080');
    expect(extractLocations('')).toEqual([]);
  });

  it('StoreVersionMonitor changes revisionToken immediately when an ECC markdown file or .amem file updates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'version-monitor-'));
    tempDirs.push(root);

    const localBrain = path.join(root, 'local-brain.json');
    const amem = path.join(root, '.agentic-brain.amem');
    const mem0 = path.join(root, '.mem0');
    const ecc = path.join(root, '.ecc');
    fs.mkdirSync(mem0, { recursive: true });
    fs.mkdirSync(path.join(ecc, 'memory'), { recursive: true });
    fs.writeFileSync(localBrain, '{"nodes":[]}', 'utf8');
    fs.writeFileSync(amem, 'v1', 'utf8');
    fs.writeFileSync(path.join(ecc, 'memory', 'note.md'), '# Nota 1', 'utf8');

    const monitor = new StoreVersionMonitor({
      localBrainPath: localBrain,
      amemFilePath: amem,
      mem0Home: mem0,
      eccHome: ecc,
      enableExternalStores: true,
    });
    const rev1 = monitor.getRevisionToken();
    const rev1Same = monitor.getRevisionToken();
    expect(rev1).toBe(rev1Same);

    fs.writeFileSync(path.join(ecc, 'memory', 'note2.md'), '# Nota 2', 'utf8');
    const rev2 = monitor.getRevisionToken();
    expect(rev2).not.toBe(rev1);

    fs.writeFileSync(localBrain, '{"nodes":[{"id":"1"}]}', 'utf8');
    const rev3 = monitor.getRevisionToken();
    expect(rev3).not.toBe(rev2);
  });

  it('GetBrainSnapshotUseCase automatically invalidates cache when revisionToken changes on disk', async () => {
    let revision = 'rev-1';
    let loadCount = 0;
    const store: MemoryStorePort = {
      source: 'ecc-memory-vault',
      load: async () => {
        loadCount += 1;
        return { source: 'ecc-memory-vault', nodes: [], edges: [] };
      },
    };
    const cache = new CacheAside<BrainSnapshot>(60_000);
    const useCase = new GetBrainSnapshotUseCase({
      stores: [store],
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      cache,
      versionProvider: () => revision,
    });

    const snap1 = await useCase.execute({});
    const snap1Cached = await useCase.execute({});
    expect(snap1.revisionToken).toBe('rev-1');
    expect(snap1Cached.snapshotId).toBe(snap1.snapshotId);
    expect(loadCount).toBe(1);

    revision = 'rev-2';
    const snap2 = await useCase.execute({});
    expect(snap2.revisionToken).toBe('rev-2');
    expect(loadCount).toBe(2);
  });
});
