import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type http from 'node:http';
import { createAppServer } from '../../src/presentation/server.js';
import type { MemoryStorePort } from '../../src/domain/ports/MemoryStorePort.js';
import type { LoggerPort } from '../../src/domain/ports/LoggerPort.js';
import { LocalJsonStoreAdapter } from '../../src/infrastructure/adapters/LocalJsonStoreAdapter.js';

const silentLogger: LoggerPort = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function createTestStores(localStore: LocalJsonStoreAdapter): MemoryStorePort[] {
  return [
    localStore,
    {
      source: 'agentic-memory',
      load: async () => ({
        source: 'agentic-memory',
        nodes: [
          {
            id: 'amem:0',
            externalId: '0',
            source: 'agentic-memory',
            kind: 'fact',
            title: 'Core Platform Identity',
            content: 'Core platform architecture-core powered by TypeScript.',
            confidence: 1,
            decayScore: 0,
            accessCount: 2,
            tags: ['identity', 'architecture-core'],
            createdAt: '2026-11-20T00:00:00.000Z',
            updatedAt: '2026-11-20T00:00:00.000Z',
          },
          {
            id: 'amem:1',
            externalId: '1',
            source: 'agentic-memory',
            kind: 'decision',
            title: 'Quality Gate Rules',
            content: 'Strict coverage >= 80% before merge.',
            confidence: 0.6,
            decayScore: 0,
            accessCount: 4,
            tags: ['rules'],
            createdAt: '2026-11-20T01:00:00.000Z',
            updatedAt: '2026-11-20T01:00:00.000Z',
          },
        ],
        edges: [
          {
            id: 'amem:0->amem:1:supports',
            sourceId: 'amem:0',
            targetId: 'amem:1',
            relationType: 'supports',
            origin: 'agentic-memory',
            weight: 1,
            createdAt: '2026-11-20T01:00:00.000Z',
          },
        ],
      }),
    },
    {
      source: 'mem0',
      load: async () => ({
        source: 'mem0',
        nodes: [
          {
            id: 'mem0:u1',
            externalId: 'u1',
            source: 'mem0',
            kind: 'project_architecture',
            title: 'ThreeJS Scene Engine',
            content: 'architecture-core renders anatomical lobes with Three.js.',
            confidence: 0.95,
            decayScore: 0,
            accessCount: 1,
            tags: ['project_architecture', 'architecture-core'],
            createdAt: '2026-11-20T02:00:00.000Z',
            updatedAt: '2026-11-20T02:00:00.000Z',
          },
        ],
        edges: [],
      }),
    },
    {
      source: 'ecc-memory-vault',
      load: async () => ({
        source: 'ecc-memory-vault',
        nodes: [
          {
            id: 'ecc:v1',
            externalId: 'v1',
            source: 'ecc-memory-vault',
            kind: 'handoff',
            title: 'API Docs Complete',
            content: 'OpenAPI 3.1 contracts aligned for architecture-core.',
            confidence: 0.9,
            decayScore: 0,
            accessCount: 0,
            tags: ['openapi', 'architecture-core'],
            createdAt: '2026-11-20T03:00:00.000Z',
            updatedAt: '2026-11-20T03:00:00.000Z',
          },
        ],
        edges: [],
      }),
    },
  ];
}

