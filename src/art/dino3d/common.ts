import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new THREE.Vector3(0, 1, 0);

export function makeFlatMaterial(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.82,
    metalness: 0,
  });
}

export function makeOrganicMaterial(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: false,
    roughness: 0.7,
    metalness: 0,
  });
}

export class GeometryBatch {
  readonly #geometries: THREE.BufferGeometry[] = [];

  add(
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    scale = new THREE.Vector3(1, 1, 1),
    quaternion = new THREE.Quaternion(),
  ): void {
    const compatibleGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
    compatibleGeometry.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, scale));
    this.#geometries.push(compatibleGeometry);
  }

  addBetween(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radiusStart: number,
    radiusEnd = radiusStart,
    radialSegments = 7,
  ): void {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    if (length === 0) return;

    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize());
    this.add(
      new THREE.CylinderGeometry(radiusEnd, radiusStart, length, radialSegments, 1, false),
      midpoint,
      new THREE.Vector3(1, 1, 1),
      quaternion,
    );
  }

  toMesh(material: THREE.MeshStandardMaterial, name: string): THREE.Mesh {
    const merged = mergeGeometries(this.#geometries, false);
    if (!merged) throw new Error(`Could not merge geometry batch: ${name}`);
    merged.computeBoundingSphere();

    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    return mesh;
  }
}

export function ellipsoid(
  batch: GeometryBatch,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  widthSegments = 10,
  heightSegments = 7,
  quaternion = new THREE.Quaternion(),
): void {
  batch.add(
    new THREE.SphereGeometry(1, widthSegments, heightSegments),
    position,
    scale,
    quaternion,
  );
}

/**
 * Pushes a side detail into the underlying volume. On curved surfaces, callers
 * must still use a rounded cap with enough depth; a wide, flat ellipsoid can
 * touch at its centre while its perimeter remains visibly detached.
 */
export function embeddedSideZ(
  side: number,
  surfaceDepth: number,
  detailHalfDepth: number,
  exposedFraction = 0.25,
): number {
  const clampedExposure = THREE.MathUtils.clamp(exposedFraction, 0, 1);
  return side * (surfaceDepth - detailHalfDepth * (1 - clampedExposure));
}

export function coneBetween(
  batch: GeometryBatch,
  base: THREE.Vector3,
  tip: THREE.Vector3,
  radius: number,
  radialSegments = 6,
): void {
  const direction = new THREE.Vector3().subVectors(tip, base);
  const length = direction.length();
  if (length === 0) return;

  const midpoint = new THREE.Vector3().addVectors(base, tip).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize());
  batch.add(
    new THREE.ConeGeometry(radius, length, radialSegments, 1, false),
    midpoint,
    new THREE.Vector3(1, 1, 1),
    quaternion,
  );
}

/** Builds a thin, double-sided solid from an X/Y silhouette. */
export function silhouetteGeometry(
  points: readonly THREE.Vector2[],
  halfDepth: number,
): THREE.BufferGeometry {
  if (points.length < 3) throw new Error('A silhouette needs at least three points.');

  const shape = new THREE.Shape();
  const first = points[0];
  if (!first) throw new Error('A silhouette needs a first point.');
  shape.moveTo(first.x, first.y);
  for (const point of points.slice(1)) shape.lineTo(point.x, point.y);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: halfDepth * 2,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -halfDepth);
  return geometry;
}

export interface LoftSection {
  center: THREE.Vector3;
  radiusY: number;
  radiusZ: number;
}

/** Builds a faceted volume along the X axis from elliptical cross-sections. */
export function loftGeometry(
  sections: readonly LoftSection[],
  radialSegments = 8,
): THREE.BufferGeometry {
  if (sections.length < 2) throw new Error('A loft needs at least two sections.');
  if (radialSegments < 3) throw new Error('A loft needs at least three radial segments.');

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    if (!section) continue;
    for (let index = 0; index < radialSegments; index += 1) {
      const angle = (index / radialSegments) * Math.PI * 2;
      positions.push(
        section.center.x,
        section.center.y + Math.cos(angle) * section.radiusY,
        section.center.z + Math.sin(angle) * section.radiusZ,
      );
      uvs.push(sectionIndex / (sections.length - 1), index / radialSegments);
    }
  }

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    const ringStart = sectionIndex * radialSegments;
    const nextRingStart = (sectionIndex + 1) * radialSegments;
    for (let index = 0; index < radialSegments; index += 1) {
      const next = (index + 1) % radialSegments;
      const a = ringStart + index;
      const b = ringStart + next;
      const c = nextRingStart + index;
      const d = nextRingStart + next;
      indices.push(a, b, c, b, d, c);
    }
  }

  const startCenterIndex = positions.length / 3;
  const start = sections[0];
  const endCenterIndex = startCenterIndex + 1;
  const end = sections[sections.length - 1];
  if (!start || !end) throw new Error('A loft needs start and end sections.');
  positions.push(start.center.x, start.center.y, start.center.z);
  positions.push(end.center.x, end.center.y, end.center.z);
  uvs.push(0, 0.5, 1, 0.5);

  const endRingStart = (sections.length - 1) * radialSegments;
  for (let index = 0; index < radialSegments; index += 1) {
    const next = (index + 1) % radialSegments;
    indices.push(startCenterIndex, next, index);
    indices.push(endCenterIndex, endRingStart + index, endRingStart + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function setShadowFlags(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
  });
}
