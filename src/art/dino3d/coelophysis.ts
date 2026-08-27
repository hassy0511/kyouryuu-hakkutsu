import * as THREE from 'three';
import {
  embeddedSideZ,
  GeometryBatch,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import { buildEoraptor } from './eoraptor';
import type { DinoViews } from './spinosaurus';

export const COELOPHYSIS_COLORS = {
  body: '#7A8A6A',
  bodyShade: '#627055',
  belly: '#EFE6C8',
  stripe: '#5A6A4E',
  iris: '#B89A45',
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
    if (object.name.includes('far-limbs')) object.material.color.set(COELOPHYSIS_COLORS.bodyShade);
    else if (object.name.endsWith('-body')) object.material.color.set(COELOPHYSIS_COLORS.body);
    else if (object.name.includes('belly')) object.material.color.set(COELOPHYSIS_COLORS.belly);
    else if (object.name.includes('claws-teeth'))
      object.material.color.set(COELOPHYSIS_COLORS.belly);
    else if (object.name.includes('irises')) object.material.color.set(COELOPHYSIS_COLORS.iris);
  });
}

function makeSlenderSProfile(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      let x = position.getX(index);
      let y = position.getY(index);
      let z = position.getZ(index);

      if (x < -1.45) {
        const centerY = 1.98 + (x + 1.45) * 0.09;
        x = -1.45 + (x + 1.45) * 1.17;
        y = centerY + (y - centerY) * 0.76;
        z *= 0.72;
      } else if (x < 0.25 && y > 1.3) {
        const centerY = 2.08 + (x + 1.45) * 0.08;
        y = centerY + (y - centerY) * 0.83;
        z *= 0.78;
      }

      if (x > 0.18 && x < 1.48 && y > 1.65) {
        const phase = ((x - 0.18) / 1.3) * Math.PI * 2;
        y += Math.sin(phase - 0.35) * 0.11;
        z *= 0.86;
      }

      position.setXYZ(index, x, y, z);
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function makeSideStripe(): THREE.Mesh {
  const stripe = new GeometryBatch();
  const segments = [
    { left: -4.3, right: -2.8, y: 1.86, surface: 0.11 },
    { left: -2.82, right: -1.55, y: 1.99, surface: 0.31 },
    { left: -1.58, right: -0.3, y: 2.19, surface: 0.47 },
    { left: -0.33, right: 0.62, y: 2.31, surface: 0.34 },
    { left: 0.57, right: 1.35, y: 2.4, surface: 0.27 },
  ] as const;
  for (const side of SIDES) {
    for (const segment of segments) {
      stripe.add(
        silhouetteGeometry(
          [
            new THREE.Vector2(segment.left, segment.y + 0.055),
            new THREE.Vector2(segment.right, segment.y + 0.045),
            new THREE.Vector2(segment.right, segment.y - 0.045),
            new THREE.Vector2(segment.left, segment.y - 0.035),
          ],
          0.018,
        ),
        V(0, 0, embeddedSideZ(side, segment.surface, 0.018, 0.12)),
      );
    }
  }
  return stripe.toMesh(makeOrganicMaterial(COELOPHYSIS_COLORS.stripe), 'coelophysis-side-stripe');
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('eoraptor', 'coelophysis');
  });
}

export function buildCoelophysis(): DinoViews {
  const views = buildEoraptor();
  recolorLiving(views.living);
  makeSlenderSProfile(views.living);
  makeSlenderSProfile(views.skeleton);
  views.living.add(makeSideStripe());
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'coelophysis-living';
  views.skeleton.name = 'coelophysis-skeleton';

  views.living.rotation.z = -0.015;
  views.skeleton.rotation.z = -0.015;
  views.living.scale.z = 0.78;
  views.skeleton.scale.z = 0.78;
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
