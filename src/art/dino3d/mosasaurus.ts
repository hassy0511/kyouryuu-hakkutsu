import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

export const MOSASAURUS_COLORS = {
  back: '#3E6E7E',
  backShade: '#315B69',
  belly: '#EDE6CB',
  tailFin: '#2E5260',
  iris: '#C6A538',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const SPINE = [
  V(4.35, 2.25, 0),
  V(3.55, 2.23, 0),
  V(2.65, 2.2, 0),
  V(1.7, 2.15, 0),
  V(0.7, 2.08, 0),
  V(-0.3, 2.02, 0),
  V(-1.3, 1.98, 0),
  V(-2.25, 1.96, 0),
  V(-3.15, 1.94, 0),
  V(-4, 1.91, 0),
  V(-4.75, 1.85, 0),
  V(-5.4, 1.73, 0),
  V(-5.95, 1.55, 0),
  V(-6.42, 1.34, 0),
  V(-6.82, 1.12, 0),
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
    root: V(2.15, 1.88, 0.66),
    wrist: V(1.45, 1.25, 0.94),
    tips: [
      V(0.28, 0.94, 1.02),
      V(0.42, 0.88, 1.14),
      V(0.58, 0.86, 1.25),
      V(0.74, 0.89, 1.34),
      V(0.9, 0.94, 1.39),
    ],
  },
  {
    side: -1,
    rear: false,
    root: V(2.08, 1.9, -0.62),
    wrist: V(1.6, 1.36, -0.88),
    tips: [
      V(0.58, 1.04, -0.96),
      V(0.7, 0.98, -1.08),
      V(0.86, 0.96, -1.18),
      V(1.02, 0.99, -1.26),
      V(1.18, 1.04, -1.31),
    ],
  },
  {
    side: 1,
    rear: true,
    root: V(-1.7, 1.8, 0.65),
    wrist: V(-2.15, 1.28, 0.87),
    tips: [
      V(-3.07, 1.02, 0.94),
      V(-2.98, 0.96, 1.04),
      V(-2.86, 0.94, 1.13),
      V(-2.73, 0.97, 1.2),
      V(-2.6, 1.02, 1.24),
    ],
  },
  {
    side: -1,
    rear: true,
    root: V(-1.62, 1.82, -0.61),
    wrist: V(-1.94, 1.39, -0.82),
    tips: [
      V(-2.75, 1.16, -0.9),
      V(-2.66, 1.1, -1),
      V(-2.54, 1.08, -1.08),
      V(-2.42, 1.11, -1.15),
      V(-2.3, 1.16, -1.19),
    ],
  },
] as const;

function addLivingPaddle(
  near: GeometryBatch,
  far: GeometryBatch,
  accents: GeometryBatch,
  paddle: PaddleSpec,
): void {
  const batch = paddle.side === 1 ? near : far;
  const z = paddle.side * (Math.abs(paddle.wrist.z) + 0.08);
  const wrist = paddle.wrist;
  const outerTip = paddle.tips[0];
  const innerTip = paddle.tips[paddle.tips.length - 1];
  if (!outerTip || !innerTip) return;

  const outline = paddle.rear
    ? [
        new THREE.Vector2(paddle.root.x + 0.25, paddle.root.y + 0.12),
        new THREE.Vector2(paddle.root.x - 0.12, paddle.root.y - 0.2),
        new THREE.Vector2(outerTip.x - 0.08, outerTip.y - 0.08),
        new THREE.Vector2(innerTip.x + 0.15, innerTip.y + 0.12),
        new THREE.Vector2(wrist.x + 0.18, wrist.y + 0.18),
      ]
    : [
        new THREE.Vector2(paddle.root.x + 0.3, paddle.root.y + 0.16),
        new THREE.Vector2(paddle.root.x - 0.15, paddle.root.y - 0.22),
        new THREE.Vector2(outerTip.x - 0.12, outerTip.y - 0.08),
        new THREE.Vector2(innerTip.x + 0.18, innerTip.y + 0.13),
        new THREE.Vector2(wrist.x + 0.24, wrist.y + 0.22),
      ];

  batch.add(silhouetteGeometry(outline, 0.14), V(0, 0, z));
  const accentPoint = V((outerTip.x + innerTip.x) * 0.5, (outerTip.y + innerTip.y) * 0.5, z);
  ellipsoid(
    accents,
    accentPoint,
    V(paddle.rear ? 0.34 : 0.42, 0.09, 0.18),
    8,
    5,
    new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.17),
  );
}