describe('HTTP Presentation Integration Tests (/api/v1/*)', () => {
  let server: http.Server;
  let baseUrl: string;
  let staticDir: string;
  let dataDir: string;
  let localStore: LocalJsonStoreAdapter;

  beforeAll(async () => {
    staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-web-static-'));
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-local-data-'));
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><html><body>OK</body></html>', 'utf8');
    fs.writeFileSync(path.join(staticDir, 'app.js'), 'console.info("ok");', 'utf8');

    const starterPath = path.join(dataDir, 'starter.json');
    const localPath = path.join(dataDir, 'local.json');
    fs.writeFileSync(
      starterPath,
      JSON.stringify({
        nodes: [
          {
            id: 'local:seed-1',
            externalId: 'seed-1',
            kind: 'episode',
            title: 'Seed Core',
            content: 'Starter core node at http://127.0.0.1:4310',
            confidence: 1,
            tags: ['seed'],
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        ],
        edges: [],
      }),
      'utf8',
    );
    localStore = new LocalJsonStoreAdapter({ localBrainPath: localPath, starterBrainPath: starterPath });

    const app = createAppServer({
      stores: createTestStores(localStore),
      writableStore: localStore,
      logger: silentLogger,
      cacheTtlMs: 10_000,
      rateLimitMaxRequests: 100,
      rateLimitWindowMs: 60_000,
      versionProvider: () => 'rev-test-001',
      staticWebDir: staticDir,
      nodeEnv: 'test',
    });
    server = app.server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(staticDir, { recursive: true, force: true });
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('GET /api/v1/health returns ok status, CORS headers for localhost and correlation ID', async () => {
    const preflight = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://127.0.0.1:5173' },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
    expect(preflight.headers.get('access-control-allow-methods')).toContain('DELETE');

    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'X-Correlation-ID': 'test-corr-123' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-correlation-id')).toBe('test-corr-123');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');

    const livenessRes = await fetch(`${baseUrl}/api/v1/health?mode=liveness`);
    expect(livenessRes.status).toBe(200);
    const livenessBody = (await livenessRes.json()) as { mode: string; status: string };
    expect(livenessBody.mode).toBe('liveness');
    expect(livenessBody.status).toBe('ok');

    const body = (await res.json()) as { status: string; stores: unknown[] };
    expect(body.status).toBe('ok');
    expect(body.stores).toHaveLength(4);
  });

  it('GET /api/v1/brain returns unified live snapshot and supports simulation mode', async () => {
    const res = await fetch(`${baseUrl}/api/v1/brain`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { nodes: unknown[]; edges: unknown[]; mode: string; revisionToken: string };
    expect(body.mode).toBe('live');
    expect(body.nodes).toHaveLength(5);
    expect(body.revisionToken).toBe('rev-test-001');

    const versionRes = await fetch(`${baseUrl}/api/v1/brain/version`);
    expect(versionRes.status).toBe(200);
    const versionBody = (await versionRes.json()) as { revisionToken: string };
    expect(versionBody.revisionToken).toBe('rev-test-001');

    const cachedRes = await fetch(`${baseUrl}/api/v1/brain`);
    expect(cachedRes.status).toBe(200);

    const simRes = await fetch(`${baseUrl}/api/v1/brain?simulateCount=25`);
    expect(simRes.status).toBe(200);
    const simBody = (await simRes.json()) as { nodes: unknown[]; mode: string };
    expect(simBody.mode).toBe('simulation');
    expect(simBody.nodes).toHaveLength(25);
  });

  it('supports creating memories, linking synapses, and deleting local nodes while protecting external stores', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/brain/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'User Memory Note',
        content: 'Stored at ./data/local-brain.json for end users.',
        kind: 'fact',
        tags: ['user-note'],
        confidence: 0.92,
        links: [{ targetId: 'local:seed-1', relationType: 'supports' }],
      }),
    });
    expect(createRes.status).toBe(201);
    const createdSnap = (await createRes.json()) as { nodes: Array<{ id: string; title: string }>; edges: Array<{ sourceId: string; targetId: string }> };
    const createdNode = createdSnap.nodes.find((n) => n.title === 'User Memory Note');
    expect(createdNode).toBeDefined();
    expect(createdSnap.edges.some((e) => e.sourceId === createdNode!.id && e.targetId === 'local:seed-1')).toBe(true);

    const edgeRes = await fetch(`${baseUrl}/api/v1/brain/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'local:seed-1',
        targetId: createdNode!.id,
        relationType: 'related_to',
      }),
    });
    expect(edgeRes.status).toBe(201);

    const forbiddenDelete = await fetch(`${baseUrl}/api/v1/brain/memories/${encodeURIComponent('amem:0')}`, {
      method: 'DELETE',
    });
    expect(forbiddenDelete.status).toBe(403);

    const badJson = await fetch(`${baseUrl}/api/v1/brain/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });
    expect(badJson.status).toBe(400);

    const deleteRes = await fetch(`${baseUrl}/api/v1/brain/memories/${encodeURIComponent(createdNode!.id)}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);
    const afterDelete = (await deleteRes.json()) as { nodes: Array<{ id: string }> };
    expect(afterDelete.nodes.some((n) => n.id === createdNode!.id)).toBe(false);
  });

  it('GET /api/v1/brain/nodes/:id returns outgoing/incoming neighbors and RFC 7807 404 when missing', async () => {
    const outgoingRes = await fetch(`${baseUrl}/api/v1/brain/nodes/${encodeURIComponent('amem:0')}`);
    expect(outgoingRes.status).toBe(200);
    const detail0 = (await outgoingRes.json()) as { node: { id: string }; connections: Array<{ direction: string }> };
    expect(detail0.node.id).toBe('amem:0');
    expect(detail0.connections.some((c) => c.direction === 'outgoing')).toBe(true);

    const incomingRes = await fetch(`${baseUrl}/api/v1/brain/nodes/${encodeURIComponent('amem:1')}`);
    expect(incomingRes.status).toBe(200);
    const detail1 = (await incomingRes.json()) as { connections: Array<{ direction: string }> };
    expect(detail1.connections.some((c) => c.direction === 'incoming')).toBe(true);

    const notFound = await fetch(`${baseUrl}/api/v1/brain/nodes/missing-id`);
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get('content-type')).toContain('application/problem+json');
    const problem = (await notFound.json()) as { status: number; correlationId: string; stack?: string };
    expect(problem.status).toBe(404);
    expect(problem.correlationId).toBeTruthy();
    expect(problem.stack).toBeUndefined();
  });

  it('GET /api/v1/brain/search filters by query, source, lobe and minConfidence', async () => {
    const bySource = await fetch(`${baseUrl}/api/v1/brain/search?q=architecture-core&source=mem0`);
    expect(bySource.status).toBe(200);
    const data = (await bySource.json()) as { matchedIds: string[] };
    expect(data.matchedIds).toEqual(['mem0:u1']);

    const byLobe = await fetch(`${baseUrl}/api/v1/brain/search?lobe=frontal&minConfidence=0.5`);
    expect(byLobe.status).toBe(200);
    const lobeData = (await byLobe.json()) as { matchedIds: string[] };
    expect(lobeData.matchedIds).toEqual(['amem:1']);

    const highConf = await fetch(`${baseUrl}/api/v1/brain/search?lobe=frontal&minConfidence=0.9`);
    const highConfData = (await highConf.json()) as { totalMatched: number };
    expect(highConfData.totalMatched).toBe(0);

    const invalid = await fetch(`${baseUrl}/api/v1/brain/search?source=invalid_store`);
    expect(invalid.status).toBe(400);
  });

  it('POST /api/v1/brain/refresh invalidates cache and enforces method constraints across endpoints', async () => {
    const res = await fetch(`${baseUrl}/api/v1/brain/refresh`, { method: 'POST' });
    expect(res.status).toBe(200);

    expect((await fetch(`${baseUrl}/api/v1/brain`, { method: 'DELETE' })).status).toBe(405);
    expect((await fetch(`${baseUrl}/api/v1/brain/refresh`, { method: 'GET' })).status).toBe(405);
    expect((await fetch(`${baseUrl}/api/v1/brain/search`, { method: 'POST' })).status).toBe(405);
    expect((await fetch(`${baseUrl}/api/v1/brain/nodes/amem:0`, { method: 'DELETE' })).status).toBe(405);
    expect((await fetch(`${baseUrl}/api/v1/brain/memories`, { method: 'GET' })).status).toBe(405);
    expect((await fetch(`${baseUrl}/api/v1/brain/edges`, { method: 'GET' })).status).toBe(405);
    expect((await fetch(`${baseUrl}/api/v1/unknown`)).status).toBe(404);
  });

  it('serves static SPA assets safely and blocks path traversal', async () => {
    const rootRes = await fetch(`${baseUrl}/`);
    expect(rootRes.status).toBe(200);
    expect(await rootRes.text()).toContain('<body>OK</body>');

    const jsRes = await fetch(`${baseUrl}/app.js`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers.get('content-type')).toContain('application/javascript');

    const spaFallback = await fetch(`${baseUrl}/inspect/amem-0`);
    expect(spaFallback.status).toBe(200);
    expect(await spaFallback.text()).toContain('<body>OK</body>');
  });

  it('GET /api/v1/metrics exposes observability counters in JSON and Prometheus text', async () => {
    const jsonRes = await fetch(`${baseUrl}/api/v1/metrics`);
    expect(jsonRes.status).toBe(200);
    const metrics = (await jsonRes.json()) as { requestsTotal: number };
    expect(metrics.requestsTotal).toBeGreaterThan(0);

    const promRes = await fetch(`${baseUrl}/api/v1/metrics`, {
      headers: { Accept: 'text/plain' },
    });
    expect(promRes.status).toBe(200);
    expect(await promRes.text()).toContain('neural_brain_http_requests_total');
  });

  it('returns RFC 7807 429 with Retry-After when rate limit is exceeded', async () => {
    const limitedApp = createAppServer({
      stores: createTestStores(localStore),
      writableStore: localStore,
      logger: silentLogger,
      cacheTtlMs: 1000,
      rateLimitMaxRequests: 1,
      rateLimitWindowMs: 60_000,
    });
    await new Promise<void>((resolve) => limitedApp.server.listen(0, '127.0.0.1', () => resolve()));
    const port = (limitedApp.server.address() as AddressInfo).port;
    try {
      const first = await fetch(`http://127.0.0.1:${port}/api/v1/metrics`);
      expect(first.status).toBe(200);
      const second = await fetch(`http://127.0.0.1:${port}/api/v1/metrics`);
      expect(second.status).toBe(429);
      expect(second.headers.get('retry-after')).toBeTruthy();

      const liveness = await fetch(`http://127.0.0.1:${port}/api/v1/health?mode=liveness`);
      expect(liveness.status).toBe(200);
    } finally {
      await new Promise<void>((resolve) => limitedApp.server.close(() => resolve()));
    }
  });
});
