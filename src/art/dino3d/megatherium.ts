import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  embeddedSideZ,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const MEGATHERIUM_COLORS = {
  fur: '#9A8A6A',
  furShade: '#7D7057',
  belly: '#C9B896',
  claw: '#E8DCC4',
  iris: '#5B4634',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const HIND_LEGS = [
  {
    near: true,
    hip: V(-0.34, 1.85, 0.58),
    knee: V(0.18, 0.98, 0.63),
    ankle: V(-0.03, 0.3, 0.65),
    foot: V(0.43, 0.14, 0.66),
  },
  {
    near: false,
    hip: V(-0.62, 1.8, -0.51),
    knee: V(-0.9, 0.94, -0.55),
    ankle: V(-0.6, 0.28, -0.57),
    foot: V(-0.16, 0.13, -0.58),
  },
] as const;

const ARMS = [
  {
    near: true,
    shoulder: V(0.42, 3.55, 0.55),
    elbow: V(1.03, 3.12, 0.62),
    wrist: V(1.54, 2.75, 0.66),
  },
  {
    near: false,
    shoulder: V(0.28, 3.5, -0.48),
    elbow: V(0.72, 3.0, -0.54),
    wrist: V(1.23, 2.65, -0.58),
  },
] as const;

function addLivingHindLeg(batch: GeometryBatch, leg: (typeof HIND_LEGS)[number]): void {
  batch.addBetween(leg.hip, leg.knee, 0.55, 0.38, 10);
  batch.addBetween(leg.knee, leg.ankle, 0.38, 0.24, 9);
  batch.addBetween(leg.ankle, leg.foot, 0.24, 0.15, 8);
  ellipsoid(batch, leg.hip, V(0.67, 0.64, 0.58), 10, 7);
  ellipsoid(batch, leg.knee, V(0.42, 0.39, 0.38), 9, 6);
  ellipsoid(batch, leg.foot, V(0.72, 0.22, 0.4), 9, 6);
  for (const zOffset of [-0.16, 0, 0.16]) {
    batch.addBetween(leg.foot, V(leg.foot.x + 0.48, 0.09, leg.foot.z + zOffset), 0.08, 0.028, 6);
  }
}

function addLivingArm(
  batch: GeometryBatch,
  claws: GeometryBatch,
  arm: (typeof ARMS)[number],
): void {
  batch.addBetween(arm.shoulder, arm.elbow, 0.32, 0.23, 9);
  batch.addBetween(arm.elbow, arm.wrist, 0.23, 0.13, 8);
  ellipsoid(batch, arm.shoulder, V(0.4, 0.38, 0.34), 9, 6);
  ellipsoid(batch, arm.elbow, V(0.27, 0.25, 0.24), 8, 5);
  const palm = V(arm.wrist.x + 0.14, arm.wrist.y - 0.08, arm.wrist.z);
  ellipsoid(batch, palm, V(0.3, 0.18, 0.25), 8, 5);
  for (const [index, zOffset] of [-0.16, 0, 0.16].entries()) {
    const base = V(palm.x + 0.12, palm.y - index * 0.05, palm.z + zOffset * 0.55);
    const knuckle = V(palm.x + 0.42, palm.y - 0.16 - index * 0.08, palm.z + zOffset);
    const tip = V(palm.x + 0.72, palm.y - 0.38 - index * 0.08, palm.z + zOffset * 1.05);
    batch.addBetween(base, knuckle, 0.07, 0.045, 6);
    coneBetween(claws, knuckle, tip, 0.105, 7);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'megatherium-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const claws = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  ellipsoid(body, V(-0.22, 2.38, 0), V(1.18, 1.45, 0.92), 12, 8);
  ellipsoid(body, V(0.12, 3.35, 0), V(0.94, 1.04, 0.76), 11, 7);
  ellipsoid(body, V(0.66, 4.0, 0), V(0.48, 0.58, 0.46), 9, 6);
  ellipsoid(body, V(1.03, 4.2, 0), V(0.55, 0.48, 0.48), 9, 6);
  ellipsoid(body, V(1.39, 4.07, 0), V(0.34, 0.29, 0.34), 8, 5);
  ellipsoid(belly, V(0.06, 2.45, 0), V(0.84, 1.2, 0.76), 11, 7);

  const tailPoints = [
    { point: V(-0.75, 1.83, 0), radius: 0.67 },
    { point: V(-1.28, 1.34, 0), radius: 0.55 },
    { point: V(-1.7, 0.82, 0), radius: 0.4 },
    { point: V(-1.98, 0.35, 0), radius: 0.25 },
    { point: V(-2.12, 0.16, 0), radius: 0.14 },
  ] as const;
  for (let index = 0; index < tailPoints.length - 1; index += 1) {
    const current = tailPoints[index];
    const next = tailPoints[index + 1];
    if (current && next)
      body.addBetween(current.point, next.point, current.radius, next.radius, 10);
  }
  HIND_LEGS.forEach((leg) => addLivingHindLeg(leg.near ? body : farBody, leg));
  ARMS.forEach((arm) => addLivingArm(arm.near ? body : farBody, claws, arm));

  for (const side of SIDES) {
    const eyeSurface = 0.4;
    ellipsoid(
      dark,
      V(1.07, 4.31, embeddedSideZ(side, eyeSurface, 0.04)),
      V(0.13, 0.11, 0.04),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(1.085, 4.31, embeddedSideZ(side, eyeSurface + 0.009, 0.019)),
      V(0.075, 0.075, 0.019),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.1, 4.31, embeddedSideZ(side, eyeSurface + 0.014, 0.008)),
      V(0.026, 0.05, 0.008),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.06, 4.35, embeddedSideZ(side, eyeSurface + 0.018, 0.005)),
      V(0.018, 0.02, 0.005),
      5,
      4,
    );
    ellipsoid(dark, V(1.55, 4.11, embeddedSideZ(side, 0.24, 0.014)), V(0.05, 0.032, 0.014), 6, 4);
    dark.addBetween(
      V(1.2, 3.91, embeddedSideZ(side, 0.31, 0.012)),
      V(1.63, 3.91, embeddedSideZ(side, 0.17, 0.008)),
      0.012,
      0.008,
      5,
    );
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(MEGATHERIUM_COLORS.furShade), 'megatherium-far-limbs'),
    body.toMesh(makeOrganicMaterial(MEGATHERIUM_COLORS.fur), 'megatherium-fur-body'),
    belly.toMesh(makeOrganicMaterial(MEGATHERIUM_COLORS.belly), 'megatherium-belly'),
    claws.toMesh(makeOrganicMaterial(MEGATHERIUM_COLORS.claw), 'megatherium-large-claws'),
    iris.toMesh(makeOrganicMaterial(MEGATHERIUM_COLORS.iris), 'megatherium-irises'),
    dark.toMesh(makeOrganicMaterial(MEGATHERIUM_COLORS.dark), 'megatherium-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'megatherium-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonHindLeg(batch: GeometryBatch, leg: (typeof HIND_LEGS)[number]): void {
  batch.addBetween(leg.hip, leg.knee, 0.11, 0.08, 7);
  batch.addBetween(leg.knee, leg.ankle, 0.08, 0.055, 6);
  batch.addBetween(leg.ankle, leg.foot, 0.055, 0.038, 6);
  addJoint(batch, leg.hip, 0.16);
  addJoint(batch, leg.knee, 0.12);
  addJoint(batch, leg.ankle, 0.08);
  for (const zOffset of [-0.13, 0, 0.13]) {
    batch.addBetween(leg.foot, V(leg.foot.x + 0.46, 0.08, leg.foot.z + zOffset), 0.04, 0.016, 5);
  }
}

function addSkeletonArm(
  batch: GeometryBatch,
  claws: GeometryBatch,
  arm: (typeof ARMS)[number],
): void {
  batch.addBetween(arm.shoulder, arm.elbow, 0.075, 0.055, 6);
  batch.addBetween(arm.elbow, arm.wrist, 0.055, 0.035, 6);
  addJoint(batch, arm.shoulder, 0.11);
  addJoint(batch, arm.elbow, 0.08);
  addJoint(batch, arm.wrist, 0.055);
  const palm = V(arm.wrist.x + 0.12, arm.wrist.y - 0.07, arm.wrist.z);
  batch.addBetween(arm.wrist, palm, 0.04, 0.03, 5);
  for (const [index, zOffset] of [-0.13, 0, 0.13].entries()) {
    const knuckle = V(palm.x + 0.35, palm.y - 0.15 - index * 0.06, palm.z + zOffset);
    const tip = V(palm.x + 0.68, palm.y - 0.38 - index * 0.07, palm.z + zOffset * 1.04);
    batch.addBetween(palm, knuckle, 0.027, 0.014, 5);
    coneBetween(claws, knuckle, tip, 0.07, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'megatherium-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();
  const claws = new GeometryBatch();

  const spine = [
    V(-0.63, 1.72, 0),
    V(-0.52, 2.12, 0),
    V(-0.4, 2.55, 0),
    V(-0.25, 2.98, 0),
    V(-0.05, 3.38, 0),
    V(0.25, 3.7, 0),
    V(0.56, 3.96, 0),
    V(0.78, 4.1, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    addJoint(bone, point, 0.095);
    if (next) bone.addBetween(point, next, 0.05, 0.042, 6);
  });

  const tail = [
    V(-0.63, 1.72, 0),
    V(-1.05, 1.38, 0),
    V(-1.43, 0.98, 0),
    V(-1.72, 0.6, 0),
    V(-1.94, 0.3, 0),
    V(-2.08, 0.15, 0),
  ] as const;
  tail.forEach((point, index) => {
    const next = tail[index + 1];
    const radius = THREE.MathUtils.lerp(0.12, 0.045, index / (tail.length - 1));
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.48, radius * 0.4, 6);
  });

  const ribYs = [2.12, 2.42, 2.72, 3.02, 3.3, 3.52];
  for (const [index, y] of ribYs.entries()) {
    const spineX = -0.5 + index * 0.1;
    for (const side of SIDES) {
      const outer = V(spineX - 0.35, y - 0.08, side * (0.72 - index * 0.035));
      const sternum = V(spineX + 0.35, y - 0.32, side * 0.18);
      bone.addBetween(V(spineX, y, side * 0.05), outer, 0.04, 0.03, 5);
      bone.addBetween(outer, sternum, 0.03, 0.018, 5);
    }
  }
  for (const side of SIDES) {
    shade.addBetween(V(-0.7, 1.82, side * 0.12), V(-0.1, 1.9, side * 0.48), 0.1, 0.06, 6);
    bone.addBetween(V(-0.42, 1.9, side * 0.05), V(-0.22, 1.4, side * 0.48), 0.065, 0.04, 6);
    const shoulder = V(0.24, 3.5, side * 0.47);
    bone.addBetween(V(0.02, 3.44, side * 0.05), shoulder, 0.06, 0.04, 6);
    bone.addBetween(shoulder, V(0.34, 3.1, side * 0.17), 0.05, 0.03, 5);
  }
  HIND_LEGS.forEach((leg) => addSkeletonHindLeg(bone, leg));
  ARMS.forEach((arm) => addSkeletonArm(bone, claws, arm));

  ellipsoid(bone, V(1.02, 4.18, 0), V(0.47, 0.4, 0.43), 9, 6);
  bone.addBetween(V(0.92, 3.99, 0), V(1.56, 3.91, 0), 0.05, 0.025, 6);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.04, 4.29, side * 0.36), V(0.15, 0.13, 0.035), 7, 5);
    ellipsoid(dark, V(1.39, 4.08, side * 0.28), V(0.12, 0.07, 0.025), 7, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(MEGATHERIUM_COLORS.boneShade), 'megatherium-skeleton-girdles'),
    bone.toMesh(makeFlatMaterial(MEGATHERIUM_COLORS.bone), 'megatherium-skeleton-bones'),
    claws.toMesh(makeFlatMaterial(MEGATHERIUM_COLORS.claw), 'megatherium-skeleton-claws'),
    dark.toMesh(makeFlatMaterial(MEGATHERIUM_COLORS.dark), 'megatherium-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildMegatherium(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