function addPaddleBones(bone: GeometryBatch, paddle: PaddleSpec): void {
  const elbow = V(
    THREE.MathUtils.lerp(paddle.root.x, paddle.wrist.x, 0.48),
    THREE.MathUtils.lerp(paddle.root.y, paddle.wrist.y, 0.48),
    THREE.MathUtils.lerp(paddle.root.z, paddle.wrist.z, 0.48),
  );
  bone.addBetween(paddle.root, elbow, 0.075, 0.06, 6);
  bone.addBetween(elbow, paddle.wrist, 0.06, 0.045, 6);
  ellipsoid(bone, paddle.root, V(0.11, 0.1, 0.1), 7, 5);
  ellipsoid(bone, elbow, V(0.085, 0.075, 0.075), 7, 5);
  ellipsoid(bone, paddle.wrist, V(0.09, 0.065, 0.09), 7, 5);

  paddle.tips.forEach((tip, index) => {
    const base = V(
      paddle.wrist.x + (index - 2) * 0.035,
      paddle.wrist.y + (index - 2) * 0.018,
      paddle.wrist.z + (index - 2) * paddle.side * 0.025,
    );
    const middle = new THREE.Vector3().lerpVectors(base, tip, 0.5);
    bone.addBetween(base, middle, 0.035, 0.025, 5);
    bone.addBetween(middle, tip, 0.025, 0.012, 5);
  });
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mosasaurus-living';

  const back = new GeometryBatch();
  const farPaddles = new GeometryBatch();
  const belly = new GeometryBatch();
  const tailFin = new GeometryBatch();
  const paddleTips = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const teeth = new GeometryBatch();
  const glint = new GeometryBatch();

  back.add(
    loftGeometry(
      [
        { center: V(-6.82, 1.12, 0), radiusY: 0.06, radiusZ: 0.08 },
        { center: V(-6.42, 1.34, 0), radiusY: 0.13, radiusZ: 0.17 },
        { center: V(-5.95, 1.55, 0), radiusY: 0.25, radiusZ: 0.3 },
        { center: V(-5.4, 1.73, 0), radiusY: 0.4, radiusZ: 0.48 },
        { center: V(-4.75, 1.85, 0), radiusY: 0.55, radiusZ: 0.63 },
        { center: V(-4, 1.91, 0), radiusY: 0.7, radiusZ: 0.76 },
        { center: V(-3.15, 1.94, 0), radiusY: 0.82, radiusZ: 0.88 },
        { center: V(-2.25, 1.96, 0), radiusY: 0.94, radiusZ: 0.98 },
        { center: V(-1.3, 1.98, 0), radiusY: 1.03, radiusZ: 1.05 },
        { center: V(-0.3, 2.02, 0), radiusY: 1.08, radiusZ: 1.08 },
        { center: V(0.7, 2.08, 0), radiusY: 1.04, radiusZ: 1.05 },
        { center: V(1.7, 2.15, 0), radiusY: 0.95, radiusZ: 0.99 },
        { center: V(2.65, 2.2, 0), radiusY: 0.84, radiusZ: 0.91 },
        { center: V(3.55, 2.23, 0), radiusY: 0.73, radiusZ: 0.84 },
        { center: V(4.25, 2.24, 0), radiusY: 0.64, radiusZ: 0.79 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  back.add(
    loftGeometry(
      [
        { center: V(3.95, 2.25, 0), radiusY: 0.63, radiusZ: 0.79 },
        { center: V(4.55, 2.3, 0), radiusY: 0.72, radiusZ: 0.88 },
        { center: V(5.25, 2.3, 0), radiusY: 0.74, radiusZ: 0.92 },
        { center: V(5.95, 2.27, 0), radiusY: 0.67, radiusZ: 0.86 },
        { center: V(6.65, 2.22, 0), radiusY: 0.55, radiusZ: 0.74 },
        { center: V(7.25, 2.17, 0), radiusY: 0.39, radiusZ: 0.55 },
        { center: V(7.72, 2.14, 0), radiusY: 0.17, radiusZ: 0.26 },
      ],
      12,
    ),
    V(0, 0, 0),
  );

  belly.add(
    loftGeometry(
      [
        { center: V(-4.25, 1.44, 0), radiusY: 0.08, radiusZ: 0.48 },
        { center: V(-3.1, 1.16, 0), radiusY: 0.16, radiusZ: 0.7 },
        { center: V(-1.8, 1.02, 0), radiusY: 0.2, radiusZ: 0.86 },
        { center: V(-0.3, 0.98, 0), radiusY: 0.22, radiusZ: 0.94 },
        { center: V(1.2, 1.1, 0), radiusY: 0.2, radiusZ: 0.87 },
        { center: V(2.7, 1.38, 0), radiusY: 0.17, radiusZ: 0.75 },
        { center: V(4.1, 1.7, 0), radiusY: 0.13, radiusZ: 0.66 },
        { center: V(5.4, 1.67, 0), radiusY: 0.12, radiusZ: 0.7 },
        { center: V(6.6, 1.7, 0), radiusY: 0.09, radiusZ: 0.55 },
        { center: V(7.5, 1.92, 0), radiusY: 0.04, radiusZ: 0.25 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  tailFin.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(-6.75, 1.2),
        new THREE.Vector2(-6.62, 2.1),
        new THREE.Vector2(-6.05, 3.25),
        new THREE.Vector2(-5.52, 2.18),
        new THREE.Vector2(-5.38, 1.7),
      ],
      0.2,
    ),
    V(0, 0, 0),
  );

  PADDLES.forEach((paddle) => addLivingPaddle(back, farPaddles, paddleTips, paddle));

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(5.45, 2.57, side * 0.82), V(0.22, 0.2, 0.06), 8, 6);
    ellipsoid(iris, V(5.47, 2.58, side * 0.875), V(0.13, 0.13, 0.028), 8, 6);
    ellipsoid(dark, V(5.5, 2.58, side * 0.898), V(0.045, 0.075, 0.012), 6, 4);
    ellipsoid(glint, V(5.43, 2.65, side * 0.912), V(0.026, 0.03, 0.008), 5, 4);
    ellipsoid(dark, V(7.05, 2.38, side * 0.52), V(0.08, 0.05, 0.02), 6, 4);
    dark.add(new THREE.BoxGeometry(2.8, 0.045, 0.03), V(6.22, 1.85, side * 0.64));

    for (let index = 0; index < 9; index += 1) {
      const x = 5.08 + index * 0.28;
      coneBetween(teeth, V(x, 1.91, side * 0.62), V(x + 0.02, 1.75, side * 0.62), 0.034, 5);
    }
  }

  group.add(
    farPaddles.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.backShade), 'mosasaurus-far-paddles'),
    back.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.back), 'mosasaurus-back-body-paddles'),
    belly.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.belly), 'mosasaurus-belly'),
    tailFin.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.tailFin), 'mosasaurus-upper-tail-fin'),
    paddleTips.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.tailFin), 'mosasaurus-paddle-tips'),
    teeth.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.belly), 'mosasaurus-teeth'),
    iris.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.iris), 'mosasaurus-irises'),
    dark.toMesh(makeOrganicMaterial(MOSASAURUS_COLORS.dark), 'mosasaurus-face-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'mosasaurus-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mosasaurus-skeleton';

  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  SPINE.forEach((point, index) => {
    const next = SPINE[index + 1];
    const scale = THREE.MathUtils.lerp(0.15, 0.055, index / (SPINE.length - 1));
    ellipsoid(bone, point, V(scale * 1.25, scale, scale), 7, 5);
    if (next) bone.addBetween(point, next, scale * 0.48, scale * 0.38, 6);
  });

  for (const spine of SPINE.slice(2, 10)) {
    for (const side of [-1, 1]) {
      const upper = V(spine.x, spine.y - 0.02, side * 0.11);
      const outer = V(spine.x + 0.03, spine.y - 0.58, side * 0.72);
      const lower = V(spine.x + 0.08, spine.y - 0.94, side * 0.55);
      bone.addBetween(upper, outer, 0.042, 0.03, 5);
      bone.addBetween(outer, lower, 0.03, 0.018, 5);
    }
  }

  for (const side of [-1, 1]) {
    const frontPaddle = (side > 0 ? PADDLES[0] : PADDLES[1])!;
    const rearPaddle = (side > 0 ? PADDLES[2] : PADDLES[3])!;

    // Marine girdles are broad, but expressed as connected bars rather than
    // solid body-like ellipsoids so the paddle roots remain readable.
    const shoulderBlade = V(1.72, 1.84, side * 0.54);
    shade.addBetween(V(2.55, 2.12, side * 0.12), shoulderBlade, 0.085, 0.055, 6);
    bone.addBetween(shoulderBlade, frontPaddle.root, 0.06, 0.045, 6);
    bone.addBetween(frontPaddle.root, V(2.08, 1.5, side * 0.18), 0.055, 0.035, 6);
    bone.addBetween(V(2.08, 1.5, side * 0.18), V(2.08, 1.48, 0), 0.035, 0.025, 5);

    const pelvicBlade = V(-2.18, 1.86, side * 0.56);
    shade.addBetween(V(-1.28, 1.98, side * 0.12), pelvicBlade, 0.08, 0.052, 6);
    bone.addBetween(pelvicBlade, rearPaddle.root, 0.058, 0.043, 6);
    bone.addBetween(rearPaddle.root, V(-1.72, 1.46, side * 0.17), 0.05, 0.032, 6);
    bone.addBetween(V(-1.72, 1.46, side * 0.17), V(-1.72, 1.44, 0), 0.032, 0.023, 5);
  }
  PADDLES.forEach((paddle) => addPaddleBones(bone, paddle));

  bone.addBetween(V(4.08, 2.22, 0), V(4.55, 2.28, 0), 0.1, 0.08, 6);
  ellipsoid(bone, V(5.05, 2.3, 0), V(0.74, 0.54, 0.78), 10, 7);
  ellipsoid(bone, V(5.95, 2.26, 0), V(0.9, 0.46, 0.72), 10, 6);
  ellipsoid(bone, V(6.88, 2.18, 0), V(0.88, 0.34, 0.58), 9, 6);
  bone.addBetween(V(4.58, 1.9, 0), V(7.56, 1.72, 0), 0.085, 0.045, 6);

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(5.33, 2.54, side * 0.7), V(0.28, 0.22, 0.07), 7, 5);
    ellipsoid(dark, V(6.1, 2.33, side * 0.63), V(0.3, 0.16, 0.06), 7, 5);
    ellipsoid(dark, V(7.02, 2.36, side * 0.48), V(0.08, 0.05, 0.02), 6, 4);
    for (let index = 0; index < 9; index += 1) {
      const x = 4.92 + index * 0.29;
      coneBetween(bone, V(x, 1.93, side * 0.58), V(x + 0.02, 1.75, side * 0.58), 0.034, 5);
    }
  }

  group.add(
    bone.toMesh(makeFlatMaterial(MOSASAURUS_COLORS.bone), 'mosasaurus-skeleton-bones'),
    shade.toMesh(makeFlatMaterial(MOSASAURUS_COLORS.boneShade), 'mosasaurus-skeleton-girdles'),
    dark.toMesh(makeFlatMaterial(MOSASAURUS_COLORS.dark), 'mosasaurus-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildMosasaurus(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
