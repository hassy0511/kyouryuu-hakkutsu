import * as THREE from 'three';
import {
  GeometryBatch,
  coneBetween,
  ellipsoid,
  embeddedSideZ,
  loftGeometry,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import {
  addReliefClaw,
  addReliefEllipsoid,
  addReliefLine,
  createStoneSlab,
  fossilMaterial,
} from './slabCommon';
import type { DinoViews } from './spinosaurus';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const P = (x: number, y: number): THREE.Vector2 => new THREE.Vector2(x, y);

const COLORS = {
  feather: '#3E4A5A',
  featherEdge: '#E8E0C8',
  beak: '#C9A86A',
  dark: '#211D18',
  iris: '#B77B36',
  bone: '#8A7A62',
} as const;

function addFeatherFan(
  relief: GeometryBatch,
  shoulder: THREE.Vector2,
  tips: readonly THREE.Vector2[],
  frontZ: number,
): void {
  for (const tip of tips) {
    const shaftEnd = shoulder.clone().lerp(tip, 0.9);
    addReliefLine(relief, shoulder, shaftEnd, 0.0043, frontZ, 5);
    const direction = tip.clone().sub(shoulder).normalize();
    const normal = new THREE.Vector2(-direction.y, direction.x);
    for (const side of [-1, 1]) {
      const inner = shoulder.clone().lerp(tip, 0.48);
      const vaneTip = tip.clone().addScaledVector(normal, side * 0.007);
      addReliefLine(relief, inner, vaneTip, 0.002, frontZ, 4);
    }
  }
}

function buildSlab(): THREE.Group {
  const slab = createStoneSlab(0.5, 0.4, 0.05, 'archaeopteryx-slab');
  const relief = new GeometryBatch();

  addReliefEllipsoid(relief, P(0, 0.21), P(0.065, 0.043), 0.011, slab.frontZ, 9, 6);
  const neck = [P(0.03, 0.235), P(0.045, 0.265), P(0.03, 0.292), P(0, 0.305)];
  neck.forEach((point, index) => {
    const next = neck[index + 1];
    if (next) addReliefLine(relief, point, next, 0.006, slab.frontZ);
  });
  addReliefEllipsoid(relief, P(-0.012, 0.31), P(0.03, 0.022), 0.009, slab.frontZ, 7, 5);
  addReliefLine(relief, P(-0.04, 0.31), P(-0.066, 0.306), 0.0035, slab.frontZ, 4);

  const tail = [P(-0.05, 0.2), P(-0.11, 0.165), P(-0.17, 0.125), P(-0.225, 0.075)];
  tail.forEach((point, index) => {
    const next = tail[index + 1];
    if (next) addReliefLine(relief, point, next, 0.005, slab.frontZ);
  });
  for (let index = 0; index < 7; index += 1) {
    const start = P(-0.075 - index * 0.02, 0.18 - index * 0.014);
    const end = P(start.x - 0.055, start.y - 0.025 + index * 0.001);
    addReliefLine(relief, start, end, 0.0022, slab.frontZ, 4);
  }

  const leftWingTips = [P(-0.16, 0.35), P(-0.19, 0.325), P(-0.205, 0.295), P(-0.2, 0.265)];
  const rightWingTips = [P(0.14, 0.095), P(0.18, 0.11), P(0.205, 0.135), P(0.205, 0.165)];
  addFeatherFan(relief, P(-0.015, 0.235), leftWingTips, slab.frontZ);
  addFeatherFan(relief, P(0.025, 0.205), rightWingTips, slab.frontZ);
  addReliefLine(relief, P(-0.01, 0.23), P(-0.12, 0.31), 0.0045, slab.frontZ);
  addReliefLine(relief, P(0.015, 0.215), P(0.125, 0.135), 0.0045, slab.frontZ);

  const legs = [
    [P(-0.015, 0.185), P(-0.055, 0.13), P(-0.085, 0.105)],
    [P(0.025, 0.185), P(0.055, 0.135), P(0.085, 0.11)],
  ];
  for (const leg of legs) {
    for (let index = 0; index < leg.length - 1; index += 1) {
      const start = leg[index];
      const end = leg[index + 1];
      if (start && end) addReliefLine(relief, start, end, 0.0042, slab.frontZ);
    }
    const foot = leg.at(-1);
    if (!foot) continue;
    for (const offset of [-0.01, 0, 0.01]) {
      addReliefClaw(
        relief,
        foot,
        P(foot.x + 0.025, foot.y - 0.012 + offset * 0.2),
        0.003,
        slab.frontZ,
      );
    }
  }
  for (const wrist of [P(-0.12, 0.31), P(0.125, 0.135)]) {
    for (const offset of [-0.008, 0, 0.008]) {
      addReliefClaw(relief, wrist, P(wrist.x + 0.025, wrist.y + offset), 0.0026, slab.frontZ);
    }
  }

  slab.root.add(relief.toMesh(fossilMaterial(), 'archaeopteryx-embedded-fossil-and-feathers'));
  setShadowFlags(slab.root);
  return slab.root;
}

function addWing(feathers: GeometryBatch, edge: GeometryBatch, side: number): void {
  const shoulder = V(0.01, 0.2, side * 0.045);
  const elbow = V(-0.02, 0.17, side * 0.105);
  feathers.addBetween(shoulder, elbow, 0.027, 0.018, 6);
  for (let index = 0; index < 5; index += 1) {
    const t = index / 4;
    const base = elbow.clone().lerp(shoulder, t * 0.55);
    const tip = V(-0.085 + t * 0.045, 0.12 + t * 0.035, side * (0.2 - t * 0.025));
    feathers.addBetween(base, tip, 0.016, 0.004, 5);
    edge.addBetween(tip, V(tip.x + 0.018, tip.y - 0.005, tip.z + side * 0.006), 0.004, 0.002, 5);
  }
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'archaeopteryx-living';
  group.position.z = -0.16;
  const body = new GeometryBatch();
  const feathers = new GeometryBatch();
  const edge = new GeometryBatch();
  const beak = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-0.095, 0.19, 0), radiusY: 0.045, radiusZ: 0.048 },
        { center: V(-0.025, 0.205, 0), radiusY: 0.065, radiusZ: 0.065 },
        { center: V(0.055, 0.21, 0), radiusY: 0.058, radiusZ: 0.058 },
        { center: V(0.1, 0.225, 0), radiusY: 0.035, radiusZ: 0.04 },
      ],
      8,
    ),
    V(0, 0, 0),
  );
  body.addBetween(V(0.075, 0.225, 0), V(0.12, 0.268, 0), 0.035, 0.028, 7);
  ellipsoid(body, V(0.145, 0.28, 0), V(0.045, 0.041, 0.042), 8, 6);
  beak.addBetween(V(0.176, 0.276, 0), V(0.225, 0.271, 0), 0.022, 0.002, 5);

  addWing(feathers, edge, -1);
  addWing(feathers, edge, 1);
  for (const offset of [-0.018, 0, 0.018]) {
    feathers.addBetween(
      V(-0.08, 0.19, offset),
      V(-0.275, 0.15 + Math.abs(offset), offset * 1.8),
      0.018,
      0.003,
      5,
    );
    edge.addBetween(
      V(-0.15, 0.175, offset),
      V(-0.27, 0.151 + Math.abs(offset), offset * 1.8),
      0.004,
      0.002,
      5,
    );
  }

  for (const side of [-1, 1]) {
    const hip = V(-0.02, 0.17, side * 0.035);
    const ankle = V(-0.005, 0.045, side * 0.045);
    body.addBetween(hip, ankle, 0.018, 0.01, 6);
    const foot = V(0.03, 0.012, side * 0.05);
    body.addBetween(ankle, foot, 0.01, 0.006, 5);
    for (const toeOffset of [-0.012, 0, 0.012]) {
      coneBetween(beak, foot, V(0.07, 0.005, side * 0.05 + toeOffset), 0.004, 5);
    }

    const eyeZ = embeddedSideZ(side, 0.042, 0.011, 0.2);
    ellipsoid(dark, V(0.157, 0.289, eyeZ), V(0.015, 0.014, 0.011), 7, 5);
    ellipsoid(iris, V(0.159, 0.29, eyeZ + side * 0.004), V(0.008, 0.008, 0.006), 6, 4);
    ellipsoid(glint, V(0.162, 0.295, eyeZ + side * 0.008), V(0.0025, 0.003, 0.002), 5, 4);
  }

  group.add(
    feathers.toMesh(makeOrganicMaterial(COLORS.feather), 'archaeopteryx-feathered-wings-tail'),
    edge.toMesh(makeOrganicMaterial(COLORS.featherEdge), 'archaeopteryx-feather-edges'),
    body.toMesh(makeOrganicMaterial(COLORS.feather), 'archaeopteryx-body'),
    beak.toMesh(makeOrganicMaterial(COLORS.beak), 'archaeopteryx-beak-feet-claws'),
    dark.toMesh(makeOrganicMaterial(COLORS.dark), 'archaeopteryx-eyes'),
    iris.toMesh(makeOrganicMaterial(COLORS.iris), 'archaeopteryx-irises'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'archaeopteryx-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

export function buildArchaeopteryx(): DinoViews {
  return { skeleton: buildSlab(), living: buildLiving() };
}
