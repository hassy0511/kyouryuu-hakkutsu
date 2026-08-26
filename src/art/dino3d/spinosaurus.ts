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

export interface DinoViews {
  skeleton: THREE.Group;
  living: THREE.Group;
}

export const SPINOSAURUS_COLORS = {
  body: '#356F65',
  bodyDark: '#28564F',
  belly: '#C7B48B',
  sail: '#A95F40',
  eyeAmber: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  eye: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const TORSO_SPINE = [
  V(1.25, 3.5, 0),
  V(0.8, 3.52, 0),
  V(0.35, 3.5, 0),
  V(-0.1, 3.43, 0),
  V(-0.55, 3.32, 0),
  V(-1, 3.17, 0),
  V(-1.45, 3, 0),
] as const;

const TAIL_SPINE = [
  V(-1.45, 3, 0),
  V(-1.95, 2.84, 0),
  V(-2.45, 2.64, 0),
  V(-2.95, 2.43, 0),
  V(-3.45, 2.22, 0),
  V(-3.95, 2.03, 0),
  V(-4.45, 1.88, 0),
  V(-4.95, 1.77, 0),
  V(-5.4, 1.69, 0),
] as const;

const SAIL_HEIGHTS = [4.18, 4.72, 5.22, 5.74, 5.9, 5.55, 4.72] as const;

const HIND_LIMBS = [
  { hip: V(-0.68, 2.82, 0.62), knee: V(-1.05, 1.52, 0.74), ankle: V(-0.78, 0.4, 0.78) },
  { hip: V(-0.12, 2.8, -0.48), knee: V(0.38, 1.46, -0.58), ankle: V(0.24, 0.4, -0.62) },
] as const;

const ARMS = [
  { shoulder: V(1.12, 3.42, 0.58), elbow: V(1.32, 2.97, 0.68), wrist: V(1.78, 2.72, 0.71) },
  { shoulder: V(1.2, 3.44, -0.46), elbow: V(1.05, 3, -0.55), wrist: V(1.5, 2.73, -0.59) },
] as const;

function addLivingHindLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.74, 0.55, 10);
  body.addBetween(limb.knee, limb.ankle, 0.55, 0.35, 10);
  ellipsoid(body, limb.hip, V(0.86, 0.74, 0.68), 10, 8);
  ellipsoid(body, limb.knee, V(0.6, 0.54, 0.52), 10, 8);

  const footCenter = V(limb.ankle.x + 0.38, 0.17, limb.ankle.z);
  ellipsoid(body, footCenter, V(0.88, 0.27, 0.46), 10, 7);
  for (const zOffset of [-0.23, 0, 0.23]) {
    const base = V(footCenter.x + 0.72, 0.17, footCenter.z + zOffset);
    coneBetween(claws, base, V(footCenter.x + 1.08, 0.08, base.z), 0.105, 7);
  }
}

