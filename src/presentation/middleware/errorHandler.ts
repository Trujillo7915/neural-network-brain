import type http from 'node:http';
import { ZodError } from 'zod';
import { DomainError, RateLimitExceededError } from '../../domain/errors/DomainErrors.js';
import type { LoggerPort } from '../../domain/ports/LoggerPort.js';

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly correlationId: string;
}

export function sendProblemDetails(
  res: http.ServerResponse,
  problem: ProblemDetails,
  extraHeaders: Readonly<Record<string, string>> = {},
): void {
  const payload = JSON.stringify(problem);
  res.writeHead(problem.status, {
    'Content-Type': 'application/problem+json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

export function handleRequestError(
  error: unknown,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  correlationId: string,
  logger: LoggerPort,
): void {
  const instance = req.url ?? '/';

  if (error instanceof RateLimitExceededError) {
    sendProblemDetails(
      res,
      {
        type: 'urn:neural-brain:error:rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: error.message,
        instance,
        correlationId,
      },
      { 'Retry-After': String(error.retryAfterSeconds) },
    );
    return;
  }

  if (error instanceof DomainError) {
    sendProblemDetails(res, {
      type: `urn:neural-brain:error:${error.code.toLowerCase()}`,
      title: error.name,
      status: error.httpStatus,
      detail: error.message,
      instance,
      correlationId,
    });
    return;
  }

  if (error instanceof ZodError) {
    const detail = error.issues.map((i) => `${i.path.join('.') || 'query'}: ${i.message}`).join('; ');
    sendProblemDetails(res, {
      type: 'urn:neural-brain:error:validation',
      title: 'Validation Error',
      status: 400,
      detail,
      instance,
      correlationId,
    });
    return;
  }

  logger.error('Unhandled request exception', {
    correlationId,
    instance,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  sendProblemDetails(res, {
    type: 'urn:neural-brain:error:internal',
    title: 'Internal Server Error',
    status: 500,
    detail: 'Ocurrió un error interno procesando la solicitud.',
    instance,
    correlationId,
  });
}
