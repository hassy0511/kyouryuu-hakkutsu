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

export const DIMETRODON_COLORS = {
  body: '#8A6E52',
  bodyShade: '#6F5843',
  sail: '#C0563E',
  sailStripe: '#8A3E2E',
  belly: '#EFE0C0',
  iris: '#C6923E',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const SPINE = [
  V(-3.5, 0.9, 0),
  V(-2.95, 0.94, 0),
  V(-2.4, 1, 0),
  V(-1.85, 1.07, 0),
  V(-1.3, 1.14, 0),
  V(-0.75, 1.2, 0),
  V(-0.2, 1.23, 0),
  V(0.34, 1.2, 0),
  V(0.78, 1.16, 0),
] as const;

const LIMBS = [
  {
    root: V(0.48, 0.98, 0.52),
    elbow: V(0.78, 0.53, 0.96),
    wrist: V(1.18, 0.16, 1.04),
    foot: V(1.6, 0.08, 1.05),
  },
  {
    root: V(0.38, 0.95, -0.48),
    elbow: V(0.67, 0.5, -0.88),
    wrist: V(1.05, 0.15, -0.97),
    foot: V(1.45, 0.07, -0.98),
  },
  {
    root: V(-1.28, 0.94, 0.58),
    elbow: V(-1.62, 0.49, 1.03),
    wrist: V(-1.24, 0.14, 1.12),
    foot: V(-0.78, 0.07, 1.13),
  },
  {
    root: V(-1.43, 0.92, -0.52),
    elbow: V(-1.75, 0.47, -0.95),
    wrist: V(-1.38, 0.13, -1.04),
    foot: V(-0.94, 0.065, -1.05),
  },
] as const;

const SAIL_POINTS = [
  new THREE.Vector2(-2.0, 1.16),
  new THREE.Vector2(-1.72, 2.26),
  new THREE.Vector2(-1.28, 3.08),
  new THREE.Vector2(-0.78, 3.34),
  new THREE.Vector2(-0.24, 3.16),
  new THREE.Vector2(0.24, 2.5),
  new THREE.Vector2(0.58, 1.28),
] as const;

function addLivingLimb(
  body: GeometryBatch,
  claws: GeometryBatch,
  limb: (typeof LIMBS)[number],
): void {
  body.addBetween(limb.root, limb.elbow, 0.24, 0.16, 8);
  body.addBetween(limb.elbow, limb.wrist, 0.16, 0.095, 7);
  body.addBetween(limb.wrist, limb.foot, 0.095, 0.06, 7);
  ellipsoid(body, limb.root, V(0.3, 0.27, 0.27), 8, 6);
  ellipsoid(body, limb.elbow, V(0.19, 0.17, 0.17), 7, 5);
  ellipsoid(body, limb.foot, V(0.36, 0.1, 0.2), 8, 5);
  for (const offset of [-0.1, 0, 0.1]) {
    const toe = V(limb.foot.x + 0.3, 0.045, limb.foot.z + offset);
    body.addBetween(limb.foot, toe, 0.035, 0.012, 5);
    coneBetween(claws, toe, V(toe.x + 0.075, 0.035, toe.z), 0.018, 5);
  }
}

function makeSail(): THREE.Mesh {
  const sail = new GeometryBatch();
  sail.add(silhouetteGeometry(SAIL_POINTS, 0.18), V(0, 0, 0));
  return sail.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.sail), 'dimetrodon-large-sail');
}

function makeSailStripes(): THREE.Mesh {
  const stripes = new GeometryBatch();
  const bars = [
    { x: -1.62, bottom: 1.25, top: 2.34 },
    { x: -1.18, bottom: 1.28, top: 2.99 },
    { x: -0.7, bottom: 1.3, top: 3.2 },
    { x: -0.22, bottom: 1.3, top: 3.03 },
    { x: 0.2, bottom: 1.28, top: 2.38 },
  ] as const;
  for (const side of SIDES) {
    for (const bar of bars) {
      stripes.add(
        silhouetteGeometry(
          [
            new THREE.Vector2(bar.x - 0.045, bar.bottom),
            new THREE.Vector2(bar.x + 0.045, bar.bottom),
            new THREE.Vector2(bar.x + 0.065, bar.top),
            new THREE.Vector2(bar.x - 0.065, bar.top),
          ],
          0.03,
        ),
        V(0, 0, embeddedSideZ(side, 0.18, 0.03, 0.15)),
      );
    }
  }
  return stripes.toMesh(
    makeOrganicMaterial(DIMETRODON_COLORS.sailStripe),
    'dimetrodon-sail-stripes',
  );
}

