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

export const IGUANODON_COLORS = {
  body: '#8FA764',
  stripe: '#6C8248',
  belly: '#EFE6C0',
  spike: '#F2EAD8',
  iris: '#A67832',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const HIND_LIMBS = [
  {
    near: true,
    hip: V(-0.52, 2.35, 0.62),
    knee: V(0.15, 1.28, 0.7),
    ankle: V(-0.16, 0.36, 0.73),
    foot: V(0.36, 0.15, 0.74),
  },
  {
    near: false,
    hip: V(-0.86, 2.31, -0.55),
    knee: V(-1.28, 1.25, -0.62),
    ankle: V(-0.93, 0.34, -0.65),
    foot: V(-0.42, 0.14, -0.66),
  },
] as const;

const ARMS = [
  {
    near: true,
    shoulder: V(1.18, 2.82, 0.54),
    elbow: V(1.55, 2.3, 0.66),
    wrist: V(2.02, 2.08, 0.69),
  },
  {
    near: false,
    shoulder: V(1.12, 2.8, -0.49),
    elbow: V(1.28, 2.26, -0.58),
    wrist: V(1.72, 2.02, -0.61),
  },
] as const;

function addLivingHindLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HIND_LIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.6, 0.43, 10);
  body.addBetween(limb.knee, limb.ankle, 0.41, 0.25, 9);
  ellipsoid(body, limb.hip, V(0.72, 0.66, 0.62), 11, 7);
  ellipsoid(body, limb.knee, V(0.44, 0.39, 0.4), 9, 6);
  body.addBetween(limb.ankle, limb.foot, 0.24, 0.17, 8);
  ellipsoid(body, limb.foot, V(0.62, 0.2, 0.37), 9, 6);

  for (const zOffset of [-0.2, 0, 0.2]) {
    const toeBase = V(limb.foot.x + 0.3, 0.15, limb.foot.z + zOffset * 0.45);
    const toeTip = V(limb.foot.x + 0.78, 0.09, limb.foot.z + zOffset);
    body.addBetween(toeBase, toeTip, 0.085, 0.04, 6);
    coneBetween(claws, toeTip, V(toeTip.x + 0.14, 0.075, toeTip.z), 0.045, 6);
  }
}

