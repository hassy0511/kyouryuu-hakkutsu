import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FpsMeter } from '../shared/fps';
import { Sfx } from '../poc2/audio';
import { DebrisParticles } from '../poc2/particles';

// POC-6: ピット方式の発掘。地面をその場で掘り下げ、上からのぞき込む。
// 層で掘り味が変わる / 岩・水晶が埋まる / 骨の下を掘りすぎると傾く(支えルール) / ノック探査。
// 配置はすべて固定(柱2)。

const GRID_X = 8;
const GRID_Z = 8;
const GRID_DEPTH = 6;
const CELL = 0.562;
const PITCH = 0.57;
// 地表からの深さで色が変わる(ピットの壁に地層が見える)
const STRATA_COLORS = [0xd9c896, 0xd0b988, 0xb59a76, 0xa8896a, 0xa1704f, 0x965f43];

const ACTION_COOLDOWN_MS = 140;
const DAMAGE_CAP_PER_ACTION = 2;
const TAP_DEFER_MS = 70;
const RUB_PROGRESS_PER_PX = 1 / 300;
const TAP_POLISH_AMOUNT = 0.25;
const HARD_LAYER_FROM = 4; // この層から2回叩き
const ROCK_HP = 3;

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
// 地表が y=0、下へ掘り進む
const cellCenter = (i: number): THREE.Vector3 => {
  const { gx, gz, layer } = coords(i);
  return new THREE.Vector3(
    (gx - (GRID_X - 1) / 2) * PITCH,
    -(layer + 0.5) * PITCH,
    (gz - (GRID_Z - 1) / 2) * PITCH,
  );
};
const inBounds = (gx: number, gz: number, layer: number): boolean =>
  gx >= 0 && gx < GRID_X && gz >= 0 && gz < GRID_Z && layer >= 0 && layer < GRID_DEPTH;

// ---- 固定レイアウト(手作りのパズル面) ----------------------------------------

interface BoneDef {
  id: string;
  nameJa: string;
  layer: number;
  cells: [number, number][];
  kind: 'long' | 'blob';
}
// せぼね(layer3・横)と あしのほね(layer4・縦)が (4,3) で立体交差する
const BONES: BoneDef[] = [
  {
    id: 'spine',
    nameJa: 'せぼね',
    layer: 3,
    kind: 'long',
    cells: [
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
    ],
  },
  {
    id: 'leg',
    nameJa: 'あしのほね',
    layer: 4,
    kind: 'long',
    cells: [
      [4, 2],
      [4, 3],
      [4, 4],
    ],
  },
];
// 岩: せぼねの真上をふさぐ(こわすか、よけて掘る)
const ROCKS: [number, number, number][] = [
  [3, 3, 2],
  [3, 2, 2],
];
// 水晶: おまけの宝
const CRYSTALS: [number, number, number][] = [
  [6, 5, 3],
  [1, 6, 1],
];

