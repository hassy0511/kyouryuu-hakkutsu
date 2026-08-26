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

export const CARNOTAURUS_COLORS = {
  body: '#7A4A3A',
  bodyShade: '#63392F',
  belly: '#E8D5B0',
  horn: '#F2EAD8',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const TORSO_SPINE = [
  V(1.05, 2.25, 0),
  V(0.48, 2.28, 0),
  V(-0.12, 2.27, 0),
  V(-0.72, 2.22, 0),
  V(-1.3, 2.12, 0),
] as const;

const TAIL_SPINE = [
  V(-1.3, 2.12, 0),
  V(-1.95, 2.05, 0),
  V(-2.62, 2.0, 0),
  V(-3.25, 1.98, 0),
  V(-3.78, 1.96, 0),
  V(-4.2, 1.94, 0),
  V(-4.48, 1.93, 0),
] as const;

const HIND_LIMBS = [
  {
    hip: V(-0.5, 2.02, 0.53),
    knee: V(0.18, 1.08, 0.62),
    ankle: V(-0.08, 0.28, 0.66),
    foot: V(0.44, 0.13, 0.68),
  },
  {
    hip: V(-0.88, 1.98, -0.45),
    knee: V(-1.4, 1.03, -0.53),
    ankle: V(-0.9, 0.27, -0.57),
    foot: V(-0.35, 0.12, -0.58),
  },
] as const;

const ARMS = [
  {
    shoulder: V(1.1, 2.38, 0.4),
    elbow: V(1.17, 2.1, 0.43),
    wrist: V(1.32, 1.98, 0.45),
  },
  {
    shoulder: V(1.12, 2.34, -0.36),
    elbow: V(1.08, 2.08, -0.4),
    wrist: V(1.23, 1.96, -0.42),
  },
] as const;

function addLivingHindLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.55, 0.34, 10);
  body.addBetween(limb.knee, limb.ankle, 0.34, 0.2, 9);
  ellipsoid(body, limb.hip, V(0.64, 0.59, 0.55), 11, 7);
  ellipsoid(body, limb.knee, V(0.38, 0.35, 0.34), 9, 6);
  body.addBetween(limb.ankle, limb.foot, 0.19, 0.13, 8);
  ellipsoid(body, limb.foot, V(0.56, 0.16, 0.3), 9, 6);

  for (const zOffset of [-0.19, 0, 0.19]) {
    const toeBase = V(limb.foot.x + 0.29, 0.125, limb.foot.z + zOffset * 0.45);
    const toeTip = V(limb.foot.x + 0.72, 0.085, limb.foot.z + zOffset);
    body.addBetween(toeBase, toeTip, 0.075, 0.035, 6);
    coneBetween(claws, toeTip, V(toeTip.x + 0.15, 0.065, toeTip.z + zOffset * 0.08), 0.04, 6);
  }
}

function addLivingArm(body: GeometryBatch, arm: (typeof ARMS)[number]): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.105, 0.065, 7);
  body.addBetween(arm.elbow, arm.wrist, 0.065, 0.038, 7);
  ellipsoid(body, arm.shoulder, V(0.14, 0.13, 0.125), 7, 5);
  ellipsoid(body, arm.elbow, V(0.08, 0.075, 0.075), 6, 5);

  const palm = V(arm.wrist.x + 0.055, arm.wrist.y - 0.02, arm.wrist.z);
  ellipsoid(body, palm, V(0.09, 0.045, 0.07), 6, 5);
  for (const zOffset of [-0.045, -0.015, 0.015, 0.045]) {
    body.addBetween(
      V(palm.x + 0.025, palm.y, palm.z + zOffset * 0.45),
      V(palm.x + 0.12, palm.y - 0.035, palm.z + zOffset),
      0.018,
      0.006,
      5,
    );
  }
}