function addLivingHand(
  body: GeometryBatch,
  spikes: GeometryBatch,
  arm: (typeof ARMS)[number],
): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.27, 0.18, 8);
  body.addBetween(arm.elbow, arm.wrist, 0.19, 0.12, 8);
  ellipsoid(body, arm.shoulder, V(0.34, 0.31, 0.3), 9, 6);
  ellipsoid(body, arm.elbow, V(0.22, 0.2, 0.2), 8, 5);
  const palm = V(arm.wrist.x + 0.1, arm.wrist.y - 0.02, arm.wrist.z);
  ellipsoid(body, palm, V(0.24, 0.13, 0.22), 8, 5);

  for (const zOffset of [-0.16, -0.055, 0.055, 0.16]) {
    const fingerTip = V(palm.x + 0.36, palm.y - 0.11, palm.z + zOffset);
    body.addBetween(palm, fingerTip, 0.052, 0.026, 6);
  }
  coneBetween(
    spikes,
    V(palm.x - 0.03, palm.y + 0.02, palm.z),
    V(palm.x + 0.05, palm.y + 0.55, palm.z),
    0.1,
    7,
  );
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'iguanodon-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const cream = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-5.2, 2.42, 0), radiusY: 0.06, radiusZ: 0.07 },
        { center: V(-4.65, 2.44, 0), radiusY: 0.13, radiusZ: 0.15 },
        { center: V(-4.05, 2.46, 0), radiusY: 0.23, radiusZ: 0.25 },
        { center: V(-3.4, 2.49, 0), radiusY: 0.36, radiusZ: 0.4 },
        { center: V(-2.72, 2.53, 0), radiusY: 0.54, radiusZ: 0.58 },
        { center: V(-2.0, 2.58, 0), radiusY: 0.76, radiusZ: 0.78 },
        { center: V(-1.25, 2.62, 0), radiusY: 0.95, radiusZ: 0.92 },
        { center: V(-0.45, 2.67, 0), radiusY: 1.05, radiusZ: 0.98 },
        { center: V(0.35, 2.7, 0), radiusY: 0.96, radiusZ: 0.9 },
        { center: V(1.02, 2.74, 0), radiusY: 0.75, radiusZ: 0.75 },
        { center: V(1.48, 2.86, 0), radiusY: 0.58, radiusZ: 0.6 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(1.2, 2.78, 0), radiusY: 0.67, radiusZ: 0.65 },
        { center: V(1.62, 3.02, 0), radiusY: 0.58, radiusZ: 0.58 },
        { center: V(2.02, 3.2, 0), radiusY: 0.49, radiusZ: 0.5 },
        { center: V(2.35, 3.28, 0), radiusY: 0.42, radiusZ: 0.45 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(2.2, 3.3, 0), radiusY: 0.42, radiusZ: 0.45 },
        { center: V(2.72, 3.38, 0), radiusY: 0.48, radiusZ: 0.48 },
        { center: V(3.3, 3.37, 0), radiusY: 0.44, radiusZ: 0.43 },
        { center: V(3.88, 3.3, 0), radiusY: 0.34, radiusZ: 0.35 },
        { center: V(4.34, 3.22, 0), radiusY: 0.25, radiusZ: 0.28 },
        { center: V(4.56, 3.18, 0), radiusY: 0.12, radiusZ: 0.14 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-2.3, 2.05, 0), radiusY: 0.08, radiusZ: 0.5 },
        { center: V(-1.5, 1.88, 0), radiusY: 0.14, radiusZ: 0.68 },
        { center: V(-0.55, 1.74, 0), radiusY: 0.18, radiusZ: 0.76 },
        { center: V(0.35, 1.84, 0), radiusY: 0.17, radiusZ: 0.7 },
        { center: V(1.05, 2.16, 0), radiusY: 0.13, radiusZ: 0.56 },
        { center: V(1.65, 2.65, 0), radiusY: 0.1, radiusZ: 0.42 },
        { center: V(2.35, 2.96, 0), radiusY: 0.09, radiusZ: 0.34 },
        { center: V(3.35, 2.98, 0), radiusY: 0.08, radiusZ: 0.31 },
        { center: V(4.35, 3.01, 0), radiusY: 0.05, radiusZ: 0.2 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  HIND_LIMBS.forEach((limb) => addLivingHindLeg(limb.near ? body : farBody, cream, limb));
  ARMS.forEach((arm) => addLivingHand(arm.near ? body : farBody, cream, arm));
  ellipsoid(cream, V(4.54, 3.18, 0), V(0.22, 0.18, 0.24), 8, 5);

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(3.05, 3.66, side * 0.39), V(0.18, 0.16, 0.045), 8, 5);
    ellipsoid(iris, V(3.07, 3.66, side * 0.43), V(0.105, 0.105, 0.022), 8, 5);
    ellipsoid(dark, V(3.09, 3.66, side * 0.448), V(0.04, 0.064, 0.01), 6, 4);
    ellipsoid(glint, V(3.05, 3.71, side * 0.46), V(0.025, 0.028, 0.006), 5, 4);
    dark.add(new THREE.BoxGeometry(0.7, 0.035, 0.025), V(4.2, 3.12, side * 0.24));
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(IGUANODON_COLORS.stripe), 'iguanodon-far-limbs'),
    body.toMesh(makeOrganicMaterial(IGUANODON_COLORS.body), 'iguanodon-body'),
    belly.toMesh(makeOrganicMaterial(IGUANODON_COLORS.belly), 'iguanodon-belly'),
    cream.toMesh(makeOrganicMaterial(IGUANODON_COLORS.spike), 'iguanodon-beak-spikes-claws'),
    iris.toMesh(makeOrganicMaterial(IGUANODON_COLORS.iris), 'iguanodon-irises'),
    dark.toMesh(makeOrganicMaterial(IGUANODON_COLORS.dark), 'iguanodon-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'iguanodon-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addBoneHindLeg(bone: GeometryBatch, limb: (typeof HIND_LIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.12, 0.09, 7);
  bone.addBetween(limb.knee, limb.ankle, 0.1, 0.065, 7);
  bone.addBetween(limb.ankle, limb.foot, 0.065, 0.045, 6);
  addBoneJoint(bone, limb.hip, 0.18);
  addBoneJoint(bone, limb.knee, 0.14);
  addBoneJoint(bone, limb.ankle, 0.09);
  for (const zOffset of [-0.17, 0, 0.17]) {
    bone.addBetween(
      V(limb.foot.x, 0.14, limb.foot.z + zOffset * 0.4),
      V(limb.foot.x + 0.72, 0.08, limb.foot.z + zOffset),
      0.045,
      0.025,
      6,
    );
  }
}

function addBoneArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.065, 0.048, 6);
  bone.addBetween(arm.elbow, arm.wrist, 0.055, 0.038, 6);
  addBoneJoint(bone, arm.shoulder, 0.11);
  addBoneJoint(bone, arm.elbow, 0.08);
  const palm = V(arm.wrist.x + 0.1, arm.wrist.y - 0.02, arm.wrist.z);
  for (const zOffset of [-0.16, -0.055, 0.055, 0.16]) {
    bone.addBetween(palm, V(palm.x + 0.36, palm.y - 0.11, palm.z + zOffset), 0.026, 0.014, 5);
  }
  coneBetween(
    bone,
    V(palm.x - 0.03, palm.y + 0.02, palm.z),
    V(palm.x + 0.05, palm.y + 0.55, palm.z),
    0.07,
    6,
  );
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'iguanodon-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-5.15, 2.43, 0),
    V(-4.55, 2.45, 0),
    V(-3.95, 2.48, 0),
    V(-3.32, 2.51, 0),
    V(-2.68, 2.55, 0),
    V(-2.02, 2.6, 0),
    V(-1.35, 2.68, 0),
    V(-0.68, 2.77, 0),
    V(0, 2.84, 0),
    V(0.68, 2.88, 0),
    V(1.28, 2.9, 0),
    V(1.75, 3.05, 0),
    V(2.18, 3.25, 0),
    V(2.48, 3.35, 0),
  ] as const;
  for (let index = 0; index < spine.length - 1; index += 1) {
    const start = spine[index];
    const end = spine[index + 1];
    if (!start || !end) continue;
    bone.addBetween(start, end, 0.065, 0.052, 7);
    addBoneJoint(bone, start, index < 5 ? 0.09 : 0.11);
  }
  shade.addBetween(V(-4.9, 2.51, 0.08), V(-1.25, 2.73, 0.08), 0.026, 0.032, 5);
  shade.addBetween(V(-4.8, 2.36, -0.08), V(-1.18, 2.57, -0.08), 0.024, 0.03, 5);

  for (const x of [-1.55, -1.05, -0.55, -0.05, 0.45, 0.9]) {
    for (const side of [-1, 1]) {
      const top = V(x, 2.78 + (x + 0.5) * 0.05, 0);
      const sidePoint = V(x, 2.05, side * (0.64 - Math.abs(x) * 0.05));
      const sternum = V(x, 1.82, side * 0.14);
      bone.addBetween(top, sidePoint, 0.04, 0.032, 6);
      bone.addBetween(sidePoint, sternum, 0.032, 0.025, 6);
    }
  }

  ellipsoid(shade, V(-0.75, 2.4, 0), V(0.58, 0.48, 0.7), 9, 6);
  HIND_LIMBS.forEach((limb) => addBoneHindLeg(bone, limb));
  ARMS.forEach((arm) => addBoneArm(bone, arm));

  bone.add(
    loftGeometry(
      [
        { center: V(2.25, 3.35, 0), radiusY: 0.32, radiusZ: 0.35 },
        { center: V(2.78, 3.39, 0), radiusY: 0.37, radiusZ: 0.38 },
        { center: V(3.36, 3.36, 0), radiusY: 0.34, radiusZ: 0.34 },
        { center: V(3.93, 3.28, 0), radiusY: 0.27, radiusZ: 0.28 },
        { center: V(4.45, 3.18, 0), radiusY: 0.16, radiusZ: 0.18 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  ellipsoid(shade, V(4.48, 3.17, 0), V(0.2, 0.15, 0.19), 8, 5);
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(3.08, 3.48, side * 0.32), V(0.24, 0.18, 0.045), 8, 5);
    ellipsoid(dark, V(3.72, 3.21, side * 0.28), V(0.34, 0.09, 0.03), 8, 5);
  }

  group.add(
    shade.toMesh(
      makeFlatMaterial(IGUANODON_COLORS.boneShade),
      'iguanodon-skeleton-girdles-tendons',
    ),
    bone.toMesh(makeFlatMaterial(IGUANODON_COLORS.bone), 'iguanodon-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(IGUANODON_COLORS.dark), 'iguanodon-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildIguanodon(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
