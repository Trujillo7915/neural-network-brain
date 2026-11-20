export interface RetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly jitterRatio?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const jitterRatio = options.jitterRatio ?? 0.25;
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= options.maxRetries) {
        break;
      }
      const exponential = options.baseDelayMs * Math.pow(2, attempt);
      const jitter = exponential * jitterRatio * Math.random();
      await sleep(Math.round(exponential + jitter));
    }
  }

  throw lastError;
}
