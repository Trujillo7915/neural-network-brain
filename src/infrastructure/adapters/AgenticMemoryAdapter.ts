import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { RawMemoryRecord } from '../../domain/entities/NeuronNode.js';
import type { RawEdgeRecord } from '../../domain/entities/SynapticEdge.js';
import type { MemoryStorePayload, MemoryStorePort } from '../../domain/ports/MemoryStorePort.js';

const execFileAsync = promisify(execFile);

interface AmemRawNode {
  readonly id?: number;
  readonly content?: string;
  readonly event_type?: string;
  readonly confidence?: number;
  readonly decay_score?: number;
  readonly access_count?: number;
  readonly created_at?: number;
  readonly session_id?: number;
}

interface AmemRawEdge {
  readonly source_id?: number;
  readonly target_id?: number;
  readonly edge_type?: string;
  readonly weight?: number;
  readonly created_at?: number;
}

interface AmemExportDocument {
  readonly nodes?: readonly AmemRawNode[];
  readonly edges?: readonly AmemRawEdge[];
}

function microsToIso(micros: number | undefined): string {
  if (typeof micros !== 'number' || !Number.isFinite(micros) || micros <= 0) {
    return new Date().toISOString();
  }
  const ms = micros > 1e14 ? Math.floor(micros / 1_000) : micros;
  return new Date(ms).toISOString();
}

function deriveNodeTitle(content: string, eventType: string, id: number): string {
  const firstSegment = content.split(/[:.\n]/)[0]?.trim() ?? '';
  if (firstSegment.length >= 6 && firstSegment.length <= 72) {
    return firstSegment;
  }
  const clipped = content.trim().slice(0, 64).trim();
  return clipped.length > 0 ? `${clipped}${content.length > 64 ? '…' : ''}` : `${eventType} #${id}`;
}

export function parseAmemExportJson(rawJson: string): MemoryStorePayload {
  const parsed = JSON.parse(rawJson) as AmemExportDocument;
  const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
  const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : [];

  const nodes: RawMemoryRecord[] = rawNodes
    .filter((n) => typeof n.id === 'number' && typeof n.content === 'string' && n.content.trim().length > 0)
    .map((n) => {
      const numId = n.id!;
      const kind = String(n.event_type || 'fact').trim();
      const content = n.content!.trim();
      const createdAt = microsToIso(n.created_at);
      const tags = [kind, `session:${n.session_id ?? 0}`];

      return Object.freeze({
        id: `amem:${numId}`,
        externalId: String(numId),
        source: 'agentic-memory' as const,
        kind,
        title: deriveNodeTitle(content, kind, numId),
        content,
        confidence: typeof n.confidence === 'number' ? n.confidence : 1.0,
        decayScore: typeof n.decay_score === 'number' ? n.decay_score : 0.0,
        accessCount: typeof n.access_count === 'number' ? n.access_count : 0,
        tags: Object.freeze(tags),
        createdAt,
        updatedAt: createdAt,
        sessionId: n.session_id,
      });
    });

  const edges: RawEdgeRecord[] = rawEdges
    .filter((e) => typeof e.source_id === 'number' && typeof e.target_id === 'number')
    .map((e) => {
      const relation = String(e.edge_type || 'related_to');
      const sourceId = `amem:${e.source_id}`;
      const targetId = `amem:${e.target_id}`;
      return Object.freeze({
        id: `amem-edge:${sourceId}->${targetId}:${relation}`,
        sourceId,
        targetId,
        relationType: relation,
        origin: 'agentic-memory' as const,
        weight: typeof e.weight === 'number' ? e.weight : 1.0,
        createdAt: microsToIso(e.created_at),
      });
    });

  return Object.freeze({
    source: 'agentic-memory' as const,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}

export interface AgenticMemoryAdapterOptions {
  readonly cliPath: string;
  readonly filePath: string;
  readonly mem0Home: string;
  readonly timeoutMs: number;
}

export class AgenticMemoryAdapter implements MemoryStorePort {
  readonly source = 'agentic-memory' as const;
  private readonly options: AgenticMemoryAdapterOptions;

  constructor(options: AgenticMemoryAdapterOptions) {
    this.options = options;
  }

  async load(): Promise<MemoryStorePayload> {
    if (!fs.existsSync(this.options.filePath)) {
      return Object.freeze({ source: this.source, nodes: Object.freeze([]), edges: Object.freeze([]) });
    }

    const { command, args } = this.resolveCommand();
    const { stdout } = await execFileAsync(command, args, {
      timeout: this.options.timeoutMs,
      maxBuffer: 15 * 1024 * 1024,
      windowsHide: true,
    });

    return parseAmemExportJson(stdout.trim());
  }

  private resolveCommand(): Readonly<{ command: string; args: readonly string[] }> {
    if (process.platform === 'win32') {
      const bridge = path.join(this.options.mem0Home, 'amem_wsl_bridge.py');
      const venvPython = path.join(this.options.mem0Home, '.venv', 'Scripts', 'python.exe');
      if (fs.existsSync(bridge)) {
        const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python';
        return { command: pythonBin, args: [bridge, 'export', this.options.filePath] };
      }
    }
    return { command: this.options.cliPath, args: ['export', this.options.filePath] };
  }
}