// ---- scene ------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
el('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed4ef);
scene.fog = new THREE.Fog(0x9ed4ef, 40, 90);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -1, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4.5;
controls.maxDistance = 14;
// 上からのぞき込む角度だけを許す(横からの「水槽」視点は存在しない)
controls.minPolarAngle = THREE.MathUtils.degToRad(8);
controls.maxPolarAngle = THREE.MathUtils.degToRad(52);
controls.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.mouseButtons = {
  LEFT: null as unknown as THREE.MOUSE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.9);
sun.position.set(9, 15, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0005;
scene.add(sun);

// 地面(発掘区画の四角い穴が空いた一枚)と現場のロープ枠
{
  const plotHalf = (GRID_X * PITCH) / 2 - 0.03;
  const shape = new THREE.Shape();
  shape.moveTo(-40, -40);
  shape.lineTo(40, -40);
  shape.lineTo(40, 40);
  shape.lineTo(-40, 40);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-plotHalf, -plotHalf);
  hole.lineTo(plotHalf, -plotHalf);
  hole.lineTo(plotHalf, plotHalf);
  hole.lineTo(-plotHalf, plotHalf);
  hole.closePath();
  shape.holes.push(hole);
  const ground = new THREE.Mesh(
    new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd8c28e, roughness: 1 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  // セルの隙間の先が空にならないよう、ピット全体を内側だけ描画の暗い箱で包む
  const depth = GRID_DEPTH * PITCH + 0.3;
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_X * PITCH + 0.12, depth, GRID_Z * PITCH + 0.12),
    new THREE.MeshStandardMaterial({ color: 0x5c4633, roughness: 1, side: THREE.BackSide }),
  );
  shell.position.y = -depth / 2 + 0.02;
  scene.add(shell);

  const stakeMat = new THREE.MeshStandardMaterial({ color: 0x8a6b47, roughness: 0.9 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.9 });
  const s = plotHalf + 0.18;
  for (const [x, z] of [
    [-s, -s],
    [s, -s],
    [s, s],
    [-s, s],
  ] as const) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), stakeMat);
    stake.position.set(x, 0.3, z);
    stake.castShadow = true;
    scene.add(stake);
  }
  for (const [x, z, rot] of [
    [0, -s, 0],
    [0, s, 0],
    [-s, 0, Math.PI / 2],
    [s, 0, Math.PI / 2],
  ] as const) {
    const rope = new THREE.Mesh(new THREE.BoxGeometry(s * 2, 0.03, 0.03), ropeMat);
    rope.position.set(x, 0.5, z);
    rope.rotation.y = rot;
    scene.add(rope);
  }
  // まわりの小物
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x9b8f7c,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4;
    const r = 5.5 + ((i * 37) % 6);
    const sc = 0.25 + ((i * 13) % 8) / 16;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rockMat);
    rock.position.set(Math.cos(a) * r, sc * 0.3, Math.sin(a) * r);
    rock.scale.set(sc, sc * 0.7, sc);
    rock.castShadow = true;
    scene.add(rock);
  }
}

const digGroup = new THREE.Group();
scene.add(digGroup);
const particles = new DebrisParticles();
scene.add(particles.mesh);
const sfx = new Sfx();

// ---- soil -------------------------------------------------------------------

const CELL_COUNT = GRID_X * GRID_Z * GRID_DEPTH;
const soil = new THREE.InstancedMesh(
  new THREE.BoxGeometry(CELL, CELL, CELL),
  new THREE.MeshStandardMaterial({ roughness: 1 }),
  CELL_COUNT,
);
soil.castShadow = true;
soil.receiveShadow = true;
digGroup.add(soil);

const alive: boolean[] = [];
const hardHp: number[] = []; // 固い層は2回叩き
const baseColors: THREE.Color[] = [];
const m4 = new THREE.Matrix4();
function setSoilMatrix(i: number, scale: number): void {
  m4.makeScale(scale, scale, scale);
  m4.setPosition(cellCenter(i));
  soil.setMatrixAt(i, m4);
  soil.instanceMatrix.needsUpdate = true;
}
{
  const color = new THREE.Color();
  for (let i = 0; i < CELL_COUNT; i++) {
    const { gx, gz, layer } = coords(i);
    color.setHex(STRATA_COLORS[layer]!);
    color.offsetHSL(0, 0, (((gx * 31 + gz * 17 + layer * 7) % 10) / 10 - 0.5) * 0.05);
    baseColors.push(color.clone());
    soil.setColorAt(i, color);
    alive.push(true);
    hardHp.push(layer >= HARD_LAYER_FROM ? 2 : 1);
    setSoilMatrix(i, 1);
  }
}

