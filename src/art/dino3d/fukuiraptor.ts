import * as THREE from 'three';
import { buildAllosaurus } from './allosaurus';
import {
  coneBetween,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const FUKUIRAPTOR_COLORS = {
  body: '#7A6248',
  bodyShade: '#604B38',
  belly: '#EFE2C0',
  claw: '#F2EAD8',
  iris: '#C68B38',
  bone: '#F2EAD8',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const HANDS = [
  { wrist: V(1.7, 2.34, 0.6), palm: V(1.84, 2.29, 0.6) },
  { wrist: V(1.48, 2.31, -0.54), palm: V(1.62, 2.26, -0.54) },
] as const;

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
    if (object.name.includes('far-limbs')) object.material.color.set(FUKUIRAPTOR_COLORS.bodyShade);
    else if (object.name.endsWith('-body')) object.material.color.set(FUKUIRAPTOR_COLORS.body);
    else if (object.name.includes('belly')) object.material.color.set(FUKUIRAPTOR_COLORS.belly);
    else if (object.name.includes('claws-teeth'))
      object.material.color.set(FUKUIRAPTOR_COLORS.claw);
    else if (object.name.includes('irises')) object.material.color.set(FUKUIRAPTOR_COLORS.iris);
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

function makeHandClaws(skeleton: boolean): THREE.Mesh {
  const claws = new GeometryBatch();
  for (const hand of HANDS) {
    for (const [index, zOffset] of [-0.13, 0, 0.13].entries()) {
      const fingerBase = V(hand.palm.x, hand.palm.y - index * 0.06, hand.palm.z + zOffset * 0.42);
      const clawBase = V(
        hand.palm.x + 0.38,
        hand.palm.y - 0.13 - index * 0.12,
        hand.palm.z + zOffset,
      );
      const clawTip = V(
        hand.palm.x + 0.72,
        hand.palm.y - 0.28 - index * 0.18,
        hand.palm.z + zOffset * 1.05,
      );
      if (skeleton) claws.addBetween(fingerBase, clawBase, 0.018, 0.01, 5);
      coneBetween(claws, clawBase, clawTip, skeleton ? 0.045 : 0.075, 7);
    }
  }
  return claws.toMesh(
    skeleton
      ? makeFlatMaterial(FUKUIRAPTOR_COLORS.bone)
      : makeOrganicMaterial(FUKUIRAPTOR_COLORS.claw),
    skeleton ? 'fukuiraptor-skeleton-hand-claws' : 'fukuiraptor-large-hand-claws',
  );
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('allosaurus', 'fukuiraptor');
  });
}

export function buildFukuiraptor(): DinoViews {
  const views = buildAllosaurus();
  removeNamed(views.living, 'allosaurus-brow-ridges');
  recolorLiving(views.living);
  flattenSkeletonBrow(views.skeleton);
  views.living.add(makeHandClaws(false));
  views.skeleton.add(makeHandClaws(true));
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'fukuiraptor-living';
  views.skeleton.name = 'fukuiraptor-skeleton';

  // A narrower chest and slightly lower profile distinguish it from the heavier Allosaurus.
  views.living.scale.set(1, 0.92, 0.84);
  views.skeleton.scale.set(1, 0.92, 0.84);
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
