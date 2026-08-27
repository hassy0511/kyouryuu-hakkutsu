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

export const SMILODON_COLORS = {
  body: '#C9A05A',
  bodyShade: '#A77C42',
  belly: '#EFE0C0',
  spot: '#7A5634',
  iris: '#A06A32',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const LEGS = [
  {
    near: true,
    front: false,
    hip: V(-0.78, 1.36, 0.48),
    knee: V(-0.42, 0.72, 0.5),
    ankle: V(-0.68, 0.25, 0.51),
    foot: V(-0.43, 0.12, 0.52),
  },
  {
    near: false,
    front: false,
    hip: V(-1.02, 1.33, -0.42),
    knee: V(-1.25, 0.7, -0.43),
    ankle: V(-1.05, 0.24, -0.44),
    foot: V(-0.8, 0.11, -0.45),
  },
  {
    near: true,
    front: true,
    hip: V(0.55, 1.51, 0.45),
    knee: V(0.62, 0.82, 0.47),
    ankle: V(0.6, 0.25, 0.48),
    foot: V(0.82, 0.12, 0.49),
  },
  {
    near: false,
    front: true,
    hip: V(0.28, 1.48, -0.39),
    knee: V(0.2, 0.8, -0.4),
    ankle: V(0.22, 0.24, -0.41),
    foot: V(0.43, 0.11, -0.42),
  },
] as const;

function addLivingLeg(batch: GeometryBatch, leg: (typeof LEGS)[number]): void {
  const upperRadius = leg.front ? 0.34 : 0.3;
  batch.addBetween(leg.hip, leg.knee, upperRadius, 0.23, 9);
  batch.addBetween(leg.knee, leg.ankle, 0.23, 0.14, 8);
  batch.addBetween(leg.ankle, leg.foot, 0.14, 0.1, 7);
  ellipsoid(batch, leg.hip, V(upperRadius * 1.25, upperRadius * 1.15, upperRadius), 8, 6);
  ellipsoid(batch, leg.knee, V(0.25, 0.22, 0.22), 8, 5);
  ellipsoid(batch, leg.foot, V(0.36, 0.14, 0.25), 8, 5);
  for (const zOffset of [-0.09, 0, 0.09]) {
    batch.addBetween(leg.foot, V(leg.foot.x + 0.28, 0.09, leg.foot.z + zOffset), 0.05, 0.018, 5);
  }
}

function makeSabres(skeleton: boolean): THREE.Mesh {
  const teeth = new GeometryBatch();
  for (const side of SIDES) {
    const z = embeddedSideZ(side, 0.31, 0.045, 0.65);
    coneBetween(teeth, V(1.4, 1.48, z), V(1.43, 0.88, z), 0.105, 8);
  }
  return teeth.toMesh(
    skeleton ? makeFlatMaterial(SMILODON_COLORS.bone) : makeOrganicMaterial(SMILODON_COLORS.belly),
    skeleton ? 'smilodon-skeleton-sabre-teeth' : 'smilodon-sabre-teeth',
  );
}

function makeEars(): THREE.Mesh {
  const ears = new GeometryBatch();
  for (const side of SIDES) {
    ears.add(
      silhouetteGeometry(
        [
          new THREE.Vector2(0.98, 1.87),
          new THREE.Vector2(1.18, 2.22),
          new THREE.Vector2(1.34, 1.84),
        ],
        0.065,
      ),
      V(0, 0, embeddedSideZ(side, 0.32, 0.065, 0.3)),
    );
  }
  return ears.toMesh(makeOrganicMaterial(SMILODON_COLORS.bodyShade), 'smilodon-attached-ears');
}

function makeSpots(): THREE.Mesh {
  const spots = new GeometryBatch();
  const markings = [
    { x: -1.18, y: 1.65, surface: 0.47, rx: 0.16, ry: 0.12 },
    { x: -0.72, y: 1.77, surface: 0.55, rx: 0.13, ry: 0.1 },
    { x: -0.26, y: 1.62, surface: 0.56, rx: 0.17, ry: 0.11 },
    { x: 0.16, y: 1.82, surface: 0.53, rx: 0.13, ry: 0.1 },
    { x: 0.52, y: 1.68, surface: 0.45, rx: 0.12, ry: 0.09 },
  ] as const;
  for (const side of SIDES) {
    for (const spot of markings) {
      ellipsoid(
        spots,
        V(spot.x, spot.y, embeddedSideZ(side, spot.surface, 0.022, 0.14)),
        V(spot.rx, spot.ry, 0.022),
        7,
        5,
      );
    }
  }
  return spots.toMesh(makeOrganicMaterial(SMILODON_COLORS.spot), 'smilodon-embedded-spots');
}

function reduceHead(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      if (x <= 0.88 || y <= 0.74) continue;
      position.setXYZ(index, 0.88 + (x - 0.88) * 0.8, 1.58 + (y - 1.58) * 0.8, z * 0.86);
    }
    position.needsUpdate = true;
    object.geometry.computeVertexNormals();
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
  });
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'smilodon-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-2.05, 1.29, 0), radiusY: 0.06, radiusZ: 0.07 },
        { center: V(-1.78, 1.34, 0), radiusY: 0.19, radiusZ: 0.2 },
        { center: V(-1.36, 1.41, 0), radiusY: 0.5, radiusZ: 0.5 },
        { center: V(-0.82, 1.48, 0), radiusY: 0.63, radiusZ: 0.58 },
        { center: V(-0.22, 1.51, 0), radiusY: 0.66, radiusZ: 0.6 },
        { center: V(0.34, 1.56, 0), radiusY: 0.69, radiusZ: 0.58 },
        { center: V(0.78, 1.61, 0), radiusY: 0.55, radiusZ: 0.51 },
        { center: V(1.02, 1.62, 0), radiusY: 0.38, radiusZ: 0.39 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.82, 1.63, 0), radiusY: 0.4, radiusZ: 0.4 },
        { center: V(1.08, 1.72, 0), radiusY: 0.5, radiusZ: 0.45 },
        { center: V(1.37, 1.69, 0), radiusY: 0.49, radiusZ: 0.43 },
        { center: V(1.67, 1.57, 0), radiusY: 0.37, radiusZ: 0.35 },
        { center: V(1.9, 1.49, 0), radiusY: 0.19, radiusZ: 0.2 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-1.32, 1.06, 0), radiusY: 0.07, radiusZ: 0.31 },
        { center: V(-0.72, 0.95, 0), radiusY: 0.12, radiusZ: 0.45 },
        { center: V(-0.1, 0.94, 0), radiusY: 0.13, radiusZ: 0.47 },
        { center: V(0.5, 1.02, 0), radiusY: 0.1, radiusZ: 0.39 },
        { center: V(1.12, 1.3, 0), radiusY: 0.06, radiusZ: 0.29 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  LEGS.forEach((leg) => addLivingLeg(leg.near ? body : farBody, leg));

  for (const side of SIDES) {
    const eyeSurface = 0.38;
    ellipsoid(
      dark,
      V(1.3, 1.84, embeddedSideZ(side, eyeSurface, 0.038)),
      V(0.13, 0.11, 0.038),
      8,
      5,
    );
    ellipsoid(
      iris,
      V(1.31, 1.84, embeddedSideZ(side, eyeSurface + 0.009, 0.018)),
      V(0.075, 0.075, 0.018),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(1.33, 1.84, embeddedSideZ(side, eyeSurface + 0.014, 0.008)),
      V(0.025, 0.05, 0.008),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(1.29, 1.88, embeddedSideZ(side, eyeSurface + 0.018, 0.005)),
      V(0.018, 0.02, 0.005),
      5,
      4,
    );
    ellipsoid(dark, V(1.83, 1.58, embeddedSideZ(side, 0.18, 0.012)), V(0.05, 0.032, 0.012), 6, 4);
    dark.addBetween(
      V(1.18, 1.37, embeddedSideZ(side, 0.31, 0.014)),
      V(1.86, 1.37, embeddedSideZ(side, 0.12, 0.008)),
      0.014,
      0.008,
      6,
    );
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(SMILODON_COLORS.bodyShade), 'smilodon-far-legs'),
    body.toMesh(makeOrganicMaterial(SMILODON_COLORS.body), 'smilodon-body'),
    belly.toMesh(makeOrganicMaterial(SMILODON_COLORS.belly), 'smilodon-belly'),
    makeEars(),
    makeSpots(),
    makeSabres(false),
    iris.toMesh(makeOrganicMaterial(SMILODON_COLORS.iris), 'smilodon-irises'),
    dark.toMesh(makeOrganicMaterial(SMILODON_COLORS.dark), 'smilodon-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'smilodon-eye-glints'),
  );
  reduceHead(group);
  setShadowFlags(group);
  return group;
}

