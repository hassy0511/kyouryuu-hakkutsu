import { buildAmmonite } from './ammonite';
import { buildAllosaurus } from './allosaurus';
import { buildAnomalocaris } from './anomalocaris';
import { buildAnkylosaurus } from './ankylosaurus';
import { buildArchelon } from './archelon';
import { buildBelemnite } from './belemnite';
import { buildBrachiosaurus } from './brachiosaurus';
import { buildCarnotaurus } from './carnotaurus';
import { buildCoelophysis } from './coelophysis';
import { buildDimetrodon } from './dimetrodon';
import { buildDunkleosteus } from './dunkleosteus';
import { buildEoraptor } from './eoraptor';
import { buildEurypterus } from './eurypterus';
import { buildFutabasuzukiryu } from './futabasuzukiryu';
import { buildFukuiraptor } from './fukuiraptor';
import { buildFukuisaurus } from './fukuisaurus';
import { buildGlyptodon } from './glyptodon';
import { buildHerrerasaurus } from './herrerasaurus';
import { buildIguanodon } from './iguanodon';
import { buildIchthyosaurus } from './ichthyosaurus';
import { buildKamuysaurus } from './kamuysaurus';
import { buildMammoth } from './mammoth';
import { buildMegatherium } from './megatherium';
import { buildMosasaurus } from './mosasaurus';
import { buildMicroraptor } from './microraptor';
import { buildOviraptor } from './oviraptor';
import { buildOpabinia } from './opabinia';
import { buildPlesiosaurus } from './plesiosaurus';
import { buildPlateosaurus } from './plateosaurus';
import { buildPachycephalosaurus } from './pachycephalosaurus';
import { buildParasaurolophus } from './parasaurolophus';
import { buildPteranodon } from './pteranodon';
import { buildQuetzalcoatlus } from './quetzalcoatlus';
import { buildRhamphorhynchus } from './rhamphorhynchus';
import { buildSpinosaurus, type DinoViews } from './spinosaurus';
import { buildSmilodon } from './smilodon';
import { buildStegosaurus } from './stegosaurus';
import { buildStyracosaurus } from './styracosaurus';
import { buildTriceratops } from './triceratops';
import { buildTrilobite } from './trilobite';
import { buildTyrannosaurus } from './tyrannosaurus';
import { buildVelociraptor } from './velociraptor';
import { buildWoollyRhino } from './woollyrhino';
import { buildTherizinosaurus } from './therizinosaurus';

// 展示モデルのレジストリ。種を追加したら builder を1行足す(未登録の種は2D表示のまま)
const BUILDERS: Record<string, () => DinoViews> = {
  allosaurus: buildAllosaurus,
  anomalocaris: buildAnomalocaris,
  ankylosaurus: buildAnkylosaurus,
  archelon: buildArchelon,
  belemnite: buildBelemnite,
  ammonite: buildAmmonite,
  brachiosaurus: buildBrachiosaurus,
  carnotaurus: buildCarnotaurus,
  coelophysis: buildCoelophysis,
  dimetrodon: buildDimetrodon,
  dunkleosteus: buildDunkleosteus,
  eoraptor: buildEoraptor,
  eurypterus: buildEurypterus,
  futabasuzukiryu: buildFutabasuzukiryu,
  fukuiraptor: buildFukuiraptor,
  fukuisaurus: buildFukuisaurus,
  glyptodon: buildGlyptodon,
  herrerasaurus: buildHerrerasaurus,
  iguanodon: buildIguanodon,
  ichthyosaurus: buildIchthyosaurus,
  kamuysaurus: buildKamuysaurus,
  mammoth: buildMammoth,
  megatherium: buildMegatherium,
  mosasaurus: buildMosasaurus,
  microraptor: buildMicroraptor,
  oviraptor: buildOviraptor,
  opabinia: buildOpabinia,
  plesiosaurus: buildPlesiosaurus,
  plateosaurus: buildPlateosaurus,
  pachycephalosaurus: buildPachycephalosaurus,
  parasaurolophus: buildParasaurolophus,
  pteranodon: buildPteranodon,
  quetzalcoatlus: buildQuetzalcoatlus,
  rhamphorhynchus: buildRhamphorhynchus,
  spinosaurus: buildSpinosaurus,
  smilodon: buildSmilodon,
  stegosaurus: buildStegosaurus,
  styracosaurus: buildStyracosaurus,
  triceratops: buildTriceratops,
  trilobite: buildTrilobite,
  tyrannosaurus: buildTyrannosaurus,
  velociraptor: buildVelociraptor,
  woollyrhino: buildWoollyRhino,
  therizinosaurus: buildTherizinosaurus,
};

export type { DinoViews };
export const hasDinoModel = (speciesId: string): boolean => speciesId in BUILDERS;
export const buildDinoModel = (speciesId: string): DinoViews | null =>
  BUILDERS[speciesId]?.() ?? null;
