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

export const ANKYLOSAURUS_COLORS = {
  body: '#7A6A4A',
  bodyShade: '#66573E',
  armor: '#5C4F38',
  belly: '#E8DCC0',
  club: '#F2EAD8',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SIDES = [-1, 1] as const;

const LEGS = [
  { near: true, upper: V(-1.05, 0.9, 0.72), knee: V(-1.1, 0.47, 0.78), foot: V(-0.88, 0.14, 0.8) },
  {
    near: false,
    upper: V(-1.45, 0.88, -0.65),
    knee: V(-1.3, 0.46, -0.71),
    foot: V(-1.08, 0.13, -0.73),
  },
  { near: true, upper: V(1.65, 0.88, 0.7), knee: V(1.76, 0.45, 0.76), foot: V(1.98, 0.13, 0.78) },
  {
    near: false,
    upper: V(1.28, 0.86, -0.63),
    knee: V(1.18, 0.44, -0.69),
    foot: V(1.42, 0.12, -0.71),
  },
] as const;

const ARMOR_BANDS = [
  { x: -1.9, baseY: 1.47, width: 0.5, height: 0.17, depth: 0.73 },
  { x: -1.35, baseY: 1.58, width: 0.52, height: 0.2, depth: 0.86 },
  { x: -0.76, baseY: 1.66, width: 0.54, height: 0.22, depth: 0.92 },
  { x: -0.15, baseY: 1.69, width: 0.55, height: 0.23, depth: 0.95 },
  { x: 0.47, baseY: 1.66, width: 0.55, height: 0.22, depth: 0.93 },
  { x: 1.07, baseY: 1.56, width: 0.53, height: 0.2, depth: 0.86 },
  { x: 1.63, baseY: 1.43, width: 0.5, height: 0.17, depth: 0.75 },
] as const;

function armorBandGeometry(band: (typeof ARMOR_BANDS)[number]): THREE.BufferGeometry {
  const halfWidth = band.width / 2;
  return silhouetteGeometry(
    [
      new THREE.Vector2(band.x - halfWidth, band.baseY),
      new THREE.Vector2(band.x - halfWidth * 0.62, band.baseY + band.height),
      new THREE.Vector2(band.x + halfWidth * 0.62, band.baseY + band.height),
      new THREE.Vector2(band.x + halfWidth, band.baseY),
    ],
    band.depth,
  );
}

function addArmor(armor: GeometryBatch, spikes: GeometryBatch): void {
  ARMOR_BANDS.forEach((band) => armor.add(armorBandGeometry(band), V(0, 0, 0)));
  for (const x of [-1.65, -1.05, -0.43, 0.2, 0.82, 1.4]) {
    for (const side of SIDES) {
      const base = V(x, 1.58 - Math.abs(x) * 0.04, side * 0.66);
      const tip = V(x - 0.05, 1.82 - Math.abs(x) * 0.025, side * 0.83);
      coneBetween(spikes, base, tip, 0.085, 6);
    }
  }
  for (const side of SIDES) {
    coneBetween(spikes, V(1.4, 1.35, side * 0.72), V(1.24, 1.62, side * 1.16), 0.14, 7);
    coneBetween(spikes, V(1.83, 1.24, side * 0.66), V(1.74, 1.44, side * 1.01), 0.11, 7);
  }
}

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  body.addBetween(leg.upper, leg.knee, 0.31, 0.25, 8);
  body.addBetween(leg.knee, leg.foot, 0.25, 0.18, 8);
  ellipsoid(body, leg.upper, V(0.39, 0.34, 0.35), 8, 6);
  ellipsoid(body, leg.knee, V(0.27, 0.23, 0.25), 7, 5);
  ellipsoid(body, leg.foot, V(0.43, 0.15, 0.3), 8, 5);
  for (const zOffset of [-0.13, 0, 0.13]) {
    const toe = V(leg.foot.x + 0.34, 0.09, leg.foot.z + zOffset);
    body.addBetween(leg.foot, toe, 0.055, 0.026, 6);
    coneBetween(claws, toe, V(toe.x + 0.09, 0.08, toe.z), 0.028, 6);
  }
}

