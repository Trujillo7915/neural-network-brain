export const DEFAULT_MAX_LOG_BYTES: number;

export function computeBackoffDelayMs(
  consecutiveFailures: number,
  baseMs?: number,
  maxMs?: number,
): number;

export function rotateLogIfNeeded(logFilePath: string, maxBytes?: number): boolean;

export function appendSupervisorLog(logFilePath: string, line: string, maxBytes?: number): void;

export function probeVisualizerHealth(url: string, timeoutMs?: number): Promise<boolean>;
