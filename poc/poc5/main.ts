import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FpsMeter } from '../shared/fps';
import { Sfx } from '../poc2/audio';
import { DebrisParticles } from '../poc2/particles';

// POC-5: 発掘コア再設計の手触り検証。
// ピッケル=土を掘る(制限なし・骨に当てるとヒビ) / ブラシ=露出した骨をみがく(土は掘れない)。
// ブラシの手触りは「こすり型」「ゲージ型」を切り替えて比較できる。スタミナなし。

const GRID_X = 8;
const GRID_Z = 8;
const GRID_DEPTH = 6;
const CELL = 0.55;
const PITCH = 0.57;
const STRATA_COLORS = [0xe6d491, 0xe6d491, 0xb59a76, 0xb59a76, 0xa8674a, 0xa8674a];

const ACTION_COOLDOWN_MS = 130;
const DAMAGE_CAP_PER_ACTION = 2;
const TAP_DEFER_MS = 70;
const RUB_PROGRESS_PER_PX = 1 / 300;
const TAP_POLISH_AMOUNT = 0.25;
const GAUGE_SPEED = 3.4; // rad/s

interface BoneDef {
  id: string;
  nameJa: string;
  layer: number;
  cells: [number, number][];
  kind: 'long' | 'blob';
}

// 固定配置(柱2)。せぼね=長い/あたまのほね=かたまり — 形の違いが「どこまで続く?」の推理になる
const BONES: BoneDef[] = [
  {
    id: 'spine',
    nameJa: 'せぼね',
    layer: 2,
    kind: 'long',
    cells: [
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ],
  },
  {
    id: 'skull',
    nameJa: 'あたまのほね',
    layer: 3,
    kind: 'blob',
    cells: [
      [5, 2],
      [6, 2],
      [5, 3],
      [6, 3],
    ],
  },
];

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

const idx = (gx: number, gz: number, layer: number): number => (layer * GRID_X + gx) * GRID_Z + gz;
const coords = (i: number): { gx: number; gz: number; layer: number } => ({
  gz: i % GRID_Z,
  gx: Math.floor(i / GRID_Z) % GRID_X,
  layer: Math.floor(i / (GRID_X * GRID_Z)),
});
const cellCenter = (i: number): THREE.Vector3 => {
  const { gx, gz, layer } = coords(i);
  return new THREE.Vector3(
    (gx - (GRID_X - 1) / 2) * PITCH,
    (GRID_DEPTH - layer - 0.5) * PITCH,
    (gz - (GRID_Z - 1) / 2) * PITCH,
  );
};
const faceNeighbors = (i: number): number[] => {
  const { gx, gz, layer } = coords(i);
  const out: number[] = [];
  if (gx > 0) out.push(idx(gx - 1, gz, layer));
  if (gx < GRID_X - 1) out.push(idx(gx + 1, gz, layer));
  if (gz > 0) out.push(idx(gx, gz - 1, layer));
  if (gz < GRID_Z - 1) out.push(idx(gx, gz + 1, layer));
  if (layer > 0) out.push(idx(gx, gz, layer - 1));
  if (layer < GRID_DEPTH - 1) out.push(idx(gx, gz, layer + 1));
  return out;
};
const lateralNeighbors = (i: number): number[] => {
  const { gx, gz, layer } = coords(i);
  const out: number[] = [];
  if (gx > 0) out.push(idx(gx - 1, gz, layer));
  if (gx < GRID_X - 1) out.push(idx(gx + 1, gz, layer));
  if (gz > 0) out.push(idx(gx, gz - 1, layer));
  if (gz < GRID_Z - 1) out.push(idx(gx, gz + 1, layer));
  return out;
};

// ---- scene ------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
el('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed4ef);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 8.4, 7.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.7, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 16;
controls.minPolarAngle = THREE.MathUtils.degToRad(15);
controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
controls.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.mouseButtons = {
  LEFT: null as unknown as THREE.MOUSE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

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
}

const digGroup = new THREE.Group();
scene.add(digGroup);
{
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
    digGroup.add(plank);
  }
}

const particles = new DebrisParticles();
scene.add(particles.mesh);
const sfx = new Sfx();

