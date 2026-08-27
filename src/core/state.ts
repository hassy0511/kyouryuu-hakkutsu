import speciesJson from '../data/species.json';
import gameJson from '../data/game.json';
import storyJson from '../data/story.json';

// ---- データ型(JSON 駆動) -----------------------------------------------------

export interface BoneDef {
  id: string;
  nameJa: string;
  feature: string;
}
export interface SpeciesDef {
  id: string;
  nameJa: string;
  emoji: string;
  era: string;
  diet: string;
  lengthM: number;
  lengthNote: string;
  featureBone: string;
  funFact: string;
  learn: string;
  bones: BoneDef[];
  hidden?: boolean;
  island?: string;
  art?: { skeleton?: string; living?: string };
}
export interface EraDef {
  id: string;
  nameJa: string;
  yearsAgo: string;
  desc: string;
  learn: string;
}
export interface KnowledgeDef {
  id: string;
  title: string;
  body: string;
}
export interface FossilDef {
  speciesId: string;
  boneId: string;
  kind: string;
  layer: number;
  cells: [number, number][];
  /** もろい化石(たまご・かぎづめ等): 1回でもピッケルが当たると★1になる */
  fragile?: boolean;
  /** 「この層にこの骨はおかしい」イベント: 露出時にはかせが違和感を指摘し、深部を示唆する */
  anomaly?: boolean;
}
export interface GateDef {
  cells: [number, number, number][];
  look: string;
  needs: string;
}
export interface PitDef {
  id: string;
  nameJa: string;
  pos: [number, number];
  clue: 'bone' | 'crack' | 'rubble' | 'shell' | 'none';
  /** 掘る向き。'wall' は崖を横から掘る壁面発掘(省略時は 'floor') */
  dig?: 'floor' | 'wall';
  discoverText: string;
  fossils: FossilDef[];
  rocks: [number, number, number][];
  crystals: [number, number, number][];
  branches: [number, number, number][];
  ores: [number, number, number][];
  gates: GateDef[];
  islandId: string;
}
export interface IslandDef {
  id: string;
  nameJa: string;
  emoji: string;
  order: number;
  unlock?: string;
  pits: PitDef[];
}

export const SPECIES = speciesJson.species as SpeciesDef[];
export const ERAS = speciesJson.eras as EraDef[];
export const KNOWLEDGE = speciesJson.knowledge as KnowledgeDef[];
export const RECIPES = gameJson.recipes as {
  repair: { wood: number; stone: number };
  upgrade: { wood: number; iron: number; crystal: number };
  upgrade2: { wood: number; iron: number; crystal: number };
  pump: { wood: number; iron: number; crystal: number };
  lamp: { wood: number; stone: number; crystal: number };
  chisel: { wood: number; iron: number; stone: number };
  sieve: { wood: number; stone: number; iron: number };
  firestone: { stone: number; iron: number; crystal: number };
};
export const PICK_MAX_HP = gameJson.pickMaxHp as number;
export const GATE_LOOKS = gameJson.gateLooks as Record<string, { nameJa: string; color: string }>;
export const NEED_LABELS = gameJson.needLabels as Record<string, string>;
export const STORY = storyJson;

