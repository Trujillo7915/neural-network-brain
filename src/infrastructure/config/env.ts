import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const homeDir = os.homedir();

const BooleanFlagSchema = z
  .union([
    z.boolean(),
    z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1'),
  ])
  .default(false);

const EnvSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(4310),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOCAL_BRAIN_PATH: z.string().min(1).default(path.join('.', 'data', 'local-brain.json')),
  STARTER_BRAIN_PATH: z.string().min(1).default(path.join('.', 'data', 'starter-brain.json')),
  ENABLE_EXTERNAL_STORES: BooleanFlagSchema,
  AMEM_CLI_PATH: z.string().min(1).default('amem'),
  AMEM_FILE_PATH: z.string().min(1).default(path.join(homeDir, '.agentic-brain.amem')),
  MEM0_HOME: z.string().min(1).default(path.join(homeDir, '.mem0')),
  MEM0_USER_ID: z.string().min(1).default('default'),
  MEM0_COLLECTION: z.string().min(1).default('antigravity_memories'),
  ECC_HOME: z.string().min(1).default(path.join(homeDir, '.ecc')),
  CACHE_TTL_MS: z.coerce.number().int().min(0).max(300_000).default(15_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(10).max(10_000).default(180),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(300_000).default(60_000),
  STORE_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(8_000),
  CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(20).default(3),
  CIRCUIT_RESET_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
});

export type AppConfig = Readonly<z.infer<typeof EnvSchema>>;

export function loadAppConfig(rawEnv: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration (Fail-Fast): ${issues}`);
  }
  return Object.freeze(parsed.data);
}
