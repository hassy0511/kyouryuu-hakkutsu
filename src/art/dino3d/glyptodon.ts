import * as THREE from 'three';
import { buildAnkylosaurus } from './ankylosaurus';
import {
  ellipsoid,
  embeddedSideZ,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

export const GLYPTODON_COLORS = {
  shell: '#8A7A5E',
  shellShade: '#786A52',
  body: '#6E5A48',
  bodyShade: '#59483A',
  belly: '#D9C9A8',
  bone: '#F2EAD8',
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
    if (object.name.includes('far-legs')) object.material.color.set(GLYPTODON_COLORS.bodyShade);
    else if (object.name.endsWith('-body')) object.material.color.set(GLYPTODON_COLORS.body);
    else if (object.name.includes('belly')) object.material.color.set(GLYPTODON_COLORS.belly);
  });
}

function compactBody(root: THREE.Group, skeleton: boolean): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      let x = position.getX(index);
      let y = position.getY(index);
      let z = position.getZ(index);
      if (x < -1.9) x = -1.9 + (x + 1.9) * 0.37;
      if (x > 2.05) x = 2.05 + (x - 2.05) * 0.55;
      if (skeleton && x > 2.25 && y > 1.17 && Math.abs(z) > 0.36) {
        y = 1.17 + (y - 1.17) * 0.2;
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

function makeShell(skeleton: boolean): THREE.Mesh {
  const shell = new GeometryBatch();
  ellipsoid(shell, V(-0.15, 1.45, 0), V(2.15, 1.08, 1.18), 13, 8);
  return shell.toMesh(
    skeleton
      ? makeFlatMaterial(GLYPTODON_COLORS.bone)
      : makeOrganicMaterial(GLYPTODON_COLORS.shell),
    skeleton ? 'glyptodon-skeleton-shell' : 'glyptodon-domed-shell',
  );
}

function hexagon(cx: number, cy: number, radius: number): readonly THREE.Vector2[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return new THREE.Vector2(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  });
}

function makeShellTiles(skeleton: boolean): THREE.Mesh {
  const tiles = new GeometryBatch();
  const markings = [
    { x: -1.25, y: 1.62, surface: 0.9, r: 0.23 },
    { x: -0.72, y: 1.93, surface: 1.08, r: 0.25 },
    { x: -0.12, y: 2.08, surface: 1.15, r: 0.26 },
    { x: 0.5, y: 1.97, surface: 1.1, r: 0.25 },
    { x: 1.08, y: 1.66, surface: 0.93, r: 0.23 },
    { x: -0.35, y: 1.5, surface: 1.17, r: 0.22 },
    { x: 0.3, y: 1.48, surface: 1.16, r: 0.22 },
  ] as const;
  for (const side of SIDES) {
    for (const mark of markings) {
      tiles.add(
        silhouetteGeometry(hexagon(mark.x, mark.y, mark.r * 0.62), 0.014),
        V(0, 0, embeddedSideZ(side, mark.surface, 0.014, 0.05)),
      );
    }
  }
  return tiles.toMesh(
    skeleton
      ? makeFlatMaterial(GLYPTODON_COLORS.boneShade)
      : makeOrganicMaterial(GLYPTODON_COLORS.shellShade),
    skeleton ? 'glyptodon-skeleton-shell-tiles' : 'glyptodon-shell-tiles',
  );
}

function makeTailTube(skeleton: boolean): THREE.Mesh {
  const tube = new GeometryBatch();
  const rings = [
    { x: -2.0, scale: V(0.34, 0.39, 0.48) },
    { x: -2.24, scale: V(0.31, 0.34, 0.42) },
    { x: -2.46, scale: V(0.28, 0.29, 0.35) },
    { x: -2.65, scale: V(0.23, 0.23, 0.28) },
  ] as const;
  for (const ring of rings) ellipsoid(tube, V(ring.x, 1.02, 0), ring.scale, 8, 5);
  return tube.toMesh(
    skeleton
      ? makeFlatMaterial(GLYPTODON_COLORS.bone)
      : makeOrganicMaterial(GLYPTODON_COLORS.shell),
    skeleton ? 'glyptodon-skeleton-tail-tube' : 'glyptodon-tail-tube',
  );
}

function renameTree(root: THREE.Group): void {
  root.traverse((object) => {
    object.name = object.name.replace('ankylosaurus', 'glyptodon');
  });
}

export function buildGlyptodon(): DinoViews {
  const views = buildAnkylosaurus();
  removeNamed(views.living, 'ankylosaurus-armor-bands');
  removeNamed(views.living, 'ankylosaurus-armor-spikes');
  removeNamed(views.living, 'ankylosaurus-tail-club');
  removeNamed(views.living, 'ankylosaurus-horns-claws');
  removeNamed(views.skeleton, 'ankylosaurus-skeleton-armor');
  recolorLiving(views.living);
  compactBody(views.living, false);
  compactBody(views.skeleton, true);
  views.living.add(makeShell(false), makeShellTiles(false), makeTailTube(false));
  views.skeleton.add(makeShell(true), makeShellTiles(true), makeTailTube(true));
  renameTree(views.living);
  renameTree(views.skeleton);
  views.living.name = 'glyptodon-living';
  views.skeleton.name = 'glyptodon-skeleton';

  views.living.scale.set(0.94, 1, 0.94);
  views.skeleton.scale.set(0.94, 1, 0.94);
  setShadowFlags(views.living);
  setShadowFlags(views.skeleton);
  return views;
}
