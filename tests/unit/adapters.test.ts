import { describe, expect, it, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EccVaultAdapter, parseYamlFrontmatter } from '../../src/infrastructure/adapters/EccVaultAdapter.js';
import {
  AgenticMemoryAdapter,
  parseAmemExportJson,
} from '../../src/infrastructure/adapters/AgenticMemoryAdapter.js';
import { parseMem0ExportJson } from '../../src/infrastructure/adapters/Mem0Adapter.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Read-Only Infrastructure Adapters (RF-01, RF-02, RF-03)', () => {
  it('EccVaultAdapter parses UTF-8 YAML frontmatter markdown documents and handles edge cases', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-vault-test-'));
    tempDirs.push(dir);

    const sub = path.join(dir, 'memory', 'facts');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(
      path.join(sub, 'mem_1.md'),
      [
        '---',
        'schema: "ecc.memory.v1"',
        'id: "mem_20261120_abc"',
        'title: "Arquitectura Hexagonal"',
        'kind: "fact"',
        'scope: "user"',
        'status: "active"',
        'tags: ["arquitectura","hexagonal"]',
        'links: ["mem_20261120_def", "ecc:mem_already_prefixed"]',
        'created_at: "2026-11-20T00:00:00.000Z"',
        'updated_at: "2026-11-20T00:05:00.000Z"',
        '---',
        '',
        'Contenido técnico UTF-8 con tildes: diseño limpio.',
      ].join('\n'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(sub, 'plain_note.md'),
      'Nota sin frontmatter para cobertura de fallback.',
      'utf8',
    );
    fs.writeFileSync(
      path.join(sub, 'archived.md'),
      '---\nid: "arch_1"\nstatus: "archived"\ntags: []\n---\n\nMemoria archivada.',
      'utf8',
    );
    fs.writeFileSync(path.join(sub, '.hidden.md'), 'ignored', 'utf8');

    expect(parseYamlFrontmatter('---\nincomplete header').meta).toEqual({});

    const adapter = new EccVaultAdapter(dir);
    const payload = await adapter.load();
    expect(payload.nodes).toHaveLength(3);
    const activeNode = payload.nodes.find((n) => n.id === 'ecc:mem_20261120_abc');
    const archivedNode = payload.nodes.find((n) => n.id === 'ecc:arch_1');
    expect(activeNode?.confidence).toBe(0.9);
    expect(archivedNode?.confidence).toBe(0.5);
    expect(payload.edges).toHaveLength(2);

    const missingAdapter = new EccVaultAdapter(path.join(dir, 'does-not-exist'));
    expect((await missingAdapter.load()).nodes).toHaveLength(0);
  });

  it('parseAmemExportJson converts nodes and edges safely including long content and defaults', async () => {
    const raw = JSON.stringify({
      nodes: [
        {
          id: 0,
          content: 'Core platform uses Hexagonal Architecture with clean domain layer.',
          event_type: 'fact',
          confidence: 1.0,
          decay_score: 0.1,
          access_count: 2,
          created_at: 1795047308007463,
          session_id: 1,
        },
        {
          id: 1,
          content: 'A'.repeat(90),
          created_at: 0,
        },
      ],
      edges: [
        {
          source_id: 0,
          target_id: 1,
          edge_type: 'supports',
          weight: 1.0,
          created_at: 1700000000000,
        },
      ],
    });

    const parsed = parseAmemExportJson(raw);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
    expect(parsed.nodes[1]?.title.endsWith('…')).toBe(true);

    const missingFileAdapter = new AgenticMemoryAdapter({
      cliPath: 'amem',
      filePath: path.join(os.tmpdir(), 'definitely-missing-brain.amem'),
      mem0Home: os.tmpdir(),
      timeoutMs: 2000,
    });
    expect((await missingFileAdapter.load()).nodes).toHaveLength(0);
  });

  it('parseMem0ExportJson normalizes Qdrant/SQLite JSON export with long and short texts', () => {
    const raw = JSON.stringify({
      mode: 'qdrant',
      count: 2,
      results: [
        {
          id: '1ac22293',
          memory: 'Data module completed 100% with 3NF/BCNF normalization.',
          category: 'project_status',
          user_id: 'default',
          created_at: '2026-11-20T00:54:29.028258+00:00',
          updated_at: '2026-11-20T00:54:29.028258+00:00',
        },
        {
          id: 'long-1',
          memory: 'B'.repeat(110),
        },
      ],
    });

    const parsed = parseMem0ExportJson(raw);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.nodes[0]?.id).toBe('mem0:1ac22293');
    expect(parsed.nodes[1]?.kind).toBe('general');
    expect(parsed.nodes[1]?.title.endsWith('…')).toBe(true);
  });
});
