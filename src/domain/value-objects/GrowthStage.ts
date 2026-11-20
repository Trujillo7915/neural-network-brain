export type GrowthStageCode = 'embryonic' | 'developing' | 'mature' | 'neocortex';

export interface GrowthStageDescriptor {
  readonly code: GrowthStageCode;
  readonly label: string;
  readonly description: string;
  readonly minNodes: number;
  readonly maxNodes: number | null;
  readonly cortexScale: number;
  readonly sulciDepth: number;
  readonly cortexOpacity: number;
  readonly wireframeOpacity: number;
  readonly pulseSpeed: number;
  readonly progressToNext: number;
}

const STAGE_DEFINITIONS: readonly Omit<GrowthStageDescriptor, 'progressToNext'>[] = Object.freeze([
  {
    code: 'embryonic',
    label: 'Corteza Embrionaria',
    description: 'Silueta cerebral naciente con núcleos primarios y primeras sinapsis activas.',
    minNodes: 0,
    maxNodes: 19,
    cortexScale: 0.78,
    sulciDepth: 0.25,
    cortexOpacity: 0.14,
    wireframeOpacity: 0.18,
    pulseSpeed: 0.65,
  },
  {
    code: 'developing',
    label: 'Corteza en Desarrollo',
    description: 'Hemisferios definidos con pliegues corticales emergentes y lóbulos especializados.',
    minNodes: 20,
    maxNodes: 59,
    cortexScale: 0.92,
    sulciDepth: 0.55,
    cortexOpacity: 0.22,
    wireframeOpacity: 0.24,
    pulseSpeed: 0.95,
  },
  {
    code: 'mature',
    label: 'Corteza Madura',
    description: 'Surcos profundos, tractos comisurales densos y clústeres funcionales consolidados.',
    minNodes: 60,
    maxNodes: 179,
    cortexScale: 1.0,
    sulciDepth: 0.82,
    cortexOpacity: 0.3,
    wireframeOpacity: 0.3,
    pulseSpeed: 1.25,
  },
  {
    code: 'neocortex',
    label: 'Neocorteza Hiperconectada',
    description: 'Red cortical de alta complejidad con cascadas sinápticas multi-lóbulo.',
    minNodes: 180,
    maxNodes: null,
    cortexScale: 1.08,
    sulciDepth: 1.0,
    cortexOpacity: 0.38,
    wireframeOpacity: 0.36,
    pulseSpeed: 1.55,
  },
]);

export function resolveGrowthStage(nodeCount: number): GrowthStageDescriptor {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(nodeCount) ? nodeCount : 0));

  for (const def of STAGE_DEFINITIONS) {
    if (def.maxNodes === null || safeCount <= def.maxNodes) {
      const span = def.maxNodes === null ? 320 : def.maxNodes - def.minNodes + 1;
      const rawProgress = (safeCount - def.minNodes) / Math.max(1, span);
      const progressToNext = Math.min(1, Math.max(0, Number(rawProgress.toFixed(3))));
      return Object.freeze({ ...def, progressToNext });
    }
  }

  const last = STAGE_DEFINITIONS[STAGE_DEFINITIONS.length - 1]!;
  return Object.freeze({ ...last, progressToNext: 1 });
}
