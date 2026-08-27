import * as THREE from 'three';
import {
  ellipsoid,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

const COLORS = {
  shell: '#6E5A48',
  rim: '#8A7458',
  darkShell: '#514235',
  eye: '#3A3228',
  fossil: '#F2EAD8',
  fossilShade: '#D7C9A9',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

interface ShellPalette {
  center: THREE.ColorRepresentation;
  sides: THREE.ColorRepresentation;
  rim: THREE.ColorRepresentation;
  eye: THREE.ColorRepresentation;
  organic: boolean;
}

function addAntenna(batch: GeometryBatch, side: -1 | 1): void {
  const points = [
    V(0.92, 0.32, side * 0.18),
    V(1.22, 0.3, side * 0.34),
    V(1.48, 0.27, side * 0.48),
    V(1.66, 0.23, side * 0.55),
  ];
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    if (next) batch.addBetween(point, next, 0.016 - index * 0.003, 0.013 - index * 0.003, 5);
  });
}

function buildShell(name: string, palette: ShellPalette, includeAntennae: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const center = new GeometryBatch();
  const sides = new GeometryBatch();
  const rim = new GeometryBatch();
  const eyes = new GeometryBatch();
  const antennae = new GeometryBatch();

  // Broad crescent-like head shield and a small united tail shield.
  ellipsoid(sides, V(0.82, 0.27, 0), V(0.47, 0.11, 0.52), 12, 6);
  ellipsoid(center, V(0.78, 0.34, 0), V(0.3, 0.13, 0.23), 9, 6);
  ellipsoid(sides, V(-1.02, 0.25, 0), V(0.34, 0.095, 0.36), 10, 5);

  for (let index = 0; index < 10; index += 1) {
    const x = 0.43 - index * 0.16;
    const taper = 1 - index * 0.045;
    ellipsoid(center, V(x, 0.31, 0), V(0.102, 0.105, 0.18 * taper), 8, 5);
    for (const side of [-1, 1]) {
      ellipsoid(sides, V(x, 0.265, side * 0.31 * taper), V(0.11, 0.075, 0.2 * taper), 8, 5);
      rim.addBetween(
        V(x + 0.065, 0.315, side * 0.155 * taper),
        V(x + 0.04, 0.285, side * 0.48 * taper),
        0.018,
        0.011,
        5,
      );
    }
  }

  for (const side of [-1, 1]) {
    rim.addBetween(V(0.9, 0.35, side * 0.43), V(0.44, 0.31, side * 0.49), 0.025, 0.018, 6);
    rim.addBetween(V(0.44, 0.31, side * 0.49), V(-0.95, 0.27, side * 0.32), 0.018, 0.012, 6);
    ellipsoid(eyes, V(0.85, 0.38, side * 0.23), V(0.1, 0.075, 0.065), 8, 5);
    if (includeAntennae) addAntenna(antennae, side as -1 | 1);
  }

  const material = palette.organic ? makeOrganicMaterial : makeFlatMaterial;
  group.add(
    sides.toMesh(material(palette.sides), `${name}-side-lobes-shields`),
    center.toMesh(material(palette.center), `${name}-central-lobe`),
    rim.toMesh(material(palette.rim), `${name}-segment-rims`),
    eyes.toMesh(material(palette.eye), `${name}-compound-eyes`),
  );
  if (includeAntennae) {
    group.add(antennae.toMesh(material(palette.eye), `${name}-antennae`));
  }
  setShadowFlags(group);
  return group;
}

function buildLiving(): THREE.Group {
  return buildShell(
    'trilobite-living',
    {
      center: COLORS.darkShell,
      sides: COLORS.shell,
      rim: COLORS.rim,
      eye: COLORS.eye,
      organic: true,
    },
    true,
  );
}

function buildFossil(): THREE.Group {
  return buildShell(
    'trilobite-fossil-shell',
    {
      center: COLORS.fossilShade,
      sides: COLORS.fossil,
      rim: COLORS.fossilShade,
      eye: COLORS.eye,
      organic: false,
    },
    false,
  );
}

export function buildTrilobite(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
