import type { SearchBrainQuery, SearchBrainResultDto } from '../dto/BrainDtos.js';
import type { GetBrainSnapshotUseCase } from './GetBrainSnapshotUseCase.js';

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export class SearchBrainUseCase {
  private readonly snapshotUseCase: GetBrainSnapshotUseCase;

  constructor(snapshotUseCase: GetBrainSnapshotUseCase) {
    this.snapshotUseCase = snapshotUseCase;
  }

  async execute(query: SearchBrainQuery): Promise<SearchBrainResultDto> {
    const snapshot = await this.snapshotUseCase.execute({
      simulateCount: query.simulateCount,
    });

    const normalizedNeedle = query.q ? normalizeSearchText(query.q.trim()) : '';

    const matchedNodes = snapshot.nodes.filter((node) => {
      if (query.source && node.source !== query.source) {
        return false;
      }
      if (query.lobe && node.lobe !== query.lobe) {
        return false;
      }
      if (query.minConfidence !== undefined && node.confidence < query.minConfidence) {
        return false;
      }
      if (!normalizedNeedle) {
        return true;
      }
      const haystack = normalizeSearchText(
        `${node.id} ${node.title} ${node.content} ${node.kind} ${node.tags.join(' ')} ${node.locations.join(' ')}`,
      );
      return haystack.includes(normalizedNeedle);
    });

    const matchedIdSet = new Set(matchedNodes.map((n) => n.id));
    const matchedEdges = snapshot.edges.filter(
      (edge) => matchedIdSet.has(edge.sourceId) && matchedIdSet.has(edge.targetId),
    );

    return Object.freeze({
      query: Object.freeze({ ...query }),
      totalMatched: matchedNodes.length,
      matchedIds: Object.freeze(matchedNodes.map((n) => n.id)),
      nodes: Object.freeze(matchedNodes),
      edges: Object.freeze(matchedEdges),
    });
  }
}
