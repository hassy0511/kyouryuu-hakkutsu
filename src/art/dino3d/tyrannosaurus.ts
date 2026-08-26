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

export const TYRANNOSAURUS_COLORS = {
  body: '#9C6B43',
  belly: '#E8D9B0',
  stripe: '#6E4A2E',
  eyeAmber: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const TORSO_SPINE = [
  V(1.45, 3.42, 0),
  V(0.85, 3.48, 0),
  V(0.2, 3.48, 0),
  V(-0.45, 3.42, 0),
  V(-1.1, 3.3, 0),
  V(-1.7, 3.14, 0),
] as const;

const TAIL_SPINE = [
  V(-1.7, 3.14, 0),
  V(-2.25, 3.05, 0),
  V(-2.85, 2.98, 0),
  V(-3.5, 2.92, 0),
  V(-4.15, 2.87, 0),
  V(-4.8, 2.82, 0),
  V(-5.4, 2.77, 0),
  V(-5.95, 2.72, 0),
  V(-6.5, 2.68, 0),
] as const;

const HIND_LIMBS = [
  {
    hip: V(-0.62, 2.9, 0.64),
    knee: V(0.14, 1.72, 0.74),
    ankle: V(-0.18, 0.43, 0.78),
    foot: V(0.5, 0.18, 0.8),
  },
  {
    hip: V(-0.92, 2.86, -0.54),
    knee: V(-1.42, 1.66, -0.63),
    ankle: V(-0.98, 0.42, -0.68),
    foot: V(-0.34, 0.17, -0.7),
  },
] as const;

const ARMS = [
  {
    shoulder: V(1.4, 3.55, 0.64),
    elbow: V(1.56, 3.18, 0.72),
    wrist: V(1.9, 3.02, 0.74),
  },
  {
    shoulder: V(1.48, 3.52, -0.54),
    elbow: V(1.35, 3.18, -0.62),
    wrist: V(1.68, 3.01, -0.65),
  },
] as const;

const SKELETON_ARMS = [
  {
    shoulder: V(1.28, 3.18, 0.46),
    elbow: V(1.48, 2.9, 0.56),
    wrist: V(1.82, 2.8, 0.59),
  },
  {
    shoulder: V(1.25, 3.16, -0.42),
    elbow: V(1.16, 2.88, -0.5),
    wrist: V(1.5, 2.76, -0.54),
  },
] as const;

function addLivingHindLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.76, 0.55, 11);
  body.addBetween(limb.knee, limb.ankle, 0.52, 0.3, 10);
  ellipsoid(body, limb.hip, V(0.92, 0.82, 0.72), 12, 8);
  ellipsoid(body, limb.knee, V(0.58, 0.52, 0.5), 10, 7);
  body.addBetween(limb.ankle, limb.foot, 0.28, 0.2, 9);
  ellipsoid(body, limb.foot, V(0.78, 0.23, 0.43), 10, 7);

  for (const zOffset of [-0.25, 0, 0.25]) {
    const toeBase = V(limb.foot.x + 0.45, 0.16, limb.foot.z + zOffset * 0.55);
    const toeTip = V(limb.foot.x + 1.08, 0.1, limb.foot.z + zOffset);
    body.addBetween(toeBase, toeTip, 0.12, 0.055, 7);
    coneBetween(claws, toeTip, V(toeTip.x + 0.23, 0.075, toeTip.z + zOffset * 0.08), 0.065, 7);
  }

  const rearToeBase = V(limb.ankle.x - 0.02, 0.36, limb.ankle.z);
  const rearToeTip = V(limb.ankle.x - 0.34, 0.22, limb.ankle.z);
  body.addBetween(rearToeBase, rearToeTip, 0.08, 0.035, 6);
  coneBetween(claws, rearToeTip, V(rearToeTip.x - 0.13, 0.18, rearToeTip.z), 0.045, 6);
}

