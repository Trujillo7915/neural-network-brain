import { NodeNotFoundError } from '../../domain/errors/DomainErrors.js';
import type { NeuronConnectionDto, NeuronDetailDto, NeuronDetailQuery } from '../dto/BrainDtos.js';
import type { GetBrainSnapshotUseCase } from './GetBrainSnapshotUseCase.js';

export class GetNeuronDetailUseCase {
  private readonly snapshotUseCase: GetBrainSnapshotUseCase;

  constructor(snapshotUseCase: GetBrainSnapshotUseCase) {
    this.snapshotUseCase = snapshotUseCase;
  }

  async execute(query: NeuronDetailQuery): Promise<NeuronDetailDto> {
    const snapshot = await this.snapshotUseCase.execute({
      simulateCount: query.simulateCount,
    });

    const nodeMap = new Map(snapshot.nodes.map((n) => [n.id, n]));
    const targetNode = nodeMap.get(query.id);
    if (!targetNode) {
      throw new NodeNotFoundError(query.id);
    }

    const connections: NeuronConnectionDto[] = [];
    for (const edge of snapshot.edges) {
      if (edge.sourceId === targetNode.id) {
        const neighbor = nodeMap.get(edge.targetId);
        if (neighbor) {
          connections.push(Object.freeze({ edge, direction: 'outgoing', neighbor }));
        }
      } else if (edge.targetId === targetNode.id) {
        const neighbor = nodeMap.get(edge.sourceId);
        if (neighbor) {
          connections.push(Object.freeze({ edge, direction: 'incoming', neighbor }));
        }
      }
    }

    connections.sort((a, b) => b.edge.weight - a.edge.weight);

    return Object.freeze({
      node: targetNode,
      connections: Object.freeze(connections),
      totalConnections: connections.length,
    });
  }
}
