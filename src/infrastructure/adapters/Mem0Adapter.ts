import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { RawMemoryRecord } from '../../domain/entities/NeuronNode.js';
import type { MemoryStorePayload, MemoryStorePort } from '../../domain/ports/MemoryStorePort.js';

const execFileAsync = promisify(execFile);

interface Mem0ExportItem {
  readonly id?: string;
  readonly memory?: string;
  readonly category?: string;
  readonly user_id?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

interface Mem0ExportDocument {
  readonly mode?: string;
  readonly count?: number;
  readonly results?: readonly Mem0ExportItem[];
}

function summarizeTitle(content: string, category: string): string {
  const firstSentence = content.split(/[.:\n]/)[0]?.trim() ?? content.trim();
  if (firstSentence.length >= 6 && firstSentence.length <= 72) {
    return firstSentence;
  }
  const clipped = content.trim().slice(0, 64).trim();
  return clipped.length > 0 ? `${clipped}${content.length > 64 ? '…' : ''}` : `Memoria ${category}`;
}

export function parseMem0ExportJson(rawJson: string): MemoryStorePayload {
  const parsed = JSON.parse(rawJson) as Mem0ExportDocument;
  const items = Array.isArray(parsed.results) ? parsed.results : [];
  const nowIso = new Date().toISOString();

  const nodes: RawMemoryRecord[] = items
    .filter((item) => typeof item.id === 'string' && typeof item.memory === 'string' && item.memory.trim().length > 0)
    .map((item) => {
      const extId = String(item.id);
      const category = String(item.category || 'general').trim();
      const content = String(item.memory).trim();
      const createdAt = item.created_at && item.created_at.length > 0 ? item.created_at : nowIso;
      const updatedAt = item.updated_at && item.updated_at.length > 0 ? item.updated_at : createdAt;

      return Object.freeze({
        id: `mem0:${extId}`,
        externalId: extId,
        source: 'mem0' as const,
        kind: category,
        title: summarizeTitle(content, category),
        content,
        confidence: 0.95,
        decayScore: 0,
        accessCount: 0,
        tags: Object.freeze([category, 'semantic-vector']),
        createdAt,
        updatedAt,
      });
    });

  return Object.freeze({
    source: 'mem0' as const,
    nodes: Object.freeze(nodes),
    edges: Object.freeze([]),
  });
}

export interface Mem0AdapterOptions {
  readonly mem0Home: string;
  readonly collection: string;
  readonly userId: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;
}

export class Mem0Adapter implements MemoryStorePort {
  readonly source = 'mem0' as const;
  private readonly options: Mem0AdapterOptions;

  constructor(options: Mem0AdapterOptions) {
    this.options = options;
  }

  async load(): Promise<MemoryStorePayload> {
    const pythonExecutable = this.resolvePythonExecutable();
    const { stdout } = await execFileAsync(
      pythonExecutable,
      [this.options.scriptPath, this.options.mem0Home, this.options.collection, this.options.userId],
      {
        timeout: this.options.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
    );
    return parseMem0ExportJson(stdout.trim());
  }

  private resolvePythonExecutable(): string {
    const winVenv = path.join(this.options.mem0Home, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(winVenv)) {
      return winVenv;
    }
    const posixVenv = path.join(this.options.mem0Home, '.venv', 'bin', 'python');
    if (fs.existsSync(posixVenv)) {
      return posixVenv;
    }
    return process.platform === 'win32' ? 'python' : 'python3';
  }
}
