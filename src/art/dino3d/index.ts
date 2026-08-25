import { buildAmmonite } from './ammonite';
import { buildIguanodon } from './iguanodon';
import { buildSpinosaurus, type DinoViews } from './spinosaurus';
import { buildTriceratops } from './triceratops';
import { buildTyrannosaurus } from './tyrannosaurus';

// 展示モデルのレジストリ。種を追加したら builder を1行足す(未登録の種は2D表示のまま)
const BUILDERS: Record<string, () => DinoViews> = {
  ammonite: buildAmmonite,
  iguanodon: buildIguanodon,
  spinosaurus: buildSpinosaurus,
  triceratops: buildTriceratops,
  tyrannosaurus: buildTyrannosaurus,
};

export type { DinoViews };
export const hasDinoModel = (speciesId: string): boolean => speciesId in BUILDERS;
export const buildDinoModel = (speciesId: string): DinoViews | null =>
  BUILDERS[speciesId]?.() ?? null;
