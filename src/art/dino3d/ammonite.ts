import * as THREE from 'three';
import {
  ellipsoid,
  GeometryBatch,
  makeFlatMaterial,
  makeOrganicMaterial,
  setShadowFlags,
} from './common';
import type { DinoViews } from './spinosaurus';

export const AMMONITE_COLORS = {
  shell: '#DCC9A8',
  shellStripe: '#A98F6B',
  softBody: '#E8907A',
  softBodyDark: '#B96760',
  iris: '#C68B38',
  fossil: '#F2EAD8',
  fossilShade: '#D7C9A9',
  dark: '#211D18',
} as const;

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const SHELL_CENTER = V(-0.035, 0.145, 0);
const SHELL_RADIUS = 0.105;
const SHELL_HALF_DEPTH = 0.036;

function addSpiral(batch: GeometryBatch, side: number, lineRadius: number): void {
  const turns = Math.PI * 4.15;
  const segments = 48;
  let previous = V(SHELL_CENTER.x + 0.008, SHELL_CENTER.y, side * (SHELL_HALF_DEPTH + 0.003));

  for (let index = 1; index <= segments; index += 1) {
    const angle = (index / segments) * turns;
    const radius = 0.007 + (index / segments) * 0.086;
    const point = V(
      SHELL_CENTER.x + Math.cos(angle) * radius,
      SHELL_CENTER.y + Math.sin(angle) * radius,
      side * (SHELL_HALF_DEPTH + 0.003),
    );
    batch.addBetween(previous, point, lineRadius, lineRadius * 0.88, 5);
    previous = point;
  }
}

function addShellRibs(batch: GeometryBatch, side: number, lineRadius: number): void {
  for (let index = 0; index < 15; index += 1) {
    const angle = -Math.PI + (index / 14) * Math.PI * 2;
    const innerRadius = 0.052;
    const outerRadius = 0.078;
    const z = side * (SHELL_HALF_DEPTH + 0.0025);
    batch.addBetween(
      V(
        SHELL_CENTER.x + Math.cos(angle) * innerRadius,
        SHELL_CENTER.y + Math.sin(angle) * innerRadius,
        z,
      ),
      V(
        SHELL_CENTER.x + Math.cos(angle) * outerRadius,
        SHELL_CENTER.y + Math.sin(angle) * outerRadius,
        z,
      ),
      lineRadius,
      lineRadius * 0.75,
      5,
    );
  }
}

function createShell(
  shellColor: THREE.ColorRepresentation,
  lineColor: THREE.ColorRepresentation,
  flat: boolean,
  namePrefix: string,
): THREE.Group {
  const group = new THREE.Group();
  const shell = new GeometryBatch();
  const lines = new GeometryBatch();
  const rim = new GeometryBatch();

  ellipsoid(shell, SHELL_CENTER, V(SHELL_RADIUS, SHELL_RADIUS, SHELL_HALF_DEPTH), 22, 12);
  rim.add(new THREE.TorusGeometry(SHELL_RADIUS * 0.91, 0.005, 5, 28), SHELL_CENTER, V(1, 1, 0.8));
  for (const side of [-1, 1]) {
    addSpiral(lines, side, 0.0022);
    addShellRibs(lines, side, 0.00165);
  }

  const shellMaterial = flat ? makeFlatMaterial(shellColor) : makeOrganicMaterial(shellColor);
  const lineMaterial = flat ? makeFlatMaterial(lineColor) : makeOrganicMaterial(lineColor);
  group.add(
    shell.toMesh(shellMaterial, `${namePrefix}-shell`),
    rim.toMesh(lineMaterial, `${namePrefix}-rim`),
    lines.toMesh(lineMaterial, `${namePrefix}-spiral-ribs`),
  );
  return group;
}

function addTentacle(
  soft: GeometryBatch,
  tips: GeometryBatch,
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
): void {
  const steps = 4;
  let previous = start;
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const inverse = 1 - t;
    const point = V(
      inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
      inverse * inverse * start.z + 2 * inverse * t * control.z + t * t * end.z,
    );
    soft.addBetween(previous, point, 0.0065 - t * 0.0025, 0.0058 - t * 0.0028, 6);
    previous = point;
  }
  ellipsoid(tips, end, V(0.005, 0.005, 0.005), 6, 4);
}

function buildLiving(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ammonite-living';
  group.add(
    createShell(AMMONITE_COLORS.shell, AMMONITE_COLORS.shellStripe, false, 'ammonite-living'),
  );

  const soft = new GeometryBatch();
  const farSoft = new GeometryBatch();
  const tips = new GeometryBatch();
  const dark = new GeometryBatch();
  const iris = new GeometryBatch();
  const glint = new GeometryBatch();

  ellipsoid(soft, V(0.065, 0.13, 0), V(0.065, 0.05, 0.047), 12, 8);
  ellipsoid(soft, V(0.105, 0.13, 0), V(0.047, 0.042, 0.043), 10, 7);

  const tentacleEnds = [
    V(0.155, 0.205, 0.02),
    V(0.17, 0.18, 0.04),
    V(0.183, 0.15, 0.05),
    V(0.187, 0.12, 0.055),
    V(0.175, 0.09, 0.045),
    V(0.163, 0.062, 0.025),
    V(0.155, 0.052, -0.02),
    V(0.17, 0.078, -0.045),
    V(0.18, 0.115, -0.052),
    V(0.167, 0.165, -0.038),
  ] as const;
  tentacleEnds.forEach((end, index) => {
    const start = V(0.118, 0.135 + (index - 4.5) * 0.003, (index - 4.5) * 0.006);
    const control = V(0.16, end.y + (index % 2 === 0 ? 0.012 : -0.008), end.z * 0.72);
    addTentacle(index < 6 ? soft : farSoft, tips, start, control, end);
  });

  for (const side of [-1, 1]) {
    ellipsoid(dark, V(0.092, 0.16, side * 0.041), V(0.019, 0.018, 0.006), 7, 5);
    ellipsoid(iris, V(0.094, 0.161, side * 0.046), V(0.012, 0.012, 0.003), 7, 5);
    ellipsoid(dark, V(0.096, 0.161, side * 0.0485), V(0.0045, 0.0065, 0.0015), 5, 4);
    ellipsoid(glint, V(0.091, 0.166, side * 0.0505), V(0.0026, 0.0028, 0.0008), 5, 4);
  }

  group.add(
    farSoft.toMesh(makeOrganicMaterial(AMMONITE_COLORS.softBodyDark), 'ammonite-far-tentacles'),
    soft.toMesh(makeOrganicMaterial(AMMONITE_COLORS.softBody), 'ammonite-soft-body'),
    tips.toMesh(makeOrganicMaterial(AMMONITE_COLORS.softBody), 'ammonite-tentacle-tips'),
    iris.toMesh(makeOrganicMaterial(AMMONITE_COLORS.iris), 'ammonite-irises'),
    dark.toMesh(makeOrganicMaterial(AMMONITE_COLORS.dark), 'ammonite-eye-details'),
    glint.toMesh(makeOrganicMaterial('#FFFDF4'), 'ammonite-eye-glints'),
  );
  setShadowFlags(group);
  return group;
}

function buildFossil(): THREE.Group {
  const group = createShell(
    AMMONITE_COLORS.fossil,
    AMMONITE_COLORS.fossilShade,
    true,
    'ammonite-fossil',
  );
  group.name = 'ammonite-skeleton-fossil-shell';
  setShadowFlags(group);
  return group;
}

export function buildAmmonite(): DinoViews {
  return { skeleton: buildFossil(), living: buildLiving() };
}
