export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  readonly name: string;
  readonly failureThreshold: number;
  readonly resetTimeoutMs: number;
  readonly now?: () => number;
}

export interface CircuitSnapshot {
  readonly name: string;
  readonly state: CircuitState;
  readonly failureCount: number;
  readonly openedAt: number | null;
}

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly now: () => number;

  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private openedAt: number | null = null;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs;
    this.now = options.now ?? (() => Date.now());
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && this.openedAt !== null && this.now() - this.openedAt >= this.resetTimeoutMs) {
      return 'HALF_OPEN';
    }
    return this.state;
  }

  getSnapshot(): CircuitSnapshot {
    return Object.freeze({
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      openedAt: this.openedAt,
    });
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const current = this.getState();
    if (current === 'OPEN') {
      throw new Error(`CircuitBreaker '${this.name}' is OPEN (Fail-Fast active).`);
    }
    if (current === 'HALF_OPEN') {
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = null;
  }

  private onFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = this.now();
    }
  }
}
