import * as THREE from 'three';
import { ColorGeometryBatch, setCharacterShadowFlags } from './common';
import type { CharacterRig } from './index';

export const HAKASE_COLORS = {
  coat: '#F2F0E8',
  coatShade: '#D8D9D2',
  shirt: '#6DA7B8',
  pants: '#5C6670',
  boot: '#55483E',
  skin: '#DDB38E',
  cheek: '#D89288',
  beard: '#FAF8EC',
  beardShade: '#D7D7CE',
  hat: '#E8BC3C',
  hatBand: '#A86B35',
  eye: '#263039',
  notebook: '#8E573D',
  notebookPage: '#F6E8BE',
} as const;

export const HAKASE_MOTION = {
  breathingScale: 0.009,
  nodRadians: THREE.MathUtils.degToRad(2.2),
  headTiltRadians: THREE.MathUtils.degToRad(1.2),
  armWelcomeRadians: THREE.MathUtils.degToRad(2.5),
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

function buildCoat(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, 0.24, 0), V(0.39, 0.38, 0.27), HAKASE_COLORS.coat, 11, 8);
  batch.add(
    new THREE.CylinderGeometry(0.34, 0.39, 0.5, 10),
    V(0, 0.08, 0),
    V(1, 1, 0.94),
    HAKASE_COLORS.coat,
  );
  batch.add(
    new THREE.BoxGeometry(1, 1, 1),
    V(0, 0.34, 0.257),
    V(0.15, 0.18, 0.024),
    HAKASE_COLORS.shirt,
  );
  for (const side of [-1, 1]) {
    batch.add(
      new THREE.BoxGeometry(1, 1, 1),
      V(side * 0.17, 0.09, 0.265),
      V(0.145, 0.3, 0.02),
      HAKASE_COLORS.coatShade,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, side * 0.06)),
    );
  }
  return batch.toMesh('hakase-white-coat');
}

function buildLegs(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  for (const side of [-1, 1]) {
    batch.addBetween(
      V(side * 0.145, 0.45, 0),
      V(side * 0.145, 0.14, 0.015),
      0.115,
      0.1,
      HAKASE_COLORS.pants,
      8,
    );
    batch.ellipsoid(V(side * 0.145, 0.085, 0.075), V(0.14, 0.09, 0.22), HAKASE_COLORS.boot, 9, 6);
  }
  return batch.toMesh('hakase-legs-and-boots');
}

function buildHead(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, 0, 0), V(0.285, 0.255, 0.245), HAKASE_COLORS.skin, 12, 8);
  batch.ellipsoid(V(-0.275, 0, 0), V(0.04, 0.065, 0.04), HAKASE_COLORS.skin, 7, 5);
  batch.ellipsoid(V(0.275, 0, 0), V(0.04, 0.065, 0.04), HAKASE_COLORS.skin, 7, 5);
  batch.ellipsoid(V(0, -0.025, 0.235), V(0.055, 0.07, 0.06), HAKASE_COLORS.skin, 8, 6);
  return batch.toMesh('hakase-head');
}

function buildFace(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  for (const side of [-1, 1]) {
    batch.ellipsoid(V(side * 0.095, 0.055, 0.225), V(0.035, 0.044, 0.018), HAKASE_COLORS.eye, 7, 5);
    batch.ellipsoid(
      V(side * 0.15, -0.025, 0.224),
      V(0.04, 0.022, 0.012),
      HAKASE_COLORS.cheek,
      7,
      5,
    );
    batch.addBetween(
      V(side * 0.155, 0.13, 0.218),
      V(side * 0.055, 0.145, 0.228),
      0.012,
      0.012,
      HAKASE_COLORS.beardShade,
      6,
    );
  }
  return batch.toMesh('hakase-face');
}

function buildBeard(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, -0.18, 0.205), V(0.205, 0.235, 0.105), HAKASE_COLORS.beard, 10, 7);
  batch.ellipsoid(V(-0.115, -0.065, 0.24), V(0.125, 0.06, 0.05), HAKASE_COLORS.beard, 8, 5);
  batch.ellipsoid(V(0.115, -0.065, 0.24), V(0.125, 0.06, 0.05), HAKASE_COLORS.beard, 8, 5);
  batch.ellipsoid(V(0, -0.33, 0.17), V(0.115, 0.14, 0.075), HAKASE_COLORS.beardShade, 8, 6);
  return batch.toMesh('hakase-white-beard');
}

