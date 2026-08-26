import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sfx } from '../core/audio';
import { buildCharacter, type CharacterRig } from '../art/chars';
import { GameState, type PitDef } from '../core/state';

// カセキ島「すなの谷」。タップ移動・手がかり発見・キャンプ(クラフト)・博物館の入口。

const WALK_SPEED = 3.4;
const INTERACT_RANGE = 2.9;
const ALERT_RANGE = 10;

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

// 島の固定地形(柱2: 世界は固定)。amp で島ごとの起伏の強さを変える
export function groundHeight(x: number, z: number, amp = 1): number {
  const dunes =
    (0.5 * Math.sin(x * 0.16) * Math.cos(z * 0.14) +
      0.25 * Math.sin(x * 0.4 + 1) * Math.sin(z * 0.3 + 2)) *
    amp;
  const r = Math.hypot(x, z);
  const openSouth = 1 - THREE.MathUtils.smoothstep(z, 8, 20);
  const rim = THREE.MathUtils.smoothstep(r, 19, 27) * 7 * openSouth;
  const beachFlat = THREE.MathUtils.smoothstep(z, 11, 17);
  // すなはまの先は うみへ しずむ(みぎわは z≈20。遊べる範囲 z<=18.5 は不変)
  const seaDip = THREE.MathUtils.smoothstep(z, 19.5, 26) * 3.5;
  return dunes * (1 - beachFlat) * (1 - THREE.MathUtils.smoothstep(r, 19, 23)) + rim - seaDip;
}

// 島ごとの見た目(地形の色・空・海・植生)。形の共通部は当面共有し、雰囲気で差別化する
interface IslandLook {
  sky: number;
  sea: number;
  terrain: number;
  terrainAmp: number;
  jungle: boolean;
  shore: boolean;
  crag: boolean;
  forest: boolean;
  canyon: boolean;
  nippon: boolean;
  primal: boolean;
}
const ISLAND_LOOKS: Record<string, IslandLook> = {
  k1: {
    sky: 0x9ed4ef,
    sea: 0x5fb4e0,
    terrain: 0xd8c28e,
    terrainAmp: 1,
    jungle: false,
    shore: false,
    crag: false,
    forest: false,
    canyon: false,
    nippon: false,
    primal: false,
  },
  k2: {
    sky: 0x8fc9d8,
    sea: 0x3f92a8,
    terrain: 0x86a45e,
    terrainAmp: 1.35,
    jungle: true,
    shore: false,
    crag: false,
    forest: false,
    canyon: false,
    nippon: false,
    primal: false,
  },
  k3: {
    sky: 0xaadff0,
    sea: 0x2f9ec4,
    terrain: 0xe8d9a8,
    terrainAmp: 0.8,
    jungle: false,
    shore: true,
    crag: false,
    forest: false,
    canyon: false,
    nippon: false,
    primal: false,
  },
  k4: {
    sky: 0xa9c6dc,
    sea: 0x4f7f9e,
    terrain: 0xb0a284,
    terrainAmp: 1.6,
    jungle: false,
    shore: false,
    crag: true,
    forest: false,
    canyon: false,
    nippon: false,
    primal: false,
  },
  k5: {
    sky: 0x9fc9c2,
    sea: 0x3d8a92,
    terrain: 0x6b9152,
    terrainAmp: 1.15,
    jungle: false,
    shore: false,
    crag: false,
    forest: true,
    canyon: false,
    nippon: false,
    primal: false,
  },
  k6: {
    sky: 0xecd0a6,
    sea: 0x4f8a9e,
    terrain: 0xc4885c,
    terrainAmp: 1.3,
    jungle: false,
    shore: false,
    crag: false,
    forest: false,
    canyon: true,
    nippon: false,
    primal: false,
  },
  k7: {
    sky: 0xbcd9ee,
    sea: 0x4596c8,
    terrain: 0x8fae6a,
    terrainAmp: 1.2,
    jungle: false,
    shore: false,
    crag: false,
    forest: false,
    canyon: false,
    nippon: true,
    primal: false,
  },
  k8: {
    sky: 0xd8bcc8,
    sea: 0x6a7fa8,
    terrain: 0x9a7a62,
    terrainAmp: 1.4,
    jungle: false,
    shore: false,
    crag: false,
    forest: false,
    canyon: false,
    nippon: false,
    primal: true,
  },
};

interface Interactable {
  id: string;
  kind: 'pit' | 'tent' | 'hakase' | 'museum' | 'boat';
  position: THREE.Vector3;
  hotspot: THREE.Mesh;
  pit?: PitDef;
}

export interface FieldCallbacks {
  onEnterPit(pit: PitDef): void;
  onOpenCraft(): void;
  onOpenMuseum(): void;
  onHakase(): void;
  onOpenBoat(): void;
  onDiscover(pit: PitDef): void;
  showMsg(text: string): void;
}

export class FieldMode {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly look: IslandLook;
  private readonly ground: (x: number, z: number) => number;

