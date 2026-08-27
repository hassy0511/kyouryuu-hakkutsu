import * as THREE from 'three';
import {
  ellipsoid,
  embeddedSideZ,
  GeometryBatch,
  loftGeometry,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
  silhouetteGeometry,
} from './common';
import type { DinoViews } from './spinosaurus';

const COLORS = {
  armor: '#5E6470',
  armorDark: '#454A54',
  body: '#7A8A96',
  belly: '#D9E4E8',
  bone: '#F2EAD8',
  fossilShade: '#CFC2A5',
  dark: '#211D18',
  iris: '#C9953E',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

const TAIL_FIN = [
  new THREE.Vector2(-2.18, 0.94),
  new THREE.Vector2(-2.5, 1.65),
  new THREE.Vector2(-2.62, 1.17),
  new THREE.Vector2(-2.54, 0.77),
  new THREE.Vector2(-2.35, 0.25),
  new THREE.Vector2(-2.08, 0.75),
] as const;

const DORSAL_FIN = [
  new THREE.Vector2(-1.18, 1.38),
  new THREE.Vector2(-0.63, 1.92),
  new THREE.Vector2(-0.12, 1.42),
] as const;

const PECTORAL_FIN = [
  new THREE.Vector2(0.16, 0.98),
  new THREE.Vector2(-0.32, 0.25),
  new THREE.Vector2(0.48, 0.78),
] as const;

const UPPER_BLADE = [
  new THREE.Vector2(0.42, 1.18),
  new THREE.Vector2(1.45, 1.12),
  new THREE.Vector2(1.18, 0.96),
  new THREE.Vector2(0.56, 0.91),
] as const;

const LOWER_BLADE = [
  new THREE.Vector2(0.48, 0.88),
  new THREE.Vector2(1.18, 0.92),
  new THREE.Vector2(1.38, 1.01),
  new THREE.Vector2(0.55, 0.7),
] as const;

function bodyGeometry(): THREE.BufferGeometry {
  return loftGeometry(
    [
      { center: V(-2.3, 0.95, 0), radiusY: 0.08, radiusZ: 0.08 },
      { center: V(-1.75, 1.02, 0), radiusY: 0.28, radiusZ: 0.3 },
      { center: V(-1.05, 1.12, 0), radiusY: 0.5, radiusZ: 0.48 },
      { center: V(-0.35, 1.15, 0), radiusY: 0.6, radiusZ: 0.58 },
      { center: V(0.25, 1.15, 0), radiusY: 0.54, radiusZ: 0.54 },
      { center: V(0.82, 1.13, 0), radiusY: 0.43, radiusZ: 0.46 },
      { center: V(1.36, 1.06, 0), radiusY: 0.24, radiusZ: 0.3 },
    ],
    11,
  );
}

function addEyes(group: THREE.Group): void {
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();
  for (const side of [-1, 1]) {
    const surface = 0.43;
    ellipsoid(dark, V(0.68, 1.31, embeddedSideZ(side, surface, 0.055)), V(0.12, 0.12, 0.055), 8, 6);
    ellipsoid(
      iris,
      V(0.7, 1.32, embeddedSideZ(side, surface + 0.014, 0.028)),
      V(0.064, 0.07, 0.028),
      7,
      5,
    );
    ellipsoid(
      dark,
      V(0.715, 1.32, embeddedSideZ(side, surface + 0.021, 0.015)),
      V(0.022, 0.04, 0.015),
      6,
      4,
    );
    ellipsoid(
      glint,
      V(0.68, 1.365, embeddedSideZ(side, surface + 0.027, 0.008)),
      V(0.012, 0.014, 0.008),
      5,
      4,
    );
  }
  group.add(
    dark.toMesh(makeOrganicMaterial(COLORS.dark), 'dunkleosteus-eye-details'),
    iris.toMesh(makeOrganicMaterial(COLORS.iris), 'dunkleosteus-irises'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'dunkleosteus-eye-glints'),
  );
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dunkleosteus-living';
  const body = new GeometryBatch();
  const belly = new GeometryBatch();
  const armor = new GeometryBatch();
  const armorDark = new GeometryBatch();
  const fins = new GeometryBatch();
  const blades = new GeometryBatch();

  body.add(bodyGeometry(), V(0, 0, 0));
  belly.add(
    loftGeometry(
      [
        { center: V(-1.65, 0.85, 0), radiusY: 0.08, radiusZ: 0.23 },
        { center: V(-0.85, 0.7, 0), radiusY: 0.12, radiusZ: 0.4 },
        { center: V(-0.1, 0.65, 0), radiusY: 0.12, radiusZ: 0.46 },
        { center: V(0.62, 0.78, 0), radiusY: 0.08, radiusZ: 0.38 },
        { center: V(1.22, 0.93, 0), radiusY: 0.035, radiusZ: 0.22 },
      ],
      10,
    ),
    V(0, 0, 0),
  );

  ellipsoid(armor, V(0.48, 1.21, 0), V(0.67, 0.58, 0.51), 10, 7);
  ellipsoid(armor, V(1.02, 1.14, 0), V(0.52, 0.37, 0.36), 9, 6);
  for (const side of [-1, 1]) {
    armorDark.addBetween(V(-0.06, 1.58, side * 0.42), V(0.78, 1.55, side * 0.38), 0.025, 0.018, 5);
    armorDark.addBetween(V(0.12, 0.77, side * 0.43), V(0.85, 0.83, side * 0.35), 0.024, 0.017, 5);
    armorDark.addBetween(V(0.42, 1.7, side * 0.27), V(0.5, 0.75, side * 0.39), 0.02, 0.016, 5);
    fins.add(silhouetteGeometry(PECTORAL_FIN, 0.035), V(0, 0, side * 0.43));
  }
  blades.add(silhouetteGeometry(UPPER_BLADE, 0.11), V(0, 0, 0));
  blades.add(silhouetteGeometry(LOWER_BLADE, 0.1), V(0, 0, 0));
  fins.add(silhouetteGeometry(DORSAL_FIN, 0.065), V(0, 0, 0));
  fins.add(silhouetteGeometry(TAIL_FIN, 0.075), V(0, 0, 0));

  const finMaterial = makeOrganicMaterial(COLORS.armorDark);
  finMaterial.side = THREE.DoubleSide;
  group.add(
    body.toMesh(makeOrganicMaterial(COLORS.body), 'dunkleosteus-body'),
    belly.toMesh(makeOrganicMaterial(COLORS.belly), 'dunkleosteus-belly'),
    armor.toMesh(makeOrganicMaterial(COLORS.armor), 'dunkleosteus-head-armor'),
    armorDark.toMesh(makeOrganicMaterial(COLORS.armorDark), 'dunkleosteus-armor-seams'),
    blades.toMesh(makeOrganicMaterial(COLORS.belly), 'dunkleosteus-jaw-blades'),
    fins.toMesh(finMaterial, 'dunkleosteus-fins'),
  );
  addEyes(group);
  setShadowFlags(group);
  return group;
}

function buildFossil(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dunkleosteus-fossil';
  const armor = new GeometryBatch();
  const shade = new GeometryBatch();
  const dark = new GeometryBatch();
  const trace = new GeometryBatch();

  ellipsoid(armor, V(0.46, 1.21, 0), V(0.69, 0.59, 0.5), 9, 6);
  ellipsoid(armor, V(1.01, 1.14, 0), V(0.53, 0.38, 0.35), 9, 6);
  for (const side of [-1, 1]) {
    shade.addBetween(V(-0.08, 1.57, side * 0.41), V(0.78, 1.54, side * 0.36), 0.035, 0.024, 5);
    shade.addBetween(V(0.08, 0.79, side * 0.42), V(0.87, 0.83, side * 0.32), 0.033, 0.022, 5);
    shade.addBetween(V(0.42, 1.68, side * 0.26), V(0.49, 0.75, side * 0.36), 0.029, 0.02, 5);
    ellipsoid(dark, V(0.67, 1.31, side * 0.45), V(0.13, 0.13, 0.035), 8, 5);
  }
  armor.add(silhouetteGeometry(UPPER_BLADE, 0.115), V(0, 0, 0));
  armor.add(silhouetteGeometry(LOWER_BLADE, 0.105), V(0, 0, 0));

  // Only a faint axial trace remains behind the bony armor: most of the body was cartilaginous.
  const tracePoints = [
    V(-0.12, 1.13, 0),
    V(-0.52, 1.11, 0),
    V(-0.95, 1.07, 0),
    V(-1.34, 1, 0),
    V(-1.7, 0.91, 0),
  ];
  tracePoints.forEach((point, index) => {
    ellipsoid(trace, point, V(0.055, 0.048, 0.048), 6, 4);
    const next = tracePoints[index + 1];
    if (next) trace.addBetween(point, next, 0.017, 0.012, 5);
  });

  group.add(
    armor.toMesh(makeFlatMaterial(COLORS.bone), 'dunkleosteus-fossil-armor-blades'),
    shade.toMesh(makeFlatMaterial(COLORS.fossilShade), 'dunkleosteus-armor-sutures'),
    dark.toMesh(makeFlatMaterial(COLORS.dark), 'dunkleosteus-orbits'),
    trace.toMesh(makeFlatMaterial('#AFA58E'), 'dunkleosteus-cartilage-trace'),
  );
  setShadowFlags(group);
  return group;
}

export function buildDunkleosteus(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
