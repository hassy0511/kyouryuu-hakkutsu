import * as THREE from 'three';
import {
  embeddedSideZ,
  GeometryBatch,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import { buildIguanodon } from './iguanodon';
import type { DinoViews } from './spinosaurus';

export const PLATEOSAURUS_COLORS = {
  body: '#8A9B5E',
  bodyShade: '#6A7A48',
  belly: '#EFE6C0',
  iris: '#99703A',
} as const;

const SIDES = [-1, 1] as const;
const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

function recolorLiving(root: THREE.Group): void {
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !(object.material instanceof THREE.MeshStandardMaterial)
    ) {
      return;
    }
    if (object.name.includes('far-limbs')) object.material.color.set(PLATEOSAURUS_COLORS.bodyShade);
    else if (object.name.endsWith('-body')) object.material.color.set(PLATEOSAURUS_COLORS.body);
    else if (object.name.includes('belly')) object.material.color.set(PLATEOSAURUS_COLORS.belly);
    else if (object.name.includes('beak-spikes-claws'))
      object.material.color.set(PLATEOSAURUS_COLORS.belly);
    else if (object.name.includes('irises')) object.material.color.set(PLATEOSAURUS_COLORS.iris);
  });
}

function shortenThumbSpikes(root: THREE.Group, skeleton: boolean): void {
  const target = root.getObjectByName(
    skeleton ? 'iguanodon-skeleton-bones' : 'iguanodon-beak-spikes-claws',
  );
  if (!(target instanceof THREE.Mesh)) return;
  const position = target.geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    if (x > 1.65 && x < 2.4 && y > 1.98 && Math.abs(z) > 0.45) {
      const nearHand = x > 1.97;
      const anchorX = nearHand ? 2.12 : 1.82;
      const anchorY = nearHand ? 2.06 : 2;
      position.setX(index, anchorX + (x - anchorX) * 0.04);
      position.setY(index, anchorY + (y - anchorY) * 0.02);
    }
  }
  position.needsUpdate = true;
  target.geometry.computeVertexNormals();
  target.geometry.computeBoundingBox();
  target.geometry.computeBoundingSphere();
}

function makeBackBands(): THREE.Mesh {
  const markings = new GeometryBatch();
  const bands = [
    { x: -1.85, top: 3.24, bottom: 2.66, surface: 0.74 },
    { x: -0.92, top: 3.55, bottom: 2.75, surface: 0.9 },
    { x: 0.06, top: 3.62, bottom: 2.82, surface: 0.86 },
    { x: 0.92, top: 3.45, bottom: 2.9, surface: 0.68 },
  ] as const;
  for (const side of SIDES) {
    for (const band of bands) {
      markings.add(
        silhouetteGeometry(
          [
            new THREE.Vector2(band.x - 0.14, band.top),
            new THREE.Vector2(band.x + 0.15, band.top - 0.04),
            new THREE.Vector2(band.x + 0.09, band.bottom),
            new THREE.Vector2(band.x - 0.19, band.bottom + 0.09),
          ],
          0.03,
        ),
        V(0, 0, embeddedSideZ(side, band.surface, 0.03, 0.14)),
      );
    }
  }
  return markings.toMesh(
    makeOrganicMaterial(PLATEOSAURUS_COLORS.bodyShade),
    'plateosaurus-back-bands',
  );
}

function raiseBodyAndLengthenNeck(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      const originalX = position.getX(index);
      const originalY = position.getY(index);
      let x = originalX;
      let y = originalY;
      let z = position.getZ(index);

      const isForearm = originalX > 0.9 && originalY < 2.62 && Math.abs(z) > 0.4;
      if (originalX > 2.18 && originalY > 2.72) {
        x = 2.18 + (originalX - 2.18) * 0.76;
        y = 3.3 + (originalY - 3.3) * 0.8;
        z *= 0.8;
      }

      if (!isForearm && originalX > 1.02 && originalY > 2.5) {
        y += (Math.min(originalX, 2.65) - 1.02) * 0.34;
        x = 1.02 + (x - 1.02) * 0.94;
      }

      if (originalX > -0.78 && originalY > 1.72) {
        const pivotX = -0.62;
        const pivotY = 2.42;
        const angle = 0.2;
        const dx = x - pivotX;
        const dy = y - pivotY;
        x = pivotX + dx * Math.cos(angle) - dy * Math.sin(angle);
        y = pivotY + dx * Math.sin(angle) + dy * Math.cos(angle);
      }

      position.setXYZ(index, x, y, z);
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('iguanodon', 'plateosaurus');
  });
}

export function buildPlateosaurus(): DinoViews {
  const views = buildIguanodon();
  recolorLiving(views.living);
  shortenThumbSpikes(views.living, false);
  shortenThumbSpikes(views.skeleton, true);
  views.living.add(makeBackBands());
  raiseBodyAndLengthenNeck(views.living);
  raiseBodyAndLengthenNeck(views.skeleton);
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'plateosaurus-living';
  views.skeleton.name = 'plateosaurus-skeleton';

  views.living.scale.z = 0.9;
  views.skeleton.scale.z = 0.9;
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
