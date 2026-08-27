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
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

export const THERIZINOSAURUS_COLORS = {
  body: '#8A7A5A',
  bodyShade: '#70644C',
  feathers: '#B0985E',
  belly: '#EFE6C8',
  claw: '#F2EAD8',
  iris: '#B88936',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const SPINE = [
  V(-3.6, 1.7, 0),
  V(-3.05, 1.83, 0),
  V(-2.47, 2.0, 0),
  V(-1.9, 2.2, 0),
  V(-1.38, 2.45, 0),
  V(-0.92, 2.7, 0),
  V(-0.5, 2.94, 0),
  V(-0.08, 3.12, 0),
  V(0.33, 3.27, 0),
] as const;

const NECK = [
  V(0.2, 3.22, 0),
  V(0.45, 3.52, 0),
  V(0.69, 3.78, 0),
  V(0.94, 4.0, 0),
  V(1.2, 4.16, 0),
] as const;

const LEGS = [
  {
    hip: V(-1.25, 2.25, 0.62),
    knee: V(-0.65, 1.22, 0.72),
    ankle: V(-0.9, 0.29, 0.76),
    foot: V(-0.28, 0.13, 0.78),
  },
  {
    hip: V(-1.62, 2.18, -0.53),
    knee: V(-2.08, 1.15, -0.62),
    ankle: V(-1.65, 0.27, -0.68),
    foot: V(-1.03, 0.12, -0.7),
  },
] as const;

const ARMS = [
  {
    shoulder: V(0.2, 3.25, 0.48),
    elbow: V(0.75, 2.82, 0.57),
    wrist: V(1.34, 2.68, 0.62),
  },
  {
    shoulder: V(0.13, 3.2, -0.42),
    elbow: V(0.52, 2.72, -0.5),
    wrist: V(1.07, 2.55, -0.55),
  },
] as const;

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  body.addBetween(leg.hip, leg.knee, 0.56, 0.35, 10);
  body.addBetween(leg.knee, leg.ankle, 0.35, 0.2, 9);
  ellipsoid(body, leg.hip, V(0.66, 0.62, 0.58), 10, 7);
  ellipsoid(body, leg.knee, V(0.39, 0.36, 0.34), 9, 6);
  body.addBetween(leg.ankle, leg.foot, 0.2, 0.13, 8);
  ellipsoid(body, leg.foot, V(0.57, 0.17, 0.34), 9, 6);
  for (const offset of [-0.18, -0.06, 0.06, 0.18]) {
    const tip = V(leg.foot.x + 0.68, 0.075, leg.foot.z + offset);
    body.addBetween(leg.foot, tip, 0.068, 0.024, 6);
    coneBetween(claws, tip, V(tip.x + 0.14, 0.06, tip.z), 0.038, 6);
  }
}

function addLivingArm(
  body: GeometryBatch,
  feathers: GeometryBatch,
  claws: GeometryBatch,
  arm: (typeof ARMS)[number],
): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.22, 0.145, 9);
  body.addBetween(arm.elbow, arm.wrist, 0.145, 0.085, 8);
  ellipsoid(body, arm.shoulder, V(0.28, 0.25, 0.24), 8, 6);
  ellipsoid(body, arm.elbow, V(0.17, 0.15, 0.14), 7, 5);
  ellipsoid(body, arm.wrist, V(0.17, 0.11, 0.13), 7, 5);

  feathers.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(arm.shoulder.x - 0.16, arm.shoulder.y + 0.05),
        new THREE.Vector2(arm.elbow.x + 0.04, arm.elbow.y + 0.08),
        new THREE.Vector2(arm.wrist.x + 0.2, arm.wrist.y - 0.02),
        new THREE.Vector2(arm.wrist.x + 0.02, arm.wrist.y - 0.24),
        new THREE.Vector2(arm.elbow.x + 0.08, arm.elbow.y - 0.34),
        new THREE.Vector2(arm.elbow.x - 0.14, arm.elbow.y - 0.28),
        new THREE.Vector2(arm.shoulder.x - 0.2, arm.shoulder.y - 0.16),
      ],
      0.055,
    ),
    V(0, 0, arm.wrist.z),
  );

  const palm = V(arm.wrist.x + 0.16, arm.wrist.y - 0.01, arm.wrist.z);
  body.addBetween(arm.wrist, palm, 0.085, 0.065, 7);
  for (const [index, zOffset] of [-0.105, 0, 0.105].entries()) {
    const base = V(palm.x + 0.06, palm.y - index * 0.025, palm.z + zOffset);
    const mid = V(base.x + 0.64, base.y - 0.27 - index * 0.05, base.z + zOffset * 0.2);
    const tip = V(base.x + 1.36, base.y - 0.55 - index * 0.08, base.z + zOffset * 0.28);
    body.addBetween(palm, base, 0.055, 0.04, 6);
    claws.addBetween(base, mid, 0.075, 0.045, 7);
    coneBetween(claws, mid, tip, 0.07, 7);
  }
}

