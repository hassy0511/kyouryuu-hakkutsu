import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new THREE.Vector3(0, 1, 0);

export class ColorGeometryBatch {
  readonly #geometries: THREE.BufferGeometry[] = [];

  add(
    geometry: THREE.BufferGeometry,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    color: THREE.ColorRepresentation,
    quaternion = new THREE.Quaternion(),
  ): void {
    const compatible = geometry.index ? geometry.toNonIndexed() : geometry;
    compatible.applyMatrix4(new THREE.Matrix4().compose(position, quaternion, scale));
    const vertexColor = new THREE.Color(color);
    const positionAttribute = compatible.getAttribute('position');
    if (!positionAttribute) throw new Error('Character geometry needs a position attribute.');
    const colors = new Float32Array(positionAttribute.count * 3);
    for (let index = 0; index < positionAttribute.count; index += 1) {
      colors[index * 3] = vertexColor.r;
      colors[index * 3 + 1] = vertexColor.g;
      colors[index * 3 + 2] = vertexColor.b;
    }
    compatible.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.#geometries.push(compatible);
  }

  addBetween(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radiusStart: number,
    radiusEnd: number,
    color: THREE.ColorRepresentation,
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
      color,
      quaternion,
    );
  }

  ellipsoid(
    position: THREE.Vector3,
    scale: THREE.Vector3,
    color: THREE.ColorRepresentation,
    widthSegments = 10,
    heightSegments = 7,
  ): void {
    this.add(new THREE.SphereGeometry(1, widthSegments, heightSegments), position, scale, color);
  }

  toMesh(name: string): THREE.Mesh {
    const geometry = mergeGeometries(this.#geometries, false);
    if (!geometry) throw new Error(`Could not merge character geometry: ${name}`);
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.78,
        metalness: 0,
      }),
    );
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    return mesh;
  }
}

export function setCharacterShadowFlags(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
  });
}
