import { describe, expect, it, vi } from 'vitest';
import { loadAppConfig } from '../../src/infrastructure/config/env.js';
import { JsonLogger } from '../../src/infrastructure/logging/JsonLogger.js';
import { isValidBrainLobe } from '../../src/domain/value-objects/BrainLobe.js';
import { normalizeConfidence } from '../../src/domain/value-objects/ConfidenceScore.js';
import { RateLimitExceededError, StoreUnavailableError } from '../../src/domain/errors/DomainErrors.js';
import { resolveNeuronColor, SOURCE_COLORS, LOBE_COLORS } from '../../src/web/brain3d/brainColorTokens.js';
import { createCorpusCallosumGeometry } from '../../src/web/brain3d/brainGeometry.js';

describe('Config Fail-Fast, Structured Logger, Value Objects & Visual Tokens', () => {
  it('loadAppConfig applies safe localhost:4310 defaults and rejects invalid env', () => {
    const config = loadAppConfig({});
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.PORT).toBe(4310);
    expect(config.CACHE_TTL_MS).toBe(15000);
    expect(config.ENABLE_EXTERNAL_STORES).toBe(false);
    expect(loadAppConfig({ ENABLE_EXTERNAL_STORES: 'true' }).ENABLE_EXTERNAL_STORES).toBe(true);

    expect(() => loadAppConfig({ PORT: '80' })).toThrow(/Fail-Fast/);
    expect(() => loadAppConfig({ NODE_ENV: 'invalid' })).toThrow(/Fail-Fast/);
  });

  it('JsonLogger emits valid JSON respecting minimum log level and child metadata', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      const logger = new JsonLogger('info').child({ correlationId: 'corr-1' });
      logger.debug('should be suppressed');
      logger.info('info event', { count: 3 });
      logger.warn('warn event');
      logger.error('error event', { reason: 'boom' });

      expect(stdoutSpy).toHaveBeenCalledTimes(2);
      expect(stderrSpy).toHaveBeenCalledTimes(1);

      const firstPayload = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0])) as Record<string, unknown>;
      expect(firstPayload.level).toBe('INFO');
      expect(firstPayload.correlationId).toBe('corr-1');
      expect(firstPayload.count).toBe(3);

      const debugLogger = new JsonLogger('debug');
      debugLogger.debug('visible debug');
      expect(stdoutSpy).toHaveBeenCalledTimes(3);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });

  it('validates BrainLobe, ConfidenceScore fallback, DomainErrors and color tokens', () => {
    expect(isValidBrainLobe('frontal')).toBe(true);
    expect(isValidBrainLobe('unknown')).toBe(false);
    expect(normalizeConfidence(undefined, Number.NaN)).toBe(1);

    const storeErr = new StoreUnavailableError('mem0', 'timeout');
    expect(storeErr.httpStatus).toBe(503);
    expect(storeErr.store).toBe('mem0');

    const rateErr = new RateLimitExceededError(12);
    expect(rateErr.httpStatus).toBe(429);
    expect(rateErr.retryAfterSeconds).toBe(12);

    expect(resolveNeuronColor('frontal', 'mem0', 'lobe')).toBe(LOBE_COLORS.frontal);
    expect(resolveNeuronColor('frontal', 'mem0', 'source')).toBe(SOURCE_COLORS.mem0);

    const callosum = createCorpusCallosumGeometry();
    callosum.computeBoundingBox();
    expect(callosum.boundingBox).not.toBeNull();
  });
});
