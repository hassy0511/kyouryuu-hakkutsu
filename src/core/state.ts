import speciesJson from '../data/species.json';
import pitsJson from '../data/pits.json';
import storyJson from '../data/story.json';

// ---- データ型(JSON 駆動) -----------------------------------------------------

export interface BoneDef {
  id: string;
  nameJa: string;
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
  kind: 'long' | 'blob' | 'ammonite';
  layer: number;
  cells: [number, number][];
}
export interface PitDef {
  id: string;
  nameJa: string;
  pos: [number, number];
  clue: 'bone' | 'crack' | 'rubble' | 'shell';
  discoverText: string;
  fossils: FossilDef[];
  rocks: [number, number, number][];
  crystals: [number, number, number][];
  branches: [number, number, number][];
  ores: [number, number, number][];
  bedrock: [number, number, number][];
}

export const SPECIES = speciesJson.species as SpeciesDef[];
export const ERAS = speciesJson.eras as EraDef[];
export const KNOWLEDGE = speciesJson.knowledge as KnowledgeDef[];
export const PITS = pitsJson.pits as PitDef[];
export const RECIPES = pitsJson.recipes as {
  repair: { wood: number; stone: number };
  upgrade: { wood: number; iron: number; crystal: number };
};
export const PICK_MAX_HP = pitsJson.pickMaxHp as number;
export const STORY = storyJson;

export const boneKey = (speciesId: string, boneId: string): string => `${speciesId}:${boneId}`;
export const speciesById = (id: string): SpeciesDef => SPECIES.find((s) => s.id === id)!;

// ---- セーブ(localStorage・バージョン付き) ------------------------------------

const SAVE_KEY = 'honehori-save';
const SAVE_VERSION = 1;

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

interface SaveData {
  version: number;
  inv: { wood: number; stone: number; crystal: number; iron: number };
  tool: { level: number; hp: number; broken: boolean };
  fossilStars: Record<string, number>;
  restored: Record<string, number>;
  discovered: string[];
  pits: Record<string, PitSave>;
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
    discovered: [],
    pits: {},
    flags: {},
    hintIndex: 0,
  };
}

export class GameState {
  data: SaveData = defaults();
  onChange: (() => void) | null = null;

  static hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== SAVE_VERSION) return false; // 将来ここでマイグレーション
      const base = defaults();
      this.data = {
        ...base,
        ...parsed,
        inv: { ...base.inv, ...parsed.inv },
        tool: { ...base.tool, ...parsed.tool },
      };
      return true;
    } catch {
      return false;
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // プライベートブラウズ等で失敗しても遊びは続行できる
    }
  }

  reset(): void {
    this.data = defaults();
    try {
      localStorage.removeItem(SAVE_KEY);
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
  allRestored(): boolean {
    return SPECIES.every((s) => this.isRestored(s.id));
  }
  totalBonesCollected(): number {
    return Object.keys(this.data.fossilStars).length;
  }
  totalBones(): number {
    return SPECIES.reduce((sum, s) => sum + s.bones.length, 0);
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
  upgradePick(): void {
    this.data.tool.level = 2;
    this.repairPick();
  }

  // ---- ピット・進行 ----
  isDiscovered(pitId: string): boolean {
    return this.data.discovered.includes(pitId);
  }
  discover(pitId: string): void {
    if (!this.isDiscovered(pitId)) {
      this.data.discovered.push(pitId);
      this.changed();
    }
  }
  pitSave(pitId: string): PitSave | undefined {
    return this.data.pits[pitId];
  }
  storePit(pitId: string, save: PitSave): void {
    this.data.pits[pitId] = save;
    this.changed();
  }
  pitDone(pitId: string): boolean {
    const pit = PITS.find((p) => p.id === pitId)!;
    return pit.fossils.every((f) => this.hasBone(f.speciesId, f.boneId));
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
