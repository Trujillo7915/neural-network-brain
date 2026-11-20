import type { RawMemoryRecord } from '../entities/NeuronNode.js';
import type { RawEdgeRecord } from '../entities/SynapticEdge.js';

const STOPWORDS = new Set([
  'para', 'como', 'con', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'por', 'que',
  'este', 'esta', 'estos', 'estas', 'pero', 'mas', 'sin', 'sobre', 'entre', 'desde', 'hasta',
  'todo', 'toda', 'todos', 'todas', 'donde', 'cuando', 'solo', 'cada', 'debe', 'usa', 'usar',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'have', 'into', 'not',
  'has', 'all', 'its', 'via', 'per', 'use', 'using',
]);

const SIMILARITY_THRESHOLD = 0.24;
const MAX_SEMANTIC_OUT_DEGREE = 4;

export function tokenizeSpanishEnglish(text: string): ReadonlySet<string> {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, ' ');

  const tokens = new Set<string>();
  for (const raw of normalized.split(' ')) {
    const clean = raw.replace(/^[-_]+|[-_]+$/g, '');
    if (clean.length >= 3 && !STOPWORDS.has(clean)) {
      tokens.add(clean);
    }
  }
  return tokens;
}

function jaccardWithTagBoost(
  tokensA: ReadonlySet<string>,
  tokensB: ReadonlySet<string>,
  tagsA: ReadonlySet<string>,
  tagsB: ReadonlySet<string>,
): number {
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }
  let sharedTokens = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      sharedTokens += 1;
    }
  }
  const unionSize = tokensA.size + tokensB.size - sharedTokens;
  const baseJaccard = unionSize === 0 ? 0 : sharedTokens / unionSize;

  let sharedTags = 0;
  for (const tag of tagsA) {
    if (tagsB.has(tag)) {
      sharedTags += 1;
    }
  }
  const tagBoost = sharedTags > 0 ? Math.min(0.25, sharedTags * 0.12) : 0;
  return Math.min(1, Number((baseJaccard + tagBoost).toFixed(3)));
}

function edgePairKey(a: string, b: string): string {
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}

export function computeSemanticLinks(
  nodes: readonly RawMemoryRecord[],
  existingEdges: readonly RawEdgeRecord[],
): readonly RawEdgeRecord[] {
  const existingPairs = new Set(existingEdges.map((e) => edgePairKey(e.sourceId, e.targetId)));
  const tokenIndex = nodes.map((node) => ({
    node,
    tokens: tokenizeSpanishEnglish(`${node.title} ${node.content} ${node.tags.join(' ')}`),
    tags: new Set(node.tags.map((t) => t.toLowerCase())),
  }));

  const inferred: RawEdgeRecord[] = [];
  const emittedPairs = new Set<string>(existingPairs);
  const nowIso = new Date().toISOString();

  for (let i = 0; i < tokenIndex.length; i += 1) {
    const current = tokenIndex[i]!;
    const candidates: Array<{ targetId: string; weight: number }> = [];

    for (let j = i + 1; j < tokenIndex.length; j += 1) {
      const other = tokenIndex[j]!;
      const pairKey = edgePairKey(current.node.id, other.node.id);
      if (emittedPairs.has(pairKey)) {
        continue;
      }
      const weight = jaccardWithTagBoost(current.tokens, other.tokens, current.tags, other.tags);
      if (weight >= SIMILARITY_THRESHOLD) {
        candidates.push({ targetId: other.node.id, weight });
      }
    }

    candidates
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_SEMANTIC_OUT_DEGREE)
      .forEach((cand) => {
        const pairKey = edgePairKey(current.node.id, cand.targetId);
        if (emittedPairs.has(pairKey)) return;
        emittedPairs.add(pairKey);
        inferred.push(
          Object.freeze({
            id: `sem:${current.node.id}->${cand.targetId}`,
            sourceId: current.node.id,
            targetId: cand.targetId,
            relationType: 'semantic_link',
            origin: 'semantic-inferred',
            weight: cand.weight,
            createdAt: nowIso,
          }),
        );
      });
  }

  return Object.freeze(inferred);
}