function addLivingArm(body: GeometryBatch, claws: GeometryBatch, arm: (typeof ARMS)[number]): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.2, 0.13, 8);
  body.addBetween(arm.elbow, arm.wrist, 0.13, 0.075, 8);
  ellipsoid(body, arm.shoulder, V(0.25, 0.23, 0.22), 9, 6);
  ellipsoid(body, arm.elbow, V(0.15, 0.14, 0.14), 8, 5);

  const palm = V(arm.wrist.x + 0.1, arm.wrist.y - 0.03, arm.wrist.z);
  ellipsoid(body, palm, V(0.18, 0.09, 0.13), 7, 5);
  for (const zOffset of [-0.07, 0.07]) {
    const fingerTip = V(palm.x + 0.26, palm.y - 0.1, palm.z + zOffset);
    body.addBetween(palm, fingerTip, 0.043, 0.022, 6);
    coneBetween(claws, fingerTip, V(fingerTip.x + 0.12, fingerTip.y - 0.07, fingerTip.z), 0.04, 6);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tyrannosaurus-living';

  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const cream = new GeometryBatch();
  const eyeAmber = new GeometryBatch();
  const dark = new GeometryBatch();
  const eyeWhite = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-6.5, 2.68, 0), radiusY: 0.06, radiusZ: 0.07 },
        { center: V(-5.95, 2.72, 0), radiusY: 0.12, radiusZ: 0.14 },
        { center: V(-5.4, 2.77, 0), radiusY: 0.2, radiusZ: 0.23 },
        { center: V(-4.8, 2.82, 0), radiusY: 0.3, radiusZ: 0.34 },
        { center: V(-4.15, 2.87, 0), radiusY: 0.42, radiusZ: 0.46 },
        { center: V(-3.5, 2.92, 0), radiusY: 0.56, radiusZ: 0.58 },
        { center: V(-2.85, 2.98, 0), radiusY: 0.72, radiusZ: 0.72 },
        { center: V(-2.25, 3.05, 0), radiusY: 0.88, radiusZ: 0.84 },
        { center: V(-1.7, 3.14, 0), radiusY: 1.02, radiusZ: 0.96 },
        { center: V(-1.05, 3.28, 0), radiusY: 1.14, radiusZ: 1.03 },
        { center: V(-0.3, 3.4, 0), radiusY: 1.2, radiusZ: 1.06 },
        { center: V(0.45, 3.44, 0), radiusY: 1.1, radiusZ: 0.98 },
        { center: V(1.1, 3.43, 0), radiusY: 0.88, radiusZ: 0.82 },
        { center: V(1.55, 3.54, 0), radiusY: 0.66, radiusZ: 0.68 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(1.05, 3.42, 0), radiusY: 0.82, radiusZ: 0.77 },
        { center: V(1.42, 3.7, 0), radiusY: 0.78, radiusZ: 0.73 },
        { center: V(1.78, 3.92, 0), radiusY: 0.72, radiusZ: 0.7 },
        { center: V(2.12, 4.02, 0), radiusY: 0.66, radiusZ: 0.67 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(1.92, 4.05, 0), radiusY: 0.58, radiusZ: 0.61 },
        { center: V(2.35, 4.17, 0), radiusY: 0.72, radiusZ: 0.73 },
        { center: V(2.9, 4.2, 0), radiusY: 0.82, radiusZ: 0.8 },
        { center: V(3.55, 4.18, 0), radiusY: 0.78, radiusZ: 0.78 },
        { center: V(4.2, 4.12, 0), radiusY: 0.66, radiusZ: 0.69 },
        { center: V(4.8, 4.05, 0), radiusY: 0.52, radiusZ: 0.56 },
        { center: V(5.25, 4, 0), radiusY: 0.36, radiusZ: 0.41 },
        { center: V(5.48, 3.98, 0), radiusY: 0.17, radiusZ: 0.2 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-3.4, 2.58, 0), radiusY: 0.1, radiusZ: 0.38 },
        { center: V(-2.5, 2.4, 0), radiusY: 0.17, radiusZ: 0.56 },
        { center: V(-1.55, 2.3, 0), radiusY: 0.26, radiusZ: 0.72 },
        { center: V(-0.55, 2.28, 0), radiusY: 0.31, radiusZ: 0.8 },
        { center: V(0.38, 2.5, 0), radiusY: 0.27, radiusZ: 0.72 },
        { center: V(1.05, 2.84, 0), radiusY: 0.22, radiusZ: 0.58 },
        { center: V(1.65, 3.35, 0), radiusY: 0.18, radiusZ: 0.48 },
        { center: V(2.25, 3.65, 0), radiusY: 0.16, radiusZ: 0.45 },
        { center: V(3.2, 3.52, 0), radiusY: 0.17, radiusZ: 0.5 },
        { center: V(4.25, 3.55, 0), radiusY: 0.14, radiusZ: 0.45 },
        { center: V(5.12, 3.68, 0), radiusY: 0.08, radiusZ: 0.3 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  HIND_LIMBS.forEach((limb, index) => addLivingHindLeg(index === 0 ? body : farBody, cream, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, cream, arm));

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(3.1, 4.55, side * 0.72), V(0.27, 0.24, 0.075), 9, 6);
    ellipsoid(eyeAmber, V(3.12, 4.56, side * 0.775), V(0.16, 0.16, 0.035), 10, 7);
    ellipsoid(dark, V(3.15, 4.56, side * 0.8), V(0.065, 0.095, 0.02), 7, 5);
    ellipsoid(eyeWhite, V(3.09, 4.62, side * 0.825), V(0.034, 0.038, 0.01), 6, 4);
    ellipsoid(dark, V(4.85, 4.23, side * 0.48), V(0.09, 0.055, 0.025), 7, 5);
    dark.add(new THREE.BoxGeometry(2.45, 0.055, 0.035), V(4.05, 3.67, side * 0.53));

    for (let index = 0; index < 7; index += 1) {
      const x = 3.25 + index * 0.29;
      coneBetween(cream, V(x, 3.74, side * 0.51), V(x + 0.025, 3.56, side * 0.51), 0.05, 6);
    }
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(TYRANNOSAURUS_COLORS.stripe), 'tyrannosaurus-far-limbs'),
    body.toMesh(makeOrganicMaterial(TYRANNOSAURUS_COLORS.body), 'tyrannosaurus-body'),
    belly.toMesh(makeOrganicMaterial(TYRANNOSAURUS_COLORS.belly), 'tyrannosaurus-belly'),
    eyeAmber.toMesh(makeOrganicMaterial(TYRANNOSAURUS_COLORS.eyeAmber), 'tyrannosaurus-irises'),
    cream.toMesh(makeOrganicMaterial(TYRANNOSAURUS_COLORS.belly), 'tyrannosaurus-claws-teeth'),
    dark.toMesh(makeOrganicMaterial(TYRANNOSAURUS_COLORS.dark), 'tyrannosaurus-face-details'),
    eyeWhite.toMesh(makeOrganicMaterial('#FFFDF4'), 'tyrannosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonHindLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.14, 0.11, 7);
  bone.addBetween(limb.knee, limb.ankle, 0.11, 0.075, 7);
  bone.addBetween(limb.ankle, limb.foot, 0.07, 0.055, 6);
  addBoneJoint(bone, limb.hip, 0.2);
  addBoneJoint(bone, limb.knee, 0.15);
  addBoneJoint(bone, limb.ankle, 0.1);

  for (const zOffset of [-0.2, 0, 0.2]) {
    const toeBase = V(limb.foot.x + 0.2, 0.16, limb.foot.z + zOffset * 0.45);
    const toeTip = V(limb.foot.x + 0.95, 0.08, limb.foot.z + zOffset);
    bone.addBetween(limb.foot, toeBase, 0.055, 0.04, 6);
    bone.addBetween(toeBase, toeTip, 0.04, 0.018, 6);
  }
  bone.addBetween(limb.ankle, V(limb.ankle.x - 0.3, 0.22, limb.ankle.z), 0.045, 0.018, 6);
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof SKELETON_ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.065, 0.05, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.05, 0.03, 6);
  addBoneJoint(bone, arm.shoulder, 0.09);
  addBoneJoint(bone, arm.elbow, 0.065);
  addBoneJoint(bone, arm.wrist, 0.045);

  const palm = V(arm.wrist.x + 0.09, arm.wrist.y - 0.03, arm.wrist.z);
  bone.addBetween(arm.wrist, palm, 0.03, 0.025, 5);
  for (const zOffset of [-0.065, 0.065]) {
    bone.addBetween(palm, V(palm.x + 0.25, palm.y - 0.1, palm.z + zOffset), 0.023, 0.01, 5);
  }
}

