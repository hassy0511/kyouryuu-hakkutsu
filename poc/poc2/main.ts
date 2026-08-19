import * as THREE from 'three';
import { FpsMeter } from '../shared/fps';
import { Sfx } from './audio';
import { DebrisParticles } from './particles';

const GRID_X = 8;
const GRID_Z = 8;
const GRID_DEPTH = 6;
const CELL = 0.55;
const PITCH = 0.57;
const STRATA_COLORS = [0xe6d491, 0xe6d491, 0xb59a76, 0xb59a76, 0xa8674a, 0xa8674a];

const BRUSH_HITS_TO_REMOVE = 3;
const ACTION_COOLDOWN_MS = 130;
const DAMAGE_CAP_PER_ACTION = 2;

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

// ---- voxel grid -------------------------------------------------------------

class VoxelGrid {
  readonly mesh: THREE.InstancedMesh;
  readonly alive: boolean[] = [];
  removedCount = 0;
  private readonly baseColors: THREE.Color[] = [];
  private readonly brushHits: number[] = [];
  private readonly lastHitAt: number[] = [];
  private readonly m = new THREE.Matrix4();

  constructor() {
    const geo = new THREE.BoxGeometry(CELL, CELL, CELL);
    const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
    this.mesh = new THREE.InstancedMesh(geo, mat, GRID_X * GRID_Z * GRID_DEPTH);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    for (let i = 0; i < GRID_X * GRID_Z * GRID_DEPTH; i++) {
      const { layer, gx, gz } = this.coords(i);
      const color = new THREE.Color(STRATA_COLORS[layer]!);
      color.offsetHSL(0, 0, (((gx * 31 + gz * 17 + layer * 7) % 10) / 10 - 0.5) * 0.05);
      this.baseColors.push(color);
      this.alive.push(true);
      this.brushHits.push(0);
      this.lastHitAt.push(0);
      this.mesh.setColorAt(i, color);
    }
    this.reset();
  }

  idx(gx: number, gz: number, layer: number): number {
    return (layer * GRID_X + gx) * GRID_Z + gz;
  }

  coords(i: number): { gx: number; gz: number; layer: number } {
    const gz = i % GRID_Z;
    const gx = Math.floor(i / GRID_Z) % GRID_X;
    const layer = Math.floor(i / (GRID_X * GRID_Z));
    return { gx, gz, layer };
  }

  center(i: number): THREE.Vector3 {
    const { gx, gz, layer } = this.coords(i);
    return new THREE.Vector3(
      (gx - (GRID_X - 1) / 2) * PITCH,
      (GRID_DEPTH - layer - 0.5) * PITCH,
      (gz - (GRID_Z - 1) / 2) * PITCH,
    );
  }

  color(i: number): THREE.Color {
    return this.baseColors[i]!;
  }

  // 面で接する同レイヤーの4近傍
  lateralNeighbors(i: number): number[] {
    const { gx, gz, layer } = this.coords(i);
    const out: number[] = [];
    if (gx > 0) out.push(this.idx(gx - 1, gz, layer));
    if (gx < GRID_X - 1) out.push(this.idx(gx + 1, gz, layer));
    if (gz > 0) out.push(this.idx(gx, gz - 1, layer));
    if (gz < GRID_Z - 1) out.push(this.idx(gx, gz + 1, layer));
    return out;
  }

  faceNeighbors(i: number): number[] {
    const { gx, gz, layer } = this.coords(i);
    const out = this.lateralNeighbors(i);
    if (layer > 0) out.push(this.idx(gx, gz, layer - 1));
    if (layer < GRID_DEPTH - 1) out.push(this.idx(gx, gz, layer + 1));
    return out;
  }