function addLivingFace(dark: GeometryBatch, iris: GeometryBatch, glint: GeometryBatch): void {
  for (const side of SIDES) {
    const surface = 0.27;
    ellipsoid(dark, V(1.55, 4.24, embeddedSideZ(side, surface, 0.038)), V(0.12, 0.1, 0.038), 8, 5);
    ellipsoid(
      iris,
      V(1.57, 4.24, embeddedSideZ(side, surface + 0.008, 0.018)),
      V(0.067, 0.07, 0.018),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.59, 4.24, embeddedSideZ(side, surface + 0.012, 0.008)),
      V(0.024, 0.045, 0.008),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.55, 4.275, embeddedSideZ(side, surface + 0.015, 0.004)),
      V(0.014, 0.016, 0.004),
      5,
      4,
    );
    ellipsoid(dark, V(2.18, 4.12, embeddedSideZ(side, 0.15, 0.009)), V(0.035, 0.02, 0.009), 6, 4);
    dark.addBetween(
      V(1.58, 3.98, embeddedSideZ(side, 0.23, 0.01, 0.08)),
      V(2.36, 3.97, embeddedSideZ(side, 0.1, 0.005, 0.08)),
      0.01,
      0.005,
      6,
    );
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'therizinosaurus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const feathers = new GeometryBatch();
  const claws = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-3.8, 1.62, 0), radiusY: 0.05, radiusZ: 0.06 },
        { center: V(-3.25, 1.78, 0), radiusY: 0.18, radiusZ: 0.21 },
        { center: V(-2.65, 1.96, 0), radiusY: 0.39, radiusZ: 0.43 },
        { center: V(-2.05, 2.13, 0), radiusY: 0.68, radiusZ: 0.69 },
        { center: V(-1.48, 2.3, 0), radiusY: 0.94, radiusZ: 0.88 },
        { center: V(-0.93, 2.55, 0), radiusY: 1.12, radiusZ: 0.97 },
        { center: V(-0.42, 2.85, 0), radiusY: 0.94, radiusZ: 0.86 },
        { center: V(0.05, 3.1, 0), radiusY: 0.66, radiusZ: 0.68 },
        { center: V(0.38, 3.27, 0), radiusY: 0.45, radiusZ: 0.5 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.22, 3.24, 0), radiusY: 0.43, radiusZ: 0.48 },
        { center: V(0.47, 3.53, 0), radiusY: 0.36, radiusZ: 0.42 },
        { center: V(0.72, 3.79, 0), radiusY: 0.31, radiusZ: 0.37 },
        { center: V(0.98, 4.01, 0), radiusY: 0.27, radiusZ: 0.33 },
        { center: V(1.25, 4.15, 0), radiusY: 0.24, radiusZ: 0.29 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(1.16, 4.16, 0), radiusY: 0.22, radiusZ: 0.27 },
        { center: V(1.5, 4.18, 0), radiusY: 0.29, radiusZ: 0.29 },
        { center: V(1.85, 4.14, 0), radiusY: 0.27, radiusZ: 0.25 },
        { center: V(2.18, 4.1, 0), radiusY: 0.2, radiusZ: 0.18 },
        { center: V(2.42, 4.07, 0), radiusY: 0.1, radiusZ: 0.1 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-2.18, 1.74, 0), radiusY: 0.06, radiusZ: 0.45 },
        { center: V(-1.64, 1.46, 0), radiusY: 0.13, radiusZ: 0.67 },
        { center: V(-1.03, 1.42, 0), radiusY: 0.22, radiusZ: 0.79 },
        { center: V(-0.45, 1.76, 0), radiusY: 0.18, radiusZ: 0.66 },
        { center: V(-0.02, 2.4, 0), radiusY: 0.11, radiusZ: 0.48 },
        { center: V(0.31, 3.02, 0), radiusY: 0.06, radiusZ: 0.34 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  // Overlapping volumes break up the back contour without creating a detached feather sheet.
  ellipsoid(feathers, V(-1.72, 2.78, 0), V(0.72, 0.46, 0.76), 9, 6);
  ellipsoid(feathers, V(-1.1, 3.08, 0), V(0.68, 0.47, 0.72), 9, 6);
  ellipsoid(feathers, V(-0.48, 3.29, 0), V(0.55, 0.4, 0.61), 9, 6);

  LEGS.forEach((leg, index) => addLivingLeg(index === 0 ? body : farBody, claws, leg));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, feathers, claws, arm));
  addLivingFace(dark, iris, glint);

  group.add(
    farBody.toMesh(
      makeOrganicMaterial(THERIZINOSAURUS_COLORS.bodyShade),
      'therizinosaurus-far-limbs',
    ),
    body.toMesh(makeOrganicMaterial(THERIZINOSAURUS_COLORS.body), 'therizinosaurus-body'),
    feathers.toMesh(
      makeOrganicMaterial(THERIZINOSAURUS_COLORS.feathers),
      'therizinosaurus-feathers',
    ),
    belly.toMesh(makeOrganicMaterial(THERIZINOSAURUS_COLORS.belly), 'therizinosaurus-belly'),
    claws.toMesh(makeOrganicMaterial(THERIZINOSAURUS_COLORS.claw), 'therizinosaurus-claws'),
    iris.toMesh(makeOrganicMaterial(THERIZINOSAURUS_COLORS.iris), 'therizinosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(THERIZINOSAURUS_COLORS.dark), 'therizinosaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'therizinosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addSkeletonLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  bone.addBetween(leg.hip, leg.knee, 0.11, 0.078, 6);
  bone.addBetween(leg.knee, leg.ankle, 0.078, 0.052, 6);
  bone.addBetween(leg.ankle, leg.foot, 0.052, 0.036, 6);
  addJoint(bone, leg.hip, 0.16);
  addJoint(bone, leg.knee, 0.115);
  addJoint(bone, leg.ankle, 0.078);
  for (const offset of [-0.18, -0.06, 0.06, 0.18]) {
    bone.addBetween(leg.foot, V(leg.foot.x + 0.7, 0.07, leg.foot.z + offset), 0.035, 0.012, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.055, 0.038, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.038, 0.024, 6);
  addJoint(bone, arm.shoulder, 0.076);
  addJoint(bone, arm.elbow, 0.056);
  addJoint(bone, arm.wrist, 0.04);
  const palm = V(arm.wrist.x + 0.16, arm.wrist.y - 0.01, arm.wrist.z);
  bone.addBetween(arm.wrist, palm, 0.027, 0.021, 5);
  for (const [index, zOffset] of [-0.105, 0, 0.105].entries()) {
    const base = V(palm.x + 0.06, palm.y - index * 0.025, palm.z + zOffset);
    const mid = V(base.x + 0.64, base.y - 0.27 - index * 0.05, base.z + zOffset * 0.2);
    const tip = V(base.x + 1.36, base.y - 0.55 - index * 0.08, base.z + zOffset * 0.28);
    bone.addBetween(palm, base, 0.021, 0.015, 5);
    bone.addBetween(base, mid, 0.025, 0.016, 5);
    coneBetween(bone, mid, tip, 0.046, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'therizinosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.09, 0.065, index / (SPINE.length - 1));
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.45, radius * 0.37, 6);
  });
  NECK.forEach((point, index) => {
    const next = NECK[index + 1];
    addJoint(bone, point, 0.06);
    if (next) bone.addBetween(point, next, 0.034, 0.028, 6);
  });
  for (const x of [-1.78, -1.38, -0.98, -0.58, -0.18, 0.18]) {
    for (const side of SIDES) {
      const top = V(x, 2.52 + (x + 1.2) * 0.34, 0);
      const outer = V(x + 0.03, top.y - 0.72, side * 0.69);
      const lower = V(x + 0.08, top.y - 1.12, side * 0.28);
      bone.addBetween(top, outer, 0.035, 0.025, 5);
      bone.addBetween(outer, lower, 0.025, 0.015, 5);
    }
  }
  for (const side of SIDES) {
    const leg = side > 0 ? LEGS[0] : LEGS[1];
    const arm = side > 0 ? ARMS[0] : ARMS[1];
    shade.addBetween(V(-1.82, 2.2, side * 0.12), V(-0.92, 2.68, side * 0.5), 0.085, 0.048, 6);
    bone.addBetween(V(-1.4, 2.42, side * 0.06), leg.hip, 0.055, 0.038, 6);
    bone.addBetween(leg.hip, V(-0.85, 1.63, side * 0.39), 0.043, 0.024, 5);
    const scapula = V(-0.05, 3.18, side * 0.38);
    bone.addBetween(V(-0.1, 3.12, side * 0.05), scapula, 0.045, 0.032, 6);
    bone.addBetween(scapula, arm.shoulder, 0.038, 0.027, 6);
    bone.addBetween(arm.shoulder, V(0.03, 2.68, side * 0.14), 0.032, 0.019, 5);
  }
  LEGS.forEach((leg) => addSkeletonLeg(bone, leg));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  bone.add(
    loftGeometry(
      [
        { center: V(1.12, 4.16, 0), radiusY: 0.18, radiusZ: 0.23 },
        { center: V(1.48, 4.18, 0), radiusY: 0.25, radiusZ: 0.25 },
        { center: V(1.84, 4.14, 0), radiusY: 0.23, radiusZ: 0.22 },
        { center: V(2.18, 4.1, 0), radiusY: 0.16, radiusZ: 0.15 },
        { center: V(2.4, 4.07, 0), radiusY: 0.075, radiusZ: 0.08 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(1.43, 3.97, 0), V(2.4, 3.94, 0), 0.033, 0.014, 5);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.54, 4.24, side * 0.23), V(0.13, 0.11, 0.033), 7, 5);
    ellipsoid(dark, V(1.95, 4.14, side * 0.18), V(0.13, 0.07, 0.022), 7, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(THERIZINOSAURUS_COLORS.boneShade), 'therizinosaurus-girdles'),
    bone.toMesh(makeFlatMaterial(THERIZINOSAURUS_COLORS.bone), 'therizinosaurus-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(THERIZINOSAURUS_COLORS.dark), 'therizinosaurus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildTherizinosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
