export function normalizeConfidence(
  value: number | undefined | null,
  fallback = 1.0,
): number {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  if (!Number.isFinite(candidate)) {
    return 1.0;
  }
  const clamped = Math.min(1.0, Math.max(0.0, candidate));
  return Number(clamped.toFixed(3));
}