function addSkeletonPelvis(bone: GeometryBatch, shade: GeometryBatch, dark: GeometryBatch): void {
  const ilium = silhouetteGeometry(
    [
      new THREE.Vector2(-0.72, -0.03),
      new THREE.Vector2(-0.58, 0.2),
      new THREE.Vector2(-0.25, 0.3),
      new THREE.Vector2(0.22, 0.27),
      new THREE.Vector2(0.62, 0.12),
      new THREE.Vector2(0.58, 0.02),
      new THREE.Vector2(0.25, -0.02),
      new THREE.Vector2(0.08, -0.16),
      new THREE.Vector2(-0.08, -0.08),
      new THREE.Vector2(-0.38, -0.11),
    ],
    0.045,
  );

  for (const side of [-1, 1]) {
    const z = side * 0.47;
    shade.add(ilium.clone(), V(-0.75, 3.18, z));

    const socket = V(-0.7, 2.98, side * 0.53);
    const pubisKnee = V(-0.34, 2.34, side * 0.46);
    const pubisTip = V(0, 1.72, side * 0.38);
    const ischiumTip = V(-1.5, 2.04, side * 0.4);
    bone.addBetween(V(-0.7, 3.08, z), socket, 0.065, 0.055, 7);
    bone.addBetween(socket, pubisKnee, 0.07, 0.055, 7);
    bone.addBetween(pubisKnee, pubisTip, 0.055, 0.03, 7);
    bone.addBetween(socket, ischiumTip, 0.065, 0.03, 7);
    bone.addBetween(V(-1.1, 3.3, 0), V(-1.1, 3.3, z), 0.055, 0.045, 6);
    bone.addBetween(V(-0.45, 3.42, 0), V(-0.45, 3.3, z), 0.055, 0.045, 6);
    ellipsoid(dark, socket, V(0.17, 0.14, 0.025), 9, 6);
  }

  bone.addBetween(V(0, 1.72, -0.38), V(0, 1.72, 0.38), 0.03, 0.03, 6);
}

