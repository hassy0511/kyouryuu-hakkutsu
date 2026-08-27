import * as THREE from 'three';
import { ColorGeometryBatch, setCharacterShadowFlags } from './common';
import type { CharacterRig } from './index';

export const PLAYER_COLORS = {
  clothes: '#4A90D9',
  clothesShade: '#3272B6',
  cap: '#D94A4A',
  capShade: '#B8383E',
  hair: '#4A3528',
  skin: '#F0C8A0',
  cheek: '#ECA4A0',
  backpack: '#C9A96A',
  backpackShade: '#9B7748',
  boot: '#5A4635',
  eye: '#20242A',
  white: '#FFFDF4',
} as const;

export const PLAYER_MOTION = {
  strideMeters: 0.5,
  legSwingRadians: THREE.MathUtils.degToRad(33),
  armSwingRadians: THREE.MathUtils.degToRad(18),
  forwardLeanRadians: THREE.MathUtils.degToRad(5),
  bodyBobMeters: 0.008,
  blendSeconds: 0.2,
  breathingScale: 0.01,
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

function buildTorso(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, 0.16, 0), V(0.235, 0.215, 0.165), PLAYER_COLORS.clothes, 10, 7);
  batch.add(
    new THREE.CylinderGeometry(0.2, 0.22, 0.17, 9),
    V(0, 0.02, 0),
    V(1, 1, 0.92),
    PLAYER_COLORS.clothesShade,
  );
  return batch.toMesh('player-torso');
}

function buildHead(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, 0.1, 0), V(0.225, 0.2, 0.205), PLAYER_COLORS.skin, 12, 8);
  batch.ellipsoid(V(-0.215, 0.1, 0), V(0.035, 0.055, 0.035), PLAYER_COLORS.skin, 7, 5);
  batch.ellipsoid(V(0.215, 0.1, 0), V(0.035, 0.055, 0.035), PLAYER_COLORS.skin, 7, 5);
  return batch.toMesh('player-head');
}

function buildFace(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  for (const side of [-1, 1]) {
    batch.ellipsoid(V(side * 0.083, 0.135, 0.191), V(0.045, 0.058, 0.017), PLAYER_COLORS.eye, 7, 5);
    batch.ellipsoid(
      V(side * 0.069, 0.157, 0.204),
      V(0.012, 0.015, 0.006),
      PLAYER_COLORS.white,
      5,
      4,
    );
    batch.ellipsoid(
      V(side * 0.125, 0.06, 0.186),
      V(0.043, 0.025, 0.012),
      PLAYER_COLORS.cheek,
      7,
      5,
    );
  }
  batch.addBetween(
    V(-0.035, 0.015, 0.198),
    V(0.035, 0.015, 0.198),
    0.008,
    0.008,
    PLAYER_COLORS.eye,
    6,
  );
  return batch.toMesh('player-face');
}

function buildCap(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.add(
    new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    V(0, 0.16, -0.005),
    V(0.218, 0.12, 0.205),
    PLAYER_COLORS.hair,
  );
  batch.add(
    new THREE.SphereGeometry(1, 12, 7, Math.PI, Math.PI, 0, Math.PI),
    V(0, 0.1, -0.004),
    V(0.228, 0.202, 0.21),
    PLAYER_COLORS.hair,
  );
  for (const side of [-1, 1]) {
    batch.addBetween(
      V(side * 0.19, 0.2, -0.015),
      V(side * 0.205, 0.075, 0.01),
      0.038,
      0.018,
      PLAYER_COLORS.hair,
      6,
    );
  }
  for (const offset of [-0.11, 0, 0.11]) {
    batch.ellipsoid(
      V(offset, 0.205 - Math.abs(offset) * 0.2, 0.19),
      V(0.072, 0.055, 0.022),
      PLAYER_COLORS.hair,
      7,
      5,
    );
  }
  batch.add(
    new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    V(0, 0.25, 0),
    V(0.225, 0.085, 0.22),
    PLAYER_COLORS.cap,
  );
  batch.add(
    new THREE.BoxGeometry(1, 1, 1),
    V(0, 0.245, 0.17),
    V(0.17, 0.026, 0.135),
    PLAYER_COLORS.cap,
  );
  batch.add(
    new THREE.BoxGeometry(1, 1, 1),
    V(0, 0.27, -0.18),
    V(0.08, 0.045, 0.035),
    PLAYER_COLORS.capShade,
  );
  return batch.toMesh('player-red-cap');
}

function buildArm(side: -1 | 1): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, -0.055, 0), V(0.09, 0.105, 0.09), PLAYER_COLORS.clothes, 8, 6);
  batch.addBetween(V(0, -0.09, 0), V(0, -0.27, 0.012), 0.07, 0.055, PLAYER_COLORS.skin, 7);
  batch.ellipsoid(V(0, -0.32, 0.018), V(0.065, 0.075, 0.06), PLAYER_COLORS.skin, 8, 6);
  const mesh = batch.toMesh(side < 0 ? 'player-left-arm' : 'player-right-arm');
  mesh.rotation.z = side * THREE.MathUtils.degToRad(3);
  return mesh;
}

