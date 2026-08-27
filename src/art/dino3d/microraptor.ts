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

export const MICRORAPTOR_COLORS = {
  body: '#2A2E3A',
  farBody: '#20242E',
  highlight: '#445369',
  wing: '#171C28',
  iris: '#C6A538',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#12151B',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const SPINE = [
  V(-3.65, 1.5, 0),
  V(-3.12, 1.53, 0),
  V(-2.58, 1.57, 0),
  V(-2.02, 1.62, 0),
  V(-1.46, 1.68, 0),
  V(-0.91, 1.75, 0),
  V(-0.38, 1.81, 0),
  V(0.08, 1.86, 0),
] as const;

const FORELIMBS = [
  {
    shoulder: V(0.02, 1.88, 0.32),
    elbow: V(0.56, 1.55, 0.56),
    wrist: V(1.16, 1.34, 0.72),
  },
  {
    shoulder: V(-0.02, 1.86, -0.28),
    elbow: V(0.42, 1.48, -0.48),
    wrist: V(1.02, 1.25, -0.63),
  },
] as const;

const HINDLIMBS = [
  {
    hip: V(-1.05, 1.62, 0.4),
    knee: V(-0.48, 1.16, 0.59),
    ankle: V(0.14, 0.9, 0.72),
    foot: V(0.62, 0.82, 0.77),
  },
  {
    hip: V(-1.31, 1.59, -0.35),
    knee: V(-0.88, 1.05, -0.53),
    ankle: V(-0.24, 0.76, -0.65),
    foot: V(0.24, 0.68, -0.7),
  },
] as const;

function addLivingForelimb(
  body: GeometryBatch,
  wings: GeometryBatch,
  limb: (typeof FORELIMBS)[number],
): void {
  body.addBetween(limb.shoulder, limb.elbow, 0.09, 0.055, 7);
  body.addBetween(limb.elbow, limb.wrist, 0.055, 0.032, 7);
  ellipsoid(body, limb.shoulder, V(0.12, 0.11, 0.1), 7, 5);
  wings.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(limb.shoulder.x - 0.12, limb.shoulder.y + 0.06),
        new THREE.Vector2(limb.elbow.x + 0.05, limb.elbow.y + 0.08),
        new THREE.Vector2(limb.wrist.x + 0.38, limb.wrist.y - 0.03),
        new THREE.Vector2(limb.wrist.x + 0.24, limb.wrist.y - 0.25),
        new THREE.Vector2(limb.elbow.x + 0.2, limb.elbow.y - 0.42),
        new THREE.Vector2(limb.elbow.x - 0.03, limb.elbow.y - 0.38),
        new THREE.Vector2(limb.shoulder.x - 0.16, limb.shoulder.y - 0.17),
      ],
      0.05,
    ),
    V(0, 0, limb.wrist.z),
  );
  for (const offset of [-0.035, 0, 0.035]) {
    body.addBetween(
      limb.wrist,
      V(limb.wrist.x + 0.22, limb.wrist.y - 0.06, limb.wrist.z + offset),
      0.013,
      0.004,
      5,
    );
  }
}

function addLivingHindlimb(
  body: GeometryBatch,
  wings: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof HINDLIMBS)[number],
): void {
  body.addBetween(limb.hip, limb.knee, 0.2, 0.12, 8);
  body.addBetween(limb.knee, limb.ankle, 0.12, 0.068, 7);
  body.addBetween(limb.ankle, limb.foot, 0.068, 0.043, 6);
  ellipsoid(body, limb.hip, V(0.26, 0.24, 0.23), 8, 5);
  wings.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(limb.hip.x - 0.18, limb.hip.y + 0.03),
        new THREE.Vector2(limb.knee.x + 0.05, limb.knee.y + 0.1),
        new THREE.Vector2(limb.ankle.x + 0.36, limb.ankle.y + 0.04),
        new THREE.Vector2(limb.ankle.x + 0.25, limb.ankle.y - 0.21),
        new THREE.Vector2(limb.knee.x + 0.08, limb.knee.y - 0.33),
        new THREE.Vector2(limb.knee.x - 0.18, limb.knee.y - 0.27),
        new THREE.Vector2(limb.hip.x - 0.23, limb.hip.y - 0.13),
      ],
      0.055,
    ),
    V(0, 0, limb.ankle.z),
  );
  for (const offset of [-0.075, 0.075]) {
    const toe = V(limb.foot.x + 0.28, limb.foot.y - 0.04, limb.foot.z + offset);
    body.addBetween(limb.foot, toe, 0.026, 0.009, 5);
    coneBetween(claws, toe, V(toe.x + 0.07, toe.y - 0.02, toe.z), 0.015, 5);
  }
  const raised = V(limb.foot.x + 0.12, limb.foot.y + 0.19, limb.foot.z);
  body.addBetween(limb.foot, raised, 0.034, 0.022, 5);
  coneBetween(claws, raised, V(raised.x + 0.09, raised.y - 0.15, raised.z), 0.035, 6);
}

