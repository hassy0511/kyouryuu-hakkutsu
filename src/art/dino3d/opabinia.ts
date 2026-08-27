import * as THREE from 'three';
import {
  coneBetween,
  ellipsoid,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

const COLORS = {
  body: '#8AA07A',
  nozzle: '#B8C9A0',
  flap: '#A6B995',
  eye: '#2E3228',
  fossil: '#F2EAD8',
  fossilShade: '#D7C9A9',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const Y_AXIS = V(0, 1, 0);

interface Palette {
  body: THREE.ColorRepresentation;
  flap: THREE.ColorRepresentation;
  nozzle: THREE.ColorRepresentation;
  eye: THREE.ColorRepresentation;
  organic: boolean;
}

function addNozzle(hose: GeometryBatch, claws: GeometryBatch, bodyColor: GeometryBatch): void {
  const points = [
    V(0.014, 0.021, 0),
    V(0.024, 0.019, 0),
    V(0.033, 0.015, 0),
    V(0.041, 0.016, 0),
    V(0.046, 0.02, 0),
  ];
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    if (next) hose.addBetween(point, next, 0.0025 - index * 0.0002, 0.0023 - index * 0.0002, 6);
  });
  ellipsoid(bodyColor, points[0]!, V(0.004, 0.0035, 0.004), 7, 5);
  const palm = points[points.length - 1]!;
  ellipsoid(hose, palm, V(0.0038, 0.0032, 0.0035), 7, 5);
  coneBetween(claws, palm, V(0.052, 0.024, 0.003), 0.0015, 5);
  coneBetween(claws, palm, V(0.052, 0.016, -0.003), 0.0015, 5);
}

function addFiveEyes(
  stalks: GeometryBatch,
  eyes: GeometryBatch,
  eyeColor: GeometryBatch,
  fossil: boolean,
): void {
  const eyePositions = [
    { x: 0.006, z: -0.0075 },
    { x: 0.011, z: -0.0038 },
    { x: 0.017, z: 0 },
    { x: 0.0135, z: 0.0038 },
    { x: 0.008, z: 0.0075 },
  ] as const;
  eyePositions.forEach(({ x, z }, index) => {
    const root = V(x - 0.001, 0.025, z * 0.72);
    const top = V(x, 0.031 + (index % 2) * 0.0007, z);
    stalks.addBetween(root, top, 0.00125, 0.001, 5);
    ellipsoid(eyes, top, V(0.0019, 0.0019, 0.0019), 7, 5);
    if (!fossil) {
      ellipsoid(eyeColor, V(top.x + 0.0015, top.y + 0.0003, top.z), V(0.001, 0.001, 0.00115), 6, 4);
    }
  });
}

function createOpabinia(name: string, palette: Palette, fossil: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const body = new GeometryBatch();
  const flaps = new GeometryBatch();
  const bands = new GeometryBatch();
  const hose = new GeometryBatch();
  const claws = new GeometryBatch();
  const stalks = new GeometryBatch();
  const eyeDomes = new GeometryBatch();
  const eyeColor = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-0.026, 0.018, 0), radiusY: 0.0025, radiusZ: 0.003 },
        { center: V(-0.019, 0.019, 0), radiusY: 0.005, radiusZ: 0.006 },
        { center: V(-0.008, 0.02, 0), radiusY: 0.0065, radiusZ: 0.008 },
        { center: V(0.004, 0.021, 0), radiusY: 0.007, radiusZ: 0.0085 },
        { center: V(0.015, 0.021, 0), radiusY: 0.006, radiusZ: 0.007 },
      ],
      9,
    ),
    V(0, 0, 0),
  );

  for (let index = 0; index < 8; index += 1) {
    const x = 0.008 - index * 0.0043;
    const taper = 1 - index * 0.055;
    ellipsoid(bands, V(x, 0.025, 0), V(0.0009, 0.0008, 0.0072 * taper), 5, 4);
    for (const side of [-1, 1]) {
      const quaternion = new THREE.Quaternion().setFromAxisAngle(
        Y_AXIS,
        side * (0.12 + index * 0.03),
      );
      ellipsoid(
        flaps,
        V(x, 0.018, side * 0.009),
        V(0.0044, 0.0008, 0.0055 * taper),
        7,
        4,
        quaternion,
      );
    }
  }
  for (const side of [-1, 1]) {
    const quaternion = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, side * 0.42);
    ellipsoid(flaps, V(-0.025, 0.018, side * 0.004), V(0.007, 0.0009, 0.005), 7, 4, quaternion);
  }

  addNozzle(hose, claws, body);
  addFiveEyes(stalks, eyeDomes, eyeColor, fossil);
  const material = palette.organic ? makeOrganicMaterial : makeFlatMaterial;
  group.add(
    flaps.toMesh(material(palette.flap), `${name}-swimming-flaps`),
    body.toMesh(material(palette.body), `${name}-segmented-body`),
    bands.toMesh(material(palette.flap), `${name}-segment-bands`),
    hose.toMesh(material(palette.nozzle), `${name}-hose-mouth`),
    claws.toMesh(material(palette.nozzle), `${name}-mouth-claws`),
    stalks.toMesh(material(palette.body), `${name}-five-eye-stalks`),
    eyeDomes.toMesh(material(fossil ? palette.flap : palette.eye), `${name}-five-eye-domes`),
  );
  if (!fossil) group.add(eyeColor.toMesh(material(palette.eye), `${name}-five-dark-eyes`));
  setShadowFlags(group);
  return group;
}

function buildLiving(): THREE.Group {
  return createOpabinia(
    'opabinia-living',
    {
      body: COLORS.body,
      flap: COLORS.flap,
      nozzle: COLORS.nozzle,
      eye: COLORS.eye,
      organic: true,
    },
    false,
  );
}

function buildFossil(): THREE.Group {
  return createOpabinia(
    'opabinia-fossil-shell',
    {
      body: COLORS.fossil,
      flap: COLORS.fossilShade,
      nozzle: COLORS.fossilShade,
      eye: COLORS.fossilShade,
      organic: false,
    },
    true,
  );
}

export function buildOpabinia(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