function addLivingArm(body: GeometryBatch, claws: GeometryBatch, arm: (typeof ARMS)[number]): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.28, 0.19, 9);
  body.addBetween(arm.elbow, arm.wrist, 0.19, 0.105, 9);
  ellipsoid(body, arm.shoulder, V(0.34, 0.31, 0.31), 10, 7);
  ellipsoid(body, arm.elbow, V(0.21, 0.2, 0.2), 9, 7);

  const palm = V(arm.wrist.x + 0.14, arm.wrist.y - 0.05, arm.wrist.z);
  ellipsoid(body, palm, V(0.25, 0.12, 0.17), 7, 5);
  for (const zOffset of [-0.1, 0, 0.1]) {
    const fingerTip = V(palm.x + 0.3, palm.y - 0.12, palm.z + zOffset);
    body.addBetween(palm, fingerTip, 0.045, 0.025, 5);
    coneBetween(claws, fingerTip, V(fingerTip.x + 0.13, fingerTip.y - 0.09, fingerTip.z), 0.055, 5);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'spinosaurus-living';

  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const sail = new GeometryBatch();
  const eyeAmber = new GeometryBatch();
  const cream = new GeometryBatch();
  const dark = new GeometryBatch();
  const eyeWhite = new GeometryBatch();

  // Continuous anatomical lofts keep the tail muscular at its base and let
  // it taper in both height and width without introducing flat cutout pieces.
  body.add(
    loftGeometry(
      [
        { center: V(-5.78, 1.82, 0), radiusY: 0.08, radiusZ: 0.1 },
        { center: V(-5.28, 1.84, 0), radiusY: 0.13, radiusZ: 0.15 },
        { center: V(-4.76, 1.9, 0), radiusY: 0.21, radiusZ: 0.25 },
        { center: V(-4.22, 2, 0), radiusY: 0.31, radiusZ: 0.35 },
        { center: V(-3.66, 2.14, 0), radiusY: 0.42, radiusZ: 0.45 },
        { center: V(-3.1, 2.31, 0), radiusY: 0.54, radiusZ: 0.54 },
        { center: V(-2.54, 2.49, 0), radiusY: 0.68, radiusZ: 0.65 },
        { center: V(-1.92, 2.68, 0), radiusY: 0.82, radiusZ: 0.76 },
        { center: V(-1.3, 2.86, 0), radiusY: 0.98, radiusZ: 0.88 },
        { center: V(-0.68, 3.04, 0), radiusY: 1.12, radiusZ: 0.98 },
        { center: V(0.2, 3.16, 0), radiusY: 1.08, radiusZ: 0.94 },
        { center: V(0.88, 3.26, 0), radiusY: 0.86, radiusZ: 0.78 },
        { center: V(1.34, 3.36, 0), radiusY: 0.58, radiusZ: 0.56 },
      ],
      12,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.9, 3.16, 0), radiusY: 0.72, radiusZ: 0.68 },
        { center: V(1.18, 3.5, 0), radiusY: 0.68, radiusZ: 0.64 },
        { center: V(1.48, 3.82, 0), radiusY: 0.6, radiusZ: 0.58 },
        { center: V(1.82, 4.06, 0), radiusY: 0.52, radiusZ: 0.52 },
        { center: V(2.16, 4.18, 0), radiusY: 0.46, radiusZ: 0.47 },
      ],
      12,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(1.96, 4.16, 0), radiusY: 0.48, radiusZ: 0.49 },
        { center: V(2.34, 4.24, 0), radiusY: 0.68, radiusZ: 0.6 },
        { center: V(2.8, 4.22, 0), radiusY: 0.55, radiusZ: 0.52 },
        { center: V(3.42, 4.17, 0), radiusY: 0.43, radiusZ: 0.43 },
        { center: V(4.02, 4.13, 0), radiusY: 0.34, radiusZ: 0.35 },
        { center: V(4.42, 4.1, 0), radiusY: 0.13, radiusZ: 0.18 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-5.75, 1.79, 0), radiusY: 0.04, radiusZ: 0.06 },
        { center: V(-5.1, 1.75, 0), radiusY: 0.06, radiusZ: 0.1 },
        { center: V(-4.5, 1.73, 0), radiusY: 0.09, radiusZ: 0.18 },
        { center: V(-3.8, 1.75, 0), radiusY: 0.12, radiusZ: 0.28 },
        { center: V(-3.1, 1.83, 0), radiusY: 0.16, radiusZ: 0.39 },
        { center: V(-2.4, 2, 0), radiusY: 0.22, radiusZ: 0.5 },
        { center: V(-1.75, 2.22, 0), radiusY: 0.32, radiusZ: 0.62 },
      ],
      12,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-1.75, 2.22, 0), radiusY: 0.32, radiusZ: 0.62 },
        { center: V(-1.05, 2.12, 0), radiusY: 0.3, radiusZ: 0.72 },
        { center: V(-0.2, 2.16, 0), radiusY: 0.31, radiusZ: 0.78 },
        { center: V(0.55, 2.4, 0), radiusY: 0.27, radiusZ: 0.68 },
        { center: V(1.02, 2.72, 0), radiusY: 0.24, radiusZ: 0.54 },
        { center: V(1.28, 3.08, 0), radiusY: 0.22, radiusZ: 0.46 },
        { center: V(1.58, 3.48, 0), radiusY: 0.19, radiusZ: 0.39 },
        { center: V(1.95, 3.78, 0), radiusY: 0.16, radiusZ: 0.34 },
        { center: V(2.48, 3.88, 0), radiusY: 0.14, radiusZ: 0.31 },
        { center: V(3.22, 3.88, 0), radiusY: 0.12, radiusZ: 0.28 },
        { center: V(3.88, 3.9, 0), radiusY: 0.09, radiusZ: 0.23 },
        { center: V(4.3, 3.98, 0), radiusY: 0.04, radiusZ: 0.14 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  const sailPanel = silhouetteGeometry(
    [
      new THREE.Vector2(-2.35, 3.2),
      new THREE.Vector2(-2.2, 4.18),
      new THREE.Vector2(-1.78, 5.42),
      new THREE.Vector2(-1.28, 6.2),
      new THREE.Vector2(-0.82, 6.04),
      new THREE.Vector2(-0.34, 6.14),
      new THREE.Vector2(0.12, 5.68),
      new THREE.Vector2(0.52, 5.02),
      new THREE.Vector2(0.88, 4.26),
      new THREE.Vector2(1.12, 3.54),
    ],
    0.16,
  );
  sail.add(sailPanel, V(0, 0, 0));

  HIND_LIMBS.forEach((limb, index) => addLivingHindLeg(index === 0 ? body : farBody, cream, limb));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, cream, arm));

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(2.38, 4.47, side * 0.47), V(0.25, 0.24, 0.085), 8, 6);
    ellipsoid(eyeAmber, V(2.4, 4.47, side * 0.53), V(0.16, 0.17, 0.04), 10, 7);
    ellipsoid(dark, V(2.43, 4.47, side * 0.56), V(0.075, 0.1, 0.025), 7, 5);
    ellipsoid(eyeWhite, V(2.38, 4.53, side * 0.585), V(0.035, 0.04, 0.012), 6, 4);
    ellipsoid(dark, V(3.74, 4.27, side * 0.29), V(0.075, 0.05, 0.03), 7, 5);
    dark.add(
      new THREE.BoxGeometry(1.72, 0.055, 0.035),
      V(3.18, 3.98, side * 0.38),
      V(1, 1, 1),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.015)),
    );

    for (let index = 0; index < 5; index += 1) {
      const x = 2.68 + index * 0.25;
      coneBetween(cream, V(x, 4.01, side * 0.35), V(x + 0.02, 3.87, side * 0.35), 0.04, 5);
    }
  }

  group.add(
    body.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.body), 'living-body'),
    farBody.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.bodyDark), 'living-far-limbs'),
    belly.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.belly), 'living-belly'),
    sail.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.sail), 'living-sail'),
    eyeAmber.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.eyeAmber), 'living-eye-irises'),
    cream.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.belly), 'living-claws-and-teeth'),
    dark.toMesh(makeOrganicMaterial(SPINOSAURUS_COLORS.eye), 'living-face-details'),
    eyeWhite.toMesh(makeOrganicMaterial('#FFFDF4'), 'living-eyes'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.86, radius), 7, 5);
}

function addSkeletonHindLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.13, 0.105, 6);
  bone.addBetween(limb.knee, limb.ankle, 0.105, 0.07, 6);
  addBoneJoint(bone, limb.hip, 0.18);
  addBoneJoint(bone, limb.knee, 0.14);
  addBoneJoint(bone, limb.ankle, 0.09);

  const palm = V(limb.ankle.x + 0.18, 0.15, limb.ankle.z);
  bone.addBetween(limb.ankle, palm, 0.065, 0.055, 6);
  for (const zOffset of [-0.14, 0, 0.14]) {
    bone.addBetween(palm, V(palm.x + 0.5, 0.08, palm.z + zOffset), 0.035, 0.018, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.075, 0.06, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.06, 0.04, 6);
  addBoneJoint(bone, arm.shoulder, 0.105);
  addBoneJoint(bone, arm.elbow, 0.08);
  addBoneJoint(bone, arm.wrist, 0.06);

  const palm = V(arm.wrist.x + 0.12, arm.wrist.y - 0.05, arm.wrist.z);
  bone.addBetween(arm.wrist, palm, 0.04, 0.035, 5);
  for (const zOffset of [-0.09, 0, 0.09]) {
    bone.addBetween(palm, V(palm.x + 0.38, palm.y - 0.16, palm.z + zOffset), 0.025, 0.012, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'spinosaurus-skeleton';

  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const fullSpine = [...TORSO_SPINE, ...TAIL_SPINE.slice(1)];
  for (let index = 0; index < fullSpine.length; index += 1) {
    const point = fullSpine[index];
    if (!point) continue;
    const scale = THREE.MathUtils.lerp(0.16, 0.07, index / (fullSpine.length - 1));
    ellipsoid(bone, point, V(scale * 1.15, scale, scale), 7, 5);
    const next = fullSpine[index + 1];
    if (next) bone.addBetween(point, next, scale * 0.5, scale * 0.42, 6);
  }

  const neck = [
    V(1.25, 3.5, 0),
    V(1.48, 3.75, 0),
    V(1.72, 4.02, 0),
    V(1.98, 4.2, 0),
    V(2.24, 4.3, 0),
  ];
  neck.forEach((point, index) => {
    addBoneJoint(bone, point, 0.12);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.065, 0.06, 6);
  });

  for (let index = 0; index < TORSO_SPINE.length; index += 1) {
    const spine = TORSO_SPINE[index];
    const height = SAIL_HEIGHTS[index];
    if (!spine || height === undefined) continue;
    bone.addBetween(spine, V(spine.x, height, 0), 0.065, 0.035, 6);
    addBoneJoint(bone, V(spine.x, height, 0), 0.055);
  }

  for (let index = 1; index < TAIL_SPINE.length - 1; index += 1) {
    const point = TAIL_SPINE[index];
    if (!point) continue;
    const taper = 1 - index / TAIL_SPINE.length;
    const halfHeight = 0.24 + taper * 0.46;
    bone.addBetween(
      V(point.x, point.y - 0.03, 0),
      V(point.x - 0.04, point.y + halfHeight, 0),
      0.035,
      0.018,
      5,
    );
    bone.addBetween(
      V(point.x, point.y - 0.03, 0),
      V(point.x + 0.07, point.y - halfHeight, 0),
      0.032,
      0.016,
      5,
    );
  }

  for (const spine of TORSO_SPINE.slice(2, 8)) {
    for (const side of [-1, 1]) {
      const upper = V(spine.x, spine.y - 0.05, side * 0.12);
      const outer = V(spine.x + 0.08, spine.y - 0.62, side * 0.64);
      const lower = V(spine.x + 0.16, spine.y - 1.04, side * 0.5);
      bone.addBetween(upper, outer, 0.045, 0.035, 5);
      bone.addBetween(outer, lower, 0.035, 0.022, 5);
    }
  }

  for (const side of [-1, 1]) {
    const arm = side > 0 ? ARMS[0] : ARMS[1];

    // A narrow paired ilium replaces the old single pelvic block. The sacral,
    // pubic and ischial struts make the connection to the hind limb explicit.
    shade.addBetween(V(-1.18, 3.13, side * 0.18), V(-0.12, 3.27, side * 0.52), 0.11, 0.065, 6);
    bone.addBetween(V(-0.88, 3.18, side * 0.07), V(-0.58, 2.78, side * 0.6), 0.075, 0.055, 6);
    bone.addBetween(V(-0.58, 2.78, side * 0.6), V(-0.2, 2.08, side * 0.43), 0.065, 0.035, 6);
    bone.addBetween(V(-0.58, 2.78, side * 0.6), V(-1.28, 2.2, side * 0.42), 0.06, 0.03, 6);

    // Rib-like shoulder girdle: spine -> scapula -> arm, with a coracoid brace
    // down toward the chest instead of a floating plate.
    const scapula = V(0.72, 3.18, side * 0.48);
    const chest = V(0.9, 2.86, side * 0.18);
    bone.addBetween(V(1.08, 3.48, side * 0.08), scapula, 0.065, 0.045, 6);
    bone.addBetween(scapula, arm.shoulder, 0.055, 0.045, 6);
    bone.addBetween(arm.shoulder, chest, 0.05, 0.035, 6);
    bone.addBetween(chest, V(0.9, 2.82, 0), 0.035, 0.025, 5);
  }

  HIND_LIMBS.forEach((limb) => addSkeletonHindLeg(bone, limb));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  ellipsoid(bone, V(2.3, 4.3, 0), V(0.58, 0.46, 0.46), 9, 6);
  ellipsoid(bone, V(3.02, 4.21, 0), V(0.95, 0.25, 0.33), 9, 5);
  ellipsoid(bone, V(3.78, 4.17, 0), V(0.48, 0.21, 0.28), 8, 5);
  bone.addBetween(V(2.4, 4.05, 0), V(4.06, 3.98, 0), 0.07, 0.04, 6);

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(2.3, 4.4, side * 0.41), V(0.22, 0.18, 0.07), 8, 6);
    ellipsoid(dark, V(3.7, 4.25, side * 0.24), V(0.07, 0.05, 0.03), 7, 5);
    for (let index = 0; index < 6; index += 1) {
      const x = 2.58 + index * 0.25;
      coneBetween(shade, V(x, 4.03, side * 0.29), V(x + 0.02, 3.88, side * 0.29), 0.04, 5);
    }
  }

  group.add(
    bone.toMesh(makeFlatMaterial(SPINOSAURUS_COLORS.bone), 'skeleton-bones'),
    shade.toMesh(makeFlatMaterial(SPINOSAURUS_COLORS.boneShade), 'skeleton-shaded-bones'),
    dark.toMesh(makeFlatMaterial(SPINOSAURUS_COLORS.eye), 'skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

/** Builds matching skeleton and living reconstructions without external resources. */
export function buildSpinosaurus(): DinoViews {
  const skeleton = buildSkeleton();
  const living = buildLiving();
  skeleton.scale.setScalar(1);
  living.scale.setScalar(1);
  return { skeleton, living };
}
