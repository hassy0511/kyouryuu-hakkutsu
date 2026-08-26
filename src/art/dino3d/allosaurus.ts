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

export const ALLOSAURUS_COLORS = {
  body: '#8C5A50',
  bodyShade: '#70443F',
  belly: '#E8D9B0',
  brow: '#D9A441',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const TORSO_SPINE = [
  V(1.02, 2.94, 0),
  V(0.48, 2.98, 0),
  V(-0.08, 2.97, 0),
  V(-0.65, 2.9, 0),
  V(-1.18, 2.78, 0),
] as const;

const TAIL_SPINE = [
  V(-1.18, 2.78, 0),
  V(-1.82, 2.66, 0),
  V(-2.48, 2.55, 0),
  V(-3.14, 2.48, 0),
  V(-3.76, 2.42, 0),
  V(-4.3, 2.37, 0),
  V(-4.7, 2.34, 0),
] as const;

const HIND_LIMBS = [
  {
    hip: V(-0.34, 2.63, 0.58),
    knee: V(0.34, 1.5, 0.68),
    ankle: V(-0.06, 0.38, 0.72),
    foot: V(0.46, 0.16, 0.73),
  },
  {
    hip: V(-0.72, 2.58, -0.48),
    knee: V(-1.22, 1.46, -0.57),
    ankle: V(-0.78, 0.37, -0.62),
    foot: V(-0.26, 0.15, -0.63),
  },
] as const;

const ARMS = [
  {
    shoulder: V(1.08, 3.12, 0.48),
    elbow: V(1.22, 2.58, 0.56),
    wrist: V(1.7, 2.34, 0.6),
  },
  {
    shoulder: V(1.13, 3.08, -0.42),
    elbow: V(1.02, 2.56, -0.5),
    wrist: V(1.48, 2.31, -0.54),
  },
] as const;

function addLivingHindLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.62, 0.43, 10);
  body.addBetween(limb.knee, limb.ankle, 0.42, 0.25, 9);
  ellipsoid(body, limb.hip, V(0.72, 0.68, 0.61), 11, 7);
  ellipsoid(body, limb.knee, V(0.46, 0.43, 0.4), 9, 6);
  body.addBetween(limb.ankle, limb.foot, 0.23, 0.16, 8);
  ellipsoid(body, limb.foot, V(0.62, 0.19, 0.35), 9, 6);

  for (const zOffset of [-0.22, 0, 0.22]) {
    const toeBase = V(limb.foot.x + 0.34, 0.15, limb.foot.z + zOffset * 0.5);
    const toeTip = V(limb.foot.x + 0.83, 0.1, limb.foot.z + zOffset);
    body.addBetween(toeBase, toeTip, 0.095, 0.045, 6);
    coneBetween(claws, toeTip, V(toeTip.x + 0.18, 0.075, toeTip.z + zOffset * 0.08), 0.05, 6);
  }
}

