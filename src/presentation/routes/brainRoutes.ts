import type http from 'node:http';
import { z } from 'zod';
import type { GetBrainSnapshotUseCase } from '../../application/use-cases/GetBrainSnapshotUseCase.js';
import type { GetNeuronDetailUseCase } from '../../application/use-cases/GetNeuronDetailUseCase.js';
import type { ManageLocalMemoryUseCase } from '../../application/use-cases/ManageLocalMemoryUseCase.js';
import type { SearchBrainUseCase } from '../../application/use-cases/SearchBrainUseCase.js';
import { ValidationError } from '../../domain/errors/DomainErrors.js';
import { sendProblemDetails } from '../middleware/errorHandler.js';

const MAX_JSON_BODY_BYTES = 64 * 1024;

const SimulateQuerySchema = z.object({
  simulateCount: z.coerce.number().int().min(5).max(500).optional(),
});

const SearchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  source: z.enum(['local-brain', 'agentic-memory', 'mem0', 'ecc-memory-vault']).optional(),
  lobe: z.enum(['frontal', 'temporal', 'parietal', 'occipital', 'cerebellum', 'limbic']).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  simulateCount: z.coerce.number().int().min(5).max(500).optional(),
});

const NodeIdSchema = z.string().min(1).max(128);

const CreateMemoryBodySchema = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().trim().min(3).max(8000),
  kind: z
    .enum([
      'fact',
      'decision',
      'preference',
      'projects',
      'context',
      'identity',
      'methodology',
      'runbook',
      'environment',
      'episode',
      'correction',
    ])
    .default('fact'),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0.95),
  links: z
    .array(
      z.object({
        targetId: z.string().trim().min(1).max(128),
        relationType: z
          .enum(['related_to', 'part_of', 'supports', 'caused_by', 'supersedes'])
          .default('related_to'),
      }),
    )
    .max(12)
    .default([]),
});

const CreateEdgeBodySchema = z.object({
  sourceId: z.string().trim().min(1).max(128),
  targetId: z.string().trim().min(1).max(128),
  relationType: z
    .enum(['related_to', 'part_of', 'supports', 'caused_by', 'supersedes'])
    .default('related_to'),
  weight: z.coerce.number().min(0.1).max(1).default(0.9),
});

export interface BrainRouteDeps {
  readonly snapshotUseCase: GetBrainSnapshotUseCase;
  readonly detailUseCase: GetNeuronDetailUseCase;
  readonly searchUseCase: SearchBrainUseCase;
  readonly manageUseCase: ManageLocalMemoryUseCase;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const serialized = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(serialized),
  });
  res.end(serialized);
}

function methodNotAllowed(
  res: http.ServerResponse,
  pathname: string,
  correlationId: string,
  detail: string,
): true {
  sendProblemDetails(res, {
    type: 'urn:neural-brain:error:method-not-allowed',
    title: 'Method Not Allowed',
    status: 405,
    detail,
    instance: pathname,
    correlationId,
  });
  return true;
}

function urlParamsToObject(searchParams: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value.trim().length > 0) {
      record[key] = value;
    }
  }
  return record;
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw new ValidationError(`El cuerpo JSON excede el máximo permitido (${MAX_JSON_BODY_BYTES} bytes).`);
    }
    chunks.push(buf);
  }

  const rawText = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawText) {
    throw new ValidationError('El cuerpo JSON de la petición no puede estar vacío.');
  }
  try {
    return JSON.parse(rawText);
  } catch {
    throw new ValidationError('Formato JSON inválido en el cuerpo de la petición.');
  }
}

export async function handleBrainRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  correlationId: string,
  deps: BrainRouteDeps,
): Promise<boolean> {
  const { pathname, searchParams } = url;
  const method = req.method ?? 'GET';

  if (pathname === '/api/v1/brain/version') {
    if (method !== 'GET') return methodNotAllowed(res, pathname, correlationId, 'Solo GET permitido en /api/v1/brain/version.');
    sendJson(res, 200, {
      revisionToken: deps.snapshotUseCase.getRevisionToken(),
      checkedAt: new Date().toISOString(),
    });
    return true;
  }

  if (pathname === '/api/v1/brain') {
    if (method !== 'GET') return methodNotAllowed(res, pathname, correlationId, 'Solo GET permitido en /api/v1/brain.');
    const query = SimulateQuerySchema.parse(urlParamsToObject(searchParams));
    const snapshot = await deps.snapshotUseCase.execute({ simulateCount: query.simulateCount });
    sendJson(res, 200, snapshot);
    return true;
  }

  if (pathname === '/api/v1/brain/refresh') {
    if (method !== 'POST') return methodNotAllowed(res, pathname, correlationId, 'Use POST /api/v1/brain/refresh.');
    const snapshot = await deps.snapshotUseCase.execute({ forceRefresh: true });
    sendJson(res, 200, snapshot);
    return true;
  }

  if (pathname === '/api/v1/brain/memories') {
    if (method !== 'POST') return methodNotAllowed(res, pathname, correlationId, 'Use POST /api/v1/brain/memories.');
    const body = CreateMemoryBodySchema.parse(await readJsonBody(req));
    const snapshot = await deps.manageUseCase.createMemory(body);
    sendJson(res, 201, snapshot);
    return true;
  }

  if (pathname.startsWith('/api/v1/brain/memories/')) {
    if (method !== 'DELETE') return methodNotAllowed(res, pathname, correlationId, 'Use DELETE /api/v1/brain/memories/:id.');
    const rawId = decodeURIComponent(pathname.slice('/api/v1/brain/memories/'.length));
    const id = NodeIdSchema.parse(rawId);
    const snapshot = await deps.manageUseCase.deleteMemory(id);
    sendJson(res, 200, snapshot);
    return true;
  }

  if (pathname === '/api/v1/brain/edges') {
    if (method !== 'POST') return methodNotAllowed(res, pathname, correlationId, 'Use POST /api/v1/brain/edges.');
    const body = CreateEdgeBodySchema.parse(await readJsonBody(req));
    const snapshot = await deps.manageUseCase.createSynapse(body);
    sendJson(res, 201, snapshot);
    return true;
  }

  if (pathname === '/api/v1/brain/search') {
    if (method !== 'GET') return methodNotAllowed(res, pathname, correlationId, 'Solo GET permitido en /api/v1/brain/search.');
    const query = SearchQuerySchema.parse(urlParamsToObject(searchParams));
    const result = await deps.searchUseCase.execute(query);
    sendJson(res, 200, result);
    return true;
  }

  if (pathname.startsWith('/api/v1/brain/nodes/')) {
    if (method !== 'GET') return methodNotAllowed(res, pathname, correlationId, 'Solo GET permitido para inspeccionar neuronas.');
    const rawId = decodeURIComponent(pathname.slice('/api/v1/brain/nodes/'.length));
    const id = NodeIdSchema.parse(rawId);
    const query = SimulateQuerySchema.parse(urlParamsToObject(searchParams));
    const detail = await deps.detailUseCase.execute({ id, simulateCount: query.simulateCount });
    sendJson(res, 200, detail);
    return true;
  }

  return false;
}