function buildHat(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.add(
    new THREE.CylinderGeometry(0.34, 0.34, 0.035, 12),
    V(0, 0.235, 0),
    V(1, 1, 0.92),
    HAKASE_COLORS.hat,
  );
  batch.add(
    new THREE.CylinderGeometry(0.205, 0.25, 0.22, 11),
    V(0, 0.34, -0.015),
    V(1, 1, 0.95),
    HAKASE_COLORS.hat,
  );
  batch.add(
    new THREE.CylinderGeometry(0.253, 0.253, 0.045, 11),
    V(0, 0.255, -0.015),
    V(1, 1, 0.95),
    HAKASE_COLORS.hatBand,
  );
  return batch.toMesh('hakase-yellow-hat');
}

function buildArm(side: -1 | 1): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, -0.055, 0), V(0.115, 0.13, 0.115), HAKASE_COLORS.coat, 8, 6);
  const elbow = V(-side * 0.05, -0.21, 0.07);
  const hand = V(-side * 0.2, -0.34, 0.23);
  batch.addBetween(V(0, -0.06, 0), elbow, 0.09, 0.075, HAKASE_COLORS.coat, 8);
  batch.addBetween(elbow, hand, 0.072, 0.055, HAKASE_COLORS.skin, 7);
  batch.ellipsoid(hand, V(0.07, 0.065, 0.06), HAKASE_COLORS.skin, 8, 6);
  return batch.toMesh(side < 0 ? 'hakase-left-arm' : 'hakase-right-arm');
}

function buildNotebook(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, 0));
  batch.add(
    new THREE.BoxGeometry(1, 1, 1),
    V(0, 0.14, 0.31),
    V(0.24, 0.175, 0.026),
    HAKASE_COLORS.notebook,
    tilt,
  );
  batch.add(
    new THREE.BoxGeometry(1, 1, 1),
    V(0, 0.15, 0.337),
    V(0.215, 0.15, 0.008),
    HAKASE_COLORS.notebookPage,
    tilt,
  );
  batch.addBetween(V(-0.18, 0.26, 0.355), V(0.12, 0.08, 0.355), 0.012, 0.012, HAKASE_COLORS.eye, 6);
  return batch.toMesh('hakase-notebook');
}

export function buildHakaseCharacter(): CharacterRig {
  const group = new THREE.Group();
  group.name = 'hakase-character-rig';
  group.add(buildLegs());

  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'hakase-body-pivot';
  bodyPivot.position.y = 0.43;
  bodyPivot.add(buildCoat(), buildNotebook());

  const headPivot = new THREE.Group();
  headPivot.name = 'hakase-head-pivot';
  headPivot.position.y = 0.72;
  headPivot.add(buildHead(), buildFace(), buildBeard(), buildHat());
  bodyPivot.add(headPivot);

  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  leftArmPivot.name = 'hakase-left-shoulder-pivot';
  rightArmPivot.name = 'hakase-right-shoulder-pivot';
  leftArmPivot.position.set(-0.36, 0.47, 0);
  rightArmPivot.position.set(0.36, 0.47, 0);
  leftArmPivot.add(buildArm(-1));
  rightArmPivot.add(buildArm(1));
  bodyPivot.add(leftArmPivot, rightArmPivot);
  group.add(bodyPivot);
  setCharacterShadowFlags(group);

  let elapsed = 0;
  function update(dt: number): void {
    elapsed += THREE.MathUtils.clamp(dt, 0, 0.1);
    const breath = Math.sin(elapsed * 1.75) * HAKASE_MOTION.breathingScale;
    const slowGesture = Math.sin(elapsed * 0.72 + 0.4);
    bodyPivot.scale.y = 1 + breath;
    headPivot.rotation.x = slowGesture * HAKASE_MOTION.nodRadians;
    headPivot.rotation.z = Math.sin(elapsed * 0.43) * HAKASE_MOTION.headTiltRadians;
    leftArmPivot.rotation.x = slowGesture * HAKASE_MOTION.armWelcomeRadians;
    rightArmPivot.rotation.x = -slowGesture * HAKASE_MOTION.armWelcomeRadians;
  }

  return { group, update };
}