function addLivingFace(
  horns: GeometryBatch,
  iris: GeometryBatch,
  dark: GeometryBatch,
  glint: GeometryBatch,
): void {
  for (const side of SIDES) {
    coneBetween(
      horns,
      V(2.83, 1.3, embeddedSideZ(side, 0.46, 0.08, 0.15)),
      V(2.7, 1.47, side * 0.58),
      0.075,
      6,
    );
    coneBetween(horns, V(3.12, 1.02, side * 0.43), V(3.02, 1.08, side * 0.63), 0.065, 6);
    const eyeSurface = 0.49;
    ellipsoid(
      dark,
      V(2.94, 1.24, embeddedSideZ(side, eyeSurface, 0.035)),
      V(0.105, 0.09, 0.035),
      7,
      5,
    );
    ellipsoid(
      iris,
      V(2.955, 1.242, embeddedSideZ(side, eyeSurface + 0.008, 0.015)),
      V(0.058, 0.06, 0.015),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(2.97, 1.242, embeddedSideZ(side, eyeSurface + 0.012, 0.007)),
      V(0.023, 0.036, 0.007),
      5,
      4,
    );
    ellipsoid(
      glint,
      V(2.935, 1.275, embeddedSideZ(side, eyeSurface + 0.015, 0.004)),
      V(0.012, 0.014, 0.004),
      5,
      4,
    );
    ellipsoid(dark, V(3.54, 1.08, embeddedSideZ(side, 0.32, 0.014)), V(0.052, 0.032, 0.014), 6, 4);
    dark.addBetween(
      V(2.98, 0.87, embeddedSideZ(side, 0.42, 0.012, 0.08)),
      V(3.65, 0.86, embeddedSideZ(side, 0.2, 0.006, 0.08)),
      0.012,
      0.006,
      5,
    );
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ankylosaurus-living';
  const body = new GeometryBatch();
  const farBody = new GeometryBatch();
  const belly = new GeometryBatch();
  const armor = new GeometryBatch();
  const armorSpikes = new GeometryBatch();
  const club = new GeometryBatch();
  const cream = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-4.03, 1.0, 0), radiusY: 0.13, radiusZ: 0.17 },
        { center: V(-3.45, 1.03, 0), radiusY: 0.24, radiusZ: 0.3 },
        { center: V(-2.82, 1.08, 0), radiusY: 0.38, radiusZ: 0.48 },
        { center: V(-2.18, 1.16, 0), radiusY: 0.53, radiusZ: 0.67 },
        { center: V(-1.45, 1.2, 0), radiusY: 0.64, radiusZ: 0.85 },
        { center: V(-0.65, 1.22, 0), radiusY: 0.68, radiusZ: 0.94 },
        { center: V(0.18, 1.21, 0), radiusY: 0.68, radiusZ: 0.96 },
        { center: V(0.98, 1.18, 0), radiusY: 0.63, radiusZ: 0.9 },
        { center: V(1.7, 1.12, 0), radiusY: 0.54, radiusZ: 0.76 },
        { center: V(2.24, 1.06, 0), radiusY: 0.43, radiusZ: 0.61 },
      ],
      12,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(2.1, 1.06, 0), radiusY: 0.42, radiusZ: 0.58 },
        { center: V(2.55, 1.08, 0), radiusY: 0.43, radiusZ: 0.56 },
        { center: V(3.0, 1.06, 0), radiusY: 0.42, radiusZ: 0.52 },
        { center: V(3.42, 1.0, 0), radiusY: 0.35, radiusZ: 0.44 },
        { center: V(3.72, 0.94, 0), radiusY: 0.22, radiusZ: 0.3 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-2.1, 0.66, 0), radiusY: 0.07, radiusZ: 0.46 },
        { center: V(-1.25, 0.52, 0), radiusY: 0.11, radiusZ: 0.67 },
        { center: V(-0.25, 0.47, 0), radiusY: 0.13, radiusZ: 0.74 },
        { center: V(0.8, 0.5, 0), radiusY: 0.12, radiusZ: 0.7 },
        { center: V(1.75, 0.61, 0), radiusY: 0.09, radiusZ: 0.55 },
        { center: V(2.65, 0.75, 0), radiusY: 0.05, radiusZ: 0.38 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  addArmor(armor, armorSpikes);
  LEGS.forEach((leg) => addLivingLeg(leg.near ? body : farBody, cream, leg));
  ellipsoid(club, V(-4.43, 0.98, 0), V(0.56, 0.34, 0.72), 8, 6);
  addLivingFace(cream, iris, dark, glint);

  group.add(
    farBody.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.bodyShade), 'ankylosaurus-far-legs'),
    body.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.body), 'ankylosaurus-body'),
    belly.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.belly), 'ankylosaurus-belly'),
    armor.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.armor), 'ankylosaurus-armor-bands'),
    armorSpikes.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.armor), 'ankylosaurus-armor-spikes'),
    club.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.club), 'ankylosaurus-tail-club'),
    cream.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.club), 'ankylosaurus-horns-claws'),
    iris.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.iris), 'ankylosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(ANKYLOSAURUS_COLORS.dark), 'ankylosaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'ankylosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addBoneJoint(bone: GeometryBatch, point: THREE.Vector3, radius: number): void {
  ellipsoid(bone, point, V(radius, radius * 0.9, radius), 7, 5);
}

