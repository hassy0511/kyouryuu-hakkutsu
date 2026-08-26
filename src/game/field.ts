import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sfx } from '../core/audio';
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
  return dunes * (1 - beachFlat) * (1 - THREE.MathUtils.smoothstep(r, 19, 23)) + rim;
}

// 島ごとの見た目(地形の色・空・海・植生)。形の共通部は当面共有し、雰囲気で差別化する
interface IslandLook {
  sky: number;
  sea: number;
  terrain: number;
  terrainAmp: number;
  jungle: boolean;
  shore: boolean;
}
const ISLAND_LOOKS: Record<string, IslandLook> = {
  k1: {
    sky: 0x9ed4ef,
    sea: 0x5fb4e0,
    terrain: 0xd8c28e,
    terrainAmp: 1,
    jungle: false,
    shore: false,
  },
  k2: {
    sky: 0x8fc9d8,
    sea: 0x3f92a8,
    terrain: 0x86a45e,
    terrainAmp: 1.35,
    jungle: true,
    shore: false,
  },
  k3: {
    sky: 0xaadff0,
    sea: 0x2f9ec4,
    terrain: 0xe8d9a8,
    terrainAmp: 0.8,
    jungle: false,
    shore: true,
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
    this.addHotspot('hakase', 'hakase', hakasePos, 1.4);
  }

  private buildBoat(): void {
    const pos = new THREE.Vector3(3.2, 0.05, 17.2);
    const boat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.8 });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 2.4, 8), hullMat);
    hull.rotation.z = Math.PI / 2;
    hull.scale.y = 0.55;
    hull.position.y = 0.25;
    hull.castShadow = true;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), hullMat);
    mast.position.y = 1.0;
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xfff6e0,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), sailMat);
    sail.position.set(0.05, 1.05, 0);
    sail.rotation.y = Math.PI / 2;
    boat.add(hull, mast, sail);
    boat.position.copy(pos);
    boat.rotation.y = -0.5;
    this.scene.add(boat);
    this.addHotspot('boat', 'boat', pos, 1.7);
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
  }

  deactivate(): void {
    this.controls.enabled = false;
    el('field-ui').classList.add('hidden');
    this.alertEls.forEach((a) => (a.style.display = 'none'));
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
        this.walkPhase += dt * 11;
        this.player.position.y =
          this.ground(pos.x, pos.z) + Math.abs(Math.sin(this.walkPhase)) * 0.08;
      } else {
        this.moveTarget = null;
        this.player.position.y = this.ground(pos.x, pos.z);
      }
    }

    if (this.pendingInteract) {
      const target = this.interactables.find((i) => i.id === this.pendingInteract)!;
      if (this.player.position.distanceTo(target.position) < INTERACT_RANGE) {
        const id = this.pendingInteract;
        this.pendingInteract = null;
        this.moveTarget = null;
        this.interact(id);
      }
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
