import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NodeNotFoundError, ValidationError } from '../../domain/errors/DomainErrors.js';
import type { RawMemoryRecord } from '../../domain/entities/NeuronNode.js';
import type { RawEdgeRecord } from '../../domain/entities/SynapticEdge.js';
import type { MemoryStorePayload } from '../../domain/ports/MemoryStorePort.js';
import type {
  CreateEdgeInput,
  CreateMemoryInput,
  WritableMemoryStorePort,
} from '../../domain/ports/WritableMemoryStorePort.js';
import { normalizeConfidence } from '../../domain/value-objects/ConfidenceScore.js';

interface StoredNode {
  readonly id: string;
  readonly externalId: string;
  readonly kind: string;
  readonly title: string;
  readonly content: string;
  readonly confidence: number;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt?: string;
}

interface StoredEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly weight: number;
  readonly createdAt: string;
}

interface LocalBrainFile {
  readonly nodes: readonly StoredNode[];
  readonly edges: readonly StoredEdge[];
}

export interface LocalJsonStoreOptions {
  readonly localBrainPath: string;
  readonly starterBrainPath: string;
}

export class LocalJsonStoreAdapter implements WritableMemoryStorePort {
  readonly source = 'local-brain' as const;
  private readonly localBrainPath: string;
  private readonly starterBrainPath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(options: LocalJsonStoreOptions) {
    this.localBrainPath = options.localBrainPath;
    this.starterBrainPath = options.starterBrainPath;
  }

  async load(): Promise<MemoryStorePayload> {
    await this.ensureInitialized();
    const doc = await this.readDocument();

    const nodes: RawMemoryRecord[] = doc.nodes.map((n) =>
      Object.freeze({
        id: n.id,
        externalId: n.externalId,
        source: this.source,
        kind: n.kind,
        title: n.title,
        content: n.content,
        confidence: normalizeConfidence(n.confidence, 0.95),
        decayScore: 0,
        accessCount: 0,
        tags: Object.freeze([...n.tags]),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt ?? n.createdAt,
      }),
    );

    const edges: RawEdgeRecord[] = doc.edges.map((e) =>
      Object.freeze({
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        relationType: e.relationType,
        origin: 'local-brain' as const,
        weight: normalizeConfidence(e.weight, 0.85),
        createdAt: e.createdAt,
      }),
    );

    return Object.freeze({
      source: this.source,
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
    });
  }

  createNeuron(input: CreateMemoryInput): Promise<RawMemoryRecord> {
    return this.enqueueWrite(async () => {
      await this.ensureInitialized();
      const doc = await this.readDocument();
      const nowIso = new Date().toISOString();
      const shortId = crypto.randomUUID().slice(0, 8);
      const id = `local:${shortId}`;

      const storedNode: StoredNode = {
        id,
        externalId: shortId,
        kind: input.kind.trim(),
        title: input.title.trim(),
        content: input.content.trim(),
        confidence: normalizeConfidence(input.confidence, 0.95),
        tags: [...new Set(input.tags.map((t) => t.trim()).filter((t) => t.length > 0))],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const newEdges: StoredEdge[] = [...doc.edges];
      const existingIds = new Set([...doc.nodes.map((n) => n.id), id]);
      for (const link of input.links ?? []) {
        if (link.targetId === id || !existingIds.has(link.targetId)) continue;
        newEdges.push({
          id: `local-edge:${id}->${link.targetId}:${link.relationType}`,
          sourceId: id,
          targetId: link.targetId,
          relationType: link.relationType,
          weight: 0.92,
          createdAt: nowIso,
        });
      }

      await this.writeDocument({
        nodes: [...doc.nodes, storedNode],
        edges: newEdges,
      });

      return Object.freeze({
        id: storedNode.id,
        externalId: storedNode.externalId,
        source: this.source,
        kind: storedNode.kind,
        title: storedNode.title,
        content: storedNode.content,
        confidence: storedNode.confidence,
        decayScore: 0,
        accessCount: 0,
        tags: Object.freeze([...storedNode.tags]),
        createdAt: storedNode.createdAt,
        updatedAt: storedNode.updatedAt ?? storedNode.createdAt,
      });
    });
  }

  createEdge(input: CreateEdgeInput): Promise<RawEdgeRecord> {
    return this.enqueueWrite(async () => {
      if (input.sourceId === input.targetId) {
        throw new ValidationError('Una sinapsis no puede conectar una neurona consigo misma.');
      }
      await this.ensureInitialized();
      const doc = await this.readDocument();
      const nodeIds = new Set(doc.nodes.map((n) => n.id));
      if (!nodeIds.has(input.sourceId)) {
        throw new NodeNotFoundError(input.sourceId);
      }
      if (!nodeIds.has(input.targetId)) {
        throw new NodeNotFoundError(input.targetId);
      }

      const nowIso = new Date().toISOString();
      const relationType = input.relationType.trim() || 'related_to';
      const edge: StoredEdge = {
        id: `local-edge:${input.sourceId}->${input.targetId}:${relationType}`,
        sourceId: input.sourceId,
        targetId: input.targetId,
        relationType,
        weight: normalizeConfidence(input.weight, 0.9),
        createdAt: nowIso,
      };

      const filtered = doc.edges.filter((e) => e.id !== edge.id);
      await this.writeDocument({
        nodes: [...doc.nodes],
        edges: [...filtered, edge],
      });

      return Object.freeze({
        ...edge,
        origin: 'local-brain' as const,
      });
    });
  }

  deleteNeuron(id: string): Promise<boolean> {
    return this.enqueueWrite(async () => {
      await this.ensureInitialized();
      const doc = await this.readDocument();
      const exists = doc.nodes.some((n) => n.id === id);
      if (!exists) {
        return false;
      }

      const nextNodes = doc.nodes.filter((n) => n.id !== id);
      const nextEdges = doc.edges.filter((e) => e.sourceId !== id && e.targetId !== id);
      await this.writeDocument({ nodes: nextNodes, edges: nextEdges });
      return true;
    });
  }

  private enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async ensureInitialized(): Promise<void> {
    try {
      await fs.access(this.localBrainPath);
      return;
    } catch {
      // Seed from starter-brain.json on first run
    }

    await fs.mkdir(path.dirname(this.localBrainPath), { recursive: true });
    let initialContent = JSON.stringify({ nodes: [], edges: [] }, null, 2);
    try {
      initialContent = await fs.readFile(this.starterBrainPath, 'utf8');
    } catch {
      // Fallback to empty brain when starter template is absent
    }
    const tmpPath = `${this.localBrainPath}.init.tmp`;
    await fs.writeFile(tmpPath, initialContent, 'utf8');
    await fs.rename(tmpPath, this.localBrainPath);
  }

  private async readDocument(): Promise<LocalBrainFile> {
    const raw = await fs.readFile(this.localBrainPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LocalBrainFile>;
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  }

  private async writeDocument(doc: LocalBrainFile): Promise<void> {
    await fs.mkdir(path.dirname(this.localBrainPath), { recursive: true });
    const tmpPath = `${this.localBrainPath}.${process.pid}.${Date.now()}.tmp`;
    const serialized = `${JSON.stringify(doc, null, 2)}\n`;
    await fs.writeFile(tmpPath, serialized, 'utf8');
    await fs.rename(tmpPath, this.localBrainPath);
  }
}