  private readonly controls: OrbitControls;
  private readonly player = new THREE.Group();
  private readonly terrain: THREE.Mesh;
  private readonly interactables: Interactable[] = [];
  private readonly flags = new Map<string, THREE.Group>();
  private readonly donePatches = new Map<string, THREE.Mesh>();
  private readonly alertEls = new Map<string, HTMLElement>();
  private moveTarget: THREE.Vector3 | null = null;
  private pendingInteract: string | null = null;
  private walkPhase = 0;
  private readonly camTarget = new THREE.Vector3();
  private boat: THREE.Group | null = null;
  private boatBaseY = 0;
  private waveRing: THREE.Mesh | null = null;
  private boatAlert: HTMLElement | null = null;
  private time = 0;
  private playerRig: CharacterRig | null = null;
  private hakaseRig: CharacterRig | null = null;
  private playerMoving = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly sfx: Sfx,
    private readonly state: GameState,
    private readonly cb: FieldCallbacks,
  ) {
    this.look = ISLAND_LOOKS[this.state.island.id] ?? ISLAND_LOOKS['k1']!;
    const look = this.look;
    this.ground = (x, z) => groundHeight(x, z, look.terrainAmp);
    this.scene.background = new THREE.Color(look.sky);
    this.scene.fog = new THREE.Fog(look.sky, 45, 95);
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 9, 15);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(25);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(65);
    this.controls.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.enabled = false;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.0);
    sun.position.set(24, 30, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);

    // 地形と海
    {
      const geo = new THREE.PlaneGeometry(64, 64, 72, 72);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, this.ground(pos.getX(i), pos.getZ(i)));
      }
      geo.computeVertexNormals();
      this.terrain = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: this.look.terrain,
          roughness: 1,
          flatShading: true,
        }),
      );
      this.terrain.receiveShadow = true;
      this.scene.add(this.terrain);

      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 40).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: this.look.sea, roughness: 0.4 }),
      );
      sea.position.set(0, -0.12, 38);
      this.scene.add(sea);
    }

    // 岩・枯れ木(固定配置)
    {
      const rockGeo = new THREE.IcosahedronGeometry(1, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x9b8f7c,
        roughness: 1,
        flatShading: true,
      });
      for (let i = 0; i < 18; i++) {
        const angle = i * 2.39996;
        const radius = 6 + ((i * 53) % 14);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius * 0.85;
        if (z > 13) continue;
        if (Math.hypot(x - 6, z - 3) < 4) continue; // 博物館の敷地は空ける
        const s = 0.25 + ((i * 29) % 10) / 14;
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, this.ground(x, z) + s * 0.3, z);
        rock.scale.set(s, s * 0.7, s);
        rock.rotation.y = i * 1.7;
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
      }
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1 });
      if (this.look.shore) {
        // うみのしま: ヤシの木 + しおだまり + しろい さんごいし
        const palmLeaf = new THREE.MeshStandardMaterial({
          color: 0x3f9c5a,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, lean] of [
          [-10, 6, 1],
          [12, -4, -1],
          [-5, -9, 1],
          [14, 8, -1],
          [-16, -8, 1],
        ] as const) {
          const palm = new THREE.Group();
          for (let seg = 0; seg < 3; seg++) {
            const part = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1 - seg * 0.012, 0.14 - seg * 0.012, 1.05, 6),
              woodMat,
            );
            part.position.set(lean * (0.14 + seg * 0.3), 0.5 + seg * 0.92, 0);
            part.rotation.z = -lean * 0.16 * (seg + 1);
            part.castShadow = true;
            palm.add(part);
          }
          for (let leaf = 0; leaf < 6; leaf++) {
            const holder = new THREE.Group();
            holder.position.set(lean * 0.85, 3.15, 0);
            holder.rotation.y = (leaf / 6) * Math.PI * 2 + x;
            const blade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.5, 4), palmLeaf);
            blade.scale.z = 0.45;
            blade.position.x = 0.6;
            blade.rotation.z = -2.05;
            blade.castShadow = true;
            holder.add(blade);
            palm.add(holder);
          }
          palm.position.set(x, this.ground(x, z), z);
          this.scene.add(palm);
        }
        const poolMat = new THREE.MeshStandardMaterial({
          color: this.look.sea,
          roughness: 0.25,
          transparent: true,
          opacity: 0.85,
        });
        for (const [x, z, r] of [
          [3, 9, 1.5],
          [-9, -1, 1.1],
          [9, -6, 1.3],
        ] as const) {
          const pool = new THREE.Mesh(
            new THREE.CircleGeometry(r, 18).rotateX(-Math.PI / 2),
            poolMat,
          );
          pool.position.set(x, this.ground(x, z) + 0.03, z);
          this.scene.add(pool);
        }
        const coralMat = new THREE.MeshStandardMaterial({
          color: 0xefe6d4,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, s] of [
          [5, 12, 0.5],
          [-3, 13, 0.4],
          [-12, 10, 0.6],
          [15, -2, 0.45],
        ] as const) {
          const coral = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), coralMat);
          coral.position.set(x, this.ground(x, z) + s * 0.25, z);
          coral.scale.set(s, s * 0.55, s);
          coral.rotation.y = x + z;
          coral.castShadow = true;
          this.scene.add(coral);
        }
      } else if (this.look.primal) {
        // さんじょうきのたに: 地層しまもようの丘 + トクサの塔 + イチョウ + 古いシダ
        const strataColors = [0xd9c896, 0xb59a76, 0xa1704f, 0x965f43];
        for (const [x, z, s] of [
          [-12, 7, 1.1],
          [13, -5, 0.9],
          [-6, -9, 1.2],
        ] as const) {
          const hill = new THREE.Group();
          let y = 0;
          for (let band = 0; band < 4; band++) {
            const r = (2.3 - band * 0.35) * s;
            const h = 0.55 * s;
            const disc = new THREE.Mesh(
              new THREE.CylinderGeometry(r * 0.96, r, h, 10),
              new THREE.MeshStandardMaterial({
                color: strataColors[band]!,
                roughness: 1,
                flatShading: true,
              }),
            );
            disc.position.y = y + h / 2;
            disc.rotation.y = band * 0.4 + x;
            disc.castShadow = true;
            hill.add(disc);
            y += h * 0.98;
          }
          hill.position.set(x, this.ground(x, z), z);
          this.scene.add(hill);
        }
        // トクサ(ふしのある くき)の 塔
        const horsetailMat = new THREE.MeshStandardMaterial({
          color: 0x6a9a5a,
          roughness: 1,
          flatShading: true,
        });
        const nodeMat = new THREE.MeshStandardMaterial({
          color: 0x4f7a44,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z] of [
          [3, 7],
          [-8, 0],
          [9, -3],
          [-3, -7],
          [14, 3],
        ] as const) {
          const stalk = new THREE.Group();
          let y = 0;
          for (let seg = 0; seg < 4; seg++) {
            const h = 0.55 - seg * 0.06;
            const part = new THREE.Mesh(
              new THREE.CylinderGeometry(0.09 - seg * 0.012, 0.1 - seg * 0.012, h, 6),
              horsetailMat,
            );
            part.position.y = y + h / 2;
            part.castShadow = true;
            stalk.add(part);
            y += h;
            const node = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12 - seg * 0.012, 0.12 - seg * 0.012, 0.05, 6),
              nodeMat,
            );
            node.position.y = y;
            stalk.add(node);
          }
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), nodeMat);
          tip.position.y = y + 0.14;
          stalk.add(tip);
          stalk.position.set(x, this.ground(x, z), z);
          stalk.rotation.z = 0.06 * ((x % 3) - 1);
          this.scene.add(stalk);
        }
        // イチョウのような きいろい木
        const ginkgoMat = new THREE.MeshStandardMaterial({
          color: 0xc9c25a,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, h] of [
          [-11, 12, 3.0],
          [16, 10, 2.7],
          [4, -15, 3.2],
          [-16, -6, 2.8],
        ] as const) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, h * 0.5, 7), woodMat);
          trunk.position.y = h * 0.25;
          trunk.castShadow = true;
          tree.add(trunk);
          const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.38, 0), ginkgoMat);
          crown.position.y = h * 0.66;
          crown.scale.y = 0.75;
          crown.castShadow = true;
          tree.add(crown);
          tree.position.set(x, this.ground(x, z), z);
          tree.rotation.y = x + z;
          this.scene.add(tree);
        }
        // ふるい シダ
        const fernMat = new THREE.MeshStandardMaterial({
          color: 0x7fae6a,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z] of [
          [2, 6],
          [-5, 2],
          [8, -6],
          [-10, -4],
        ] as const) {
          const fern = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.65, 6), fernMat);
          fern.position.set(x, this.ground(x, z) + 0.28, z);
          fern.scale.y = 0.7;
          fern.castShadow = true;
          this.scene.add(fern);
        }
      } else if (this.look.nippon) {
        // にっぽんのしま: さくら + たけやぶ + ゆきの やま
        const sakuraA = new THREE.MeshStandardMaterial({
          color: 0xf2b8cc,
          roughness: 1,
          flatShading: true,
        });
        const sakuraB = new THREE.MeshStandardMaterial({
          color: 0xe89ab8,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, h] of [
          [-11, 6, 3.2],
          [11, -6, 2.9],
          [-6, -8, 3.4],
          [15, 3, 2.7],
          [-16, -6, 3.0],
        ] as const) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h * 0.5, 7), woodMat);
          trunk.position.y = h * 0.25;
          trunk.castShadow = true;
          tree.add(trunk);
          const crownA = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.4, 0), sakuraA);
          crownA.position.y = h * 0.62;
          crownA.castShadow = true;
          tree.add(crownA);
          const crownB = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.28, 0), sakuraB);
          crownB.position.set(h * 0.16, h * 0.88, h * 0.1);
          crownB.castShadow = true;
          tree.add(crownB);
          tree.position.set(x, this.ground(x, z), z);
          tree.rotation.y = x + z;
          this.scene.add(tree);
        }
        // たけやぶ
        const bambooMat = new THREE.MeshStandardMaterial({
          color: 0x7fae5a,
          roughness: 0.9,
          flatShading: true,
        });
        for (const [bx, bz] of [
          [4, -14],
          [16, 10],
          [-11, 12],
          [9, -2],
        ] as const) {
          const grove = new THREE.Group();
          for (let k = 0; k < 4; k++) {
            const h = 2.4 + ((k * 7) % 3) * 0.5;
            const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, h, 6), bambooMat);
            cane.position.set(Math.cos(k * 2.4) * 0.35, h / 2, Math.sin(k * 2.4) * 0.35);
            cane.rotation.z = ((k % 3) - 1) * 0.06;
            cane.castShadow = true;
            grove.add(cane);
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), bambooMat);
            tip.position.set(cane.position.x, h + 0.2, cane.position.z);
            grove.add(tip);
          }
          grove.position.set(bx, this.ground(bx, bz), bz);
          this.scene.add(grove);
        }
        // ゆきを かぶった やま(地平線の ランドマーク・到達不可)
        const mtMat = new THREE.MeshStandardMaterial({
          color: 0x8a92a8,
          roughness: 1,
          flatShading: true,
        });
        const mt = new THREE.Mesh(new THREE.ConeGeometry(9, 10, 10), mtMat);
        mt.position.set(2, this.ground(2, -24) + 3.6, -27);
        this.scene.add(mt);
        const snow = new THREE.Mesh(
          new THREE.ConeGeometry(3.4, 3.9, 10),
          new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 1, flatShading: true }),
        );
        snow.position.set(2, mt.position.y + 3.1, -27);
        this.scene.add(snow);
      } else if (this.look.canyon) {
        // ちいさなかりうどのたに: あかい メサ(卓状の岩) + ほねのアーチ + かれ木と かれ草
        const mesaDark = new THREE.MeshStandardMaterial({
          color: 0xa8683f,
          roughness: 1,
          flatShading: true,
        });
        const mesaLight = new THREE.MeshStandardMaterial({
          color: 0xc07f52,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, s] of [
          [-12, 7, 1.1],
          [13, -5, 0.9],
          [-6, -9, 1.25],
        ] as const) {
          const mesa = new THREE.Group();
          let y = 0;
          for (let seg = 0; seg < 3; seg++) {
            const r = (2.2 - seg * 0.25) * s;
            const h = 1.15 * s;
            const block = new THREE.Mesh(
              new THREE.CylinderGeometry(r * 0.94, r, h, 9),
              seg % 2 === 0 ? mesaDark : mesaLight,
            );
            block.position.y = y + h / 2;
            block.rotation.y = seg * 0.5 + x;
            block.castShadow = true;
            mesa.add(block);
            y += h * 0.96;
          }
          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(1.55 * s, 1.7 * s, 0.28, 9),
            mesaDark,
          );
          cap.position.y = y + 0.14;
          cap.castShadow = true;
          mesa.add(cap);
          mesa.position.set(x, this.ground(x, z), z);
          this.scene.add(mesa);
        }
        // しろく ひやけた ほねの アーチ(たにの ランドマーク)
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.6 });
        const archPos = new THREE.Vector3(5, this.ground(5, -4), -4);
        for (const [dz, r] of [
          [-0.6, 1.35],
          [0, 1.5],
          [0.6, 1.3],
        ] as const) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 6, 16, Math.PI), boneMat);
          rib.position.set(archPos.x, archPos.y, archPos.z + dz);
          rib.castShadow = true;
          this.scene.add(rib);
        }
        // かれ木と かれ草
        for (const [x, z, rot] of [
          [-10, 1, 0.4],
          [11, 9, 1.9],
          [3, -14, 3.1],
        ] as const) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.0, 6), woodMat);
          trunk.position.y = 1.0;
          trunk.rotation.z = 0.15;
          trunk.castShadow = true;
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.1, 5), woodMat);
          branch.position.set(0.35, 1.6, 0);
          branch.rotation.z = -1.0;
          branch.castShadow = true;
          tree.add(trunk, branch);
          tree.position.set(x, this.ground(x, z), z);
          tree.rotation.y = rot;
          this.scene.add(tree);
        }
        const dryGrass = new THREE.MeshStandardMaterial({
          color: 0xd8c088,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z] of [
          [3, 7],
          [-8, 0],
          [9, -3],
          [-3, -7],
          [14, 3],
        ] as const) {
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 5), dryGrass);
          tuft.position.set(x, this.ground(x, z) + 0.28, z);
          tuft.rotation.z = 0.3;
          tuft.rotation.y = x * 1.7;
          tuft.castShadow = true;
          this.scene.add(tuft);
        }
      } else if (this.look.forest) {
        // とげとよろいのもり: まるい こかげの木 + とげやぶ + きのこ + こけ岩
        const leafDark = new THREE.MeshStandardMaterial({
          color: 0x35714a,
          roughness: 1,
          flatShading: true,
        });
        const leafLight = new THREE.MeshStandardMaterial({
          color: 0x4c8a5c,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, h] of [
          [-11, 6, 3.4],
          [11, -6, 3.0],
          [-6, -7, 3.8],
          [15, 2, 2.8],
          [-16, -6, 3.2],
          [4, -15, 3.0],
          [16, 11, 2.7],
          [-11, 12, 3.1],
        ] as const) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h * 0.5, 7), woodMat);
          trunk.position.y = h * 0.25;
          trunk.castShadow = true;
          tree.add(trunk);
          const crownA = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.42, 0), leafDark);
          crownA.position.y = h * 0.62;
          crownA.castShadow = true;
          tree.add(crownA);
          const crownB = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.3, 0), leafLight);
          crownB.position.set(h * 0.14, h * 0.92, h * 0.1);
          crownB.castShadow = true;
          tree.add(crownB);
          tree.position.set(x, this.ground(x, z), z);
          tree.rotation.y = x + z;
          this.scene.add(tree);
        }
        // とげやぶ(まもりの もりの しるし)
        const bushMat = new THREE.MeshStandardMaterial({
          color: 0x54704a,
          roughness: 1,
          flatShading: true,
        });
        const thornMat = new THREE.MeshStandardMaterial({
          color: 0xcdbf9a,
          roughness: 0.9,
          flatShading: true,
        });
        const up = new THREE.Vector3(0, 1, 0);
        for (const [x, z] of [
          [3, 7],
          [-8, 1],
          [9, -3],
          [-3, -9],
          [13, 6],
        ] as const) {
          const bush = new THREE.Group();
          const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), bushMat);
          body.scale.y = 0.7;
          body.castShadow = true;
          bush.add(body);
          for (let k = 0; k < 6; k++) {
            const dir = new THREE.Vector3(
              Math.cos(k * 2.4),
              0.5 + ((k * 7) % 4) / 6,
              Math.sin(k * 2.4),
            ).normalize();
            const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34, 5), thornMat);
            thorn.position.copy(dir).multiplyScalar(0.5);
            thorn.quaternion.setFromUnitVectors(up, dir);
            bush.add(thorn);
          }
          bush.position.set(x, this.ground(x, z) + 0.35, z);
          this.scene.add(bush);
        }
        // あかい きのこ
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xf0e8d4, roughness: 0.9 });
        const capMat = new THREE.MeshStandardMaterial({ color: 0xc44a3a, roughness: 0.8 });
        for (const [x, z] of [
          [-9, 7],
          [7, 1],
          [-5, -5],
          [12, -8],
        ] as const) {
          const shroom = new THREE.Group();
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.34, 6), stemMat);
          stem.position.y = 0.17;
          shroom.add(stem);
          const cap = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            capMat,
          );
          cap.position.y = 0.3;
          cap.scale.y = 0.7;
          cap.castShadow = true;
          shroom.add(cap);
          shroom.position.set(x, this.ground(x, z), z);
          this.scene.add(shroom);
        }
        // こけむした 大岩
        const mossMat = new THREE.MeshStandardMaterial({
          color: 0x5d7a55,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, s] of [
          [-14, 10, 0.9],
          [6, 11, 0.7],
          [15, -2, 0.8],
        ] as const) {
          const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mossMat);
          moss.position.set(x, this.ground(x, z) + s * 0.3, z);
          moss.scale.set(s, s * 0.65, s);
          moss.rotation.y = x * 0.8;
          moss.castShadow = true;
          this.scene.add(moss);
        }
      } else if (this.look.crag) {
        // そらのがけ: 風の高地。岩の柱・かぜ草・低い雲・よくりゅうの巣
        const pillarMat = new THREE.MeshStandardMaterial({
          color: 0x8f8272,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, h] of [
          [-11, 6, 4.4],
          [12, -5, 3.6],
          [-6, -9, 5.0],
          [15, 8, 3.2],
        ] as const) {
          const pillar = new THREE.Group();
          let y = 0;
          for (let seg = 0; seg < 4; seg++) {
            const r = 0.9 - seg * 0.16;
            const segH = h * (0.3 - seg * 0.02);
            const block = new THREE.Mesh(
              new THREE.CylinderGeometry(r * 0.82, r, segH, 7),
              pillarMat,
            );
            block.position.y = y + segH / 2;
            block.rotation.y = seg * 0.8 + x;
            block.castShadow = true;
            pillar.add(block);
            y += segH * 0.94;
          }
          const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), pillarMat);
          cap.position.y = y + 0.2;
          cap.scale.y = 0.6;
          cap.castShadow = true;
          pillar.add(cap);
          pillar.position.set(x, this.ground(x, z), z);
          this.scene.add(pillar);
        }
        const grassMat = new THREE.MeshStandardMaterial({
          color: 0xb9b06a,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z] of [
          [3, 7],
          [-8, 0],
          [9, -4],
          [-3, -7],
          [13, 3],
          [-13, -6],
        ] as const) {
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 5), grassMat);
          tuft.position.set(x, this.ground(x, z) + 0.32, z);
          tuft.rotation.z = 0.35; // かぜで ななめ
          tuft.rotation.y = x * 1.3;
          tuft.castShadow = true;
          this.scene.add(tuft);
        }
        const cloudMat = new THREE.MeshStandardMaterial({
          color: 0xf4f7fa,
          transparent: true,
          opacity: 0.85,
          roughness: 1,
        });
        for (const [x, y, z] of [
          [-14, 9.5, -10],
          [10, 11, -16],
          [16, 8.5, 6],
        ] as const) {
          for (const [dx, r] of [
            [-1.1, 0.9],
            [0, 1.4],
            [1.3, 1.0],
          ] as const) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudMat);
            puff.position.set(x + dx, y + r * 0.2, z);
            this.scene.add(puff);
          }
        }
        // よくりゅうの巣(かざり): 枝の わっか + たまご2つ
        const nest = new THREE.Group();
        const twigMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1 });
        for (let i = 0; i < 8; i++) {
          const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 5), twigMat);
          const a = (i / 8) * Math.PI * 2;
          twig.position.set(Math.cos(a) * 0.45, 0.1, Math.sin(a) * 0.45);
          twig.rotation.set(Math.PI / 2.3, 0, a + Math.PI / 2);
          nest.add(twig);
        }
        const eggMat = new THREE.MeshStandardMaterial({ color: 0xf2ecd8, roughness: 0.8 });
        for (const ex of [-0.14, 0.16] as const) {
          const egg = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), eggMat);
          egg.scale.y = 1.25;
          egg.position.set(ex, 0.16, ex * 0.5);
          nest.add(egg);
        }
        nest.position.set(-10.2, this.ground(-10.2, 6.8), 6.8);
        this.scene.add(nest);
      } else if (!this.look.jungle) {
        for (const [x, z, rot] of [
          [-8, 4, 0.4],
          [12, -3, 1.9],
          [-16, -9, 3.1],
        ] as const) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 7), woodMat);
          trunk.position.y = 1.2;
          trunk.castShadow = true;
          const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.3, 6), woodMat);
          branch.position.set(0.35, 1.9, 0);
          branch.rotation.z = -0.9;
          branch.castShadow = true;
          tree.add(trunk, branch);
          tree.position.set(x, this.ground(x, z), z);
          tree.rotation.y = rot;
          this.scene.add(tree);
        }
      } else {
        // ジャングルの島: 針葉樹風の高木 + シダ + 地平線の火山(装飾・到達不可)
        const leafDark = new THREE.MeshStandardMaterial({
          color: 0x2e6b45,
          roughness: 1,
          flatShading: true,
        });
        const leafLight = new THREE.MeshStandardMaterial({
          color: 0x3b8055,
          roughness: 1,
          flatShading: true,
        });
        for (const [x, z, h] of [
          [-11, 6, 4.2],
          [11, -6, 3.6],
          [-6, -6, 4.6],
          [15, 2, 3.4],
          [-17, -6, 4.0],
          [4, -15, 3.8],
          [16, 12, 3.2],
          [-11, 12, 3.6],
        ] as const) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.24, h * 0.55, 7),
            woodMat,
          );
          trunk.position.y = h * 0.275;
          trunk.castShadow = true;
          tree.add(trunk);
          for (let tier = 0; tier < 3; tier++) {
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(1.35 - tier * 0.34, h * 0.34, 7),
              tier % 2 === 0 ? leafDark : leafLight,
            );
            cone.position.y = h * (0.42 + tier * 0.22);
            cone.castShadow = true;
            tree.add(cone);
          }
          tree.position.set(x, this.ground(x, z), z);
          tree.rotation.y = x * 0.7 + z;
          this.scene.add(tree);
        }
        for (const [x, z] of [
          [2, 6],
          [-5, 2],
          [8, -2],
          [-2, -8],
          [12, 8],
          [-9, -9],
        ] as const) {
          const fern = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 6), leafLight);
          fern.position.set(x, this.ground(x, z) + 0.3, z);
          fern.scale.y = 0.7;
          fern.castShadow = true;
          this.scene.add(fern);
        }
        const rockDark = new THREE.MeshStandardMaterial({
          color: 0x5a4a44,
          roughness: 1,
          flatShading: true,
        });
        const volcano = new THREE.Mesh(new THREE.ConeGeometry(8, 9, 9), rockDark);
        volcano.position.set(0, this.ground(0, -24) + 3.2, -26);
        this.scene.add(volcano);
        const crater = new THREE.Mesh(
          new THREE.CylinderGeometry(2.2, 3.1, 1.2, 9),
          new THREE.MeshStandardMaterial({ color: 0x3a2f2b, roughness: 1 }),
        );
        crater.position.set(0, volcano.position.y + 4.1, -26);
        this.scene.add(crater);
        const smokeMat = new THREE.MeshStandardMaterial({
          color: 0xcfd4d6,
          transparent: true,
          opacity: 0.55,
          roughness: 1,
        });
        for (const [dy, r] of [
          [5.6, 0.9],
          [6.8, 1.3],
          [8.2, 1.7],
        ] as const) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), smokeMat);
          puff.position.set(0.4 * dy - 2.2, volcano.position.y + dy, -26);
          this.scene.add(puff);
        }
      }
    }

    this.buildCamp();
    this.buildMuseum();
    this.buildPlayer();
    for (const pit of this.state.island.pits) this.buildPitSite(pit);
    this.buildBoat();
    this.refreshSites();
  }

  private addHotspot(
    id: string,
    kind: Interactable['kind'],
    position: THREE.Vector3,
    radius: number,
    pit?: PitDef,
  ): void {
    const hotspot = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    hotspot.position.copy(position).add(new THREE.Vector3(0, 0.9, 0));
    this.scene.add(hotspot);
    this.interactables.push({ id, kind, position: position.clone(), hotspot, pit });
  }

  private buildCamp(): void {
    const tentPos = new THREE.Vector3(-2.5, this.ground(-2.5, -3.5), -3.5);
    const tent = new THREE.Group();
    const cloth = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0xe8843c, roughness: 0.9, flatShading: true }),
    );
    cloth.position.y = 1;
    cloth.castShadow = true;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 }),
    );
    pole.position.y = 1.3;
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.16, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1 }),
    );
    bench.position.set(1.6, 0.3, 0.6);
    bench.castShadow = true;
    tent.add(cloth, pole, bench);
    tent.position.copy(tentPos);
    this.scene.add(tent);
    this.addHotspot('tent', 'tent', tentPos, 1.6);

    const hakasePos = new THREE.Vector3(-0.3, this.ground(-0.3, -1.8), -1.8);
    // Codex納品のキャラモデルが登録されていれば差し替え(なければ簡易モデル)
    const hakaseRig = buildCharacter('hakase');
    if (hakaseRig) {
      this.hakaseRig = hakaseRig;
      hakaseRig.group.position.copy(hakasePos);
      hakaseRig.group.rotation.y = 0.6;
      this.scene.add(hakaseRig.group);
    } else {
      const hakase = new THREE.Group();
      const coat = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.6, 4, 10),
        new THREE.MeshStandardMaterial({ color: 0xf2ede4, roughness: 0.9 }),
      );
      coat.position.y = 0.75;
      coat.castShadow = true;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.8 }),
      );
      head.position.y = 1.45;
      const beard = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 1 }),
      );
      beard.position.set(0, 1.3, 0.16);
      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.34, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: 0xc9b458, roughness: 1 }),
      );
      hat.position.y = 1.62;
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.04, 12),
        new THREE.MeshStandardMaterial({ color: 0xc9b458, roughness: 1 }),
      );
      brim.position.y = 1.55;
      hakase.add(coat, head, beard, hat, brim);
      hakase.position.copy(hakasePos);
      hakase.rotation.y = 0.6;
      this.scene.add(hakase);
    }
    this.addHotspot('hakase', 'hakase', hakasePos, 1.4);
  }

  // すなはまから うみへ のびる さんばし + うみに うかぶ ふね。
  // 「ふねで しまを いききできる」が ひとめで つたわるように、ふねは水上・目印は⛵
  private buildBoat(): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6b47, roughness: 0.9 });
    const plankMat = new THREE.MeshStandardMaterial({ color: 0xa8865c, roughness: 1 });
    const pier = new THREE.Group();
    for (let n = 0; n < 10; n++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.52), plankMat);
      plank.position.set(0, 0.42, n * 0.6);
      plank.castShadow = true;
      plank.receiveShadow = true;
      pier.add(plank);
    }
    for (const [sx, pz] of [
      [-1, 0.3],
      [1, 0.3],
      [-1, 2.5],
      [1, 2.5],
      [-1, 5.2],
      [1, 5.2],
    ] as const) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.1, 6), woodMat);
      post.position.set(sx * 0.68, -0.55, pz);
      post.castShadow = true;
      pier.add(post);
    }
    pier.position.set(3.2, 0, 15.4);
    this.scene.add(pier);

    // ふね: 桟橋の さきに、へさきを うみへ むけて 停泊(ぷかぷか ゆれる)
    const boat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x9c6238, roughness: 0.8 });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 3.0, 10), hullMat);
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(0.6, 1, 0.85); // たてに ひらたく(回転後: x=高さ, z=はば)
    hull.position.y = 0.1;
    hull.castShadow = true;
    boat.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 8), hullMat);
    bow.rotation.z = -Math.PI / 2 + 0.3;
    bow.scale.set(0.62, 1, 0.85);
    bow.position.set(1.8, 0.3, 0);
    bow.castShadow = true;
    boat.add(bow);
    const stern = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.95), hullMat);
    stern.position.set(-1.5, 0.28, 0);
    stern.castShadow = true;
    boat.add(stern);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.09, 0.95), plankMat);
    bench.position.set(0.6, 0.34, 0);
    boat.add(bench);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.3, 6), woodMat);
    mast.position.set(-0.4, 1.25, 0);
    mast.castShadow = true;
    boat.add(mast);
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 1, side: THREE.DoubleSide }),
    );
    sail.position.set(0.45, 1.45, 0);
    sail.castShadow = true;
    boat.add(sail);
    const pennant = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0xd94a4a, roughness: 0.9 }),
    );
    pennant.rotation.z = -Math.PI / 2;
    pennant.position.set(-0.16, 2.42, 0);
    boat.add(pennant);
    this.boatBaseY = 0.16;
    boat.position.set(3.2, this.boatBaseY, 22.2);
    boat.rotation.y = -Math.PI / 2; // へさきは おきの ほう
    this.scene.add(boat);
    this.boat = boat;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.05, 6, 26).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
    );
    ring.position.set(3.2, -0.06, 22.2);
    this.scene.add(ring);
    this.waveRing = ring;

    this.addHotspot('boat', 'boat', new THREE.Vector3(3.2, 0.42, 19.6), 2.3);

    const alert = document.createElement('div');
    alert.className = 'site-alert';
    el('alerts').appendChild(alert);
    this.boatAlert = alert;
  }

  private buildMuseum(): void {
    const pos = new THREE.Vector3(6, this.ground(6, 3), 3);
    const museum = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, 3.2), wallMat);
    body.position.y = 1.1;
    body.castShadow = true;
    body.receiveShadow = true;
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xc0563e,
      roughness: 0.9,
      flatShading: true,
    });
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 2.6, 1.4, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.35, 1, 1);
    roof.position.y = 2.9;
    roof.castShadow = true;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x8b6b47, roughness: 0.9 }),
    );
    door.position.set(0, 0.75, 1.62);
    const column1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 8), wallMat);
    column1.position.set(-1.4, 0.95, 1.7);
    const column2 = column1.clone();
    column2.position.x = 1.4;
    const bone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.5 }),
    );
    bone.rotation.z = Math.PI / 2;
    bone.position.set(0, 2.15, 1.65);
    museum.add(body, roof, door, column1, column2, bone);
    museum.position.copy(pos);
    museum.rotation.y = -0.4;
    this.scene.add(museum);
    this.addHotspot('museum', 'museum', pos.clone().add(new THREE.Vector3(0.8, 0, 1.6)), 1.9);
  }

  private buildPlayer(): void {
    // Codex納品のキャラモデルが登録されていれば差し替え(なければ簡易モデル)
    const rig = buildCharacter('player');
    if (rig) {
      this.playerRig = rig;
      this.player.add(rig.group);
    } else {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.5, 4, 10),
        new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.9 }),
      );
      body.position.y = 0.65;
      body.castShadow = true;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.8 }),
      );
      head.position.y = 1.3;
      head.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xd94a4a, roughness: 0.9 }),
      );
      cap.position.y = 1.34;
      const bill = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xd94a4a, roughness: 0.9 }),
      );
      bill.position.set(0, 1.33, 0.3);
      this.player.add(body, head, cap, bill);
    }
    this.player.position.set(0, this.ground(0, 3), 3);
    this.scene.add(this.player);
  }

  private buildPitSite(pit: PitDef): void {
    const [x, z] = pit.pos;
    const base = new THREE.Vector3(x, this.ground(x, z), z);
    const group = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.6 });

    if (pit.clue === 'none') {
      // 完全埋没型: 地表の手がかりは ほぼゼロ(小石が3つだけ)
      const pebbleMat = new THREE.MeshStandardMaterial({
        color: 0xa79a82,
        roughness: 1,
        flatShading: true,
      });
      for (let i = 0; i < 3; i++) {
        const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), pebbleMat);
        pebble.position.set(Math.cos(i * 2.1) * 0.3, 0.05, Math.sin(i * 2.1) * 0.3);
        group.add(pebble);
      }
    } else if (pit.clue === 'bone') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 8), boneMat);
      shaft.rotation.z = 0.9;
      shaft.position.y = 0.28;
      shaft.castShadow = true;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), boneMat);
      knob.position.set(0.42, 0.6, 0);
      group.add(shaft, knob);
    } else if (pit.clue === 'crack') {
      const mat = new THREE.MeshBasicMaterial({ color: 0x6b5a3f });
      for (let i = 0; i < 4; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.9 + i * 0.2, 0.02, 0.08), mat);
        line.position.set((i - 1.5) * 0.2, 0.03 + i * 0.012, (i - 1.5) * 0.25);
        line.rotation.y = i * 1.2 + 0.3;
        group.add(line);
      }
    } else if (pit.clue === 'shell') {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.09, 8, 14, Math.PI * 1.6),
        boneMat,
      );
      coil.rotation.x = -Math.PI / 2 + 0.4;
      coil.position.y = 0.15;
      coil.castShadow = true;
      group.add(coil);
    } else {
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x8a7f6c,
        roughness: 1,
        flatShading: true,
      });
      for (let i = 0; i < 5; i++) {
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.25 + (i % 3) * 0.1, 0),
          rockMat,
        );
        rock.position.set(Math.cos(i * 2.4) * 0.55, 0.15, Math.sin(i * 2.4) * 0.55);
        rock.castShadow = true;
        group.add(rock);
      }
      const chip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), boneMat);
      chip.position.set(0.2, 0.32, 0.1);
      group.add(chip);
    }
    group.position.copy(base);
    this.scene.add(group);
    this.addHotspot(pit.id, 'pit', base, 1.6, pit);

    const alert = document.createElement('div');
    alert.className = 'site-alert';
    el('alerts').appendChild(alert);
    this.alertEls.set(pit.id, alert);
  }

  private plantFlag(pitId: string): void {
    if (this.flags.has(pitId)) return;
    const pit = this.state.island.pits.find((p) => p.id === pitId)!;
    const [x, z] = pit.pos;
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 }),
    );
    pole.position.y = 0.8;
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.35, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xd94a4a, roughness: 0.9 }),
    );
    cloth.position.set(0.3, 1.3, 0);
    flag.add(pole, cloth);
    flag.position.set(x + 0.9, this.ground(x + 0.9, z + 0.6), z + 0.6);
    this.scene.add(flag);
    this.flags.set(pitId, flag);
  }

  private plantDonePatch(pitId: string): void {
    if (this.donePatches.has(pitId)) return;
    const pit = this.state.island.pits.find((p) => p.id === pitId)!;
    const [x, z] = pit.pos;
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 18).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x9c7f57, roughness: 1 }),
    );
    patch.position.set(x, this.ground(x, z) + 0.03, z);
    this.scene.add(patch);
    this.donePatches.set(pitId, patch);
  }

  refreshSites(): void {
    for (const pit of this.state.island.pits) {
      if (this.state.isDiscovered(pit.id)) this.plantFlag(pit.id);
      if (this.state.pitDone(pit.id)) this.plantDonePatch(pit.id);
    }
  }

  siteState(pitId: string): 'hidden' | 'found' | 'done' {
    if (this.state.pitDone(pitId)) return 'done';
    return this.state.isDiscovered(pitId) ? 'found' : 'hidden';
  }

  activate(): void {
    this.controls.enabled = true;
    el('field-ui').classList.remove('hidden');
    this.refreshSites();
  }

  dispose(): void {
    this.controls.dispose();
    this.alertEls.forEach((a) => a.remove());
    this.alertEls.clear();
    this.boatAlert?.remove();
    this.boatAlert = null;
  }

  deactivate(): void {
    this.controls.enabled = false;
    el('field-ui').classList.add('hidden');
    this.alertEls.forEach((a) => (a.style.display = 'none'));
    if (this.boatAlert) this.boatAlert.style.display = 'none';
    this.moveTarget = null;
    this.pendingInteract = null;
  }

  tap(clientX: number, clientY: number, dragOnly = false): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    if (!dragOnly) {
      const hotspots = this.interactables.map((i) => i.hotspot);
      const hitSpot = raycaster.intersectObjects(hotspots, false)[0];
      if (hitSpot) {
        const target = this.interactables.find((i) => i.hotspot === hitSpot.object)!;
        this.moveTarget = target.position.clone();
        this.pendingInteract = target.id;
        return;
      }
    }
    const hitGround = raycaster.intersectObject(this.terrain, false)[0];
    if (!hitGround) return;
    const p = hitGround.point;
    const r = Math.hypot(p.x, p.z);
    if (r > 21) p.multiplyScalar(21 / r);
    p.z = Math.min(p.z, 18.5);
    this.moveTarget = new THREE.Vector3(p.x, 0, p.z);
    this.pendingInteract = null;
  }

  private interact(id: string): void {
    const target = this.interactables.find((i) => i.id === id)!;
    if (target.kind === 'boat') {
      this.cb.onOpenBoat();
      return;
    }
    if (target.kind === 'tent') {
      this.cb.onOpenCraft();
      return;
    }
    if (target.kind === 'hakase') {
      this.cb.onHakase();
      return;
    }
    if (target.kind === 'museum') {
      this.cb.onOpenMuseum();
      return;
    }
    const pit = target.pit!;
    const state = this.siteState(pit.id);
    if (state === 'hidden') {
      this.state.discover(pit.id);
      this.plantFlag(pit.id);
      this.sfx.fanfare();
      this.cb.onDiscover(pit);
    } else if (state === 'found') {
      this.cb.onEnterPit(pit);
    } else {
      // ほりつくした現場も「きねんほり」で 何度でも掘れる(✅の記録は残る)
      this.cb.showMsg('🔁 ほりおわった げんば! きねんに もういちど ほれるぞ');
      this.cb.onEnterPit(pit);
    }
  }

  update(dt: number): void {
    if (this.moveTarget) {
      const pos = this.player.position;
      const dx = this.moveTarget.x - pos.x;
      const dz = this.moveTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.18) {
        const step = Math.min(WALK_SPEED * dt, dist);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        const heading = Math.atan2(dx, dz);
        let delta = heading - this.player.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        this.player.rotation.y += delta * Math.min(1, dt * 10);
        this.playerMoving = true;
        if (!this.playerRig) {
          // 簡易モデルの歩き: 跳ねずに、ごく小さな上下ゆれだけ(歩行アニメは納品モデル側で行う)
          this.walkPhase += dt * 11;
          this.player.position.y =
            this.ground(pos.x, pos.z) + Math.abs(Math.sin(this.walkPhase)) * 0.025;
        } else {
          this.player.position.y = this.ground(pos.x, pos.z);
        }
      } else {
        this.moveTarget = null;
        this.playerMoving = false;
        this.player.position.y = this.ground(pos.x, pos.z);
      }
    } else {
      this.playerMoving = false;
    }
    this.playerRig?.update(dt, this.playerMoving, WALK_SPEED);
    this.hakaseRig?.update(dt, false, 0);

    if (this.pendingInteract) {
      const target = this.interactables.find((i) => i.id === this.pendingInteract)!;
      if (this.player.position.distanceTo(target.position) < INTERACT_RANGE) {
        const id = this.pendingInteract;
        this.pendingInteract = null;
        this.moveTarget = null;
        this.interact(id);
      }
    }

    this.time += dt;
    if (this.boat) {
      this.boat.position.y = this.boatBaseY + Math.sin(this.time * 1.5) * 0.05;
      this.boat.rotation.z = Math.sin(this.time * 1.1) * 0.035;
    }
    if (this.waveRing) {
      const k = (this.time * 0.45) % 1;
      this.waveRing.scale.setScalar(1 + k * 0.3);
      (this.waveRing.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - k);
    }

    this.camTarget.set(
      this.player.position.x,
      this.player.position.y + 1.3,
      this.player.position.z,
    );
    this.controls.target.lerp(this.camTarget, Math.min(1, dt * 6));
    this.controls.update();
    this.updateAlerts();
  }

  private updateAlerts(): void {
    for (const pit of this.state.island.pits) {
      const alert = this.alertEls.get(pit.id)!;
      const state = this.siteState(pit.id);
      const [x, z] = pit.pos;
      const dist = Math.hypot(this.player.position.x - x, this.player.position.z - z);
      // 完全埋没型は 目印が出る範囲が せまい(そばまで来ないと 気づけない)
      const range = pit.clue === 'none' && state === 'hidden' ? 2.6 : ALERT_RANGE;
      if (state === 'done' || dist > range) {
        alert.style.display = 'none';
        continue;
      }
      const p = new THREE.Vector3(x, this.ground(x, z) + 2.4, z).project(this.camera);
      if (p.z > 1) {
        alert.style.display = 'none';
        continue;
      }
      alert.style.display = 'block';
      alert.textContent = state === 'hidden' ? (pit.clue === 'none' ? '❓' : '❗') : '⛏️';
      alert.style.left = `${((p.x + 1) / 2) * this.renderer.domElement.clientWidth}px`;
      alert.style.top = `${((1 - p.y) / 2) * this.renderer.domElement.clientHeight}px`;
    }
    // ⛵ ふねの目じるし: さんばしの上に いつも うかべる(遠すぎるときだけ消す)
    if (this.boatAlert) {
      const dist = Math.hypot(this.player.position.x - 3.2, this.player.position.z - 19);
      const p = new THREE.Vector3(3.2, 2.9, 21.6).project(this.camera);
      if (dist > 17 || p.z > 1) {
        this.boatAlert.style.display = 'none';
      } else {
        this.boatAlert.style.display = 'block';
        this.boatAlert.textContent = '⛵';
        this.boatAlert.style.left = `${((p.x + 1) / 2) * this.renderer.domElement.clientWidth}px`;
        this.boatAlert.style.top = `${((1 - p.y) / 2) * this.renderer.domElement.clientHeight}px`;
      }
    }
  }

  // スモークテスト用
  playerPos(): [number, number, number] {
    return this.player.position.toArray() as [number, number, number];
  }
  teleport(x: number, z: number): void {
    this.player.position.set(x, this.ground(x, z), z);
    this.moveTarget = null;
  }
  forceInteract(id: string): void {
    this.interact(id);
  }
}
