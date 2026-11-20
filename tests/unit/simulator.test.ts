import { describe, expect, it } from 'vitest';
import { generateSimulatedDataset } from '../../src/domain/services/GrowthSimulatorService.js';
import { ValidationError } from '../../src/domain/errors/DomainErrors.js';

describe('GrowthSimulatorService (BR-06)', () => {
  it('generates deterministic synthetic nodes with sim: prefix across all 4 sources', () => {
    const runA = generateSimulatedDataset(80);
    const runB = generateSimulatedDataset(80);

    expect(runA.nodes).toHaveLength(80);
    expect(runA.nodes).toEqual(runB.nodes);
    expect(runA.edges.length).toBeGreaterThan(40);
    expect(runA.nodes.every((n) => n.id.startsWith('sim:'))).toBe(true);

    const sources = new Set(runA.nodes.map((n) => n.source));
    expect(sources.size).toBe(4);
  });

  it('rejects simulation counts outside [5, 500]', () => {
    expect(() => generateSimulatedDataset(2)).toThrow(ValidationError);
    expect(() => generateSimulatedDataset(600)).toThrow(ValidationError);
  });
});
