import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendSupervisorLog,
  computeBackoffDelayMs,
  probeVisualizerHealth,
} from './supervisor-core.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '4310';
const healthUrl = `http://${host}:${port}/api/v1/health?mode=liveness`;
const mainEntry = path.join(projectRoot, 'dist', 'server', 'presentation', 'main.js');
const logsDir = path.join(projectRoot, 'logs');
const logFile = path.join(logsDir, 'neural-brain-24x7.log');
const pidFile = path.join(logsDir, 'supervisor.pid');

const HEALTH_INTERVAL_MS = 30_000;
const MAX_CONSECUTIVE_UNHEALTHY = 2;

let child = null;
let shuttingDown = false;
let consecutiveFailures = 0;
let consecutiveUnhealthy = 0;
let lastStartedAt = 0;

function writePidFile() {
  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(pidFile, JSON.stringify({
    supervisorPid: process.pid,
    childPid: child?.pid ?? null,
    url: `http://${host}:${port}`,
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8');
}

function removePidFile() {
  try {
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch {
    // ignore cleanup error
  }
}

function startChild() {
  if (shuttingDown) return;
  if (!fs.existsSync(mainEntry)) {
    appendSupervisorLog(logFile, `ERROR: No existe ${mainEntry}. Ejecuta 'npm run build'.`);
    scheduleRestart();
    return;
  }

  lastStartedAt = Date.now();
  child = spawn(process.execPath, [mainEntry], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      HOST: host,
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false,
  });

  writePidFile();
  appendSupervisorLog(logFile, `Supervisor PID=${process.pid} inició servidor PID=${child.pid} en http://${host}:${port}`);

  child.stdout?.on('data', (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) appendSupervisorLog(logFile, `[SERVER] ${line}`);
    }
  });

  child.stderr?.on('data', (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) appendSupervisorLog(logFile, `[SERVER:ERR] ${line}`);
    }
  });

  child.on('exit', (code, signal) => {
    appendSupervisorLog(logFile, `Servidor PID=${child?.pid ?? '?'} finalizó (code=${code}, signal=${signal}).`);
    child = null;
    if (!shuttingDown) {
      // Reset failure counter if server stayed healthy for > 60s
      if (Date.now() - lastStartedAt > 60_000) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures += 1;
      }
      scheduleRestart();
    }
  });
}

function scheduleRestart() {
  if (shuttingDown) return;
  const delayMs = computeBackoffDelayMs(consecutiveFailures);
  appendSupervisorLog(logFile, `Reinicio automático programado en ${delayMs} ms (intento=${consecutiveFailures + 1}).`);
  setTimeout(() => {
    if (!shuttingDown && !child) {
      startChild();
    }
  }, delayMs);
}

async function runHealthWatch() {
  if (shuttingDown || !child) return;
  const healthy = await probeVisualizerHealth(healthUrl, 4_000);
  if (healthy) {
    consecutiveUnhealthy = 0;
    return;
  }
  consecutiveUnhealthy += 1;
  appendSupervisorLog(logFile, `WARN: Health probe falló (${consecutiveUnhealthy}/${MAX_CONSECUTIVE_UNHEALTHY}) en ${healthUrl}`);
  if (consecutiveUnhealthy >= MAX_CONSECUTIVE_UNHEALTHY && child) {
    appendSupervisorLog(logFile, `WARN: Reiniciando servidor bloqueado PID=${child.pid}`);
    consecutiveUnhealthy = 0;
    child.kill('SIGTERM');
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  appendSupervisorLog(logFile, `Deteniendo supervisor 24/7 por señal ${signal}...`);
  if (child) {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child) child.kill('SIGKILL');
      removePidFile();
      process.exit(0);
    }, 3_000).unref();
  } else {
    removePidFile();
    process.exit(0);
  }
}

async function main() {
  const alreadyHealthy = await probeVisualizerHealth(healthUrl, 1_500);
  if (alreadyHealthy) {
    appendSupervisorLog(logFile, `Instancia ya activa y saludable en ${healthUrl}. Supervisor auxiliar finaliza limpiamente.`);
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  startChild();
  setInterval(() => {
    void runHealthWatch();
  }, HEALTH_INTERVAL_MS).unref();
}

void main();
