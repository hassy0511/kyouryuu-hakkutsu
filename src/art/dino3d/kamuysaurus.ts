import * as THREE from 'three';
import {
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import { buildParasaurolophus } from './parasaurolophus';
import type { DinoViews } from './spinosaurus';

export const KAMUYSAURUS_COLORS = {
  body: '#7E9B6A',
  belly: '#EFE6C0',
  crest: '#C0563E',
  bone: '#F2EAD8',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

function removeNamed(root: THREE.Group, name: string): void {
  const object = root.getObjectByName(name);
  object?.parent?.remove(object);
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('parasaurolophus', 'kamuysaurus');
  });
}

function makeSmallCrest(
  color: THREE.ColorRepresentation,
  name: string,
  skeleton = false,
): THREE.Mesh {
  const crest = new GeometryBatch();
  const factor = skeleton ? 0.72 : 1;
  crest.add(
    loftGeometry(
      [
        {
          center: V(2.22, 3.72, 0),
          radiusY: 0.08 * factor,
          radiusZ: 0.2 * factor,
        },
        {
          center: V(2.48, 3.86, 0),
          radiusY: 0.18 * factor,
          radiusZ: 0.3 * factor,
        },
        {
          center: V(2.76, 3.8, 0),
          radiusY: 0.12 * factor,
          radiusZ: 0.25 * factor,
        },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  return crest.toMesh(skeleton ? makeFlatMaterial(color) : makeOrganicMaterial(color), name);
}

function makeSkullOpenings(): THREE.Mesh {
  const dark = new GeometryBatch();
  for (const side of SIDES) {
    ellipsoid(dark, V(3.0, 3.42, side * 0.38), V(0.19, 0.16, 0.045), 7, 5);
    ellipsoid(dark, V(3.5, 3.2, side * 0.3), V(0.2, 0.1, 0.034), 7, 5);
  }
  return dark.toMesh(makeFlatMaterial(KAMUYSAURUS_COLORS.dark), 'kamuysaurus-skull-openings');
}

export function buildKamuysaurus(): DinoViews {
  const views = buildParasaurolophus();
  const { living, skeleton } = views;

  // Kamuysaurus has only a low crest; remove the long tubular Parasaurolophus crest entirely.
  removeNamed(living, 'parasaurolophus-red-crest');
  removeNamed(skeleton, 'parasaurolophus-skeleton-crest');
  removeNamed(skeleton, 'parasaurolophus-skull-openings');

  renameTree(living);
  renameTree(skeleton);
  living.name = 'kamuysaurus-living';
  skeleton.name = 'kamuysaurus-skeleton';

  living.add(makeSmallCrest(KAMUYSAURUS_COLORS.crest, 'kamuysaurus-small-crest'));
  skeleton.add(
    makeSmallCrest(KAMUYSAURUS_COLORS.bone, 'kamuysaurus-skeleton-small-crest', true),
    makeSkullOpenings(),
  );
  setShadowFlags(living);
  setShadowFlags(skeleton);
  return views;
}
