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

export const OVIRAPTOR_COLORS = {
  body: '#C77A5A',
  bodyShade: '#9E5E48',
  crest: '#D94A4A',
  belly: '#EFE0C0',
  feather: '#6E4A2E',
  beak: '#D8C794',
  iris: '#C69438',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const SPINE = [
  V(-3.25, 1.55, 0),
  V(-2.7, 1.63, 0),
  V(-2.15, 1.75, 0),
  V(-1.6, 1.9, 0),
  V(-1.08, 2.05, 0),
  V(-0.55, 2.2, 0),
  V(-0.04, 2.36, 0),
] as const;

const LEGS = [
  {
    hip: V(-1.05, 1.85, 0.46),
    knee: V(-0.42, 1.0, 0.53),
    ankle: V(-0.67, 0.25, 0.57),
    foot: V(-0.15, 0.12, 0.58),
  },
  {
    hip: V(-1.35, 1.8, -0.4),
    knee: V(-1.73, 0.95, -0.47),
    ankle: V(-1.3, 0.23, -0.5),
    foot: V(-0.78, 0.11, -0.52),
  },
] as const;

const ARMS = [
  {
    shoulder: V(-0.03, 2.38, 0.35),
    elbow: V(0.35, 2.05, 0.41),
    wrist: V(0.78, 1.94, 0.44),
  },
  {
    shoulder: V(-0.07, 2.34, -0.31),
    elbow: V(0.22, 1.99, -0.36),
    wrist: V(0.63, 1.87, -0.39),
  },
] as const;

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  body.addBetween(leg.hip, leg.knee, 0.37, 0.23, 9);
  body.addBetween(leg.knee, leg.ankle, 0.23, 0.125, 8);
  ellipsoid(body, leg.hip, V(0.44, 0.42, 0.4), 9, 6);
  ellipsoid(body, leg.knee, V(0.26, 0.24, 0.23), 8, 5);
  body.addBetween(leg.ankle, leg.foot, 0.125, 0.078, 7);
  ellipsoid(body, leg.foot, V(0.32, 0.11, 0.19), 8, 5);
  for (const offset of [-0.12, 0, 0.12]) {
    const tip = V(leg.foot.x + 0.46, 0.065, leg.foot.z + offset);
    body.addBetween(leg.foot, tip, 0.045, 0.015, 6);
    coneBetween(claws, tip, V(tip.x + 0.1, 0.05, tip.z), 0.025, 5);
  }
}

function addLivingArm(
  body: GeometryBatch,
  feathers: GeometryBatch,
  arm: (typeof ARMS)[number],
): void {
  body.addBetween(arm.shoulder, arm.elbow, 0.12, 0.078, 7);
  body.addBetween(arm.elbow, arm.wrist, 0.078, 0.045, 7);
  ellipsoid(body, arm.shoulder, V(0.15, 0.14, 0.13), 7, 5);
  ellipsoid(body, arm.elbow, V(0.095, 0.085, 0.08), 6, 5);
  feathers.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(arm.shoulder.x - 0.08, arm.shoulder.y + 0.02),
        new THREE.Vector2(arm.elbow.x + 0.02, arm.elbow.y + 0.04),
        new THREE.Vector2(arm.wrist.x + 0.18, arm.wrist.y - 0.02),
        new THREE.Vector2(arm.wrist.x + 0.12, arm.wrist.y - 0.2),
        new THREE.Vector2(arm.elbow.x + 0.05, arm.elbow.y - 0.34),
        new THREE.Vector2(arm.elbow.x - 0.14, arm.elbow.y - 0.27),
        new THREE.Vector2(arm.shoulder.x - 0.13, arm.shoulder.y - 0.14),
      ],
      0.045,
    ),
    V(0, 0, arm.wrist.z),
  );
  for (const offset of [-0.045, 0, 0.045]) {
    body.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.2, arm.wrist.y - 0.04, arm.wrist.z + offset),
      0.016,
      0.005,
      5,
    );
  }
}

function addLivingFace(dark: GeometryBatch, iris: GeometryBatch, glint: GeometryBatch): void {
  for (const side of SIDES) {
    const surface = 0.34;
    ellipsoid(
      dark,
      V(0.93, 2.93, embeddedSideZ(side, surface, 0.045)),
      V(0.145, 0.13, 0.045),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(0.95, 2.93, embeddedSideZ(side, surface + 0.01, 0.022)),
      V(0.082, 0.086, 0.022),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(0.97, 2.93, embeddedSideZ(side, surface + 0.015, 0.01)),
      V(0.03, 0.054, 0.01),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(0.93, 2.98, embeddedSideZ(side, surface + 0.019, 0.005)),
      V(0.018, 0.02, 0.005),
      5,
      4,
    );
    ellipsoid(dark, V(1.72, 2.76, embeddedSideZ(side, 0.19, 0.01)), V(0.04, 0.023, 0.01), 6, 4);
    // The beak seam is embedded; no teeth are added for this toothless species.
    dark.addBetween(
      V(1.23, 2.55, embeddedSideZ(side, 0.27, 0.011, 0.08)),
      V(2.13, 2.55, embeddedSideZ(side, 0.12, 0.006, 0.08)),
      0.011,
      0.006,
      6,
    );
  }
}

