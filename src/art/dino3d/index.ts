import { buildAmmonite } from './ammonite';
import { buildAllosaurus } from './allosaurus';
import { buildBrachiosaurus } from './brachiosaurus';
import { buildIguanodon } from './iguanodon';
import { buildSpinosaurus, type DinoViews } from './spinosaurus';
import { buildStegosaurus } from './stegosaurus';
import { buildTriceratops } from './triceratops';
import { buildTyrannosaurus } from './tyrannosaurus';

// 展示モデルのレジストリ。種を追加したら builder を1行足す(未登録の種は2D表示のまま)
const BUILDERS: Record<string, () => DinoViews> = {
  allosaurus: buildAllosaurus,
  ammonite: buildAmmonite,
  brachiosaurus: buildBrachiosaurus,
  iguanodon: buildIguanodon,
  spinosaurus: buildSpinosaurus,
  stegosaurus: buildStegosaurus,
  triceratops: buildTriceratops,
  tyrannosaurus: buildTyrannosaurus,
};

export type { DinoViews };
export const hasDinoModel = (speciesId: string): boolean => speciesId in BUILDERS;
export const buildDinoModel = (speciesId: string): DinoViews | null =>
  BUILDERS[speciesId]?.() ?? null;
