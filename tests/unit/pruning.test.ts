import { describe, expect, it } from 'vitest';
import type { RawMemoryRecord } from '../../src/domain/entities/NeuronNode.js';
import { MemoryPruningService } from '../../src/domain/services/MemoryPruningService.js';

function makeRecord(overrides: Partial<RawMemoryRecord>): RawMemoryRecord {
  return {
    id: 'local:test-1',
    source: 'local-brain',
    title: 'Sample memory',
    content: 'Default content for testing memory pruning behavior.',
    kind: 'fact',
    confidence: 0.9,
    tags: [],
    createdAt: '2026-11-20T12:00:00.000Z',
    ...overrides,
  };
}

describe('MemoryPruningService (v1.1.0 Intelligent Pruning)', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');

  it('prunes ephemeral tagged records older than TTL while keeping recent ones', () => {
    const records: RawMemoryRecord[] = [
      makeRecord({
        id: 'local:old-plan',
        title: 'Daily plan Nov 10',
        content: 'Temporary daily checklist for sprint demo.',
        kind: 'context',
        tags: ['ephemeral', 'daily'],
        createdAt: '2026-11-10T10:00:00.000Z',
      }),
      makeRecord({
        id: 'local:fresh-plan',
        title: 'Daily plan Nov 19',
        content: 'Temporary daily checklist for tomorrow.',
        kind: 'context',
        tags: ['ephemeral'],
        createdAt: '2026-11-19T10:00:00.000Z',
      }),
    ];

    const plan = MemoryPruningService.findCandidates(records, { ephemeralTtlDays: 3, now });
    expect(plan.scanned).toBe(2);
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0]?.id).toBe('local:old-plan');
    expect(plan.candidates[0]?.reason).toBe('ephemeral_tag:ephemeral');
  });

  it('never prunes protected core kinds as ephemeral even when old', () => {
    const records: RawMemoryRecord[] = [
      makeRecord({
        id: 'local:core-identity',
        title: 'Core Identity',
        content: 'Long term system identity record.',
        kind: 'identity',
        tags: ['ephemeral'],
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    ];

    const plan = MemoryPruningService.findCandidates(records, { ephemeralTtlDays: 1, now });
    expect(plan.candidates).toHaveLength(0);
  });

  it('detects duplicate records and preserves only the newest version', () => {
    const records: RawMemoryRecord[] = [
      makeRecord({
        id: 'local:status-old',
        title: 'Project resi-complex status',
        content: 'Repository status for resi-complex microservices gateway and iam service deployment.',
        kind: 'projects',
        createdAt: '2026-11-18T10:00:00.000Z',
      }),
      makeRecord({
        id: 'local:status-new',
        title: 'Project resi-complex status updated',
        content: 'Repository status for resi-complex microservices gateway and iam service deployment ready.',
        kind: 'projects',
        createdAt: '2026-11-20T10:00:00.000Z',
      }),
    ];

    const plan = MemoryPruningService.findCandidates(records, { now });
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0]?.id).toBe('local:status-old');
    expect(plan.candidates[0]?.reason).toBe('duplicate_of:local:status-new');
    expect(plan.candidates[0]?.similarity).toBeGreaterThanOrEqual(0.55);
  });
});
