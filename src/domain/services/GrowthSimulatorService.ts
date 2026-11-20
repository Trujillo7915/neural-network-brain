import { ALL_MEMORY_SOURCES, type RawMemoryRecord } from '../entities/NeuronNode.js';
import type { RawEdgeRecord } from '../entities/SynapticEdge.js';
import { ValidationError } from '../errors/DomainErrors.js';

const MIN_SIMULATION_NODES = 5;
const MAX_SIMULATION_NODES = 500;

interface TopicArchetype {
  readonly kind: string;
  readonly tag: string;
  readonly titlePrefix: string;
  readonly bodyTemplate: string;
}

const ARCHETYPES: readonly TopicArchetype[] = Object.freeze([
  {
    kind: 'decision',
    tag: 'rules',
    titlePrefix: 'Decisión de Gobernanza',
    bodyTemplate: 'Regla arquitectónica simulada para validar la densidad del lóbulo frontal y decisiones de diseño.',
  },
  {
    kind: 'projects',
    tag: 'project',
    titlePrefix: 'Contexto de Proyecto',
    bodyTemplate: 'Registro simulado de microservicios, equipos y entregables distribuidos en el lóbulo temporal.',
  },
  {
    kind: 'fact',
    tag: 'architecture',
    titlePrefix: 'Hecho Técnico Auditado',
    bodyTemplate: 'Evidencia simulada de auditoría DDL, invariantes de dominio y verificación estructural parietal.',
  },
  {
    kind: 'methodology',
    tag: 'methodology',
    titlePrefix: 'Estándar de Ingeniería',
    bodyTemplate: 'Procedimiento simulado de los 8 puntos obligatorios, TDD, BDD y runbooks en corteza occipital.',
  },
  {
    kind: 'environment',
    tag: 'environment',
    titlePrefix: 'Configuración de Entorno',
    bodyTemplate: 'Parámetro simulado de puertos locales, contenedores Docker, MySQL y modelos locales en cerebelo.',
  },
  {
    kind: 'episode',
    tag: 'milestone',
    titlePrefix: 'Hito Episódico Núcleo',
    bodyTemplate: 'Evento de consolidación simulada en el sistema límbico conectando múltiples dominios.',
  },
]);

export function generateSimulatedDataset(count: number): Readonly<{
  nodes: readonly RawMemoryRecord[];
  edges: readonly RawEdgeRecord[];
}> {
  if (!Number.isInteger(count) || count < MIN_SIMULATION_NODES || count > MAX_SIMULATION_NODES) {
    throw new ValidationError(
      `simulateCount debe ser un entero entre ${MIN_SIMULATION_NODES} y ${MAX_SIMULATION_NODES}.`,
    );
  }

  const baseEpoch = Date.UTC(2026, 10, 19, 12, 0, 0);
  const nodes: RawMemoryRecord[] = [];
  const edges: RawEdgeRecord[] = [];

  for (let i = 0; i < count; i += 1) {
    const archetype = ARCHETYPES[i % ARCHETYPES.length]!;
    const source = ALL_MEMORY_SOURCES[i % ALL_MEMORY_SOURCES.length]!;
    const timestamp = new Date(baseEpoch - (count - i) * 3600_000).toISOString();
    const confidence = Number((0.72 + ((i * 17) % 29) / 100).toFixed(2));
    const id = `sim:${i + 1}`;

    nodes.push(
      Object.freeze({
        id,
        externalId: String(i + 1),
        source,
        kind: archetype.kind,
        title: `${archetype.titlePrefix} #${i + 1}`,
        content: `[Simulación #${i + 1}] ${archetype.bodyTemplate} (Fuente proyectada: ${source}).`,
        confidence,
        decayScore: Number((((i * 7) % 25) / 100).toFixed(2)),
        accessCount: (i * 3) % 14,
        tags: Object.freeze([archetype.tag, 'simulation', `cluster-${(i % 6) + 1}`]),
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );

    if (i > 0) {
      const sameClusterPrev = Math.max(0, i - ARCHETYPES.length);
      const relation = i % 4 === 0 ? 'supports' : i % 3 === 0 ? 'part_of' : 'related_to';
      edges.push(
        Object.freeze({
          id: `sim-edge:${id}->sim:${sameClusterPrev + 1}`,
          sourceId: id,
          targetId: `sim:${sameClusterPrev + 1}`,
          relationType: relation,
          origin: 'simulation',
          weight: Number((0.6 + ((i * 13) % 40) / 100).toFixed(2)),
          createdAt: timestamp,
        }),
      );

      if (i % 5 === 0) {
        const bridgeTarget = ((i * 7) % i) + 1;
        edges.push(
          Object.freeze({
            id: `sim-bridge:${id}->sim:${bridgeTarget}`,
            sourceId: id,
            targetId: `sim:${bridgeTarget}`,
            relationType: 'semantic_link',
            origin: 'simulation',
            weight: 0.74,
            createdAt: timestamp,
          }),
        );
      }
    }
  }

  return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
}
