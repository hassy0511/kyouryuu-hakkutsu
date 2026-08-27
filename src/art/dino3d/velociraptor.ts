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

export const VELOCIRAPTOR_COLORS = {
  body: '#B08A4E',
  bodyShade: '#8E6D3E',
  belly: '#EFE2C0',
  featherTip: '#6E4A2E',
  iris: '#C6A538',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const SPINE = [
  V(-4.35, 1.78, 0),
  V(-3.8, 1.82, 0),
  V(-3.2, 1.87, 0),
  V(-2.58, 1.94, 0),
  V(-1.94, 2.01, 0),
  V(-1.3, 2.08, 0),
  V(-0.68, 2.14, 0),
  V(-0.08, 2.19, 0),
  V(0.45, 2.2, 0),
] as const;

const HIND_LIMBS = [
  {
    hip: V(-0.95, 1.96, 0.48),
    knee: V(-0.18, 1.08, 0.55),
    ankle: V(-0.42, 0.27, 0.59),
    foot: V(0.05, 0.13, 0.6),
  },
  {
    hip: V(-1.3, 1.92, -0.42),
    knee: V(-1.78, 1.04, -0.48),
    ankle: V(-1.3, 0.25, -0.52),
    foot: V(-0.82, 0.12, -0.53),
  },
] as const;

const ARMS = [
  {
    shoulder: V(0.48, 2.23, 0.34),
    elbow: V(0.84, 1.9, 0.4),
    wrist: V(1.27, 1.82, 0.43),
  },
  {
    shoulder: V(0.46, 2.2, -0.3),
    elbow: V(0.7, 1.86, -0.35),
    wrist: V(1.1, 1.77, -0.38),
  },
] as const;

function addLivingFoot(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.34, 0.21, 9);
  body.addBetween(limb.knee, limb.ankle, 0.21, 0.115, 8);
  ellipsoid(body, limb.hip, V(0.43, 0.4, 0.39), 9, 6);
  ellipsoid(body, limb.knee, V(0.24, 0.22, 0.21), 8, 5);
  body.addBetween(limb.ankle, limb.foot, 0.115, 0.075, 7);
  ellipsoid(body, limb.foot, V(0.29, 0.105, 0.17), 8, 5);

  for (const zOffset of [-0.1, 0.11]) {
    const toeTip = V(limb.foot.x + 0.43, 0.07, limb.foot.z + zOffset);
    body.addBetween(limb.foot, toeTip, 0.043, 0.016, 6);
    coneBetween(claws, toeTip, V(toeTip.x + 0.1, 0.055, toeTip.z), 0.026, 5);
  }

  // Raised second toe: two connected segments keep the large sickle claw readable in silhouette.
  const toeKnuckle = V(limb.foot.x + 0.18, 0.39, limb.foot.z + 0.04);
  const clawBase = V(limb.foot.x + 0.43, 0.46, limb.foot.z + 0.045);
  body.addBetween(limb.foot, toeKnuckle, 0.065, 0.05, 7);
  body.addBetween(toeKnuckle, clawBase, 0.05, 0.035, 7);
  coneBetween(claws, clawBase, V(limb.foot.x + 0.57, 0.2, limb.foot.z + 0.045), 0.085, 7);
}