// ---- grid -------------------------------------------------------------------

const CELL_COUNT = GRID_X * GRID_Z * GRID_DEPTH;
const soilGeo = new THREE.BoxGeometry(CELL, CELL, CELL);
const soilMat = new THREE.MeshStandardMaterial({ roughness: 1 });
const soil = new THREE.InstancedMesh(soilGeo, soilMat, CELL_COUNT);
soil.castShadow = true;
soil.receiveShadow = true;
digGroup.add(soil);

const alive: boolean[] = [];
const baseColors: THREE.Color[] = [];
{
  const color = new THREE.Color();
  for (let i = 0; i < CELL_COUNT; i++) {
    const { gx, gz, layer } = coords(i);
    color.setHex(STRATA_COLORS[layer]!);
    color.offsetHSL(0, 0, (((gx * 31 + gz * 17 + layer * 7) % 10) / 10 - 0.5) * 0.05);
    baseColors.push(color.clone());
    soil.setColorAt(i, color);
    alive.push(true);
  }
}
const m4 = new THREE.Matrix4();
function setSoil(i: number, present: boolean): void {
  alive[i] = present;
  m4.makeScale(present ? 1 : 0, present ? 1 : 0, present ? 1 : 0);
  m4.setPosition(cellCenter(i));
  soil.setMatrixAt(i, m4);
  soil.instanceMatrix.needsUpdate = true;
}
for (let i = 0; i < CELL_COUNT; i++) setSoil(i, true);

// ---- bones ------------------------------------------------------------------

type CellStatus = 'hidden' | 'crusted' | 'clean';
interface BoneCell {
  status: CellStatus;
  progress: number;
  crust: THREE.Mesh;
}

class Bone {
  readonly cells = new Map<number, BoneCell>();
  readonly group = new THREE.Group();
  damage = 0;
  collected = false;
  private readonly material = new THREE.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.5 });

  constructor(readonly def: BoneDef) {
    const crustGeo = new THREE.BoxGeometry(CELL * 0.96, CELL * 0.96, CELL * 0.96);
    for (const [gx, gz] of def.cells) {
      const i = idx(gx, gz, def.layer);
      const crust = new THREE.Mesh(
        crustGeo,
        new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 1, transparent: true }),
      );
      crust.position.copy(cellCenter(i));
      crust.visible = false;
      digGroup.add(crust);
      this.cells.set(i, { status: 'hidden', progress: 0, crust });
    }

    const center = new THREE.Vector3();
    for (const [gx, gz] of def.cells) center.add(cellCenter(idx(gx, gz, def.layer)));
    center.divideScalar(def.cells.length);

    if (def.kind === 'long') {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, PITCH * def.cells.length * 0.86, 10),
        this.material,
      );
      shaft.rotation.z = Math.PI / 2;
      this.group.add(shaft);
      const knobGeo = new THREE.SphereGeometry(0.15, 10, 8);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const knob = new THREE.Mesh(knobGeo, this.material);
          knob.position.set((sx * PITCH * def.cells.length * 0.86) / 2, 0, sz * 0.09);
          this.group.add(knob);
        }
      }
    } else {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), this.material);
      dome.scale.set(1.15, 0.85, 1.15);
      this.group.add(dome);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.3), this.material);
      snout.position.set(0.4, -0.08, 0);
      this.group.add(snout);
      const eyeGeo = new THREE.SphereGeometry(0.07, 8, 6);
      const dark = new THREE.MeshStandardMaterial({ color: 0x3a3226 });
      for (const sz of [-1, 1]) {
        const socket = new THREE.Mesh(eyeGeo, dark);
        socket.position.set(0.16, 0.12, sz * 0.18);
        this.group.add(socket);
      }
    }
    this.group.position.copy(center);
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    digGroup.add(this.group);
  }

  stars(): number {
    return this.damage === 0 ? 3 : this.damage <= 2 ? 2 : 1;
  }

  tintByDamage(): void {
    this.material.color.lerpColors(
      new THREE.Color(0xf7f3e8),
      new THREE.Color(0x8f7d66),
      Math.min(this.damage, 3) / 3,
    );
  }

  celebrate(): void {
    this.material.emissive.setHex(0xffe28a);
    this.material.emissiveIntensity = 0.4;
    this.group.scale.setScalar(1.1);
  }
}

