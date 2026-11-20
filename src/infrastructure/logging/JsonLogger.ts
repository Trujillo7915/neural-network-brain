import type { LogLevel, LogMeta, LoggerPort } from '../../domain/ports/LoggerPort.js';

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class JsonLogger implements LoggerPort {
  private readonly minWeight: number;
  private readonly baseMeta: LogMeta;

  constructor(level: LogLevel = 'info', baseMeta: LogMeta = {}) {
    this.minWeight = LEVEL_WEIGHT[level];
    this.baseMeta = Object.freeze({ ...baseMeta });
  }

  child(meta: LogMeta): JsonLogger {
    const level = (Object.entries(LEVEL_WEIGHT).find(([, w]) => w === this.minWeight)?.[0] ?? 'info') as LogLevel;
    return new JsonLogger(level, { ...this.baseMeta, ...meta });
  }

  debug(message: string, meta?: LogMeta): void {
    this.emit('debug', message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.emit('info', message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.emit('warn', message, meta);
  }

  error(message: string, meta?: LogMeta): void {
    this.emit('error', message, meta);
  }

  private emit(level: LogLevel, message: string, meta?: LogMeta): void {
    if (LEVEL_WEIGHT[level] < this.minWeight) {
      return;
    }
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'neural-network-brain',
      message,
      ...this.baseMeta,
      ...(meta ?? {}),
    });
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${payload}\n`);
  }
}
