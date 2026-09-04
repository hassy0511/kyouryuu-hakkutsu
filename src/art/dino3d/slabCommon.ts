import * as THREE from 'three';
import { GeometryBatch, makeFlatMaterial, silhouetteGeometry } from './common';

export const SLAB_COLORS = {
  stone: '#C9BFA6',
  fossil: '#8A7A62',
  edge: '#B0A68E',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SLAB_TILT = THREE.MathUtils.degToRad(-55);

export interface StoneSlab {
  root: THREE.Group;
  frontZ: number;
  width: number;
  height: number;
  thickness: number;
}

export function irregularSlabOutline(width: number, height: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(-width * 0.46, height * 0.04),
    new THREE.Vector2(-width * 0.28, 0),
    new THREE.Vector2(width * 0.18, height * 0.018),
    new THREE.Vector2(width * 0.45, height * 0.08),
    new THREE.Vector2(width * 0.49, height * 0.29),
    new THREE.Vector2(width * 0.46, height * 0.56),
    new THREE.Vector2(width * 0.5, height * 0.82),
    new THREE.Vector2(width * 0.3, height * 0.98),
    new THREE.Vector2(-width * 0.08, height),
    new THREE.Vector2(-width * 0.39, height * 0.91),
    new THREE.Vector2(-width * 0.5, height * 0.68),
    new THREE.Vector2(-width * 0.47, height * 0.31),
  ];
}

export function createStoneSlab(
  width: number,
  height: number,
  thickness: number,
  name: string,
): StoneSlab {
  const root = new THREE.Group();
  root.name = name;
  root.rotation.x = SLAB_TILT;
  root.position.y = Math.sin(-SLAB_TILT) * (thickness * 0.5) + 0.003;

  const geometry = silhouetteGeometry(irregularSlabOutline(width, height), thickness * 0.5);
  geometry.computeVertexNormals();
  const stone = new THREE.Mesh(geometry, makeFlatMaterial(SLAB_COLORS.stone));
  stone.name = `${name}-stone`;
  stone.castShadow = true;
  stone.receiveShadow = true;
  root.add(stone);

  return { root, frontZ: thickness * 0.5, width, height, thickness };
}

/** Low relief is sunk mostly into the slab instead of resting on its face. */
export function addReliefLine(
  batch: GeometryBatch,
  start: THREE.Vector2,
  end: THREE.Vector2,
  radius: number,
  frontZ: number,
  radialSegments = 5,
): void {
  const centerZ = frontZ - radius * 0.72;
  batch.addBetween(
    V(start.x, start.y, centerZ),
    V(end.x, end.y, centerZ),
    radius,
    radius * 0.82,
    radialSegments,
  );
}

export function addReliefEllipsoid(
  batch: GeometryBatch,
  center: THREE.Vector2,
  scale: THREE.Vector2,
  depth: number,
  frontZ: number,
  widthSegments = 8,
  heightSegments = 5,
): void {
  batch.add(
    new THREE.SphereGeometry(1, widthSegments, heightSegments),
    V(center.x, center.y, frontZ - depth * 0.72),
    V(scale.x, scale.y, depth),
  );
}

export function addReliefClaw(
  batch: GeometryBatch,
  base: THREE.Vector2,
  tip: THREE.Vector2,
  radius: number,
  frontZ: number,
): void {
  const direction = new THREE.Vector3(tip.x - base.x, tip.y - base.y, 0);
  const length = direction.length();
  if (length === 0) return;
  const midpoint = V((base.x + tip.x) * 0.5, (base.y + tip.y) * 0.5, frontZ - radius * 0.7);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  batch.add(
    new THREE.ConeGeometry(radius, length, 5, 1, false),
    midpoint,
    V(1, 1, 0.72),
    quaternion,
  );
}

export function addDryCracks(
  batch: GeometryBatch,
  frontZ: number,
  width: number,
  height: number,
): void {
  const crackSets = [
    [new THREE.Vector2(-0.38, 0.2), new THREE.Vector2(-0.25, 0.28), new THREE.Vector2(-0.18, 0.4)],
    [new THREE.Vector2(0.31, 0.16), new THREE.Vector2(0.22, 0.28), new THREE.Vector2(0.33, 0.39)],
    [new THREE.Vector2(-0.32, 0.7), new THREE.Vector2(-0.2, 0.63), new THREE.Vector2(-0.12, 0.72)],
    [new THREE.Vector2(0.18, 0.73), new THREE.Vector2(0.29, 0.65), new THREE.Vector2(0.4, 0.72)],
  ];
  for (const points of crackSets) {
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      if (!start || !end) continue;
      addReliefLine(
        batch,
        new THREE.Vector2(start.x * width, start.y * height),
        new THREE.Vector2(end.x * width, end.y * height),
        Math.min(width, height) * 0.006,
        frontZ,
        4,
      );
    }
  }
}

export function fossilMaterial(): THREE.MeshStandardMaterial {
  return makeFlatMaterial(SLAB_COLORS.fossil);
}