function addJoint(batch: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(batch, point, V(radius, radius * 0.88, radius), 7, 5);
}

function addSkeletonLeg(batch: GeometryBatch, leg: (typeof LEGS)[number]): void {
  batch.addBetween(leg.hip, leg.knee, 0.065, 0.05, 6);
  batch.addBetween(leg.knee, leg.ankle, 0.05, 0.034, 6);
  batch.addBetween(leg.ankle, leg.foot, 0.034, 0.024, 5);
  addJoint(batch, leg.hip, 0.1);
  addJoint(batch, leg.knee, 0.075);
  addJoint(batch, leg.ankle, 0.052);
  for (const zOffset of [-0.08, 0, 0.08]) {
    batch.addBetween(leg.foot, V(leg.foot.x + 0.27, 0.08, leg.foot.z + zOffset), 0.025, 0.01, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'smilodon-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-2.02, 1.3, 0),
    V(-1.7, 1.36, 0),
    V(-1.25, 1.42, 0),
    V(-0.78, 1.49, 0),
    V(-0.3, 1.54, 0),
    V(0.18, 1.58, 0),
    V(0.62, 1.62, 0),
    V(0.96, 1.63, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    const radius = index < 2 ? 0.045 : 0.065;
    addJoint(bone, point, radius);
    if (next) bone.addBetween(point, next, radius * 0.45, radius * 0.36, 6);
  });
  for (const x of [-1.18, -0.78, -0.38, 0.02, 0.4, 0.72]) {
    for (const side of SIDES) {
      const outer = V(x, 1.12, side * 0.44);
      const lower = V(x + 0.03, 0.89, side * 0.18);
      bone.addBetween(V(x, 1.5, side * 0.04), outer, 0.03, 0.022, 5);
      bone.addBetween(outer, lower, 0.022, 0.014, 5);
    }
  }
  for (const side of SIDES) {
    shade.addBetween(V(-1.17, 1.4, side * 0.1), V(-0.62, 1.43, side * 0.4), 0.065, 0.04, 6);
    bone.addBetween(V(-0.88, 1.43, side * 0.05), V(-0.68, 1.05, side * 0.39), 0.045, 0.025, 5);
    const shoulder = V(0.48, 1.55, side * 0.38);
    bone.addBetween(V(0.32, 1.58, side * 0.05), shoulder, 0.045, 0.03, 5);
    bone.addBetween(shoulder, V(0.58, 1.17, side * 0.16), 0.04, 0.022, 5);
  }
  LEGS.forEach((leg) => addSkeletonLeg(bone, leg));

  ellipsoid(bone, V(1.28, 1.7, 0), V(0.55, 0.47, 0.43), 9, 6);
  bone.addBetween(V(1.08, 1.42, 0), V(1.87, 1.36, 0), 0.055, 0.03, 6);
  for (const side of SIDES) {
    ellipsoid(dark, V(1.28, 1.82, side * 0.37), V(0.17, 0.14, 0.035), 7, 5);
    ellipsoid(dark, V(1.65, 1.6, side * 0.29), V(0.13, 0.08, 0.025), 7, 5);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(SMILODON_COLORS.boneShade), 'smilodon-skeleton-girdles'),
    bone.toMesh(makeFlatMaterial(SMILODON_COLORS.bone), 'smilodon-skeleton-bones'),
    dark.toMesh(makeFlatMaterial(SMILODON_COLORS.dark), 'smilodon-skull-openings'),
    makeSabres(true),
  );
  reduceHead(group);
  setShadowFlags(group);
  return group;
}

export function buildSmilodon(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