function addLivingArm(
  body: GeometryBatch,
  feathers: GeometryBatch,
  arm: (typeof ARMS)[number],
): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.105, 0.072, 7);
  body.addBetween(arm.elbow, arm.wrist, 0.072, 0.042, 7);
  ellipsoid(body, arm.shoulder, V(0.14, 0.13, 0.12), 7, 5);
  ellipsoid(body, arm.elbow, V(0.09, 0.08, 0.075), 6, 5);

  const palm = V(arm.wrist.x + 0.08, arm.wrist.y - 0.015, arm.wrist.z);
  ellipsoid(body, palm, V(0.12, 0.055, 0.08), 6, 5);
  for (const offset of [-0.055, 0, 0.055]) {
    body.addBetween(palm, V(palm.x + 0.18, palm.y - 0.04, palm.z + offset), 0.018, 0.005, 5);
  }

  // One connected, scalloped wing surface reads as feathers without detached rods.
  feathers.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(arm.shoulder.x - 0.08, arm.shoulder.y - 0.02),
        new THREE.Vector2(arm.elbow.x - 0.05, arm.elbow.y - 0.01),
        new THREE.Vector2(arm.wrist.x + 0.16, arm.wrist.y - 0.03),
        new THREE.Vector2(arm.wrist.x + 0.22, arm.wrist.y - 0.17),
        new THREE.Vector2(arm.wrist.x - 0.02, arm.wrist.y - 0.22),
        new THREE.Vector2(arm.elbow.x + 0.18, arm.elbow.y - 0.36),
        new THREE.Vector2(arm.elbow.x + 0.02, arm.elbow.y - 0.33),
        new THREE.Vector2(arm.elbow.x - 0.12, arm.elbow.y - 0.4),
        new THREE.Vector2(arm.elbow.x - 0.27, arm.elbow.y - 0.3),
        new THREE.Vector2(arm.shoulder.x - 0.14, arm.shoulder.y - 0.2),
      ],
      0.045,
    ),
    V(0, 0, arm.wrist.z),
  );
}

