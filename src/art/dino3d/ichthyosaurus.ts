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

export const ICHTHYOSAURUS_COLORS = {
  back: '#4A6B8A',
  backDark: '#2E4A66',
  belly: '#F0EAD2',
  iris: '#C68B38',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const SPINE = [
  V(0.66, 0.96, 0),
  V(0.38, 0.97, 0),
  V(0.08, 0.96, 0),
  V(-0.22, 0.94, 0),
  V(-0.52, 0.91, 0),
  V(-0.8, 0.86, 0),
  V(-1.04, 0.79, 0),
  V(-1.24, 0.71, 0),
  V(-1.4, 0.61, 0),
  V(-1.53, 0.52, 0),
] as const;

interface PaddleSpec {
  side: -1 | 1;
  rear: boolean;
  root: THREE.Vector3;
  wrist: THREE.Vector3;
  tips: readonly THREE.Vector3[];
}

const PADDLES: readonly PaddleSpec[] = [
  {
    side: 1,
    rear: false,
    root: V(0.16, 0.82, 0.32),
    wrist: V(0.02, 0.52, 0.57),
    tips: [
      V(-0.3, 0.37, 0.72),
      V(-0.21, 0.34, 0.79),
      V(-0.1, 0.33, 0.84),
      V(0.02, 0.35, 0.87),
      V(0.13, 0.39, 0.86),
    ],
  },
  {
    side: -1,
    rear: false,
    root: V(0.2, 0.84, -0.3),
    wrist: V(0.1, 0.57, -0.53),
    tips: [
      V(-0.16, 0.43, -0.66),
      V(-0.07, 0.4, -0.72),
      V(0.04, 0.39, -0.77),
      V(0.15, 0.41, -0.8),
      V(0.25, 0.45, -0.79),
    ],
  },
  {
    side: 1,
    rear: true,
    root: V(-0.55, 0.78, 0.27),
    wrist: V(-0.68, 0.6, 0.43),
    tips: [
      V(-0.92, 0.51, 0.51),
      V(-0.84, 0.48, 0.56),
      V(-0.75, 0.47, 0.6),
      V(-0.66, 0.49, 0.61),
      V(-0.58, 0.52, 0.59),
    ],
  },
  {
    side: -1,
    rear: true,
    root: V(-0.51, 0.8, -0.25),
    wrist: V(-0.61, 0.64, -0.4),
    tips: [
      V(-0.82, 0.56, -0.47),
      V(-0.74, 0.53, -0.52),
      V(-0.65, 0.52, -0.55),
      V(-0.57, 0.54, -0.56),
      V(-0.5, 0.57, -0.54),
    ],
  },
] as const;

const DORSAL_FIN = [
  new THREE.Vector2(-0.62, 1.12),
  new THREE.Vector2(-0.36, 1.58),
  new THREE.Vector2(-0.08, 1.12),
] as const;

const TAIL_FIN = [
  new THREE.Vector2(-1.55, 0.53),
  new THREE.Vector2(-1.7, 1.31),
  new THREE.Vector2(-1.82, 0.84),
  new THREE.Vector2(-1.79, 0.5),
  new THREE.Vector2(-1.65, 0.24),
  new THREE.Vector2(-1.48, 0.47),
] as const;

function paddleMembraneGeometry(paddle: PaddleSpec): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const points = [paddle.root, ...paddle.tips];
  points.forEach((point, index) => {
    positions.push(point.x, point.y, point.z);
    uvs.push(index === 0 ? 0 : 1, index / (points.length - 1));
  });
  for (let index = 1; index < points.length - 1; index += 1) {
    indices.push(0, index, index + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addLivingPaddle(batch: GeometryBatch, paddle: PaddleSpec): void {
  batch.addBetween(
    paddle.root,
    paddle.wrist,
    paddle.rear ? 0.085 : 0.115,
    paddle.rear ? 0.048 : 0.065,
    9,
  );
  batch.add(paddleMembraneGeometry(paddle), V(0, 0, 0));
}

function addPaddleBones(bone: GeometryBatch, paddle: PaddleSpec): void {
  bone.addBetween(paddle.root, paddle.wrist, paddle.rear ? 0.033 : 0.043, 0.025, 6);
  ellipsoid(bone, paddle.root, V(0.06, 0.055, 0.06), 7, 5);
  ellipsoid(bone, paddle.wrist, V(0.045, 0.04, 0.045), 7, 5);

  paddle.tips.forEach((tip, index) => {
    const spread = (index - 2) * 0.025;
    const knuckle = V(
      THREE.MathUtils.lerp(paddle.wrist.x, tip.x, 0.42),
      THREE.MathUtils.lerp(paddle.wrist.y, tip.y, 0.42),
      THREE.MathUtils.lerp(paddle.wrist.z, tip.z, 0.42) + spread * paddle.side,
    );
    const middle = V(
      THREE.MathUtils.lerp(paddle.wrist.x, tip.x, 0.72),
      THREE.MathUtils.lerp(paddle.wrist.y, tip.y, 0.72),
      THREE.MathUtils.lerp(paddle.wrist.z, tip.z, 0.72),
    );
    bone.addBetween(paddle.wrist, knuckle, 0.018, 0.014, 5);
    bone.addBetween(knuckle, middle, 0.014, 0.01, 5);
    bone.addBetween(middle, tip, 0.01, 0.006, 5);
  });
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ichthyosaurus-living';
  const body = new GeometryBatch();
  const belly = new GeometryBatch();
  const fins = new GeometryBatch();
  const eyeSocket = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-1.52, 0.53, 0), radiusY: 0.06, radiusZ: 0.055 },
        { center: V(-1.15, 0.74, 0), radiusY: 0.18, radiusZ: 0.18 },
        { center: V(-0.62, 0.88, 0), radiusY: 0.36, radiusZ: 0.38 },
        { center: V(-0.05, 0.95, 0), radiusY: 0.43, radiusZ: 0.44 },
        { center: V(0.43, 0.97, 0), radiusY: 0.34, radiusZ: 0.36 },
        { center: V(0.75, 0.94, 0), radiusY: 0.25, radiusZ: 0.28 },
      ],
      12,
    ),
    V(0, 0, 0),
  );
  body.add(
    loftGeometry(
      [
        { center: V(0.64, 0.94, 0), radiusY: 0.26, radiusZ: 0.29 },
        { center: V(0.94, 0.91, 0), radiusY: 0.18, radiusZ: 0.21 },
        { center: V(1.2, 0.87, 0), radiusY: 0.11, radiusZ: 0.15 },
        { center: V(1.42, 0.84, 0), radiusY: 0.055, radiusZ: 0.08 },
      ],
      11,
    ),
    V(0, 0, 0),
  );
  belly.add(
    loftGeometry(
      [
        { center: V(-1.08, 0.67, 0), radiusY: 0.06, radiusZ: 0.13 },
        { center: V(-0.55, 0.63, 0), radiusY: 0.13, radiusZ: 0.32 },
        { center: V(0.05, 0.59, 0), radiusY: 0.12, radiusZ: 0.37 },
        { center: V(0.58, 0.7, 0), radiusY: 0.08, radiusZ: 0.28 },
        { center: V(1.24, 0.8, 0), radiusY: 0.03, radiusZ: 0.12 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  fins.add(silhouetteGeometry(DORSAL_FIN, 0.055), V(0, 0, 0));
  fins.add(silhouetteGeometry(TAIL_FIN, 0.075), V(0, 0, 0));
  PADDLES.forEach((paddle) => addLivingPaddle(fins, paddle));

  for (const side of [-1, 1]) {
    // Build nested spherical caps, not thin discs. Their rear halves intersect
    // the skull, so the contact edge follows the head's curve from every angle.
    const eyeSurface = 0.25;
    ellipsoid(
      eyeSocket,
      V(0.78, 0.99, embeddedSideZ(side, eyeSurface, 0.1, 0.15)),
      V(0.12, 0.105, 0.1),
      10,
      7,
    );
    ellipsoid(
      iris,
      V(0.795, 0.992, embeddedSideZ(side, eyeSurface + 0.017, 0.065, 0.17)),
      V(0.065, 0.065, 0.065),
      9,
      7,
    );
    ellipsoid(
      dark,
      V(0.807, 0.992, embeddedSideZ(side, eyeSurface + 0.029, 0.04, 0.18)),
      V(0.027, 0.038, 0.04),
      7,
      5,
    );
    ellipsoid(
      glint,
      V(0.778, 1.018, embeddedSideZ(side, eyeSurface + 0.041, 0.014, 0.08)),
      V(0.012, 0.014, 0.014),
      6,
      4,
    );
  }

  const finMaterial = makeOrganicMaterial(ICHTHYOSAURUS_COLORS.backDark);
  finMaterial.side = THREE.DoubleSide;
  group.add(
    body.toMesh(makeOrganicMaterial(ICHTHYOSAURUS_COLORS.back), 'ichthyosaurus-body-head'),
    belly.toMesh(makeOrganicMaterial(ICHTHYOSAURUS_COLORS.belly), 'ichthyosaurus-belly'),
    fins.toMesh(finMaterial, 'ichthyosaurus-fins'),
    eyeSocket.toMesh(makeOrganicMaterial(ICHTHYOSAURUS_COLORS.back), 'ichthyosaurus-eye-sockets'),
    iris.toMesh(makeOrganicMaterial(ICHTHYOSAURUS_COLORS.iris), 'ichthyosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(ICHTHYOSAURUS_COLORS.dark), 'ichthyosaurus-eye-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'ichthyosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ichthyosaurus-skeleton';
  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const radius = THREE.MathUtils.lerp(0.065, 0.026, index / (SPINE.length - 1));
    ellipsoid(bone, point, V(radius * 1.2, radius, radius), 7, 5);
    if (next) bone.addBetween(point, next, radius * 0.46, radius * 0.36, 6);
  });

  for (const spine of SPINE.slice(1, 6)) {
    for (const side of [-1, 1]) {
      const upper = V(spine.x, spine.y - 0.01, side * 0.045);
      const outer = V(spine.x, spine.y - 0.28, side * 0.33);
      const lower = V(spine.x + 0.025, spine.y - 0.43, side * 0.25);
      bone.addBetween(upper, outer, 0.022, 0.016, 5);
      bone.addBetween(outer, lower, 0.016, 0.009, 5);
    }
  }

  for (const side of [-1, 1]) {
    const front = side > 0 ? PADDLES[0]! : PADDLES[1]!;
    const rear = side > 0 ? PADDLES[2]! : PADDLES[3]!;
    const shoulder = V(0.28, 0.86, side * 0.24);
    const pelvis = V(-0.54, 0.82, side * 0.21);
    shade.addBetween(V(0.52, 0.95, side * 0.05), shoulder, 0.04, 0.026, 6);
    bone.addBetween(shoulder, front.root, 0.03, 0.022, 6);
    bone.addBetween(front.root, V(0.16, 0.61, side * 0.1), 0.026, 0.017, 5);
    shade.addBetween(V(-0.34, 0.91, side * 0.045), pelvis, 0.034, 0.023, 6);
    bone.addBetween(pelvis, rear.root, 0.026, 0.019, 5);
    bone.addBetween(rear.root, V(-0.54, 0.61, side * 0.09), 0.023, 0.015, 5);
  }
  PADDLES.forEach((paddle) => addPaddleBones(bone, paddle));

  bone.add(
    loftGeometry(
      [
        { center: V(0.58, 0.96, 0), radiusY: 0.21, radiusZ: 0.23 },
        { center: V(0.82, 0.95, 0), radiusY: 0.23, radiusZ: 0.25 },
        { center: V(1.05, 0.9, 0), radiusY: 0.16, radiusZ: 0.2 },
        { center: V(1.42, 0.84, 0), radiusY: 0.055, radiusZ: 0.08 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  bone.addBetween(V(0.64, 0.79, 0), V(1.4, 0.77, 0), 0.035, 0.014, 6);

  for (const side of [-1, 1]) {
    // The sclerotic ring is the signature bone inside the enormous orbit.
    shade.add(new THREE.TorusGeometry(0.135, 0.022, 6, 20), V(0.79, 1.03, side * 0.245));
    ellipsoid(dark, V(0.79, 1.03, side * 0.248), V(0.085, 0.09, 0.018), 8, 6);
    ellipsoid(dark, V(1.28, 0.91, side * 0.105), V(0.035, 0.022, 0.009), 6, 4);
  }

  group.add(
    bone.toMesh(makeFlatMaterial(ICHTHYOSAURUS_COLORS.bone), 'ichthyosaurus-skeleton-bones'),
    shade.toMesh(
      makeFlatMaterial(ICHTHYOSAURUS_COLORS.boneShade),
      'ichthyosaurus-sclerotic-rings-girdles',
    ),
    dark.toMesh(makeFlatMaterial(ICHTHYOSAURUS_COLORS.dark), 'ichthyosaurus-skull-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildIchthyosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
