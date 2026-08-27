import * as THREE from 'three';
import { buildAllosaurus } from './allosaurus';
import {
  embeddedSideZ,
  GeometryBatch,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

export const HERRERASAURUS_COLORS = {
  body: '#6E5A48',
  bodyShade: '#554538',
  belly: '#E8D9B0',
  stripe: '#4A3A2E',
  iris: '#B88748',
} as const;

const SIDES = [-1, 1] as const;
const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

function removeNamed(root: THREE.Group, name: string): void {
  const object = root.getObjectByName(name);
  object?.parent?.remove(object);
}

function recolorLiving(root: THREE.Group): void {
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !(object.material instanceof THREE.MeshStandardMaterial)
    ) {
      return;
    }
    if (object.name.includes('far-limbs'))
      object.material.color.set(HERRERASAURUS_COLORS.bodyShade);
    else if (object.name.endsWith('-body')) object.material.color.set(HERRERASAURUS_COLORS.body);
    else if (object.name.includes('belly')) object.material.color.set(HERRERASAURUS_COLORS.belly);
    else if (object.name.includes('claws-teeth'))
      object.material.color.set(HERRERASAURUS_COLORS.belly);
    else if (object.name.includes('irises')) object.material.color.set(HERRERASAURUS_COLORS.iris);
  });
}

function extendArms(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (
      !object.name.includes('body') &&
      !object.name.includes('far-limbs') &&
      !object.name.includes('skeleton-bones')
    ) {
      return;
    }
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      if (x < 0.95 || x > 2.25 || y < 2.05 || y > 3.05 || Math.abs(z) < 0.34) continue;
      const reach = THREE.MathUtils.clamp((3.05 - y) / 0.95, 0, 1);
      position.setXYZ(index, x + 0.2 * reach, y - 0.08 * reach, z);
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function flattenSkeletonBrow(root: THREE.Group): void {
  const bones = root.getObjectByName('allosaurus-skeleton-bones');
  if (!(bones instanceof THREE.Mesh)) return;
  const position = bones.geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    if (x > 1.9 && x < 2.55 && y > 3.82) position.setY(index, 3.8);
  }
  position.needsUpdate = true;
  bones.geometry.computeVertexNormals();
  bones.geometry.computeBoundingBox();
  bones.geometry.computeBoundingSphere();
}

function makeBackStripes(): THREE.Mesh {
  const stripes = new GeometryBatch();
  const bands = [
    { x: -1.55, top: 3.35, bottom: 2.82, surface: 0.7 },
    { x: -0.83, top: 3.58, bottom: 2.87, surface: 0.78 },
    { x: -0.08, top: 3.6, bottom: 2.9, surface: 0.75 },
    { x: 0.62, top: 3.49, bottom: 2.96, surface: 0.62 },
  ] as const;
  for (const side of SIDES) {
    for (const band of bands) {
      stripes.add(
        silhouetteGeometry(
          [
            new THREE.Vector2(band.x - 0.11, band.top),
            new THREE.Vector2(band.x + 0.12, band.top - 0.04),
            new THREE.Vector2(band.x + 0.08, band.bottom),
            new THREE.Vector2(band.x - 0.17, band.bottom + 0.08),
          ],
          0.028,
        ),
        V(0, 0, embeddedSideZ(side, band.surface, 0.028, 0.15)),
      );
    }
  }
  return stripes.toMesh(
    makeOrganicMaterial(HERRERASAURUS_COLORS.stripe),
    'herrerasaurus-back-stripes',
  );
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('allosaurus', 'herrerasaurus');
  });
}

export function buildHerrerasaurus(): DinoViews {
  const views = buildAllosaurus();
  removeNamed(views.living, 'allosaurus-brow-ridges');
  recolorLiving(views.living);
  extendArms(views.living);
  extendArms(views.skeleton);
  flattenSkeletonBrow(views.skeleton);
  views.living.add(makeBackStripes());
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'herrerasaurus-living';
  views.skeleton.name = 'herrerasaurus-skeleton';

  // A low, horizontal early-theropod silhouette with a long counterbalancing tail.
  views.living.scale.set(1, 0.94, 0.9);
  views.skeleton.scale.set(1, 0.94, 0.9);
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
