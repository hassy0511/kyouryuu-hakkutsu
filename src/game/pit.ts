import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sfx } from '../core/audio';
import { DebrisParticles } from './particles';
import { GameState, boneKey, type FossilDef, type PitDef, type PitSave } from '../core/state';

// ピット方式の発掘シーン。POC-7 で検証したルール一式:
// 層で掘り味が変わる / がんばんは Lv2 / 岩・水晶・枝 / 支えルール / 崩落 / タップで拾う

export const GRID_X = 8;
export const GRID_Z = 8;
export const GRID_DEPTH = 6;
const CELL = 0.562;
const PITCH = 0.57;
const STRATA_COLORS = [0xd9c896, 0xd0b988, 0xb59a76, 0xa8896a, 0xa1704f, 0x965f43];
const BEDROCK_COLOR = 0x555a63;

const ACTION_COOLDOWN_MS = 140;
const DAMAGE_CAP_PER_ACTION = 2;
const RUB_PROGRESS_PER_PX = 1 / 300;
const TAP_POLISH_AMOUNT = 0.25;
const HARD_LAYER_FROM = 4;
const ROCK_HP = 3;

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
    -(layer + 0.5) * PITCH,
    (gz - (GRID_Z - 1) / 2) * PITCH,
  );
};
const inBounds = (gx: number, gz: number, layer: number): boolean =>
  gx >= 0 && gx < GRID_X && gz >= 0 && gz < GRID_Z && layer >= 0 && layer < GRID_DEPTH;

type CellStatus = 'hidden' | 'crusted' | 'clean';
interface FossilCell {
  status: CellStatus;
  progress: number;
  crust: THREE.Mesh;
}

class FossilPiece {
  readonly cells = new Map<number, FossilCell>();
  readonly group = new THREE.Group();
  damage = 0;
  collected = false;
  ready = false;
  readyBaseY = 0;
  supportStage = 0;
  wobbleT = 0;
  private readonly material: THREE.MeshStandardMaterial;

  constructor(
    readonly def: FossilDef,
    parent: THREE.Group,
  ) {
    this.material = new THREE.MeshStandardMaterial({
      color: def.kind === 'ammonite' ? 0xdcc9a8 : 0xf7f3e8,
      roughness: 0.5,
    });
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
      parent.add(crust);
      this.cells.set(i, { status: 'hidden', progress: 0, crust });
    }

    const center = new THREE.Vector3();
    for (const [gx, gz] of def.cells) center.add(cellCenter(idx(gx, gz, def.layer)));
    center.divideScalar(def.cells.length);

    if (def.kind === 'long') {
      const alongX = def.cells[1]![0] !== def.cells[0]![0];
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
      if (!alongX) this.group.rotation.y = Math.PI / 2;
    } else if (def.kind === 'blob') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), this.material);
      dome.scale.set(1.2, 0.8, 1.2);
      this.group.add(dome);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.3), this.material);
      snout.position.set(0.42, -0.06, 0);
      this.group.add(snout);
      const dark = new THREE.MeshStandardMaterial({ color: 0x3a3226 });
      for (const sz of [-1, 1]) {
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dark);
        socket.position.set(0.18, 0.12, sz * 0.18);
        this.group.add(socket);
      }
    } else {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.13, 8, 16, Math.PI * 1.7),
        this.material,
      );
      coil.rotation.x = -Math.PI / 2;
      this.group.add(coil);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.08, 8, 12), this.material);
      inner.rotation.x = -Math.PI / 2;
      this.group.add(inner);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), this.material);
      tip.position.set(0.32, 0, 0.24);
      this.group.add(tip);
    }
    this.group.position.copy(center);
    this.group.visible = false;
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    parent.add(this.group);
  }

  stars(): number {
    return this.damage === 0 ? 3 : this.damage <= 2 ? 2 : 1;
  }
  tint(): void {
    this.material.color.lerpColors(
      new THREE.Color(this.def.kind === 'ammonite' ? 0xdcc9a8 : 0xf7f3e8),
      new THREE.Color(0x8f7d66),
      Math.min(this.damage, 3) / 3,
    );
  }
  celebrate(): void {
    this.material.emissive.setHex(0xffe28a);
    this.material.emissiveIntensity = 0.4;
  }
}

interface RockState {
  hp: number;
  mesh: THREE.Mesh;
  flash: number;
  kind: 'stone' | 'iron';
  origIndex: number;
}

interface Pickup {
  kind: 'wood' | 'stone' | 'crystal' | 'iron' | 'fossil';
  mesh: THREE.Object3D;
  base: THREE.Vector3;
  phase: number;
  collecting: number;
  fossil?: FossilPiece;
}

export interface PitCallbacks {
  showMsg(text: string): void;
  onExit(): void;
  onBedrockBlocked(): void;
  onBoneCollected(speciesId: string, boneId: string, stars: number): void;
  onFirstReveal(): void;
}

type Tool = 'pick' | 'brush' | 'ear';

