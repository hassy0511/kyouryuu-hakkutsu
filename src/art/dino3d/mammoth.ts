import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  embeddedSideZ,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const MAMMOTH_COLORS = {
  fur: '#8A5A3A',
  undercoat: '#6E4530',
  tusk: '#EFE6D4',
  eye: '#3A2E28',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const LEGS = [
  { near: true, hip: V(-1.05, 2.05, 0.62), knee: V(-1.02, 1.05, 0.64), foot: V(-0.9, 0.18, 0.65) },
  {
    near: false,
    hip: V(-1.45, 2.02, -0.56),
    knee: V(-1.5, 1.02, -0.57),
    foot: V(-1.38, 0.17, -0.58),
  },
  { near: true, hip: V(0.55, 2.22, 0.6), knee: V(0.58, 1.12, 0.62), foot: V(0.72, 0.18, 0.63) },
  { near: false, hip: V(0.18, 2.2, -0.54), knee: V(0.1, 1.08, -0.55), foot: V(0.22, 0.17, -0.56) },
] as const;

function addLivingLeg(batch: GeometryBatch, leg: (typeof LEGS)[number]): void {
  batch.addBetween(leg.hip, leg.knee, 0.46, 0.38, 9);
  batch.addBetween(leg.knee, leg.foot, 0.39, 0.3, 9);
  ellipsoid(batch, leg.hip, V(0.53, 0.55, 0.47), 9, 6);
  ellipsoid(batch, leg.knee, V(0.41, 0.38, 0.38), 8, 6);
  ellipsoid(batch, leg.foot, V(0.55, 0.22, 0.43), 9, 6);
}

function makeTusks(materialSkeleton: boolean): THREE.Mesh {
  const tusks = new GeometryBatch();
  for (const side of SIDES) {
    const z = side * 0.48;
    const points = [
      V(1.58, 2.36, z),
      V(1.97, 2.12, side * 0.54),
      V(2.3, 1.72, side * 0.58),
      V(2.42, 1.27, side * 0.57),
      V(2.25, 0.9, side * 0.53),
      V(1.93, 0.76, side * 0.47),
      V(1.68, 0.9, side * 0.41),
    ] as const;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      if (!start || !end) continue;
      const radius = THREE.MathUtils.lerp(0.12, 0.04, index / (points.length - 1));
      tusks.addBetween(start, end, radius, Math.max(0.025, radius - 0.018), 8);
    }
    const beforeTip = points.at(-2);
    const tip = points.at(-1);
    if (beforeTip && tip) coneBetween(tusks, beforeTip, tip, 0.055, 8);
  }
  return tusks.toMesh(
    materialSkeleton
      ? makeFlatMaterial(MAMMOTH_COLORS.tusk)
      : makeOrganicMaterial(MAMMOTH_COLORS.tusk),
    materialSkeleton ? 'mammoth-skeleton-tusks' : 'mammoth-curled-tusks',
  );
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mammoth-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const undercoat = new GeometryBatch();
  const ears = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-2.68, 1.93, 0), radiusY: 0.08, radiusZ: 0.09 },
        { center: V(-2.38, 2.02, 0), radiusY: 0.3, radiusZ: 0.34 },
        { center: V(-1.9, 2.17, 0), radiusY: 0.82, radiusZ: 0.8 },
        { center: V(-1.25, 2.29, 0), radiusY: 1.06, radiusZ: 0.95 },
        { center: V(-0.55, 2.45, 0), radiusY: 1.18, radiusZ: 1.02 },
        { center: V(0.08, 2.65, 0), radiusY: 1.22, radiusZ: 1.02 },
        { center: V(0.58, 2.62, 0), radiusY: 1.03, radiusZ: 0.9 },
        { center: V(0.92, 2.48, 0), radiusY: 0.72, radiusZ: 0.7 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(0.67, 2.56, 0), radiusY: 0.69, radiusZ: 0.68 },
        { center: V(1.02, 2.72, 0), radiusY: 0.78, radiusZ: 0.72 },
        { center: V(1.35, 2.68, 0), radiusY: 0.71, radiusZ: 0.66 },
        { center: V(1.62, 2.47, 0), radiusY: 0.53, radiusZ: 0.55 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  // The living trunk is continuous with the muzzle; it is deliberately absent from the skeleton.
  const trunk = [
    { point: V(1.55, 2.42, 0), radius: 0.38 },
    { point: V(1.78, 2.1, 0), radius: 0.33 },
    { point: V(1.78, 1.7, 0), radius: 0.27 },
    { point: V(1.68, 1.29, 0), radius: 0.22 },
    { point: V(1.62, 0.9, 0), radius: 0.17 },
    { point: V(1.76, 0.66, 0), radius: 0.13 },
  ] as const;
  for (let index = 0; index < trunk.length - 1; index += 1) {
    const current = trunk[index];
    const next = trunk[index + 1];
    if (current && next)
      body.addBetween(current.point, next.point, current.radius, next.radius, 10);
  }

  LEGS.forEach((leg) => addLivingLeg(leg.near ? body : farBody, leg));
  undercoat.add(
    loftGeometry(
      [
        { center: V(-1.85, 1.65, 0), radiusY: 0.2, radiusZ: 0.62 },
        { center: V(-1.1, 1.42, 0), radiusY: 0.28, radiusZ: 0.79 },
        { center: V(-0.3, 1.35, 0), radiusY: 0.31, radiusZ: 0.82 },
        { center: V(0.42, 1.5, 0), radiusY: 0.24, radiusZ: 0.67 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  for (const side of SIDES) {
    ellipsoid(
      ears,
      V(0.98, 2.55, embeddedSideZ(side, 0.64, 0.09, 0.28)),
      V(0.48, 0.58, 0.09),
      9,
      6,
    );
    ellipsoid(dark, V(1.35, 2.84, embeddedSideZ(side, 0.57, 0.04)), V(0.13, 0.11, 0.04), 8, 5);
    ellipsoid(
      glint,
      V(1.32, 2.88, embeddedSideZ(side, 0.579, 0.009)),
      V(0.026, 0.028, 0.009),
      5,
      4,
    );
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(MAMMOTH_COLORS.undercoat), 'mammoth-far-legs'),
    body.toMesh(makeOrganicMaterial(MAMMOTH_COLORS.fur), 'mammoth-fur-body'),
    undercoat.toMesh(makeOrganicMaterial(MAMMOTH_COLORS.undercoat), 'mammoth-undercoat'),
    ears.toMesh(makeOrganicMaterial(MAMMOTH_COLORS.undercoat), 'mammoth-ears'),
    dark.toMesh(makeOrganicMaterial(MAMMOTH_COLORS.eye), 'mammoth-eyes'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'mammoth-eye-glints'),
    makeTusks(false),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonLeg(batch: GeometryBatch, leg: (typeof LEGS)[number]): void {
  batch.addBetween(leg.hip, leg.knee, 0.095, 0.075, 6);
  batch.addBetween(leg.knee, leg.foot, 0.075, 0.055, 6);
  addJoint(batch, leg.hip, 0.14);
  addJoint(batch, leg.knee, 0.105);
  addJoint(batch, leg.foot, 0.08);
  for (const zOffset of [-0.14, 0, 0.14]) {
    batch.addBetween(leg.foot, V(leg.foot.x + 0.32, 0.1, leg.foot.z + zOffset), 0.04, 0.018, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mammoth-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-2.62, 1.95, 0),
    V(-2.28, 2.05, 0),
    V(-1.82, 2.17, 0),
    V(-1.3, 2.3, 0),
    V(-0.75, 2.45, 0),
    V(-0.2, 2.61, 0),
    V(0.32, 2.67, 0),
    V(0.76, 2.58, 0),
    V(1.04, 2.49, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    const radius = index < 2 ? 0.06 : 0.1;
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.48, radius * 0.42, 6);
  });

  for (const [index, x] of [-1.65, -1.15, -0.65, -0.15, 0.32, 0.68].entries()) {
    const topY = 2.25 + index * 0.075;
    for (const side of SIDES) {
      const outer = V(x, 1.73, side * 0.69);
      const lower = V(x + 0.04, 1.42, side * 0.27);
      bone.addBetween(V(x, topY, side * 0.06), outer, 0.045, 0.032, 6);
      bone.addBetween(outer, lower, 0.032, 0.022, 6);
    }
  }

  for (const side of SIDES) {
    shade.addBetween(V(-1.65, 2.2, side * 0.12), V(-0.75, 2.33, side * 0.55), 0.09, 0.055, 6);
    bone.addBetween(V(-1.25, 2.28, side * 0.05), V(-0.95, 1.73, side * 0.5), 0.06, 0.035, 6);
    const shoulder = V(0.42, 2.53, side * 0.49);
    bone.addBetween(V(0.15, 2.62, side * 0.06), shoulder, 0.065, 0.045, 6);
    bone.addBetween(shoulder, V(0.62, 2.02, side * 0.18), 0.055, 0.03, 6);
  }
  LEGS.forEach((leg) => addSkeletonLeg(bone, leg));

  // A domed mammalian skull with no bony trunk.
  ellipsoid(bone, V(1.13, 2.68, 0), V(0.78, 0.7, 0.62), 10, 7);
  bone.add(
    loftGeometry(
      [
        { center: V(1.28, 2.58, 0), radiusY: 0.48, radiusZ: 0.52 },
        { center: V(1.52, 2.5, 0), radiusY: 0.42, radiusZ: 0.48 },
        { center: V(1.74, 2.37, 0), radiusY: 0.32, radiusZ: 0.4 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  for (const side of SIDES) {
    ellipsoid(dark, V(1.3, 2.8, side * 0.51), V(0.18, 0.15, 0.045), 7, 5);
    ellipsoid(dark, V(1.66, 2.45, side * 0.36), V(0.11, 0.09, 0.03), 7, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(MAMMOTH_COLORS.boneShade), 'mammoth-skeleton-girdles'),
    bone.toMesh(makeFlatMaterial(MAMMOTH_COLORS.bone), 'mammoth-skeleton-bones'),
    dark.toMesh(makeFlatMaterial('#211D18'), 'mammoth-skull-openings'),
    makeTusks(true),
  );
  setShadowFlags(group);
  return group;
}

export function buildMammoth(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
