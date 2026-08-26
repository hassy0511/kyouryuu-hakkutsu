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

export const ARCHELON_COLORS = {
  shell: '#6E5A43',
  shellRidge: '#5C4A37',
  body: '#8A9B7E',
  bodyShade: '#708269',
  belly: '#EFE6C8',
  beak: '#D9C9A0',
  iris: '#465E43',
  bone: '#F2EAD8',
  boneShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

interface FlipperSpec {
  side: -1 | 1;
  front: boolean;
  root: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  tips: readonly THREE.Vector3[];
}

const FLIPPERS: readonly FlipperSpec[] = [
  {
    side: 1,
    front: true,
    root: V(0.62, 0.95, 0.76),
    elbow: V(0.28, 0.7, 1.22),
    wrist: V(-0.15, 0.5, 1.72),
    tips: [
      V(-0.72, 0.34, 2.28),
      V(-0.55, 0.29, 2.35),
      V(-0.35, 0.27, 2.39),
      V(-0.15, 0.3, 2.38),
      V(0.03, 0.36, 2.32),
    ],
  },
  {
    side: -1,
    front: true,
    root: V(0.58, 0.98, -0.73),
    elbow: V(0.38, 0.78, -1.14),
    wrist: V(0.05, 0.61, -1.58),
    tips: [
      V(-0.45, 0.49, -2.08),
      V(-0.28, 0.44, -2.15),
      V(-0.09, 0.42, -2.19),
      V(0.1, 0.45, -2.18),
      V(0.27, 0.5, -2.12),
    ],
  },
  {
    side: 1,
    front: false,
    root: V(-0.94, 0.8, 0.66),
    elbow: V(-1.14, 0.64, 0.89),
    wrist: V(-1.35, 0.53, 1.12),
    tips: [
      V(-1.67, 0.45, 1.38),
      V(-1.58, 0.41, 1.45),
      V(-1.47, 0.4, 1.5),
      V(-1.36, 0.42, 1.51),
      V(-1.26, 0.46, 1.48),
    ],
  },
  {
    side: -1,
    front: false,
    root: V(-0.91, 0.82, -0.63),
    elbow: V(-1.08, 0.69, -0.84),
    wrist: V(-1.27, 0.6, -1.04),
    tips: [
      V(-1.55, 0.54, -1.28),
      V(-1.47, 0.5, -1.35),
      V(-1.37, 0.49, -1.39),
      V(-1.27, 0.51, -1.4),
      V(-1.18, 0.55, -1.37),
    ],
  },
] as const;

function quaternionFromX(direction: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), direction.clone().normalize());
}

function addLivingFlipper(near: GeometryBatch, far: GeometryBatch, flipper: FlipperSpec): void {
  const outer = flipper.tips[0];
  const inner = flipper.tips[flipper.tips.length - 1];
  if (!outer || !inner) return;
  const tipCenter = new THREE.Vector3().addVectors(outer, inner).multiplyScalar(0.5);
  const center = new THREE.Vector3().addVectors(flipper.root, tipCenter).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(tipCenter, flipper.root);
  const length = direction.length();
  const batch = flipper.side === 1 ? near : far;

  ellipsoid(
    batch,
    center,
    V(length * 0.56, flipper.front ? 0.24 : 0.16, flipper.front ? 0.38 : 0.25),
    flipper.front ? 11 : 9,
    6,
    quaternionFromX(direction),
  );
  ellipsoid(
    batch,
    flipper.root,
    V(flipper.front ? 0.38 : 0.27, flipper.front ? 0.25 : 0.18, flipper.front ? 0.42 : 0.3),
    9,
    6,
  );
}

function addFlipperBones(bone: GeometryBatch, flipper: FlipperSpec): void {
  bone.addBetween(flipper.root, flipper.elbow, flipper.front ? 0.055 : 0.04, 0.04, 6);
  bone.addBetween(flipper.elbow, flipper.wrist, 0.04, 0.028, 6);
  ellipsoid(bone, flipper.root, V(0.09, 0.08, 0.08), 7, 5);
  ellipsoid(bone, flipper.elbow, V(0.065, 0.055, 0.055), 7, 5);
  ellipsoid(bone, flipper.wrist, V(0.07, 0.05, 0.07), 7, 5);

  flipper.tips.forEach((tip, index) => {
    const base = V(
      flipper.wrist.x + (index - 2) * 0.025,
      flipper.wrist.y + (index - 2) * 0.01,
      flipper.wrist.z + (index - 2) * flipper.side * 0.035,
    );
    const middle = new THREE.Vector3().lerpVectors(base, tip, 0.48);
    bone.addBetween(base, middle, 0.026, 0.018, 5);
    bone.addBetween(middle, tip, 0.018, 0.008, 5);
  });
}

