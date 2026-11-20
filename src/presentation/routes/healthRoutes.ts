import type http from 'node:http';
import type { GetBrainSnapshotUseCase } from '../../application/use-cases/GetBrainSnapshotUseCase.js';
import type { CircuitSnapshot } from '../../infrastructure/resilience/CircuitBreaker.js';

export interface MetricsCollector {
  requestsTotal: number;
  errorsTotal: number;
  durationsMs: number[];
  readonly startedAt: number;
}

export interface HealthRouteDeps {
  readonly snapshotUseCase: GetBrainSnapshotUseCase;
  readonly metrics: MetricsCollector;
  readonly getCacheStats: () => Readonly<{ hits: number; misses: number; size: number }>;
  readonly getCircuitSnapshots: () => readonly CircuitSnapshot[];
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number((sorted[index] ?? 0).toFixed(2));
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export async function handleHealthRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  deps: HealthRouteDeps,
): Promise<boolean> {
  if (req.method !== 'GET') {
    return false;
  }

  if (url.pathname === '/api/v1/health') {
    if (url.searchParams.get('mode') === 'liveness') {
      sendJson(res, 200, {
        status: 'ok',
        mode: 'liveness',
        service: 'neural-network-brain',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor((Date.now() - deps.metrics.startedAt) / 1_000),
      });
      return true;
    }
    const snapshot = await deps.snapshotUseCase.execute({});
    sendJson(res, 200, {
      status: snapshot.overallStatus,
      service: 'neural-network-brain',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - deps.metrics.startedAt) / 1_000),
      totalNeurons: snapshot.morphology.totalNeurons,
      growthStage: snapshot.growthStage.code,
      stores: snapshot.storeHealth,
      circuits: deps.getCircuitSnapshots(),
    });
    return true;
  }

  if (url.pathname === '/api/v1/metrics') {
    const cache = deps.getCacheStats();
    const p95 = percentile(deps.metrics.durationsMs, 95);
    const p99 = percentile(deps.metrics.durationsMs, 99);
    const accept = req.headers.accept ?? '';

    if (accept.includes('text/plain')) {
      const lines = [
        '# HELP neural_brain_http_requests_total Total HTTP requests served',
        '# TYPE neural_brain_http_requests_total counter',
        `neural_brain_http_requests_total ${deps.metrics.requestsTotal}`,
        '# HELP neural_brain_http_errors_total Total HTTP error responses',
        '# TYPE neural_brain_http_errors_total counter',
        `neural_brain_http_errors_total ${deps.metrics.errorsTotal}`,
        '# HELP neural_brain_http_duration_p95_ms P95 HTTP request duration in ms',
        '# TYPE neural_brain_http_duration_p95_ms gauge',
        `neural_brain_http_duration_p95_ms ${p95}`,
        '# HELP neural_brain_cache_hits_total Snapshot cache hits',
        '# TYPE neural_brain_cache_hits_total counter',
        `neural_brain_cache_hits_total ${cache.hits}`,
      ].join('\n');
      res.writeHead(200, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Content-Length': Buffer.byteLength(lines),
      });
      res.end(lines);
      return true;
    }

    sendJson(res, 200, {
      requestsTotal: deps.metrics.requestsTotal,
      errorsTotal: deps.metrics.errorsTotal,
      latencyMs: { p95, p99, samples: deps.metrics.durationsMs.length },
      cache,
      circuits: deps.getCircuitSnapshots(),
      uptimeSeconds: Math.floor((Date.now() - deps.metrics.startedAt) / 1_000),
    });
    return true;
  }

  return false;
}