  remove(i: number): boolean {
    if (!this.alive[i]) return false;
    this.alive[i] = false;
    this.removedCount++;
    this.m.makeScale(0, 0, 0);
    this.m.setPosition(this.center(i));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  // ブラシは数回なでると取れる。取れたら 'removed'、縮んだだけなら 'shrunk'
  hitBrush(i: number, now: number): 'removed' | 'shrunk' | null {
    if (!this.alive[i]) return null;
    if (now - this.lastHitAt[i]! < ACTION_COOLDOWN_MS) return null;
    this.lastHitAt[i] = now;
    this.brushHits[i]!++;
    if (this.brushHits[i]! >= BRUSH_HITS_TO_REMOVE) {
      this.remove(i);
      return 'removed';
    }
    const scale = 1 - this.brushHits[i]! * 0.16;
    this.m.makeScale(scale, scale, scale);
    this.m.setPosition(this.center(i));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.instanceMatrix.needsUpdate = true;
    return 'shrunk';
  }

  reset(): void {
    this.removedCount = 0;
    for (let i = 0; i < this.alive.length; i++) {
      this.alive[i] = true;
      this.brushHits[i] = 0;
      this.lastHitAt[i] = 0;
      this.m.makeScale(1, 1, 1);
      this.m.setPosition(this.center(i));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---- fossil -----------------------------------------------------------------

class Fossil {
  readonly group = new THREE.Group();
  cells = new Set<number>();
  hintCells = new Set<number>();
  private readonly material = new THREE.MeshStandardMaterial({
    color: 0xf7f3e8,
    roughness: 0.55,
  });

  constructor(private grid: VoxelGrid) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, PITCH * 2.1, 10),
      this.material,
    );
    shaft.rotation.z = Math.PI / 2;
    this.group.add(shaft);
    const knobGeo = new THREE.SphereGeometry(0.14, 10, 8);
    for (const [dx, dz] of [
      [-PITCH * 1.05, -0.08],
      [-PITCH * 1.05, 0.08],
      [PITCH * 1.05, -0.08],
      [PITCH * 1.05, 0.08],
    ]) {
      const knob = new THREE.Mesh(knobGeo, this.material);
      knob.position.set(dx!, 0, dz!);
      this.group.add(knob);
    }
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  place(): void {
    const layer = 2 + Math.floor(Math.random() * 3);
    const alongX = Math.random() < 0.5;
    const a0 = 1 + Math.floor(Math.random() * (GRID_X - 4));
    const b = 1 + Math.floor(Math.random() * (GRID_Z - 2));

    this.cells.clear();
    for (let k = 0; k < 3; k++) {
      const gx = alongX ? a0 + k : b;
      const gz = alongX ? b : a0 + k;
      this.cells.add(this.grid.idx(gx, gz, layer));
    }
    this.hintCells.clear();
    for (const c of this.cells) {
      for (const n of this.grid.faceNeighbors(c)) {
        if (!this.cells.has(n)) this.hintCells.add(n);
      }
    }

    const centerIdx = [...this.cells][1]!;
    this.group.position.copy(this.grid.center(centerIdx));
    this.group.rotation.y = alongX ? 0 : Math.PI / 2;
    this.setDamage(0);
    this.group.scale.setScalar(1);
  }

  setDamage(damage: number): void {
    this.material.color.lerpColors(
      new THREE.Color(0xf7f3e8),
      new THREE.Color(0x8f7d66),
      Math.min(damage, 3) / 3,
    );
  }

  celebrate(): void {
    this.group.scale.setScalar(1.12);
    this.material.emissive.setHex(0xffe28a);
    this.material.emissiveIntensity = 0.35;
  }

  calm(): void {
    this.material.emissive.setHex(0x000000);
    this.material.emissiveIntensity = 0;
  }
}

// ---- scene ------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
el('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed4ef);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const camBase = new THREE.Vector3(0, 8.4, 7.6);
camera.position.copy(camBase);
camera.lookAt(0, 1.3, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xfff2d8, 2.0);
sun.position.set(10, 16, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
sun.shadow.bias = -0.0005;
scene.add(sun);

{
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 40).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd4bd8a, roughness: 1 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6b47, roughness: 0.9 });
  const size = GRID_X * PITCH + 0.4;
  const plankGeo = new THREE.BoxGeometry(size + 0.3, 0.12, 0.18);
  for (const [rot, x, z] of [
    [0, 0, size / 2],
    [0, 0, -size / 2],
    [Math.PI / 2, size / 2, 0],
    [Math.PI / 2, -size / 2, 0],
  ] as const) {
    const plank = new THREE.Mesh(plankGeo, frameMat);
    plank.position.set(x, GRID_DEPTH * PITCH + 0.06, z);
    plank.rotation.y = rot;
    plank.castShadow = true;
    scene.add(plank);
  }
}

const grid = new VoxelGrid();
scene.add(grid.mesh);
const fossil = new Fossil(grid);
scene.add(fossil.group);
const particles = new DebrisParticles();
scene.add(particles.mesh);
const sfx = new Sfx();

// ---- game state -------------------------------------------------------------

type Tool = 'pick' | 'brush';
let tool: Tool = 'pick';
let damage = 0;
let revealed = false;
let shake = 0;
let lastActionAt = 0;
let msgTimer: ReturnType<typeof setTimeout> | undefined;

const starsEl = el('stars');
const damageEl = el('damage');
const msgEl = el('msg');

function starsFor(d: number): string {
  return d === 0 ? '★★★' : d <= 2 ? '★★☆' : '★☆☆';
}

function updateHud(): void {
  starsEl.textContent = starsFor(damage);
  damageEl.textContent = `ヒビ ${damage}`;
}

function showMsg(text: string): void {
  msgEl.textContent = text;
  msgEl.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => msgEl.classList.remove('show'), 2400);
}

