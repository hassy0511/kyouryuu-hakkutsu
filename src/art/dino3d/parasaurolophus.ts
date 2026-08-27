import * as THREE from 'three';
import {
  ellipsoid,
  embeddedSideZ,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const PARASAUROLOPHUS_COLORS = {
  body: '#7E9B6A',
  bodyShade: '#627B52',
  belly: '#EFE6C0',
  crest: '#C0563E',
  stripe: '#5E7A50',
  beak: '#D8C89E',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const HIND_LIMBS = [
  {
    hip: V(-0.75, 2.55, 0.62),
    knee: V(0.12, 1.34, 0.72),
    ankle: V(-0.18, 0.3, 0.78),
    foot: V(0.55, 0.13, 0.8),
  },
  {
    hip: V(-1.25, 2.48, -0.53),
    knee: V(-1.78, 1.27, -0.64),
    ankle: V(-1.15, 0.28, -0.7),
    foot: V(-0.38, 0.12, -0.72),
  },
] as const;

const ARMS = [
  {
    shoulder: V(1.05, 3.0, 0.47),
    elbow: V(1.38, 2.54, 0.53),
    wrist: V(1.8, 2.32, 0.56),
  },
  {
    shoulder: V(1.0, 2.96, -0.41),
    elbow: V(1.23, 2.49, -0.47),
    wrist: V(1.65, 2.29, -0.5),
  },
] as const;

const SPINE = [
  V(-5.45, 2.5, 0),
  V(-4.9, 2.53, 0),
  V(-4.3, 2.58, 0),
  V(-3.65, 2.65, 0),
  V(-2.95, 2.73, 0),
  V(-2.2, 2.82, 0),
  V(-1.45, 2.91, 0),
  V(-0.68, 3.0, 0),
  V(0.05, 3.07, 0),
  V(0.68, 3.12, 0),
] as const;

function addLivingLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.58, 0.36, 10);
  body.addBetween(limb.knee, limb.ankle, 0.36, 0.21, 9);
  ellipsoid(body, limb.hip, V(0.68, 0.62, 0.58), 10, 7);
  ellipsoid(body, limb.knee, V(0.39, 0.36, 0.35), 9, 6);
  body.addBetween(limb.ankle, limb.foot, 0.21, 0.14, 8);
  ellipsoid(body, limb.foot, V(0.6, 0.17, 0.36), 9, 6);
  for (const zOffset of [-0.19, 0, 0.19]) {
    const toe = V(limb.foot.x + 0.65, 0.08, limb.foot.z + zOffset);
    body.addBetween(limb.foot, toe, 0.07, 0.025, 6);
    claws.addBetween(toe, V(toe.x + 0.12, 0.07, toe.z), 0.028, 0.008, 5);
  }
}

function addLivingArm(body: GeometryBatch, arm: (typeof ARMS)[number]): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.16, 0.1, 8);
  body.addBetween(arm.elbow, arm.wrist, 0.1, 0.055, 7);
  ellipsoid(body, arm.shoulder, V(0.2, 0.19, 0.18), 8, 5);
  ellipsoid(body, arm.wrist, V(0.13, 0.065, 0.095), 7, 5);
  for (const zOffset of [-0.07, -0.023, 0.023, 0.07]) {
    body.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.26, arm.wrist.y - 0.08, arm.wrist.z + zOffset),
      0.027,
      0.007,
      5,
    );
  }
}

