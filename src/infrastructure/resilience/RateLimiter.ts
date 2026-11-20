export interface RateLimiterOptions {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly now?: () => number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, number[]>();

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
    this.now = options.now ?? (() => Date.now());
  }

  check(key: string): RateLimitResult {
    const currentTime = this.now();
    const cutoff = currentTime - this.windowMs;
    const recent = (this.buckets.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      const oldest = recent[0] ?? currentTime;
      const retryAfterMs = Math.max(1_000, oldest + this.windowMs - currentTime);
      this.buckets.set(key, recent);
      return Object.freeze({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
      });
    }

    const updated = [...recent, currentTime];
    this.buckets.set(key, updated);
    return Object.freeze({
      allowed: true,
      remaining: Math.max(0, this.maxRequests - updated.length),
      retryAfterSeconds: 0,
    });
  }
}
