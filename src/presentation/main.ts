import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MemoryStorePort } from '../domain/ports/MemoryStorePort.js';
import { AgenticMemoryAdapter } from '../infrastructure/adapters/AgenticMemoryAdapter.js';
import { EccVaultAdapter } from '../infrastructure/adapters/EccVaultAdapter.js';
import { LocalJsonStoreAdapter } from '../infrastructure/adapters/LocalJsonStoreAdapter.js';
import { Mem0Adapter } from '../infrastructure/adapters/Mem0Adapter.js';
import { StoreVersionMonitor } from '../infrastructure/adapters/StoreVersionMonitor.js';
import { loadAppConfig } from '../infrastructure/config/env.js';
import { JsonLogger } from '../infrastructure/logging/JsonLogger.js';
import { createAppServer } from './server.js';

function resolveProjectRoot(startDir: string): string {
  let cursor = startDir;
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(cursor, 'package.json'))) {
      return cursor;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return path.resolve(startDir, '..', '..');
}

function resolvePathFromRoot(projectRoot: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(projectRoot, targetPath);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = resolveProjectRoot(__dirname);

const config = loadAppConfig();
const logger = new JsonLogger(config.LOG_LEVEL);

const localBrainPath = resolvePathFromRoot(projectRoot, config.LOCAL_BRAIN_PATH);
const starterBrainPath = resolvePathFromRoot(projectRoot, config.STARTER_BRAIN_PATH);

const localStore = new LocalJsonStoreAdapter({
  localBrainPath,
  starterBrainPath,
});

const stores: MemoryStorePort[] = [localStore];
if (config.ENABLE_EXTERNAL_STORES) {
  stores.push(
    new AgenticMemoryAdapter({
      cliPath: config.AMEM_CLI_PATH,
      filePath: config.AMEM_FILE_PATH,
      mem0Home: config.MEM0_HOME,
      timeoutMs: config.STORE_TIMEOUT_MS,
    }),
    new Mem0Adapter({
      mem0Home: config.MEM0_HOME,
      collection: config.MEM0_COLLECTION,
      userId: config.MEM0_USER_ID,
      scriptPath: path.join(projectRoot, 'scripts', 'read_mem0_readonly.py'),
      timeoutMs: config.STORE_TIMEOUT_MS,
    }),
    new EccVaultAdapter(config.ECC_HOME),
  );
}

const versionMonitor = new StoreVersionMonitor({
  localBrainPath,
  amemFilePath: config.AMEM_FILE_PATH,
  mem0Home: config.MEM0_HOME,
  eccHome: config.ECC_HOME,
  enableExternalStores: config.ENABLE_EXTERNAL_STORES,
});

const staticWebDir = path.join(projectRoot, 'dist', 'web');
const { server } = createAppServer({
  stores,
  writableStore: localStore,
  logger,
  cacheTtlMs: config.CACHE_TTL_MS,
  rateLimitMaxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  rateLimitWindowMs: config.RATE_LIMIT_WINDOW_MS,
  versionProvider: () => versionMonitor.getRevisionToken(),
  circuitFailureThreshold: config.CIRCUIT_FAILURE_THRESHOLD,
  circuitResetMs: config.CIRCUIT_RESET_MS,
  staticWebDir,
  nodeEnv: config.NODE_ENV,
});

server.listen(config.PORT, config.HOST, () => {
  logger.info('Neural Network Brain listening (End-User Plug & Play edition)', {
    url: `http://${config.HOST}:${config.PORT}`,
    nodeEnv: config.NODE_ENV,
    stores: stores.map((s) => s.source),
    externalStoresEnabled: config.ENABLE_EXTERNAL_STORES,
  });
});

function shutdown(signal: string): void {
  logger.info('Graceful shutdown initiated', { signal });
  server.close(() => {
    logger.info('Server closed cleanly');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