function buildCrest(color: THREE.ColorRepresentation, name: string, skeleton = false): THREE.Mesh {
  const batch = new GeometryBatch();
  batch.add(
    loftGeometry(
      [
        {
          center: V(1.32, 3.98, 0),
          radiusY: skeleton ? 0.08 : 0.13,
          radiusZ: skeleton ? 0.11 : 0.17,
        },
        {
          center: V(1.78, 4.03, 0),
          radiusY: skeleton ? 0.14 : 0.22,
          radiusZ: skeleton ? 0.16 : 0.23,
        },
        { center: V(2.28, 3.94, 0), radiusY: skeleton ? 0.2 : 0.3, radiusZ: skeleton ? 0.2 : 0.29 },
        {
          center: V(2.7, 3.77, 0),
          radiusY: skeleton ? 0.24 : 0.35,
          radiusZ: skeleton ? 0.23 : 0.33,
        },
        {
          center: V(3.02, 3.61, 0),
          radiusY: skeleton ? 0.2 : 0.29,
          radiusZ: skeleton ? 0.2 : 0.28,
        },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  return batch.toMesh(skeleton ? makeFlatMaterial(color) : makeOrganicMaterial(color), name);
}

function addLivingHeadDetails(
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
): void {
  for (const side of SIDES) {
    const eyeSurface = 0.49;
    ellipsoid(
      dark,
      V(3.02, 3.46, embeddedSideZ(side, eyeSurface, 0.05)),
      V(0.17, 0.14, 0.05),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(3.05, 3.46, embeddedSideZ(side, eyeSurface + 0.012, 0.023)),
      V(0.095, 0.095, 0.023),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(3.07, 3.46, embeddedSideZ(side, eyeSurface + 0.018, 0.011)),
      V(0.037, 0.06, 0.011),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(3.02, 3.51, embeddedSideZ(side, eyeSurface + 0.022, 0.006)),
      V(0.023, 0.025, 0.006),
      5,
      4,
    );
    ellipsoid(dark, V(3.75, 3.22, embeddedSideZ(side, 0.31, 0.015)), V(0.065, 0.035, 0.015), 6, 4);
    dark.addBetween(
      V(3.18, 2.98, embeddedSideZ(side, 0.42, 0.016, 0.07)),
      V(4.13, 2.94, embeddedSideZ(side, 0.2, 0.008, 0.07)),
      0.016,
      0.008,
      6,
    );
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'parasaurolophus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const beak = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-5.55, 2.48, 0), radiusY: 0.06, radiusZ: 0.07 },
        { center: V(-5.0, 2.52, 0), radiusY: 0.16, radiusZ: 0.19 },
        { center: V(-4.35, 2.58, 0), radiusY: 0.31, radiusZ: 0.36 },
        { center: V(-3.65, 2.65, 0), radiusY: 0.5, radiusZ: 0.55 },
        { center: V(-2.9, 2.7, 0), radiusY: 0.7, radiusZ: 0.72 },
        { center: V(-2.1, 2.75, 0), radiusY: 0.88, radiusZ: 0.84 },
        { center: V(-1.3, 2.79, 0), radiusY: 0.94, radiusZ: 0.88 },
        { center: V(-0.48, 2.86, 0), radiusY: 0.86, radiusZ: 0.82 },
        { center: V(0.25, 2.97, 0), radiusY: 0.67, radiusZ: 0.68 },
        { center: V(0.82, 3.08, 0), radiusY: 0.48, radiusZ: 0.52 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.58, 3.05, 0), radiusY: 0.5, radiusZ: 0.53 },
        { center: V(1.05, 3.16, 0), radiusY: 0.47, radiusZ: 0.5 },
        { center: V(1.48, 3.27, 0), radiusY: 0.43, radiusZ: 0.47 },
        { center: V(1.88, 3.37, 0), radiusY: 0.4, radiusZ: 0.45 },
        { center: V(2.22, 3.42, 0), radiusY: 0.38, radiusZ: 0.43 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(2.08, 3.42, 0), radiusY: 0.37, radiusZ: 0.42 },
        { center: V(2.55, 3.38, 0), radiusY: 0.45, radiusZ: 0.47 },
        { center: V(3.02, 3.29, 0), radiusY: 0.46, radiusZ: 0.45 },
        { center: V(3.48, 3.2, 0), radiusY: 0.39, radiusZ: 0.38 },
        { center: V(3.84, 3.12, 0), radiusY: 0.28, radiusZ: 0.31 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  beak.add(
    loftGeometry(
      [
        { center: V(3.68, 3.1, 0), radiusY: 0.27, radiusZ: 0.33 },
        { center: V(4.05, 3.05, 0), radiusY: 0.2, radiusZ: 0.36 },
        { center: V(4.34, 3.03, 0), radiusY: 0.12, radiusZ: 0.34 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-3.3, 2.31, 0), radiusY: 0.05, radiusZ: 0.45 },
        { center: V(-2.45, 2.08, 0), radiusY: 0.11, radiusZ: 0.66 },
        { center: V(-1.55, 1.94, 0), radiusY: 0.18, radiusZ: 0.72 },
        { center: V(-0.62, 2.03, 0), radiusY: 0.16, radiusZ: 0.65 },
        { center: V(0.2, 2.4, 0), radiusY: 0.1, radiusZ: 0.5 },
        { center: V(1.1, 2.87, 0), radiusY: 0.06, radiusZ: 0.37 },
        { center: V(2.02, 3.08, 0), radiusY: 0.04, radiusZ: 0.31 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  HIND_LIMBS.forEach((limb, index) => addLivingLeg(index === 0 ? body : farBody, beak, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, arm));
  addLivingHeadDetails(dark, iris, glint);

  group.add(
    farBody.toMesh(
      makeOrganicMaterial(PARASAUROLOPHUS_COLORS.bodyShade),
      'parasaurolophus-far-limbs',
    ),
    body.toMesh(makeOrganicMaterial(PARASAUROLOPHUS_COLORS.body), 'parasaurolophus-body'),
    belly.toMesh(makeOrganicMaterial(PARASAUROLOPHUS_COLORS.belly), 'parasaurolophus-belly'),
    buildCrest(PARASAUROLOPHUS_COLORS.crest, 'parasaurolophus-red-crest'),
    beak.toMesh(makeOrganicMaterial(PARASAUROLOPHUS_COLORS.beak), 'parasaurolophus-beak-claws'),
    iris.toMesh(makeOrganicMaterial(PARASAUROLOPHUS_COLORS.iris), 'parasaurolophus-irises'),
    dark.toMesh(makeOrganicMaterial(PARASAUROLOPHUS_COLORS.dark), 'parasaurolophus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'parasaurolophus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addSkeletonLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.115, 0.082, 6);
  bone.addBetween(limb.knee, limb.ankle, 0.085, 0.056, 6);
  bone.addBetween(limb.ankle, limb.foot, 0.056, 0.039, 6);
  addJoint(bone, limb.hip, 0.18);
  addJoint(bone, limb.knee, 0.13);
  addJoint(bone, limb.ankle, 0.09);
  for (const zOffset of [-0.16, 0, 0.16]) {
    bone.addBetween(limb.foot, V(limb.foot.x + 0.7, 0.075, limb.foot.z + zOffset), 0.04, 0.017, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.043, 0.031, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.031, 0.019, 6);
  addJoint(bone, arm.shoulder, 0.066);
  addJoint(bone, arm.elbow, 0.046);
  addJoint(bone, arm.wrist, 0.032);
  for (const zOffset of [-0.055, -0.018, 0.018, 0.055]) {
    bone.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.25, arm.wrist.y - 0.08, arm.wrist.z + zOffset),
      0.016,
      0.005,
      5,
    );
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'parasaurolophus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.12, 0.075, index / (SPINE.length - 1));
    ellipsoid(bone, point, V(radius * 1.2, radius, radius), 7, 5);
    if (next) bone.addBetween(point, next, radius * 0.48, radius * 0.39, 6);
  });
  const neck = [
    V(0.55, 3.1, 0),
    V(1.0, 3.18, 0),
    V(1.43, 3.28, 0),
    V(1.83, 3.37, 0),
    V(2.17, 3.42, 0),
  ] as const;
  neck.forEach((point, index) => {
    addJoint(bone, point, 0.085);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.047, 0.039, 6);
  });
  for (const x of [-3.0, -2.45, -1.9, -1.35, -0.8, -0.25, 0.28]) {
    for (const side of SIDES) {
      const top = V(x, 2.75 + (x + 2.1) * 0.07, 0);
      const outer = V(x, 2.15, side * (0.72 - Math.abs(x + 1.3) * 0.04));
      const lower = V(x + 0.08, 1.86, side * 0.22);
      bone.addBetween(top, outer, 0.04, 0.029, 5);
      bone.addBetween(outer, lower, 0.029, 0.019, 5);
    }
  }
  for (const side of SIDES) {
    const hind = side > 0 ? HIND_LIMBS[0] : HIND_LIMBS[1];
    const arm = side > 0 ? ARMS[0] : ARMS[1];
    shade.addBetween(V(-2.0, 2.78, side * 0.16), V(-0.7, 2.92, side * 0.53), 0.105, 0.06, 6);
    bone.addBetween(V(-1.25, 2.9, side * 0.07), hind.hip, 0.07, 0.048, 6);
    bone.addBetween(hind.hip, V(-0.72, 1.88, side * 0.45), 0.056, 0.031, 6);
    const scapula = V(0.72, 2.95, side * 0.43);
    bone.addBetween(V(0.55, 3.05, side * 0.06), scapula, 0.055, 0.039, 6);
    bone.addBetween(scapula, arm.shoulder, 0.047, 0.034, 6);
    bone.addBetween(arm.shoulder, V(0.95, 2.42, side * 0.15), 0.039, 0.025, 5);
  }
  HIND_LIMBS.forEach((limb) => addSkeletonLeg(bone, limb));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  bone.add(
    loftGeometry(
      [
        { center: V(2.05, 3.42, 0), radiusY: 0.31, radiusZ: 0.37 },
        { center: V(2.52, 3.37, 0), radiusY: 0.38, radiusZ: 0.4 },
        { center: V(3.0, 3.28, 0), radiusY: 0.39, radiusZ: 0.39 },
        { center: V(3.47, 3.18, 0), radiusY: 0.32, radiusZ: 0.33 },
        { center: V(3.9, 3.08, 0), radiusY: 0.19, radiusZ: 0.24 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(2.35, 2.98, 0), V(4.18, 2.91, 0), 0.065, 0.031, 6);
  for (const side of SIDES) {
    ellipsoid(dark, V(3.0, 3.42, side * 0.38), V(0.19, 0.16, 0.047), 7, 5);
    ellipsoid(dark, V(3.5, 3.2, side * 0.3), V(0.2, 0.1, 0.035), 7, 5);
    dark.addBetween(V(2.65, 3.68, side * 0.14), V(1.52, 3.98, side * 0.08), 0.025, 0.012, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(PARASAUROLOPHUS_COLORS.boneShade), 'parasaurolophus-girdles'),
    bone.toMesh(makeFlatMaterial(PARASAUROLOPHUS_COLORS.bone), 'parasaurolophus-skeleton-bones'),
    buildCrest(PARASAUROLOPHUS_COLORS.bone, 'parasaurolophus-skeleton-crest', true),
    dark.toMesh(makeFlatMaterial(PARASAUROLOPHUS_COLORS.dark), 'parasaurolophus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildParasaurolophus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