function addShellRidges(ridges: GeometryBatch): void {
  const shellSurfaceY = (x: number, z: number): number => {
    const normalizedX = (x + 0.12) / 1.47;
    const normalizedZ = z / 1.06;
    const dome = Math.sqrt(
      Math.max(0.03, 1 - normalizedX * normalizedX - normalizedZ * normalizedZ),
    );
    return 1.05 + dome * 0.54 + 0.035;
  };

  for (const z of [-0.72, -0.36, 0, 0.36, 0.72]) {
    const points = [-1.18, -0.65, -0.12, 0.43, 0.98].map((x) => V(x, shellSurfaceY(x, z), z));
    points.slice(0, -1).forEach((point, index) => {
      const next = points[index + 1];
      if (next) ridges.addBetween(point, next, 0.025, 0.021, 6);
    });
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'archelon-living';

  const farBody = new GeometryBatch();
  const body = new GeometryBatch();
  const shell = new GeometryBatch();
  const shellRidges = new GeometryBatch();
  const belly = new GeometryBatch();
  const beak = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  ellipsoid(shell, V(-0.12, 1.05, 0), V(1.47, 0.54, 1.06), 18, 10);
  addShellRidges(shellRidges);
  ellipsoid(belly, V(-0.12, 0.63, 0), V(1.27, 0.25, 0.86), 14, 8);

  body.add(
    loftGeometry(
      [
        { center: V(0.92, 0.98, 0), radiusY: 0.27, radiusZ: 0.36 },
        { center: V(1.18, 1, 0), radiusY: 0.28, radiusZ: 0.34 },
        { center: V(1.42, 1.04, 0), radiusY: 0.26, radiusZ: 0.31 },
        { center: V(1.6, 1.08, 0), radiusY: 0.22, radiusZ: 0.27 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  ellipsoid(body, V(1.68, 1.1, 0), V(0.34, 0.3, 0.32), 11, 7);

  beak.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(1.72, 1.24),
        new THREE.Vector2(2.04, 1.22),
        new THREE.Vector2(2.13, 1.08),
        new THREE.Vector2(2.05, 0.92),
        new THREE.Vector2(1.98, 0.84),
        new THREE.Vector2(1.98, 1.01),
        new THREE.Vector2(1.72, 0.96),
      ],
      0.23,
    ),
    V(0, 0, 0),
  );

  body.add(
    loftGeometry(
      [
        { center: V(-1.28, 0.88, 0), radiusY: 0.18, radiusZ: 0.24 },
        { center: V(-1.56, 0.82, 0), radiusY: 0.12, radiusZ: 0.16 },
        { center: V(-1.78, 0.77, 0), radiusY: 0.04, radiusZ: 0.055 },
      ],
      8,
    ),
    V(0, 0, 0),
  );

  FLIPPERS.forEach((flipper) => addLivingFlipper(body, farBody, flipper));

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(1.72, 1.24, side * 0.29), V(0.105, 0.1, 0.035), 7, 5);
    ellipsoid(iris, V(1.73, 1.24, side * 0.323), V(0.063, 0.063, 0.016), 7, 5);
    ellipsoid(dark, V(1.745, 1.24, side * 0.337), V(0.021, 0.034, 0.007), 5, 4);
    ellipsoid(glint, V(1.71, 1.275, side * 0.345), V(0.013, 0.014, 0.004), 5, 4);
  }

  group.add(
    farBody.toMesh(makeOrganicMaterial(ARCHELON_COLORS.bodyShade), 'archelon-far-flippers'),
    body.toMesh(makeOrganicMaterial(ARCHELON_COLORS.body), 'archelon-body-flippers'),
    belly.toMesh(makeOrganicMaterial(ARCHELON_COLORS.belly), 'archelon-belly'),
    shell.toMesh(makeOrganicMaterial(ARCHELON_COLORS.shell), 'archelon-leathery-shell'),
    shellRidges.toMesh(makeOrganicMaterial(ARCHELON_COLORS.shellRidge), 'archelon-shell-ridges'),
    beak.toMesh(makeOrganicMaterial(ARCHELON_COLORS.beak), 'archelon-hooked-beak'),
    iris.toMesh(makeOrganicMaterial(ARCHELON_COLORS.iris), 'archelon-irises'),
    dark.toMesh(makeOrganicMaterial(ARCHELON_COLORS.dark), 'archelon-eye-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'archelon-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function addShellFramework(bone: GeometryBatch): void {
  bone.add(
    new THREE.TorusGeometry(1, 0.045, 6, 32),
    V(-0.12, 1.02, 0),
    V(1.38, 1.02, 1),
    new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2),
  );

  for (const z of [-0.72, -0.36, 0, 0.36, 0.72]) {
    const edgeFactor = 1 - Math.abs(z) * 0.24;
    const points = [
      V(-1.35, 1.03, z),
      V(-0.75, 1.28 * edgeFactor + 0.11, z),
      V(-0.12, 1.44 * edgeFactor + 0.11, z),
      V(0.52, 1.29 * edgeFactor + 0.11, z),
      V(1.12, 1.03, z),
    ];
    points.slice(0, -1).forEach((point, index) => {
      const next = points[index + 1];
      if (next) bone.addBetween(point, next, 0.034, 0.028, 6);
    });
  }

  for (const x of [-0.92, -0.52, -0.12, 0.28, 0.68]) {
    const normalized = Math.abs((x + 0.12) / 1.3);
    const zExtent = 0.94 * Math.sqrt(Math.max(0.2, 1 - normalized * normalized));
    const crestY = 1.48 - normalized * 0.16;
    const left = V(x, 1.03, -zExtent);
    const crest = V(x, crestY, 0);
    const right = V(x, 1.03, zExtent);
    bone.addBetween(left, crest, 0.032, 0.027, 6);
    bone.addBetween(crest, right, 0.027, 0.032, 6);
  }
}

function buildSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'archelon-skeleton';

  const bone = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();

  addShellFramework(bone);
  const spine = [
    V(-1.55, 0.84, 0),
    V(-1.2, 0.94, 0),
    V(-0.75, 1.06, 0),
    V(-0.25, 1.1, 0),
    V(0.25, 1.1, 0),
    V(0.72, 1.07, 0),
    V(1.12, 1.05, 0),
    V(1.45, 1.08, 0),
  ];
  spine.forEach((point, index) => {
    const next = spine[index + 1];
    const radius = index < 2 ? 0.04 : 0.055;
    ellipsoid(bone, point, V(radius * 1.25, radius, radius), 6, 4);
    if (next) bone.addBetween(point, next, radius * 0.45, radius * 0.35, 5);
  });

  ellipsoid(shade, V(0.67, 1, 0), V(0.29, 0.18, 0.51), 8, 5);
  ellipsoid(shade, V(-0.9, 0.94, 0), V(0.27, 0.17, 0.48), 8, 5);
  FLIPPERS.forEach((flipper) => addFlipperBones(bone, flipper));

  ellipsoid(bone, V(1.63, 1.1, 0), V(0.33, 0.27, 0.31), 9, 6);
  bone.add(
    silhouetteGeometry(
      [
        new THREE.Vector2(1.72, 1.22),
        new THREE.Vector2(2.06, 1.19),
        new THREE.Vector2(2.11, 1.05),
        new THREE.Vector2(2.02, 0.91),
        new THREE.Vector2(1.98, 1.02),
        new THREE.Vector2(1.72, 0.97),
      ],
      0.2,
    ),
    V(0, 0, 0),
  );
  for (const side of [-1, 1]) {
    ellipsoid(dark, V(1.66, 1.22, side * 0.26), V(0.11, 0.1, 0.035), 7, 5);
    ellipsoid(dark, V(1.91, 1.12, side * 0.19), V(0.045, 0.03, 0.012), 5, 4);
  }

  group.add(
    bone.toMesh(makeFlatMaterial(ARCHELON_COLORS.bone), 'archelon-skeleton-bones-frame'),
    shade.toMesh(makeFlatMaterial(ARCHELON_COLORS.boneShade), 'archelon-skeleton-girdles'),
    dark.toMesh(makeFlatMaterial(ARCHELON_COLORS.dark), 'archelon-skeleton-openings'),
  );
  setShadowFlags(group);
  return group;
}

export function buildArchelon(): DinoViews {
  return { skeleton: buildSkeleton(), living: buildLiving() };
}
