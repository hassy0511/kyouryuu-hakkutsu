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

export const RHAMPHORHYNCHUS_COLORS = {
  back: '#8A6E4E',
  membrane: '#C77A5A',
  belly: '#EFE0C0',
  rudder: '#C0563E',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

interface WingSpec {
  side: -1 | 1;
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  finger: readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  legAnchor: THREE.Vector3;
}

const WINGS: readonly WingSpec[] = SIDES.map((side) => ({
  side,
  shoulder: V(0.02, 0.77, side * 0.15),
  elbow: V(0.06, 0.83, side * 0.38),
  wrist: V(0.01, 0.79, side * 0.57),
  finger: [V(-0.02, 0.75, side * 0.7), V(-0.07, 0.69, side * 0.82), V(-0.13, 0.63, side * 0.9)],
  legAnchor: V(-0.43, 0.58, side * 0.12),
}));

const RUDDER = [
  new THREE.Vector2(-0.96, 0.67),
  new THREE.Vector2(-1.13, 0.84),
  new THREE.Vector2(-1.3, 0.66),
  new THREE.Vector2(-1.13, 0.46),
] as const;

const KEEL = [
  new THREE.Vector2(0.13, 0.73),
  new THREE.Vector2(0.05, 0.47),
  new THREE.Vector2(-0.2, 0.6),
  new THREE.Vector2(-0.17, 0.76),
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

function addLivingWing(body: GeometryBatch, membrane: GeometryBatch, wing: WingSpec): void {
  const [finger1, finger2, finger3] = wing.finger;
  body.addBetween(wing.shoulder, wing.elbow, 0.07, 0.055, 8);
  body.addBetween(wing.elbow, wing.wrist, 0.055, 0.04, 8);
  body.addBetween(wing.wrist, finger1, 0.043, 0.032, 7);
  body.addBetween(finger1, finger2, 0.034, 0.023, 7);
  body.addBetween(finger2, finger3, 0.024, 0.009, 7);
  ellipsoid(body, wing.shoulder, V(0.095, 0.09, 0.085), 8, 6);
  membrane.add(membraneGeometry(wing), V(0, 0, 0));
}

function addSkeletonWing(bone: GeometryBatch, wing: WingSpec): void {
  const [finger1, finger2, finger3] = wing.finger;
  bone.addBetween(wing.shoulder, wing.elbow, 0.028, 0.023, 6);
  bone.addBetween(wing.elbow, wing.wrist, 0.025, 0.019, 6);
  bone.addBetween(wing.wrist, finger1, 0.021, 0.016, 6);
  bone.addBetween(finger1, finger2, 0.018, 0.012, 6);
  bone.addBetween(finger2, finger3, 0.013, 0.006, 6);
  for (const point of [wing.shoulder, wing.elbow, wing.wrist, finger1, finger2]) {
    ellipsoid(bone, point, V(0.033, 0.03, 0.033), 6, 5);
  }

  // Three short fingers branch from the wrist; the elongated fourth finger supports the wing.
  for (const offset of [-0.026, 0, 0.026]) {
    bone.addBetween(
      wing.wrist,
      V(wing.wrist.x + 0.12 + Math.abs(offset), wing.wrist.y - 0.025, wing.wrist.z + offset),
      0.011,
      0.004,
      5,
    );
  }
}

function addLivingLeg(body: GeometryBatch, side: -1 | 1): void {
  const hip = V(-0.22, 0.66, side * 0.11);
  const knee = V(-0.33, 0.55, side * 0.14);
  const ankle = V(-0.43, 0.51, side * 0.16);
  body.addBetween(hip, knee, 0.04, 0.03, 7);
  body.addBetween(knee, ankle, 0.03, 0.017, 7);
  for (const zOffset of [-0.024, 0, 0.024]) {
    body.addBetween(ankle, V(-0.51, 0.49, ankle.z + zOffset), 0.01, 0.003, 5);
  }
}

function addSkeletonLeg(bone: GeometryBatch, side: -1 | 1): void {
  const hip = V(-0.22, 0.66, side * 0.11);
  const knee = V(-0.33, 0.55, side * 0.14);
  const ankle = V(-0.43, 0.51, side * 0.16);
  bone.addBetween(hip, knee, 0.018, 0.014, 6);
  bone.addBetween(knee, ankle, 0.015, 0.009, 6);
  ellipsoid(bone, hip, V(0.026, 0.023, 0.026), 6, 5);
  ellipsoid(bone, knee, V(0.021, 0.019, 0.021), 6, 5);
  for (const zOffset of [-0.024, 0, 0.024]) {
    bone.addBetween(ankle, V(-0.51, 0.49, ankle.z + zOffset), 0.008, 0.003, 5);
  }
}

function addTeeth(teeth: GeometryBatch): void {
  for (const side of SIDES) {
    for (const [index, x] of [0.43, 0.51, 0.59, 0.67].entries()) {
      const gumDepth = 0.078 - index * 0.009;
      const z = embeddedSideZ(side, gumDepth, 0.009, 0.12);
      coneBetween(
        teeth,
        V(x, 0.675 - index * 0.003, z),
        V(x + 0.016, 0.646 - index * 0.002, z),
        0.008,
        5,
      );
    }
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rhamphorhynchus-living';
  const body = new GeometryBatch();
  const belly = new GeometryBatch();
  const membrane = new GeometryBatch();
  const rudder = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();
  const teeth = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-0.34, 0.68, 0), radiusY: 0.07, radiusZ: 0.075 },
        { center: V(-0.22, 0.7, 0), radiusY: 0.16, radiusZ: 0.17 },
        { center: V(0.02, 0.72, 0), radiusY: 0.19, radiusZ: 0.19 },
        { center: V(0.2, 0.74, 0), radiusY: 0.13, radiusZ: 0.145 },
        { center: V(0.31, 0.75, 0), radiusY: 0.09, radiusZ: 0.105 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(-0.27, 0.69, 0), radiusY: 0.075, radiusZ: 0.08 },
        { center: V(-0.55, 0.68, 0), radiusY: 0.055, radiusZ: 0.058 },
        { center: V(-0.82, 0.67, 0), radiusY: 0.035, radiusZ: 0.037 },
        { center: V(-1.08, 0.66, 0), radiusY: 0.012, radiusZ: 0.014 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  ellipsoid(body, V(0.34, 0.76, 0), V(0.14, 0.125, 0.12), 10, 7);
  body.add(
    loftGeometry(
      [
        { center: V(0.36, 0.75, 0), radiusY: 0.09, radiusZ: 0.105 },
        { center: V(0.57, 0.72, 0), radiusY: 0.065, radiusZ: 0.082 },
        { center: V(0.76, 0.69, 0), radiusY: 0.028, radiusZ: 0.047 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  belly.addBetween(V(-0.23, 0.59, 0), V(0.23, 0.66, 0), 0.09, 0.05, 8);
  WINGS.forEach((wing) => addLivingWing(body, membrane, wing));
  SIDES.forEach((side) => addLivingLeg(body, side));

  rudder.add(silhouetteGeometry(RUDDER, 0.022), V(0, 0, 0));
  addTeeth(teeth);

  for (const side of SIDES) {
    const eyeSurface = 0.112;
    ellipsoid(
      dark,
      V(0.39, 0.8, embeddedSideZ(side, eyeSurface, 0.013)),
      V(0.052, 0.052, 0.013),
      8,
      6,
    );
    ellipsoid(
      iris,
      V(0.402, 0.804, embeddedSideZ(side, eyeSurface + 0.003, 0.007)),
      V(0.031, 0.032, 0.007),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(0.411, 0.804, embeddedSideZ(side, eyeSurface + 0.005, 0.003)),
      V(0.012, 0.019, 0.003),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(0.392, 0.824, embeddedSideZ(side, eyeSurface + 0.006, 0.0015)),
      V(0.006, 0.007, 0.0015),
      5,
      4,
    );
    const mouthDepth = 0.079;
    dark.addBetween(
      V(0.37, 0.705, embeddedSideZ(side, 0.102, 0.006, 0.08)),
      V(0.75, 0.684, embeddedSideZ(side, mouthDepth, 0.004, 0.08)),
      0.006,
      0.0025,
      5,
    );
    ellipsoid(
      dark,
      V(0.65, 0.727, embeddedSideZ(side, 0.065, 0.006, 0.1)),
      V(0.018, 0.012, 0.006),
      6,
      4,
    );
  }

  const membraneMaterial = makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.membrane);
  membraneMaterial.side = THREE.DoubleSide;
  group.add(
    body.toMesh(
      makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.back),
      'rhamphorhynchus-body-wings-legs',
    ),
    belly.toMesh(makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.belly), 'rhamphorhynchus-belly'),
    membrane.toMesh(membraneMaterial, 'rhamphorhynchus-wing-membranes'),
    rudder.toMesh(
      makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.rudder),
      'rhamphorhynchus-tail-rudder',
    ),
    iris.toMesh(makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.iris), 'rhamphorhynchus-irises'),
    dark.toMesh(makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.dark), 'rhamphorhynchus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'rhamphorhynchus-eye-glints'),
    teeth.toMesh(makeOrganicMaterial(RHAMPHORHYNCHUS_COLORS.belly), 'rhamphorhynchus-small-teeth'),
  );
  setShadowFlags(group);
  return group;
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rhamphorhynchus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-1.08, 0.66, 0),
    V(-0.96, 0.665, 0),
    V(-0.84, 0.67, 0),
    V(-0.72, 0.675, 0),
    V(-0.6, 0.68, 0),
    V(-0.48, 0.685, 0),
    V(-0.36, 0.69, 0),
    V(-0.24, 0.7, 0),
    V(-0.11, 0.715, 0),
    V(0.02, 0.73, 0),
    V(0.15, 0.745, 0),
    V(0.27, 0.755, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    const tailScale = index < 7 ? 0.018 + index * 0.0015 : 0.032;
    ellipsoid(bone, point, V(tailScale, tailScale * 0.9, tailScale), 6, 5);
    if (next) bone.addBetween(point, next, tailScale * 0.48, tailScale * 0.44, 6);
  });

  for (const point of spine.slice(7, 11)) {
    for (const side of SIDES) {
      const ribOuter = V(point.x, point.y - 0.11, side * 0.14);
      bone.addBetween(point, ribOuter, 0.011, 0.008, 5);
      bone.addBetween(ribOuter, V(point.x + 0.018, point.y - 0.18, side * 0.055), 0.008, 0.004, 5);
    }
  }

  WINGS.forEach((wing) => addSkeletonWing(bone, wing));
  SIDES.forEach((side) => addSkeletonLeg(bone, side));
  shade.add(silhouetteGeometry(KEEL, 0.035), V(0, 0, 0));

  ellipsoid(bone, V(0.35, 0.76, 0), V(0.13, 0.115, 0.11), 9, 6);
  bone.add(
    loftGeometry(
      [
        { center: V(0.38, 0.75, 0), radiusY: 0.075, radiusZ: 0.095 },
        { center: V(0.58, 0.71, 0), radiusY: 0.045, radiusZ: 0.067 },
        { center: V(0.77, 0.68, 0), radiusY: 0.013, radiusZ: 0.035 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  addTeeth(bone);
  for (const side of SIDES) {
    ellipsoid(dark, V(0.39, 0.79, side * 0.104), V(0.052, 0.05, 0.009), 7, 5);
    ellipsoid(dark, V(0.64, 0.72, side * 0.057), V(0.017, 0.011, 0.005), 6, 4);
  }

  group.add(
    bone.toMesh(makeFlatMaterial(RHAMPHORHYNCHUS_COLORS.bone), 'rhamphorhynchus-skeleton-bones'),
    shade.toMesh(
      makeFlatMaterial(RHAMPHORHYNCHUS_COLORS.boneShade),
      'rhamphorhynchus-sternum-keel',
    ),
    dark.toMesh(makeFlatMaterial(RHAMPHORHYNCHUS_COLORS.dark), 'rhamphorhynchus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildRhamphorhynchus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