function setTool(next: Tool): void {
  tool = next;
  el('btn-pick').classList.toggle('active', tool === 'pick');
  el('btn-brush').classList.toggle('active', tool === 'brush');
}

function reset(): void {
  grid.reset();
  fossil.place();
  fossil.calm();
  damage = 0;
  revealed = false;
  updateHud();
  el('overlay').classList.remove('show');
  setTool('pick');
}

function checkReveal(): void {
  if (revealed) return;
  for (const c of fossil.cells) if (grid.alive[c]) return;
  revealed = true;
  fossil.celebrate();
  sfx.fanfare();
  setTimeout(() => {
    el('result-stars').textContent = starsFor(damage);
    el('result-text').textContent =
      damage === 0 ? 'むきずで ほりだせた!' : `ヒビ ${damage}こ ついちゃった…`;
    el('overlay').classList.add('show');
  }, 900);
}

// セルが消えた時の共通処理。骨があるセルだったか・ヒント圏内だったかを返す
function onCellRemoved(i: number): { isFossil: boolean; hinted: boolean } {
  particles.burst(grid.center(i), grid.color(i), 8);
  return { isFossil: fossil.cells.has(i), hinted: fossil.hintCells.has(i) };
}

function dig(clientX: number, clientY: number): void {
  if (revealed) return;
  const now = performance.now();

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster
    .intersectObject(grid.mesh)
    .find((h) => h.instanceId !== undefined && grid.alive[h.instanceId]);
  if (!hit || hit.instanceId === undefined) return;
  const target = hit.instanceId;

  if (tool === 'pick') {
    if (now - lastActionAt < ACTION_COOLDOWN_MS) return;
    lastActionAt = now;
    let damaged = 0;
    let hinted = false;
    for (const i of [target, ...grid.lateralNeighbors(target)]) {
      if (!grid.remove(i)) continue;
      const r = onCellRemoved(i);
      if (r.isFossil && damaged < DAMAGE_CAP_PER_ACTION) damaged++;
      hinted ||= r.hinted;
    }
    sfx.pick();
    if (damaged > 0) {
      damage += damaged;
      fossil.setDamage(damage);
      sfx.crack();
      shake = 1;
      showMsg('💥 かせきに ヒビが はいった…!');
      updateHud();
    } else if (hinted) {
      sfx.hint();
      particles.burst(
        grid.center(target).add(new THREE.Vector3(0, 0.3, 0)),
        new THREE.Color(0xffe28a),
        6,
      );
      showMsg('✨ かせきが ちかい! ブラシに もちかえよう');
    }
  } else {
    const result = grid.hitBrush(target, now);
    if (!result) return;
    sfx.brush();
    if (result === 'removed') {
      const r = onCellRemoved(target);
      if (r.isFossil) {
        sfx.hint();
        showMsg('🦴 ホネが みえてきた!');
      } else if (r.hinted) {
        sfx.hint();
        showMsg('✨ かせきが ちかい!');
      }
    } else {
      particles.burst(grid.center(target), grid.color(target), 2);
    }
  }
  checkReveal();
}

// ---- input ------------------------------------------------------------------

let activePointer: number | null = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (activePointer !== null) return;
  activePointer = e.pointerId;
  renderer.domElement.setPointerCapture(e.pointerId);
  dig(e.clientX, e.clientY);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerId !== activePointer) return;
  dig(e.clientX, e.clientY);
});
const release = (e: PointerEvent): void => {
  if (e.pointerId === activePointer) activePointer = null;
};
renderer.domElement.addEventListener('pointerup', release);
renderer.domElement.addEventListener('pointercancel', release);

el('btn-pick').addEventListener('click', () => setTool('pick'));
el('btn-brush').addEventListener('click', () => setTool('brush'));
el('btn-reset').addEventListener('click', reset);
el('btn-again').addEventListener('click', reset);

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// スモークテスト用の観測フック
(window as unknown as Record<string, unknown>).__poc2 = {
  removed: () => grid.removedCount,
  damage: () => damage,
  revealed: () => revealed,
  fossilCoords: () => [...fossil.cells].map((i) => grid.coords(i)),
  cellScreen: (gx: number, gz: number, layer: number) => {
    const p = grid.center(grid.idx(gx, gz, layer)).project(camera);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
  },
};

// ---- loop -------------------------------------------------------------------

const meter = new FpsMeter(el('fps'), el('ms'), el('fps-min'));
const clock = new THREE.Clock();
reset();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  particles.update(dt);

  if (shake > 0) {
    shake = Math.max(0, shake - dt * 3.2);
    camera.position.set(
      camBase.x + (Math.random() - 0.5) * 0.18 * shake,
      camBase.y + (Math.random() - 0.5) * 0.14 * shake,
      camBase.z,
    );
  } else {
    camera.position.copy(camBase);
  }

  renderer.render(scene, camera);
  meter.tick();
});
