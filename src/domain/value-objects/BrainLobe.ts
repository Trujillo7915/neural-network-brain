export type BrainLobeCode =
  | 'frontal'
  | 'temporal'
  | 'parietal'
  | 'occipital'
  | 'cerebellum'
  | 'limbic';

export interface LobeAnchor {
  readonly xOffset: number;
  readonly yOffset: number;
  readonly zOffset: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

export interface LobeMetadata {
  readonly code: BrainLobeCode;
  readonly displayName: string;
  readonly shortName: string;
  readonly functionalRole: string;
  readonly accentHex: string;
  readonly anchor: LobeAnchor;
  readonly cameraTarget: readonly [number, number, number];
  readonly cameraPosition: readonly [number, number, number];
}

export const ALL_LOBE_CODES: readonly BrainLobeCode[] = Object.freeze([
  'frontal',
  'temporal',
  'parietal',
  'occipital',
  'cerebellum',
  'limbic',
]);

export const BRAIN_LOBES: Readonly<Record<BrainLobeCode, LobeMetadata>> = Object.freeze({
  frontal: {
    code: 'frontal',
    displayName: 'Lóbulo Frontal',
    shortName: 'Frontal',
    functionalRole: 'Decisiones ejecutivas, reglas de trabajo, preferencias y gobernanza',
    accentHex: '#f59e0b',
    anchor: { xOffset: 1.05, yOffset: 0.42, zOffset: 1.55, rx: 0.72, ry: 0.68, rz: 0.78 },
    cameraTarget: [0, 0.35, 1.4],
    cameraPosition: [0.5, 1.3, 6.2],
  },
  temporal: {
    code: 'temporal',
    displayName: 'Lóbulo Temporal',
    shortName: 'Temporal',
    functionalRole: 'Identidad, equipo, proyectos activos y contexto organizacional',
    accentHex: '#38bdf8',
    anchor: { xOffset: 1.58, yOffset: -0.42, zOffset: 0.15, rx: 0.55, ry: 0.52, rz: 1.05 },
    cameraTarget: [1.4, -0.35, 0.1],
    cameraPosition: [6.4, 0.2, 2.2],
  },
  parietal: {
    code: 'parietal',
    displayName: 'Lóbulo Parietal',
    shortName: 'Parietal',
    functionalRole: 'Hechos técnicos, arquitectura de sistemas, auditorías y correcciones',
    accentHex: '#a78bfa',
    anchor: { xOffset: 1.12, yOffset: 1.08, zOffset: -0.45, rx: 0.78, ry: 0.58, rz: 0.92 },
    cameraTarget: [0, 1.0, -0.4],
    cameraPosition: [3.2, 4.6, -2.5],
  },
  occipital: {
    code: 'occipital',
    displayName: 'Lóbulo Occipital',
    shortName: 'Occipital',
    functionalRole: 'Metodología, estándares de ingeniería, runbooks y handoffs',
    accentHex: '#10b981',
    anchor: { xOffset: 0.92, yOffset: 0.12, zOffset: -1.92, rx: 0.68, ry: 0.64, rz: 0.62 },
    cameraTarget: [0, 0.1, -1.8],
    cameraPosition: [-0.8, 1.2, -6.5],
  },
  cerebellum: {
    code: 'cerebellum',
    displayName: 'Cerebelo',
    shortName: 'Cerebelo',
    functionalRole: 'Entorno local, puertos, herramientas CLI, modelos Ollama y skills',
    accentHex: '#fb7185',
    anchor: { xOffset: 0.78, yOffset: -1.32, zOffset: -1.42, rx: 0.62, ry: 0.42, rz: 0.52 },
    cameraTarget: [0, -1.3, -1.4],
    cameraPosition: [3.2, -1.8, -5.4],
  },
  limbic: {
    code: 'limbic',
    displayName: 'Sistema Límbico',
    shortName: 'Límbico',
    functionalRole: 'Núcleo asociativo de alta centralidad e integración transversal',
    accentHex: '#fbbf24',
    anchor: { xOffset: 0.46, yOffset: -0.05, zOffset: 0.08, rx: 0.42, ry: 0.45, rz: 0.68 },
    cameraTarget: [0, 0, 0],
    cameraPosition: [4.6, 1.8, 4.8],
  },
});

export function isValidBrainLobe(value: string): value is BrainLobeCode {
  return (ALL_LOBE_CODES as readonly string[]).includes(value);
}
