import * as THREE from 'three';
import {
  ellipsoid,
  embeddedSideZ,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import { buildIguanodon } from './iguanodon';
import type { DinoViews } from './spinosaurus';

export const FUKUISAURUS_COLORS = {
  body: '#8FA764',
  belly: '#EFE6C0',
  stripe: '#6C8248',
  bone: '#F2EAD8',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

function shortenLivingThumbSpikes(root: THREE.Group): void {
  const cream = root.getObjectByName('iguanodon-beak-spikes-claws');
  if (!(cream instanceof THREE.Mesh)) return;
  const position = cream.geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    if (x > 1.65 && x < 2.4 && y > 2.16 && Math.abs(z) > 0.45) {
      position.setY(index, 2.16 + (y - 2.16) * 0.18);
    }
  }
  position.needsUpdate = true;
  cream.geometry.computeVertexNormals();
  cream.geometry.computeBoundingBox();
  cream.geometry.computeBoundingSphere();
}

function shortenSkeletonThumbSpikes(root: THREE.Group): void {
  const bones = root.getObjectByName('iguanodon-skeleton-bones');
  if (!(bones instanceof THREE.Mesh)) return;
  const position = bones.geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    if (x > 1.65 && x < 2.4 && y > 2.22 && Math.abs(z) > 0.45) {
      position.setY(index, 2.22 + (y - 2.22) * 0.2);
    }
  }
  position.needsUpdate = true;
  bones.geometry.computeVertexNormals();
  bones.geometry.computeBoundingBox();
  bones.geometry.computeBoundingSphere();
}

function makeDorsalBands(): THREE.Mesh {
  const stripes = new GeometryBatch();
  const bands = [
    { x: -1.72, top: 3.15, bottom: 2.68, surface: 0.72 },
    { x: -0.86, top: 3.46, bottom: 2.75, surface: 0.88 },
    { x: 0.02, top: 3.48, bottom: 2.7, surface: 0.84 },
    { x: 0.82, top: 3.32, bottom: 2.72, surface: 0.67 },
  ] as const;
  for (const side of SIDES) {
    for (const band of bands) {
      stripes.add(
        silhouetteGeometry(
          [
            new THREE.Vector2(band.x - 0.13, band.top),
            new THREE.Vector2(band.x + 0.13, band.top),
            new THREE.Vector2(band.x + 0.08, band.bottom),
            new THREE.Vector2(band.x - 0.18, band.bottom + 0.08),
          ],
          0.035,
        ),
        V(0, 0, embeddedSideZ(side, band.surface, 0.035, 0.18)),
      );
    }
  }
  return stripes.toMesh(makeOrganicMaterial(FUKUISAURUS_COLORS.stripe), 'fukuisaurus-dorsal-bands');
}

function makeGrindingTeeth(skeleton: boolean): THREE.Mesh {
  const teeth = new GeometryBatch();
  for (const side of SIDES) {
    for (let index = 0; index < 5; index += 1) {
      const x = 3.2 + index * 0.16;
      const surface = 0.34 - index * 0.025;
      ellipsoid(
        teeth,
        V(x, 3.1, skeleton ? side * surface : embeddedSideZ(side, surface, 0.016, 0.08)),
        V(0.055, 0.028, 0.016),
        6,
        4,
      );
    }
  }
  return teeth.toMesh(
    skeleton
      ? makeFlatMaterial(FUKUISAURUS_COLORS.bone)
      : makeOrganicMaterial(FUKUISAURUS_COLORS.bone),
    skeleton ? 'fukuisaurus-skeleton-tooth-batteries' : 'fukuisaurus-grinding-teeth',
  );
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('iguanodon', 'fukuisaurus');
  });
}

export function buildFukuisaurus(): DinoViews {
  const views = buildIguanodon();
  shortenLivingThumbSpikes(views.living);
  shortenSkeletonThumbSpikes(views.skeleton);
  views.living.add(makeDorsalBands(), makeGrindingTeeth(false));
  views.skeleton.add(makeGrindingTeeth(true));
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'fukuisaurus-living';
  views.skeleton.name = 'fukuisaurus-skeleton';

  // Actual model coordinates stay one size below the related Iguanodon asset.
  views.living.scale.setScalar(0.88);
  views.skeleton.scale.setScalar(0.88);
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
