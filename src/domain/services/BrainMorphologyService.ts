import type { BrainSnapshot, LobeStat, SourceStat, StoreHealthReport } from '../entities/BrainSnapshot.js';
import { ALL_MEMORY_SOURCES, type NeuronNode, type RawMemoryRecord } from '../entities/NeuronNode.js';
import type { RawEdgeRecord, SynapticEdge } from '../entities/SynapticEdge.js';
import { ALL_LOBE_CODES, BRAIN_LOBES, type BrainLobeCode } from '../value-objects/BrainLobe.js';
import { normalizeConfidence } from '../value-objects/ConfidenceScore.js';
import { resolveGrowthStage } from '../value-objects/GrowthStage.js';
import { createPoint3D, type Hemisphere, type Point3D } from '../value-objects/Point3D.js';
import { extractLocations } from './LocationExtractor.js';

const FRONTAL_KEYWORDS = ['decision', 'rule', 'regla', 'preference', 'preferencia', 'governance', 'pendiente', 'prioridad'];
const TEMPORAL_KEYWORDS = ['identity', 'identidad', 'team', 'equipo', 'project', 'proyecto', 'context', 'sena', 'usuario'];
const OCCIPITAL_KEYWORDS = ['methodology', 'metodologia', 'runbook', 'handoff', 'standard', 'estandar', 'sdd', 'ciclo'];
const CEREBELLUM_KEYWORDS = ['environment', 'entorno', 'ollama', 'mysql', 'puerto', 'port', 'skill', 'docker', 'cli'];
const LIMBIC_KEYWORDS = ['episode', 'episodio', 'milestone', 'hito'];

function fnv1aHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ (salt * 0x9e3779b1), 0x85ebca6b) >>> 0;
  return (mixed % 100000) / 100000;
}

function matchesAny(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

export function classifyBrainLobe(record: RawMemoryRecord, degree = 0): BrainLobeCode {
  const normalizedKind = record.kind.toLowerCase();
  const signalText = `${normalizedKind} ${record.tags.join(' ')} ${record.title}`.toLowerCase();

  if (matchesAny(normalizedKind, LIMBIC_KEYWORDS) || degree >= 10) {
    return 'limbic';
  }
  if (matchesAny(signalText, FRONTAL_KEYWORDS)) {
    return 'frontal';
  }
  if (matchesAny(signalText, CEREBELLUM_KEYWORDS)) {
    return 'cerebellum';
  }
  if (matchesAny(signalText, OCCIPITAL_KEYWORDS)) {
    return 'occipital';
  }
  if (matchesAny(signalText, TEMPORAL_KEYWORDS)) {
    return 'temporal';
  }
  return 'parietal';
}

export function computeAnatomicalPosition(
  id: string,
  lobe: BrainLobeCode,
  stageScale: number,
): Readonly<{ position: Point3D; hemisphere: Hemisphere }> {
  const seed = fnv1aHash(id);
  const meta = BRAIN_LOBES[lobe];
  const hemisphere: Hemisphere = (seed & 1) === 0 ? 'left' : 'right';
  const sideSign = hemisphere === 'left' ? -1 : 1;

  // Spherical coordinates distributed smoothly inside each lobe volume
  const theta = seededUnit(seed, 1) * Math.PI * 2;
  const u = seededUnit(seed, 2) * 2 - 1;
  const radiusFactor = 0.35 + Math.cbrt(seededUnit(seed, 3)) * 0.62;
  const sinPhi = Math.sqrt(Math.max(0, 1 - u * u));

  const localX = sinPhi * Math.cos(theta) * meta.anchor.rx * radiusFactor;
  const localY = u * meta.anchor.ry * radiusFactor;
  const localZ = sinPhi * Math.sin(theta) * meta.anchor.rz * radiusFactor;

  const minMedialGap = lobe === 'limbic' ? 0.16 : 0.28;
  const rawX = sideSign * (meta.anchor.xOffset + Math.abs(localX) * 0.65);
  const clampedX = Math.abs(rawX) < minMedialGap ? sideSign * minMedialGap : rawX;
  const rawY = meta.anchor.yOffset + localY;
  const rawZ = meta.anchor.zOffset + localZ;

  return Object.freeze({
    hemisphere,
    position: createPoint3D(clampedX * stageScale, rawY * stageScale, rawZ * stageScale),
  });
}

function computeDegrees(edges: readonly RawEdgeRecord[]): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const edge of edges) {
    map.set(edge.sourceId, (map.get(edge.sourceId) ?? 0) + 1);
    map.set(edge.targetId, (map.get(edge.targetId) ?? 0) + 1);
  }
  return map;
}

