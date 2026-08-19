import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sfx } from '../poc2/audio';
import { DebrisParticles } from '../poc2/particles';
import type { SiteDef, BonePlacement } from './data';

const GRID_X = 8;
const GRID_Z = 8;
const GRID_DEPTH = 6;
const CELL = 0.55;
const PITCH = 0.57;
const STRATA_COLORS = [0xe6d491, 0xe6d491, 0xb59a76, 0xb59a76, 0xa8674a, 0xa8674a];

const BRUSH_HITS_TO_REMOVE = 3;
const ACTION_COOLDOWN_MS = 130;
const DAMAGE_CAP_PER_ACTION = 2;
const COST_PICK = 2;
const COST_BRUSH = 1;
const DIG_DEFER_MS = 70;

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

class VoxelGrid {
  readonly mesh: THREE.InstancedMesh;
  readonly alive: boolean[] = [];
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
    const color = new THREE.Color();
    for (let i = 0; i < GRID_X * GRID_Z * GRID_DEPTH; i++) {
      const { layer, gx, gz } = this.coords(i);
      color.setHex(STRATA_COLORS[layer]!);
      color.offsetHSL(0, 0, (((gx * 31 + gz * 17 + layer * 7) % 10) / 10 - 0.5) * 0.05);
      this.baseColors.push(color.clone());
      this.alive.push(true);
      this.brushHits.push(0);
      this.lastHitAt.push(0);
      this.mesh.setColorAt(i, color);
      this.m.makeScale(1, 1, 1);
      this.m.setPosition(this.center(i));
      this.mesh.setMatrixAt(i, this.m);
    }
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
    this.m.makeScale(0, 0, 0);
    this.m.setPosition(this.center(i));
    this.mesh.setMatrixAt(i, this.m);
    this.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

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
}

class FossilInstance {
  readonly group = new THREE.Group();
  readonly cells = new Set<number>();
  damage = 0;
  collected = false;
  private readonly material = new THREE.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.55 });

  constructor(
    readonly placement: BonePlacement,
    grid: VoxelGrid,
  ) {
    for (const [gx, gz] of placement.cells) {
      this.cells.add(grid.idx(gx, gz, placement.layer));
    }
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
    const centerCell = placement.cells[1]!;
    this.group.position.copy(grid.center(grid.idx(centerCell[0], centerCell[1], placement.layer)));
    this.group.rotation.y = placement.axis === 'z' ? Math.PI / 2 : 0;
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  stars(): number {
    return this.damage === 0 ? 3 : this.damage <= 2 ? 2 : 1;
  }

  applyDamageTint(): void {
    this.material.color.lerpColors(
      new THREE.Color(0xf7f3e8),
      new THREE.Color(0x8f7d66),
      Math.min(this.damage, 3) / 3,
    );
  }
}

export interface DigCallbacks {
  getStamina(): number;
  spendStamina(cost: number): number; // 残量を返す
  onCollect(siteId: string, boneId: string, nameJa: string, stars: number): void;
  onExit(): void;
  showMsg(text: string): void;
}

type Tool = 'pick' | 'brush';

// 1発掘現場。掘りかけの状態はインスタンスが生きている限り保持される(柱2)
export class DigMode {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  finished = false;

