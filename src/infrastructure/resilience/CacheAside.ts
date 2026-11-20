interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

export class CacheAside<T> {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(ttlMs: number, now: () => number = () => Date.now()) {
    this.ttlMs = ttlMs;
    this.now = now;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (this.now() >= entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.ttlMs <= 0) {
      return;
    }
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  invalidateAll(): void {
    this.store.clear();
  }

  getStats(): Readonly<{ hits: number; misses: number; size: number }> {
    return Object.freeze({ hits: this.hits, misses: this.misses, size: this.store.size });
  }
}
