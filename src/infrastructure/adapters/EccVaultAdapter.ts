import fs from 'node:fs/promises';
import path from 'node:path';
import type { RawMemoryRecord } from '../../domain/entities/NeuronNode.js';
import type { RawEdgeRecord } from '../../domain/entities/SynapticEdge.js';
import type { MemoryStorePayload, MemoryStorePort } from '../../domain/ports/MemoryStorePort.js';

interface FrontmatterDoc {
  readonly meta: Readonly<Record<string, string | readonly string[]>>;
  readonly body: string;
}

function parseInlineArray(raw: string): readonly string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return [];
  }
  return Object.freeze(
    inner
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter((item) => item.length > 0),
  );
}

export function parseYamlFrontmatter(markdown: string): FrontmatterDoc {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { meta: {}, body: normalized.trim() };
  }
  const closingIdx = normalized.indexOf('\n---\n', 4);
  if (closingIdx === -1) {
    return { meta: {}, body: normalized.trim() };
  }
  const header = normalized.slice(4, closingIdx);
  const body = normalized.slice(closingIdx + 5).trim();
  const meta: Record<string, string | readonly string[]> = {};

  for (const line of header.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();
    if (!key) continue;
    if (rawVal.startsWith('[')) {
      meta[key] = parseInlineArray(rawVal);
    } else {
      meta[key] = rawVal.replace(/^["']|["']$/g, '');
    }
  }
  return { meta: Object.freeze(meta), body };
}

async function collectMarkdownFiles(dirPath: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const collected: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      collected.push(fullPath);
    }
  }
  return collected;
}

function getStringMeta(meta: Readonly<Record<string, string | readonly string[]>>, key: string, fallback: string): string {
  const value = meta[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function getArrayMeta(meta: Readonly<Record<string, string | readonly string[]>>, key: string): readonly string[] {
  const value = meta[key];
  return Array.isArray(value) ? value : [];
}

export class EccVaultAdapter implements MemoryStorePort {
  readonly source = 'ecc-memory-vault' as const;
  private readonly eccHome: string;

  constructor(eccHome: string) {
    this.eccHome = eccHome;
  }

  async load(): Promise<MemoryStorePayload> {
    const files = await collectMarkdownFiles(this.eccHome);
    const nodes: RawMemoryRecord[] = [];
    const edges: RawEdgeRecord[] = [];
    const seenIds = new Set<string>();

    for (const filePath of files) {
      const rawText = await fs.readFile(filePath, 'utf8');
      const { meta, body } = parseYamlFrontmatter(rawText);
      const extId = getStringMeta(meta, 'id', path.basename(filePath, '.md'));
      const nodeId = `ecc:${extId}`;
      if (seenIds.has(nodeId)) continue;
      seenIds.add(nodeId);

      const title = getStringMeta(meta, 'title', extId);
      const kind = getStringMeta(meta, 'kind', 'note');
      const scope = getStringMeta(meta, 'scope', 'user');
      const status = getStringMeta(meta, 'status', 'active');
      const createdAt = getStringMeta(meta, 'created_at', new Date().toISOString());
      const updatedAt = getStringMeta(meta, 'updated_at', createdAt);
      const tags = [...getArrayMeta(meta, 'tags'), `scope:${scope}`];

      nodes.push(
        Object.freeze({
          id: nodeId,
          externalId: extId,
          source: this.source,
          kind,
          title,
          content: body || title,
          confidence: status === 'active' ? 0.9 : 0.5,
          decayScore: 0,
          accessCount: 0,
          tags: Object.freeze(tags),
          createdAt,
          updatedAt,
          scope,
        }),
      );

      for (const linkId of getArrayMeta(meta, 'links')) {
        const targetId = linkId.startsWith('ecc:') ? linkId : `ecc:${linkId}`;
        edges.push(
          Object.freeze({
            id: `ecc-link:${nodeId}->${targetId}`,
            sourceId: nodeId,
            targetId,
            relationType: 'links_to',
            origin: 'ecc-link',
            weight: 0.9,
            createdAt,
          }),
        );
      }
    }

    return Object.freeze({
      source: this.source,
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
    });
  }
}
