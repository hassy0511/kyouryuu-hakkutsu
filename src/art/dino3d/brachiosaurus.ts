import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const BRACHIOSAURUS_COLORS = {
  body: '#7C8FB0',
  back: '#5F7191',
  belly: '#E5DFC8',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const LEGS = [
  {
    near: true,
    front: true,
    upper: V(2.05, 6.15, 0.82),
    knee: V(2.28, 3.2, 0.88),
    ankle: V(2.18, 0.48, 0.9),
    foot: V(2.45, 0.18, 0.91),
  },
  {
    near: false,
    front: true,
    upper: V(2.65, 6.28, -0.72),
    knee: V(2.5, 3.28, -0.78),
    ankle: V(2.65, 0.46, -0.8),
    foot: V(2.92, 0.17, -0.81),
  },
  {
    near: true,
    front: false,
    upper: V(-1.8, 5.0, 0.82),
    knee: V(-2.05, 2.65, 0.88),
    ankle: V(-1.82, 0.46, 0.9),
    foot: V(-1.55, 0.18, 0.91),
  },
  {
    near: false,
    front: false,
    upper: V(-2.35, 5.02, -0.72),
    knee: V(-2.08, 2.62, -0.78),
    ankle: V(-2.3, 0.45, -0.8),
    foot: V(-2.02, 0.17, -0.81),
  },
] as const;

const NECK_PATH = [
  V(2.25, 6.05, 0),
  V(2.9, 6.9, 0),
  V(3.55, 7.78, 0),
  V(4.22, 8.67, 0),
  V(4.92, 9.48, 0),
  V(5.66, 10.18, 0),
  V(6.42, 10.73, 0),
  V(7.2, 11.12, 0),
  V(7.95, 11.32, 0),
] as const;

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  const upperRadius = leg.front ? 0.58 : 0.68;
  body.addBetween(leg.upper, leg.knee, upperRadius, upperRadius * 0.8, 10);
  body.addBetween(leg.knee, leg.ankle, upperRadius * 0.72, upperRadius * 0.48, 9);
  ellipsoid(body, leg.upper, V(upperRadius * 1.25, upperRadius, upperRadius), 10, 7);
  ellipsoid(body, leg.knee, V(upperRadius * 0.78, upperRadius * 0.68, upperRadius * 0.72), 9, 6);
  body.addBetween(leg.ankle, leg.foot, upperRadius * 0.46, upperRadius * 0.34, 8);
  ellipsoid(body, leg.foot, V(0.62, 0.22, 0.48), 9, 6);

  for (const zOffset of [-0.22, 0, 0.22]) {
    const toeTip = V(leg.foot.x + 0.48, 0.12, leg.foot.z + zOffset);
    body.addBetween(leg.foot, toeTip, 0.1, 0.045, 6);
    coneBetween(claws, toeTip, V(toeTip.x + 0.13, 0.1, toeTip.z), 0.045, 6);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'brachiosaurus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const cream = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-10.4, 2.7, 0), radiusY: 0.08, radiusZ: 0.09 },
        { center: V(-9.55, 2.9, 0), radiusY: 0.18, radiusZ: 0.2 },
        { center: V(-8.65, 3.16, 0), radiusY: 0.3, radiusZ: 0.34 },
        { center: V(-7.7, 3.48, 0), radiusY: 0.48, radiusZ: 0.52 },
        { center: V(-6.7, 3.86, 0), radiusY: 0.7, radiusZ: 0.72 },
        { center: V(-5.65, 4.25, 0), radiusY: 0.96, radiusZ: 0.92 },
        { center: V(-4.55, 4.62, 0), radiusY: 1.25, radiusZ: 1.15 },
        { center: V(-3.4, 4.92, 0), radiusY: 1.52, radiusZ: 1.34 },
        { center: V(-2.2, 5.15, 0), radiusY: 1.75, radiusZ: 1.48 },
        { center: V(-0.95, 5.4, 0), radiusY: 1.82, radiusZ: 1.52 },
        { center: V(0.3, 5.7, 0), radiusY: 1.72, radiusZ: 1.48 },
        { center: V(1.4, 5.98, 0), radiusY: 1.52, radiusZ: 1.36 },
        { center: V(2.35, 6.18, 0), radiusY: 1.2, radiusZ: 1.14 },
        { center: V(2.92, 6.4, 0), radiusY: 0.86, radiusZ: 0.92 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      NECK_PATH.map((center, index) => ({
        center,
        radiusY: 0.88 - index * 0.07,
        radiusZ: 0.82 - index * 0.06,
      })),
      11,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(7.75, 11.33, 0), radiusY: 0.36, radiusZ: 0.38 },
        { center: V(8.15, 11.4, 0), radiusY: 0.43, radiusZ: 0.42 },
        { center: V(8.65, 11.4, 0), radiusY: 0.38, radiusZ: 0.38 },
        { center: V(9.05, 11.34, 0), radiusY: 0.27, radiusZ: 0.3 },
        { center: V(9.3, 11.3, 0), radiusY: 0.13, radiusZ: 0.15 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  ellipsoid(body, V(8.2, 11.74, 0), V(0.42, 0.28, 0.38), 9, 6);

  belly.add(
    loftGeometry(
      [
        { center: V(-4.3, 4.05, 0), radiusY: 0.11, radiusZ: 0.75 },
        { center: V(-2.9, 3.78, 0), radiusY: 0.18, radiusZ: 1.02 },
        { center: V(-1.35, 3.65, 0), radiusY: 0.24, radiusZ: 1.15 },
        { center: V(0.2, 3.95, 0), radiusY: 0.22, radiusZ: 1.08 },
        { center: V(1.5, 4.55, 0), radiusY: 0.16, radiusZ: 0.88 },
        { center: V(2.48, 5.35, 0), radiusY: 0.12, radiusZ: 0.66 },
        { center: V(3.38, 6.9, 0), radiusY: 0.1, radiusZ: 0.52 },
        { center: V(4.55, 8.5, 0), radiusY: 0.08, radiusZ: 0.42 },
        { center: V(5.8, 9.8, 0), radiusY: 0.07, radiusZ: 0.34 },
        { center: V(7.15, 10.75, 0), radiusY: 0.05, radiusZ: 0.26 },
        { center: V(8.45, 11.08, 0), radiusY: 0.04, radiusZ: 0.22 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  LEGS.forEach((leg) => addLivingLeg(leg.near ? body : farBody, cream, leg));
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(8.45, 11.55, side * 0.34), V(0.14, 0.13, 0.04), 8, 5);
    ellipsoid(iris, V(8.47, 11.55, side * 0.375), V(0.08, 0.08, 0.018), 7, 5);
    ellipsoid(dark, V(8.49, 11.55, side * 0.39), V(0.03, 0.05, 0.008), 5, 4);
    ellipsoid(glint, V(8.45, 11.59, side * 0.4), V(0.018, 0.02, 0.005), 5, 4);
    ellipsoid(dark, V(9.05, 11.42, side * 0.22), V(0.05, 0.035, 0.012), 6, 4);
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(BRACHIOSAURUS_COLORS.back), 'brachiosaurus-far-legs'),
    body.toMesh(makeOrganicMaterial(BRACHIOSAURUS_COLORS.body), 'brachiosaurus-body'),
    belly.toMesh(makeOrganicMaterial(BRACHIOSAURUS_COLORS.belly), 'brachiosaurus-belly'),
    cream.toMesh(makeOrganicMaterial(BRACHIOSAURUS_COLORS.belly), 'brachiosaurus-claws'),
    iris.toMesh(makeOrganicMaterial(BRACHIOSAURUS_COLORS.iris), 'brachiosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(BRACHIOSAURUS_COLORS.dark), 'brachiosaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'brachiosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addBoneLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  const width = leg.front ? 0.14 : 0.16;
  bone.addBetween(leg.upper, leg.knee, width, width * 0.78, 7);
  bone.addBetween(leg.knee, leg.ankle, width * 0.82, width * 0.56, 7);
  bone.addBetween(leg.ankle, leg.foot, width * 0.58, width * 0.4, 6);
  addBoneJoint(bone, leg.upper, width * 1.5);
  addBoneJoint(bone, leg.knee, width * 1.15);
  addBoneJoint(bone, leg.ankle, width * 0.82);
  for (const zOffset of [-0.2, 0, 0.2]) {
    bone.addBetween(leg.foot, V(leg.foot.x + 0.48, 0.1, leg.foot.z + zOffset), 0.055, 0.03, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'brachiosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-10.35, 2.72, 0),
    V(-9.45, 2.92, 0),
    V(-8.5, 3.2, 0),
    V(-7.5, 3.55, 0),
    V(-6.45, 3.95, 0),
    V(-5.35, 4.38, 0),
    V(-4.2, 4.82, 0),
    V(-3, 5.18, 0),
    V(-1.75, 5.5, 0),
    V(-0.5, 5.82, 0),
    V(0.72, 6.06, 0),
    V(1.8, 6.22, 0),
    V(2.5, 6.35, 0),
    ...NECK_PATH.slice(1),
  ] as const;
  for (let index = 0; index < spine.length - 1; index += 1) {
    const start = spine[index];
    const end = spine[index + 1];
    if (!start || !end) continue;
    const isNeck = index > 11;
    bone.addBetween(start, end, isNeck ? 0.095 : 0.11, isNeck ? 0.075 : 0.09, 7);
    addBoneJoint(bone, start, isNeck ? 0.14 : 0.16);
  }

  for (const x of [-3.35, -2.7, -2.05, -1.4, -0.75, -0.1, 0.55, 1.18]) {
    for (const side of [-1, 1]) {
      const top = V(x, 5.25 + (x + 3.35) * 0.14, 0);
      const sidePoint = V(x, 4.15, side * (1.02 - Math.abs(x + 1.2) * 0.08));
      const sternum = V(x, 3.78, side * 0.2);
      bone.addBetween(top, sidePoint, 0.065, 0.05, 6);
      bone.addBetween(sidePoint, sternum, 0.05, 0.038, 6);
    }
  }

  for (const side of [-1, 1]) {
    const frontLeg = side > 0 ? LEGS[0] : LEGS[1];
    const hindLeg = side > 0 ? LEGS[2] : LEGS[3];

    shade.addBetween(V(-2.8, 5.18, side * 0.22), V(-1.18, 5.52, side * 0.72), 0.15, 0.09, 7);
    bone.addBetween(V(-1.92, 5.46, side * 0.1), hindLeg.upper, 0.11, 0.075, 7);
    bone.addBetween(hindLeg.upper, V(-1.18, 4.05, side * 0.58), 0.1, 0.055, 7);
    bone.addBetween(hindLeg.upper, V(-2.72, 4.12, side * 0.56), 0.095, 0.05, 7);

    const scapula = V(1.35, 5.86, side * 0.67);
    const chest = V(2.06, 4.72, side * 0.22);
    bone.addBetween(V(1.82, 6.22, side * 0.1), scapula, 0.1, 0.075, 7);
    bone.addBetween(scapula, frontLeg.upper, 0.09, 0.07, 7);
    bone.addBetween(frontLeg.upper, chest, 0.085, 0.055, 7);
    bone.addBetween(chest, V(2.06, 4.64, 0), 0.055, 0.04, 6);
  }
  LEGS.forEach((leg) => addBoneLeg(bone, leg));

  bone.add(
    loftGeometry(
      [
        { center: V(7.78, 11.34, 0), radiusY: 0.25, radiusZ: 0.27 },
        { center: V(8.2, 11.42, 0), radiusY: 0.31, radiusZ: 0.31 },
        { center: V(8.68, 11.4, 0), radiusY: 0.27, radiusZ: 0.28 },
        { center: V(9.12, 11.32, 0), radiusY: 0.17, radiusZ: 0.19 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  ellipsoid(shade, V(8.2, 11.66, 0), V(0.32, 0.2, 0.29), 8, 5);
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(8.42, 11.5, side * 0.27), V(0.18, 0.14, 0.04), 7, 5);
    ellipsoid(dark, V(8.83, 11.33, side * 0.2), V(0.21, 0.07, 0.025), 7, 5);
  }

  group.add(
    shade.toMesh(
      makeFlatMaterial(BRACHIOSAURUS_COLORS.boneShade),
      'brachiosaurus-skeleton-girdles',
    ),
    bone.toMesh(makeFlatMaterial(BRACHIOSAURUS_COLORS.bone), 'brachiosaurus-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(BRACHIOSAURUS_COLORS.dark), 'brachiosaurus-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildBrachiosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
