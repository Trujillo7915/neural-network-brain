import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import type { BrainSnapshot } from '../domain/entities/BrainSnapshot.js';
import type { MemorySourceCode } from '../domain/entities/NeuronNode.js';
import { RateLimitExceededError } from '../domain/errors/DomainErrors.js';
import type { LoggerPort } from '../domain/ports/LoggerPort.js';
import type { MemoryStorePort } from '../domain/ports/MemoryStorePort.js';
import type { WritableMemoryStorePort } from '../domain/ports/WritableMemoryStorePort.js';
import { GetBrainSnapshotUseCase } from '../application/use-cases/GetBrainSnapshotUseCase.js';
import { GetNeuronDetailUseCase } from '../application/use-cases/GetNeuronDetailUseCase.js';
import { ManageLocalMemoryUseCase } from '../application/use-cases/ManageLocalMemoryUseCase.js';
import { SearchBrainUseCase } from '../application/use-cases/SearchBrainUseCase.js';
import { CacheAside } from '../infrastructure/resilience/CacheAside.js';
import { CircuitBreaker } from '../infrastructure/resilience/CircuitBreaker.js';
import { RateLimiter } from '../infrastructure/resilience/RateLimiter.js';
import { retryWithBackoff } from '../infrastructure/resilience/RetryPolicy.js';
import { resolveCorrelationId } from './middleware/correlationId.js';
import { handleRequestError, sendProblemDetails } from './middleware/errorHandler.js';
import { applySecurityHeaders } from './middleware/securityHeaders.js';
import { handleBrainRoutes } from './routes/brainRoutes.js';
import { handleHealthRoutes, type MetricsCollector } from './routes/healthRoutes.js';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export interface CreateServerOptions {
  readonly stores: readonly MemoryStorePort[];
  readonly writableStore?: WritableMemoryStorePort;
  readonly logger: LoggerPort;
  readonly cacheTtlMs: number;
  readonly rateLimitMaxRequests: number;
  readonly rateLimitWindowMs: number;
  readonly versionProvider?: () => string;
  readonly circuitFailureThreshold?: number;
  readonly circuitResetMs?: number;
  readonly staticWebDir?: string;
  readonly nodeEnv?: string;
}

async function tryServeStatic(
  res: http.ServerResponse,
  pathname: string,
  staticWebDir?: string,
): Promise<boolean> {
  if (!staticWebDir) {
    return false;
  }
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const resolvedRoot = path.resolve(staticWebDir);
  const candidate = path.resolve(resolvedRoot, `.${safePath}`);
  if (!candidate.startsWith(resolvedRoot)) {
    return false;
  }

  try {
    const content = await fs.readFile(candidate);
    const ext = path.extname(candidate).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': content.length,
    });
    res.end(content);
    return true;
  } catch {
    if (!pathname.startsWith('/api/')) {
      try {
        const indexHtml = await fs.readFile(path.join(resolvedRoot, 'index.html'));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': indexHtml.length,
        });
        res.end(indexHtml);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function createAppServer(options: CreateServerOptions): Readonly<{ server: http.Server }> {
  const cache = new CacheAside<BrainSnapshot>(options.cacheTtlMs);
  const rateLimiter = new RateLimiter({
    maxRequests: options.rateLimitMaxRequests,
    windowMs: options.rateLimitWindowMs,
  });

  const circuits = new Map<MemorySourceCode, CircuitBreaker>();
  for (const store of options.stores) {
    circuits.set(
      store.source,
      new CircuitBreaker({
        name: store.source,
        failureThreshold: options.circuitFailureThreshold ?? 3,
        resetTimeoutMs: options.circuitResetMs ?? 15_000,
      }),
    );
  }

  const snapshotUseCase = new GetBrainSnapshotUseCase({
    stores: options.stores,
    logger: options.logger,
    cache,
    versionProvider: options.versionProvider,
    guard: async (source, op) => {
      const cb = circuits.get(source);
      const executeWithRetry = () => retryWithBackoff(op, { maxRetries: 1, baseDelayMs: 60 });
      return cb ? cb.execute(executeWithRetry) : executeWithRetry();
    },
  });

  const detailUseCase = new GetNeuronDetailUseCase(snapshotUseCase);
  const searchUseCase = new SearchBrainUseCase(snapshotUseCase);
  const manageUseCase = new ManageLocalMemoryUseCase(snapshotUseCase, options.writableStore);
  const metrics: MetricsCollector = {
    requestsTotal: 0,
    errorsTotal: 0,
    durationsMs: [],
    startedAt: Date.now(),
  };

  const server = http.createServer(async (req, res) => {
    const startedAt = performance.now();
    const correlationId = resolveCorrelationId(req);
    applySecurityHeaders(req, res, correlationId);
    metrics.requestsTotal += 1;

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const isLivenessProbe = url.pathname === '/api/v1/health' && url.searchParams.get('mode') === 'liveness';
      const isVersionProbe = url.pathname === '/api/v1/brain/version';
      const isApiRoute = url.pathname.startsWith('/api/');

      if (isApiRoute && !isLivenessProbe && !isVersionProbe) {
        const clientKey = req.socket.remoteAddress ?? '127.0.0.1';
        const limit = rateLimiter.check(clientKey);
        if (!limit.allowed) {
          throw new RateLimitExceededError(limit.retryAfterSeconds);
        }
      }

      const handledHealth = await handleHealthRoutes(req, res, url, {
        snapshotUseCase,
        metrics,
        getCacheStats: () => cache.getStats(),
        getCircuitSnapshots: () => [...circuits.values()].map((c) => c.getSnapshot()),
      });
      if (handledHealth) return;

      const handledBrain = await handleBrainRoutes(req, res, url, correlationId, {
        snapshotUseCase,
        detailUseCase,
        searchUseCase,
        manageUseCase,
      });
      if (handledBrain) return;

      const servedStatic = await tryServeStatic(res, url.pathname, options.staticWebDir);
      if (servedStatic) return;

      sendProblemDetails(res, {
        type: 'urn:neural-brain:error:not-found',
        title: 'Not Found',
        status: 404,
        detail: `Ruta '${url.pathname}' no encontrada.`,
        instance: url.pathname,
        correlationId,
      });
    } catch (error) {
      metrics.errorsTotal += 1;
      handleRequestError(error, req, res, correlationId, options.logger);
    } finally {
      const duration = performance.now() - startedAt;
      metrics.durationsMs.push(duration);
      if (metrics.durationsMs.length > 500) {
        metrics.durationsMs.shift();
      }
    }
  });

  return Object.freeze({ server });
}