// 島パック: src/data/islands/*.json を置くだけで島が増える(柱6)
const islandModules = import.meta.glob('../data/islands/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;
export const ISLANDS: IslandDef[] = Object.values(islandModules)
  .map((m) => m.default as IslandDef)
  .sort((a, b) => a.order - b.order);
for (const island of ISLANDS) {
  for (const pit of island.pits) {
    pit.islandId = island.id;
    pit.gates ??= [];
  }
}
export const ALL_PITS: PitDef[] = ISLANDS.flatMap((i) => i.pits);
export const islandById = (id: string): IslandDef => ISLANDS.find((i) => i.id === id)!;
export const pitById = (id: string): PitDef => ALL_PITS.find((p) => p.id === id)!;

export const boneKey = (speciesId: string, boneId: string): string => `${speciesId}:${boneId}`;
export const speciesById = (id: string): SpeciesDef => SPECIES.find((s) => s.id === id)!;

// ---- セーブ(localStorage・バージョン付き) ------------------------------------

export const SAVE_KEY = 'honehori-save';
const SAVE_VERSION = 2;

export interface FossilCellSave {
  status: 'hidden' | 'crusted' | 'clean';
  progress: number;
}
export interface FossilSave {
  damage: number;
  collected: boolean;
  cells: FossilCellSave[];
}
export interface PitSave {
  removed: number[];
  hardHits: [number, number][];
  fossils: Record<string, FossilSave>;
  rocks: number[][];
  crystalsTaken: number[];
  branchesTaken: number[];
}

export interface MarkSave {
  pitId: string;
  islandId: string;
  look: string;
  needs: string;
}
interface IslandSave {
  discovered: string[];
  pits: Record<string, PitSave>;
}
interface SaveData {
  version: number;
  inv: { wood: number; stone: number; crystal: number; iron: number };
  tool: { level: number; hp: number; broken: boolean };
  fossilStars: Record<string, number>;
  restored: Record<string, number>;
  currentIsland: string;
  islands: Record<string, IslandSave>;
  marks: Record<string, MarkSave>;
  flags: Record<string, boolean>;
  hintIndex: number;
}

function defaults(): SaveData {
  return {
    version: SAVE_VERSION,
    inv: { wood: 0, stone: 0, crystal: 0, iron: 0 },
    tool: { level: 1, hp: PICK_MAX_HP, broken: false },
    fossilStars: {},
    restored: {},
    currentIsland: 'k1',
    islands: {},
    marks: {},
    flags: {},
    hintIndex: 0,
  };
}

// v1 セーブ(単一島時代)を v2 に包む
function migrate(parsed: Record<string, unknown>): SaveData {
  if (parsed.version === 1) {
    const legacy = parsed as { discovered?: string[]; pits?: Record<string, PitSave> };
    parsed.version = 2;
    parsed.currentIsland = 'k1';
    parsed.islands = { k1: { discovered: legacy.discovered ?? [], pits: legacy.pits ?? {} } };
  }
  return parsed as unknown as SaveData;
}

export class GameState {
  data: SaveData = defaults();
  onChange: (() => void) | null = null;

  constructor(private readonly key: string = SAVE_KEY) {}

  static hasSave(key: string = SAVE_KEY): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const parsed = migrate(JSON.parse(raw) as Record<string, unknown>);
      if (parsed.version !== SAVE_VERSION) return false;
      const base = defaults();
      this.data = {
        ...base,
        ...parsed,
        inv: { ...base.inv, ...parsed.inv },
        tool: { ...base.tool, ...parsed.tool },
        islands: parsed.islands ?? {},
        marks: parsed.marks ?? {},
      };
      return true;
    } catch {
      return false;
    }
  }

  save(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch {
      // プライベートブラウズ等で失敗しても遊びは続行できる
    }
  }

  reset(): void {
    this.data = defaults();
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* noop */
    }
  }

  private changed(): void {
    this.onChange?.();
    this.save();
  }

  // ---- 化石 ----
  collectBone(speciesId: string, boneId: string, stars: number): void {
    const key = boneKey(speciesId, boneId);
    this.data.fossilStars[key] = Math.max(this.data.fossilStars[key] ?? 0, stars);
    this.changed();
  }
  hasBone(speciesId: string, boneId: string): boolean {
    return boneKey(speciesId, boneId) in this.data.fossilStars;
  }
  boneStars(speciesId: string, boneId: string): number {
    return this.data.fossilStars[boneKey(speciesId, boneId)] ?? 0;
  }
  collectedCount(speciesId: string): number {
    return speciesById(speciesId).bones.filter((b) => this.hasBone(speciesId, b.id)).length;
  }
  speciesComplete(speciesId: string): boolean {
    return this.collectedCount(speciesId) === speciesById(speciesId).bones.length;
  }
  isRestored(speciesId: string): boolean {
    return speciesId in this.data.restored;
  }
  restore(speciesId: string): number {
    const species = speciesById(speciesId);
    const stars = Math.min(...species.bones.map((b) => this.boneStars(speciesId, b.id)));
    this.data.restored[speciesId] = stars;
    this.changed();
    return stars;
  }
  islandUnlocked(islandId: string): boolean {
    const unlock = islandById(islandId).unlock;
    return !unlock || this.flag(unlock);
  }
  // 隠し種・未解禁の島の種は「存在しない」扱い(図鑑・分母・コンプ判定に入れない)
  isSpeciesVisible(speciesId: string): boolean {
    const sp = speciesById(speciesId);
    if (this.collectedCount(speciesId) > 0 || this.isRestored(speciesId)) return true;
    return !sp.hidden && this.islandUnlocked(sp.island ?? 'k1');
  }
  // 章のクリア判定は島単位(第1章の開館式は k1 の種だけを見る)
  allRestored(islandId = 'k1'): boolean {
    return SPECIES.filter((s) => !s.hidden && (s.island ?? 'k1') === islandId).every((s) =>
      this.isRestored(s.id),
    );
  }
  totalBonesCollected(): number {
    return Object.keys(this.data.fossilStars).length;
  }
  totalBones(): number {
    return SPECIES.filter((s) => this.isSpeciesVisible(s.id)).reduce(
      (sum, s) => sum + s.bones.length,
      0,
    );
  }

  // ---- 道具・素材 ----
  get inv(): SaveData['inv'] {
    return this.data.inv;
  }
  get tool(): SaveData['tool'] {
    return this.data.tool;
  }
  addMaterial(kind: 'wood' | 'stone' | 'crystal' | 'iron', amount = 1): void {
    this.data.inv[kind] += amount;
    this.changed();
  }
  wearPick(amount = 1): void {
    if (this.data.tool.broken) return;
    this.data.tool.hp = Math.max(0, this.data.tool.hp - amount);
    if (this.data.tool.hp === 0) this.data.tool.broken = true;
    this.changed();
  }
  canAfford(cost: { wood?: number; stone?: number; crystal?: number; iron?: number }): boolean {
    return (
      this.data.inv.wood >= (cost.wood ?? 0) &&
      this.data.inv.stone >= (cost.stone ?? 0) &&
      this.data.inv.crystal >= (cost.crystal ?? 0) &&
      this.data.inv.iron >= (cost.iron ?? 0)
    );
  }
  spend(cost: { wood?: number; stone?: number; crystal?: number; iron?: number }): void {
    this.data.inv.wood -= cost.wood ?? 0;
    this.data.inv.stone -= cost.stone ?? 0;
    this.data.inv.crystal -= cost.crystal ?? 0;
    this.data.inv.iron -= cost.iron ?? 0;
    this.changed();
  }
  repairPick(): void {
    this.data.tool.hp = PICK_MAX_HP;
    this.data.tool.broken = false;
    this.changed();
  }
  setPickLevel(level: number): void {
    this.data.tool.level = level;
    this.repairPick();
  }
  upgradePick(): void {
    this.setPickLevel(2);
  }

  // ---- 島・ピット・進行 ----
  get island(): IslandDef {
    return islandById(this.data.currentIsland);
  }
  travel(islandId: string): void {
    this.data.currentIsland = islandId;
    this.setFlag(`visited:${islandId}`);
    this.changed();
  }
  private islandSave(id = this.data.currentIsland): IslandSave {
    return (this.data.islands[id] ??= { discovered: [], pits: {} });
  }
  isDiscovered(pitId: string): boolean {
    return this.islandSave().discovered.includes(pitId);
  }
  discover(pitId: string): void {
    if (!this.isDiscovered(pitId)) {
      this.islandSave().discovered.push(pitId);
      this.changed();
    }
  }
  pitSave(pitId: string): PitSave | undefined {
    return this.islandSave().pits[pitId];
  }
  storePit(pitId: string, save: PitSave): void {
    this.islandSave().pits[pitId] = save;
    this.changed();
  }
  pitDone(pitId: string): boolean {
    // 化石のない現場(素材キャッシュ型)は「ほりつくした」にならない
    const pit = pitById(pitId);
    return pit.fossils.length > 0 && pit.fossils.every((f) => this.hasBone(f.speciesId, f.boneId));
  }

  // ---- 封印ゲートと「きになるリスト」 ----
  meetsNeed(needs: string): boolean {
    const pick = /^pick(\d)$/.exec(needs);
    if (pick) return this.data.tool.level >= Number(pick[1]);
    return this.flag(`item:${needs}`);
  }
  recordMark(pit: PitDef, gate: GateDef): boolean {
    const key = `${pit.id}:${gate.look}`;
    if (this.data.marks[key]) return false;
    this.data.marks[key] = {
      pitId: pit.id,
      islandId: pit.islandId,
      look: gate.look,
      needs: gate.needs,
    };
    this.changed();
    return true;
  }
  markList(): MarkSave[] {
    return Object.values(this.data.marks);
  }
  openableMarks(): MarkSave[] {
    return this.markList().filter((m) => this.meetsNeed(m.needs));
  }

  flag(name: string): boolean {
    return this.data.flags[name] === true;
  }
  setFlag(name: string): void {
    if (!this.data.flags[name]) {
      this.data.flags[name] = true;
      this.changed();
    }
  }
  nextHint(hints: string[]): string {
    const hint = hints[this.data.hintIndex % hints.length]!;
    this.data.hintIndex++;
    this.save();
    return hint;
  }
}