export class PitMode {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  tool: Tool = 'pick';
  shake = 0;

  private readonly controls: OrbitControls;
  private readonly root = new THREE.Group();
  private readonly soil: THREE.InstancedMesh;
  private readonly alive: boolean[] = [];
  private readonly hardHp: number[] = [];
  private readonly baseColors: THREE.Color[] = [];
  private readonly bedrockSet = new Set<number>();
  private readonly branchSet = new Set<number>();
  private readonly fossils: FossilPiece[] = [];
  private readonly cellOwner = new Map<number, FossilPiece>();
  private readonly rocks = new Map<number, RockState>();
  private readonly crystals = new Map<number, THREE.Mesh>();
  private readonly crystalHome = new Map<THREE.Mesh, number>();
  private readonly crystalsTaken: number[] = [];
  private readonly branchesTaken: number[] = [];
  private readonly pickups: Pickup[] = [];
  private readonly particles: DebrisParticles;
  private readonly bedrockPulse = new Map<number, number>();
  private lastActionAt = 0;
  private lastBedrockMsgAt = 0;
  private lastBareMsgAt = 0;
  private readonly bareDents = new Set<number>();
  private readonly m4 = new THREE.Matrix4();
  private introT = 0;
  private readonly camFrom = new THREE.Vector3(9, 6, 10);
  private readonly camTo = new THREE.Vector3(0, 8.6, 4.6);

