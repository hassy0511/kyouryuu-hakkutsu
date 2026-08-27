import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

const COLORS = {
  shell: '#7A6E3E',
  belly: '#C9BD8A',
  dark: '#5E5430',
  eye: '#26251E',
  fossil: '#F2EAD8',
  fossilShade: '#D7C9A9',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const Z_AXIS = V(0, 0, 1);

interface Palette {
  shell: THREE.ColorRepresentation;
  shade: THREE.ColorRepresentation;
  dark: THREE.ColorRepresentation;
  organic: boolean;
}

function addPincer(limbs: GeometryBatch, tips: GeometryBatch, side: -1 | 1, fossil: boolean): void {
  const shoulder = V(0.72, 1.04, side * 0.29);
  const elbow = V(1.12, 0.96, side * 0.5);
  const wrist = V(1.5, 0.9, side * 0.66);
  const palm = V(1.72, 0.9, side * 0.65);
  limbs.addBetween(shoulder, elbow, 0.065, 0.055, 7);
  limbs.addBetween(elbow, wrist, 0.055, 0.042, 7);
  limbs.addBetween(wrist, palm, 0.09, 0.08, 7);
  ellipsoid(limbs, wrist, V(0.11, 0.09, 0.09), 7, 5);
  const spread = fossil ? 0.12 : 0.16;
  coneBetween(tips, palm, V(2.05, 0.99, side * (0.65 + spread)), 0.055, 6);
  coneBetween(tips, palm, V(2.08, 0.8, side * (0.65 - spread * 0.55)), 0.05, 6);
}

function addOar(limbs: GeometryBatch, paddles: GeometryBatch, side: -1 | 1): void {
  const root = V(0.02, 0.92, side * 0.31);
  const joint = V(-0.12, 0.78, side * 0.58);
  const paddle = V(-0.2, 0.72, side * 0.94);
  limbs.addBetween(root, joint, 0.055, 0.04, 7);
  limbs.addBetween(joint, paddle, 0.04, 0.03, 6);
  const quaternion = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, side * 0.18);
  ellipsoid(paddles, V(-0.27, 0.72, side * 1.05), V(0.32, 0.055, 0.25), 9, 5, quaternion);
}

function addWalkingLegs(limbs: GeometryBatch, side: -1 | 1): void {
  for (let index = 0; index < 3; index += 1) {
    const x = 0.55 - index * 0.25;
    const root = V(x, 0.94, side * 0.3);
    const joint = V(x + 0.03, 0.72, side * (0.48 + index * 0.04));
    const tip = V(x + 0.16, 0.62, side * (0.7 + index * 0.06));
    limbs.addBetween(root, joint, 0.032, 0.024, 6);
    limbs.addBetween(joint, tip, 0.024, 0.012, 5);
  }
}

function createEurypterus(name: string, palette: Palette, fossil: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const shell = new GeometryBatch();
  const shade = new GeometryBatch();
  const limbs = new GeometryBatch();
  const paddles = new GeometryBatch();
  const tips = new GeometryBatch();
  const eyes = new GeometryBatch();

  ellipsoid(shell, V(0.63, 1.02, 0), V(0.48, 0.2, 0.48), 11, 6);
  for (let index = 0; index < 8; index += 1) {
    const x = 0.22 - index * 0.21;
    const taper = 1 - index * 0.075;
    ellipsoid(shell, V(x, 1, 0), V(0.135, 0.155, 0.39 * taper), 8, 5);
    ellipsoid(shade, V(x + 0.075, 1.12, 0), V(0.024, 0.02, 0.33 * taper), 6, 4);
  }
  const tailPoints = [V(-1.44, 1, 0), V(-1.65, 0.99, 0), V(-1.84, 0.98, 0), V(-2.01, 0.96, 0)];
  tailPoints.forEach((point, index) => {
    const radius = 0.17 - index * 0.03;
    ellipsoid(shell, point, V(0.13, radius * 0.7, radius), 7, 5);
  });
  coneBetween(tips, V(-1.98, 0.96, 0), V(-2.55, 0.93, 0), 0.095, 7);

  for (const side of [-1, 1]) {
    addPincer(limbs, tips, side as -1 | 1, fossil);
    addOar(limbs, paddles, side as -1 | 1);
    addWalkingLegs(limbs, side as -1 | 1);
    ellipsoid(eyes, V(0.82, 1.2, side * 0.19), V(0.095, 0.065, 0.065), 8, 5);
  }

  const material = palette.organic ? makeOrganicMaterial : makeFlatMaterial;
  group.add(
    paddles.toMesh(material(palette.shade), `${name}-swimming-paddles`),
    shell.toMesh(material(palette.shell), `${name}-segmented-shell`),
    shade.toMesh(material(palette.shade), `${name}-segment-seams`),
    limbs.toMesh(material(palette.shell), `${name}-connected-limbs-pincers`),
    tips.toMesh(material(palette.dark), `${name}-pincer-tips-tail-spike`),
    eyes.toMesh(material(palette.dark), `${name}-eyes`),
  );
  setShadowFlags(group);
  return group;
}

function buildLiving(): THREE.Group {
  return createEurypterus(
    'eurypterus-living',
    { shell: COLORS.shell, shade: COLORS.belly, dark: COLORS.dark, organic: true },
    false,
  );
}

function buildFossil(): THREE.Group {
  return createEurypterus(
    'eurypterus-fossil-shell',
    {
      shell: COLORS.fossil,
      shade: COLORS.fossilShade,
      dark: COLORS.eye,
      organic: false,
    },
    true,
  );
}

export function buildEurypterus(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
