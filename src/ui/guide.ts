import {
  GATE_LOOKS,
  GameState,
  NEED_LABELS,
  RECIPES,
  SPECIES,
  TOOL_ISLANDS,
  TOOL_KINDS,
  boneSite,
  islandById,
  speciesById,
  type GateDef,
  type PitDef,
  type SpeciesDef,
} from '../core/state';

// 「つぎに なにを すれば いいか」の案内文。島データ・レシピから組み立て、
// 封印メッセージ・きになるリスト・はかせ・博物館カードで 同じ文を使う

const MAT = { wood: '🪵', stone: '🪨', iron: '🔩', crystal: '💎' } as const;
type Cost = Partial<Record<keyof typeof MAT, number>>;

export const costLabel = (cost: Cost): string =>
  (Object.keys(MAT) as (keyof typeof MAT)[])
    .filter((k) => (cost[k] ?? 0) > 0)
    .map((k) => `${MAT[k]}${cost[k]}`)
    .join(' ');

/** 封印をあける どうぐを「どこで 手に入れるか」(1行) */
export function needSourceLine(state: GameState, needs: string): string {
  if (needs === 'pick2') {
    return `⛺テントで「がんじょうピッケル」を つくろう（${costLabel(RECIPES.upgrade)}）`;
  }
  if (needs === 'pick3') {
    return state.flag('visited:k2')
      ? `⛺テントで「くろがねの ピッケル」を つくろう（${costLabel(RECIPES.upgrade2)}）`
      : 'つぎの しまの くろい いしで つくる ピッケルが いる';
  }
  const label = NEED_LABELS[needs] ?? needs;
  const kind = TOOL_KINDS.find((k) => k === needs);
  if (!kind) return `${label}が いる`;
  const islandId = TOOL_ISLANDS[kind];
  if (state.flag(`visited:${islandId}`)) {
    const ready = state.canAfford(RECIPES[kind]) ? ' ざいりょうは そろっとる!' : '';
    return `${label}は ⛺テントで つくれる（${costLabel(RECIPES[kind])}）${ready}`;
  }
  if (state.islandUnlocked(islandId)) {
    return `${label}は ⛵${islandById(islandId).nameJa}の テントで つくれる`;
  }
  return `${label}は もっと さきの しまで つくれる。ここは あとで もどって くれば よいぞ`;
}

/** 化石のない現場・かくし種だけの現場は「おまけ」。章を すすめるのに 必要ない */
export const pitIsBonus = (pit: PitDef): boolean =>
  pit.fossils.length === 0 || pit.fossils.every((f) => speciesById(f.speciesId).hidden === true);

/** その現場で まだ あけられない 封印 */
export const lockedGate = (state: GameState, pit: PitDef): GateDef | undefined =>
  pit.gates.find((g) => !state.meetsNeed(g.needs));

/**
 * のこりの ホネが「この島を さがしても 見つからない」とき(べつの島 or 封印の おく)だけ、
 * 場所と どうぐを おしえる。この島で ふつうに さがせるときは null(さがす たのしみは のこす)
 */
export function missingBonesHint(state: GameState, sp: SpeciesDef): string | null {
  const missing = sp.bones.filter((b) => !state.hasBone(sp.id, b.id));
  if (missing.length === 0) return null;
  const here = state.data.currentIsland;
  const sites = missing
    .map((b) => boneSite(sp.id, b.id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
  if (sites.length !== missing.length) return null;
  const blocked = sites.filter((s) => s.island.id !== here || lockedGate(state, s.pit));
  if (blocked.length !== sites.length) return null;
  const s = blocked[0]!;
  const gate = lockedGate(state, s.pit);
  const where =
    s.island.id !== here ? `⛵${s.island.nameJa}の「${s.pit.nameJa}」` : `「${s.pit.nameJa}」`;
  const gateNote = gate
    ? `。${GATE_LOOKS[gate.look]?.nameJa ?? gate.look}の おくじゃから ${NEED_LABELS[gate.needs] ?? gate.needs}が いる`
    : '';
  return `のこりの ホネは ${where}に ねむっとるらしい${gateNote}`;
}

/**
 * はかせの「つぎは これじゃ」。いまの島の 未復元の種のうち、ほりはじめた種(または 最後の1種)で
 * 手づまりに なりそうな ものを 1つ えらぶ。なければ null(いつもの ヒントに まかせる)
 */
export function chapterGuide(state: GameState): string[] | null {
  const here = state.data.currentIsland;
  const candidates = SPECIES.filter(
    (sp) => !sp.hidden && (sp.island ?? 'k1') === here && !state.isRestored(sp.id),
  ).sort((a, b) => state.collectedCount(b.id) - state.collectedCount(a.id));
  for (const sp of candidates) {
    const started = state.collectedCount(sp.id) > 0 || candidates.length === 1;
    if (!started) continue;
    if (state.speciesComplete(sp.id)) {
      return [`${sp.nameJa}の ホネが ぜんぶ そろっとるぞ! 🏛️はくぶつかんで ふくげんするんじゃ`];
    }
    const hint = missingBonesHint(state, sp);
    if (!hint) continue;
    const lines = [`${sp.nameJa}の ${hint}`];
    const first = sp.bones.find((b) => !state.hasBone(sp.id, b.id));
    const site = first ? boneSite(sp.id, first.id) : undefined;
    const gate = site ? lockedGate(state, site.pit) : undefined;
    if (gate) lines.push(needSourceLine(state, gate.needs));
    return lines;
  }
  return null;
}

/** ⛵しまセレクトで「まだ いけない」しまの りゆう(ひとつ前の島が 解禁ずみのときだけ 名前を出す) */
export function lockedIslandNote(state: GameState, unlock: string | undefined): string {
  const wing = /^wing:(k\d+)$/.exec(unlock ?? '');
  if (wing && state.islandUnlocked(wing[1]!)) {
    return `${islandById(wing[1]!).nameJa}の きょうりゅうを ぜんぶ ふくげんすると いける`;
  }
  if (unlock === 'ceremonyDone') return 'はくぶつかんを かいかんすると いける';
  return 'まだ いけない…';
}
