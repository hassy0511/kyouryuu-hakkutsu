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

export const TRICERATOPS_COLORS = {
  body: '#7FA05A',
  bodyDark: '#607B45',
  belly: '#E9E2BC',
  frillMark: '#D9A441',
  horn: '#F2EAD8',
  iris: '#A96F2C',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const LEGS = [
  {
    near: true,
    upper: V(1.05, 1.75, 0.62),
    knee: V(1.25, 0.9, 0.7),
    ankle: V(1.12, 0.26, 0.72),
    foot: V(1.43, 0.12, 0.74),
  },
  {
    near: false,
    upper: V(0.8, 1.72, -0.55),
    knee: V(0.58, 0.86, -0.62),
    ankle: V(0.68, 0.24, -0.64),
    foot: V(1.02, 0.11, -0.65),
  },
  {
    near: true,
    upper: V(-1.18, 1.7, 0.62),
    knee: V(-1.3, 0.9, 0.7),
    ankle: V(-1.12, 0.25, 0.72),
    foot: V(-0.78, 0.12, 0.74),
  },
  {
    near: false,
    upper: V(-1.42, 1.68, -0.55),
    knee: V(-1.15, 0.86, -0.62),
    ankle: V(-1.25, 0.24, -0.64),
    foot: V(-0.92, 0.11, -0.65),
  },
] as const;

const FRILL_OUTER = [
  new THREE.Vector2(1.05, 1.35),
  new THREE.Vector2(1.08, 2.1),
  new THREE.Vector2(1.32, 2.58),
  new THREE.Vector2(1.68, 2.84),
  new THREE.Vector2(2.05, 2.76),
  new THREE.Vector2(2.28, 2.38),
  new THREE.Vector2(2.25, 1.52),
  new THREE.Vector2(1.78, 1.2),
] as const;

const FRILL_INNER = [
  new THREE.Vector2(1.26, 1.43),
  new THREE.Vector2(1.27, 2.06),
  new THREE.Vector2(1.48, 2.42),
  new THREE.Vector2(1.72, 2.61),
  new THREE.Vector2(1.92, 2.55),
  new THREE.Vector2(2.08, 2.28),
  new THREE.Vector2(2.06, 1.59),
  new THREE.Vector2(1.76, 1.39),
] as const;

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  body.addBetween(leg.upper, leg.knee, 0.43, 0.34, 9);
  body.addBetween(leg.knee, leg.ankle, 0.32, 0.22, 9);
  ellipsoid(body, leg.upper, V(0.52, 0.47, 0.48), 10, 7);
  ellipsoid(body, leg.knee, V(0.36, 0.31, 0.34), 9, 6);
  body.addBetween(leg.ankle, leg.foot, 0.21, 0.17, 8);
  ellipsoid(body, leg.foot, V(0.48, 0.18, 0.34), 9, 6);

  for (const zOffset of [-0.17, 0, 0.17]) {
    const toeBase = V(leg.foot.x + 0.22, 0.12, leg.foot.z + zOffset * 0.5);
    const toeTip = V(leg.foot.x + 0.55, 0.09, leg.foot.z + zOffset);
    body.addBetween(toeBase, toeTip, 0.07, 0.035, 6);
    coneBetween(claws, toeTip, V(toeTip.x + 0.1, 0.075, toeTip.z), 0.035, 6);
  }
}