function addTailFan(feathers: GeometryBatch): void {
  feathers.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(-2.15, 1.82),
        new THREE.Vector2(-3.45, 2.14),
        new THREE.Vector2(-3.92, 2.02),
        new THREE.Vector2(-3.45, 1.73),
        new THREE.Vector2(-4.02, 1.5),
        new THREE.Vector2(-3.42, 1.38),
        new THREE.Vector2(-2.18, 1.62),
      ],
      0.24,
    ),
    V(0, 0, 0),
  );
}

function addCrest(batch: GeometryBatch, skeleton = false): void {
  const scale = skeleton ? 0.76 : 1;
  ellipsoid(batch, V(0.73, 3.25, 0), V(0.29 * scale, 0.34 * scale, 0.32 * scale), 9, 6);
  ellipsoid(batch, V(1.03, 3.28, 0), V(0.32 * scale, 0.38 * scale, 0.34 * scale), 9, 6);
  ellipsoid(batch, V(1.3, 3.17, 0), V(0.25 * scale, 0.3 * scale, 0.29 * scale), 8, 6);
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'oviraptor-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const feathers = new GeometryBatch();
  const crest = new GeometryBatch();
  const beakClaws = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-3.35, 1.53, 0), radiusY: 0.035, radiusZ: 0.045 },
        { center: V(-2.85, 1.61, 0), radiusY: 0.12, radiusZ: 0.14 },
        { center: V(-2.3, 1.73, 0), radiusY: 0.25, radiusZ: 0.29 },
        { center: V(-1.7, 1.88, 0), radiusY: 0.48, radiusZ: 0.49 },
        { center: V(-1.1, 2.03, 0), radiusY: 0.65, radiusZ: 0.62 },
        { center: V(-0.5, 2.19, 0), radiusY: 0.62, radiusZ: 0.59 },
        { center: V(0.02, 2.36, 0), radiusY: 0.46, radiusZ: 0.48 },
        { center: V(0.38, 2.54, 0), radiusY: 0.34, radiusZ: 0.38 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.22, 2.48, 0), radiusY: 0.34, radiusZ: 0.38 },
        { center: V(0.48, 2.69, 0), radiusY: 0.32, radiusZ: 0.36 },
        { center: V(0.68, 2.84, 0), radiusY: 0.34, radiusZ: 0.37 },
        { center: V(0.88, 2.9, 0), radiusY: 0.36, radiusZ: 0.38 },
        { center: V(1.14, 2.87, 0), radiusY: 0.33, radiusZ: 0.35 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  beakClaws.add(
    loftGeometry(
      [
        { center: V(1.08, 2.82, 0), radiusY: 0.29, radiusZ: 0.32 },
        { center: V(1.43, 2.75, 0), radiusY: 0.25, radiusZ: 0.29 },
        { center: V(1.78, 2.69, 0), radiusY: 0.19, radiusZ: 0.23 },
        { center: V(2.08, 2.66, 0), radiusY: 0.11, radiusZ: 0.15 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-1.95, 1.56, 0), radiusY: 0.04, radiusZ: 0.3 },
        { center: V(-1.34, 1.39, 0), radiusY: 0.1, radiusZ: 0.46 },
        { center: V(-0.72, 1.45, 0), radiusY: 0.13, radiusZ: 0.47 },
        { center: V(-0.12, 1.75, 0), radiusY: 0.09, radiusZ: 0.38 },
        { center: V(0.42, 2.33, 0), radiusY: 0.045, radiusZ: 0.27 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  addTailFan(feathers);
  addCrest(crest);
  LEGS.forEach((leg, index) => addLivingLeg(index === 0 ? body : farBody, beakClaws, leg));
  ARMS.forEach((arm, index) => addLivingArm(index === 0 ? body : farBody, feathers, arm));
  addLivingFace(dark, iris, glint);

  group.add(
    farBody.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.bodyShade), 'oviraptor-far-limbs'),
    feathers.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.feather), 'oviraptor-wing-tail-feathers'),
    body.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.body), 'oviraptor-body'),
    belly.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.belly), 'oviraptor-belly'),
    crest.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.crest), 'oviraptor-rounded-crest'),
    beakClaws.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.beak), 'oviraptor-beak-claws'),
    iris.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.iris), 'oviraptor-irises'),
    dark.toMesh(makeOrganicMaterial(OVIRAPTOR_COLORS.dark), 'oviraptor-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'oviraptor-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addSkeletonLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  bone.addBetween(leg.hip, leg.knee, 0.078, 0.055, 6);
  bone.addBetween(leg.knee, leg.ankle, 0.055, 0.037, 6);
  bone.addBetween(leg.ankle, leg.foot, 0.037, 0.025, 5);
  addJoint(bone, leg.hip, 0.11);
  addJoint(bone, leg.knee, 0.078);
  addJoint(bone, leg.ankle, 0.054);
  for (const offset of [-0.12, 0, 0.12]) {
    bone.addBetween(leg.foot, V(leg.foot.x + 0.48, 0.06, leg.foot.z + offset), 0.024, 0.008, 5);
  }
}