function addSkeletonShoulderGirdle(bone: GeometryBatch, shade: GeometryBatch): void {
  const scapula = silhouetteGeometry(
    [
      new THREE.Vector2(-0.72, 0.18),
      new THREE.Vector2(-0.55, 0.24),
      new THREE.Vector2(0.67, -0.12),
      new THREE.Vector2(0.78, -0.22),
      new THREE.Vector2(0.62, -0.28),
      new THREE.Vector2(0.45, -0.23),
      new THREE.Vector2(-0.65, 0.1),
    ],
    0.035,
  );
  const coracoid = silhouetteGeometry(
    [
      new THREE.Vector2(-0.18, 0.08),
      new THREE.Vector2(-0.04, 0.14),
      new THREE.Vector2(0.17, 0.08),
      new THREE.Vector2(0.19, -0.09),
      new THREE.Vector2(0, -0.16),
      new THREE.Vector2(-0.16, -0.08),
    ],
    0.04,
  );

  for (const side of [-1, 1]) {
    const z = side * 0.42;
    const shoulder = SKELETON_ARMS[side === 1 ? 0 : 1].shoulder;
    shade.add(scapula.clone(), V(0.7, 3.43, z));
    bone.add(coracoid.clone(), V(1.2, 3.14, side * 0.45));
    bone.addBetween(V(0.18, 3.5, 0), V(0.08, 3.57, z), 0.05, 0.04, 6);
    bone.addBetween(V(1.18, 3.18, side * 0.44), shoulder, 0.055, 0.045, 6);
    bone.addBetween(shoulder, V(1.43, 3.2, 0), 0.035, 0.025, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'tyrannosaurus-skeleton';

  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const fullSpine = [...TORSO_SPINE, ...TAIL_SPINE.slice(1)];
  for (let index = 0; index < fullSpine.length; index += 1) {
    const point = fullSpine[index];
    if (!point) continue;
    const scale = THREE.MathUtils.lerp(0.17, 0.07, index / (fullSpine.length - 1));
    ellipsoid(bone, point, V(scale * 1.2, scale, scale), 7, 5);
    const next = fullSpine[index + 1];
    if (next) bone.addBetween(point, next, scale * 0.5, scale * 0.42, 6);
  }

  const neck = [
    V(1.25, 3.48, 0),
    V(1.55, 3.72, 0),
    V(1.82, 3.93, 0),
    V(2.08, 4.06, 0),
    V(2.35, 4.13, 0),
  ];
  neck.forEach((point, index) => {
    addBoneJoint(bone, point, 0.13);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.07, 0.06, 6);
  });

  for (const spine of TORSO_SPINE.slice(1, 6)) {
    for (const side of [-1, 1]) {
      const upper = V(spine.x, spine.y - 0.03, side * 0.13);
      const outer = V(spine.x + 0.05, spine.y - 0.65, side * 0.72);
      const lower = V(spine.x + 0.12, spine.y - 1.1, side * 0.55);
      bone.addBetween(upper, outer, 0.048, 0.038, 6);
      bone.addBetween(outer, lower, 0.038, 0.025, 6);
    }
  }

  addSkeletonPelvis(bone, shade, dark);
  addSkeletonShoulderGirdle(bone, shade);

  HIND_LIMBS.forEach((limb) => addSkeletonHindLeg(bone, limb));
  SKELETON_ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  ellipsoid(bone, V(2.78, 4.2, 0), V(0.92, 0.68, 0.73), 10, 7);
  ellipsoid(bone, V(3.75, 4.14, 0), V(1.05, 0.58, 0.68), 10, 6);
  ellipsoid(bone, V(4.72, 4.02, 0), V(0.9, 0.42, 0.57), 9, 6);
  bone.addBetween(V(2.45, 3.73, 0), V(5.18, 3.61, 0), 0.1, 0.055, 7);

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(3.05, 4.42, side * 0.65), V(0.32, 0.27, 0.08), 8, 6);
    ellipsoid(dark, V(3.72, 4.22, side * 0.64), V(0.34, 0.23, 0.075), 8, 6);
    ellipsoid(dark, V(4.78, 4.2, side * 0.48), V(0.1, 0.065, 0.03), 7, 5);
    for (let index = 0; index < 7; index += 1) {
      const x = 3.15 + index * 0.3;
      coneBetween(bone, V(x, 3.76, side * 0.49), V(x + 0.02, 3.55, side * 0.49), 0.045, 5);
    }
  }

  group.add(
    bone.toMesh(makeFlatMaterial(TYRANNOSAURUS_COLORS.bone), 'tyrannosaurus-skeleton-bones'),
    shade.toMesh(
      makeFlatMaterial(TYRANNOSAURUS_COLORS.boneShade),
      'tyrannosaurus-skeleton-shaded-bones',
    ),
    dark.toMesh(makeFlatMaterial(TYRANNOSAURUS_COLORS.dark), 'tyrannosaurus-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildTyrannosaurus(): DinoViews {
  const skeleton = buildSkeleton();
  const living = buildLiving();
  skeleton.scale.setScalar(1);
  living.scale.setScalar(1);
  return { skeleton, living };
}
