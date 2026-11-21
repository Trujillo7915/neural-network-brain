import type { RawMemoryRecord } from '../entities/NeuronNode.js';

export interface PrunePolicy {
  readonly ephemeralTtlDays: number;
  readonly sameKindThreshold: number;
  readonly crossKindThreshold: number;
  readonly now?: Date;
}

export interface PruneCandidate {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
  readonly reason: string;
  readonly similarity?: number;
}

export interface PrunePlan {
  readonly scanned: number;
  readonly candidates: readonly PruneCandidate[];
}

export const DEFAULT_PRUNE_POLICY: PrunePolicy = {
  ephemeralTtlDays: 3,
  sameKindThreshold: 0.55,
  crossKindThreshold: 0.78,
};

const PROTECTED_KINDS = new Set<string>([
  'identity',
  'rules',
  'methodology',
  'environment',
  'team',
  'project_architecture',
  'runbook',
  'preference',
  'preferences',
]);

const EPHEMERAL_KINDS = new Set<string>(['plans', 'plan', 'temp', 'ephemeral', 'daily', 'scratch']);

const EPHEMERAL_TAGS = new Set<string>(['ephemeral', 'temp', 'daily', 'post-mortem']);

const STOPWORDS = new Set<string>([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'se', 'por', 'un',
  'una', 'para', 'con', 'su', 'al', 'lo', 'como', 'mas', 'o', 'pero', 'sus',
  'le', 'ya', 'the', 'and', 'of', 'to', 'in', 'is', 'for', 'on', 'with',
]);

function tokenize(text: string): ReadonlySet<string> {
  const matches = text.toLowerCase().match(/[a-z0-9áéíóúñ]+/g) ?? [];
  const tokens = new Set<string>();
  for (const token of matches) {
    if (token.length > 2 && !STOPWORDS.has(token)) {
      tokens.add(token);
    }
  }
  return tokens;
}

function jaccardSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function parseTimestamp(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isEphemeralRecord(record: RawMemoryRecord, cutoffMs: number): string | null {
  const kind = record.kind.toLowerCase();
  if (PROTECTED_KINDS.has(kind)) return null;

  const ts = parseTimestamp(record.createdAt);
  if (ts === 0 || ts > cutoffMs) return null;

  if (EPHEMERAL_KINDS.has(kind)) {
    return `ephemeral_kind:${kind}`;
  }

  const ephemeralTag = record.tags.find((t) => {
    const normalized = t.toLowerCase();
    return EPHEMERAL_TAGS.has(normalized) || normalized.startsWith('plan-');
  });
  if (ephemeralTag) {
    return `ephemeral_tag:${ephemeralTag.toLowerCase()}`;
  }

  return null;
}

export class MemoryPruningService {
  static findCandidates(
    records: readonly RawMemoryRecord[],
    policyInput: Partial<PrunePolicy> = {},
  ): PrunePlan {
    const policy: PrunePolicy = { ...DEFAULT_PRUNE_POLICY, ...policyInput };
    const nowMs = (policy.now ?? new Date()).getTime();
    const cutoffMs = nowMs - policy.ephemeralTtlDays * 24 * 60 * 60 * 1000;

    // Sort newest first so we always preserve the most recent version
    const ordered = [...records].sort(
      (a, b) => parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt),
    );

    const candidates: PruneCandidate[] = [];
    const kept: Array<{ readonly record: RawMemoryRecord; readonly tokens: ReadonlySet<string> }> = [];

    for (const record of ordered) {
      const ephemeralReason = isEphemeralRecord(record, cutoffMs);
      if (ephemeralReason) {
        candidates.push({
          id: record.id,
          title: record.title,
          kind: record.kind,
          reason: ephemeralReason,
        });
        continue;
      }

      const tokens = tokenize(`${record.title} ${record.content}`);
      let duplicateMatch: { readonly id: string; readonly similarity: number } | null = null;

      for (const entry of kept) {
        const sim = jaccardSimilarity(tokens, entry.tokens);
        const threshold =
          record.kind.toLowerCase() === entry.record.kind.toLowerCase()
            ? policy.sameKindThreshold
            : policy.crossKindThreshold;
        if (sim >= threshold) {
          duplicateMatch = { id: entry.record.id, similarity: Number(sim.toFixed(2)) };
          break;
        }
      }

      if (duplicateMatch) {
        candidates.push({
          id: record.id,
          title: record.title,
          kind: record.kind,
          reason: `duplicate_of:${duplicateMatch.id}`,
          similarity: duplicateMatch.similarity,
        });
      } else {
        kept.push({ record, tokens });
      }
    }

    return {
      scanned: records.length,
      candidates,
    };
  }
}
