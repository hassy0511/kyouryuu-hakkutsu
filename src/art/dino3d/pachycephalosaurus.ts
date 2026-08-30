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

export const PACHYCEPHALOSAURUS_COLORS = {
  body: '#A0785A',
  bodyShade: '#806047',
  belly: '#EFE6C8',
  dome: '#E8D5B0',
  spike: '#6E4A2E',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const HIND_LIMBS = [
  {
    hip: V(-0.35, 1.27, 0.38),
    knee: V(0.13, 0.67, 0.45),
    ankle: V(-0.08, 0.2, 0.48),
    foot: V(0.3, 0.1, 0.5),
  },
  {
    hip: V(-0.68, 1.22, -0.32),
    knee: V(-1.03, 0.64, -0.38),
    ankle: V(-0.74, 0.19, -0.41),
    foot: V(-0.35, 0.09, -0.43),
  },
] as const;

const ARMS = [
  {
    shoulder: V(0.55, 1.58, 0.29),
    elbow: V(0.72, 1.31, 0.33),
    wrist: V(0.98, 1.2, 0.35),
  },
  {
    shoulder: V(0.51, 1.55, -0.26),
    elbow: V(0.62, 1.28, -0.3),
    wrist: V(0.88, 1.18, -0.32),
  },
] as const;

const SPINE = [
  V(-2.55, 1.4, 0),
  V(-2.2, 1.42, 0),
  V(-1.78, 1.45, 0),
  V(-1.3, 1.5, 0),
  V(-0.78, 1.57, 0),
  V(-0.25, 1.62, 0),
  V(0.25, 1.62, 0),
  V(0.65, 1.66, 0),
] as const;

function addLivingLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.35, 0.23, 9);
  body.addBetween(limb.knee, limb.ankle, 0.23, 0.14, 8);
  ellipsoid(body, limb.hip, V(0.43, 0.38, 0.39), 9, 6);
  ellipsoid(body, limb.knee, V(0.25, 0.23, 0.23), 8, 5);
  body.addBetween(limb.ankle, limb.foot, 0.14, 0.1, 7);
  ellipsoid(body, limb.foot, V(0.35, 0.12, 0.23), 8, 5);
  for (const zOffset of [-0.11, 0, 0.11]) {
    const toe = V(limb.foot.x + 0.37, 0.065, limb.foot.z + zOffset);
    body.addBetween(limb.foot, toe, 0.045, 0.02, 6);
    coneBetween(claws, toe, V(toe.x + 0.08, 0.055, toe.z), 0.022, 5);
  }
}

function addLivingArm(body: GeometryBatch, arm: (typeof ARMS)[number]): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.09, 0.06, 7);
  body.addBetween(arm.elbow, arm.wrist, 0.06, 0.034, 7);
  ellipsoid(body, arm.shoulder, V(0.12, 0.11, 0.11), 7, 5);
  ellipsoid(body, arm.wrist, V(0.075, 0.042, 0.055), 6, 4);
  for (const zOffset of [-0.04, 0, 0.04]) {
    body.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.13, arm.wrist.y - 0.035, arm.wrist.z + zOffset),
      0.016,
      0.005,
      5,
    );
  }
}

function addDomeSpikes(batch: GeometryBatch, boneView: boolean): void {
  const scale = boneView ? 0.82 : 1;
  for (const side of SIDES) {
    const z = side * 0.37;
    for (const [base, tip] of [
      [V(0.93, 1.93, z), V(0.82, 1.93, side * 0.5)],
      [V(1.17, 1.82, z * 1.03), V(1.12, 1.75, side * 0.51)],
      [V(1.24, 1.7, z * 0.94), V(1.28, 1.58, side * 0.48)],
    ] as const) {
      const midpoint = new THREE.Vector3().lerpVectors(base, tip, 1 - scale);
      coneBetween(batch, midpoint, tip, boneView ? 0.045 : 0.055, 6);
    }
  }
}