function addLivingHeadDetails(
  horns: GeometryBatch,
  iris: GeometryBatch,
  dark: GeometryBatch,
  glint: GeometryBatch,
  teeth: GeometryBatch,
): void {
  for (const side of SIDES) {
    const hornBase = V(2.34, 2.92, embeddedSideZ(side, 0.44, 0.13, 0.18));
    const hornTip = V(2.16, 3.2, side * 0.55);
    ellipsoid(horns, hornBase, V(0.18, 0.15, 0.14), 7, 5);
    coneBetween(horns, hornBase, hornTip, 0.13, 7);

    const eyeSurface = 0.48;
    ellipsoid(
      dark,
      V(2.46, 2.69, embeddedSideZ(side, eyeSurface, 0.05)),
      V(0.16, 0.13, 0.05),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(2.48, 2.69, embeddedSideZ(side, eyeSurface + 0.01, 0.022)),
      V(0.085, 0.09, 0.022),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(2.5, 2.69, embeddedSideZ(side, eyeSurface + 0.016, 0.01)),
      V(0.035, 0.057, 0.01),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(2.45, 2.735, embeddedSideZ(side, eyeSurface + 0.02, 0.006)),
      V(0.02, 0.022, 0.006),
      5,
      4,
    );
    ellipsoid(dark, V(3.28, 2.55, embeddedSideZ(side, 0.33, 0.016)), V(0.062, 0.038, 0.016), 6, 4);

    const mouth = [
      V(2.28, 2.19, embeddedSideZ(side, 0.41, 0.017, 0.08)),
      V(2.75, 2.17, embeddedSideZ(side, 0.38, 0.015, 0.08)),
      V(3.16, 2.16, embeddedSideZ(side, 0.29, 0.012, 0.08)),
      V(3.5, 2.18, embeddedSideZ(side, 0.16, 0.007, 0.08)),
    ];
    dark.addBetween(mouth[0]!, mouth[1]!, 0.017, 0.015, 6);
    dark.addBetween(mouth[1]!, mouth[2]!, 0.015, 0.012, 6);
    dark.addBetween(mouth[2]!, mouth[3]!, 0.012, 0.007, 6);

    for (let index = 0; index < 5; index += 1) {
      const x = 2.42 + index * 0.22;
      const gumDepth = 0.39 - index * 0.045;
      const gumZ = embeddedSideZ(side, gumDepth, 0.026, 0.02);
      coneBetween(teeth, V(x, 2.2, gumZ), V(x + 0.015, 2.1, gumZ), 0.027, 5);
    }
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'carnotaurus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const horns = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();
  const cream = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-4.48, 1.93, 0), radiusY: 0.035, radiusZ: 0.045 },
        { center: V(-4.2, 1.94, 0), radiusY: 0.075, radiusZ: 0.09 },
        { center: V(-3.78, 1.96, 0), radiusY: 0.15, radiusZ: 0.18 },
        { center: V(-3.25, 1.98, 0), radiusY: 0.27, radiusZ: 0.31 },
        { center: V(-2.62, 2.0, 0), radiusY: 0.43, radiusZ: 0.48 },
        { center: V(-1.95, 2.05, 0), radiusY: 0.61, radiusZ: 0.64 },
        { center: V(-1.3, 2.12, 0), radiusY: 0.75, radiusZ: 0.73 },
        { center: V(-0.67, 2.22, 0), radiusY: 0.79, radiusZ: 0.74 },
        { center: V(-0.05, 2.27, 0), radiusY: 0.74, radiusZ: 0.69 },
        { center: V(0.55, 2.28, 0), radiusY: 0.62, radiusZ: 0.59 },
        { center: V(1.08, 2.3, 0), radiusY: 0.46, radiusZ: 0.47 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.87, 2.29, 0), radiusY: 0.48, radiusZ: 0.48 },
        { center: V(1.24, 2.36, 0), radiusY: 0.44, radiusZ: 0.45 },
        { center: V(1.62, 2.44, 0), radiusY: 0.42, radiusZ: 0.44 },
        { center: V(1.94, 2.49, 0), radiusY: 0.43, radiusZ: 0.46 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(1.82, 2.48, 0), radiusY: 0.39, radiusZ: 0.43 },
        { center: V(2.18, 2.51, 0), radiusY: 0.53, radiusZ: 0.51 },
        { center: V(2.63, 2.5, 0), radiusY: 0.56, radiusZ: 0.51 },
        { center: V(3.04, 2.44, 0), radiusY: 0.51, radiusZ: 0.46 },
        { center: V(3.38, 2.38, 0), radiusY: 0.38, radiusZ: 0.36 },
        { center: V(3.62, 2.34, 0), radiusY: 0.19, radiusZ: 0.22 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-2.35, 1.74, 0), radiusY: 0.07, radiusZ: 0.29 },
        { center: V(-1.55, 1.58, 0), radiusY: 0.13, radiusZ: 0.46 },
        { center: V(-0.7, 1.53, 0), radiusY: 0.19, radiusZ: 0.55 },
        { center: V(0.15, 1.63, 0), radiusY: 0.2, radiusZ: 0.53 },
        { center: V(0.84, 1.92, 0), radiusY: 0.15, radiusZ: 0.42 },
        { center: V(1.5, 2.13, 0), radiusY: 0.1, radiusZ: 0.34 },
        { center: V(2.05, 2.15, 0), radiusY: 0.08, radiusZ: 0.33 },
        { center: V(2.73, 2.04, 0), radiusY: 0.1, radiusZ: 0.34 },
        { center: V(3.45, 2.17, 0), radiusY: 0.04, radiusZ: 0.18 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  HIND_LIMBS.forEach((limb, index) => addLivingHindLeg(index === 0 ? body : farBody, cream, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, arm));

  addLivingHeadDetails(horns, iris, dark, glint, cream);
  group.add(
    farBody.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.bodyShade), 'carnotaurus-far-limbs'),
    body.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.body), 'carnotaurus-body'),
    belly.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.belly), 'carnotaurus-belly'),
    horns.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.horn), 'carnotaurus-horns'),
    iris.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.iris), 'carnotaurus-irises'),
    cream.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.horn), 'carnotaurus-claws-teeth'),
    dark.toMesh(makeOrganicMaterial(CARNOTAURUS_COLORS.dark), 'carnotaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'carnotaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonHindLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.105, 0.078, 6);
  bone.addBetween(limb.knee, limb.ankle, 0.078, 0.052, 6);
  bone.addBetween(limb.ankle, limb.foot, 0.052, 0.038, 6);
  addBoneJoint(bone, limb.hip, 0.15);
  addBoneJoint(bone, limb.knee, 0.11);
  addBoneJoint(bone, limb.ankle, 0.075);
  for (const zOffset of [-0.15, 0, 0.15]) {
    const toeBase = V(limb.foot.x + 0.15, 0.12, limb.foot.z + zOffset * 0.45);
    const toeTip = V(limb.foot.x + 0.67, 0.07, limb.foot.z + zOffset);
    bone.addBetween(limb.foot, toeBase, 0.038, 0.03, 5);
    bone.addBetween(toeBase, toeTip, 0.03, 0.013, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.035, 0.026, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.026, 0.016, 6);
  addBoneJoint(bone, arm.shoulder, 0.052);
  addBoneJoint(bone, arm.elbow, 0.038);
  addBoneJoint(bone, arm.wrist, 0.026);
  const palm = V(arm.wrist.x + 0.045, arm.wrist.y - 0.015, arm.wrist.z);
  bone.addBetween(arm.wrist, palm, 0.016, 0.012, 5);
  for (const zOffset of [-0.04, -0.013, 0.013, 0.04]) {
    bone.addBetween(palm, V(palm.x + 0.11, palm.y - 0.035, palm.z + zOffset), 0.011, 0.004, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'carnotaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const fullSpine = [...TORSO_SPINE, ...TAIL_SPINE.slice(1)];
  for (let index = 0; index < fullSpine.length; index += 1) {
    const point = fullSpine[index];
    if (!point) continue;
    const scale = THREE.MathUtils.lerp(0.125, 0.045, index / (fullSpine.length - 1));
    ellipsoid(bone, point, V(scale * 1.2, scale, scale), 7, 5);
    const next = fullSpine[index + 1];
    if (next) bone.addBetween(point, next, scale * 0.46, scale * 0.38, 6);
  }

  const neck = [V(0.94, 2.27, 0), V(1.26, 2.34, 0), V(1.58, 2.42, 0), V(1.88, 2.48, 0)];
  neck.forEach((point, index) => {
    addBoneJoint(bone, point, 0.095);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.05, 0.041, 6);
  });

  for (const spine of TORSO_SPINE.slice(1)) {
    for (const side of SIDES) {
      const upper = V(spine.x, spine.y - 0.02, side * 0.1);
      const outer = V(spine.x + 0.03, spine.y - 0.44, side * 0.52);
      const lower = V(spine.x + 0.08, spine.y - 0.73, side * 0.4);
      bone.addBetween(upper, outer, 0.034, 0.025, 5);
      bone.addBetween(outer, lower, 0.025, 0.016, 5);
    }
  }

  for (const side of SIDES) {
    const arm = side > 0 ? ARMS[0] : ARMS[1];
    // The pelvis and shoulder remain connected frameworks rather than isolated round blocks.
    shade.addBetween(V(-1.12, 2.13, side * 0.14), V(-0.08, 2.2, side * 0.44), 0.082, 0.047, 6);
    bone.addBetween(V(-0.78, 2.2, side * 0.07), V(-0.5, 1.98, side * 0.53), 0.056, 0.038, 6);
    bone.addBetween(V(-0.5, 1.98, side * 0.53), V(-0.18, 1.45, side * 0.37), 0.047, 0.026, 6);
    bone.addBetween(V(-0.5, 1.98, side * 0.53), V(-1.04, 1.5, side * 0.34), 0.045, 0.024, 6);

    const scapula = V(0.72, 2.29, side * 0.38);
    const chest = V(0.9, 1.95, side * 0.14);
    bone.addBetween(V(0.98, 2.28, side * 0.07), scapula, 0.047, 0.034, 6);
    bone.addBetween(scapula, arm.shoulder, 0.04, 0.03, 6);
    bone.addBetween(arm.shoulder, chest, 0.038, 0.026, 6);
    bone.addBetween(chest, V(0.9, 1.92, 0), 0.026, 0.018, 5);
  }

  HIND_LIMBS.forEach((limb) => addSkeletonHindLeg(bone, limb));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  ellipsoid(bone, V(2.2, 2.52, 0), V(0.47, 0.51, 0.49), 9, 6);
  ellipsoid(bone, V(2.68, 2.48, 0), V(0.51, 0.48, 0.47), 9, 6);
  ellipsoid(bone, V(3.13, 2.4, 0), V(0.46, 0.39, 0.4), 8, 6);
  ellipsoid(bone, V(3.48, 2.34, 0), V(0.31, 0.23, 0.27), 8, 6);
  bone.addBetween(V(2.05, 2.17, 0), V(3.55, 2.13, 0), 0.065, 0.033, 6);

  for (const side of SIDES) {
    const hornBase = V(2.32, 2.9, side * 0.42);
    coneBetween(bone, hornBase, V(2.14, 3.18, side * 0.54), 0.105, 7);
    ellipsoid(dark, V(2.44, 2.65, side * 0.46), V(0.2, 0.16, 0.052), 7, 5);
    ellipsoid(dark, V(2.92, 2.55, side * 0.4), V(0.18, 0.12, 0.045), 7, 5);
    ellipsoid(dark, V(3.3, 2.51, side * 0.31), V(0.065, 0.04, 0.016), 6, 4);
    for (let index = 0; index < 5; index += 1) {
      const x = 2.35 + index * 0.22;
      const depth = 0.38 - index * 0.04;
      coneBetween(bone, V(x, 2.18, side * depth), V(x + 0.015, 2.07, side * depth), 0.025, 5);
    }
  }

  group.add(
    bone.toMesh(makeFlatMaterial(CARNOTAURUS_COLORS.bone), 'carnotaurus-skeleton-bones'),
    shade.toMesh(makeFlatMaterial(CARNOTAURUS_COLORS.boneShade), 'carnotaurus-pelvic-bars'),
    dark.toMesh(makeFlatMaterial(CARNOTAURUS_COLORS.dark), 'carnotaurus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildCarnotaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
