import { describe, expect, it } from 'vitest';
import {
  createHemisphereGeometry,
  createCerebellumGeometry,
  createBrainstemGeometry,
  evaluateGyriDisplacement,
} from '../../src/web/brain3d/brainGeometry.js';

describe('Procedural Anatomical Brain Geometry (ADR-002)', () => {
  it('sculpts distinct left and right hemispheres separated across longitudinal fissure', () => {
    const left = createHemisphereGeometry('left', 0.55);
    const right = createHemisphereGeometry('right', 0.55);

    left.computeBoundingBox();
    right.computeBoundingBox();

    expect(left.boundingBox).not.toBeNull();
    expect(right.boundingBox).not.toBeNull();
    expect(left.boundingBox!.min.x).toBeLessThan(-1.5);
    expect(right.boundingBox!.max.x).toBeGreaterThan(1.5);
    // Longitudinal fissure stays near midline
    expect(left.boundingBox!.max.x).toBeLessThanOrEqual(0.05);
    expect(right.boundingBox!.min.x).toBeGreaterThanOrEqual(-0.05);
  });

  it('increases cortical gyri/sulci displacement amplitude with sulciDepth', () => {
    const shallow = evaluateGyriDisplacement(0.8, 0.6, 0.5, 0.25);
    const deep = evaluateGyriDisplacement(0.8, 0.6, 0.5, 1.0);
    expect(Math.abs(deep)).toBeGreaterThan(Math.abs(shallow));
  });

  it('builds cerebellum and brainstem below posterior cortex', () => {
    const cerebellum = createCerebellumGeometry(0.6);
    const brainstem = createBrainstemGeometry();
    cerebellum.computeBoundingBox();
    brainstem.computeBoundingBox();

    expect(cerebellum.boundingBox!.max.y).toBeLessThan(0);
    expect(brainstem.boundingBox!.min.y).toBeLessThan(cerebellum.boundingBox!.min.y);
  });
});
