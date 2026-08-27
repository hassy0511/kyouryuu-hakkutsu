import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import { buildMammoth } from './mammoth';
import type { DinoViews } from './spinosaurus';

export const WOOLLY_RHINO_COLORS = {
  fur: '#7A5A42',
  furShade: '#5E4736',
  horn: '#D9CBB0',
  eye: '#332821',
  boneShade: '#D7C9A9',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

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
    if (object.name.includes('far-legs') || object.name.includes('undercoat'))
      object.material.color.set(WOOLLY_RHINO_COLORS.furShade);
    else if (object.name.includes('fur-body')) object.material.color.set(WOOLLY_RHINO_COLORS.fur);
    else if (object.name.includes('eyes')) object.material.color.set(WOOLLY_RHINO_COLORS.eye);
  });
}

function reshapeLiving(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      let x = position.getX(index);
      let y = position.getY(index);
      let z = position.getZ(index);

      // Collapse the mammoth trunk into a short, solid rhinoceros muzzle.
      if (object.name.includes('fur-body') && x > 1.45 && y < 2.3) {
        x = 1.45 + (x - 1.45) * 0.5;
        y = 2.18 + (y - 2.18) * 0.16;
        z *= 0.86;
      }
      if (x > 0.68) {
        x = 0.68 + (x - 0.68) * 1.12;
        y = 2.5 + (y - 2.5) * 0.76;
        z *= 0.84;
      }

      position.setXYZ(index, x, y, z);
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function reshapeSkeleton(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      let x = position.getX(index);
      let y = position.getY(index);
      let z = position.getZ(index);
      if (x > 0.68) {
        x = 0.68 + (x - 0.68) * 1.16;
        y = 2.48 + (y - 2.48) * 0.72;
        z *= 0.83;
      }
      position.setXYZ(index, x, y, z);
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function makeLivingHorns(): THREE.Mesh {
  const horns = new GeometryBatch();
  coneBetween(horns, V(1.63, 2.66, 0), V(2.28, 3.03, 0), 0.22, 9);
  coneBetween(horns, V(1.1, 2.98, 0), V(1.36, 3.3, 0), 0.12, 8);
  return horns.toMesh(makeOrganicMaterial(WOOLLY_RHINO_COLORS.horn), 'woollyrhino-keratin-horns');
}

function makeSmallEars(): THREE.Mesh {
  const ears = new GeometryBatch();
  for (const side of SIDES) {
    coneBetween(ears, V(0.93, 2.78, side * 0.36), V(0.86, 3.02, side * 0.49), 0.095, 7);
  }
  return ears.toMesh(makeOrganicMaterial(WOOLLY_RHINO_COLORS.furShade), 'woollyrhino-small-ears');
}

function makeNasalHornBase(): THREE.Mesh {
  const base = new GeometryBatch();
  ellipsoid(base, V(1.61, 2.69, 0), V(0.28, 0.065, 0.27), 8, 5);
  for (const side of SIDES) {
    ellipsoid(base, V(1.42, 2.69, side * 0.18), V(0.09, 0.045, 0.07), 6, 4);
    ellipsoid(base, V(1.68, 2.68, side * 0.16), V(0.08, 0.04, 0.065), 6, 4);
  }
  return base.toMesh(
    makeFlatMaterial(WOOLLY_RHINO_COLORS.boneShade),
    'woollyrhino-nasal-horn-base',
  );
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('mammoth', 'woollyrhino');
  });
}

export function buildWoollyRhino(): DinoViews {
  const views = buildMammoth();
  removeNamed(views.living, 'mammoth-curled-tusks');
  removeNamed(views.living, 'mammoth-ears');
  removeNamed(views.skeleton, 'mammoth-skeleton-tusks');
  recolorLiving(views.living);
  reshapeLiving(views.living);
  reshapeSkeleton(views.skeleton);
  views.living.add(makeLivingHorns(), makeSmallEars());
  views.skeleton.add(makeNasalHornBase());
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'woollyrhino-living';
  views.skeleton.name = 'woollyrhino-skeleton';

  views.living.scale.set(1.08, 0.9, 1);
  views.skeleton.scale.set(1.08, 0.9, 1);
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