function addLivingFace(
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
  teeth: GeometryBatch,
): void {
  for (const side of SIDES) {
    const surface = 0.26;
    ellipsoid(dark, V(1.08, 2.05, embeddedSideZ(side, surface, 0.04)), V(0.13, 0.115, 0.04), 8, 5);
    ellipsoid(
      iris,
      V(1.1, 2.05, embeddedSideZ(side, surface + 0.009, 0.02)),
      V(0.074, 0.078, 0.02),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.12, 2.05, embeddedSideZ(side, surface + 0.014, 0.009)),
      V(0.027, 0.049, 0.009),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.08, 2.09, embeddedSideZ(side, surface + 0.018, 0.005)),
      V(0.017, 0.019, 0.005),
      5,
      4,
    );
    ellipsoid(dark, V(1.76, 1.93, embeddedSideZ(side, 0.13, 0.008)), V(0.034, 0.019, 0.008), 6, 4);
    dark.addBetween(
      V(1.2, 1.77, embeddedSideZ(side, 0.21, 0.009, 0.08)),
      V(1.94, 1.76, embeddedSideZ(side, 0.09, 0.004, 0.08)),
      0.009,
      0.004,
      5,
    );
    for (let index = 0; index < 3; index += 1) {
      const x = 1.34 + index * 0.18;
      const z = embeddedSideZ(side, 0.19 - index * 0.035, 0.012, 0.08);
      coneBetween(teeth, V(x, 1.78, z), V(x, 1.72, z), 0.012, 5);
    }
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'microraptor-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const wings = new GeometryBatch();
  const highlights = new GeometryBatch();
  const claws = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-3.8, 1.49, 0), radiusY: 0.025, radiusZ: 0.03 },
        { center: V(-3.25, 1.52, 0), radiusY: 0.07, radiusZ: 0.08 },
        { center: V(-2.67, 1.57, 0), radiusY: 0.13, radiusZ: 0.15 },
        { center: V(-2.08, 1.62, 0), radiusY: 0.22, radiusZ: 0.25 },
        { center: V(-1.49, 1.68, 0), radiusY: 0.36, radiusZ: 0.38 },
        { center: V(-0.9, 1.75, 0), radiusY: 0.42, radiusZ: 0.42 },
        { center: V(-0.34, 1.82, 0), radiusY: 0.37, radiusZ: 0.38 },
        { center: V(0.12, 1.87, 0), radiusY: 0.28, radiusZ: 0.31 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(-0.02, 1.86, 0), radiusY: 0.28, radiusZ: 0.3 },
        { center: V(0.38, 1.91, 0), radiusY: 0.25, radiusZ: 0.29 },
        { center: V(0.72, 1.96, 0), radiusY: 0.23, radiusZ: 0.27 },
        { center: V(0.96, 1.98, 0), radiusY: 0.23, radiusZ: 0.26 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.86, 1.98, 0), radiusY: 0.22, radiusZ: 0.25 },
        { center: V(1.18, 1.98, 0), radiusY: 0.27, radiusZ: 0.26 },
        { center: V(1.5, 1.94, 0), radiusY: 0.23, radiusZ: 0.21 },
        { center: V(1.8, 1.9, 0), radiusY: 0.16, radiusZ: 0.15 },
        { center: V(2.02, 1.88, 0), radiusY: 0.08, radiusZ: 0.08 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  ellipsoid(highlights, V(-0.82, 1.96, 0), V(0.72, 0.18, 0.4), 9, 5);

  FORELIMBS.forEach((limb, index) => addLivingForelimb(index === 0 ? body : farBody, wings, limb));
  HINDLIMBS.forEach((limb, index) =>
    addLivingHindlimb(index === 0 ? body : farBody, wings, claws, limb),
  );
  for (const offset of [-0.1, 0, 0.1]) {
    wings.addBetween(
      V(-2.72, 1.56, offset * 0.25),
      V(-3.72, 1.49 + Math.abs(offset) * 0.2, offset),
      0.045,
      0.01,
      6,
    );
  }
  addLivingFace(dark, iris, glint, claws);

  group.add(
    farBody.toMesh(makeOrganicMaterial(MICRORAPTOR_COLORS.farBody), 'microraptor-far-limbs'),
    wings.toMesh(makeOrganicMaterial(MICRORAPTOR_COLORS.wing), 'microraptor-four-wings'),
    body.toMesh(makeOrganicMaterial(MICRORAPTOR_COLORS.body), 'microraptor-body'),
    highlights.toMesh(
      makeOrganicMaterial(MICRORAPTOR_COLORS.highlight),
      'microraptor-blue-highlight',
    ),
    claws.toMesh(makeOrganicMaterial(MICRORAPTOR_COLORS.bone), 'microraptor-claws-teeth'),
    iris.toMesh(makeOrganicMaterial(MICRORAPTOR_COLORS.iris), 'microraptor-irises'),
    dark.toMesh(makeOrganicMaterial(MICRORAPTOR_COLORS.dark), 'microraptor-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'microraptor-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 6, 5);
}

function addSkeletonForelimb(bone: GeometryBatch, limb: (typeof FORELIMBS)[number]): void {
  bone.addBetween(limb.shoulder, limb.elbow, 0.025, 0.017, 5);
  bone.addBetween(limb.elbow, limb.wrist, 0.017, 0.011, 5);
  addJoint(bone, limb.shoulder, 0.036);
  addJoint(bone, limb.elbow, 0.026);
  addJoint(bone, limb.wrist, 0.018);
  for (const offset of [-0.03, 0, 0.03]) {
    bone.addBetween(
      limb.wrist,
      V(limb.wrist.x + 0.23, limb.wrist.y - 0.06, limb.wrist.z + offset),
      0.009,
      0.003,
      5,
    );
  }
}

function addSkeletonHindlimb(bone: GeometryBatch, limb: (typeof HINDLIMBS)[number]): void {
  bone.addBetween(limb.hip, limb.knee, 0.047, 0.033, 5);
  bone.addBetween(limb.knee, limb.ankle, 0.033, 0.022, 5);
  bone.addBetween(limb.ankle, limb.foot, 0.022, 0.015, 5);
  addJoint(bone, limb.hip, 0.067);
  addJoint(bone, limb.knee, 0.048);
  addJoint(bone, limb.ankle, 0.033);
  for (const offset of [-0.07, 0.07]) {
    bone.addBetween(
      limb.foot,
      V(limb.foot.x + 0.3, limb.foot.y - 0.04, limb.foot.z + offset),
      0.014,
      0.005,
      5,
    );
  }
  const raised = V(limb.foot.x + 0.12, limb.foot.y + 0.19, limb.foot.z);
  bone.addBetween(limb.foot, raised, 0.018, 0.012, 5);
  coneBetween(bone, raised, V(raised.x + 0.09, raised.y - 0.15, raised.z), 0.024, 5);
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'microraptor-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.052, 0.037, index / (SPINE.length - 1));
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.4, radius * 0.32, 5);
  });
  const neck = [V(0.02, 1.87, 0), V(0.35, 1.91, 0), V(0.66, 1.96, 0), V(0.92, 1.98, 0)] as const;
  neck.forEach((point, index) => {
    addJoint(bone, point, 0.04);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.022, 0.018, 5);
  });
  for (const x of [-1.7, -1.32, -0.94, -0.56, -0.18]) {
    for (const side of SIDES) {
      const top = V(x, 1.65 + (x + 1.7) * 0.12, 0);
      const outer = V(x + 0.02, top.y - 0.27, side * 0.34);
      const lower = V(x + 0.05, top.y - 0.43, side * 0.14);
      bone.addBetween(top, outer, 0.018, 0.013, 5);
      bone.addBetween(outer, lower, 0.013, 0.008, 5);
    }
  }
  for (const side of SIDES) {
    const hind = side > 0 ? HINDLIMBS[0] : HINDLIMBS[1];
    const fore = side > 0 ? FORELIMBS[0] : FORELIMBS[1];
    shade.addBetween(V(-1.53, 1.66, side * 0.07), V(-0.78, 1.76, side * 0.31), 0.043, 0.025, 5);
    bone.addBetween(V(-1.14, 1.72, side * 0.03), hind.hip, 0.03, 0.02, 5);
    const scapula = V(-0.2, 1.81, side * 0.25);
    bone.addBetween(V(-0.25, 1.82, side * 0.03), scapula, 0.025, 0.018, 5);
    bone.addBetween(scapula, fore.shoulder, 0.021, 0.015, 5);
  }
  FORELIMBS.forEach((limb) => addSkeletonForelimb(bone, limb));
  HINDLIMBS.forEach((limb) => addSkeletonHindlimb(bone, limb));

  bone.add(
    loftGeometry(
      [
        { center: V(0.84, 1.98, 0), radiusY: 0.18, radiusZ: 0.22 },
        { center: V(1.16, 1.98, 0), radiusY: 0.23, radiusZ: 0.23 },
        { center: V(1.49, 1.94, 0), radiusY: 0.19, radiusZ: 0.18 },
        { center: V(1.78, 1.9, 0), radiusY: 0.12, radiusZ: 0.12 },
        { center: V(2.0, 1.88, 0), radiusY: 0.055, radiusZ: 0.06 },
      ],
      7,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(1.12, 1.76, 0), V(2.0, 1.74, 0), 0.026, 0.011, 5);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.08, 2.05, side * 0.23), V(0.13, 0.11, 0.03), 7, 5);
    ellipsoid(dark, V(1.48, 1.95, side * 0.17), V(0.12, 0.06, 0.02), 7, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(MICRORAPTOR_COLORS.boneShade), 'microraptor-girdles'),
    bone.toMesh(makeFlatMaterial(MICRORAPTOR_COLORS.bone), 'microraptor-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(MICRORAPTOR_COLORS.dark), 'microraptor-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildMicroraptor(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