const bones: Bone[] = BONES.map((def) => new Bone(def));
const boneCellOwner = new Map<number, Bone>();
for (const bone of bones) for (const i of bone.cells.keys()) boneCellOwner.set(i, bone);

// ---- game state -------------------------------------------------------------

type Tool = 'pick' | 'brush';
type BrushStyle = 'rub' | 'gauge';
let tool: Tool = 'pick';
let brushStyle: BrushStyle = 'rub';
let finished = false;
let shake = 0;
let lastActionAt = 0;
let firstRevealShown = false;
let msgTimer: ReturnType<typeof setTimeout> | undefined;

// ゲージ状態
let gaugeCell = -1;
let gaugeT = 0;

function showMsg(text: string): void {
  const msg = el('msg');
  msg.textContent = text;
  msg.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => msg.classList.remove('show'), 2600);
}

function updateBoneHud(): void {
  for (const bone of bones) {
    const cells = [...bone.cells.values()];
    const label = el(`bone-${bone.def.id}`);
    if (bone.collected) {
      label.textContent = '★'.repeat(bone.stars()) + '☆'.repeat(3 - bone.stars());
    } else if (cells.every((c) => c.status === 'hidden')) {
      label.textContent = 'つちの なか';
    } else {
      const clean = cells.filter((c) => c.status === 'clean').length;
      label.textContent = `みがき ${clean}/${cells.length}`;
    }
  }
}

function setTool(next: Tool): void {
  tool = next;
  hideGauge();
  el('btn-pick').classList.toggle('active', next === 'pick');
  el('btn-brush').classList.toggle('active', next === 'brush');
}

function setBrushStyle(next: BrushStyle): void {
  brushStyle = next;
  hideGauge();
  el('btn-style').textContent = next === 'rub' ? '🖐️ こすりモード' : '🎯 ゲージモード';
}

function hideGauge(): void {
  gaugeCell = -1;
  el('gauge').classList.remove('show');
}

function raycastCell(clientX: number, clientY: number): number | null {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const targets: THREE.Object3D[] = [soil];
  for (const bone of bones) {
    for (const cell of bone.cells.values()) if (cell.crust.visible) targets.push(cell.crust);
  }
  const hits = raycaster.intersectObjects(targets, false);
  for (const hit of hits) {
    if (hit.object === soil) {
      if (hit.instanceId !== undefined && alive[hit.instanceId]) return hit.instanceId;
      continue;
    }
    for (const bone of bones) {
      for (const [i, cell] of bone.cells) if (cell.crust === hit.object) return i;
    }
  }
  return null;
}

function reveal(i: number): void {
  const bone = boneCellOwner.get(i);
  if (!bone) return;
  const cell = bone.cells.get(i)!;
  if (cell.status !== 'hidden') return;
  cell.status = 'crusted';
  cell.crust.visible = true;
  if (alive[i]) setSoil(i, false);
  particles.burst(cellCenter(i), new THREE.Color(0xbfa88a), 5);
  if (!firstRevealShown) {
    firstRevealShown = true;
    sfx.hint();
    showMsg('🦴 ホネが でてきた! ブラシで みがこう');
  }
  updateBoneHud();
}

function revealNeighbors(removed: number): void {
  for (const n of faceNeighbors(removed)) {
    if (boneCellOwner.has(n)) reveal(n);
  }
}

function polish(i: number, amount: number): void {
  const bone = boneCellOwner.get(i);
  if (!bone) return;
  const cell = bone.cells.get(i)!;
  if (cell.status !== 'crusted') return;
  cell.progress = Math.min(1, cell.progress + amount);
  (cell.crust.material as THREE.MeshStandardMaterial).opacity = 1 - cell.progress;
  if (cell.progress >= 1) {
    cell.status = 'clean';
    cell.crust.visible = false;
    sfx.shine();
    particles.burst(cellCenter(i), new THREE.Color(0xfff2b8), 8);
    updateBoneHud();
    checkBone(bone);
  }
}

