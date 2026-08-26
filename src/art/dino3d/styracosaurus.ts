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

export const STYRACOSAURUS_COLORS = {
  body: '#8A9B5E',
  bodyShade: '#6F7E4B',
  frill: '#C0563E',
  belly: '#EBDFBB',
  horn: '#F2EAD8',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const LEGS = [
  {
    near: true,
    upper: V(0.62, 1.36, 0.5),
    knee: V(0.78, 0.7, 0.56),
    ankle: V(0.68, 0.23, 0.58),
    foot: V(0.96, 0.11, 0.6),
  },
  {
    near: false,
    upper: V(0.4, 1.33, -0.44),
    knee: V(0.22, 0.67, -0.5),
    ankle: V(0.32, 0.22, -0.52),
    foot: V(0.6, 0.1, -0.54),
  },
  {
    near: true,
    upper: V(-1.05, 1.32, 0.5),
    knee: V(-1.16, 0.69, 0.56),
    ankle: V(-1.02, 0.22, 0.58),
    foot: V(-0.72, 0.11, 0.6),
  },
  {
    near: false,
    upper: V(-1.25, 1.3, -0.44),
    knee: V(-1.03, 0.66, -0.5),
    ankle: V(-1.13, 0.21, -0.52),
    foot: V(-0.84, 0.1, -0.54),
  },
] as const;

const FRILL = [
  new THREE.Vector2(0.72, 1.12),
  new THREE.Vector2(0.7, 1.7),
  new THREE.Vector2(0.86, 2.08),
  new THREE.Vector2(1.12, 2.34),
  new THREE.Vector2(1.47, 2.45),
  new THREE.Vector2(1.78, 2.34),
  new THREE.Vector2(1.96, 2.02),
  new THREE.Vector2(1.93, 1.32),
  new THREE.Vector2(1.47, 1.02),
] as const;

const FRILL_SPIKES = [
  { base: V(0.76, 1.43, 0), tip: V(0.05, 1.45, 0) },
  { base: V(0.73, 1.73, 0), tip: V(0.03, 1.86, 0) },
  { base: V(0.87, 2.06, 0), tip: V(0.24, 2.38, 0) },
  { base: V(1.08, 2.3, 0), tip: V(0.55, 2.82, 0) },
  { base: V(1.36, 2.43, 0), tip: V(1, 3.05, 0) },
  { base: V(1.66, 2.38, 0), tip: V(1.55, 3.1, 0) },
] as const;

function addFrillSpikes(batch: GeometryBatch, halfDepth: number): void {
  FRILL_SPIKES.forEach((spike, index) => {
    const z = (index % 2 === 0 ? -1 : 1) * halfDepth;
    coneBetween(
      batch,
      V(spike.base.x, spike.base.y, z),
      V(spike.tip.x, spike.tip.y, z * 1.06),
      0.095,
      7,
    );
  });
}

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  body.addBetween(leg.upper, leg.knee, 0.34, 0.27, 9);
  body.addBetween(leg.knee, leg.ankle, 0.26, 0.18, 8);
  ellipsoid(body, leg.upper, V(0.42, 0.38, 0.39), 9, 6);
  ellipsoid(body, leg.knee, V(0.29, 0.25, 0.27), 8, 5);
  body.addBetween(leg.ankle, leg.foot, 0.17, 0.13, 7);
  ellipsoid(body, leg.foot, V(0.39, 0.15, 0.28), 8, 5);
  for (const zOffset of [-0.14, 0, 0.14]) {
    const toe = V(leg.foot.x + 0.42, 0.08, leg.foot.z + zOffset);
    body.addBetween(leg.foot, toe, 0.058, 0.026, 6);
    coneBetween(claws, toe, V(toe.x + 0.08, 0.07, toe.z), 0.027, 6);
  }
}

