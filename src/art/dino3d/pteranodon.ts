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

export const PTERANODON_COLORS = {
  back: '#B98A5A',
  membrane: '#D9A441',
  belly: '#EFE6C8',
  crestTip: '#C0563E',
  beak: '#C8A36B',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

interface WingSpec {
  side: -1 | 1;
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  finger: readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  legAnchor: THREE.Vector3;
}

const WINGS: readonly WingSpec[] = [-1, 1].map((sideValue) => {
  const side = sideValue as -1 | 1;
  return {
    side,
    shoulder: V(0.02, 1.11, side * 0.25),
    elbow: V(0.04, 1.17, side * 0.98),
    wrist: V(-0.02, 1.09, side * 1.55),
    finger: [V(-0.08, 1.04, side * 2.23), V(-0.22, 0.97, side * 2.9), V(-0.43, 0.9, side * 3.45)],
    legAnchor: V(-0.4, 0.72, side * 0.22),
  };
});

const CREST = [
  new THREE.Vector2(0.78, 1.15),
  new THREE.Vector2(0.38, 1.35),
  new THREE.Vector2(-0.12, 1.55),
  new THREE.Vector2(0.18, 1.18),
] as const;

const CREST_TIP = [
  new THREE.Vector2(0.24, 1.29),
  new THREE.Vector2(-0.12, 1.55),
  new THREE.Vector2(0.06, 1.23),
] as const;

const KEEL = [
  new THREE.Vector2(0.16, 1.02),
  new THREE.Vector2(0.08, 0.58),
  new THREE.Vector2(-0.2, 0.84),
  new THREE.Vector2(-0.18, 1.06),
] as const;

function membraneGeometry(wing: WingSpec): THREE.BufferGeometry {
  const points = [wing.shoulder, wing.elbow, wing.wrist, ...wing.finger, wing.legAnchor];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  points.forEach((point, index) => {
    positions.push(point.x, point.y, point.z);
    uvs.push(index / (points.length - 1), index === 0 ? 0 : 1);
  });
  for (let index = 1; index < points.length - 1; index += 1) indices.push(0, index, index + 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addLivingWing(arms: GeometryBatch, membrane: GeometryBatch, wing: WingSpec): void {
  const [finger1, finger2, finger3] = wing.finger;
  arms.addBetween(wing.shoulder, wing.elbow, 0.13, 0.1, 9);
  arms.addBetween(wing.elbow, wing.wrist, 0.105, 0.075, 9);
  arms.addBetween(wing.wrist, finger1, 0.075, 0.055, 8);
  arms.addBetween(finger1, finger2, 0.058, 0.038, 8);
  arms.addBetween(finger2, finger3, 0.04, 0.015, 7);
  ellipsoid(arms, wing.shoulder, V(0.17, 0.15, 0.16), 9, 7);
  membrane.add(membraneGeometry(wing), V(0, 0, 0));
}

function addSkeletonWing(bone: GeometryBatch, wing: WingSpec): void {
  const [finger1, finger2, finger3] = wing.finger;
  bone.addBetween(wing.shoulder, wing.elbow, 0.055, 0.045, 6);
  bone.addBetween(wing.elbow, wing.wrist, 0.048, 0.038, 6);
  bone.addBetween(wing.wrist, finger1, 0.04, 0.032, 6);
  bone.addBetween(finger1, finger2, 0.034, 0.024, 6);
  bone.addBetween(finger2, finger3, 0.026, 0.012, 6);
  for (const point of [wing.shoulder, wing.elbow, wing.wrist, finger1, finger2]) {
    ellipsoid(bone, point, V(0.065, 0.06, 0.065), 7, 5);
  }

  // Three short fingers remain at the wrist; the long fourth finger holds the wing.
  for (const offset of [-0.06, 0, 0.06]) {
    bone.addBetween(
      wing.wrist,
      V(wing.wrist.x + 0.23 + Math.abs(offset), wing.wrist.y - 0.04, wing.wrist.z + offset),
      0.018,
      0.007,
      5,
    );
  }
}

function addLivingLeg(body: GeometryBatch, side: number): void {
  const hip = V(-0.3, 0.91, side * 0.17);
  const knee = V(-0.48, 0.72, side * 0.22);
  const ankle = V(-0.68, 0.63, side * 0.25);
  body.addBetween(hip, knee, 0.075, 0.055, 7);
  body.addBetween(knee, ankle, 0.055, 0.032, 7);
  for (const zOffset of [-0.045, 0, 0.045]) {
    body.addBetween(ankle, V(-0.84, 0.61, ankle.z + zOffset), 0.018, 0.006, 5);
  }
}

function addSkeletonLeg(bone: GeometryBatch, side: number): void {
  const hip = V(-0.3, 0.91, side * 0.17);
  const knee = V(-0.48, 0.72, side * 0.22);
  const ankle = V(-0.68, 0.63, side * 0.25);
  bone.addBetween(hip, knee, 0.03, 0.024, 6);
  bone.addBetween(knee, ankle, 0.025, 0.017, 6);
  ellipsoid(bone, hip, V(0.045, 0.04, 0.045), 7, 5);
  ellipsoid(bone, knee, V(0.035, 0.032, 0.035), 7, 5);
  for (const zOffset of [-0.045, 0, 0.045]) {
    bone.addBetween(ankle, V(-0.84, 0.61, ankle.z + zOffset), 0.012, 0.005, 5);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pteranodon-living';
  const body = new GeometryBatch();
  const belly = new GeometryBatch();
  const membrane = new GeometryBatch();
  const crest = new GeometryBatch();
  const crestTip = new GeometryBatch();
  const beak = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-0.57, 0.92, 0), radiusY: 0.09, radiusZ: 0.1 },
        { center: V(-0.35, 0.96, 0), radiusY: 0.25, radiusZ: 0.27 },
        { center: V(0.02, 1.02, 0), radiusY: 0.3, radiusZ: 0.32 },
        { center: V(0.34, 1.08, 0), radiusY: 0.2, radiusZ: 0.22 },
        { center: V(0.55, 1.12, 0), radiusY: 0.15, radiusZ: 0.17 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  ellipsoid(body, V(0.65, 1.14, 0), V(0.25, 0.21, 0.21), 10, 7);
  body.addBetween(V(-0.5, 0.93, 0), V(-0.77, 0.88, 0), 0.08, 0.012, 7);
  belly.addBetween(V(-0.35, 0.82, 0), V(0.52, 0.98, 0), 0.13, 0.07, 9);
  WINGS.forEach((wing) => addLivingWing(body, membrane, wing));
  for (const side of [-1, 1]) addLivingLeg(body, side);

  crest.add(silhouetteGeometry(CREST, 0.09), V(0, 0, 0));
  crestTip.add(silhouetteGeometry(CREST_TIP, 0.095), V(0, 0, 0));
  beak.add(
    loftGeometry(
      [
        { center: V(0.73, 1.13, 0), radiusY: 0.15, radiusZ: 0.17 },
        { center: V(1.12, 1.1, 0), radiusY: 0.09, radiusZ: 0.12 },
        { center: V(1.5, 1.07, 0), radiusY: 0.035, radiusZ: 0.05 },
        { center: V(1.67, 1.055, 0), radiusY: 0.012, radiusZ: 0.018 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  for (const side of [-1, 1]) {
    const eyeSurface = 0.19;
    ellipsoid(
      dark,
      V(0.71, 1.2, embeddedSideZ(side, eyeSurface, 0.018)),
      V(0.09, 0.085, 0.018),
      8,
      6,
    );
    ellipsoid(
      iris,
      V(0.73, 1.205, embeddedSideZ(side, eyeSurface + 0.005, 0.009)),
      V(0.052, 0.055, 0.009),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(0.745, 1.205, embeddedSideZ(side, eyeSurface + 0.008, 0.004)),
      V(0.02, 0.03, 0.004),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(0.716, 1.235, embeddedSideZ(side, eyeSurface + 0.01, 0.002)),
      V(0.009, 0.011, 0.002),
      5,
      4,
    );
  }

  const membraneMaterial = makeOrganicMaterial(PTERANODON_COLORS.membrane);
  membraneMaterial.side = THREE.DoubleSide;
  group.add(
    body.toMesh(makeOrganicMaterial(PTERANODON_COLORS.back), 'pteranodon-body-wings-legs'),
    belly.toMesh(makeOrganicMaterial(PTERANODON_COLORS.belly), 'pteranodon-belly'),
    membrane.toMesh(membraneMaterial, 'pteranodon-wing-membranes'),
    crest.toMesh(makeOrganicMaterial(PTERANODON_COLORS.back), 'pteranodon-crest'),
    crestTip.toMesh(makeOrganicMaterial(PTERANODON_COLORS.crestTip), 'pteranodon-crest-tip'),
    beak.toMesh(makeOrganicMaterial(PTERANODON_COLORS.beak), 'pteranodon-toothless-beak'),
    iris.toMesh(makeOrganicMaterial(PTERANODON_COLORS.iris), 'pteranodon-irises'),
    dark.toMesh(makeOrganicMaterial(PTERANODON_COLORS.dark), 'pteranodon-eye-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'pteranodon-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pteranodon-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-0.56, 0.93, 0),
    V(-0.4, 0.97, 0),
    V(-0.22, 1.01, 0),
    V(-0.03, 1.05, 0),
    V(0.17, 1.08, 0),
    V(0.36, 1.1, 0),
    V(0.52, 1.13, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    ellipsoid(bone, point, V(0.055, 0.05, 0.055), 7, 5);
    if (next) bone.addBetween(point, next, 0.025, 0.021, 6);
  });
  for (const point of spine.slice(1, 5)) {
    for (const side of [-1, 1]) {
      bone.addBetween(point, V(point.x, point.y - 0.23, side * 0.2), 0.018, 0.011, 5);
      bone.addBetween(
        V(point.x, point.y - 0.23, side * 0.2),
        V(point.x + 0.03, point.y - 0.31, side * 0.08),
        0.011,
        0.007,
        5,
      );
    }
  }

  WINGS.forEach((wing) => addSkeletonWing(bone, wing));
  for (const side of [-1, 1]) addSkeletonLeg(bone, side);

  shade.add(silhouetteGeometry(KEEL, 0.07), V(0, 0, 0));
  bone.add(silhouetteGeometry(CREST, 0.065), V(0, 0, 0));
  ellipsoid(bone, V(0.65, 1.14, 0), V(0.23, 0.19, 0.19), 9, 6);
  bone.add(
    loftGeometry(
      [
        { center: V(0.72, 1.13, 0), radiusY: 0.14, radiusZ: 0.16 },
        { center: V(1.12, 1.1, 0), radiusY: 0.075, radiusZ: 0.1 },
        { center: V(1.67, 1.055, 0), radiusY: 0.012, radiusZ: 0.018 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(0.69, 1.2, side * 0.175), V(0.09, 0.085, 0.015), 8, 6);
    ellipsoid(dark, V(1.35, 1.1, side * 0.055), V(0.028, 0.018, 0.007), 6, 4);
  }

  group.add(
    bone.toMesh(makeFlatMaterial(PTERANODON_COLORS.bone), 'pteranodon-skeleton-bones'),
    shade.toMesh(makeFlatMaterial(PTERANODON_COLORS.boneShade), 'pteranodon-keel'),
    dark.toMesh(makeFlatMaterial(PTERANODON_COLORS.dark), 'pteranodon-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildPteranodon(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
