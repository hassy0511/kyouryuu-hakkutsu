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

// Viewed from the front, a Triceratops frill is a broad fan in the YZ plane.
// Vector2 stores (z, y) here; X is reserved for its small fore-aft thickness.
const FRILL_OUTLINE_YZ = [
  new THREE.Vector2(-0.28, 1.68),
  new THREE.Vector2(-0.58, 1.72),
  new THREE.Vector2(-0.84, 1.86),
  new THREE.Vector2(-1.01, 2),
  new THREE.Vector2(-1.03, 2.25),
  new THREE.Vector2(-0.95, 2.47),
  new THREE.Vector2(-0.8, 2.66),
  new THREE.Vector2(-0.57, 2.8),
  new THREE.Vector2(-0.29, 2.89),
  new THREE.Vector2(0, 2.92),
  new THREE.Vector2(0.29, 2.89),
  new THREE.Vector2(0.57, 2.8),
  new THREE.Vector2(0.8, 2.66),
  new THREE.Vector2(0.95, 2.47),
  new THREE.Vector2(1.03, 2.25),
  new THREE.Vector2(1.01, 2),
  new THREE.Vector2(0.84, 1.86),
  new THREE.Vector2(0.58, 1.72),
  new THREE.Vector2(0.28, 1.68),
  new THREE.Vector2(0, 1.72),
] as const;

/**
 * Builds the broad frill across the back of the skull. The previous mesh put
 * its broad surface in XY and extruded it along Z, which made the side view
 * look like a cylinder. This mesh puts the fan in YZ and gives it only a thin
 * X thickness, so the side view sees a blade-like edge.
 */
function frillCenterX(y: number): number {
  const height = THREE.MathUtils.clamp((y - 1.68) / (2.92 - 1.68), 0, 1);
  return THREE.MathUtils.lerp(1.72, 1.44, height);
}

function frillTransverseGeometry(rootDepth: number, edgeDepth: number): THREE.BufferGeometry {
  const root = new THREE.Vector2(0, 1.96);
  const innerRatio = 0.55;
  const boundaryDepths = FRILL_OUTLINE_YZ.map((point) => {
    const central = THREE.MathUtils.clamp(1 - Math.abs(point.x) / 1.08, 0, 1);
    const low = THREE.MathUtils.clamp((1.9 - point.y) / 0.37, 0, 1);
    return THREE.MathUtils.lerp(edgeDepth, rootDepth * 0.62, central * low);
  });

  const positions: number[] = [];
  const indices: number[] = [];
  const sideStarts: Array<{ center: number; inner: number; outer: number }> = [];

  for (const side of [-1, 1]) {
    const center = positions.length / 3;
    positions.push(frillCenterX(root.y) + side * rootDepth, root.y, root.x);

    const inner = positions.length / 3;
    FRILL_OUTLINE_YZ.forEach((point, index) => {
      const rimDepth = boundaryDepths[index] ?? edgeDepth;
      const depth = THREE.MathUtils.lerp(rootDepth, rimDepth, innerRatio);
      const z = THREE.MathUtils.lerp(root.x, point.x, innerRatio);
      const y = THREE.MathUtils.lerp(root.y, point.y, innerRatio);
      positions.push(frillCenterX(y) + side * depth, y, z);
    });

    const outer = positions.length / 3;
    FRILL_OUTLINE_YZ.forEach((point, index) => {
      positions.push(
        frillCenterX(point.y) + side * (boundaryDepths[index] ?? edgeDepth),
        point.y,
        point.x,
      );
    });
    sideStarts.push({ center, inner, outer });
  }

  const count = FRILL_OUTLINE_YZ.length;
  sideStarts.forEach((starts, sideIndex) => {
    const front = sideIndex === 1;
    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      const innerA = starts.inner + index;
      const innerB = starts.inner + next;
      const outerA = starts.outer + index;
      const outerB = starts.outer + next;
      if (front) {
        indices.push(starts.center, innerA, innerB, innerA, outerA, outerB, innerA, outerB, innerB);
      } else {
        indices.push(starts.center, innerB, innerA, innerA, outerB, outerA, innerA, innerB, outerB);
      }
    }
  });

  const backOuter = sideStarts[0]!.outer;
  const frontOuter = sideStarts[1]!.outer;
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    const backA = backOuter + index;
    const backB = backOuter + next;
    const frontA = frontOuter + index;
    const frontB = frontOuter + next;
    indices.push(backA, frontA, frontB, backA, frontB, backB);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

