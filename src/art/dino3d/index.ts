import { buildSpinosaurus, type DinoViews } from './spinosaurus';
import { buildTyrannosaurus } from './tyrannosaurus';

// 展示モデルのレジストリ。種を追加したら builder を1行足す(未登録の種は2D表示のまま)
const BUILDERS: Record<string, () => DinoViews> = {
  spinosaurus: buildSpinosaurus,
  tyrannosaurus: buildTyrannosaurus,
};

export type { DinoViews };
export const hasDinoModel = (speciesId: string): boolean => speciesId in BUILDERS;
export const buildDinoModel = (speciesId: string): DinoViews | null =>
  BUILDERS[speciesId]?.() ?? null;