function addLivingArm(body: GeometryBatch, claws: GeometryBatch, arm: (typeof ARMS)[number]): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.18, 0.11, 8);
  body.addBetween(arm.elbow, arm.wrist, 0.115, 0.06, 8);
  ellipsoid(body, arm.shoulder, V(0.23, 0.22, 0.2), 8, 6);
  ellipsoid(body, arm.elbow, V(0.14, 0.13, 0.13), 7, 5);

  const palm = V(arm.wrist.x + 0.11, arm.wrist.y - 0.03, arm.wrist.z);
  ellipsoid(body, palm, V(0.17, 0.08, 0.13), 7, 5);
  for (const zOffset of [-0.1, 0, 0.1]) {
    const fingerBase = V(palm.x + 0.06, palm.y - 0.02, palm.z + zOffset * 0.45);
    const fingerTip = V(palm.x + 0.32, palm.y - 0.12, palm.z + zOffset);
    body.addBetween(fingerBase, fingerTip, 0.038, 0.018, 6);
    coneBetween(claws, fingerTip, V(fingerTip.x + 0.11, fingerTip.y - 0.06, fingerTip.z), 0.032, 6);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'allosaurus-living';

  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const brow = new GeometryBatch();
  const iris = new GeometryBatch();
  const cream = new GeometryBatch();
  const dark = new GeometryBatch();
  const eyeWhite = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-4.7, 2.34, 0), radiusY: 0.045, radiusZ: 0.055 },
        { center: V(-4.3, 2.37, 0), radiusY: 0.1, radiusZ: 0.12 },
        { center: V(-3.76, 2.42, 0), radiusY: 0.2, radiusZ: 0.23 },
        { center: V(-3.14, 2.48, 0), radiusY: 0.34, radiusZ: 0.38 },
        { center: V(-2.48, 2.55, 0), radiusY: 0.51, radiusZ: 0.55 },
        { center: V(-1.82, 2.66, 0), radiusY: 0.7, radiusZ: 0.69 },
        { center: V(-1.18, 2.78, 0), radiusY: 0.86, radiusZ: 0.8 },
        { center: V(-0.55, 2.91, 0), radiusY: 0.94, radiusZ: 0.84 },
        { center: V(0.08, 2.97, 0), radiusY: 0.9, radiusZ: 0.8 },
        { center: V(0.65, 2.98, 0), radiusY: 0.76, radiusZ: 0.7 },
        { center: V(1.08, 3.08, 0), radiusY: 0.56, radiusZ: 0.55 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(0.82, 3.02, 0), radiusY: 0.62, radiusZ: 0.58 },
        { center: V(1.13, 3.2, 0), radiusY: 0.58, radiusZ: 0.55 },
        { center: V(1.42, 3.35, 0), radiusY: 0.52, radiusZ: 0.5 },
        { center: V(1.68, 3.43, 0), radiusY: 0.45, radiusZ: 0.46 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(1.52, 3.47, 0), radiusY: 0.39, radiusZ: 0.43 },
        { center: V(1.92, 3.58, 0), radiusY: 0.48, radiusZ: 0.5 },
        { center: V(2.42, 3.6, 0), radiusY: 0.5, radiusZ: 0.51 },
        { center: V(2.95, 3.57, 0), radiusY: 0.43, radiusZ: 0.46 },
        { center: V(3.43, 3.52, 0), radiusY: 0.32, radiusZ: 0.36 },
        { center: V(3.78, 3.49, 0), radiusY: 0.14, radiusZ: 0.17 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-2.45, 2.25, 0), radiusY: 0.09, radiusZ: 0.34 },
        { center: V(-1.65, 2.13, 0), radiusY: 0.16, radiusZ: 0.51 },
        { center: V(-0.75, 2.05, 0), radiusY: 0.23, radiusZ: 0.63 },
        { center: V(0.15, 2.13, 0), radiusY: 0.24, radiusZ: 0.62 },
        { center: V(0.83, 2.47, 0), radiusY: 0.19, radiusZ: 0.49 },
        { center: V(1.42, 3.03, 0), radiusY: 0.14, radiusZ: 0.38 },
        { center: V(2.05, 3.22, 0), radiusY: 0.12, radiusZ: 0.38 },
        { center: V(2.9, 3.18, 0), radiusY: 0.11, radiusZ: 0.34 },
        { center: V(3.6, 3.27, 0), radiusY: 0.05, radiusZ: 0.2 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  HIND_LIMBS.forEach((limb, index) => addLivingHindLeg(index === 0 ? body : farBody, cream, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, cream, arm));

  for (const side of [-1, 1]) {
    ellipsoid(brow, V(2.17, 3.99, side * 0.42), V(0.34, 0.12, 0.09), 8, 5);
    coneBetween(brow, V(2.3, 3.98, side * 0.43), V(2.44, 4.1, side * 0.47), 0.08, 6);
    ellipsoid(dark, V(2.25, 3.81, side * 0.48), V(0.18, 0.14, 0.055), 8, 5);
    ellipsoid(iris, V(2.26, 3.81, side * 0.525), V(0.1, 0.1, 0.025), 8, 5);
    ellipsoid(dark, V(2.28, 3.81, side * 0.545), V(0.04, 0.065, 0.012), 6, 4);
    ellipsoid(eyeWhite, V(2.23, 3.86, side * 0.56), V(0.023, 0.026, 0.008), 5, 4);
    ellipsoid(dark, V(3.47, 3.65, side * 0.31), V(0.07, 0.045, 0.018), 6, 4);
    dark.add(new THREE.BoxGeometry(1.72, 0.045, 0.028), V(2.94, 3.24, side * 0.4));

    for (let index = 0; index < 6; index += 1) {
      const x = 2.18 + index * 0.25;
      coneBetween(cream, V(x, 3.3, side * 0.39), V(x + 0.02, 3.15, side * 0.39), 0.038, 5);
    }
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.bodyShade), 'allosaurus-far-limbs'),
    body.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.body), 'allosaurus-body'),
    belly.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.belly), 'allosaurus-belly'),
    brow.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.brow), 'allosaurus-brow-ridges'),
    iris.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.iris), 'allosaurus-irises'),
    cream.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.belly), 'allosaurus-claws-teeth'),
    dark.toMesh(makeOrganicMaterial(ALLOSAURUS_COLORS.dark), 'allosaurus-face-details'),
    eyeWhite.toMesh(makeOrganicMaterial('#FFFDF4'), 'allosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonHindLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.12, 0.09, 6);
  bone.addBetween(limb.knee, limb.ankle, 0.09, 0.06, 6);
  bone.addBetween(limb.ankle, limb.foot, 0.06, 0.045, 6);
  addBoneJoint(bone, limb.hip, 0.17);
  addBoneJoint(bone, limb.knee, 0.125);
  addBoneJoint(bone, limb.ankle, 0.085);

  for (const zOffset of [-0.17, 0, 0.17]) {
    const toeBase = V(limb.foot.x + 0.17, 0.15, limb.foot.z + zOffset * 0.45);
    const toeTip = V(limb.foot.x + 0.76, 0.08, limb.foot.z + zOffset);
    bone.addBetween(limb.foot, toeBase, 0.045, 0.034, 5);
    bone.addBetween(toeBase, toeTip, 0.034, 0.015, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.055, 0.04, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.04, 0.025, 6);
  addBoneJoint(bone, arm.shoulder, 0.08);
  addBoneJoint(bone, arm.elbow, 0.058);
  addBoneJoint(bone, arm.wrist, 0.04);

  const palm = V(arm.wrist.x + 0.09, arm.wrist.y - 0.03, arm.wrist.z);
  bone.addBetween(arm.wrist, palm, 0.025, 0.02, 5);
  for (const zOffset of [-0.085, 0, 0.085]) {
    bone.addBetween(palm, V(palm.x + 0.28, palm.y - 0.11, palm.z + zOffset), 0.019, 0.008, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'allosaurus-skeleton';

  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const fullSpine = [...TORSO_SPINE, ...TAIL_SPINE.slice(1)];
  for (let index = 0; index < fullSpine.length; index += 1) {
    const point = fullSpine[index];
    if (!point) continue;
    const scale = THREE.MathUtils.lerp(0.14, 0.055, index / (fullSpine.length - 1));
    ellipsoid(bone, point, V(scale * 1.2, scale, scale), 7, 5);
    const next = fullSpine[index + 1];
    if (next) bone.addBetween(point, next, scale * 0.48, scale * 0.4, 6);
  }

  const neck = [V(0.9, 3, 0), V(1.13, 3.18, 0), V(1.36, 3.34, 0), V(1.6, 3.45, 0)];
  neck.forEach((point, index) => {
    addBoneJoint(bone, point, 0.105);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.055, 0.045, 6);
  });

  for (const spine of TORSO_SPINE.slice(1)) {
    for (const side of [-1, 1]) {
      const upper = V(spine.x, spine.y - 0.02, side * 0.11);
      const outer = V(spine.x + 0.04, spine.y - 0.52, side * 0.58);
      const lower = V(spine.x + 0.1, spine.y - 0.88, side * 0.45);
      bone.addBetween(upper, outer, 0.04, 0.03, 5);
      bone.addBetween(outer, lower, 0.03, 0.02, 5);
    }
  }

  for (const side of [-1, 1]) {
    const arm = side > 0 ? ARMS[0] : ARMS[1];

    shade.addBetween(V(-1.02, 2.78, side * 0.16), V(0.06, 2.88, side * 0.48), 0.095, 0.055, 6);
    bone.addBetween(V(-0.72, 2.86, side * 0.07), V(-0.42, 2.61, side * 0.57), 0.065, 0.045, 6);
    bone.addBetween(V(-0.42, 2.61, side * 0.57), V(-0.1, 1.96, side * 0.4), 0.055, 0.03, 6);
    bone.addBetween(V(-0.42, 2.61, side * 0.57), V(-1.02, 2.03, side * 0.38), 0.052, 0.028, 6);

    const scapula = V(0.62, 2.96, side * 0.43);
    const chest = V(0.82, 2.5, side * 0.16);
    bone.addBetween(V(0.95, 3.0, side * 0.07), scapula, 0.055, 0.04, 6);
    bone.addBetween(scapula, arm.shoulder, 0.048, 0.038, 6);
    bone.addBetween(arm.shoulder, chest, 0.045, 0.03, 6);
    bone.addBetween(chest, V(0.82, 2.46, 0), 0.03, 0.022, 5);
  }

  HIND_LIMBS.forEach((limb) => addSkeletonHindLeg(bone, limb));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  ellipsoid(bone, V(2.05, 3.58, 0), V(0.58, 0.43, 0.49), 9, 6);
  ellipsoid(bone, V(2.68, 3.56, 0), V(0.68, 0.36, 0.45), 9, 6);
  ellipsoid(bone, V(3.32, 3.5, 0), V(0.62, 0.27, 0.36), 8, 6);
  bone.addBetween(V(1.72, 3.25, 0), V(3.66, 3.18, 0), 0.075, 0.04, 6);

  for (const side of [-1, 1]) {
    coneBetween(bone, V(2.08, 3.88, side * 0.4), V(2.34, 4.02, side * 0.44), 0.07, 6);
    ellipsoid(dark, V(2.16, 3.76, side * 0.43), V(0.23, 0.18, 0.06), 7, 5);
    ellipsoid(dark, V(2.72, 3.61, side * 0.4), V(0.25, 0.15, 0.055), 7, 5);
    ellipsoid(dark, V(3.38, 3.62, side * 0.3), V(0.075, 0.045, 0.018), 6, 4);
    for (let index = 0; index < 6; index += 1) {
      const x = 2.08 + index * 0.26;
      coneBetween(bone, V(x, 3.28, side * 0.37), V(x + 0.02, 3.13, side * 0.37), 0.034, 5);
    }
  }

  group.add(
    bone.toMesh(makeFlatMaterial(ALLOSAURUS_COLORS.bone), 'allosaurus-skeleton-bones'),
    shade.toMesh(makeFlatMaterial(ALLOSAURUS_COLORS.boneShade), 'allosaurus-skeleton-shaded-bones'),
    dark.toMesh(makeFlatMaterial(ALLOSAURUS_COLORS.dark), 'allosaurus-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildAllosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