  private readonly controls: OrbitControls;
  private readonly grid = new VoxelGrid();
  private readonly fossils: FossilInstance[] = [];
  private readonly cellOwner = new Map<number, FossilInstance>();
  private readonly hintCells = new Set<number>();
  private readonly particles = new DebrisParticles();
  private readonly digGroup = new THREE.Group();
  private tool: Tool = 'pick';
  private shake = 0;
  private lastActionAt = 0;
  private abort: AbortController | null = null;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly sfx: Sfx,
    readonly site: SiteDef,
    private readonly cb: DigCallbacks,
  ) {
    this.scene.background = new THREE.Color(0x9ed4ef);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 8.4, 7.6);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.set(0, 1.7, 0);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(15);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
    this.controls.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.enabled = false;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.0);
    sun.position.set(10, 16, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xd4bd8a, roughness: 1 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);

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
      this.digGroup.add(plank);
    }

    this.digGroup.add(this.grid.mesh);
    for (const placement of site.bones) {
      const fossil = new FossilInstance(placement, this.grid);
      this.fossils.push(fossil);
      this.digGroup.add(fossil.group);
      for (const c of fossil.cells) this.cellOwner.set(c, fossil);
    }
    for (const fossil of this.fossils) {
      for (const c of fossil.cells) {
        for (const n of this.grid.faceNeighbors(c)) {
          if (!this.cellOwner.has(n)) this.hintCells.add(n);
        }
      }
    }
    this.scene.add(this.digGroup);
    this.scene.add(this.particles.mesh);
  }

  activate(): void {
    this.controls.enabled = true;
    el('dig-ui').classList.remove('hidden');
    this.setTool('pick');
    this.updateProgress();

    this.abort = new AbortController();
    const opts = { signal: this.abort.signal };
    const canvas = this.renderer.domElement;

    const pointers = new Set<number>();
    let activePointer: number | null = null;
    let digStarted = false;
    let pendingDig: ReturnType<typeof setTimeout> | undefined;
    const downPos = { x: 0, y: 0 };
    const cancelPending = (): void => {
      if (pendingDig !== undefined) {
        clearTimeout(pendingDig);
        pendingDig = undefined;
      }
    };

    canvas.addEventListener(
      'pointerdown',
      (e) => {
        this.sfx.unlock();
        pointers.add(e.pointerId);
        if (pointers.size === 1 && e.button === 0) {
          activePointer = e.pointerId;
          digStarted = false;
          downPos.x = e.clientX;
          downPos.y = e.clientY;
          pendingDig = setTimeout(() => {
            pendingDig = undefined;
            if (pointers.size === 1 && activePointer === e.pointerId) {
              digStarted = true;
              this.dig(downPos.x, downPos.y);
            }
          }, DIG_DEFER_MS);
        } else {
          cancelPending();
          activePointer = null;
          digStarted = false;
        }
      },
      opts,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (pointers.size !== 1 || e.pointerId !== activePointer) return;
        downPos.x = e.clientX;
        downPos.y = e.clientY;
        if (digStarted) this.dig(e.clientX, e.clientY);
      },
      opts,
    );
    const release = (e: PointerEvent): void => {
      pointers.delete(e.pointerId);
      if (e.pointerId === activePointer) {
        if (pendingDig !== undefined) {
          cancelPending();
          if (pointers.size === 0) this.dig(downPos.x, downPos.y);
        }
        activePointer = null;
        digStarted = false;
      }
    };
    canvas.addEventListener('pointerup', release, opts);
    canvas.addEventListener('pointercancel', release, opts);

    el('dig-btn-pick').addEventListener('click', () => this.setTool('pick'), opts);
    el('dig-btn-brush').addEventListener('click', () => this.setTool('brush'), opts);
    el('dig-btn-exit').addEventListener('click', () => this.cb.onExit(), opts);
  }

  deactivate(): void {
    this.controls.enabled = false;
    el('dig-ui').classList.add('hidden');
    this.abort?.abort();
    this.abort = null;
  }

  update(dt: number): void {
    this.particles.update(dt);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3.2);
      this.digGroup.position.set(
        (Math.random() - 0.5) * 0.1 * this.shake,
        (Math.random() - 0.5) * 0.06 * this.shake,
        0,
      );
    } else {
      this.digGroup.position.set(0, 0, 0);
    }
    this.controls.update();
  }

  private setTool(next: Tool): void {
    this.tool = next;
    el('dig-btn-pick').classList.toggle('active', next === 'pick');
    el('dig-btn-brush').classList.toggle('active', next === 'brush');
  }

  private updateProgress(): void {
    const done = this.fossils.filter((f) => f.collected).length;
    el('dig-progress').textContent = `ホネ ${done}/${this.fossils.length}`;
  }

  private onCellRemoved(i: number): { owner: FossilInstance | undefined; hinted: boolean } {
    this.particles.burst(this.grid.center(i), this.grid.color(i), 8);
    return { owner: this.cellOwner.get(i), hinted: this.hintCells.has(i) };
  }

  // セルが消えた後、全部むき出しになった骨を回収する
  private collectRevealed(): void {
    for (const fossil of this.fossils) {
      if (fossil.collected) continue;
      let revealed = true;
      for (const c of fossil.cells) if (this.grid.alive[c]) revealed = false;
      if (!revealed) continue;
      fossil.collected = true;
      const stars = fossil.stars();
      this.sfx.fanfare();
      this.cb.onCollect(this.site.id, fossil.placement.boneId, fossil.placement.nameJa, stars);
      this.updateProgress();
    }
    if (this.fossils.every((f) => f.collected) && !this.finished) {
      this.finished = true;
      setTimeout(() => {
        this.cb.showMsg('🦴 この げんばは ほりつくした!');
        this.cb.onExit();
      }, 1300);
    }
  }

  private dig(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const hit = raycaster
      .intersectObject(this.grid.mesh)
      .find((h) => h.instanceId !== undefined && this.grid.alive[h.instanceId]);
    if (!hit || hit.instanceId === undefined) return;
    this.digAtCell(hit.instanceId);
  }

  private digAtCell(target: number): void {
    if (this.finished) return;
    if (this.cb.getStamina() <= 0) {
      this.cb.showMsg('😪 げんきが ない… テントで やすもう');
      return;
    }
    const now = performance.now();

    if (this.tool === 'pick') {
      if (now - this.lastActionAt < ACTION_COOLDOWN_MS) return;
      this.lastActionAt = now;
      let damaged = 0;
      let hinted = false;
      const damagedFossils = new Set<FossilInstance>();
      for (const i of [target, ...this.grid.lateralNeighbors(target)]) {
        if (!this.grid.remove(i)) continue;
        const r = this.onCellRemoved(i);
        if (r.owner && damaged < DAMAGE_CAP_PER_ACTION) {
          damaged++;
          r.owner.damage++;
          damagedFossils.add(r.owner);
        }
        hinted ||= r.hinted;
      }
      this.sfx.pick();
      if (damaged > 0) {
        damagedFossils.forEach((f) => f.applyDamageTint());
        this.sfx.crack();
        this.shake = 1;
        this.cb.showMsg('💥 かせきに ヒビが はいった…!');
      } else if (hinted) {
        this.sfx.hint();
        this.particles.burst(
          this.grid.center(target).add(new THREE.Vector3(0, 0.3, 0)),
          new THREE.Color(0xffe28a),
          6,
        );
        this.cb.showMsg('✨ かせきが ちかい! ブラシに もちかえよう');
      }
      this.collectRevealed();
      this.afterSpend(this.cb.spendStamina(COST_PICK));
    } else {
      const result = this.grid.hitBrush(target, now);
      if (!result) return;
      this.sfx.brush();
      if (result === 'removed') {
        const r = this.onCellRemoved(target);
        if (r.owner) {
          this.cb.showMsg('🦴 ホネが みえてきた!');
        } else if (r.hinted) {
          this.sfx.hint();
          this.cb.showMsg('✨ かせきが ちかい!');
        }
        this.collectRevealed();
      } else {
        this.particles.burst(this.grid.center(target), this.grid.color(target), 2);
      }
      this.afterSpend(this.cb.spendStamina(COST_BRUSH));
    }
  }

  private afterSpend(remaining: number): void {
    if (remaining > 0 || this.finished) return;
    this.sfx.fail();
    setTimeout(() => {
      if (this.finished) return;
      this.cb.showMsg('😪 げんきが なくなった… テントで やすんで また こよう');
      this.cb.onExit();
    }, 700);
  }

  // スモークテスト用
  cellScreen(gx: number, gz: number, layer: number): { x: number; y: number } {
    const p = this.grid.center(this.grid.idx(gx, gz, layer)).project(this.camera);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
  }

  // スモークテスト用: レイキャストを通さずセルを直接掘る
  debugDigCell(gx: number, gz: number, layer: number): void {
    const i = this.grid.idx(gx, gz, layer);
    if (this.grid.alive[i]) this.digAtCell(i);
  }
}
