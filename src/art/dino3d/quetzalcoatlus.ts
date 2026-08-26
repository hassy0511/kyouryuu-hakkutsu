import * as THREE from 'three';
import {
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

export const QUETZALCOATLUS_COLORS = {
  body: '#C7B08A',
  neck: '#E8D9B0',
  beak: '#B08050',
  membrane: '#A98F6B',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

interface FoldedWingSpec {
  side: -1 | 1;
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  finger: readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  legAnchor: THREE.Vector3;
}

const WINGS: readonly FoldedWingSpec[] = [-1, 1].map((sideValue) => {
  const side = sideValue as -1 | 1;
  return {
    side,
    shoulder: V(-0.05, 2.18, side * 0.35),
    elbow: V(-0.6, 1.55, side * 0.48),
    wrist: V(0.48, 0.15, side * 0.52),
    finger: [V(-0.1, 0.65, side * 0.51), V(-0.75, 1.35, side * 0.48), V(-1.1, 2.15, side * 0.44)],
    legAnchor: V(-0.58, 1.72, side * 0.34),
  };
});

const HIND_LEGS = [-1, 1].map((sideValue) => {
  const side = sideValue as -1 | 1;
  return {
    side,
    hip: V(-0.68, 1.9, side * 0.3),
    knee: V(-0.88, 1.08, side * 0.36),
    ankle: V(-0.68, 0.18, side * 0.4),
    foot: V(-0.18, 0.08, side * 0.41),
  };
});

const NECK_SPINE = [
  V(0.35, 2.2, 0),
  V(0.43, 2.48, 0),
  V(0.51, 2.76, 0),
  V(0.59, 3.04, 0),
  V(0.67, 3.32, 0),
  V(0.75, 3.59, 0),
  V(0.83, 3.84, 0),
  V(0.91, 4.08, 0),
  V(1.01, 4.27, 0),
] as const;

const CREST = [
  new THREE.Vector2(1.12, 4.43),
  new THREE.Vector2(0.72, 4.68),
  new THREE.Vector2(0.88, 4.36),
] as const;

const KEEL = [
  new THREE.Vector2(0.12, 2.22),
  new THREE.Vector2(0.06, 1.55),
  new THREE.Vector2(-0.28, 1.88),
  new THREE.Vector2(-0.2, 2.24),
] as const;

function addLivingHindLeg(
  body: GeometryBatch,
  claws: GeometryBatch,
  leg: (typeof HIND_LEGS)[number],
): void {
  body.addBetween(leg.hip, leg.knee, 0.14, 0.1, 8);
  body.addBetween(leg.knee, leg.ankle, 0.1, 0.055, 8);
  body.addBetween(leg.ankle, leg.foot, 0.06, 0.04, 7);
  ellipsoid(body, leg.hip, V(0.18, 0.17, 0.16), 8, 6);
  ellipsoid(body, leg.knee, V(0.12, 0.11, 0.11), 7, 5);

  for (const zOffset of [-0.08, 0, 0.08]) {
    const toeBase = V(leg.foot.x + 0.12, 0.07, leg.foot.z + zOffset * 0.5);
    body.addBetween(leg.foot, toeBase, 0.035, 0.022, 6);
    claws.addBetween(toeBase, V(toeBase.x + 0.23, 0.045, toeBase.z + zOffset), 0.02, 0.004, 5);
  }
}

function foldedMembraneOutline(): readonly THREE.Vector2[] {
  return [
    new THREE.Vector2(-0.08, 2.2),
    new THREE.Vector2(-0.67, 1.53),
    new THREE.Vector2(0.5, 0.14),
    new THREE.Vector2(-0.08, 0.62),
    new THREE.Vector2(-0.74, 1.32),
    new THREE.Vector2(-1.12, 2.16),
    new THREE.Vector2(-0.58, 1.72),
  ];
}

function addLivingWing(body: GeometryBatch, membrane: GeometryBatch, wing: FoldedWingSpec): void {
  const [finger1, finger2, finger3] = wing.finger;
  body.addBetween(wing.shoulder, wing.elbow, 0.14, 0.105, 9);
  body.addBetween(wing.elbow, wing.wrist, 0.11, 0.075, 9);
  body.addBetween(wing.wrist, finger1, 0.075, 0.06, 8);
  body.addBetween(finger1, finger2, 0.06, 0.04, 8);
  body.addBetween(finger2, finger3, 0.042, 0.018, 7);
  ellipsoid(body, wing.shoulder, V(0.18, 0.17, 0.17), 9, 6);
  ellipsoid(body, wing.wrist, V(0.11, 0.08, 0.1), 8, 5);

  // The folded membrane stays narrow and intersects the arm at the shoulder.
  const membraneZ = wing.side * 0.47;
  membrane.add(silhouetteGeometry(foldedMembraneOutline(), 0.055), V(0, 0, membraneZ));

  // Three short fingers form the front walking hand; the fourth remains folded upward.
  for (const offset of [-0.075, 0, 0.075]) {
    body.addBetween(wing.wrist, V(0.79, 0.055, wing.wrist.z + offset), 0.026, 0.009, 5);
  }
}

function addSkeletonHindLeg(bone: GeometryBatch, leg: (typeof HIND_LEGS)[number]): void {
  bone.addBetween(leg.hip, leg.knee, 0.055, 0.043, 6);
  bone.addBetween(leg.knee, leg.ankle, 0.045, 0.028, 6);
  bone.addBetween(leg.ankle, leg.foot, 0.03, 0.02, 6);
  ellipsoid(bone, leg.hip, V(0.075, 0.07, 0.075), 7, 5);
  ellipsoid(bone, leg.knee, V(0.055, 0.05, 0.055), 7, 5);
  for (const zOffset of [-0.08, 0, 0.08]) {
    bone.addBetween(leg.foot, V(0.16, 0.045, leg.foot.z + zOffset), 0.018, 0.005, 5);
  }
}

function addSkeletonWing(bone: GeometryBatch, wing: FoldedWingSpec): void {
  const [finger1, finger2, finger3] = wing.finger;
  bone.addBetween(wing.shoulder, wing.elbow, 0.06, 0.048, 6);
  bone.addBetween(wing.elbow, wing.wrist, 0.05, 0.038, 6);
  bone.addBetween(wing.wrist, finger1, 0.04, 0.033, 6);
  bone.addBetween(finger1, finger2, 0.035, 0.025, 6);
  bone.addBetween(finger2, finger3, 0.027, 0.012, 6);
  for (const point of [wing.shoulder, wing.elbow, wing.wrist, finger1, finger2]) {
    ellipsoid(bone, point, V(0.065, 0.06, 0.065), 7, 5);
  }
  for (const offset of [-0.075, 0, 0.075]) {
    bone.addBetween(wing.wrist, V(0.79, 0.055, wing.wrist.z + offset), 0.018, 0.006, 5);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'quetzalcoatlus-living';
  const body = new GeometryBatch();
  const neck = new GeometryBatch();
  const belly = new GeometryBatch();
  const beak = new GeometryBatch();
  const membrane = new GeometryBatch();
  const claws = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-1.25, 1.92, 0), radiusY: 0.08, radiusZ: 0.1 },
        { center: V(-1.05, 1.96, 0), radiusY: 0.28, radiusZ: 0.34 },
        { center: V(-0.7, 2, 0), radiusY: 0.42, radiusZ: 0.46 },
        { center: V(-0.28, 2.06, 0), radiusY: 0.48, radiusZ: 0.5 },
        { center: V(0.1, 2.12, 0), radiusY: 0.38, radiusZ: 0.41 },
        { center: V(0.4, 2.2, 0), radiusY: 0.22, radiusZ: 0.25 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.addBetween(V(-1.2, 1.94, 0), V(-1.55, 1.89, 0), 0.09, 0.012, 7);
  belly.addBetween(V(-0.95, 1.7, 0), V(0.23, 1.92, 0), 0.18, 0.085, 9);

  neck.add(
    loftGeometry(
      [
        { center: V(0.3, 2.16, 0), radiusY: 0.25, radiusZ: 0.27 },
        { center: V(0.43, 2.55, 0), radiusY: 0.22, radiusZ: 0.23 },
        { center: V(0.56, 2.95, 0), radiusY: 0.2, radiusZ: 0.21 },
        { center: V(0.68, 3.35, 0), radiusY: 0.18, radiusZ: 0.19 },
        { center: V(0.79, 3.72, 0), radiusY: 0.16, radiusZ: 0.17 },
        { center: V(0.9, 4.05, 0), radiusY: 0.15, radiusZ: 0.16 },
        { center: V(1.02, 4.28, 0), radiusY: 0.14, radiusZ: 0.15 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  ellipsoid(neck, V(1.15, 4.38, 0), V(0.35, 0.26, 0.25), 10, 7);
  neck.add(silhouetteGeometry(CREST, 0.075), V(0, 0, 0));
  beak.add(
    loftGeometry(
      [
        { center: V(1.25, 4.36, 0), radiusY: 0.18, radiusZ: 0.21 },
        { center: V(1.65, 4.34, 0), radiusY: 0.13, radiusZ: 0.17 },
        { center: V(2.08, 4.31, 0), radiusY: 0.075, radiusZ: 0.1 },
        { center: V(2.45, 4.28, 0), radiusY: 0.02, radiusZ: 0.03 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  WINGS.forEach((wing) => addLivingWing(body, membrane, wing));
  HIND_LEGS.forEach((leg) => addLivingHindLeg(body, claws, leg));

  for (const side of [-1, 1]) {
    const eyeSurface = 0.225;
    ellipsoid(
      dark,
      V(1.2, 4.43, embeddedSideZ(side, eyeSurface, 0.022)),
      V(0.105, 0.095, 0.022),
      8,
      6,
    );
    ellipsoid(
      iris,
      V(1.22, 4.435, embeddedSideZ(side, eyeSurface + 0.006, 0.011)),
      V(0.062, 0.062, 0.011),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.235, 4.435, embeddedSideZ(side, eyeSurface + 0.01, 0.005)),
      V(0.024, 0.036, 0.005),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.2, 4.47, embeddedSideZ(side, eyeSurface + 0.0125, 0.0025)),
      V(0.011, 0.013, 0.0025),
      5,
      4,
    );
    ellipsoid(dark, V(2.06, 4.38, embeddedSideZ(side, 0.075, 0.012)), V(0.035, 0.024, 0.012), 6, 4);
  }

  const membraneMaterial = makeOrganicMaterial(QUETZALCOATLUS_COLORS.membrane);
  membraneMaterial.side = THREE.DoubleSide;
  group.add(
    body.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.body), 'quetzalcoatlus-body-limbs'),
    neck.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.neck), 'quetzalcoatlus-neck-head'),
    belly.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.neck), 'quetzalcoatlus-belly'),
    beak.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.beak), 'quetzalcoatlus-toothless-beak'),
    membrane.toMesh(membraneMaterial, 'quetzalcoatlus-folded-membranes'),
    claws.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.beak), 'quetzalcoatlus-claws'),
    iris.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.iris), 'quetzalcoatlus-irises'),
    dark.toMesh(makeOrganicMaterial(QUETZALCOATLUS_COLORS.dark), 'quetzalcoatlus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'quetzalcoatlus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'quetzalcoatlus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const torsoSpine = [
    V(-1.18, 2.02, 0),
    V(-0.92, 2.05, 0),
    V(-0.62, 2.08, 0),
    V(-0.3, 2.12, 0),
    V(0.02, 2.17, 0),
    V(0.3, 2.21, 0),
  ] as const;
  torsoSpine.forEach((point, index) => {
    const next = torsoSpine[index + 1];
    ellipsoid(bone, point, V(0.07, 0.062, 0.07), 7, 5);
    if (next) bone.addBetween(point, next, 0.03, 0.025, 6);
  });
  for (const point of torsoSpine.slice(1, 5)) {
    for (const side of [-1, 1]) {
      const ribOuter = V(point.x, point.y - 0.32, side * 0.31);
      bone.addBetween(point, ribOuter, 0.024, 0.014, 5);
      bone.addBetween(ribOuter, V(point.x + 0.03, point.y - 0.43, side * 0.1), 0.014, 0.008, 5);
    }
  }
  bone.addBetween(V(-1.18, 2.02, 0), V(-1.55, 1.89, 0), 0.035, 0.009, 6);
  bone.addBetween(V(-0.12, 2.2, -0.42), V(-0.12, 2.2, 0.42), 0.04, 0.03, 6);

  NECK_SPINE.forEach((point, index) => {
    const next = NECK_SPINE[index + 1];
    ellipsoid(bone, point, V(0.065, 0.06, 0.065), 7, 5);
    if (next) bone.addBetween(point, next, 0.03, 0.024, 6);
  });

  WINGS.forEach((wing) => addSkeletonWing(bone, wing));
  HIND_LEGS.forEach((leg) => addSkeletonHindLeg(bone, leg));
  shade.add(silhouetteGeometry(KEEL, 0.07), V(0, 0, 0));

  ellipsoid(bone, V(1.13, 4.38, 0), V(0.33, 0.24, 0.24), 9, 6);
  bone.add(silhouetteGeometry(CREST, 0.06), V(0, 0, 0));
  bone.add(
    loftGeometry(
      [
        { center: V(1.25, 4.36, 0), radiusY: 0.17, radiusZ: 0.19 },
        { center: V(1.68, 4.34, 0), radiusY: 0.11, radiusZ: 0.14 },
        { center: V(2.1, 4.31, 0), radiusY: 0.06, radiusZ: 0.08 },
        { center: V(2.45, 4.28, 0), radiusY: 0.018, radiusZ: 0.026 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(1.18, 4.43, side * 0.205), V(0.105, 0.095, 0.018), 8, 6);
    ellipsoid(dark, V(1.63, 4.35, side * 0.13), V(0.12, 0.065, 0.014), 7, 5);
    ellipsoid(dark, V(2.08, 4.38, side * 0.07), V(0.035, 0.024, 0.01), 6, 4);
  }

  group.add(
    bone.toMesh(makeFlatMaterial(QUETZALCOATLUS_COLORS.bone), 'quetzalcoatlus-skeleton-bones'),
    shade.toMesh(makeFlatMaterial(QUETZALCOATLUS_COLORS.boneShade), 'quetzalcoatlus-keel'),
    dark.toMesh(makeFlatMaterial(QUETZALCOATLUS_COLORS.dark), 'quetzalcoatlus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildQuetzalcoatlus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