// ---- contents ---------------------------------------------------------------

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
  supportStage = 0; // 0=安定 1=グラグラ警告済み 2=かたむいた 3=おちた
  wobbleT = 0;
  private readonly material = new THREE.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.5 });

  constructor(readonly def: BoneDef) {
    const crustGeo = new THREE.BoxGeometry(CELL * 0.96, CELL * 0.96, CELL * 0.96);
    for (const [gx, gz] of def.cells) {
      const i = idx(gx, gz, def.layer);
      const crust = new THREE.Mesh(
        crustGeo,
        new THREE.MeshStandardMaterial({
          color: 0x8a7a5e,
          roughness: 1,
          transparent: true,
          opacity: 0.78,
        }),
      );
      crust.position.copy(cellCenter(i));
      crust.visible = false;
      digGroup.add(crust);
      this.cells.set(i, { status: 'hidden', progress: 0, crust });
      alive[i] = false; // 骨のマスに土は入っていない(可視化は crust が担う)
      setSoilMatrix(i, 0);
    }

    const center = new THREE.Vector3();
    for (const [gx, gz] of def.cells) center.add(cellCenter(idx(gx, gz, def.layer)));
    center.divideScalar(def.cells.length);
    const alongX = def.cells.length < 2 || def.cells[1]![0] !== def.cells[0]![0];

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
    this.group.position.copy(center);
    this.group.visible = false; // 掘り当てるまで見えない
    if (!alongX) this.group.rotation.y = Math.PI / 2;
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    digGroup.add(this.group);
  }

  stars(): number {
    return this.damage === 0 ? 3 : this.damage <= 2 ? 2 : 1;
  }
  tint(): void {
    this.material.color.lerpColors(
      new THREE.Color(0xf7f3e8),
      new THREE.Color(0x8f7d66),
      Math.min(this.damage, 3) / 3,
    );
  }
  celebrate(): void {
    this.material.emissive.setHex(0xffe28a);
    this.material.emissiveIntensity = 0.4;
  }
}

const bones: Bone[] = BONES.map((d) => new Bone(d));
const boneCellOwner = new Map<number, Bone>();
for (const bone of bones) for (const i of bone.cells.keys()) boneCellOwner.set(i, bone);

interface Rock {
  hp: number;
  mesh: THREE.Mesh;
}
const rocks = new Map<number, Rock>();
{
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x7f7668,
    roughness: 1,
    flatShading: true,
  });
  for (const [gx, gz, layer] of ROCKS) {
    const i = idx(gx, gz, layer);
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(CELL * 0.62, 0), rockMat.clone());
    mesh.position.copy(cellCenter(i));
    mesh.castShadow = true;
    mesh.visible = false;
    digGroup.add(mesh);
    rocks.set(i, { hp: ROCK_HP, mesh });
    alive[i] = false;
    setSoilMatrix(i, 0);
  }
}

const crystals = new Map<number, THREE.Mesh>();
let crystalsFound = 0;
{
  for (const [gx, gz, layer] of CRYSTALS) {
    const i = idx(gx, gz, layer);
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(CELL * 0.4, 0),
      new THREE.MeshStandardMaterial({
        color: 0xc7a6f0,
        roughness: 0.2,
        emissive: 0x5a3a8a,
        emissiveIntensity: 0.35,
      }),
    );
    mesh.position.copy(cellCenter(i));
    mesh.rotation.y = 0.5;
    mesh.visible = false;
    digGroup.add(mesh);
    crystals.set(i, mesh);
    alive[i] = false;
    setSoilMatrix(i, 0);
  }
}

// ---- game state -------------------------------------------------------------

type Tool = 'pick' | 'brush' | 'ear';
let tool: Tool = 'pick';
let finished = false;
let shake = 0;
let lastActionAt = 0;
let firstRevealShown = false;
let msgTimer: ReturnType<typeof setTimeout> | undefined;

function showMsg(text: string): void {
  const msg = el('msg');
  msg.textContent = text;
  msg.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => msg.classList.remove('show'), 2600);
}

function updateHud(): void {
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
  el('crystal-count').textContent = `${crystalsFound}`;
}

function setTool(next: Tool): void {
  tool = next;
  el('btn-pick').classList.toggle('active', next === 'pick');
  el('btn-brush').classList.toggle('active', next === 'brush');
  el('btn-ear').classList.toggle('active', next === 'ear');
}

function reveal(i: number): void {
  const bone = boneCellOwner.get(i);
  if (bone) {
    const cell = bone.cells.get(i)!;
    if (cell.status !== 'hidden') return;
    cell.status = 'crusted';
    cell.crust.visible = true;
    bone.group.visible = true;
    particles.burst(cellCenter(i), new THREE.Color(0xbfa88a), 5);
    if (!firstRevealShown) {
      firstRevealShown = true;
      sfx.hint();
      showMsg('🦴 ホネが でてきた! ⛏️はNG、🖌️ブラシで こすろう');
    }
    updateHud();
  }
}

