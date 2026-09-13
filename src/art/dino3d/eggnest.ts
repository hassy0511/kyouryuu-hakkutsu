import * as THREE from 'three';
import {
  GeometryBatch,
  coneBetween,
  ellipsoid,
  embeddedSideZ,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import { addReliefEllipsoid, createStoneSlab, fossilMaterial } from './slabCommon';
import type { DinoViews } from './spinosaurus';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const P = (x: number, y: number): THREE.Vector2 => new THREE.Vector2(x, y);

const COLORS = {
  egg: '#E8DCC4',
  sand: '#C9A86A',
  hatchling: '#9AA86A',
  beak: '#D7B06A',
  dark: '#211D18',
  iris: '#B97935',
} as const;

function buildSlab(): THREE.Group {
  const slab = createStoneSlab(0.5, 0.43, 0.052, 'eggnest-stone-slab');
  const fossil = new GeometryBatch();
  const texture = new GeometryBatch();
  const center = P(0, 0.225);

  fossil.add(
    new THREE.TorusGeometry(0.155, 0.018, 5, 20),
    V(center.x, center.y, slab.frontZ - 0.012),
  );
  for (let index = 0; index < 11; index += 1) {
    const angle = (index / 11) * Math.PI * 2 + 0.16;
    const eggCenter = P(center.x + Math.cos(angle) * 0.112, center.y + Math.sin(angle) * 0.102);
    addReliefEllipsoid(fossil, eggCenter, P(0.026, 0.041), 0.018, slab.frontZ, 8, 6);
    for (const dot of [-1, 1]) {
      addReliefEllipsoid(
        texture,
        P(eggCenter.x + dot * 0.009, eggCenter.y + dot * 0.006),
        P(0.003, 0.003),
        0.003,
        slab.frontZ + 0.003,
        5,
        4,
      );
    }
  }

  slab.root.add(
    fossil.toMesh(fossilMaterial(), 'eggnest-embedded-eggs-and-rim'),
    texture.toMesh(fossilMaterial(), 'eggnest-egg-shell-texture'),
  );
  setShadowFlags(slab.root);
  return slab.root;
}

function addWholeEgg(batch: GeometryBatch, position: THREE.Vector3, rotation: number): void {
  const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
  batch.add(new THREE.SphereGeometry(1, 8, 6), position, V(0.032, 0.052, 0.032), quaternion);
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'eggnest-living-nest';
  group.position.z = -0.175;

  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.235, 0.27, 0.055, 20, 1, false),
    makeOrganicMaterial(COLORS.sand),
  );
  sand.name = 'eggnest-sand-bowl';
  sand.position.y = 0.028;
  group.add(sand);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.205, 0.026, 6, 24),
    makeOrganicMaterial('#A98550'),
  );
  rim.name = 'eggnest-raised-rim';
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.058;
  group.add(rim);

  const eggs = new GeometryBatch();
  const shell = new GeometryBatch();
  const baby = new GeometryBatch();
  const beak = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  const hatchAngle = 0.35;
  const hatchPosition = V(Math.cos(hatchAngle) * 0.135, 0.105, Math.sin(hatchAngle) * 0.115);
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2 + 0.35;
    if (index === 0) continue;
    addWholeEgg(
      eggs,
      V(Math.cos(angle) * 0.135, 0.11 + (index % 2) * 0.004, Math.sin(angle) * 0.115),
      angle,
    );
  }

  const lowerShell = new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  shell.add(lowerShell, hatchPosition, V(0.036, 0.058, 0.036));
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const base = V(
      hatchPosition.x + Math.cos(angle) * 0.029,
      hatchPosition.y + 0.004,
      hatchPosition.z + Math.sin(angle) * 0.029,
    );
    const tip = V(
      hatchPosition.x + Math.cos(angle) * 0.045,
      hatchPosition.y + 0.028,
      hatchPosition.z + Math.sin(angle) * 0.045,
    );
    coneBetween(shell, base, tip, 0.012, 5);
  }

  const head = V(hatchPosition.x + 0.004, hatchPosition.y + 0.058, hatchPosition.z);
  ellipsoid(baby, head, V(0.031, 0.036, 0.03), 8, 6);
  baby.addBetween(head, V(head.x - 0.008, head.y - 0.034, head.z), 0.02, 0.016, 6);
  coneBetween(
    beak,
    V(head.x + 0.024, head.y + 0.001, head.z),
    V(head.x + 0.05, head.y, head.z),
    0.012,
    5,
  );

  for (const side of [-1, 1]) {
    const eyeZ = hatchPosition.z + embeddedSideZ(side, 0.04, 0.011, 0.22);
    ellipsoid(dark, V(head.x + 0.01, head.y + 0.01, eyeZ), V(0.01, 0.011, 0.008), 7, 5);
    ellipsoid(
      iris,
      V(head.x + 0.015, head.y + 0.013, eyeZ + side * 0.004),
      V(0.0055, 0.006, 0.0045),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(head.x + 0.018, head.y + 0.018, eyeZ + side * 0.008),
      V(0.002, 0.0022, 0.0015),
      5,
      4,
    );
  }

  group.add(
    eggs.toMesh(makeOrganicMaterial(COLORS.egg), 'eggnest-whole-eggs'),
    shell.toMesh(makeOrganicMaterial(COLORS.egg), 'eggnest-hatching-shell'),
    baby.toMesh(makeOrganicMaterial(COLORS.hatchling), 'eggnest-hatchling-head'),
    beak.toMesh(makeOrganicMaterial(COLORS.beak), 'eggnest-hatchling-beak'),
    dark.toMesh(makeOrganicMaterial(COLORS.dark), 'eggnest-hatchling-eyes'),
    iris.toMesh(makeOrganicMaterial(COLORS.iris), 'eggnest-hatchling-irises'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'eggnest-hatchling-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

export function buildEggNest(): DinoViews {
  return { skeleton: buildSlab(), living: buildLiving() };
}
