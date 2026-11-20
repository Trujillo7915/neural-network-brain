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
import type { GetBrainSnapshotUseCase } from './GetBrainSnapshotUseCase.js';

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

  private requireWritableStore(): WritableMemoryStorePort {
    if (!this.writableStore) {
      throw new StoreUnavailableError('local-brain', 'El almacén local editable no está habilitado.');
    }
    return this.writableStore;
  }
}
