export class DomainError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NodeNotFoundError extends DomainError {
  constructor(nodeId: string) {
    super(`Neurona '${nodeId}' no encontrada en la red cerebral activa.`, 'NODE_NOT_FOUND', 404);
  }
}

export class StoreUnavailableError extends DomainError {
  readonly store: string;

  constructor(store: string, detail: string) {
    super(`Almacén '${store}' temporalmente no disponible: ${detail}`, 'STORE_UNAVAILABLE', 503);
    this.store = store;
  }
}

export class RateLimitExceededError extends DomainError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Límite de solicitudes excedido. Intenta nuevamente en unos segundos.', 'RATE_LIMIT_EXCEEDED', 429);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ForbiddenOperationError extends DomainError {
  constructor(message: string) {
    super(message, 'FORBIDDEN_OPERATION', 403);
  }
}
