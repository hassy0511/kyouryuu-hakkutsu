import * as THREE from 'three';
import {
  GeometryBatch,
  coneBetween,
  ellipsoid,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import { SLAB_COLORS, addDryCracks, fossilMaterial, irregularSlabOutline } from './slabCommon';
import type { DinoViews } from './spinosaurus';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const P = (x: number, y: number): THREE.Vector2 => new THREE.Vector2(x, y);
const TILT = THREE.MathUtils.degToRad(-55);
const WIDTH = 0.9;
const HEIGHT = 0.72;
const THICKNESS = 0.055;
const RECESS = 0.014;

const FOOTPRINT = [
  P(0, 0.075),
  P(-0.08, 0.12),
  P(-0.11, 0.245),
  P(-0.225, 0.415),
  P(-0.195, 0.465),
  P(-0.068, 0.335),
  P(-0.036, 0.325),
  P(-0.034, 0.59),
  P(0, 0.65),
  P(0.034, 0.59),
  P(0.036, 0.325),
  P(0.068, 0.335),
  P(0.195, 0.465),
  P(0.225, 0.415),
  P(0.11, 0.245),
  P(0.08, 0.12),
] as const;

function shapeFrom(points: readonly THREE.Vector2[]): THREE.Shape {
  const shape = new THREE.Shape();
  const first = points[0];
  if (!first) throw new Error('A footprint shape needs points.');
  shape.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

function pathFrom(points: readonly THREE.Vector2[]): THREE.Path {
  const path = new THREE.Path();
  const reversed = [...points].reverse();
  const first = reversed[0];
  if (!first) throw new Error('A footprint path needs points.');
  path.moveTo(first.x, first.y);
  reversed.slice(1).forEach((point) => path.lineTo(point.x, point.y));
  path.closePath();
  return path;
}

function buildFootprintSlab(includeFoot: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = includeFoot ? 'footprint-living-overlay' : 'footprint-fossil-slab';
  group.rotation.x = TILT;
  group.position.y = Math.sin(-TILT) * (THICKNESS * 0.5) + 0.003;

  const outline = irregularSlabOutline(WIDTH, HEIGHT);
  const coreDepth = THICKNESS - RECESS;
  const coreGeometry = silhouetteGeometry(outline, coreDepth * 0.5);
  coreGeometry.translate(0, 0, -RECESS * 0.5);
  const core = new THREE.Mesh(coreGeometry, makeFlatMaterial(SLAB_COLORS.stone));
  core.name = 'footprint-slab-core';
  group.add(core);

  const shellShape = shapeFrom(outline);
  shellShape.holes.push(pathFrom(FOOTPRINT));
  const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
    depth: RECESS,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 1,
  });
  shellGeometry.translate(0, 0, THICKNESS * 0.5 - RECESS);
  const shell = new THREE.Mesh(shellGeometry, makeFlatMaterial(SLAB_COLORS.edge));
  shell.name = 'footprint-slab-face-with-cutout';
  group.add(shell);

  const floorGeometry = new THREE.ExtrudeGeometry(shapeFrom(FOOTPRINT), {
    depth: 0.0015,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 1,
  });
  floorGeometry.translate(0, 0, THICKNESS * 0.5 - RECESS + 0.0005);
  const floor = new THREE.Mesh(floorGeometry, fossilMaterial());
  floor.name = 'footprint-recessed-track-floor';
  group.add(floor);

  const cracks = new GeometryBatch();
  addDryCracks(cracks, THICKNESS * 0.5, WIDTH, HEIGHT);
  group.add(cracks.toMesh(makeFlatMaterial(SLAB_COLORS.fossil), 'footprint-dry-mud-cracks'));

  if (includeFoot) {
    const foot = new GeometryBatch();
    const claws = new GeometryBatch();
    const faceZ = THICKNESS * 0.5;
    const pad = V(0, 0.225, faceZ + 0.025);
    ellipsoid(foot, pad, V(0.115, 0.13, 0.055), 9, 6);
    const toes = [
      V(-0.185, 0.435, faceZ + 0.025),
      V(0, 0.61, faceZ + 0.025),
      V(0.185, 0.435, faceZ + 0.025),
    ];
    toes.forEach((tip, index) => {
      const toeBase = V((index - 1) * 0.045, 0.29, faceZ + 0.025);
      foot.addBetween(toeBase, tip, 0.055, 0.027, 7);
      const direction = tip.clone().sub(toeBase).normalize();
      coneBetween(claws, tip, tip.clone().addScaledVector(direction, 0.06), 0.027, 6);
    });
    foot.addBetween(V(0, 0.18, faceZ + 0.035), V(0, 0.145, faceZ + 0.21), 0.1, 0.07, 8);

    const footMaterial = makeOrganicMaterial('#A77A4C');
    footMaterial.transparent = true;
    footMaterial.opacity = 0.56;
    footMaterial.depthWrite = false;
    const clawMaterial = makeOrganicMaterial('#E6D6B7');
    clawMaterial.transparent = true;
    clawMaterial.opacity = 0.62;
    clawMaterial.depthWrite = false;
    group.add(
      foot.toMesh(footMaterial, 'footprint-translucent-maker-foot'),
      claws.toMesh(clawMaterial, 'footprint-translucent-claws'),
    );
  }

  setShadowFlags(group);
  return group;
}

export function buildFootprint(): DinoViews {
  return { skeleton: buildFootprintSlab(false), living: buildFootprintSlab(true) };
}
