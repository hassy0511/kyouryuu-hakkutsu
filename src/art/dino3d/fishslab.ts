import * as THREE from 'three';
import {
  GeometryBatch,
  ellipsoid,
  embeddedSideZ,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import { addReliefEllipsoid, addReliefLine, createStoneSlab, fossilMaterial } from './slabCommon';
import type { DinoViews } from './spinosaurus';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const P = (x: number, y: number): THREE.Vector2 => new THREE.Vector2(x, y);

const COLORS = {
  body: '#7FA8C9',
  belly: '#E8F0F4',
  fin: '#5A7A9A',
  iris: '#D8A84B',
  dark: '#211D18',
} as const;

function buildSlab(): THREE.Group {
  const slab = createStoneSlab(0.4, 0.29, 0.045, 'fishslab-stone-slab');
  const fossil = new GeometryBatch();
  const openings = new GeometryBatch();

  const spine = [
    P(-0.135, 0.145),
    P(-0.09, 0.148),
    P(-0.045, 0.151),
    P(0, 0.154),
    P(0.048, 0.157),
    P(0.095, 0.159),
  ];
  spine.forEach((point, index) => {
    addReliefEllipsoid(fossil, point, P(0.007, 0.006), 0.007, slab.frontZ, 6, 4);
    const next = spine[index + 1];
    if (next) addReliefLine(fossil, point, next, 0.0038, slab.frontZ, 5);
  });

  for (let index = 0; index < 8; index += 1) {
    const x = -0.09 + index * 0.022;
    const height = 0.052 - Math.abs(index - 3.5) * 0.0045;
    addReliefLine(fossil, P(x, 0.151), P(x - 0.01, 0.151 + height), 0.0021, slab.frontZ, 4);
    addReliefLine(fossil, P(x, 0.15), P(x - 0.006, 0.15 - height * 0.78), 0.0021, slab.frontZ, 4);
  }

  addReliefEllipsoid(fossil, P(0.135, 0.16), P(0.047, 0.053), 0.009, slab.frontZ, 8, 6);
  addReliefLine(fossil, P(0.105, 0.133), P(0.17, 0.125), 0.003, slab.frontZ, 4);
  addReliefEllipsoid(openings, P(0.15, 0.174), P(0.011, 0.011), 0.006, slab.frontZ, 7, 5);

  for (const tip of [
    P(-0.19, 0.09),
    P(-0.198, 0.12),
    P(-0.2, 0.15),
    P(-0.197, 0.18),
    P(-0.185, 0.21),
  ]) {
    addReliefLine(fossil, P(-0.13, 0.148), tip, 0.0022, slab.frontZ, 4);
  }
  for (const tip of [P(-0.03, 0.235), P(0.005, 0.228), P(0.038, 0.218)]) {
    addReliefLine(fossil, P(0.01, 0.159), tip, 0.0019, slab.frontZ, 4);
  }
  for (const tip of [P(-0.04, 0.072), P(0, 0.078), P(0.035, 0.085)]) {
    addReliefLine(fossil, P(0, 0.151), tip, 0.0019, slab.frontZ, 4);
  }

  slab.root.add(
    fossil.toMesh(fossilMaterial(), 'fishslab-embedded-skeleton'),
    openings.toMesh(makeFlatMaterial('#4E4437'), 'fishslab-embedded-eye-opening'),
  );
  setShadowFlags(slab.root);
  return slab.root;
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fishslab-living-fish';
  const body = new GeometryBatch();
  const belly = new GeometryBatch();
  const fins = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  body.add(
    loftGeometry(
      [
        { center: V(-0.145, 0.115, 0), radiusY: 0.025, radiusZ: 0.026 },
        { center: V(-0.095, 0.12, 0), radiusY: 0.055, radiusZ: 0.045 },
        { center: V(-0.02, 0.125, 0), radiusY: 0.075, radiusZ: 0.06 },
        { center: V(0.06, 0.127, 0), radiusY: 0.07, radiusZ: 0.057 },
        { center: V(0.125, 0.13, 0), radiusY: 0.052, radiusZ: 0.047 },
        { center: V(0.17, 0.13, 0), radiusY: 0.027, radiusZ: 0.03 },
      ],
      10,
    ),
    V(0, 0, 0),
  );
  ellipsoid(belly, V(0.005, 0.087, 0), V(0.115, 0.036, 0.056), 9, 5);

  fins.add(
    silhouetteGeometry(
      [P(-0.135, 0.116), P(-0.205, 0.19), P(-0.192, 0.12), P(-0.205, 0.052)],
      0.008,
    ),
    V(0, 0, 0),
  );
  fins.add(silhouetteGeometry([P(-0.045, 0.19), P(0.01, 0.245), P(0.06, 0.19)], 0.008), V(0, 0, 0));
  fins.add(
    silhouetteGeometry([P(-0.025, 0.07), P(0.02, 0.025), P(0.065, 0.073)], 0.008),
    V(0, 0, 0),
  );
  for (const side of [-1, 1]) {
    fins.add(
      silhouetteGeometry([P(0.045, 0.125), P(-0.005, 0.065), P(0.085, 0.105)], 0.005),
      V(0, 0, side * 0.052),
    );
    const eyeZ = embeddedSideZ(side, 0.046, 0.012, 0.22);
    ellipsoid(dark, V(0.125, 0.147, eyeZ), V(0.016, 0.016, 0.012), 7, 5);
    ellipsoid(iris, V(0.128, 0.148, eyeZ + side * 0.004), V(0.008, 0.009, 0.006), 6, 4);
    ellipsoid(glint, V(0.131, 0.153, eyeZ + side * 0.008), V(0.0025, 0.003, 0.002), 5, 4);
  }

  group.add(
    body.toMesh(makeOrganicMaterial(COLORS.body), 'fishslab-living-body'),
    belly.toMesh(makeOrganicMaterial(COLORS.belly), 'fishslab-living-belly'),
    fins.toMesh(makeOrganicMaterial(COLORS.fin), 'fishslab-living-fins'),
    dark.toMesh(makeOrganicMaterial(COLORS.dark), 'fishslab-living-eyes'),
    iris.toMesh(makeOrganicMaterial(COLORS.iris), 'fishslab-living-irises'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'fishslab-living-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

export function buildFishSlab(): DinoViews {
  return { skeleton: buildSlab(), living: buildLiving() };
}
