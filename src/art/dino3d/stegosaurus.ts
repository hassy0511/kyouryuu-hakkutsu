import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

export const STEGOSAURUS_COLORS = {
  body: '#A9793F',
  bodyDark: '#7E5932',
  plates: '#C9553F',
  belly: '#EBDFBB',
  spikes: '#F2EAD8',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const LEGS = [
  {
    near: true,
    hind: true,
    upper: V(-1.25, 2.05, 0.68),
    knee: V(-1.4, 1.1, 0.75),
    ankle: V(-1.22, 0.28, 0.78),
    foot: V(-0.9, 0.13, 0.79),
  },
  {
    near: false,
    hind: true,
    upper: V(-1.72, 2.02, -0.59),
    knee: V(-1.45, 1.08, -0.66),
    ankle: V(-1.58, 0.27, -0.69),
    foot: V(-1.25, 0.12, -0.7),
  },
  {
    near: true,
    hind: false,
    upper: V(1.45, 1.55, 0.62),
    knee: V(1.6, 0.82, 0.69),
    ankle: V(1.48, 0.25, 0.71),
    foot: V(1.76, 0.12, 0.72),
  },
  {
    near: false,
    hind: false,
    upper: V(1.08, 1.52, -0.54),
    knee: V(0.9, 0.8, -0.61),
    ankle: V(1.02, 0.24, -0.63),
    foot: V(1.3, 0.11, -0.64),
  },
] as const;

interface PlateSpec {
  x: number;
  baseY: number;
  width: number;
  height: number;
  z: number;
}

const PLATES: readonly PlateSpec[] = [
  { x: -3.25, baseY: 2.05, width: 0.48, height: 0.55, z: 0.18 },
  { x: -2.65, baseY: 2.32, width: 0.62, height: 0.88, z: 0.18 },
  { x: -1.95, baseY: 2.62, width: 0.76, height: 1.18, z: 0.18 },
  { x: -1.15, baseY: 2.83, width: 0.9, height: 1.42, z: 0.18 },
  { x: -0.3, baseY: 2.83, width: 0.86, height: 1.34, z: 0.18 },
  { x: 0.5, baseY: 2.66, width: 0.78, height: 1.08, z: 0.18 },
  { x: 1.22, baseY: 2.38, width: 0.65, height: 0.82, z: 0.18 },
  { x: 1.82, baseY: 2.1, width: 0.52, height: 0.57, z: 0.18 },
  { x: -2.95, baseY: 2.17, width: 0.48, height: 0.62, z: -0.18 },
  { x: -2.3, baseY: 2.48, width: 0.64, height: 0.96, z: -0.18 },
  { x: -1.55, baseY: 2.72, width: 0.8, height: 1.28, z: -0.18 },
  { x: -0.72, baseY: 2.86, width: 0.9, height: 1.45, z: -0.18 },
  { x: 0.1, baseY: 2.76, width: 0.84, height: 1.22, z: -0.18 },
  { x: 0.88, baseY: 2.52, width: 0.72, height: 0.94, z: -0.18 },
  { x: 1.55, baseY: 2.24, width: 0.58, height: 0.67, z: -0.18 },
] as const;

function plateGeometry(plate: PlateSpec): THREE.BufferGeometry {
  const halfWidth = plate.width / 2;
  return silhouetteGeometry(
    [
      new THREE.Vector2(plate.x - halfWidth, plate.baseY),
      new THREE.Vector2(plate.x - halfWidth * 0.82, plate.baseY + plate.height * 0.48),
      new THREE.Vector2(plate.x, plate.baseY + plate.height),
      new THREE.Vector2(plate.x + halfWidth * 0.85, plate.baseY + plate.height * 0.55),
      new THREE.Vector2(plate.x + halfWidth, plate.baseY),
    ],
    0.055,
  );
}

function addPlates(batch: GeometryBatch): void {
  for (const plate of PLATES) batch.add(plateGeometry(plate), V(0, 0, plate.z));
}

function addTailSpikes(batch: GeometryBatch): void {
  for (const side of [-1, 1]) {
    coneBetween(batch, V(-3.85, 1.78, side * 0.3), V(-5.08, 2.45, side * 0.78), 0.15, 8);
    coneBetween(batch, V(-3.62, 1.65, side * 0.32), V(-4.72, 1.02, side * 0.82), 0.14, 8);
  }
}

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  const radius = leg.hind ? 0.48 : 0.36;
  body.addBetween(leg.upper, leg.knee, radius, radius * 0.78, 9);
  body.addBetween(leg.knee, leg.ankle, radius * 0.72, radius * 0.48, 8);
  ellipsoid(body, leg.upper, V(radius * 1.2, radius, radius), 9, 6);
  ellipsoid(body, leg.knee, V(radius * 0.76, radius * 0.66, radius * 0.7), 8, 5);
  body.addBetween(leg.ankle, leg.foot, radius * 0.46, radius * 0.32, 7);
  ellipsoid(body, leg.foot, V(0.44, 0.17, 0.32), 8, 5);
  for (const zOffset of [-0.16, 0, 0.16]) {
    const tip = V(leg.foot.x + 0.38, 0.09, leg.foot.z + zOffset);
    body.addBetween(leg.foot, tip, 0.065, 0.03, 6);
    coneBetween(claws, tip, V(tip.x + 0.1, 0.08, tip.z), 0.035, 6);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stegosaurus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const plates = new GeometryBatch();
  const cream = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-4.45, 1.72, 0), radiusY: 0.12, radiusZ: 0.14 },
        { center: V(-3.85, 1.8, 0), radiusY: 0.28, radiusZ: 0.32 },
        { center: V(-3.2, 1.98, 0), radiusY: 0.5, radiusZ: 0.54 },
        { center: V(-2.5, 2.22, 0), radiusY: 0.74, radiusZ: 0.76 },
        { center: V(-1.75, 2.45, 0), radiusY: 0.96, radiusZ: 0.94 },
        { center: V(-0.95, 2.58, 0), radiusY: 1.08, radiusZ: 1 },
        { center: V(-0.12, 2.52, 0), radiusY: 1.03, radiusZ: 0.98 },
        { center: V(0.72, 2.3, 0), radiusY: 0.9, radiusZ: 0.88 },
        { center: V(1.48, 2.04, 0), radiusY: 0.72, radiusZ: 0.74 },
        { center: V(2.08, 1.78, 0), radiusY: 0.54, radiusZ: 0.58 },
        { center: V(2.52, 1.55, 0), radiusY: 0.38, radiusZ: 0.44 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(2.3, 1.58, 0), radiusY: 0.38, radiusZ: 0.42 },
        { center: V(2.72, 1.42, 0), radiusY: 0.31, radiusZ: 0.35 },
        { center: V(3.16, 1.27, 0), radiusY: 0.26, radiusZ: 0.3 },
        { center: V(3.58, 1.16, 0), radiusY: 0.24, radiusZ: 0.28 },
        { center: V(3.94, 1.1, 0), radiusY: 0.16, radiusZ: 0.2 },
        { center: V(4.12, 1.08, 0), radiusY: 0.08, radiusZ: 0.1 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-2.7, 1.7, 0), radiusY: 0.08, radiusZ: 0.48 },
        { center: V(-1.8, 1.55, 0), radiusY: 0.13, radiusZ: 0.68 },
        { center: V(-0.75, 1.48, 0), radiusY: 0.17, radiusZ: 0.76 },
        { center: V(0.35, 1.42, 0), radiusY: 0.16, radiusZ: 0.72 },
        { center: V(1.3, 1.39, 0), radiusY: 0.12, radiusZ: 0.56 },
        { center: V(2.15, 1.32, 0), radiusY: 0.08, radiusZ: 0.4 },
        { center: V(3.1, 1.08, 0), radiusY: 0.05, radiusZ: 0.24 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  addPlates(plates);
  addTailSpikes(cream);
  LEGS.forEach((leg) => addLivingLeg(leg.near ? body : farBody, cream, leg));
  ellipsoid(cream, V(4.06, 1.08, 0), V(0.15, 0.1, 0.16), 7, 5);

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(3.62, 1.31, side * 0.24), V(0.12, 0.105, 0.035), 7, 5);
    ellipsoid(iris, V(3.64, 1.31, side * 0.27), V(0.067, 0.067, 0.015), 7, 5);
    ellipsoid(dark, V(3.66, 1.31, side * 0.282), V(0.026, 0.041, 0.007), 5, 4);
    ellipsoid(glint, V(3.62, 1.345, side * 0.29), V(0.015, 0.017, 0.004), 5, 4);
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.bodyDark), 'stegosaurus-far-legs'),
    body.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.body), 'stegosaurus-body'),
    belly.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.belly), 'stegosaurus-belly'),
    plates.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.plates), 'stegosaurus-plates'),
    cream.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.spikes), 'stegosaurus-tail-spikes-claws'),
    iris.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.iris), 'stegosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(STEGOSAURUS_COLORS.dark), 'stegosaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'stegosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addBoneLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  const width = leg.hind ? 0.12 : 0.09;
  bone.addBetween(leg.upper, leg.knee, width, width * 0.76, 7);
  bone.addBetween(leg.knee, leg.ankle, width * 0.8, width * 0.54, 7);
  bone.addBetween(leg.ankle, leg.foot, width * 0.55, width * 0.38, 6);
  addBoneJoint(bone, leg.upper, width * 1.45);
  addBoneJoint(bone, leg.knee, width * 1.1);
  addBoneJoint(bone, leg.ankle, width * 0.78);
  for (const zOffset of [-0.15, 0, 0.15]) {
    bone.addBetween(leg.foot, V(leg.foot.x + 0.38, 0.08, leg.foot.z + zOffset), 0.04, 0.022, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stegosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const plates = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-4.42, 1.73, 0),
    V(-3.78, 1.83, 0),
    V(-3.1, 2.04, 0),
    V(-2.4, 2.34, 0),
    V(-1.67, 2.63, 0),
    V(-0.9, 2.82, 0),
    V(-0.1, 2.78, 0),
    V(0.72, 2.55, 0),
    V(1.45, 2.24, 0),
    V(2.08, 1.9, 0),
    V(2.58, 1.57, 0),
    V(3.08, 1.31, 0),
    V(3.55, 1.16, 0),
  ] as const;
  for (let index = 0; index < spine.length - 1; index += 1) {
    const start = spine[index];
    const end = spine[index + 1];
    if (!start || !end) continue;
    bone.addBetween(start, end, 0.07, 0.055, 7);
    addBoneJoint(bone, start, 0.11);
  }

  for (const x of [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.45]) {
    for (const side of [-1, 1]) {
      const top = V(x, 2.62 - Math.abs(x + 0.7) * 0.12, 0);
      const sidePoint = V(x, 1.85, side * (0.68 - Math.abs(x) * 0.04));
      const sternum = V(x, 1.58, side * 0.14);
      bone.addBetween(top, sidePoint, 0.04, 0.032, 6);
      bone.addBetween(sidePoint, sternum, 0.032, 0.024, 6);
    }
  }

  for (const side of [-1, 1]) {
    const hindLeg = side > 0 ? LEGS[0] : LEGS[1];
    const frontLeg = side > 0 ? LEGS[2] : LEGS[3];

    shade.addBetween(V(-1.82, 2.48, side * 0.17), V(-0.62, 2.62, side * 0.55), 0.1, 0.06, 6);
    bone.addBetween(V(-1.25, 2.58, side * 0.07), hindLeg.upper, 0.07, 0.05, 6);
    bone.addBetween(hindLeg.upper, V(-0.78, 1.48, side * 0.43), 0.06, 0.034, 6);
    bone.addBetween(hindLeg.upper, V(-1.7, 1.55, side * 0.4), 0.055, 0.03, 6);

    const scapula = V(1.08, 2.08, side * 0.47);
    const chest = V(1.36, 1.28, side * 0.15);
    bone.addBetween(V(1.5, 2.2, side * 0.07), scapula, 0.055, 0.04, 6);
    bone.addBetween(scapula, frontLeg.upper, 0.05, 0.04, 6);
    bone.addBetween(frontLeg.upper, chest, 0.045, 0.03, 6);
    bone.addBetween(chest, V(1.36, 1.24, 0), 0.03, 0.022, 5);
  }
  LEGS.forEach((leg) => addBoneLeg(bone, leg));
  addPlates(plates);
  addTailSpikes(bone);

  bone.add(
    loftGeometry(
      [
        { center: V(3.1, 1.29, 0), radiusY: 0.17, radiusZ: 0.2 },
        { center: V(3.55, 1.17, 0), radiusY: 0.18, radiusZ: 0.2 },
        { center: V(3.95, 1.09, 0), radiusY: 0.12, radiusZ: 0.15 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(3.55, 1.22, side * 0.17), V(0.14, 0.1, 0.03), 7, 5);
    ellipsoid(dark, V(3.82, 1.08, side * 0.12), V(0.12, 0.045, 0.018), 6, 4);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(STEGOSAURUS_COLORS.boneShade), 'stegosaurus-skeleton-girdles'),
    bone.toMesh(makeFlatMaterial(STEGOSAURUS_COLORS.bone), 'stegosaurus-skeleton-bones-spikes'),
    plates.toMesh(makeFlatMaterial(STEGOSAURUS_COLORS.bone), 'stegosaurus-skeleton-plates'),
    dark.toMesh(makeFlatMaterial(STEGOSAURUS_COLORS.dark), 'stegosaurus-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildStegosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
