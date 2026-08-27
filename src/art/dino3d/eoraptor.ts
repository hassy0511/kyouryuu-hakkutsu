import * as THREE from 'three';
import { setShadowFlags } from './common';
import type { DinoViews } from './spinosaurus';
import { buildVelociraptor } from './velociraptor';

export const EORAPTOR_COLORS = {
  body: '#A08A5A',
  bodyShade: '#806D48',
  belly: '#EFE6C8',
  iris: '#3E5C40',
} as const;

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
    if (object.name.includes('far-limbs')) object.material.color.set(EORAPTOR_COLORS.bodyShade);
    else if (object.name.endsWith('-body')) object.material.color.set(EORAPTOR_COLORS.body);
    else if (object.name.includes('belly')) object.material.color.set(EORAPTOR_COLORS.belly);
    else if (object.name.includes('claws-teeth')) object.material.color.set(EORAPTOR_COLORS.belly);
    else if (object.name.includes('irises')) object.material.color.set(EORAPTOR_COLORS.iris);
  });
}

function reshapeChildProportions(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      let x = position.getX(index);
      let y = position.getY(index);
      let z = position.getZ(index);

      // Eoraptor lacked the raised dromaeosaur sickle toe: settle it alongside the other toes.
      if (y > 0.22 && y < 0.62 && Math.abs(z) > 0.34) {
        y = 0.19 + (y - 0.22) * 0.08;
      }

      // A slightly oversized head and narrow trunk give the small animal childlike proportions.
      if (x > 1.24) {
        x = 1.24 + (x - 1.24) * 1.1;
        y = 2.3 + (y - 2.3) * 1.1;
        z *= 1.04;
      } else if (x > -2.4 && y > 1.35) {
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

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('velociraptor', 'eoraptor');
  });
}

export function buildEoraptor(): DinoViews {
  const views = buildVelociraptor();
  removeNamed(views.living, 'velociraptor-feathers');
  recolorLiving(views.living);
  reshapeChildProportions(views.living);
  reshapeChildProportions(views.skeleton);
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'eoraptor-living';
  views.skeleton.name = 'eoraptor-skeleton';

  views.living.rotation.z = -0.035;
  views.skeleton.rotation.z = -0.035;
  views.living.scale.z = 0.9;
  views.skeleton.scale.z = 0.9;
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
