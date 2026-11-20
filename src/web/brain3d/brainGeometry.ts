import * as THREE from 'three';

export function evaluateGyriDisplacement(
  nx: number,
  ny: number,
  nz: number,
  sulciDepth: number,
): number {
  const wave1 = Math.sin(nx * 7.2 + nz * 5.8) * Math.cos(ny * 6.5 - nz * 4.2);
  const wave2 = Math.sin(nz * 11.4 - ny * 8.1 + nx * 6.0) * 0.55;
  const wave3 = Math.cos(nx * 14.0 + ny * 12.5 + nz * 9.5) * 0.25;
  const ridge = Math.abs(wave1 + wave2 + wave3) * 0.55 - 0.24;
  return ridge * 0.14 * Math.max(0.1, sulciDepth);
}

export function createHemisphereGeometry(
  side: 'left' | 'right',
  sulciDepth: number,
): THREE.BufferGeometry {
  const sign = side === 'left' ? -1 : 1;
  const geometry = new THREE.SphereGeometry(1, 60, 44);
  const pos = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i += 1) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);

    // Push sphere into a single hemisphere (medial wall sits near x = 0)
    const lateral = (ux * sign + 1) * 0.5; // 0 at medial fissure -> 1 at outer cortex
    const medialFlatten = Math.pow(lateral, 0.72);

    // Anteroposterior elongation (+Z frontal, -Z occipital)
    let x = sign * (0.06 + medialFlatten * 2.15);
    let y = uy * 1.72;
    let z = uz * 2.68;

    // Taper frontal & occipital poles realistically
    const poleFactor = 1 - 0.22 * Math.pow(Math.abs(uz), 2.1);
    x *= poleFactor;

    // Superior parietal arch slightly higher posteriorly
    if (uy > 0) {
      y += Math.sin((uz + 1) * Math.PI * 0.5) * 0.24 * uy;
    } else {
      // Flatten inferior orbital/basal floor
      y *= 0.82;
    }

    // Distinct lateral temporal lobe bulge + Sylvian fissure crease
    const temporalMask =
      Math.exp(-Math.pow((uz - 0.08) / 0.52, 2)) *
      Math.exp(-Math.pow((uy + 0.34) / 0.38, 2)) *
      Math.max(0, lateral - 0.25);
    x += sign * temporalMask * 0.44;
    y -= temporalMask * 0.34;

    const sylvianCrease =
      Math.exp(-Math.pow((uy + 0.05 - uz * 0.25) / 0.14, 2)) *
      Math.exp(-Math.pow((uz - 0.15) / 0.55, 2)) *
      Math.max(0, lateral - 0.35);
    x -= sign * sylvianCrease * 0.22;

    // Cortical gyri & sulci folding (muted along medial wall)
    const foldStrength = Math.min(1, lateral * 1.45);
    const disp = evaluateGyriDisplacement(x, y, z, sulciDepth) * foldStrength;
    const radialLen = Math.hypot(x, y, z) || 1;
    x += (x / radialLen) * disp;
    y += (y / radialLen) * disp;
    z += (z / radialLen) * disp;

    // Preserve crisp interhemispheric longitudinal fissure gap
    if (sign === -1 && x > -0.04) x = -0.04;
    if (sign === 1 && x < 0.04) x = 0.04;

    pos.setXYZ(i, x, y, z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function createCerebellumGeometry(sulciDepth: number): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, 44, 30);
  const pos = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i += 1) {
    const ux = pos.getX(i);
    const uy = pos.getY(i);
    const uz = pos.getZ(i);

    // Bi-lobed cerebellar silhouette with horizontal folia striations
    const vermisPinch = 1 - 0.22 * Math.exp(-Math.pow(ux / 0.24, 2));
    const folia = Math.sin(uy * 26.0) * 0.032 * Math.max(0.3, sulciDepth);

    const x = ux * 1.38;
    const y = uy * 0.62 * vermisPinch + folia - 1.38;
    const z = uz * 0.78 * vermisPinch - 1.46;
    pos.setXYZ(i, x, y, z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function createBrainstemGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.32, 0.22, 1.55, 24, 12);
  const pos = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Anterior pons bulge
    const ponsMask = Math.exp(-Math.pow((y - 0.18) / 0.34, 2));
    const zBulge = z > 0 ? ponsMask * 0.14 : 0;
    pos.setXYZ(i, x * (1 + ponsMask * 0.18), y - 1.85, z + zBulge - 0.58 - y * 0.18);
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function createCorpusCallosumGeometry(): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, -1.05),
    new THREE.Vector3(0, 0.34, -0.35),
    new THREE.Vector3(0, 0.38, 0.38),
    new THREE.Vector3(0, 0.02, 1.0),
  ]);
  const geom = new THREE.TubeGeometry(curve, 24, 0.16, 12, false);
  geom.scale(2.4, 0.65, 1.0);
  geom.computeVertexNormals();
  return geom;
}
