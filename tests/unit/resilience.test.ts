import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from '../../src/infrastructure/resilience/CircuitBreaker.js';
import { retryWithBackoff } from '../../src/infrastructure/resilience/RetryPolicy.js';
import { CacheAside } from '../../src/infrastructure/resilience/CacheAside.js';
import { RateLimiter } from '../../src/infrastructure/resilience/RateLimiter.js';

describe('SRE Resilience Primitives (RNF-04)', () => {
  it('CircuitBreaker opens after threshold failures and transitions to half-open after cooldown', async () => {
    let now = 1_000;
    const cb = new CircuitBreaker({
      name: 'mem0',
      failureThreshold: 2,
      resetTimeoutMs: 5_000,
      now: () => now,
    });

    const failingOp = async () => {
      throw new Error('lock timeout');
    };

    await expect(cb.execute(failingOp)).rejects.toThrow('lock timeout');
    expect(cb.getState()).toBe('CLOSED');

    await expect(cb.execute(failingOp)).rejects.toThrow('lock timeout');
    expect(cb.getState()).toBe('OPEN');

    await expect(cb.execute(async () => 'ok')).rejects.toThrow(/OPEN/);

    now += 6_000;
    const recovered = await cb.execute(async () => 'recovered');
    expect(recovered).toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('retryWithBackoff retries transient errors and succeeds', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('transient');
        return 'ok';
      },
      { maxRetries: 2, baseDelayMs: 1, jitterRatio: 0 },
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('CacheAside returns fresh entries until TTL expires or invalidated', () => {
    let now = 10_000;
    const cache = new CacheAside<string>(1_000, () => now);
    cache.set('k', 'value-1');
    expect(cache.get('k')).toBe('value-1');

    now += 1_500;
    expect(cache.get('k')).toBeUndefined();

    cache.set('k', 'value-2');
    cache.invalidateAll();
    expect(cache.get('k')).toBeUndefined();
  });

  it('RateLimiter enforces sliding window limit per client key', () => {
    let now = 1_000;
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 10_000, now: () => now });
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
    expect(limiter.check('127.0.0.1').allowed).toBe(true);

    const blocked = limiter.check('127.0.0.1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    now += 11_000;
    expect(limiter.check('127.0.0.1').allowed).toBe(true);
  });

  it('retryWithBackoff surfaces final error when retries exhausted', async () => {
    const fn = vi.fn(async () => {
      throw new Error('permanent');
    });
    await expect(retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 1, jitterRatio: 0 })).rejects.toThrow('permanent');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
