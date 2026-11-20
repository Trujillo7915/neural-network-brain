/**
 * Lightweight reproducible load test validating RNF-01 (P95 < 150ms, P99 < 300ms, >= 50 RPS).
 * Usage: node scripts/load-test.mjs [baseUrl] [totalRequests] [concurrency]
 */
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4310';
const totalRequests = Number(process.argv[3] ?? 200);
const concurrency = Number(process.argv[4] ?? 20);

const latencies = [];
let errors = 0;

async function runWorker(queue) {
  while (queue.length > 0) {
    const idx = queue.pop();
    const path = idx % 3 === 0 ? '/api/v1/brain' : idx % 3 === 1 ? '/api/v1/health' : '/api/v1/brain/search?q=architecture';
    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}${path}`);
      if (!res.ok) errors += 1;
      await res.text();
    } catch {
      errors += 1;
    } finally {
      latencies.push(performance.now() - start);
    }
  }
}

async function main() {
  // Warm up cache before steady-state benchmark
  await fetch(`${baseUrl}/api/v1/brain`).then((r) => r.text());

  const queue = Array.from({ length: totalRequests }, (_, i) => i);
  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => runWorker(queue)));
  const totalMs = performance.now() - startedAt;

  latencies.sort((a, b) => a - b);
  const pct = (p) => Number((latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))] ?? 0).toFixed(2));
  const rps = Number(((totalRequests / totalMs) * 1000).toFixed(2));

  const report = {
    baseUrl,
    totalRequests,
    concurrency,
    errors,
    totalDurationMs: Number(totalMs.toFixed(2)),
    throughputRps: rps,
    latencyMs: {
      min: pct(0),
      p50: pct(50),
      p95: pct(95),
      p99: pct(99),
      max: pct(100),
    },
    rnf01Passed: errors === 0 && pct(95) < 150 && pct(99) < 300 && rps >= 50,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.rnf01Passed) {
    process.exitCode = 1;
  }
}

main();