  private readonly labels = new Map<FossilPiece, HTMLElement>();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly sfx: Sfx,
    readonly def: PitDef,
    private readonly state: GameState,
    private readonly cb: PitCallbacks,
  ) {
    this.scene.background = new THREE.Color(0x9ed4ef);
    this.scene.fog = new THREE.Fog(0x9ed4ef, 40, 90);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.copy(this.camFrom);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.set(0, -1, 0);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 14;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(8);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(52);
    this.controls.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
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
    this.scene.add(sun);
    this.buildSurroundings();

    this.scene.add(this.root);
    this.particles = new DebrisParticles();
    this.scene.add(this.particles.mesh);

    // 土
    this.soil = new THREE.InstancedMesh(
      new THREE.BoxGeometry(CELL, CELL, CELL),
      new THREE.MeshStandardMaterial({ roughness: 1 }),
      GRID_X * GRID_Z * GRID_DEPTH,
    );
    this.soil.castShadow = true;
    this.soil.receiveShadow = true;
    this.root.add(this.soil);

    for (const [gx, gz, l] of def.bedrock) this.bedrockSet.add(idx(gx, gz, l));
    for (const [gx, gz, l] of def.branches) this.branchSet.add(idx(gx, gz, l));

    const color = new THREE.Color();
    for (let i = 0; i < GRID_X * GRID_Z * GRID_DEPTH; i++) {
      const { gx, gz, layer } = coords(i);
      if (this.bedrockSet.has(i)) {
        color.setHex(BEDROCK_COLOR);
        color.offsetHSL(0, 0, (((gx * 13 + gz * 7) % 8) / 8 - 0.5) * 0.04);
      } else {
        color.setHex(STRATA_COLORS[layer]!);
        color.offsetHSL(0, 0, (((gx * 31 + gz * 17 + layer * 7) % 10) / 10 - 0.5) * 0.05);
      }
      this.baseColors.push(color.clone());
      this.soil.setColorAt(i, color);
      this.alive.push(true);
      this.hardHp.push(this.bedrockSet.has(i) || layer >= HARD_LAYER_FROM ? 2 : 1);
      this.setSoilMatrix(i, 1);
    }

    for (const fdef of def.fossils) {
      const fossil = new FossilPiece(fdef, this.root);
      this.fossils.push(fossil);
      for (const i of fossil.cells.keys()) {
        this.cellOwner.set(i, fossil);
        this.alive[i] = false;
        this.setSoilMatrix(i, 0);
      }
    }
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7f7668,
      roughness: 1,
      flatShading: true,
    });
    const oreMat = new THREE.MeshStandardMaterial({
      color: 0x454b57,
      roughness: 0.55,
      metalness: 0.35,
      flatShading: true,
    });
    let origIndex = 0;
    const addBoulder = (gx: number, gz: number, l: number, kind: 'stone' | 'iron'): void => {
      const i = idx(gx, gz, l);
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(CELL * 0.62, 0),
        (kind === 'iron' ? oreMat : rockMat).clone(),
      );
      mesh.position.copy(cellCenter(i));
      mesh.castShadow = true;
      mesh.visible = false;
      this.root.add(mesh);
      this.rocks.set(i, { hp: ROCK_HP, mesh, flash: 0, kind, origIndex: origIndex++ });
      this.alive[i] = false;
      this.setSoilMatrix(i, 0);
    };
    for (const [gx, gz, l] of def.rocks) addBoulder(gx, gz, l, 'stone');
    for (const [gx, gz, l] of def.ores) addBoulder(gx, gz, l, 'iron');
    for (const [gx, gz, l] of def.crystals) {
      const i = idx(gx, gz, l);
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
      this.root.add(mesh);
      this.crystals.set(i, mesh);
      this.crystalHome.set(mesh, i);
      this.alive[i] = false;
      this.setSoilMatrix(i, 0);
    }

    this.restoreFrom(state.pitSave(def.id));

    const labelHost = document.getElementById('pit-labels');
    if (labelHost) {
      for (const fossil of this.fossils) {
        const label = document.createElement('div');
        label.className = 'bone-label';
        label.style.display = 'none';
        labelHost.appendChild(label);
        this.labels.set(fossil, label);
      }
    }
  }

  private buildSurroundings(): void {
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
    this.scene.add(ground);

    const depth = GRID_DEPTH * PITCH + 0.3;
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(GRID_X * PITCH + 0.12, depth, GRID_Z * PITCH + 0.12),
      new THREE.MeshStandardMaterial({ color: 0x5c4633, roughness: 1, side: THREE.BackSide }),
    );
    shell.position.y = -depth / 2 + 0.02;
    this.scene.add(shell);

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
      this.scene.add(stake);
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
      this.scene.add(rope);
    }
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
      this.scene.add(rock);
    }
  }

  // ---- セーブ復元・書き出し ----------------------------------------------------

  private restoreFrom(save: PitSave | undefined): void {
    if (!save) return;
    for (const [i, hp] of save.hardHits) {
      this.hardHp[i] = hp;
      const c = this.baseColors[i]!.clone().offsetHSL(0, 0, -0.08);
      this.soil.setColorAt(i, c);
    }
    if (this.soil.instanceColor) this.soil.instanceColor.needsUpdate = true;
    for (const i of save.removed) {
      if (this.alive[i]) {
        this.alive[i] = false;
        this.setSoilMatrix(i, 0);
      }
      this.branchSet.delete(i);
    }
    for (const i of save.branchesTaken) this.branchSet.delete(i);
    // 岩: 現在位置とHPを反映
    const rockStates = [...this.rocks.values()].sort((a, b) => a.origIndex - b.origIndex);
    this.rocks.clear();
    save.rocks.forEach((entry, n) => {
      const [a, b, c] = entry;
      const legacy = entry.length === 2;
      const rock = rockStates[legacy ? n : a!];
      const cell = legacy ? a! : b!;
      const hp = legacy ? b! : c!;
      if (!rock) return;
      rock.hp = hp;
      rock.mesh.position.copy(cellCenter(cell));
      rock.mesh.scale.setScalar(0.6 + hp * 0.14);
      if (hp <= 0) rock.mesh.visible = false;
      this.rocks.set(cell, rock);
    });
    for (const i of save.crystalsTaken) {
      const mesh = this.crystals.get(i);
      if (mesh) {
        mesh.visible = false;
        this.crystals.delete(i);
      }
      this.crystalsTaken.push(i);
    }
    for (const fossil of this.fossils) {
      const fs = save.fossils[boneKey(fossil.def.speciesId, fossil.def.boneId)];
      if (!fs) continue;
      fossil.damage = fs.damage;
      fossil.tint();
      fossil.collected = fs.collected;
      let n = 0;
      for (const cell of fossil.cells.values()) {
        const cs = fs.cells[n++];
        if (!cs) continue;
        cell.status = cs.status;
        cell.progress = cs.progress;
        cell.crust.visible = cs.status === 'crusted';
        (cell.crust.material as THREE.MeshStandardMaterial).opacity = 0.78 * (1 - cs.progress);
        if (cs.status !== 'hidden') fossil.group.visible = true;
      }
      if (fossil.collected) {
        fossil.group.visible = false;
      } else if ([...fossil.cells.values()].every((c) => c.status === 'clean')) {
        fossil.ready = true;
        fossil.readyBaseY = fossil.group.position.y;
        fossil.celebrate();
        fossil.group.visible = true;
      }
    }
    // 露出状態を再計算(岩・水晶の見た目)
    for (let i = 0; i < this.alive.length; i++) {
      if (!this.alive[i] && !this.cellOwner.has(i) && !this.rocks.has(i) && !this.crystals.has(i)) {
        this.exposeNeighbors(i, true);
      }
    }
  }

  serialize(): PitSave {
    // 浮いている出土品は帰りぎわに ぜんぶ回収する
    this.collectAllPickups(true);
    const removed: number[] = [];
    const hardHits: [number, number][] = [];
    for (let i = 0; i < this.alive.length; i++) {
      const isContent =
        this.cellOwner.has(i) ||
        this.def.rocks.some(([gx, gz, l]) => idx(gx, gz, l) === i) ||
        this.def.crystals.some(([gx, gz, l]) => idx(gx, gz, l) === i);
      if (!this.alive[i] && !isContent) removed.push(i);
      const { layer } = coords(i);
      const baseHp = this.bedrockSet.has(i) || layer >= HARD_LAYER_FROM ? 2 : 1;
      if (this.alive[i] && this.hardHp[i]! < baseHp) hardHits.push([i, this.hardHp[i]!]);
    }
    const fossils: PitSave['fossils'] = {};
    for (const fossil of this.fossils) {
      fossils[boneKey(fossil.def.speciesId, fossil.def.boneId)] = {
        damage: fossil.damage,
        collected: fossil.collected,
        cells: [...fossil.cells.values()].map((c) => ({ status: c.status, progress: c.progress })),
      };
    }
    return {
      removed,
      hardHits,
      fossils,
      rocks: [...this.rocks.entries()].map(([cell, rock]) => [rock.origIndex, cell, rock.hp]),
      crystalsTaken: [...this.crystalsTaken],
      branchesTaken: [...this.branchesTaken],
    };
  }

  dispose(): void {
    for (const label of this.labels.values()) label.remove();
    this.labels.clear();
    this.controls.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  }

  // ---- 共通処理 ----------------------------------------------------------------

  private setSoilMatrix(i: number, scale: number): void {
    this.m4.makeScale(scale, scale, scale);
    this.m4.setPosition(cellCenter(i));
    this.soil.setMatrixAt(i, this.m4);
    this.soil.instanceMatrix.needsUpdate = true;
  }

  private reveal(i: number, silent = false): void {
    const fossil = this.cellOwner.get(i);
    if (!fossil || fossil.collected) return;
    const cell = fossil.cells.get(i)!;
    if (cell.status !== 'hidden') return;
    cell.status = 'crusted';
    cell.crust.visible = true;
    fossil.group.visible = true;
    if (!silent) {
      this.particles.burst(cellCenter(i), new THREE.Color(0xbfa88a), 5);
      this.cb.onFirstReveal();
    }
  }

  private exposeNeighbors(removed: number, silent = false): void {
    const { gx, gz, layer } = coords(removed);
    for (const [nx, nz, nl] of [
      [gx + 1, gz, layer],
      [gx - 1, gz, layer],
      [gx, gz + 1, layer],
      [gx, gz - 1, layer],
      [gx, gz, layer + 1],
      [gx, gz, layer - 1],
    ] as const) {
      if (!inBounds(nx, nz, nl)) continue;
      const n = idx(nx, nz, nl);
      this.reveal(n, silent);
      const rock = this.rocks.get(n);
      if (rock && rock.hp > 0) rock.mesh.visible = true;
      const crystal = this.crystals.get(n);
      if (crystal) {
        this.crystals.delete(n);
        crystal.visible = true;
        this.pickups.push({
          kind: 'crystal',
          mesh: crystal,
          base: crystal.position.clone(),
          phase: n % 7,
          collecting: -1,
        });
        if (!silent) this.settleColumn(nx, nz);
      }
    }
  }

  private cellSolid(i: number): boolean {
    if (this.alive[i]) return true;
    const rock = this.rocks.get(i);
    if (rock && rock.hp > 0) return true;
    if (this.crystals.has(i)) return true;
    const fossil = this.cellOwner.get(i);
    if (fossil && !fossil.collected) return true;
    return false;
  }

  private settleColumn(gx: number, gz: number): void {
    for (let l = GRID_DEPTH - 2; l >= 0; l--) {
      const i = idx(gx, gz, l);
      const below = idx(gx, gz, l + 1);
      if (this.cellSolid(below)) continue;
      if (this.alive[i] && !this.bedrockSet.has(i)) {
        this.alive[i] = false;
        this.setSoilMatrix(i, 0);
        this.particles.burst(cellCenter(i), this.baseColors[i]!, 6);
        this.sfx.rub();
        if (this.branchSet.has(i)) {
          this.branchSet.delete(i);
          this.spawnPickup('wood', cellCenter(i));
        }
        this.exposeNeighbors(i);
        continue;
      }
      const rock = this.rocks.get(i);
      if (rock && rock.hp > 0) {
        let l2 = l + 1;
        while (l2 < GRID_DEPTH && !this.cellSolid(idx(gx, gz, l2))) l2++;
        const destLayer = l2 - 1;
        if (destLayer > l) {
          const dest = idx(gx, gz, destLayer);
          this.rocks.delete(i);
          this.rocks.set(dest, rock);
          rock.mesh.position.copy(cellCenter(dest));
          rock.mesh.visible = true;
          this.particles.burst(cellCenter(dest), new THREE.Color(0x8f8678), 6);
          this.sfx.knockFull();
          if (l2 < GRID_DEPTH) {
            const under = idx(gx, gz, l2);
            const fossil = this.cellOwner.get(under);
            if (fossil && !fossil.collected) {
              fossil.damage++;
              fossil.tint();
              fossil.wobbleT = 1.2;
              this.sfx.crack();
              this.shake = 1;
              this.cb.showMsg('💥 いわが おちて ホネに ヒビが!');
            }
          }
          this.exposeNeighbors(dest);
        }
      }
    }
  }

  private updateSupports(): void {
    for (const fossil of this.fossils) {
      if (fossil.collected) continue;
      let supported = 0;
      for (const i of fossil.cells.keys()) {
        const { gx, gz, layer } = coords(i);
        if (layer >= GRID_DEPTH - 1 || this.cellSolid(idx(gx, gz, layer + 1))) supported++;
      }
      const ratio = supported / fossil.cells.size;
      const stage = ratio >= 1 ? 0 : ratio >= 0.5 ? 1 : ratio > 0 ? 2 : 3;
      while (fossil.supportStage < stage) {
        fossil.supportStage++;
        if (fossil.supportStage === 1) {
          fossil.wobbleT = 1.2;
          this.sfx.knockFull();
          this.cb.showMsg('⚠️ ホネが グラグラ… したを ほりすぎ!');
        } else {
          fossil.damage++;
          fossil.tint();
          fossil.wobbleT = 1.2;
          fossil.group.rotation.x += 0.11;
          fossil.group.position.y -= 0.09;
          this.sfx.crack();
          this.shake = 1;
          this.cb.showMsg('💥 ホネが かたむいて ヒビが はいった!');
        }
      }
    }
  }

  private afterRemoval(removed: number): void {
    this.exposeNeighbors(removed);
    const { gx, gz } = coords(removed);
    this.settleColumn(gx, gz);
    this.updateSupports();
  }

  private removeSoil(i: number): void {
    this.alive[i] = false;
    this.setSoilMatrix(i, 0);
    this.particles.burst(cellCenter(i), this.baseColors[i]!, 8);
    if (this.branchSet.has(i)) {
      this.branchSet.delete(i);
      this.sfx.hint();
      this.spawnPickup('wood', cellCenter(i));
    }
    this.afterRemoval(i);
  }

  private hitCell(i: number): { damaged: boolean } {
    const fossil = this.cellOwner.get(i);
    if (fossil && !fossil.collected) {
      const cell = fossil.cells.get(i)!;
      if (cell.status === 'hidden') this.reveal(i);
      fossil.damage++;
      fossil.tint();
      return { damaged: true };
    }
    const rock = this.rocks.get(i);
    if (rock && rock.hp > 0) {
      rock.hp--;
      this.sfx.clank();
      this.particles.burst(cellCenter(i), new THREE.Color(0x8f8678), 6);
      rock.mesh.visible = true;
      rock.mesh.scale.setScalar(0.6 + rock.hp * 0.14);
      rock.flash = 1;
      if (rock.hp === 0) {
        rock.mesh.visible = false;
        this.particles.burst(cellCenter(i), new THREE.Color(0x7f7668), 10);
        const drop = rock.kind === 'iron' ? 'iron' : 'stone';
        this.spawnPickup(drop, cellCenter(i), 0.16);
        this.spawnPickup(drop, cellCenter(i), -0.16);
        this.afterRemoval(i);
      }
      return { damaged: false };
    }
    if (this.alive[i]) {
      const bare = this.state.tool.broken;
      if (bare && (this.bedrockSet.has(i) || coords(i).layer >= HARD_LAYER_FROM)) {
        this.sfx.knockEmpty();
        const now = performance.now();
        if (now - this.lastBareMsgAt > 1200) {
          this.lastBareMsgAt = now;
          this.cb.showMsg('✋ かたくて てでは ほれない… ピッケルを なおそう');
        }
        return { damaged: false };
      }
      if (bare && !this.bareDents.has(i)) {
        // 素手は おそい: やわらかい土も 2回
        this.bareDents.add(i);
        this.sfx.rub();
        const c = this.baseColors[i]!.clone().offsetHSL(0, 0, -0.06);
        this.soil.setColorAt(i, c);
        if (this.soil.instanceColor) this.soil.instanceColor.needsUpdate = true;
        return { damaged: false };
      }
      if (this.bedrockSet.has(i) && this.state.tool.level < 2) {
        this.sfx.clank();
        this.bedrockPulse.set(i, 1);
        const now = performance.now();
        if (now - this.lastBedrockMsgAt > 900) {
          this.lastBedrockMsgAt = now;
          this.cb.onBedrockBlocked();
        }
        return { damaged: false };
      }
      if (this.hardHp[i]! > 1) {
        this.hardHp[i]!--;
        this.sfx.clank();
        const c = this.baseColors[i]!.clone().offsetHSL(0, 0, -0.08);
        this.soil.setColorAt(i, c);
        if (this.soil.instanceColor) this.soil.instanceColor.needsUpdate = true;
        return { damaged: false };
      }
      this.removeSoil(i);
    }
    return { damaged: false };
  }

  swingPick(target: number): void {
    const now = performance.now();
    if (now - this.lastActionAt < ACTION_COOLDOWN_MS) return;
    this.lastActionAt = now;
    const { gx, gz, layer } = coords(target);

    let area: [number, number][];
    if (this.state.tool.broken) {
      area = [[gx, gz]];
    } else if (layer <= 1) {
      area = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) area.push([gx + dx, gz + dz]);
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
      if (!this.cellSolid(i)) continue;
      const r = this.hitCell(i);
      if (r.damaged) damaged++;
      if (damaged >= DAMAGE_CAP_PER_ACTION) break;
    }
    this.sfx.pick();
    const wasBroken = this.state.tool.broken;
    this.state.wearPick();
    if (!wasBroken && this.state.tool.broken) {
      this.sfx.fail();
      this.cb.showMsg('💔 ピッケルが こわれた! ✋でも ほれるが、⛺で なおすと はやいぞ');
    }
    if (damaged > 0) {
      this.sfx.crack();
      this.shake = 1;
      this.cb.showMsg('💥 かせきに ピッケルが あたった…!');
    }
  }

  polish(i: number, amount: number): void {
    const fossil = this.cellOwner.get(i);
    if (!fossil || fossil.collected) return;
    const cell = fossil.cells.get(i)!;
    if (cell.status !== 'crusted') return;
    cell.progress = Math.min(1, cell.progress + amount);
    (cell.crust.material as THREE.MeshStandardMaterial).opacity = 0.78 * (1 - cell.progress);
    if (cell.progress >= 1) {
      cell.status = 'clean';
      cell.crust.visible = false;
      this.sfx.shine();
      this.particles.burst(cellCenter(i), new THREE.Color(0xfff2b8), 8);
      this.checkFossil(fossil);
    }
  }

  private checkFossil(fossil: FossilPiece): void {
    if (fossil.collected || fossil.ready) return;
    for (const cell of fossil.cells.values()) if (cell.status !== 'clean') return;
    fossil.ready = true;
    fossil.readyBaseY = fossil.group.position.y;
    fossil.celebrate();
    this.sfx.shine();
    this.cb.showMsg('✨ ホネが ぜんぶ ほりだせた! タップで とりあげよう');
  }

  knock(target: number): void {
    const { gx, gz, layer } = coords(target);
    let something = false;
    for (let l = layer + 1; l < GRID_DEPTH; l++) {
      const i = idx(gx, gz, l);
      const fossil = this.cellOwner.get(i);
      if (
        (fossil && !fossil.collected) ||
        this.crystals.has(i) ||
        (this.rocks.get(i)?.hp ?? 0) > 0
      ) {
        something = true;
        break;
      }
    }
    if (something) {
      this.sfx.knockFull();
      this.cb.showMsg('👂 …ゴツッ! このしたに なにか あるぞ!');
    } else {
      this.sfx.knockEmpty();
      this.cb.showMsg('👂 コンコン… なにも いなさそう');
    }
  }

  // ---- 出土品 ------------------------------------------------------------------

  private spawnPickup(kind: Pickup['kind'], pos: THREE.Vector3, offset = 0): void {
    let mesh: THREE.Object3D;
    if (kind === 'wood') {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.34, 6),
        new THREE.MeshStandardMaterial({ color: 0x9c7040, roughness: 1 }),
      );
      mesh.rotation.z = 1.2;
    } else if (kind === 'iron') {
      mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({
          color: 0x454b57,
          roughness: 0.5,
          metalness: 0.4,
          flatShading: true,
        }),
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.13, 0),
        new THREE.MeshStandardMaterial({ color: 0x8f8678, roughness: 1, flatShading: true }),
      );
    }
    mesh.position.copy(pos);
    this.root.add(mesh);
    this.pickups.push({
      kind,
      mesh,
      base: pos.clone().add(new THREE.Vector3(offset, 0.1, -offset * 0.5)),
      phase: Math.abs(offset) * 7,
      collecting: -1,
    });
  }

  private completePickup(p: Pickup): void {
    if (p.kind === 'wood') {
      this.state.addMaterial('wood');
      this.sfx.hint();
      this.cb.showMsg('🪵 きのえだを ひろった!');
    } else if (p.kind === 'stone') {
      this.state.addMaterial('stone');
      this.sfx.hint();
      this.cb.showMsg('🪨 いしを ひろった!');
    } else if (p.kind === 'iron') {
      this.state.addMaterial('iron');
      this.sfx.clank();
      this.cb.showMsg('🔩 くろがねいしを てにいれた!');
    } else if (p.kind === 'crystal') {
      this.state.addMaterial('crystal');
      const home = this.crystalHome.get(p.mesh as THREE.Mesh);
      if (home !== undefined) this.crystalsTaken.push(home);
      this.sfx.shine();
      this.cb.showMsg('💎 すいしょうを てにいれた!');
    } else if (p.fossil) {
      const fossil = p.fossil;
      fossil.collected = true;
      for (const i of fossil.cells.keys()) {
        const { gx, gz } = coords(i);
        this.settleColumn(gx, gz);
      }
      this.updateSupports();
      this.cb.onBoneCollected(fossil.def.speciesId, fossil.def.boneId, fossil.stars());
    }
  }

  tryPickup(clientX: number, clientY: number): boolean {
    const raycaster = this.makeRay(clientX, clientY);
    const idleItems = this.pickups.filter((p) => p.collecting < 0);
    const meshes = idleItems.map((p) => p.mesh);
    const readyFossils = this.fossils.filter((f) => f.ready && !f.collected);
    const groups = readyFossils.map((f) => f.group);
    const hit = raycaster.intersectObjects([...meshes, ...groups], true)[0];
    if (!hit) return false;
    const owns = (root: THREE.Object3D): boolean => {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj === root) return true;
        obj = obj.parent;
      }
      return false;
    };
    for (const p of idleItems) {
      if (owns(p.mesh)) {
        p.collecting = 0;
        this.sfx.rub();
        return true;
      }
    }
    for (const f of readyFossils) {
      if (owns(f.group)) {
        this.pickups.push({
          kind: 'fossil',
          mesh: f.group,
          base: f.group.position.clone(),
          phase: 0,
          collecting: 0,
          fossil: f,
        });
        f.ready = false;
        this.sfx.rub();
        return true;
      }
    }
    return false;
  }

  collectAllPickups(instant = false): void {
    for (const f of this.fossils) {
      if (f.ready && !f.collected) {
        this.pickups.push({
          kind: 'fossil',
          mesh: f.group,
          base: f.group.position.clone(),
          phase: 0,
          collecting: instant ? 2 : 0,
          fossil: f,
        });
        f.ready = false;
      }
    }
    for (const p of this.pickups) {
      if (instant) {
        // 飛んでいる途中のものも含めて、その場で回収を確定する
        if (p.collecting < 1) p.collecting = 2;
      } else if (p.collecting < 0) {
        p.collecting = 0;
      }
    }
    if (instant) this.flushPickups();
  }

  private flushPickups(): void {
    for (let n = this.pickups.length - 1; n >= 0; n--) {
      const p = this.pickups[n]!;
      if (p.collecting >= 1) {
        this.root.remove(p.mesh);
        this.pickups.splice(n, 1);
        this.completePickup(p);
      }
    }
  }

  // ---- 入力・毎フレーム ---------------------------------------------------------

  private makeRay(clientX: number, clientY: number): THREE.Raycaster {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    return raycaster;
  }

  raycastCell(clientX: number, clientY: number): number | null {
    const raycaster = this.makeRay(clientX, clientY);
    const targets: THREE.Object3D[] = [this.soil];
    const lookup = new Map<THREE.Object3D, number>();
    for (const fossil of this.fossils) {
      if (fossil.collected) continue;
      for (const [i, cell] of fossil.cells) {
        if (cell.crust.visible) {
          targets.push(cell.crust);
          lookup.set(cell.crust, i);
        }
      }
    }
    for (const [i, rock] of this.rocks) {
      if (rock.hp > 0 && rock.mesh.visible) {
        targets.push(rock.mesh);
        lookup.set(rock.mesh, i);
      }
    }
    const hits = raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      if (hit.object === this.soil) {
        if (hit.instanceId !== undefined && this.alive[hit.instanceId]) return hit.instanceId;
        continue;
      }
      const found = lookup.get(hit.object);
      if (found !== undefined) return found;
    }
    return null;
  }

  tapAction(clientX: number, clientY: number): void {
    if (this.tryPickup(clientX, clientY)) return;
    const target = this.raycastCell(clientX, clientY);
    if (target === null) return;
    if (this.tool === 'pick') {
      if (this.state.tool.broken && !this.state.data.flags['bareHandsMsg']) {
        this.state.setFlag('bareHandsMsg');
        this.cb.showMsg('✋ こわれても てで ゆっくり ほれるぞ(かたい層は むり)');
      }
      this.swingPick(target);
    } else if (this.tool === 'ear') {
      this.knock(target);
    } else {
      if (this.crustedAt(target)) {
        this.sfx.rub();
        this.polish(target, TAP_POLISH_AMOUNT);
      } else {
        this.sfx.rub();
      }
    }
  }

  dragBrush(clientX: number, clientY: number, prevX: number, prevY: number, now: number): boolean {
    const target = this.raycastCell(clientX, clientY);
    if (target === null || !this.crustedAt(target)) return false;
    const dist = Math.hypot(clientX - prevX, clientY - prevY);
    this.polish(target, dist * RUB_PROGRESS_PER_PX);
    if (now - this.lastRubAt > 120) {
      this.lastRubAt = now;
      this.sfx.rub();
      this.particles.burst(cellCenter(target), new THREE.Color(0xcbb391), 2);
    }
    return true;
  }
  private lastRubAt = 0;

  crustedAt(i: number): boolean {
    const fossil = this.cellOwner.get(i);
    return !fossil?.collected && fossil?.cells.get(i)?.status === 'crusted';
  }

  isFinished(): boolean {
    return this.fossils.every((f) => f.collected);
  }

  cellScreen(gx: number, gz: number, layer: number): { x: number; y: number } {
    const p = cellCenter(idx(gx, gz, layer)).project(this.camera);
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
  }
  debugPick(gx: number, gz: number, layer: number): void {
    this.swingPick(idx(gx, gz, layer));
  }
  debugPolish(gx: number, gz: number, layer: number, amount: number): void {
    this.polish(idx(gx, gz, layer), amount);
  }
  debugDump(): unknown {
    return this.fossils.map((f) => ({
      bone: f.def.boneId,
      collected: f.collected,
      ready: f.ready,
      cells: [...f.cells.entries()].map(([i, c]) => ({ i, ...coords(i), status: c.status })),
    }));
  }

  update(dt: number, time: number): void {
    this.particles.update(dt);

    if (this.introT < 1) {
      this.introT = Math.min(1, this.introT + dt / 1.4);
      const k = this.introT * this.introT * (3 - 2 * this.introT);
      this.camera.position.lerpVectors(this.camFrom, this.camTo, k);
    }

    for (const rock of this.rocks.values()) {
      if (rock.flash > 0) {
        rock.flash = Math.max(0, rock.flash - dt * 5);
        (rock.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        (rock.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = rock.flash * 0.7;
      }
    }
    for (const [i, p] of this.bedrockPulse) {
      const next = Math.max(0, p - dt * 4);
      const s = 1 + Math.sin(p * Math.PI) * 0.08;
      this.setSoilMatrix(i, this.alive[i] ? s : 0);
      if (next <= 0) this.bedrockPulse.delete(i);
      else this.bedrockPulse.set(i, next);
    }

    const pulse = 0.22 + 0.14 * Math.sin(time * 5);
    for (const fossil of this.fossils) {
      for (const cell of fossil.cells.values()) {
        if (cell.status !== 'crusted') continue;
        const mat = cell.crust.material as THREE.MeshStandardMaterial;
        if (this.tool === 'brush') {
          mat.emissive.setHex(0xffd75e);
          mat.emissiveIntensity = pulse;
        } else if (this.tool === 'pick') {
          mat.emissive.setHex(0xaa2222);
          mat.emissiveIntensity = 0.18;
        } else {
          mat.emissiveIntensity = 0;
        }
      }
      if (fossil.wobbleT > 0) {
        fossil.wobbleT = Math.max(0, fossil.wobbleT - dt);
        fossil.group.rotation.z = Math.sin(fossil.wobbleT * 30) * 0.05 * fossil.wobbleT;
      }
      if (fossil.ready && !fossil.collected) {
        fossil.group.position.y = fossil.readyBaseY + Math.sin(time * 3) * 0.05;
      }
    }

    for (let n = this.pickups.length - 1; n >= 0; n--) {
      const p = this.pickups[n]!;
      if (p.collecting < 0) {
        p.mesh.position.set(
          p.base.x,
          p.base.y + 0.1 + Math.sin(time * 3 + p.phase) * 0.06,
          p.base.z,
        );
        p.mesh.rotation.y += dt * 1.5;
      } else {
        p.collecting = Math.min(1, p.collecting + dt / 0.55);
        const k = p.collecting;
        p.mesh.position.set(p.base.x, p.base.y + k * 1.6, p.base.z);
        p.mesh.rotation.y += dt * 9;
        p.mesh.scale.setScalar(Math.max(0.001, 1 - k * k));
        if (p.collecting >= 1) {
          this.particles.burst(p.mesh.position.clone(), new THREE.Color(0xfff2b8), 6);
          this.root.remove(p.mesh);
          this.pickups.splice(n, 1);
          this.completePickup(p);
        }
      }
    }

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3.2);
      this.root.position.set(
        (Math.random() - 0.5) * 0.1 * this.shake,
        (Math.random() - 0.5) * 0.06 * this.shake,
        0,
      );
    } else {
      this.root.position.set(0, 0, 0);
    }

    // 骨名ラベル: 露出=？？？ / 1マスみがくと名前判明 / 完了=タップ
    for (const [fossil, label] of this.labels) {
      if (fossil.collected) {
        label.style.display = 'none';
        continue;
      }
      const cells = [...fossil.cells.values()];
      const revealed = cells.some((c) => c.status !== 'hidden');
      if (!revealed) {
        label.style.display = 'none';
        continue;
      }
      if (fossil.ready) {
        label.textContent = '✨ ほりだせる!';
        label.classList.add('ready');
      } else {
        label.textContent = '？？？のホネ';
        label.classList.remove('ready');
      }
      const p = fossil.group.position
        .clone()
        .add(new THREE.Vector3(0, 0.8, 0))
        .project(this.camera);
      if (p.z > 1) {
        label.style.display = 'none';
        continue;
      }
      label.style.display = 'block';
      label.style.left = `${((p.x + 1) / 2) * this.renderer.domElement.clientWidth}px`;
      label.style.top = `${((1 - p.y) / 2) * this.renderer.domElement.clientHeight}px`;
    }

    this.controls.update();
  }
}