function addSkeletonLeg(bone: GeometryBatch, leg: (typeof LEGS)[number]): void {
  bone.addBetween(leg.upper, leg.knee, 0.082, 0.06, 6);
  bone.addBetween(leg.knee, leg.foot, 0.06, 0.04, 6);
  addBoneJoint(bone, leg.upper, 0.11);
  addBoneJoint(bone, leg.knee, 0.085);
  addBoneJoint(bone, leg.foot, 0.06);
  for (const zOffset of [-0.12, 0, 0.12]) {
    bone.addBetween(leg.foot, V(leg.foot.x + 0.35, 0.08, leg.foot.z + zOffset), 0.034, 0.016, 5);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ankylosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const armor = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [
    V(-4.05, 1.0, 0),
    V(-3.55, 1.03, 0),
    V(-3.05, 1.07, 0),
    V(-2.53, 1.12, 0),
    V(-2.0, 1.17, 0),
    V(-1.45, 1.21, 0),
    V(-0.88, 1.24, 0),
    V(-0.3, 1.25, 0),
    V(0.3, 1.24, 0),
    V(0.9, 1.2, 0),
    V(1.48, 1.15, 0),
    V(2.02, 1.09, 0),
    V(2.48, 1.06, 0),
  ] as const;
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    const scale = index < 5 ? 0.075 : 0.105;
    addBoneJoint(bone, point, scale);
    if (next) bone.addBetween(point, next, scale * 0.55, scale * 0.46, 6);
  });
  for (const point of spine.slice(5, 11)) {
    for (const side of SIDES) {
      const outer = V(point.x, point.y - 0.35, side * 0.78);
      const lower = V(point.x + 0.04, point.y - 0.63, side * 0.2);
      bone.addBetween(point, outer, 0.04, 0.03, 6);
      bone.addBetween(outer, lower, 0.03, 0.02, 6);
    }
  }
  for (const side of SIDES) {
    const hindLeg = side > 0 ? LEGS[0] : LEGS[1];
    const frontLeg = side > 0 ? LEGS[2] : LEGS[3];
    shade.addBetween(V(-1.5, 1.19, side * 0.14), V(-0.63, 1.16, side * 0.58), 0.075, 0.045, 6);
    bone.addBetween(V(-1.18, 1.2, side * 0.06), hindLeg.upper, 0.05, 0.036, 6);
    bone.addBetween(hindLeg.upper, V(-0.7, 0.64, side * 0.5), 0.043, 0.025, 6);
    const scapula = V(1.4, 1.11, side * 0.54);
    const chest = V(1.62, 0.63, side * 0.14);
    bone.addBetween(V(1.72, 1.13, side * 0.06), scapula, 0.045, 0.032, 6);
    bone.addBetween(scapula, frontLeg.upper, 0.04, 0.03, 6);
    bone.addBetween(frontLeg.upper, chest, 0.036, 0.024, 6);
    bone.addBetween(chest, V(1.62, 0.61, 0), 0.024, 0.017, 5);
  }
  LEGS.forEach((leg) => addSkeletonLeg(bone, leg));
  addArmor(armor, armor);

  // Enlarged terminal vertebrae merge visually into the bony club.
  ellipsoid(bone, V(-4.18, 0.99, 0), V(0.22, 0.16, 0.2), 7, 5);
  ellipsoid(bone, V(-4.46, 0.98, 0), V(0.54, 0.32, 0.7), 8, 6);
  bone.add(
    loftGeometry(
      [
        { center: V(2.35, 1.05, 0), radiusY: 0.31, radiusZ: 0.43 },
        { center: V(2.8, 1.07, 0), radiusY: 0.35, radiusZ: 0.47 },
        { center: V(3.24, 1.02, 0), radiusY: 0.32, radiusZ: 0.43 },
        { center: V(3.62, 0.95, 0), radiusY: 0.18, radiusZ: 0.27 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  for (const side of SIDES) {
    coneBetween(bone, V(2.82, 1.3, side * 0.41), V(2.68, 1.46, side * 0.55), 0.064, 6);
    coneBetween(bone, V(3.1, 1.01, side * 0.4), V(3.0, 1.08, side * 0.58), 0.055, 6);
    ellipsoid(dark, V(2.95, 1.2, side * 0.45), V(0.13, 0.1, 0.03), 7, 5);
    ellipsoid(dark, V(3.47, 1.05, side * 0.3), V(0.055, 0.032, 0.014), 6, 4);
  }

  group.add(
    shade.toMesh(makeFlatMaterial(ANKYLOSAURUS_COLORS.boneShade), 'ankylosaurus-girdles'),
    bone.toMesh(makeFlatMaterial(ANKYLOSAURUS_COLORS.bone), 'ankylosaurus-skeleton-bones-club'),
    armor.toMesh(makeFlatMaterial(ANKYLOSAURUS_COLORS.bone), 'ankylosaurus-skeleton-armor'),
    dark.toMesh(makeFlatMaterial(ANKYLOSAURUS_COLORS.dark), 'ankylosaurus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildAnkylosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