function addSkeletonArm(bone: GeometryBatch, arm: (typeof ARMS)[number]): void {
  bone.addBetween(arm.shoulder, arm.elbow, 0.032, 0.022, 5);
  bone.addBetween(arm.elbow, arm.wrist, 0.022, 0.014, 5);
  addJoint(bone, arm.shoulder, 0.045);
  addJoint(bone, arm.elbow, 0.033);
  addJoint(bone, arm.wrist, 0.022);
  for (const offset of [-0.04, 0, 0.04]) {
    bone.addBetween(
      arm.wrist,
      V(arm.wrist.x + 0.22, arm.wrist.y - 0.04, arm.wrist.z + offset),
      0.011,
      0.004,
      5,
    );
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'oviraptor-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.065, 0.05, index / (SPINE.length - 1));
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.43, radius * 0.35, 5);
  });
  const neck = [V(-0.06, 2.36, 0), V(0.25, 2.54, 0), V(0.5, 2.72, 0), V(0.7, 2.84, 0)] as const;
  neck.forEach((point, index) => {
    addJoint(bone, point, 0.052);
    const next = neck[index + 1];
    if (next) bone.addBetween(point, next, 0.029, 0.023, 5);
  });
  for (const x of [-1.78, -1.38, -0.98, -0.58, -0.18]) {
    for (const side of SIDES) {
      const top = V(x, 1.84 + (x + 1.78) * 0.29, 0);
      const outer = V(x + 0.02, top.y - 0.42, side * 0.45);
      const lower = V(x + 0.06, top.y - 0.68, side * 0.18);
      bone.addBetween(top, outer, 0.024, 0.017, 5);
      bone.addBetween(outer, lower, 0.017, 0.01, 5);
    }
  }
  for (const side of SIDES) {
    const leg = side > 0 ? LEGS[0] : LEGS[1];
    const arm = side > 0 ? ARMS[0] : ARMS[1];
    shade.addBetween(V(-1.62, 1.9, side * 0.09), V(-0.82, 2.11, side * 0.37), 0.058, 0.034, 6);
    bone.addBetween(V(-1.18, 2.02, side * 0.04), leg.hip, 0.04, 0.027, 5);
    bone.addBetween(leg.hip, V(-0.73, 1.36, side * 0.3), 0.031, 0.017, 5);
    const scapula = V(-0.25, 2.3, side * 0.29);
    bone.addBetween(V(-0.28, 2.28, side * 0.04), scapula, 0.032, 0.022, 5);
    bone.addBetween(scapula, arm.shoulder, 0.027, 0.019, 5);
    bone.addBetween(arm.shoulder, V(-0.03, 2.0, side * 0.11), 0.023, 0.014, 5);
  }
  LEGS.forEach((leg) => addSkeletonLeg(bone, leg));
  ARMS.forEach((arm) => addSkeletonArm(bone, arm));

  bone.add(
    loftGeometry(
      [
        { center: V(0.64, 2.85, 0), radiusY: 0.28, radiusZ: 0.32 },
        { center: V(0.96, 2.88, 0), radiusY: 0.31, radiusZ: 0.32 },
        { center: V(1.26, 2.82, 0), radiusY: 0.25, radiusZ: 0.28 },
        { center: V(1.52, 2.73, 0), radiusY: 0.16, radiusZ: 0.2 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  bone.add(
    loftGeometry(
      [
        { center: V(1.38, 2.72, 0), radiusY: 0.16, radiusZ: 0.22 },
        { center: V(1.75, 2.67, 0), radiusY: 0.13, radiusZ: 0.18 },
        { center: V(2.07, 2.64, 0), radiusY: 0.07, radiusZ: 0.11 },
      ],
      7,
    ),
    V(0, 0, 0),
  );
  addCrest(bone, true);
  for (const side of SIDES) {
    ellipsoid(dark, V(0.93, 2.94, side * 0.31), V(0.15, 0.13, 0.038), 7, 5);
    ellipsoid(dark, V(1.34, 2.8, side * 0.25), V(0.14, 0.08, 0.027), 7, 5);
    dark.addBetween(V(1.3, 2.55, side * 0.21), V(2.08, 2.54, side * 0.1), 0.009, 0.004, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(OVIRAPTOR_COLORS.boneShade), 'oviraptor-girdles'),
    bone.toMesh(makeFlatMaterial(OVIRAPTOR_COLORS.bone), 'oviraptor-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(OVIRAPTOR_COLORS.dark), 'oviraptor-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildOviraptor(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