function afterRemoval(removed: number): void {
  const { gx, gz, layer } = coords(removed);
  const around: [number, number, number][] = [
    [gx + 1, gz, layer],
    [gx - 1, gz, layer],
    [gx, gz + 1, layer],
    [gx, gz - 1, layer],
    [gx, gz, layer + 1],
    [gx, gz, layer - 1],
  ];
  for (const [nx, nz, nl] of around) {
    if (!inBounds(nx, nz, nl)) continue;
    const n = idx(nx, nz, nl);
    reveal(n);
    const rock = rocks.get(n);
    if (rock) rock.mesh.visible = true;
    const crystal = crystals.get(n);
    if (crystal) crystal.visible = true;
  }
  updateSupports();
}

// ---- 支えルール ---------------------------------------------------------------

function cellSolid(i: number): boolean {
  if (alive[i]) return true;
  const rock = rocks.get(i);
  if (rock && rock.hp > 0) return true;
  if (crystals.has(i)) return true;
  const bone = boneCellOwner.get(i);
  if (bone && !bone.collected) return true;
  return false;
}

function updateSupports(): void {
  for (const bone of bones) {
    if (bone.collected) continue;
    let supported = 0;
    for (const i of bone.cells.keys()) {
      const { gx, gz, layer } = coords(i);
      if (layer >= GRID_DEPTH - 1) {
        supported++;
        continue;
      }
      if (cellSolid(idx(gx, gz, layer + 1))) supported++;
    }
    const ratio = supported / bone.cells.size;
    const stage = ratio >= 1 ? 0 : ratio >= 0.5 ? 1 : ratio > 0 ? 2 : 3;
    while (bone.supportStage < stage) {
      bone.supportStage++;
      if (bone.supportStage === 1) {
        bone.wobbleT = 1.2;
        sfx.knockFull();
        showMsg(`⚠️ ${bone.def.nameJa}が グラグラ… したを ほりすぎ!`);
      } else {
        bone.damage++;
        bone.tint();
        bone.wobbleT = 1.2;
        bone.group.rotation.x += bone.supportStage === 2 ? 0.12 : 0.1;
        bone.group.position.y -= 0.09;
        sfx.crack();
        shake = 1;
        showMsg(`💥 ${bone.def.nameJa}が かたむいて ヒビが はいった!`);
        updateHud();
      }
    }
  }
}

// ---- actions ----------------------------------------------------------------

function checkBone(bone: Bone): void {
  if (bone.collected) return;
  for (const cell of bone.cells.values()) if (cell.status !== 'clean') return;
  bone.collected = true;
  bone.celebrate();
  sfx.fanfare();
  showMsg(
    `🦴 ${bone.def.nameJa}を ほりだした! ${'★'.repeat(bone.stars())}${'☆'.repeat(3 - bone.stars())}`,
  );
  updateHud();
  updateSupports();
  if (bones.every((b) => b.collected) && !finished) {
    finished = true;
    setTimeout(() => {
      el('result-list').innerHTML =
        bones
          .map(
            (b) =>
              `<div>${b.def.nameJa} <span class="stars">${'★'.repeat(b.stars())}${'☆'.repeat(3 - b.stars())}</span></div>`,
          )
          .join('') + `<div>すいしょう 💎×${crystalsFound}</div>`;
      el('overlay').classList.add('show');
    }, 1500);
  }
}

function polish(i: number, amount: number): void {
  const bone = boneCellOwner.get(i);
  if (!bone) return;
  const cell = bone.cells.get(i)!;
  if (cell.status !== 'crusted') return;
  cell.progress = Math.min(1, cell.progress + amount);
  (cell.crust.material as THREE.MeshStandardMaterial).opacity = 0.78 * (1 - cell.progress);
  if (cell.progress >= 1) {
    cell.status = 'clean';
    cell.crust.visible = false;
    sfx.shine();
    particles.burst(cellCenter(i), new THREE.Color(0xfff2b8), 8);
    updateHud();
    checkBone(bone);
  }
}

