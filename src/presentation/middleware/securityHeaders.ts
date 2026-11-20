import type http from 'node:http';

const ALLOWED_LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:4310',
  'http://localhost:4310',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

export function applySecurityHeaders(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  correlationId: string,
): void {
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const origin = req.headers.origin;
  if (origin && ALLOWED_LOCAL_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');
  }
}