function checkBone(bone: Bone): void {
  if (bone.collected) return;
  for (const cell of bone.cells.values()) if (cell.status !== 'clean') return;
  bone.collected = true;
  bone.celebrate();
  sfx.fanfare();
  showMsg(
    `🦴 ${bone.def.nameJa}を ほりだした! ${'★'.repeat(bone.stars())}${'☆'.repeat(3 - bone.stars())}`,
  );
  updateBoneHud();
  if (bones.every((b) => b.collected) && !finished) {
    finished = true;
    setTimeout(() => {
      el('result-list').innerHTML = bones
        .map(
          (b) =>
            `<div>${b.def.nameJa} <span class="stars">${'★'.repeat(b.stars())}${'☆'.repeat(3 - b.stars())}</span></div>`,
        )
        .join('');
      el('overlay').classList.add('show');
    }, 1500);
  }
}

function swingPick(target: number): void {
  const now = performance.now();
  if (now - lastActionAt < ACTION_COOLDOWN_MS) return;
  lastActionAt = now;
  let damaged = 0;
  for (const i of [target, ...lateralNeighbors(target)]) {
    const bone = boneCellOwner.get(i);
    if (bone) {
      const cell = bone.cells.get(i)!;
      if (cell.status === 'hidden' || alive[i]) {
        if (alive[i]) setSoil(i, false);
        reveal(i);
      }
      if (damaged < DAMAGE_CAP_PER_ACTION) {
        damaged++;
        bone.damage++;
        bone.tintByDamage();
      }
      continue;
    }
    if (!alive[i]) continue;
    setSoil(i, false);
    particles.burst(cellCenter(i), baseColors[i]!, 8);
    revealNeighbors(i);
  }
  sfx.pick();
  if (damaged > 0) {
    sfx.crack();
    shake = 1;
    showMsg('💥 ホネに ヒビが はいった…!');
    updateBoneHud();
  }
}

function stopGauge(): void {
  const cellIdx = gaugeCell;
  hideGauge();
  const pos = 0.5 + 0.5 * Math.sin(gaugeT * GAUGE_SPEED);
  const dist = Math.abs(pos - 0.5);
  if (dist <= 0.09) {
    sfx.shine();
    showMsg('✨ ピッタリ!');
    polish(cellIdx, 1);
  } else if (dist <= 0.24) {
    sfx.brush();
    polish(cellIdx, 0.5);
  } else {
    sfx.rub();
    showMsg('おっと! もういちど');
  }
}

function tapAction(clientX: number, clientY: number): void {
  if (finished) return;
  if (tool === 'brush' && brushStyle === 'gauge' && gaugeCell >= 0) {
    stopGauge();
    return;
  }
  const target = raycastCell(clientX, clientY);
  if (target === null) return;

  if (tool === 'pick') {
    swingPick(target);
    return;
  }
  const bone = boneCellOwner.get(target);
  if (!bone || bone.cells.get(target)!.status !== 'crusted') {
    sfx.rub();
    return;
  }
  if (brushStyle === 'rub') {
    sfx.rub();
    polish(target, TAP_POLISH_AMOUNT);
  } else {
    gaugeCell = target;
    gaugeT = 0;
    el('gauge').classList.add('show');
  }
}

// ---- input ------------------------------------------------------------------

const pointers = new Set<number>();
let activePointer: number | null = null;
let actionStarted = false;
let pendingTap: ReturnType<typeof setTimeout> | undefined;
const downPos = { x: 0, y: 0 };
let lastRubAt = 0;