function buildLeg(side: -1 | 1): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.addBetween(V(0, -0.015, 0), V(0, -0.15, 0), 0.1, 0.085, PLAYER_COLORS.clothesShade, 8);
  batch.addBetween(V(0, -0.14, 0), V(0, -0.3, 0.005), 0.072, 0.06, PLAYER_COLORS.skin, 7);
  batch.ellipsoid(V(0, -0.345, 0.025), V(0.085, 0.085, 0.085), PLAYER_COLORS.boot, 8, 6);
  batch.ellipsoid(V(0, -0.385, 0.075), V(0.105, 0.055, 0.15), PLAYER_COLORS.boot, 8, 6);
  return batch.toMesh(side < 0 ? 'player-left-leg' : 'player-right-leg');
}

function buildBackpack(): THREE.Mesh {
  const batch = new ColorGeometryBatch();
  batch.ellipsoid(V(0, 0.16, -0.17), V(0.175, 0.205, 0.095), PLAYER_COLORS.backpack, 9, 6);
  batch.add(
    new THREE.BoxGeometry(1, 1, 1),
    V(0, 0.2, -0.255),
    V(0.14, 0.055, 0.025),
    PLAYER_COLORS.backpackShade,
  );
  for (const side of [-1, 1]) {
    batch.addBetween(
      V(side * 0.13, 0.28, -0.12),
      V(side * 0.14, 0.02, -0.12),
      0.018,
      0.018,
      PLAYER_COLORS.backpackShade,
      5,
    );
  }
  return batch.toMesh('player-small-backpack');
}

export function buildPlayerCharacter(): CharacterRig {
  const group = new THREE.Group();
  group.name = 'player-character-rig';

  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'player-body-pivot';
  bodyPivot.position.y = 0.4;
  bodyPivot.add(buildTorso(), buildBackpack());

  const headPivot = new THREE.Group();
  headPivot.name = 'player-head-pivot';
  headPivot.position.y = 0.36;
  headPivot.add(buildHead(), buildFace(), buildCap());
  bodyPivot.add(headPivot);

  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  leftArmPivot.name = 'player-left-shoulder-pivot';
  rightArmPivot.name = 'player-right-shoulder-pivot';
  leftArmPivot.position.set(-0.22, 0.25, 0);
  rightArmPivot.position.set(0.22, 0.25, 0);
  leftArmPivot.add(buildArm(-1));
  rightArmPivot.add(buildArm(1));
  bodyPivot.add(leftArmPivot, rightArmPivot);

  const leftLegPivot = new THREE.Group();
  const rightLegPivot = new THREE.Group();
  leftLegPivot.name = 'player-left-hip-pivot';
  rightLegPivot.name = 'player-right-hip-pivot';
  leftLegPivot.position.set(-0.105, 0.42, 0);
  rightLegPivot.position.set(0.105, 0.42, 0);
  leftLegPivot.add(buildLeg(-1));
  rightLegPivot.add(buildLeg(1));
  group.add(bodyPivot, leftLegPivot, rightLegPivot);
  setCharacterShadowFlags(group);

  let movementBlend = 0;
  let walkPhase = 0;
  let elapsed = 0;
  const blendLambda = 4.6 / PLAYER_MOTION.blendSeconds;

  function update(dt: number, moving: boolean, speed: number): void {
    const safeDt = THREE.MathUtils.clamp(dt, 0, 0.1);
    elapsed += safeDt;
    movementBlend = THREE.MathUtils.damp(movementBlend, moving ? 1 : 0, blendLambda, safeDt);
    if (moving || movementBlend > 0.01) {
      walkPhase +=
        (Math.max(speed, 0) / PLAYER_MOTION.strideMeters) * Math.PI * safeDt * movementBlend;
    }

    const stride = Math.sin(walkPhase) * movementBlend;
    leftLegPivot.rotation.x = stride * PLAYER_MOTION.legSwingRadians;
    rightLegPivot.rotation.x = -stride * PLAYER_MOTION.legSwingRadians;
    leftArmPivot.rotation.x = -stride * PLAYER_MOTION.armSwingRadians;
    rightArmPivot.rotation.x = stride * PLAYER_MOTION.armSwingRadians;

    const lean = PLAYER_MOTION.forwardLeanRadians * movementBlend;
    const idleWeight = 1 - movementBlend;
    const breathing = Math.sin(elapsed * 2.1) * PLAYER_MOTION.breathingScale * idleWeight;
    const bob = Math.sin(walkPhase * 2) * PLAYER_MOTION.bodyBobMeters * movementBlend;
    bodyPivot.position.y = 0.4 + bob;
    bodyPivot.rotation.x = lean;
    bodyPivot.scale.y = 1 + breathing;
    headPivot.rotation.x = -lean * 0.9;
    headPivot.rotation.z = Math.sin(elapsed * 0.62 + Math.sin(elapsed * 0.17)) * 0.028 * idleWeight;
  }

  return { group, update };
}
