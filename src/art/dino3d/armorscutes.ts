import * as THREE from 'three';
import {
  GeometryBatch,
  coneBetween,
  ellipsoid,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import { addReliefEllipsoid, createStoneSlab, fossilMaterial } from './slabCommon';
import type { DinoViews } from './spinosaurus';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const P = (x: number, y: number): THREE.Vector2 => new THREE.Vector2(x, y);

const COLORS = {
  skin: '#8A7A56',
  plate: '#6E6248',
} as const;

interface ScutePosition {
  x: number;
  y: number;
  size: number;
  stretch: number;
}

const SCATTERED_SCUTES: readonly ScutePosition[] = [
  { x: -0.23, y: 0.1, size: 0.033, stretch: 1.25 },
  { x: -0.13, y: 0.08, size: 0.024, stretch: 1.4 },
  { x: -0.03, y: 0.105, size: 0.04, stretch: 1.2 },
  { x: 0.1, y: 0.075, size: 0.027, stretch: 1.5 },
  { x: 0.22, y: 0.11, size: 0.035, stretch: 1.25 },
  { x: -0.26, y: 0.19, size: 0.025, stretch: 1.4 },
  { x: -0.17, y: 0.205, size: 0.041, stretch: 1.15 },
  { x: -0.055, y: 0.18, size: 0.026, stretch: 1.5 },
  { x: 0.035, y: 0.215, size: 0.035, stretch: 1.3 },
  { x: 0.145, y: 0.19, size: 0.043, stretch: 1.15 },
  { x: 0.25, y: 0.225, size: 0.023, stretch: 1.55 },
  { x: -0.22, y: 0.29, size: 0.038, stretch: 1.2 },
  { x: -0.1, y: 0.28, size: 0.029, stretch: 1.45 },
  { x: 0.005, y: 0.315, size: 0.045, stretch: 1.1 },
  { x: 0.13, y: 0.29, size: 0.026, stretch: 1.5 },
  { x: 0.235, y: 0.32, size: 0.034, stretch: 1.25 },
  { x: -0.27, y: 0.375, size: 0.021, stretch: 1.45 },
  { x: -0.18, y: 0.385, size: 0.031, stretch: 1.25 },
  { x: -0.075, y: 0.37, size: 0.022, stretch: 1.55 },
  { x: 0.02, y: 0.395, size: 0.034, stretch: 1.2 },
  { x: 0.13, y: 0.38, size: 0.025, stretch: 1.45 },
  { x: 0.225, y: 0.395, size: 0.029, stretch: 1.3 },
] as const;

function buildSlab(): THREE.Group {
  const slab = createStoneSlab(0.6, 0.46, 0.052, 'armorscutes-stone-slab');
  const scutes = new GeometryBatch();
  for (const scute of SCATTERED_SCUTES) {
    addReliefEllipsoid(
      scutes,
      P(scute.x, scute.y),
      P(scute.size * scute.stretch, scute.size),
      scute.size * 0.58,
      slab.frontZ,
      8,
      5,
    );
  }
  slab.root.add(scutes.toMesh(fossilMaterial(), 'armorscutes-embedded-scattered-osteoderms'));
  setShadowFlags(slab.root);
  return slab.root;
}

function buildLiving(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'armorscutes-living-assembled-hide';
  root.rotation.x = THREE.MathUtils.degToRad(-55);
  root.position.y = 0.023;

  const skinGeometry = silhouetteGeometry(
    [
      P(-0.28, 0.035),
      P(-0.24, 0.01),
      P(0.22, 0.015),
      P(0.28, 0.05),
      P(0.275, 0.29),
      P(0.22, 0.34),
      P(-0.22, 0.335),
      P(-0.28, 0.29),
    ],
    0.018,
  );
  const skin = new THREE.Mesh(skinGeometry, makeOrganicMaterial(COLORS.skin));
  skin.name = 'armorscutes-skin-patch';
  root.add(skin);

  const plates = new GeometryBatch();
  const spikes = new GeometryBatch();
  const faceZ = 0.018;
  const rows = [
    { y: 0.09, count: 6, width: 0.46, size: 0.038 },
    { y: 0.17, count: 5, width: 0.4, size: 0.047 },
    { y: 0.255, count: 6, width: 0.47, size: 0.04 },
  ];
  for (const [rowIndex, row] of rows.entries()) {
    for (let index = 0; index < row.count; index += 1) {
      const t = row.count === 1 ? 0.5 : index / (row.count - 1);
      const x = (t - 0.5) * row.width + (rowIndex % 2 === 0 ? 0 : 0.012);
      const size = row.size * (0.88 + (index % 3) * 0.06);
      ellipsoid(plates, V(x, row.y, faceZ + 0.008), V(size * 1.25, size * 0.72, 0.027), 8, 5);
    }
  }

  for (const x of [-0.16, 0, 0.16]) {
    const base = V(x, 0.285, faceZ + 0.014);
    coneBetween(spikes, base, V(x, 0.31, faceZ + 0.095), 0.027, 6);
  }

  root.add(
    plates.toMesh(makeOrganicMaterial(COLORS.plate), 'armorscutes-assembled-armor-bands'),
    spikes.toMesh(makeOrganicMaterial(COLORS.plate), 'armorscutes-assembled-spikes'),
  );
  setShadowFlags(root);
  return root;
}

export function buildArmorScutes(): DinoViews {
  return { skeleton: buildSlab(), living: buildLiving() };
}