function buildLobeStats(nodes: readonly NeuronNode[]): readonly LobeStat[] {
  const counts = new Map<BrainLobeCode, number>();
  for (const node of nodes) {
    counts.set(node.lobe, (counts.get(node.lobe) ?? 0) + 1);
  }
  const total = Math.max(1, nodes.length);
  return Object.freeze(
    ALL_LOBE_CODES.map((code) => {
      const meta = BRAIN_LOBES[code];
      const count = counts.get(code) ?? 0;
      return Object.freeze({
        lobe: code,
        displayName: meta.displayName,
        functionalRole: meta.functionalRole,
        accentHex: meta.accentHex,
        count,
        ratio: Number((count / total).toFixed(3)),
      });
    }),
  );
}

function buildSourceStats(nodes: readonly NeuronNode[]): readonly SourceStat[] {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    counts.set(node.source, (counts.get(node.source) ?? 0) + 1);
  }
  const total = Math.max(1, nodes.length);
  return Object.freeze(
    ALL_MEMORY_SOURCES.map((source) => {
      const count = counts.get(source) ?? 0;
      return Object.freeze({
        source,
        count,
        ratio: Number((count / total).toFixed(3)),
      });
    }),
  );
}

export interface BuildSnapshotInput {
  readonly mode: 'live' | 'simulation';
  readonly rawNodes: readonly RawMemoryRecord[];
  readonly rawEdges: readonly RawEdgeRecord[];
  readonly storeHealth: readonly StoreHealthReport[];
  readonly generatedAt?: string;
  readonly revisionToken?: string;
}

export function buildBrainSnapshot(input: BuildSnapshotInput): BrainSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const nodeIdSet = new Set(input.rawNodes.map((n) => n.id));
  const validEdges: SynapticEdge[] = input.rawEdges
    .filter((e) => e.sourceId !== e.targetId && nodeIdSet.has(e.sourceId) && nodeIdSet.has(e.targetId))
    .map((e) => Object.freeze({ ...e, weight: normalizeConfidence(e.weight, 0.5) }));

  const degrees = computeDegrees(validEdges);
  const growthStage = resolveGrowthStage(input.rawNodes.length);

  const nodes: NeuronNode[] = input.rawNodes.map((raw) => {
    const degree = degrees.get(raw.id) ?? 0;
    const lobe = classifyBrainLobe(raw, degree);
    const { position, hemisphere } = computeAnatomicalPosition(raw.id, lobe, growthStage.cortexScale);
    const locations = extractLocations(`${raw.title} ${raw.content}`);
    return Object.freeze({
      ...raw,
      confidence: normalizeConfidence(raw.confidence, 0.9),
      decayScore: normalizeConfidence(raw.decayScore, 0),
      lobe,
      hemisphere,
      position,
      degree,
      isSimulated: input.mode === 'simulation' || raw.id.startsWith('sim:'),
      tags: Object.freeze([...raw.tags]),
      locations,
    });
  });

  const totalNeurons = nodes.length;
  const totalEdges = validEdges.length;
  const avgDegree = totalNeurons === 0 ? 0 : Number(((totalEdges * 2) / totalNeurons).toFixed(2));
  const avgConfidence =
    totalNeurons === 0
      ? 0
      : Number((nodes.reduce((sum, n) => sum + n.confidence, 0) / totalNeurons).toFixed(3));
  const cortexDensity = Number(Math.min(1, totalNeurons / 220).toFixed(3));
  const semanticEdgeCount = validEdges.filter((e) => e.origin === 'semantic-inferred').length;
  const hasErrors = input.storeHealth.some((s) => s.status === 'error' || s.status === 'degraded');

  return Object.freeze({
    snapshotId: `snap-${Date.now().toString(36)}-${totalNeurons}`,
    revisionToken: input.revisionToken ?? `rev-${totalNeurons}-${totalEdges}`,
    mode: input.mode,
    overallStatus: hasErrors ? 'degraded' : 'ok',
    generatedAt,
    growthStage,
    morphology: Object.freeze({
      totalNeurons,
      totalEdges,
      avgDegree,
      avgConfidence,
      cortexDensity,
      explicitEdgeCount: totalEdges - semanticEdgeCount,
      semanticEdgeCount,
    }),
    nodes: Object.freeze(nodes),
    edges: Object.freeze(validEdges),
    lobeStats: buildLobeStats(nodes),
    sourceStats: buildSourceStats(nodes),
    storeHealth: Object.freeze([...input.storeHealth]),
  });
}