function addLivingHead(
  body: GeometryBatch,
  cream: GeometryBatch,
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
): void {
  body.add(
    loftGeometry(
      [
        { center: V(1.48, 1.5, 0), radiusY: 0.5, radiusZ: 0.58 },
        { center: V(1.84, 1.49, 0), radiusY: 0.48, radiusZ: 0.54 },
        { center: V(2.2, 1.43, 0), radiusY: 0.4, radiusZ: 0.45 },
        { center: V(2.53, 1.33, 0), radiusY: 0.29, radiusZ: 0.34 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  ellipsoid(cream, V(2.66, 1.28, 0), V(0.27, 0.23, 0.28), 8, 6);
  coneBetween(cream, V(2.48, 1.51, 0), V(2.92, 2.06, 0), 0.13, 8);
  for (const side of SIDES) {
    const eyeSurface = 0.44;
    ellipsoid(
      dark,
      V(2.05, 1.68, embeddedSideZ(side, eyeSurface, 0.045)),
      V(0.145, 0.12, 0.045),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(2.07, 1.685, embeddedSideZ(side, eyeSurface + 0.011, 0.021)),
      V(0.083, 0.083, 0.021),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(2.085, 1.685, embeddedSideZ(side, eyeSurface + 0.017, 0.01)),
      V(0.033, 0.052, 0.01),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(2.05, 1.725, embeddedSideZ(side, eyeSurface + 0.021, 0.006)),
      V(0.02, 0.022, 0.006),
      5,
      4,
    );
    ellipsoid(dark, V(2.48, 1.47, embeddedSideZ(side, 0.31, 0.013)), V(0.05, 0.031, 0.013), 6, 4);
    dark.addBetween(
      V(2.39, 1.18, embeddedSideZ(side, 0.3, 0.012, 0.08)),
      V(2.79, 1.18, embeddedSideZ(side, 0.12, 0.006, 0.08)),
      0.012,
      0.006,
      5,
    );
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'styracosaurus-living';
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
        { center: V(-3.05, 1.12, 0), radiusY: 0.06, radiusZ: 0.07 },
        { center: V(-2.65, 1.14, 0), radiusY: 0.16, radiusZ: 0.19 },
        { center: V(-2.18, 1.18, 0), radiusY: 0.31, radiusZ: 0.36 },
        { center: V(-1.68, 1.24, 0), radiusY: 0.54, radiusZ: 0.58 },
        { center: V(-1.08, 1.32, 0), radiusY: 0.72, radiusZ: 0.72 },
        { center: V(-0.46, 1.37, 0), radiusY: 0.81, radiusZ: 0.79 },
        { center: V(0.18, 1.37, 0), radiusY: 0.82, radiusZ: 0.8 },
        { center: V(0.77, 1.34, 0), radiusY: 0.71, radiusZ: 0.72 },
        { center: V(1.2, 1.37, 0), radiusY: 0.57, radiusZ: 0.62 },
        { center: V(1.52, 1.47, 0), radiusY: 0.46, radiusZ: 0.56 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-1.62, 0.83, 0), radiusY: 0.06, radiusZ: 0.4 },
        { center: V(-1.0, 0.74, 0), radiusY: 0.1, radiusZ: 0.57 },
        { center: V(-0.28, 0.68, 0), radiusY: 0.14, radiusZ: 0.65 },
        { center: V(0.42, 0.72, 0), radiusY: 0.13, radiusZ: 0.62 },
        { center: V(0.98, 0.86, 0), radiusY: 0.08, radiusZ: 0.47 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  LEGS.forEach((leg) => addLivingLeg(leg.near ? body : farBody, cream, leg));

  const frill = new THREE.Mesh(
    silhouetteGeometry(FRILL, 0.59),
    makeOrganicMaterial(STYRACOSAURUS_COLORS.frill),
  );
  frill.name = 'styracosaurus-red-frill';
  group.add(frill);
  addFrillSpikes(cream, 0.6);
  addLivingHead(body, cream, dark, iris, glint);
  group.add(
    farBody.toMesh(makeOrganicMaterial(STYRACOSAURUS_COLORS.bodyShade), 'styracosaurus-far-legs'),
    body.toMesh(makeOrganicMaterial(STYRACOSAURUS_COLORS.body), 'styracosaurus-body'),
    belly.toMesh(makeOrganicMaterial(STYRACOSAURUS_COLORS.belly), 'styracosaurus-belly'),
    cream.toMesh(makeOrganicMaterial(STYRACOSAURUS_COLORS.horn), 'styracosaurus-horns-beak-claws'),
    iris.toMesh(makeOrganicMaterial(STYRACOSAURUS_COLORS.iris), 'styracosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(STYRACOSAURUS_COLORS.dark), 'styracosaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'styracosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  bone.addBetween(leg.upper, leg.knee, 0.082, 0.061, 6);
  bone.addBetween(leg.knee, leg.ankle, 0.068, 0.048, 6);
  bone.addBetween(leg.ankle, leg.foot, 0.052, 0.036, 6);
  for (const [point, radius] of [
    [leg.upper, 0.14],
    [leg.knee, 0.105],
    [leg.ankle, 0.074],
  ] as const) {
    ellipsoid(bone, point, V(radius, radius, radius), 7, 5);
  }
  for (const zOffset of [-0.12, 0, 0.12]) {
    bone.addBetween(leg.foot, V(leg.foot.x + 0.41, 0.07, leg.foot.z + zOffset), 0.032, 0.018, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'styracosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-3.0, 1.13, 0),
    V(-2.55, 1.16, 0),
    V(-2.05, 1.23, 0),
    V(-1.52, 1.4, 0),
    V(-0.96, 1.61, 0),
    V(-0.38, 1.72, 0),
    V(0.2, 1.73, 0),
    V(0.75, 1.68, 0),
    V(1.23, 1.56, 0),
    V(1.54, 1.48, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    ellipsoid(bone, point, V(0.095, 0.087, 0.095), 7, 5);
    if (next) bone.addBetween(point, next, 0.058, 0.047, 6);
  });
  for (const x of [-1.35, -0.9, -0.45, 0, 0.45, 0.85]) {
    for (const side of SIDES) {
      const top = V(x, 1.7 - Math.abs(x) * 0.04, 0);
      const outer = V(x, 1.12, side * (0.58 - Math.abs(x) * 0.05));
      const lower = V(x, 0.92, side * 0.13);
      bone.addBetween(top, outer, 0.036, 0.028, 6);
      bone.addBetween(outer, lower, 0.028, 0.021, 6);
    }
  }
  for (const side of SIDES) {
    const frontLeg = side > 0 ? LEGS[0] : LEGS[1];
    const hindLeg = side > 0 ? LEGS[2] : LEGS[3];
    shade.addBetween(V(-1.42, 1.56, side * 0.14), V(-0.48, 1.66, side * 0.44), 0.082, 0.048, 6);
    bone.addBetween(V(-1.04, 1.61, side * 0.06), hindLeg.upper, 0.056, 0.04, 6);
    bone.addBetween(hindLeg.upper, V(-0.66, 1.0, side * 0.34), 0.047, 0.027, 6);
    const scapula = V(0.55, 1.52, side * 0.4);
    const chest = V(0.76, 1.0, side * 0.13);
    bone.addBetween(V(1.07, 1.57, side * 0.06), scapula, 0.047, 0.034, 6);
    bone.addBetween(scapula, frontLeg.upper, 0.043, 0.033, 6);
    bone.addBetween(frontLeg.upper, chest, 0.039, 0.027, 6);
    bone.addBetween(chest, V(0.76, 0.97, 0), 0.026, 0.018, 5);
  }
  LEGS.forEach((leg) => addBoneLeg(bone, leg));

  const frill = new THREE.Mesh(
    silhouetteGeometry(FRILL, 0.06),
    makeFlatMaterial(STYRACOSAURUS_COLORS.bone),
  );
  frill.name = 'styracosaurus-skeleton-frill';
  group.add(frill);
  addFrillSpikes(bone, 0.07);
  bone.add(
    loftGeometry(
      [
        { center: V(1.45, 1.5, 0), radiusY: 0.4, radiusZ: 0.46 },
        { center: V(1.82, 1.49, 0), radiusY: 0.39, radiusZ: 0.44 },
        { center: V(2.2, 1.42, 0), radiusY: 0.33, radiusZ: 0.37 },
        { center: V(2.55, 1.32, 0), radiusY: 0.22, radiusZ: 0.27 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  coneBetween(bone, V(2.47, 1.5, 0), V(2.91, 2.05, 0), 0.105, 8);
  ellipsoid(bone, V(2.66, 1.27, 0), V(0.26, 0.21, 0.27), 8, 6);
  for (const side of SIDES) {
    ellipsoid(dark, V(2.05, 1.65, side * 0.4), V(0.18, 0.15, 0.045), 7, 5);
    ellipsoid(dark, V(2.35, 1.39, side * 0.3), V(0.18, 0.085, 0.03), 7, 5);
  }
  group.add(
    shade.toMesh(makeFlatMaterial(STYRACOSAURUS_COLORS.boneShade), 'styracosaurus-girdles'),
    bone.toMesh(makeFlatMaterial(STYRACOSAURUS_COLORS.bone), 'styracosaurus-skeleton-bones-spikes'),
    dark.toMesh(makeFlatMaterial(STYRACOSAURUS_COLORS.dark), 'styracosaurus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildStyracosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
