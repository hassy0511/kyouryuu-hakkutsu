import * as THREE from 'three';
import {
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

export const PLESIOSAURUS_COLORS = {
  back: '#5B7FA6',
  backShade: '#4A6D92',
  belly: '#EFE8CC',
  paddleTip: '#41618A',
  iris: '#3E5C40',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const BODY_SPINE = [
  V(-1.15, 0.92, 0),
  V(-0.92, 0.96, 0),
  V(-0.65, 1, 0),
  V(-0.36, 1.02, 0),
  V(-0.06, 1.03, 0),
  V(0.22, 1.04, 0),
  V(0.43, 1.06, 0),
] as const;

const NECK_SPINE = [
  V(0.43, 1.06, 0),
  V(0.62, 1.14, 0),
  V(0.83, 1.19, 0),
  V(1.04, 1.17, 0),
  V(1.25, 1.14, 0),
  V(1.47, 1.18, 0),
  V(1.68, 1.24, 0),
  V(1.86, 1.28, 0),
] as const;

interface PaddleSpec {
  side: -1 | 1;
  root: THREE.Vector3;
  wrist: THREE.Vector3;
  tips: readonly THREE.Vector3[];
}

const PADDLES: readonly PaddleSpec[] = [
  {
    side: 1,
    root: V(0.18, 0.84, 0.48),
    wrist: V(0.46, 0.47, 0.67),
    tips: [
      V(0.88, 0.21, 0.76),
      V(0.8, 0.17, 0.84),
      V(0.69, 0.15, 0.9),
      V(0.58, 0.17, 0.95),
      V(0.48, 0.21, 0.98),
    ],
  },
  {
    side: -1,
    root: V(0.14, 0.86, -0.46),
    wrist: V(0.36, 0.54, -0.64),
    tips: [
      V(0.73, 0.31, -0.73),
      V(0.66, 0.27, -0.8),
      V(0.56, 0.25, -0.86),
      V(0.46, 0.27, -0.91),
      V(0.37, 0.31, -0.94),
    ],
  },
  {
    side: 1,
    root: V(-0.7, 0.78, 0.47),
    wrist: V(-0.94, 0.44, 0.66),
    tips: [
      V(-1.35, 0.2, 0.75),
      V(-1.28, 0.16, 0.83),
      V(-1.18, 0.14, 0.9),
      V(-1.08, 0.16, 0.95),
      V(-0.98, 0.2, 0.98),
    ],
  },
  {
    side: -1,
    root: V(-0.66, 0.8, -0.45),
    wrist: V(-0.85, 0.5, -0.62),
    tips: [
      V(-1.22, 0.29, -0.71),
      V(-1.15, 0.25, -0.78),
      V(-1.05, 0.23, -0.84),
      V(-0.95, 0.25, -0.89),
      V(-0.86, 0.29, -0.92),
    ],
  },
] as const;

const liftPaddlePoint = (point: THREE.Vector3): THREE.Vector3 =>
  V(point.x, point.y + 0.16, point.z);

function addLivingPaddle(
  near: GeometryBatch,
  far: GeometryBatch,
  tips: GeometryBatch,
  paddle: PaddleSpec,
): void {
  const rawOuter = paddle.tips[0];
  const rawInner = paddle.tips[paddle.tips.length - 1];
  if (!rawOuter || !rawInner) return;
  const outer = liftPaddlePoint(rawOuter);
  const inner = liftPaddlePoint(rawInner);
  const wrist = liftPaddlePoint(paddle.wrist);
  const z = paddle.side * (Math.abs(wrist.z) + 0.07);
  const outline = [
    new THREE.Vector2(paddle.root.x - 0.13, paddle.root.y + 0.1),
    new THREE.Vector2(paddle.root.x + 0.16, paddle.root.y + 0.05),
    new THREE.Vector2(outer.x + 0.1, outer.y - 0.04),
    new THREE.Vector2(inner.x - 0.08, inner.y - 0.05),
    new THREE.Vector2(wrist.x - 0.13, wrist.y + 0.12),
  ];
  const batch = paddle.side === 1 ? near : far;
  batch.add(silhouetteGeometry(outline, 0.075), V(0, 0, z));
  ellipsoid(
    tips,
    V((outer.x + inner.x) * 0.5, (outer.y + inner.y) * 0.5, z),
    V(0.16, 0.045, 0.1),
    7,
    5,
  );
}

function addPaddleBones(bone: GeometryBatch, paddle: PaddleSpec): void {
  const wrist = liftPaddlePoint(paddle.wrist);
  const elbow = new THREE.Vector3().lerpVectors(paddle.root, wrist, 0.5);
  bone.addBetween(paddle.root, elbow, 0.035, 0.028, 5);
  bone.addBetween(elbow, wrist, 0.028, 0.021, 5);
  ellipsoid(bone, paddle.root, V(0.06, 0.055, 0.055), 6, 4);
  ellipsoid(bone, elbow, V(0.045, 0.04, 0.04), 6, 4);
  ellipsoid(bone, wrist, V(0.052, 0.038, 0.052), 6, 4);

  paddle.tips.forEach((rawTip, index) => {
    const tip = liftPaddlePoint(rawTip);
    const base = V(
      wrist.x + (index - 2) * 0.012,
      wrist.y + (index - 2) * 0.008,
      wrist.z + (index - 2) * paddle.side * 0.015,
    );
    const middle = new THREE.Vector3().lerpVectors(base, tip, 0.52);
    bone.addBetween(base, middle, 0.017, 0.012, 5);
    bone.addBetween(middle, tip, 0.012, 0.006, 5);
  });
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'plesiosaurus-living';

  const back = new GeometryBatch();
  const farPaddles = new GeometryBatch();
  const belly = new GeometryBatch();
  const paddleTips = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  back.add(
    loftGeometry(
      [
        { center: V(-1.2, 0.9, 0), radiusY: 0.04, radiusZ: 0.055 },
        { center: V(-1.05, 0.93, 0), radiusY: 0.12, radiusZ: 0.15 },
        { center: V(-0.85, 0.96, 0), radiusY: 0.34, radiusZ: 0.42 },
        { center: V(-0.58, 1, 0), radiusY: 0.5, radiusZ: 0.56 },
        { center: V(-0.28, 1.02, 0), radiusY: 0.57, radiusZ: 0.62 },
        { center: V(0.02, 1.03, 0), radiusY: 0.55, radiusZ: 0.6 },
        { center: V(0.28, 1.05, 0), radiusY: 0.45, radiusZ: 0.53 },
        { center: V(0.48, 1.08, 0), radiusY: 0.28, radiusZ: 0.34 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  back.add(
    loftGeometry(
      [
        { center: V(0.38, 1.08, 0), radiusY: 0.27, radiusZ: 0.31 },
        { center: V(0.62, 1.14, 0), radiusY: 0.2, radiusZ: 0.23 },
        { center: V(0.83, 1.19, 0), radiusY: 0.17, radiusZ: 0.19 },
        { center: V(1.04, 1.17, 0), radiusY: 0.155, radiusZ: 0.17 },
        { center: V(1.25, 1.14, 0), radiusY: 0.145, radiusZ: 0.16 },
        { center: V(1.47, 1.18, 0), radiusY: 0.135, radiusZ: 0.15 },
        { center: V(1.68, 1.24, 0), radiusY: 0.125, radiusZ: 0.14 },
        { center: V(1.86, 1.28, 0), radiusY: 0.11, radiusZ: 0.125 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  back.add(
    loftGeometry(
      [
        { center: V(1.78, 1.28, 0), radiusY: 0.11, radiusZ: 0.125 },
        { center: V(1.92, 1.32, 0), radiusY: 0.16, radiusZ: 0.18 },
        { center: V(2.08, 1.32, 0), radiusY: 0.16, radiusZ: 0.19 },
        { center: V(2.17, 1.31, 0), radiusY: 0.08, radiusZ: 0.1 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-0.91, 0.69, 0), radiusY: 0.05, radiusZ: 0.28 },
        { center: V(-0.6, 0.52, 0), radiusY: 0.1, radiusZ: 0.44 },
        { center: V(-0.25, 0.46, 0), radiusY: 0.11, radiusZ: 0.51 },
        { center: V(0.08, 0.5, 0), radiusY: 0.1, radiusZ: 0.49 },
        { center: V(0.34, 0.67, 0), radiusY: 0.08, radiusZ: 0.38 },
        { center: V(0.55, 0.94, 0), radiusY: 0.05, radiusZ: 0.23 },
        { center: V(1.05, 1.02, 0), radiusY: 0.04, radiusZ: 0.14 },
        { center: V(1.55, 1.07, 0), radiusY: 0.03, radiusZ: 0.12 },
        { center: V(2.08, 1.19, 0), radiusY: 0.025, radiusZ: 0.12 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  PADDLES.forEach((paddle) => addLivingPaddle(back, farPaddles, paddleTips, paddle));

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(1.99, 1.39, side * 0.17), V(0.07, 0.067, 0.025), 7, 5);
    ellipsoid(iris, V(2, 1.39, side * 0.192), V(0.043, 0.043, 0.012), 7, 5);
    ellipsoid(dark, V(2.012, 1.39, side * 0.202), V(0.015, 0.025, 0.006), 5, 4);
    ellipsoid(glint, V(1.987, 1.414, side * 0.209), V(0.009, 0.01, 0.004), 5, 4);
    ellipsoid(dark, V(2.12, 1.34, side * 0.09), V(0.018, 0.012, 0.006), 5, 4);
  }

  group.add(
    farPaddles.toMesh(
      makeOrganicMaterial(PLESIOSAURUS_COLORS.backShade),
      'plesiosaurus-far-paddles',
    ),
    back.toMesh(makeOrganicMaterial(PLESIOSAURUS_COLORS.back), 'plesiosaurus-back-body-paddles'),
    belly.toMesh(makeOrganicMaterial(PLESIOSAURUS_COLORS.belly), 'plesiosaurus-belly'),
    paddleTips.toMesh(
      makeOrganicMaterial(PLESIOSAURUS_COLORS.paddleTip),
      'plesiosaurus-paddle-tips',
    ),
    iris.toMesh(makeOrganicMaterial(PLESIOSAURUS_COLORS.iris), 'plesiosaurus-irises'),
    dark.toMesh(makeOrganicMaterial(PLESIOSAURUS_COLORS.dark), 'plesiosaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'plesiosaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'plesiosaurus-skeleton';

  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  const spine = [...BODY_SPINE, ...NECK_SPINE.slice(1)];
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    const bodyEnd = BODY_SPINE.length - 1;
    const radius = index <= bodyEnd ? 0.055 : 0.038;
    ellipsoid(bone, point, V(radius * 1.25, radius, radius), 6, 4);
    if (next) bone.addBetween(point, next, radius * 0.45, radius * 0.36, 5);
  });

  for (const spinePoint of BODY_SPINE.slice(1, -1)) {
    for (const side of [-1, 1]) {
      const upper = V(spinePoint.x, spinePoint.y - 0.01, side * 0.045);
      const outer = V(spinePoint.x, spinePoint.y - 0.32, side * 0.43);
      const lower = V(spinePoint.x + 0.02, spinePoint.y - 0.5, side * 0.33);
      bone.addBetween(upper, outer, 0.018, 0.012, 5);
      bone.addBetween(outer, lower, 0.012, 0.007, 5);
    }
  }

  for (const side of [-1, 1]) {
    const frontPaddle = (side > 0 ? PADDLES[0] : PADDLES[1])!;
    const rearPaddle = (side > 0 ? PADDLES[2] : PADDLES[3])!;

    const pectoralBar = V(-0.02, 0.77, side * 0.34);
    shade.addBetween(V(0.36, 1.02, side * 0.05), pectoralBar, 0.04, 0.027, 5);
    bone.addBetween(pectoralBar, frontPaddle.root, 0.032, 0.023, 5);
    bone.addBetween(frontPaddle.root, V(0.16, 0.59, side * 0.12), 0.029, 0.019, 5);
    bone.addBetween(V(0.16, 0.59, side * 0.12), V(0.16, 0.58, 0), 0.019, 0.013, 5);

    const pelvicBar = V(-0.92, 0.78, side * 0.34);
    shade.addBetween(V(-0.5, 0.98, side * 0.05), pelvicBar, 0.038, 0.025, 5);
    bone.addBetween(pelvicBar, rearPaddle.root, 0.03, 0.022, 5);
    bone.addBetween(rearPaddle.root, V(-0.68, 0.56, side * 0.12), 0.027, 0.018, 5);
    bone.addBetween(V(-0.68, 0.56, side * 0.12), V(-0.68, 0.55, 0), 0.018, 0.012, 5);
  }
  PADDLES.forEach((paddle) => addPaddleBones(bone, paddle));

  ellipsoid(bone, V(1.98, 1.32, 0), V(0.2, 0.15, 0.18), 8, 5);
  ellipsoid(bone, V(2.12, 1.3, 0), V(0.15, 0.1, 0.13), 7, 5);
  bone.addBetween(V(1.84, 1.21, 0), V(2.17, 1.19, 0), 0.025, 0.012, 5);
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(1.98, 1.39, side * 0.15), V(0.075, 0.065, 0.025), 6, 4);
    ellipsoid(dark, V(2.1, 1.34, side * 0.12), V(0.025, 0.018, 0.008), 5, 4);
  }

  group.add(
    bone.toMesh(makeFlatMaterial(PLESIOSAURUS_COLORS.bone), 'plesiosaurus-skeleton-bones'),
    shade.toMesh(makeFlatMaterial(PLESIOSAURUS_COLORS.boneShade), 'plesiosaurus-skeleton-girdles'),
    dark.toMesh(makeFlatMaterial(PLESIOSAURUS_COLORS.dark), 'plesiosaurus-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildPlesiosaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
