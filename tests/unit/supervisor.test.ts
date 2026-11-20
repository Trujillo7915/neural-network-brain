import { describe, expect, it, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendSupervisorLog,
  computeBackoffDelayMs,
  probeVisualizerHealth,
  rotateLogIfNeeded,
} from '../../scripts/supervisor-core.mjs';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('24/7 Service Supervisor Core (RNF-04 / Operación Continua)', () => {
  it('computes bounded exponential backoff delays cleanly', () => {
    expect(computeBackoffDelayMs(0, 2000, 30000)).toBe(2000);
    expect(computeBackoffDelayMs(1, 2000, 30000)).toBe(4000);
    expect(computeBackoffDelayMs(3, 2000, 30000)).toBe(16000);
    expect(computeBackoffDelayMs(8, 2000, 30000)).toBe(30000);
    expect(computeBackoffDelayMs(-2, 2000, 30000)).toBe(2000);
  });

  it('appends timestamped logs and rotates bounded log files automatically', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'supervisor-log-'));
    tempDirs.push(dir);
    const logPath = path.join(dir, 'service.log');

    appendSupervisorLog(logPath, 'line-one', 50);
    expect(fs.existsSync(logPath)).toBe(true);
    expect(rotateLogIfNeeded(logPath, 5000)).toBe(false);

    // Exceed maxBytes threshold to force rotation
    appendSupervisorLog(logPath, 'X'.repeat(80), 50);
    appendSupervisorLog(logPath, 'after-rotation', 50);

    expect(fs.existsSync(`${logPath}.1`)).toBe(true);
    const currentText = fs.readFileSync(logPath, 'utf8');
    expect(currentText).toContain('after-rotation');
  });

  it('probeVisualizerHealth returns false gracefully when target port is closed', async () => {
    const alive = await probeVisualizerHealth('http://127.0.0.1:59999/api/v1/health', 300);
    expect(alive).toBe(false);
  });
});