function cancelPendingTap(): void {
  if (pendingTap !== undefined) {
    clearTimeout(pendingTap);
    pendingTap = undefined;
  }
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  pointers.add(e.pointerId);
  // ゲージはタイミング勝負なので、押した瞬間に止める(70ms遅延を通さない)
  if (
    pointers.size === 1 &&
    e.button === 0 &&
    tool === 'brush' &&
    brushStyle === 'gauge' &&
    gaugeCell >= 0
  ) {
    stopGauge();
    return;
  }
  if (pointers.size === 1 && e.button === 0) {
    activePointer = e.pointerId;
    actionStarted = false;
    downPos.x = e.clientX;
    downPos.y = e.clientY;
    pendingTap = setTimeout(() => {
      pendingTap = undefined;
      if (pointers.size === 1 && activePointer === e.pointerId) {
        actionStarted = true;
        tapAction(downPos.x, downPos.y);
      }
    }, TAP_DEFER_MS);
  } else {
    cancelPendingTap();
    activePointer = null;
    actionStarted = false;
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (pointers.size !== 1 || e.pointerId !== activePointer) return;
  const prevX = downPos.x;
  const prevY = downPos.y;
  downPos.x = e.clientX;
  downPos.y = e.clientY;
  if (!actionStarted) return;

  if (tool === 'pick') {
    tapAction(e.clientX, e.clientY);
    return;
  }
  if (brushStyle === 'rub') {
    // こすり: 指の移動量ぶんだけ、その下のよごれを落とす
    const target = raycastCell(e.clientX, e.clientY);
    if (target === null) return;
    const bone = boneCellOwner.get(target);
    if (!bone || bone.cells.get(target)!.status !== 'crusted') return;
    const dist = Math.hypot(e.clientX - prevX, e.clientY - prevY);
    polish(target, dist * RUB_PROGRESS_PER_PX);
    const now = performance.now();
    if (now - lastRubAt > 120) {
      lastRubAt = now;
      sfx.rub();
      particles.burst(cellCenter(target), new THREE.Color(0xcbb391), 2);
    }
  }
});
const release = (e: PointerEvent): void => {
  pointers.delete(e.pointerId);
  if (e.pointerId === activePointer) {
    if (pendingTap !== undefined) {
      cancelPendingTap();
      if (pointers.size === 0) tapAction(downPos.x, downPos.y);
    }
    activePointer = null;
    actionStarted = false;
  }
};
renderer.domElement.addEventListener('pointerup', release);
renderer.domElement.addEventListener('pointercancel', release);
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

el('btn-pick').addEventListener('click', () => setTool('pick'));
el('btn-brush').addEventListener('click', () => setTool('brush'));
el('btn-style').addEventListener('click', () =>
  setBrushStyle(brushStyle === 'rub' ? 'gauge' : 'rub'),
);
el('btn-reset').addEventListener('click', () => window.location.reload());
el('btn-again').addEventListener('click', () => window.location.reload());

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- debug hooks ------------------------------------------------------------

(window as unknown as Record<string, unknown>).__poc5 = {
  cellScreen: (gx: number, gz: number, layer: number) => {
    const p = cellCenter(idx(gx, gz, layer)).project(camera);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
  },
  pickCell: (gx: number, gz: number, layer: number) => swingPick(idx(gx, gz, layer)),
  polishCell: (gx: number, gz: number, layer: number, amount: number) =>
    polish(idx(gx, gz, layer), amount),
  bones: () =>
    bones.map((b) => ({
      id: b.def.id,
      collected: b.collected,
      damage: b.damage,
      cells: [...b.cells.values()].map((c) => ({ status: c.status, progress: c.progress })),
    })),
  finished: () => finished,
  setStyle: (s: BrushStyle) => setBrushStyle(s),
  setTool: (t: Tool) => setTool(t),
  gaugeActive: () => gaugeCell >= 0,
};

// ---- loop -------------------------------------------------------------------

const meter = new FpsMeter(el('fps'), el('ms'), el('fps-min'));
const clock = new THREE.Clock();
updateBoneHud();
setBrushStyle('rub');
showMsg('⛏️ ピッケルで ほって、ホネを さがそう!');

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  particles.update(dt);

  if (gaugeCell >= 0) {
    gaugeT += dt;
    const pos = 0.5 + 0.5 * Math.sin(gaugeT * GAUGE_SPEED);
    (el('gauge-marker') as HTMLElement).style.left = `${pos * 100}%`;
  }

  if (shake > 0) {
    shake = Math.max(0, shake - dt * 3.2);
    digGroup.position.set(
      (Math.random() - 0.5) * 0.1 * shake,
      (Math.random() - 0.5) * 0.06 * shake,
      0,
    );
  } else {
    digGroup.position.set(0, 0, 0);
  }

  controls.update();
  renderer.render(scene, camera);
  meter.tick();
});
