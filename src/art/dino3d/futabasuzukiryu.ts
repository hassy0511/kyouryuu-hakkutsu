import * as THREE from 'three';
import { setShadowFlags } from './common';
import { buildPlesiosaurus } from './plesiosaurus';
import type { DinoViews } from './spinosaurus';

export const FUTABASUZUKIRYU_COLORS = {
  back: '#5B8AA6',
  belly: '#EFE8CC',
  paddleTip: '#3E5F80',
} as const;

function stretchSlenderNeck(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      if (x <= 0.4) continue;
      const blend = THREE.MathUtils.smoothstep(x, 0.4, 0.68);
      const stretchedX = 0.4 + (x - 0.4) * 1.78;
      const slenderFactor = THREE.MathUtils.lerp(1, 0.78, blend);
      position.setXYZ(
        index,
        THREE.MathUtils.lerp(x, stretchedX, blend),
        1.08 + (position.getY(index) - 1.08) * slenderFactor,
        position.getZ(index) * slenderFactor,
      );
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function recolorLiving(root: THREE.Group): void {
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !(object.material instanceof THREE.MeshStandardMaterial)
    ) {
      return;
    }
    if (object.name.includes('belly')) object.material.color.set(FUTABASUZUKIRYU_COLORS.belly);
    else if (object.name.includes('paddle-tips') || object.name.includes('far-paddles')) {
      object.material.color.set(FUTABASUZUKIRYU_COLORS.paddleTip);
    } else if (object.name.includes('back-body')) {
      object.material.color.set(FUTABASUZUKIRYU_COLORS.back);
    }
  });
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('plesiosaurus', 'futabasuzukiryu');
  });
}

export function buildFutabasuzukiryu(): DinoViews {
  const views = buildPlesiosaurus();
  stretchSlenderNeck(views.living);
  stretchSlenderNeck(views.skeleton);
  recolorLiving(views.living);
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'futabasuzukiryu-living';
  views.skeleton.name = 'futabasuzukiryu-skeleton';

  // Both views share the same lifted swimming pose above the museum pedestal.
  views.living.position.y += 0.32;
  views.skeleton.position.y += 0.32;
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