function removeSoil(i: number): void {
  alive[i] = false;
  setSoilMatrix(i, 0);
  particles.burst(cellCenter(i), baseColors[i]!, 8);
  afterRemoval(i);
}

function hitCell(i: number): { damaged: boolean } {
  // 骨に直撃
  const bone = boneCellOwner.get(i);
  if (bone) {
    const cell = bone.cells.get(i)!;
    if (cell.status === 'hidden') reveal(i);
    bone.damage++;
    bone.tint();
    updateHud();
    return { damaged: true };
  }
  // 岩
  const rock = rocks.get(i);
  if (rock && rock.hp > 0) {
    rock.hp--;
    sfx.clank();
    particles.burst(cellCenter(i), new THREE.Color(0x8f8678), 4);
    rock.mesh.scale.setScalar(0.7 + rock.hp * 0.15);
    if (rock.hp === 0) {
      rock.mesh.visible = false;
      particles.burst(cellCenter(i), new THREE.Color(0x7f7668), 10);
      showMsg('🪨 いわを くだいた!');
      afterRemoval(i);
    }
    return { damaged: false };
  }
  // 固い層の土
  if (alive[i]) {
    if (hardHp[i]! > 1) {
      hardHp[i]!--;
      sfx.clank();
      const c = baseColors[i]!.clone().offsetHSL(0, 0, -0.08);
      soil.setColorAt(i, c);
      if (soil.instanceColor) soil.instanceColor.needsUpdate = true;
      return { damaged: false };
    }
    removeSoil(i);
  }
  return { damaged: false };
}

function swingPick(target: number): void {
  const now = performance.now();
  if (now - lastActionAt < ACTION_COOLDOWN_MS) return;
  lastActionAt = now;
  const { gx, gz, layer } = coords(target);

  // 浅い層は広く(3×3)、中層は十字、深い層は1マスずつ
  let area: [number, number][];
  if (layer <= 1) {
    area = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) area.push([gx + dx, gz + dz]);
  } else if (layer <= HARD_LAYER_FROM - 1) {
    area = [
      [gx, gz],
      [gx + 1, gz],
      [gx - 1, gz],
      [gx, gz + 1],
      [gx, gz - 1],
    ];
  } else {
    area = [[gx, gz]];
  }

  let damaged = 0;
  for (const [ax, az] of area) {
    if (!inBounds(ax, az, layer)) continue;
    const i = idx(ax, az, layer);
    if (!cellSolid(i)) continue;
    const r = hitCell(i);
    if (r.damaged) damaged++;
    if (damaged >= DAMAGE_CAP_PER_ACTION) break;
  }
  sfx.pick();
  if (damaged > 0) {
    sfx.crack();
    shake = 1;
    showMsg('💥 ホネに ピッケルが あたった…!');
  }
}

function knock(target: number): void {
  const { gx, gz, layer } = coords(target);
  let something = false;
  for (let l = layer + 1; l < GRID_DEPTH; l++) {
    const i = idx(gx, gz, l);
    if (boneCellOwner.has(i) || crystals.has(i) || (rocks.get(i)?.hp ?? 0) > 0) {
      something = true;
      break;
    }
  }
  if (something) {
    sfx.knockFull();
    showMsg('👂 …ゴツッ! このしたに なにか あるぞ!');
  } else {
    sfx.knockEmpty();
    showMsg('👂 コンコン… なにも いなさそう');
  }
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
  const lookup = new Map<THREE.Object3D, number>();
  for (const bone of bones) {
    for (const [i, cell] of bone.cells) {
      if (cell.crust.visible) {
        targets.push(cell.crust);
        lookup.set(cell.crust, i);
      }
    }
  }
  for (const [i, rock] of rocks) {
    if (rock.hp > 0 && rock.mesh.visible) {
      targets.push(rock.mesh);
      lookup.set(rock.mesh, i);
    }
  }
  for (const [i, mesh] of crystals) {
    if (mesh.visible) {
      targets.push(mesh);
      lookup.set(mesh, i);
    }
  }
  const hits = raycaster.intersectObjects(targets, false);
  for (const hit of hits) {
    if (hit.object === soil) {
      if (hit.instanceId !== undefined && alive[hit.instanceId]) return hit.instanceId;
      continue;
    }
    const found = lookup.get(hit.object);
    if (found !== undefined) return found;
  }
  return null;
}

