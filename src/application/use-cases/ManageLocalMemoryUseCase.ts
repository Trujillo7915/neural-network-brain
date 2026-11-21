import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import {
  ForbiddenOperationError,
  NodeNotFoundError,
  StoreUnavailableError,
  ValidationError,
} from '../../domain/errors/DomainErrors.js';
import type {
  CreateEdgeInput,
  CreateMemoryInput,
  WritableMemoryStorePort,
} from '../../domain/ports/WritableMemoryStorePort.js';
import {
  MemoryPruningService,
  type PruneCandidate,
  type PrunePolicy,
} from '../../domain/services/MemoryPruningService.js';
import type { GetBrainSnapshotUseCase } from './GetBrainSnapshotUseCase.js';

export interface PruneMemoriesInput extends Partial<PrunePolicy> {
  readonly dryRun?: boolean;
}

export interface PruneMemoriesResult {
  readonly dryRun: boolean;
  readonly scanned: number;
  readonly prunedCount: number;
  readonly candidates: readonly PruneCandidate[];
  readonly snapshot?: BrainSnapshot;
}

export class ManageLocalMemoryUseCase {
  private readonly snapshotUseCase: GetBrainSnapshotUseCase;
  private readonly writableStore?: WritableMemoryStorePort;

  constructor(snapshotUseCase: GetBrainSnapshotUseCase, writableStore?: WritableMemoryStorePort) {
    this.snapshotUseCase = snapshotUseCase;
    this.writableStore = writableStore;
  }

  async createMemory(input: CreateMemoryInput): Promise<BrainSnapshot> {
    const store = this.requireWritableStore();
    if (!input.title.trim() || !input.content.trim()) {
      throw new ValidationError('El título y el contenido son obligatorios para crear una neurona.');
    }

    await store.createNeuron(input);
    this.snapshotUseCase.invalidateCache();
    return this.snapshotUseCase.execute({ forceRefresh: true });
  }

  async createSynapse(input: CreateEdgeInput): Promise<BrainSnapshot> {
    const store = this.requireWritableStore();
    if (input.sourceId === input.targetId) {
      throw new ValidationError('Una sinapsis no puede conectar una neurona consigo misma.');
    }

    await store.createEdge(input);
    this.snapshotUseCase.invalidateCache();
    return this.snapshotUseCase.execute({ forceRefresh: true });
  }

  async deleteMemory(id: string): Promise<BrainSnapshot> {
    const store = this.requireWritableStore();
    if (!id.startsWith('local:')) {
      throw new ForbiddenOperationError(
        `Solo se pueden eliminar memorias del almacén local ('local:*'); '${id}' pertenece a una fuente externa de solo lectura.`,
      );
    }

    const removed = await store.deleteNeuron(id);
    if (!removed) {
      throw new NodeNotFoundError(id);
    }

    this.snapshotUseCase.invalidateCache();
    return this.snapshotUseCase.execute({ forceRefresh: true });
  }

  async pruneMemories(input: PruneMemoriesInput = {}): Promise<PruneMemoriesResult> {
    const store = this.requireWritableStore();
    const dryRun = input.dryRun ?? false;
    const { nodes } = await store.load();
    const plan = MemoryPruningService.findCandidates(nodes, input);

    if (dryRun || plan.candidates.length === 0) {
      return {
        dryRun,
        scanned: plan.scanned,
        prunedCount: 0,
        candidates: plan.candidates,
      };
    }

    let prunedCount = 0;
    for (const candidate of plan.candidates) {
      if (candidate.id.startsWith('local:')) {
        const removed = await store.deleteNeuron(candidate.id);
        if (removed) prunedCount += 1;
      }
    }

    this.snapshotUseCase.invalidateCache();
    const snapshot = await this.snapshotUseCase.execute({ forceRefresh: true });

    return {
      dryRun: false,
      scanned: plan.scanned,
      prunedCount,
      candidates: plan.candidates,
      snapshot,
    };
  }

  private requireWritableStore(): WritableMemoryStorePort {
    if (!this.writableStore) {
      throw new StoreUnavailableError('local-brain', 'El almacén local editable no está habilitado.');
    }
    return this.writableStore;
  }
}