function addLivingHeadDetails(
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
): void {
  for (const side of SIDES) {
    const eyeSurface = 0.36;
    ellipsoid(
      dark,
      V(1.42, 1.82, embeddedSideZ(side, eyeSurface, 0.04)),
      V(0.13, 0.11, 0.04),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(1.44, 1.82, embeddedSideZ(side, eyeSurface + 0.01, 0.019)),
      V(0.073, 0.075, 0.019),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.46, 1.82, embeddedSideZ(side, eyeSurface + 0.016, 0.009)),
      V(0.03, 0.048, 0.009),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.425, 1.855, embeddedSideZ(side, eyeSurface + 0.02, 0.005)),
      V(0.018, 0.02, 0.005),
      5,
      4,
    );
    ellipsoid(dark, V(1.83, 1.61, embeddedSideZ(side, 0.22, 0.012)), V(0.04, 0.026, 0.012), 6, 4);
    dark.addBetween(
      V(1.42, 1.45, embeddedSideZ(side, 0.3, 0.012, 0.08)),
      V(1.94, 1.43, embeddedSideZ(side, 0.12, 0.006, 0.08)),
      0.012,
      0.006,
      5,
    );
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pachycephalosaurus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const dome = new GeometryBatch();
  const spikes = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();
  const claws = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-2.62, 1.39, 0), radiusY: 0.035, radiusZ: 0.04 },
        { center: V(-2.28, 1.42, 0), radiusY: 0.09, radiusZ: 0.11 },
        { center: V(-1.85, 1.46, 0), radiusY: 0.2, radiusZ: 0.24 },
        { center: V(-1.35, 1.5, 0), radiusY: 0.37, radiusZ: 0.42 },
        { center: V(-0.82, 1.54, 0), radiusY: 0.5, radiusZ: 0.52 },
        { center: V(-0.25, 1.56, 0), radiusY: 0.53, radiusZ: 0.54 },
        { center: V(0.28, 1.57, 0), radiusY: 0.46, radiusZ: 0.48 },
        { center: V(0.68, 1.62, 0), radiusY: 0.32, radiusZ: 0.36 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.52, 1.61, 0), radiusY: 0.31, radiusZ: 0.35 },
        { center: V(0.83, 1.7, 0), radiusY: 0.29, radiusZ: 0.33 },
        { center: V(1.05, 1.78, 0), radiusY: 0.3, radiusZ: 0.34 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.96, 1.77, 0), radiusY: 0.31, radiusZ: 0.34 },
        { center: V(1.3, 1.73, 0), radiusY: 0.4, radiusZ: 0.39 },
        { center: V(1.62, 1.64, 0), radiusY: 0.34, radiusZ: 0.31 },
        { center: V(1.89, 1.56, 0), radiusY: 0.18, radiusZ: 0.2 },
        { center: V(2.05, 1.53, 0), radiusY: 0.1, radiusZ: 0.12 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-1.36, 1.24, 0), radiusY: 0.05, radiusZ: 0.3 },
        { center: V(-0.77, 1.12, 0), radiusY: 0.1, radiusZ: 0.43 },
        { center: V(-0.18, 1.08, 0), radiusY: 0.13, radiusZ: 0.45 },
        { center: V(0.35, 1.2, 0), radiusY: 0.09, radiusZ: 0.37 },
        { center: V(0.88, 1.49, 0), radiusY: 0.05, radiusZ: 0.28 },
        { center: V(1.65, 1.43, 0), radiusY: 0.05, radiusZ: 0.22 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  ellipsoid(dome, V(1.18, 2.08, 0), V(0.48, 0.36, 0.42), 11, 8);
  addDomeSpikes(spikes, false);
  HIND_LIMBS.forEach((limb, index) => addLivingLeg(index === 0 ? body : farBody, claws, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, arm));
  addLivingHeadDetails(dark, iris, glint);

  group.add(
    farBody.toMesh(
      makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.bodyShade),
      'pachycephalosaurus-far-limbs',
    ),
    body.toMesh(makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.body), 'pachycephalosaurus-body'),
    belly.toMesh(makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.belly), 'pachycephalosaurus-belly'),
    dome.toMesh(
      makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.dome),
      'pachycephalosaurus-bone-dome',
    ),
    spikes.toMesh(
      makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.spike),
      'pachycephalosaurus-dome-spikes',
    ),
    claws.toMesh(makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.bone), 'pachycephalosaurus-claws'),
    iris.toMesh(makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.iris), 'pachycephalosaurus-irises'),
    dark.toMesh(
      makeOrganicMaterial(PACHYCEPHALOSAURUS_COLORS.dark),
      'pachycephalosaurus-face-details',
    ),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'pachycephalosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addSkeletonLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.075, 0.055, 6);
  bone.addBetween(limb.knee, limb.ankle, 0.058, 0.04, 6);
  bone.addBetween(limb.ankle, limb.foot, 0.041, 0.029, 6);
  addBoneJoint(bone, limb.hip, 0.12);
  addBoneJoint(bone, limb.knee, 0.085);
  addBoneJoint(bone, limb.ankle, 0.06);
  for (const zOffset of [-0.09, 0, 0.09]) {
    bone.addBetween(limb.foot, V(limb.foot.x + 0.39, 0.06, limb.foot.z + zOffset), 0.027, 0.012, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.027, 0.019, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.019, 0.011, 6);
  addBoneJoint(bone, arm.shoulder, 0.043);
  addBoneJoint(bone, arm.elbow, 0.031);
  addBoneJoint(bone, arm.wrist, 0.021);
  for (const zOffset of [-0.035, 0, 0.035]) {
    bone.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.12, arm.wrist.y - 0.035, arm.wrist.z + zOffset),
      0.01,
      0.004,
      5,
    );
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pachycephalosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.08, 0.055, index / (SPINE.length - 1));
    ellipsoid(bone, point, V(radius * 1.2, radius, radius), 7, 5);
    if (next) bone.addBetween(point, next, radius * 0.48, radius * 0.4, 6);
  });
  const neck = [V(0.58, 1.64, 0), V(0.82, 1.72, 0), V(1.02, 1.77, 0)] as const;
  neck.forEach((point, index) => {
    addBoneJoint(bone, point, 0.065);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.036, 0.03, 6);
  });
  for (const x of [-1.15, -0.78, -0.4, -0.02, 0.34]) {
    for (const side of SIDES) {
      const top = V(x, 1.58 + (x + 0.4) * 0.03, 0);
      const outer = V(x, 1.27, side * 0.39);
      const lower = V(x + 0.04, 1.08, side * 0.16);
      bone.addBetween(top, outer, 0.027, 0.02, 5);
      bone.addBetween(outer, lower, 0.02, 0.013, 5);
    }
  }
  for (const side of SIDES) {
    const hind = side > 0 ? HIND_LIMBS[0] : HIND_LIMBS[1];
    const arm = side > 0 ? ARMS[0] : ARMS[1];
    shade.addBetween(V(-0.95, 1.53, side * 0.12), V(-0.25, 1.58, side * 0.34), 0.065, 0.038, 6);
    bone.addBetween(V(-0.58, 1.57, side * 0.05), hind.hip, 0.043, 0.031, 6);
    bone.addBetween(hind.hip, V(-0.3, 1.05, side * 0.28), 0.036, 0.021, 6);
    const scapula = V(0.4, 1.58, side * 0.27);
    bone.addBetween(V(0.55, 1.63, side * 0.04), scapula, 0.033, 0.024, 6);
    bone.addBetween(scapula, arm.shoulder, 0.03, 0.021, 6);
    bone.addBetween(arm.shoulder, V(0.58, 1.3, side * 0.1), 0.025, 0.016, 5);
  }
  HIND_LIMBS.forEach((limb) => addSkeletonLeg(bone, limb));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  ellipsoid(bone, V(1.17, 2.06, 0), V(0.46, 0.35, 0.4), 10, 7);
  bone.add(
    loftGeometry(
      [
        { center: V(1.02, 1.78, 0), radiusY: 0.29, radiusZ: 0.32 },
        { center: V(1.34, 1.71, 0), radiusY: 0.34, radiusZ: 0.34 },
        { center: V(1.65, 1.61, 0), radiusY: 0.27, radiusZ: 0.28 },
        { center: V(1.95, 1.53, 0), radiusY: 0.13, radiusZ: 0.16 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(1.18, 1.43, 0), V(1.98, 1.4, 0), 0.043, 0.022, 6);
  addDomeSpikes(bone, true);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.39, 1.78, side * 0.34), V(0.15, 0.13, 0.039), 7, 5);
    ellipsoid(dark, V(1.7, 1.61, side * 0.25), V(0.13, 0.08, 0.03), 7, 5);
  }

  group.add(
    shade.toMesh(
      makeFlatMaterial(PACHYCEPHALOSAURUS_COLORS.boneShade),
      'pachycephalosaurus-girdles',
    ),
    bone.toMesh(
      makeFlatMaterial(PACHYCEPHALOSAURUS_COLORS.bone),
      'pachycephalosaurus-skeleton-bones-dome',
    ),
    dark.toMesh(
      makeFlatMaterial(PACHYCEPHALOSAURUS_COLORS.dark),
      'pachycephalosaurus-skull-openings',
    ),
  );
  setShadowFlags(group);
  return group;
}

export function buildPachycephalosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
