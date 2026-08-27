import { buildAmmonite } from './ammonite';
import { buildAllosaurus } from './allosaurus';
import { buildAnkylosaurus } from './ankylosaurus';
import { buildArchelon } from './archelon';
import { buildBelemnite } from './belemnite';
import { buildBrachiosaurus } from './brachiosaurus';
import { buildCarnotaurus } from './carnotaurus';
import { buildIguanodon } from './iguanodon';
import { buildIchthyosaurus } from './ichthyosaurus';
import { buildMosasaurus } from './mosasaurus';
import { buildPlesiosaurus } from './plesiosaurus';
import { buildPachycephalosaurus } from './pachycephalosaurus';
import { buildParasaurolophus } from './parasaurolophus';
import { buildPteranodon } from './pteranodon';
import { buildQuetzalcoatlus } from './quetzalcoatlus';
import { buildRhamphorhynchus } from './rhamphorhynchus';
import { buildSpinosaurus, type DinoViews } from './spinosaurus';
import { buildStegosaurus } from './stegosaurus';
import { buildStyracosaurus } from './styracosaurus';
import { buildTriceratops } from './triceratops';
import { buildTyrannosaurus } from './tyrannosaurus';
import { buildVelociraptor } from './velociraptor';

// 展示モデルのレジストリ。種を追加したら builder を1行足す(未登録の種は2D表示のまま)
const BUILDERS: Record<string, () => DinoViews> = {
  allosaurus: buildAllosaurus,
  ankylosaurus: buildAnkylosaurus,
  archelon: buildArchelon,
  belemnite: buildBelemnite,
  ammonite: buildAmmonite,
  brachiosaurus: buildBrachiosaurus,
  carnotaurus: buildCarnotaurus,
  iguanodon: buildIguanodon,
  ichthyosaurus: buildIchthyosaurus,
  mosasaurus: buildMosasaurus,
  plesiosaurus: buildPlesiosaurus,
  pachycephalosaurus: buildPachycephalosaurus,
  parasaurolophus: buildParasaurolophus,
  pteranodon: buildPteranodon,
  quetzalcoatlus: buildQuetzalcoatlus,
  rhamphorhynchus: buildRhamphorhynchus,
  spinosaurus: buildSpinosaurus,
  stegosaurus: buildStegosaurus,
  styracosaurus: buildStyracosaurus,
  triceratops: buildTriceratops,
  tyrannosaurus: buildTyrannosaurus,
  velociraptor: buildVelociraptor,
};

export type { DinoViews };
export const hasDinoModel = (speciesId: string): boolean => speciesId in BUILDERS;
export const buildDinoModel = (speciesId: string): DinoViews | null =>
  BUILDERS[speciesId]?.() ?? null;