function addLivingFace(
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
  teeth: GeometryBatch,
): void {
  for (const side of SIDES) {
    const surface = 0.31;
    ellipsoid(
      dark,
      V(1.83, 2.42, embeddedSideZ(side, surface, 0.042)),
      V(0.135, 0.115, 0.042),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(1.85, 2.42, embeddedSideZ(side, surface + 0.008, 0.02)),
      V(0.078, 0.078, 0.02),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.87, 2.42, embeddedSideZ(side, surface + 0.013, 0.009)),
      V(0.027, 0.05, 0.009),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.83, 2.46, embeddedSideZ(side, surface + 0.017, 0.005)),
      V(0.017, 0.019, 0.005),
      5,
      4,
    );
    ellipsoid(dark, V(2.76, 2.28, embeddedSideZ(side, 0.16, 0.01)), V(0.04, 0.022, 0.01), 6, 4);
    dark.addBetween(
      V(1.92, 2.08, embeddedSideZ(side, 0.27, 0.011, 0.08)),
      V(2.94, 2.08, embeddedSideZ(side, 0.12, 0.006, 0.08)),
      0.011,
      0.006,
      6,
    );
    for (let index = 0; index < 4; index += 1) {
      const x = 2.08 + index * 0.21;
      const depth = 0.25 - index * 0.035;
      const z = embeddedSideZ(side, depth, 0.016, 0.08);
      coneBetween(teeth, V(x, 2.09, z), V(x + 0.01, 2.015, z), 0.017, 5);
    }
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'velociraptor-living';
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
        { center: V(-4.55, 1.76, 0), radiusY: 0.025, radiusZ: 0.035 },
        { center: V(-4.1, 1.8, 0), radiusY: 0.07, radiusZ: 0.08 },
        { center: V(-3.5, 1.85, 0), radiusY: 0.14, radiusZ: 0.16 },
        { center: V(-2.85, 1.91, 0), radiusY: 0.25, radiusZ: 0.28 },
        { center: V(-2.18, 1.98, 0), radiusY: 0.39, radiusZ: 0.42 },
        { center: V(-1.5, 2.04, 0), radiusY: 0.53, radiusZ: 0.53 },
        { center: V(-0.82, 2.1, 0), radiusY: 0.57, radiusZ: 0.55 },
        { center: V(-0.18, 2.16, 0), radiusY: 0.49, radiusZ: 0.49 },
        { center: V(0.38, 2.2, 0), radiusY: 0.36, radiusZ: 0.38 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.2, 2.2, 0), radiusY: 0.35, radiusZ: 0.37 },
        { center: V(0.68, 2.23, 0), radiusY: 0.31, radiusZ: 0.34 },
        { center: V(1.1, 2.29, 0), radiusY: 0.28, radiusZ: 0.32 },
        { center: V(1.43, 2.34, 0), radiusY: 0.27, radiusZ: 0.31 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(1.32, 2.34, 0), radiusY: 0.26, radiusZ: 0.3 },
        { center: V(1.72, 2.33, 0), radiusY: 0.34, radiusZ: 0.33 },
        { center: V(2.16, 2.28, 0), radiusY: 0.32, radiusZ: 0.29 },
        { center: V(2.56, 2.23, 0), radiusY: 0.25, radiusZ: 0.23 },
        { center: V(2.92, 2.2, 0), radiusY: 0.14, radiusZ: 0.14 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-2.2, 1.73, 0), radiusY: 0.045, radiusZ: 0.25 },
        { center: V(-1.5, 1.58, 0), radiusY: 0.1, radiusZ: 0.39 },
        { center: V(-0.78, 1.55, 0), radiusY: 0.13, radiusZ: 0.42 },
        { center: V(-0.12, 1.7, 0), radiusY: 0.1, radiusZ: 0.35 },
        { center: V(0.62, 2.02, 0), radiusY: 0.06, radiusZ: 0.26 },
        { center: V(1.35, 2.16, 0), radiusY: 0.035, radiusZ: 0.2 },
      ],
      8,
    ),
    V(0, 0, 0),
  );

  HIND_LIMBS.forEach((limb, index) => addLivingFoot(index === 0 ? body : farBody, claws, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, feathers, arm));
  for (const offset of [-0.11, 0, 0.11]) {
    feathers.addBetween(
      V(-3.62, 1.84, offset * 0.3),
      V(-4.42, 1.73 + Math.abs(offset) * 0.18, offset),
      0.055,
      0.012,
      6,
    );
  }
  addLivingFace(dark, iris, glint, claws);

  group.add(
    farBody.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.bodyShade), 'velociraptor-far-limbs'),
    body.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.body), 'velociraptor-body'),
    belly.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.belly), 'velociraptor-belly'),
    feathers.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.featherTip), 'velociraptor-feathers'),
    claws.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.bone), 'velociraptor-claws-teeth'),
    iris.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.iris), 'velociraptor-irises'),
    dark.toMesh(makeOrganicMaterial(VELOCIRAPTOR_COLORS.dark), 'velociraptor-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'velociraptor-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonFoot(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.076, 0.054, 6);
  bone.addBetween(limb.knee, limb.ankle, 0.054, 0.036, 6);
  bone.addBetween(limb.ankle, limb.foot, 0.036, 0.025, 5);
  addJoint(bone, limb.hip, 0.105);
  addJoint(bone, limb.knee, 0.075);
  addJoint(bone, limb.ankle, 0.052);
  for (const zOffset of [-0.1, 0.11]) {
    bone.addBetween(
      limb.foot,
      V(limb.foot.x + 0.45, 0.065, limb.foot.z + zOffset),
      0.023,
      0.008,
      5,
    );
  }
  const knuckle = V(limb.foot.x + 0.18, 0.39, limb.foot.z + 0.04);
  const clawBase = V(limb.foot.x + 0.43, 0.46, limb.foot.z + 0.045);
  bone.addBetween(limb.foot, knuckle, 0.034, 0.025, 5);
  bone.addBetween(knuckle, clawBase, 0.025, 0.017, 5);
  coneBetween(bone, clawBase, V(limb.foot.x + 0.57, 0.2, limb.foot.z + 0.045), 0.055, 6);
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.03, 0.021, 5);
  bone.addBetween(arm.elbow, arm.wrist, 0.021, 0.013, 5);
  addJoint(bone, arm.shoulder, 0.043);
  addJoint(bone, arm.elbow, 0.032);
  addJoint(bone, arm.wrist, 0.021);
  for (const zOffset of [-0.04, 0, 0.04]) {
    bone.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.2, arm.wrist.y - 0.04, arm.wrist.z + zOffset),
      0.011,
      0.004,
      5,
    );
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'velociraptor-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.065, 0.048, index / (SPINE.length - 1));
    ellipsoid(bone, point, V(radius * 1.25, radius, radius), 6, 5);
    if (next) bone.addBetween(point, next, radius * 0.42, radius * 0.34, 5);
  });
  const neck = [V(0.34, 2.2, 0), V(0.73, 2.23, 0), V(1.08, 2.28, 0), V(1.4, 2.33, 0)] as const;
  neck.forEach((point, index) => {
    addJoint(bone, point, 0.05);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.028, 0.023, 5);
  });
  for (const x of [-1.92, -1.5, -1.08, -0.66, -0.24, 0.16]) {
    for (const side of SIDES) {
      const top = V(x, 2.06 + (x + 1.1) * 0.07, 0);
      const outer = V(x + 0.02, 1.72, side * 0.43);
      const lower = V(x + 0.06, 1.5, side * 0.18);
      bone.addBetween(top, outer, 0.023, 0.017, 5);
      bone.addBetween(outer, lower, 0.017, 0.01, 5);
    }
  }
  for (const side of SIDES) {
    const leg = side > 0 ? HIND_LIMBS[0] : HIND_LIMBS[1];
    const arm = side > 0 ? ARMS[0] : ARMS[1];
    shade.addBetween(V(-1.68, 2.0, side * 0.1), V(-0.77, 2.07, side * 0.39), 0.057, 0.034, 6);
    bone.addBetween(V(-1.22, 2.05, side * 0.04), leg.hip, 0.04, 0.027, 5);
    bone.addBetween(leg.hip, V(-0.72, 1.48, side * 0.31), 0.031, 0.017, 5);
    const scapula = V(0.22, 2.17, side * 0.29);
    bone.addBetween(V(0.12, 2.18, side * 0.04), scapula, 0.031, 0.022, 5);
    bone.addBetween(scapula, arm.shoulder, 0.026, 0.019, 5);
    bone.addBetween(arm.shoulder, V(0.42, 1.85, side * 0.11), 0.022, 0.013, 5);
  }
  HIND_LIMBS.forEach((limb) => addSkeletonFoot(bone, limb));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  bone.add(
    loftGeometry(
      [
        { center: V(1.32, 2.34, 0), radiusY: 0.21, radiusZ: 0.26 },
        { center: V(1.72, 2.33, 0), radiusY: 0.29, radiusZ: 0.29 },
        { center: V(2.14, 2.28, 0), radiusY: 0.27, radiusZ: 0.26 },
        { center: V(2.55, 2.22, 0), radiusY: 0.2, radiusZ: 0.19 },
        { center: V(2.9, 2.19, 0), radiusY: 0.1, radiusZ: 0.11 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(1.66, 2.06, 0), V(2.94, 2.04, 0), 0.035, 0.016, 5);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.82, 2.41, side * 0.27), V(0.15, 0.13, 0.035), 7, 5);
    ellipsoid(dark, V(2.34, 2.29, side * 0.21), V(0.15, 0.08, 0.025), 7, 5);
    for (let index = 0; index < 4; index += 1) {
      const x = 2.02 + index * 0.2;
      const z = side * (0.23 - index * 0.035);
      coneBetween(bone, V(x, 2.07, z), V(x + 0.01, 1.99, z), 0.015, 5);
    }
  }

  group.add(
    shade.toMesh(makeFlatMaterial(VELOCIRAPTOR_COLORS.boneShade), 'velociraptor-girdles'),
    bone.toMesh(makeFlatMaterial(VELOCIRAPTOR_COLORS.bone), 'velociraptor-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(VELOCIRAPTOR_COLORS.dark), 'velociraptor-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildVelociraptor(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
