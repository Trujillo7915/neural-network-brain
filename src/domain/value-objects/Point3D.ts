export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Hemisphere = 'left' | 'right' | 'midline';

export function createPoint3D(x: number, y: number, z: number): Point3D {
  return Object.freeze({
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
    z: Number(z.toFixed(4)),
  });
}