interface LimbSection {
  center: THREE.Vector3;
  radius: number;
}

/** Builds one continuous tapered limb along a bent path. */
function taperedLimbGeometry(
  sections: readonly LimbSection[],
  radialSegments = 10,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  sections.forEach((section, sectionIndex) => {
    const previous = sections[Math.max(0, sectionIndex - 1)]!;
    const next = sections[Math.min(sections.length - 1, sectionIndex + 1)]!;
    const tangent = new THREE.Vector3().subVectors(next.center, previous.center).normalize();
    const reference = Math.abs(tangent.z) > 0.95 ? V(1, 0, 0) : V(0, 0, 1);
    const basisA = new THREE.Vector3().crossVectors(tangent, reference).normalize();
    const basisB = new THREE.Vector3().crossVectors(tangent, basisA).normalize();

    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const angle = (radialIndex / radialSegments) * Math.PI * 2;
      const offset = basisA
        .clone()
        .multiplyScalar(Math.cos(angle) * section.radius)
        .addScaledVector(basisB, Math.sin(angle) * section.radius);
      positions.push(
        section.center.x + offset.x,
        section.center.y + offset.y,
        section.center.z + offset.z,
      );
      uvs.push(sectionIndex / (sections.length - 1), radialIndex / radialSegments);
    }
  });

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    const currentRing = sectionIndex * radialSegments;
    const nextRing = (sectionIndex + 1) * radialSegments;
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const nextRadial = (radialIndex + 1) % radialSegments;
      const a = currentRing + radialIndex;
      const b = currentRing + nextRadial;
      const c = nextRing + radialIndex;
      const d = nextRing + nextRadial;
      indices.push(a, b, c, b, d, c);
    }
  }

  const startCenter = positions.length / 3;
  const endCenter = startCenter + 1;
  const first = sections[0]!;
  const last = sections[sections.length - 1]!;
  positions.push(first.center.x, first.center.y, first.center.z);
  positions.push(last.center.x, last.center.y, last.center.z);
  uvs.push(0, 0.5, 1, 0.5);
  const endRing = (sections.length - 1) * radialSegments;
  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const nextRadial = (radialIndex + 1) % radialSegments;
    indices.push(startCenter, nextRadial, radialIndex);
    indices.push(endCenter, endRing + radialIndex, endRing + nextRadial);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addLivingLeg(body: GeometryBatch, claws: GeometryBatch, leg: (typeof LEGS)[number]): void {
  const upperMid = new THREE.Vector3().lerpVectors(leg.upper, leg.knee, 0.48);
  const lowerMid = new THREE.Vector3().lerpVectors(leg.knee, leg.ankle, 0.52);
  body.add(
    taperedLimbGeometry(
      [
        { center: leg.upper, radius: 0.39 },
        { center: upperMid, radius: 0.35 },
        { center: leg.knee, radius: 0.29 },
        { center: lowerMid, radius: 0.235 },
        { center: leg.ankle, radius: 0.18 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  body.addBetween(leg.ankle, leg.foot, 0.19, 0.15, 8);
  ellipsoid(body, leg.foot, V(0.44, 0.17, 0.31), 9, 6);

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
  eyeSocket: GeometryBatch,
  dark: GeometryBatch,
  iris: GeometryBatch,
  glint: GeometryBatch,
): void {
  body.add(
    loftGeometry(
      [
        { center: V(1.45, 1.57, 0), radiusY: 0.49, radiusZ: 0.62 },
        { center: V(1.76, 1.56, 0), radiusY: 0.54, radiusZ: 0.64 },
        { center: V(2.06, 1.52, 0), radiusY: 0.5, radiusZ: 0.57 },
        { center: V(2.34, 1.45, 0), radiusY: 0.41, radiusZ: 0.47 },
        { center: V(2.59, 1.38, 0), radiusY: 0.33, radiusZ: 0.37 },
        { center: V(2.8, 1.32, 0), radiusY: 0.24, radiusZ: 0.28 },
        { center: V(2.96, 1.27, 0), radiusY: 0.16, radiusZ: 0.2 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(1.82, 1.18, 0), radiusY: 0.16, radiusZ: 0.47 },
        { center: V(2.18, 1.12, 0), radiusY: 0.17, radiusZ: 0.42 },
        { center: V(2.52, 1.09, 0), radiusY: 0.15, radiusZ: 0.34 },
        { center: V(2.8, 1.1, 0), radiusY: 0.11, radiusZ: 0.24 },
        { center: V(3.01, 1.14, 0), radiusY: 0.07, radiusZ: 0.13 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  // The beak continues the skull taper instead of terminating it with a ball.
  cream.add(
    loftGeometry(
      [
        { center: V(2.82, 1.25, 0), radiusY: 0.14, radiusZ: 0.2 },
        { center: V(2.97, 1.22, 0), radiusY: 0.11, radiusZ: 0.15 },
        { center: V(3.08, 1.19, 0), radiusY: 0.065, radiusZ: 0.09 },
      ],
      9,
    ),
    V(0, 0, 0),
  );
  coneBetween(cream, V(2.55, 1.67, 0), V(2.82, 1.97, 0), 0.11, 8);

  for (const side of [-1, 1]) {
    coneBetween(cream, V(1.87, 1.92, side * 0.45), V(2.9, 2.14, side * 0.48), 0.17, 9);
    const eyeSurface = 0.5;
    ellipsoid(
      eyeSocket,
      V(2.06, 1.72, embeddedSideZ(side, eyeSurface, 0.09, 0.18)),
      V(0.105, 0.09, 0.09),
      8,
      6,
    );
    ellipsoid(
      iris,
      V(2.075, 1.722, embeddedSideZ(side, eyeSurface + 0.015, 0.06, 0.2)),
      V(0.055, 0.055, 0.06),
      8,
      6,
    );
    ellipsoid(
      dark,
      V(2.085, 1.722, embeddedSideZ(side, eyeSurface + 0.028, 0.035, 0.2)),
      V(0.021, 0.032, 0.035),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(2.065, 1.747, embeddedSideZ(side, eyeSurface + 0.04, 0.012, 0.08)),
      V(0.009, 0.011, 0.012),
      5,
      4,
    );
    const mouth = [
      V(2.22, 1.22, embeddedSideZ(side, 0.36, 0.013, 0.08)),
      V(2.66, 1.16, embeddedSideZ(side, 0.26, 0.009, 0.08)),
      V(3.07, 1.17, embeddedSideZ(side, 0.07, 0.005, 0.08)),
    ];
    dark.addBetween(mouth[0]!, mouth[1]!, 0.016, 0.013, 6);
    dark.addBetween(mouth[1]!, mouth[2]!, 0.013, 0.007, 6);
  }

  group.add(
    cream.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.horn), 'triceratops-horns-beak-claws'),
    eyeSocket.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.body), 'triceratops-eye-sockets'),
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
  const cream = new GeometryBatch();
  const eyeSocket = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-4.7, 1.36, 0), radiusY: 0.035, radiusZ: 0.035 },
        { center: V(-4.3, 1.4, 0), radiusY: 0.075, radiusZ: 0.08 },
        { center: V(-3.9, 1.44, 0), radiusY: 0.13, radiusZ: 0.14 },
        { center: V(-3.48, 1.48, 0), radiusY: 0.21, radiusZ: 0.23 },
        { center: V(-3.05, 1.52, 0), radiusY: 0.31, radiusZ: 0.34 },
        { center: V(-2.62, 1.56, 0), radiusY: 0.44, radiusZ: 0.48 },
        { center: V(-2.18, 1.59, 0), radiusY: 0.59, radiusZ: 0.63 },
        { center: V(-1.78, 1.61, 0), radiusY: 0.71, radiusZ: 0.74 },
        { center: V(-1.45, 1.63, 0), radiusY: 0.8, radiusZ: 0.83 },
        { center: V(-0.7, 1.66, 0), radiusY: 0.89, radiusZ: 0.91 },
        { center: V(0.05, 1.66, 0), radiusY: 0.91, radiusZ: 0.94 },
        { center: V(0.68, 1.64, 0), radiusY: 0.82, radiusZ: 0.87 },
        { center: V(1.12, 1.62, 0), radiusY: 0.67, radiusZ: 0.77 },
        { center: V(1.42, 1.59, 0), radiusY: 0.5, radiusZ: 0.64 },
      ],
      14,
    ),
    V(0, 0, 0),
  );

  for (const leg of LEGS) addLivingLeg(leg.near ? body : farBody, cream, leg);

  const livingFrillMaterial = makeOrganicMaterial(TRICERATOPS_COLORS.body);
  livingFrillMaterial.side = THREE.DoubleSide;
  const outerFrill = new THREE.Mesh(frillTransverseGeometry(0.13, 0.028), livingFrillMaterial);
  outerFrill.name = 'triceratops-frill';
  group.add(outerFrill);

  addFaceDetails(group, body, cream, eyeSocket, dark, iris, glint);
  group.add(
    farBody.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.bodyDark), 'triceratops-far-legs'),
    body.toMesh(makeOrganicMaterial(TRICERATOPS_COLORS.body), 'triceratops-body'),
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
    V(-4.68, 1.37, 0),
    V(-4.28, 1.41, 0),
    V(-3.88, 1.46, 0),
    V(-3.46, 1.51, 0),
    V(-3.03, 1.57, 0),
    V(-2.6, 1.65, 0),
    V(-2.18, 1.75, 0),
    V(-1.82, 1.88, 0),
    V(-1.25, 2.08, 0),
    V(-0.55, 2.22, 0),
    V(0.15, 2.24, 0),
    V(0.82, 2.18, 0),
    V(1.25, 2.04, 0),
    V(1.55, 1.86, 0),
  ] as const;
  for (let index = 0; index < spine.length - 1; index += 1) {
    const start = spine[index];
    const end = spine[index + 1];
    if (!start || !end) continue;
    const tailTaper = THREE.MathUtils.clamp(index / 7, 0, 1);
    const radius = THREE.MathUtils.lerp(0.024, 0.075, tailTaper);
    bone.addBetween(start, end, radius, radius * 0.82, 7);
    ellipsoid(bone, start, V(radius * 1.55, radius * 1.4, radius * 1.55), 7, 5);
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

  const skeletonFrillMaterial = makeFlatMaterial(TRICERATOPS_COLORS.bone);
  skeletonFrillMaterial.side = THREE.DoubleSide;
  const frill = new THREE.Mesh(frillTransverseGeometry(0.05, 0.01), skeletonFrillMaterial);
  frill.name = 'triceratops-skeleton-frill';
  group.add(frill);

  // Compact braincase/cheek mass: enough to round the skull without recreating
  // the former oversized spherical block.
  ellipsoid(bone, V(1.76, 1.56, 0), V(0.48, 0.4, 0.49), 10, 7);
  bone.add(
    loftGeometry(
      [
        { center: V(1.45, 1.57, 0), radiusY: 0.4, radiusZ: 0.54 },
        { center: V(1.76, 1.56, 0), radiusY: 0.45, radiusZ: 0.56 },
        { center: V(2.06, 1.52, 0), radiusY: 0.42, radiusZ: 0.5 },
        { center: V(2.34, 1.45, 0), radiusY: 0.35, radiusZ: 0.41 },
        { center: V(2.59, 1.38, 0), radiusY: 0.28, radiusZ: 0.32 },
        { center: V(2.8, 1.32, 0), radiusY: 0.2, radiusZ: 0.24 },
        { center: V(3.03, 1.2, 0), radiusY: 0.075, radiusZ: 0.11 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  coneBetween(bone, V(2.55, 1.67, 0), V(2.82, 1.97, 0), 0.085, 8);
  for (const side of [-1, 1]) {
    coneBetween(bone, V(1.87, 1.92, side * 0.42), V(2.9, 2.14, side * 0.46), 0.115, 8);
    ellipsoid(dark, V(2.05, 1.7, side * 0.48), V(0.13, 0.105, 0.036), 8, 5);
    ellipsoid(dark, V(2.5, 1.29, side * 0.3), V(0.24, 0.07, 0.026), 8, 5);
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
