import crypto from 'node:crypto';
import type http from 'node:http';

const SAFE_CORRELATION_RE = /^[a-zA-Z0-9._-]{1,64}$/;

export function resolveCorrelationId(req: http.IncomingMessage): string {
  const incoming = req.headers['x-correlation-id'];
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  if (raw && SAFE_CORRELATION_RE.test(raw)) {
    return raw;
  }
  return crypto.randomUUID();
}
