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
  body: '#C9705A',
  flap: '#E8A88A',
  shade: '#A95147',
  eye: '#3A3E48',
  iris: '#C69A4A',
  fossil: '#F2EAD8',
  fossilShade: '#D7C9A9',
  dark: '#312B24',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const X_AXIS = V(1, 0, 0);
const Y_AXIS = V(0, 1, 0);

function ringQuaternion(): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), X_AXIS);
}

function addAppendage(batch: GeometryBatch, spikes: GeometryBatch, side: -1 | 1): void {
  const points = [
    V(0.9, 1.03, side * 0.3),
    V(1.16, 0.92, side * 0.4),
    V(1.37, 0.75, side * 0.43),
    V(1.49, 0.55, side * 0.39),
    V(1.48, 0.38, side * 0.29),
    V(1.35, 0.3, side * 0.19),
  ];
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    if (!next) return;
    batch.addBetween(point, next, 0.075 - index * 0.008, 0.064 - index * 0.009, 7);
    ellipsoid(batch, point, V(0.08 - index * 0.007, 0.075 - index * 0.007, 0.07), 7, 5);
    if (index > 0) {
      const base = V(point.x, point.y - 0.02, point.z - side * 0.035);
      const tip = V(point.x - 0.06, point.y - 0.18, point.z - side * 0.08);
      coneBetween(spikes, base, tip, 0.028, 5);
    }
  });
}

function addBodyFlaps(batch: GeometryBatch, colorOffset = 0): void {
  for (let index = 0; index < 10; index += 1) {
    const x = 0.65 - index * 0.23;
    const width = 0.34 - index * 0.012 + colorOffset;
    for (const side of [-1, 1]) {
      const angle = side * (0.18 + index * 0.025);
      const quaternion = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, angle);
      ellipsoid(
        batch,
        V(x, 1.02 - index * 0.012, side * (0.3 + width * 0.45)),
        V(0.22, 0.045, width),
        8,
        5,
        quaternion,
      );
    }
  }
  for (const side of [-1, 1]) {
    const quaternion = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, side * 0.42);
    ellipsoid(batch, V(-1.74, 1, side * 0.2), V(0.48, 0.055, 0.34), 8, 5, quaternion);
  }
}

function addMouth(
  batch: GeometryBatch,
  material: THREE.MeshStandardMaterial,
  name: string,
): THREE.Mesh {
  batch.add(
    new THREE.TorusGeometry(0.17, 0.055, 6, 12),
    V(1.07, 0.82, 0),
    V(1, 1, 1),
    ringQuaternion(),
  );
  return batch.toMesh(material, name);
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'anomalocaris-living';
  const body = new GeometryBatch();
  const flaps = new GeometryBatch();
  const bands = new GeometryBatch();
  const arms = new GeometryBatch();
  const spikes = new GeometryBatch();
  const stalks = new GeometryBatch();
  const eyes = new GeometryBatch();
  const irises = new GeometryBatch();
  const mouth = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-1.78, 1, 0), radiusY: 0.08, radiusZ: 0.1 },
        { center: V(-1.4, 1.02, 0), radiusY: 0.19, radiusZ: 0.25 },
        { center: V(-0.75, 1.08, 0), radiusY: 0.26, radiusZ: 0.32 },
        { center: V(0, 1.1, 0), radiusY: 0.31, radiusZ: 0.36 },
        { center: V(0.65, 1.08, 0), radiusY: 0.29, radiusZ: 0.34 },
        { center: V(1.02, 1.03, 0), radiusY: 0.22, radiusZ: 0.27 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  addBodyFlaps(flaps);
  for (let index = 0; index < 9; index += 1) {
    const x = 0.65 - index * 0.23;
    bands.add(
      new THREE.TorusGeometry(0.28 - index * 0.01, 0.014, 4, 10),
      V(x, 1.09 - index * 0.008, 0),
      V(1, 1, 1),
      ringQuaternion(),
    );
  }
  addAppendage(arms, spikes, -1);
  addAppendage(arms, spikes, 1);
  for (const side of [-1, 1]) {
    const start = V(0.7, 1.23, side * 0.22);
    const end = V(0.96, 1.48, side * 0.48);
    stalks.addBetween(start, end, 0.055, 0.04, 7);
    ellipsoid(eyes, end, V(0.13, 0.12, 0.13), 8, 6);
    ellipsoid(irises, V(end.x + 0.07, end.y + 0.015, end.z), V(0.065, 0.065, 0.075), 7, 5);
  }

  group.add(
    flaps.toMesh(makeOrganicMaterial(COLORS.flap), 'anomalocaris-swimming-flaps'),
    body.toMesh(makeOrganicMaterial(COLORS.body), 'anomalocaris-segmented-body'),
    bands.toMesh(makeOrganicMaterial(COLORS.shade), 'anomalocaris-segment-bands'),
    arms.toMesh(makeOrganicMaterial(COLORS.body), 'anomalocaris-frontal-appendages'),
    spikes.toMesh(makeOrganicMaterial(COLORS.shade), 'anomalocaris-appendage-spines'),
    stalks.toMesh(makeOrganicMaterial(COLORS.body), 'anomalocaris-eye-stalks'),
    eyes.toMesh(makeOrganicMaterial(COLORS.eye), 'anomalocaris-eyes'),
    irises.toMesh(makeOrganicMaterial(COLORS.iris), 'anomalocaris-irises'),
    addMouth(mouth, makeOrganicMaterial(COLORS.dark), 'anomalocaris-ring-mouth'),
  );
  setShadowFlags(group);
  return group;
}

function buildFossil(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'anomalocaris-fossil';
  const plates = new GeometryBatch();
  const shade = new GeometryBatch();
  const arms = new GeometryBatch();
  const spikes = new GeometryBatch();
  const mouth = new GeometryBatch();

  for (let index = 0; index < 11; index += 1) {
    const x = 0.77 - index * 0.24;
    const radius = 0.3 - index * 0.012;
    ellipsoid(plates, V(x, 1.03, 0), V(0.145, 0.22, radius), 7, 5);
    shade.add(
      new THREE.TorusGeometry(radius * 0.92, 0.017, 4, 9),
      V(x + 0.02, 1.03, 0),
      V(1, 0.76, 1),
      ringQuaternion(),
    );
  }
  addBodyFlaps(shade, -0.055);
  addAppendage(arms, spikes, -1);
  addAppendage(arms, spikes, 1);

  group.add(
    plates.toMesh(makeFlatMaterial(COLORS.fossil), 'anomalocaris-fossil-body-plates'),
    shade.toMesh(makeFlatMaterial(COLORS.fossilShade), 'anomalocaris-fossil-flaps-segments'),
    arms.toMesh(makeFlatMaterial(COLORS.fossil), 'anomalocaris-fossil-appendages'),
    spikes.toMesh(makeFlatMaterial(COLORS.fossilShade), 'anomalocaris-fossil-spines'),
    addMouth(mouth, makeFlatMaterial(COLORS.dark), 'anomalocaris-fossil-ring-mouth'),
  );
  setShadowFlags(group);
  return group;
}

export function buildAnomalocaris(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