function addFaceDetails(
  group: THREE.Group,
  body: GeometryBatch,
  cream: GeometryBatch,
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
): void {
  body.add(
    loftGeometry(
      [
        { center: V(1.7, 1.82, 0), radiusY: 0.6, radiusZ: 0.72 },
        { center: V(2.15, 1.82, 0), radiusY: 0.58, radiusZ: 0.64 },
        { center: V(2.62, 1.75, 0), radiusY: 0.48, radiusZ: 0.52 },
        { center: V(3.03, 1.63, 0), radiusY: 0.35, radiusZ: 0.38 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  ellipsoid(cream, V(3.18, 1.58, 0), V(0.34, 0.29, 0.34), 9, 6);
  coneBetween(cream, V(3.02, 1.82, 0), V(3.31, 2.35, 0), 0.15, 8);

  for (const side of [-1, 1]) {
    coneBetween(cream, V(2.27, 2.14, side * 0.43), V(3.43, 2.55, side * 0.45), 0.18, 9);
    const eyeSurface = 0.52;
    ellipsoid(
      dark,
      V(2.4, 2.04, embeddedSideZ(side, eyeSurface, 0.055)),
      V(0.18, 0.15, 0.055),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(2.43, 2.05, embeddedSideZ(side, eyeSurface + 0.014, 0.026)),
      V(0.105, 0.105, 0.026),
      8,
      5,
    );
    ellipsoid(
      dark,
      V(2.45, 2.05, embeddedSideZ(side, eyeSurface + 0.022, 0.012)),
      V(0.043, 0.066, 0.012),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(2.41, 2.1, embeddedSideZ(side, eyeSurface + 0.028, 0.008)),
      V(0.025, 0.028, 0.008),
      5,
      4,
    );
    const mouth = [
      V(2.88, 1.46, embeddedSideZ(side, 0.27, 0.016)),
      V(3.12, 1.43, embeddedSideZ(side, 0.18, 0.013)),
      V(3.38, 1.46, embeddedSideZ(side, 0.06, 0.007)),
    ];
    dark.addBetween(mouth[0]!, mouth[1]!, 0.016, 0.013, 6);
    dark.addBetween(mouth[1]!, mouth[2]!, 0.013, 0.007, 6);
  }

  group.add(
    cream.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.horn), 'triceratops-horns-beak-claws'),
    iris.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.iris), 'triceratops-irises'),
    dark.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.dark), 'triceratops-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'triceratops-eye-glints'),
  );
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'triceratops-living';

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
        { center: V(-3.75, 1.45, 0), radiusY: 0.08, radiusZ: 0.08 },
        { center: V(-3.3, 1.48, 0), radiusY: 0.2, radiusZ: 0.23 },
        { center: V(-2.75, 1.52, 0), radiusY: 0.38, radiusZ: 0.42 },
        { center: V(-2.15, 1.58, 0), radiusY: 0.68, radiusZ: 0.7 },
        { center: V(-1.45, 1.68, 0), radiusY: 0.9, radiusZ: 0.88 },
        { center: V(-0.7, 1.74, 0), radiusY: 1.02, radiusZ: 0.98 },
        { center: V(0.08, 1.74, 0), radiusY: 1.04, radiusZ: 1 },
        { center: V(0.78, 1.72, 0), radiusY: 0.9, radiusZ: 0.9 },
        { center: V(1.32, 1.72, 0), radiusY: 0.68, radiusZ: 0.76 },
        { center: V(1.72, 1.78, 0), radiusY: 0.56, radiusZ: 0.7 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-2.0, 1.07, 0), radiusY: 0.08, radiusZ: 0.5 },
        { center: V(-1.3, 0.96, 0), radiusY: 0.13, radiusZ: 0.7 },
        { center: V(-0.45, 0.88, 0), radiusY: 0.18, radiusZ: 0.8 },
        { center: V(0.4, 0.91, 0), radiusY: 0.17, radiusZ: 0.76 },
        { center: V(1.05, 1.08, 0), radiusY: 0.1, radiusZ: 0.58 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  for (const leg of LEGS) addLivingLeg(leg.near ? body : farBody, cream, leg);

  const outerFrill = new THREE.Mesh(
    silhouetteGeometry(FRILL_OUTER, 0.74),
    makeOrganicMaterial(TRICERATOPS_COLORS.frillMark),
  );
  outerFrill.name = 'triceratops-frill-rim';
  const innerFrill = new THREE.Mesh(
    silhouetteGeometry(FRILL_INNER, 0.77),
    makeOrganicMaterial(TRICERATOPS_COLORS.body),
  );
  innerFrill.name = 'triceratops-frill';
  group.add(outerFrill, innerFrill);

  addFaceDetails(group, body, cream, dark, iris, glint);
  group.add(
    farBody.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.bodyDark), 'triceratops-far-legs'),
    body.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.body), 'triceratops-body'),
    belly.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.belly), 'triceratops-belly'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  bone.addBetween(leg.upper, leg.knee, 0.1, 0.075, 7);
  bone.addBetween(leg.knee, leg.ankle, 0.085, 0.06, 7);
  bone.addBetween(leg.ankle, leg.foot, 0.065, 0.045, 6);
  for (const [point, radius] of [
    [leg.upper, 0.17],
    [leg.knee, 0.13],
    [leg.ankle, 0.09],
  ] as const) {
    ellipsoid(bone, point, V(radius, radius, radius), 7, 5);
  }
  for (const zOffset of [-0.14, 0, 0.14]) {
    const toeStart = V(leg.foot.x, 0.13, leg.foot.z + zOffset * 0.4);
    bone.addBetween(toeStart, V(leg.foot.x + 0.48, 0.09, leg.foot.z + zOffset), 0.04, 0.025, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'triceratops-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-3.7, 1.48, 0),
    V(-3.15, 1.52, 0),
    V(-2.55, 1.61, 0),
    V(-1.92, 1.82, 0),
    V(-1.25, 2.08, 0),
    V(-0.55, 2.22, 0),
    V(0.15, 2.24, 0),
    V(0.82, 2.18, 0),
    V(1.42, 2.02, 0),
    V(1.8, 1.88, 0),
  ] as const;
  for (let index = 0; index < spine.length - 1; index += 1) {
    const start = spine[index];
    const end = spine[index + 1];
    if (!start || !end) continue;
    bone.addBetween(start, end, 0.075, 0.06, 7);
    ellipsoid(bone, start, V(0.12, 0.11, 0.12), 7, 5);
  }

  for (const x of [-1.65, -1.1, -0.55, 0, 0.55, 1.05]) {
    for (const side of [-1, 1]) {
      const top = V(x, 2.18 - Math.abs(x) * 0.05, 0);
      const sidePoint = V(x, 1.42, side * (0.72 - Math.abs(x) * 0.06));
      const sternum = V(x, 1.18, side * 0.16);
      bone.addBetween(top, sidePoint, 0.045, 0.035, 6);
      bone.addBetween(sidePoint, sternum, 0.035, 0.028, 6);
    }
  }

  for (const side of [-1, 1]) {
    const frontLeg = side > 0 ? LEGS[0] : LEGS[1];
    const hindLeg = side > 0 ? LEGS[2] : LEGS[3];

    shade.addBetween(V(-1.72, 2.04, side * 0.17), V(-0.55, 2.16, side * 0.54), 0.1, 0.06, 6);
    bone.addBetween(V(-1.25, 2.08, side * 0.07), hindLeg.upper, 0.07, 0.05, 6);
    bone.addBetween(hindLeg.upper, V(-0.78, 1.28, side * 0.42), 0.06, 0.034, 6);
    bone.addBetween(hindLeg.upper, V(-1.62, 1.35, side * 0.4), 0.055, 0.03, 6);

    const scapula = V(0.72, 1.98, side * 0.5);
    const chest = V(0.98, 1.28, side * 0.16);
    bone.addBetween(V(1.38, 2.03, side * 0.07), scapula, 0.06, 0.045, 6);
    bone.addBetween(scapula, frontLeg.upper, 0.055, 0.043, 6);
    bone.addBetween(frontLeg.upper, chest, 0.05, 0.034, 6);
    bone.addBetween(chest, V(0.98, 1.24, 0), 0.034, 0.024, 5);
  }
  LEGS.forEach((leg) => addBoneLeg(bone, leg));

  const frill = new THREE.Mesh(
    silhouetteGeometry(FRILL_OUTER, 0.07),
    makeFlatMaterial(TRICERATOPS_COLORS.bone),
  );
  frill.name = 'triceratops-skeleton-frill';
  group.add(frill);

  ellipsoid(bone, V(2.28, 1.82, 0), V(0.86, 0.58, 0.58), 10, 7);
  bone.add(
    loftGeometry(
      [
        { center: V(2.25, 1.8, 0), radiusY: 0.45, radiusZ: 0.48 },
        { center: V(2.72, 1.7, 0), radiusY: 0.38, radiusZ: 0.4 },
        { center: V(3.15, 1.58, 0), radiusY: 0.25, radiusZ: 0.28 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  coneBetween(bone, V(3.02, 1.82, 0), V(3.31, 2.35, 0), 0.12, 8);
  for (const side of [-1, 1]) {
    coneBetween(bone, V(2.27, 2.14, side * 0.38), V(3.43, 2.55, side * 0.42), 0.14, 8);
    ellipsoid(dark, V(2.42, 1.98, side * 0.49), V(0.22, 0.18, 0.05), 8, 5);
    ellipsoid(dark, V(2.76, 1.62, side * 0.38), V(0.38, 0.11, 0.035), 8, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(TRICERATOPS_COLORS.boneShade), 'triceratops-skeleton-girdles'),
    bone.toMesh(makeFlatMaterial(TRICERATOPS_COLORS.bone), 'triceratops-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(TRICERATOPS_COLORS.dark), 'triceratops-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildTriceratops(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