function addLivingFace(
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
  teeth: GeometryBatch,
): void {
  for (const side of SIDES) {
    const surface = 0.42;
    ellipsoid(dark, V(1.38, 1.45, embeddedSideZ(side, surface, 0.052)), V(0.18, 0.16, 0.052), 8, 5);
    ellipsoid(
      iris,
      V(1.41, 1.45, embeddedSideZ(side, surface + 0.012, 0.025)),
      V(0.105, 0.105, 0.025),
      8,
      5,
    );
    ellipsoid(
      dark,
      V(1.43, 1.45, embeddedSideZ(side, surface + 0.019, 0.011)),
      V(0.038, 0.067, 0.011),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.38, 1.5, embeddedSideZ(side, surface + 0.023, 0.006)),
      V(0.024, 0.027, 0.006),
      5,
      4,
    );
    ellipsoid(dark, V(2.35, 1.28, embeddedSideZ(side, 0.23, 0.014)), V(0.055, 0.032, 0.014), 6, 4);
    dark.addBetween(
      V(1.35, 0.96, embeddedSideZ(side, 0.37, 0.016, 0.08)),
      V(2.66, 0.94, embeddedSideZ(side, 0.14, 0.007, 0.08)),
      0.016,
      0.007,
      6,
    );
    for (let index = 0; index < 5; index += 1) {
      const x = 1.56 + index * 0.21;
      const z = embeddedSideZ(side, 0.35 - index * 0.045, 0.018, 0.08);
      coneBetween(teeth, V(x, 0.97, z), V(x + 0.01, 0.87, z), 0.02, 5);
    }
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dimetrodon-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const claws = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-3.72, 0.86, 0), radiusY: 0.035, radiusZ: 0.045 },
        { center: V(-3.2, 0.92, 0), radiusY: 0.1, radiusZ: 0.13 },
        { center: V(-2.62, 0.99, 0), radiusY: 0.23, radiusZ: 0.28 },
        { center: V(-2.02, 1.07, 0), radiusY: 0.39, radiusZ: 0.46 },
        { center: V(-1.4, 1.14, 0), radiusY: 0.52, radiusZ: 0.59 },
        { center: V(-0.78, 1.2, 0), radiusY: 0.57, radiusZ: 0.64 },
        { center: V(-0.16, 1.22, 0), radiusY: 0.55, radiusZ: 0.61 },
        { center: V(0.42, 1.18, 0), radiusY: 0.46, radiusZ: 0.54 },
        { center: V(0.86, 1.16, 0), radiusY: 0.36, radiusZ: 0.45 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.68, 1.16, 0), radiusY: 0.35, radiusZ: 0.43 },
        { center: V(1.08, 1.24, 0), radiusY: 0.43, radiusZ: 0.48 },
        { center: V(1.5, 1.27, 0), radiusY: 0.47, radiusZ: 0.46 },
        { center: V(1.94, 1.22, 0), radiusY: 0.42, radiusZ: 0.39 },
        { center: V(2.35, 1.15, 0), radiusY: 0.32, radiusZ: 0.31 },
        { center: V(2.7, 1.1, 0), radiusY: 0.2, radiusZ: 0.21 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-2.1, 0.77, 0), radiusY: 0.04, radiusZ: 0.3 },
        { center: V(-1.45, 0.63, 0), radiusY: 0.09, radiusZ: 0.45 },
        { center: V(-0.75, 0.6, 0), radiusY: 0.11, radiusZ: 0.5 },
        { center: V(-0.05, 0.64, 0), radiusY: 0.1, radiusZ: 0.46 },
        { center: V(0.62, 0.83, 0), radiusY: 0.07, radiusZ: 0.37 },
        { center: V(1.35, 0.91, 0), radiusY: 0.05, radiusZ: 0.31 },
        { center: V(2.38, 0.9, 0), radiusY: 0.035, radiusZ: 0.2 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  LIMBS.forEach((limb, index) => addLivingLimb(index % 2 === 0 ? body : farBody, claws, limb));
  addLivingFace(dark, iris, glint, claws);

  group.add(
    farBody.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.bodyShade), 'dimetrodon-far-limbs'),
    body.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.body), 'dimetrodon-body'),
    belly.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.belly), 'dimetrodon-belly'),
    makeSail(),
    makeSailStripes(),
    claws.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.bone), 'dimetrodon-claws-teeth'),
    iris.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.iris), 'dimetrodon-irises'),
    dark.toMesh(makeOrganicMaterial(DIMETRODON_COLORS.dark), 'dimetrodon-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'dimetrodon-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addSkeletonLimb(bone: GeometryBatch, limb: (typeof LIMBS)[number]): void {
  bone.addBetween(limb.root, limb.elbow, 0.052, 0.037, 6);
  bone.addBetween(limb.elbow, limb.wrist, 0.037, 0.025, 5);
  bone.addBetween(limb.wrist, limb.foot, 0.025, 0.017, 5);
  addJoint(bone, limb.root, 0.075);
  addJoint(bone, limb.elbow, 0.055);
  addJoint(bone, limb.wrist, 0.038);
  for (const offset of [-0.08, 0, 0.08]) {
    bone.addBetween(limb.foot, V(limb.foot.x + 0.32, 0.04, limb.foot.z + offset), 0.016, 0.005, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dimetrodon-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.07, 0.05, index / (SPINE.length - 1));
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.44, radius * 0.35, 5);
  });
  for (const x of [-1.92, -1.52, -1.12, -0.72, -0.32, 0.08, 0.46]) {
    for (const side of SIDES) {
      const top = V(x, 1.14 + (x + 1.9) * 0.02, 0);
      const outer = V(x, 0.83, side * 0.53);
      const lower = V(x + 0.03, 0.64, side * 0.22);
      bone.addBetween(top, outer, 0.024, 0.017, 5);
      bone.addBetween(outer, lower, 0.017, 0.01, 5);
    }
  }
  const sailSpines = [
    { x: -1.75, y: 2.32 },
    { x: -1.35, y: 2.98 },
    { x: -0.92, y: 3.3 },
    { x: -0.49, y: 3.32 },
    { x: -0.06, y: 3.05 },
    { x: 0.32, y: 2.4 },
  ] as const;
  sailSpines.forEach((spine) => {
    bone.addBetween(V(spine.x, 1.18, 0), V(spine.x, spine.y, 0), 0.025, 0.011, 5);
  });
  for (const side of SIDES) {
    shade.addBetween(V(-1.56, 1.04, side * 0.1), V(-0.92, 0.96, side * 0.46), 0.052, 0.03, 5);
    shade.addBetween(V(0.08, 1.08, side * 0.09), V(0.52, 0.98, side * 0.42), 0.048, 0.028, 5);
  }
  LIMBS.forEach((limb) => addSkeletonLimb(bone, limb));

  bone.add(
    loftGeometry(
      [
        { center: V(0.76, 1.17, 0), radiusY: 0.28, radiusZ: 0.38 },
        { center: V(1.18, 1.28, 0), radiusY: 0.39, radiusZ: 0.42 },
        { center: V(1.62, 1.27, 0), radiusY: 0.4, radiusZ: 0.4 },
        { center: V(2.06, 1.2, 0), radiusY: 0.34, radiusZ: 0.33 },
        { center: V(2.46, 1.14, 0), radiusY: 0.24, radiusZ: 0.24 },
        { center: V(2.7, 1.1, 0), radiusY: 0.12, radiusZ: 0.14 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(1.1, 0.95, 0), V(2.68, 0.89, 0), 0.042, 0.018, 5);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.38, 1.45, side * 0.38), V(0.2, 0.17, 0.048), 7, 5);
    ellipsoid(dark, V(2.04, 1.28, side * 0.29), V(0.2, 0.1, 0.032), 7, 5);
    for (let index = 0; index < 5; index += 1) {
      const x = 1.52 + index * 0.22;
      coneBetween(
        bone,
        V(x, 0.96, side * (0.34 - index * 0.04)),
        V(x, 0.86, side * (0.34 - index * 0.04)),
        0.018,
        5,
      );
    }
  }

  group.add(
    shade.toMesh(makeFlatMaterial(DIMETRODON_COLORS.boneShade), 'dimetrodon-girdles'),
    bone.toMesh(makeFlatMaterial(DIMETRODON_COLORS.bone), 'dimetrodon-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(DIMETRODON_COLORS.dark), 'dimetrodon-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildDimetrodon(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