function collectCrystal(i: number): boolean {
  const mesh = crystals.get(i);
  if (!mesh) return false;
  crystals.delete(i);
  mesh.visible = false;
  crystalsFound++;
  sfx.shine();
  particles.burst(cellCenter(i), new THREE.Color(0xd8b8ff), 10);
  showMsg('💎 すいしょうを みつけた!');
  updateHud();
  afterRemoval(i);
  return true;
}

function tapAction(clientX: number, clientY: number): void {
  if (finished) return;
  const target = raycastCell(clientX, clientY);
  if (target === null) return;

  // 水晶はどの道具でもタップで拾える
  const crystalMesh = crystals.get(target);
  if (crystalMesh && crystalMesh.visible) {
    collectCrystal(target);
    return;
  }
  if (tool === 'pick') {
    swingPick(target);
  } else if (tool === 'ear') {
    knock(target);
  } else {
    const bone = boneCellOwner.get(target);
    if (bone && bone.cells.get(target)!.status === 'crusted') {
      sfx.rub();
      polish(target, TAP_POLISH_AMOUNT);
    } else {
      sfx.rub();
    }
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
  if (tool === 'brush') {
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
el('btn-ear').addEventListener('click', () => setTool('ear'));
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

(window as unknown as Record<string, unknown>).__poc6 = {
  cellScreen: (gx: number, gz: number, layer: number) => {
    const p = cellCenter(idx(gx, gz, layer)).project(camera);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
  },
  pickCell: (gx: number, gz: number, layer: number) => swingPick(idx(gx, gz, layer)),
  polishCell: (gx: number, gz: number, layer: number, amount: number) =>
    polish(idx(gx, gz, layer), amount),
  state: () => ({
    bones: bones.map((b) => ({
      id: b.def.id,
      collected: b.collected,
      damage: b.damage,
      supportStage: b.supportStage,
      cells: [...b.cells.values()].map((c) => ({ status: c.status, progress: c.progress })),
    })),
    crystalsFound,
    rocks: [...rocks.values()].map((r) => r.hp),
    finished,
  }),
  setTool: (t: Tool) => setTool(t),
};

// ---- loop -------------------------------------------------------------------

const meter = new FpsMeter(el('fps'), el('ms'), el('fps-min'));
const clock = new THREE.Clock();
updateHud();
setTool('pick');
showMsg('⛏️ ほりくちは ひろく、ふかくなったら しんちょうに!');

// カメラ導入: 現場の全景 → のぞき込み位置へスッと寄る
const camFrom = new THREE.Vector3(9, 6, 10);
const camTo = new THREE.Vector3(0, 8.6, 4.6);
let introT = 0;
camera.position.copy(camFrom);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  particles.update(dt);

  if (introT < 1) {
    introT = Math.min(1, introT + dt / 1.4);
    const k = introT * introT * (3 - 2 * introT);
    camera.position.lerpVectors(camFrom, camTo, k);
  }

  const pulse = 0.22 + 0.14 * Math.sin(clock.elapsedTime * 5);
  for (const bone of bones) {
    for (const cell of bone.cells.values()) {
      if (cell.status !== 'crusted') continue;
      const mat = cell.crust.material as THREE.MeshStandardMaterial;
      if (tool === 'brush') {
        mat.emissive.setHex(0xffd75e);
        mat.emissiveIntensity = pulse;
      } else if (tool === 'pick') {
        mat.emissive.setHex(0xaa2222);
        mat.emissiveIntensity = 0.18;
      } else {
        mat.emissiveIntensity = 0;
      }
    }
    if (bone.wobbleT > 0) {
      bone.wobbleT = Math.max(0, bone.wobbleT - dt);
      bone.group.rotation.z = Math.sin(bone.wobbleT * 30) * 0.05 * bone.wobbleT;
    }
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
