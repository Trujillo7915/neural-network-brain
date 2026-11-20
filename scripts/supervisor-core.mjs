import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_MAX_LOG_BYTES = 2 * 1024 * 1024;

export function computeBackoffDelayMs(consecutiveFailures, baseMs = 2_000, maxMs = 30_000) {
  const safeFailures = Math.max(0, Math.floor(consecutiveFailures));
  const raw = baseMs * Math.pow(2, Math.min(safeFailures, 10));
  return Math.min(maxMs, raw);
}

export function rotateLogIfNeeded(logFilePath, maxBytes = DEFAULT_MAX_LOG_BYTES) {
  try {
    if (!fs.existsSync(logFilePath)) {
      return false;
    }
    const stat = fs.statSync(logFilePath);
    if (stat.size < maxBytes) {
      return false;
    }
    const backupPath = `${logFilePath}.1`;
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    fs.renameSync(logFilePath, backupPath);
    return true;
  } catch {
    return false;
  }
}

export function appendSupervisorLog(logFilePath, line, maxBytes = DEFAULT_MAX_LOG_BYTES) {
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  rotateLogIfNeeded(logFilePath, maxBytes);
  const stamp = new Date().toISOString();
  fs.appendFileSync(logFilePath, `[${stamp}] ${line.trimEnd()}\n`, 'utf8');
}

export async function probeVisualizerHealth(url, timeoutMs = 2_500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.service === 'neural-network-brain');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
