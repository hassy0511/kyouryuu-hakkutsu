import * as THREE from 'three';
import {
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const BELEMNITE_COLORS = {
  back: '#C77A5A',
  belly: '#EFDCC8',
  fin: '#A85F4E',
  iris: '#C68B38',
  fossil: '#E8DCC4',
  fossilShade: '#CBB99A',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const Y_AXIS = V(0, 1, 0);

function addCurvedArm(
  arms: GeometryBatch,
  tips: GeometryBatch,
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  long: boolean,
): void {
  const steps = long ? 5 : 4;
  let previous = start;
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const inverse = 1 - t;
    const point = V(
      inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
      inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z,
    );
    arms.addBetween(previous, point, long ? 0.007 : 0.006, long ? 0.0032 : 0.0028, 6);
    previous = point;
  }
  ellipsoid(tips, end, V(long ? 0.007 : 0.005, 0.0045, 0.0045), 6, 4);
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'belemnite-living';

  const body = new GeometryBatch();
  const belly = new GeometryBatch();
  const fins = new GeometryBatch();
  const arms = new GeometryBatch();
  const tips = new GeometryBatch();
  const iris = new GeometryBatch();
  const dark = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-0.27, 0.12, 0), radiusY: 0.006, radiusZ: 0.006 },
        { center: V(-0.22, 0.12, 0), radiusY: 0.033, radiusZ: 0.03 },
        { center: V(-0.08, 0.12, 0), radiusY: 0.07, radiusZ: 0.064 },
        { center: V(0.035, 0.12, 0), radiusY: 0.056, radiusZ: 0.053 },
        { center: V(0.075, 0.12, 0), radiusY: 0.044, radiusZ: 0.046 },
      ],
      12,
    ),
    V(0, 0, 0),
  );
  ellipsoid(body, V(0.085, 0.12, 0), V(0.062, 0.052, 0.052), 11, 8);
  ellipsoid(belly, V(-0.055, 0.085, 0), V(0.15, 0.029, 0.053), 12, 7);

  // Paired fins sit on the rear mantle and remain visibly separate from the arms.
  for (const side of [-1, 1]) {
    ellipsoid(fins, V(-0.15, 0.12, side * 0.058), V(0.105, 0.018, 0.072), 10, 6);
  }

  const armEnds = [
    V(0.215, 0.184, 0.018),
    V(0.232, 0.168, 0.038),
    V(0.242, 0.143, 0.052),
    V(0.238, 0.113, 0.058),
    V(0.225, 0.082, 0.046),
    V(0.213, 0.058, 0.018),
    V(0.23, 0.069, -0.035),
    V(0.242, 0.096, -0.052),
    V(0.24, 0.132, -0.05),
    V(0.225, 0.164, -0.032),
  ] as const;
  armEnds.forEach((end, index) => {
    const long = index === 2 || index === 7;
    const start = V(0.118, 0.12 + (index - 4.5) * 0.004, (index - 4.5) * 0.009);
    const control = V(long ? 0.205 : 0.175, end.y + (index % 2 === 0 ? 0.01 : -0.006), end.z * 0.7);
    addCurvedArm(arms, tips, start, control, end, long);
  });

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(0.105, 0.142, side * 0.046), V(0.019, 0.018, 0.006), 7, 5);
    ellipsoid(iris, V(0.108, 0.143, side * 0.051), V(0.011, 0.012, 0.003), 7, 5);
    ellipsoid(dark, V(0.111, 0.143, side * 0.053), V(0.004, 0.006, 0.0015), 5, 4);
    ellipsoid(glint, V(0.107, 0.149, side * 0.055), V(0.0025, 0.0028, 0.0008), 5, 4);
  }

  group.add(
    body.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.back), 'belemnite-mantle-head'),
    belly.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.belly), 'belemnite-belly'),
    fins.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.fin), 'belemnite-fins'),
    arms.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.back), 'belemnite-arms'),
    tips.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.belly), 'belemnite-arm-tips'),
    iris.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.iris), 'belemnite-irises'),
    dark.toMesh(makeOrganicMaterial(BELEMNITE_COLORS.dark), 'belemnite-eye-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'belemnite-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildFossil(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'belemnite-skeleton-rostrum';
  const fossil = new GeometryBatch();
  const growthLines = new GeometryBatch();

  fossil.add(
    loftGeometry(
      [
        { center: V(-0.25, 0.1, 0), radiusY: 0.004, radiusZ: 0.004 },
        { center: V(-0.18, 0.1, 0), radiusY: 0.018, radiusZ: 0.018 },
        { center: V(-0.02, 0.1, 0), radiusY: 0.038, radiusZ: 0.038 },
        { center: V(0.13, 0.1, 0), radiusY: 0.043, radiusZ: 0.043 },
        { center: V(0.2, 0.1, 0), radiusY: 0.027, radiusZ: 0.027 },
      ],
      11,
    ),
    V(0, 0, 0),
  );

  const ringRotation = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.PI / 2);
  for (const [x, radius] of [
    [-0.12, 0.026],
    [-0.03, 0.036],
    [0.06, 0.041],
    [0.14, 0.039],
  ] as const) {
    growthLines.add(
      new THREE.TorusGeometry(radius, 0.0016, 5, 18),
      V(x, 0.1, 0),
      V(1, 1, 1),
      ringRotation,
    );
  }

  group.add(
    fossil.toMesh(makeFlatMaterial(BELEMNITE_COLORS.fossil), 'belemnite-fossil-rostrum'),
    growthLines.toMesh(
      makeFlatMaterial(BELEMNITE_COLORS.fossilShade),
      'belemnite-fossil-growth-lines',
    ),
  );
  setShadowFlags(group);
  return group;
}

export function buildBelemnite(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
