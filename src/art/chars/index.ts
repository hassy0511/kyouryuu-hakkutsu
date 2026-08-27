import type * as THREE from 'three';
import { buildPlayerCharacter } from './player';

// キャラクター(たんけんたいの子・かせきはかせ)のレジストリ。
// Codex が builder を納品して1行登録すると、フィールドの簡易モデルと自動で差し替わる。
// (恐竜モデルの src/art/dino3d/index.ts と同じ方式)

export interface CharacterRig {
  /** 足もとが原点(y=0=接地)・顔は +Z(進行方向)・scale 1 = 実寸(m) */
  group: THREE.Group;
  /**
   * 毎フレーム呼ばれる。歩行サイクル・待機のゆれは この中で行う。
   * @param dt 経過秒
   * @param moving 歩行中か
   * @param speed 歩行速度(m/s)。歩幅と足の回転の同期に使う
   */
  update(dt: number, moving: boolean, speed: number): void;
}

export type CharacterBuilder = () => CharacterRig;

const BUILDERS: Partial<Record<'player' | 'hakase', CharacterBuilder>> = {
  player: buildPlayerCharacter,
  // hakase: buildHakaseCharacter,
};

export const hasCharacter = (id: 'player' | 'hakase'): boolean => id in BUILDERS;
export const buildCharacter = (id: 'player' | 'hakase'): CharacterRig | null =>
  BUILDERS[id]?.() ?? null;
