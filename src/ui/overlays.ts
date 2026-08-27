import { Sfx } from '../core/audio';
import { hasDinoModel } from '../art/dino3d';
import {
  ERAS,
  GATE_LOOKS,
  GameState,
  ISLANDS,
  KNOWLEDGE,
  NEED_LABELS,
  PICK_MAX_HP,
  RECIPES,
  SPECIES,
  STORY,
  islandById,
  pitById,
  speciesById,
} from '../core/state';

// HTML オーバーレイ群: はかせのノート(図鑑・学習) / 博物館 / 復元 / クラフト / 開館式

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

export interface OverlayHooks {
  showMsg(text: string): void;
  queueMsgs(lines: string[]): void;
  onHudChange(): void;
  onOpenExhibit(speciesId: string): void;
  onTravel(islandId: string): void;
}

export class Overlays {
  private notebookTab = 'dino';
  private lastRestored: string | null = null;

  constructor(
    private readonly state: GameState,
    private readonly sfx: Sfx,
    private readonly hooks: OverlayHooks,
  ) {
    el('nb-close').addEventListener('click', () => this.hide('ov-notebook'));
    for (const t of ['dino', 'era', 'know'] as const) {
      el(`nb-tab-${t}`).addEventListener('click', () => this.openNotebook(t));
    }
    el('museum-close').addEventListener('click', () => this.hide('ov-museum'));
    el('boat-close').addEventListener('click', () => this.hide('ov-boat'));
    el('craft-close').addEventListener('click', () => this.hide('ov-craft'));
    el('craft-repair').addEventListener('click', () => this.craft('repair'));
    el('craft-upgrade').addEventListener('click', () => this.craft('upgrade'));
    el('craft-upgrade2').addEventListener('click', () => this.craft('upgrade2'));
    el('craft-pump').addEventListener('click', () => this.craft('pump'));
    el('craft-lamp').addEventListener('click', () => this.craft('lamp'));
    el('craft-chisel').addEventListener('click', () => this.craft('chisel'));
    el('craft-sieve').addEventListener('click', () => this.craft('sieve'));
    el('craft-firestone').addEventListener('click', () => this.craft('firestone'));
    el('celebrate-close').addEventListener('click', () => {
      this.hide('ov-celebrate');
      if (this.lastRestored && hasDinoModel(this.lastRestored)) {
        this.hooks.onOpenExhibit(this.lastRestored);
        return;
      }
      this.openMuseum();
    });
  }

  private show(id: string): void {
    el(id).classList.add('show');
  }
  private hide(id: string): void {
    el(id).classList.remove('show');
  }
  anyOpen(): boolean {
    return [
      'ov-notebook',
      'ov-museum',
      'ov-craft',
      'ov-boat',
      'ov-assembly',
      'ov-celebrate',
      'ov-ceremony',
    ].some((id) => el(id).classList.contains('show'));
  }
  closeAll(): void {
    for (const id of [
      'ov-notebook',
      'ov-museum',
      'ov-craft',
      'ov-boat',
      'ov-assembly',
      'ov-celebrate',
    ]) {
      this.hide(id);
    }
  }

  // ---- はかせのノート ----------------------------------------------------------

  openNotebook(tab = this.notebookTab): void {
    this.notebookTab = tab;
    for (const t of ['dino', 'era', 'know']) {
      el(`nb-tab-${t}`).classList.toggle('active', t === tab);
    }
    const body = el('nb-body');
    if (tab === 'dino') body.innerHTML = this.renderDinoPages();
    else if (tab === 'era') body.innerHTML = this.renderEraPages();
    else body.innerHTML = this.renderKnowledgePages();
    this.show('ov-notebook');
  }

  private renderDinoPages(): string {
    const pages = SPECIES.filter((sp) => this.state.isSpeciesVisible(sp.id)).map((sp) => {
      const collected = this.state.collectedCount(sp.id);
      const restored = this.state.isRestored(sp.id);
      if (restored) {
        const s = this.state.data.restored[sp.id] ?? 1;
        const boneRows = sp.bones
          .map(
            (b) =>
              `<li>${b.nameJa}${b.id === sp.featureBone ? ' ⭐とくちょう' : ''} <span class="gold">${stars(this.state.boneStars(sp.id, b.id))}</span></li>`,
          )
          .join('');
        return `<div class="nb-page">
          <div class="nb-head"><span class="nb-emoji">${sp.emoji}</span><b>${sp.nameJa}</b> <span class="gold">${stars(s)}</span></div>
          <div class="nb-row">じだい: ${ERAS.find((e) => e.id === sp.era)?.nameJa ?? ''}</div>
          <div class="nb-row">たべもの: ${sp.diet}</div>
          <div class="nb-row">おおきさ: やく${sp.lengthM}m（${sp.lengthNote}）</div>
          <div class="nb-fact">💡 ${sp.funFact}</div>
          <div class="nb-fact">📝 ${sp.learn}</div>
          <ul class="nb-bones">${boneRows}</ul>
        </div>`;
      }
      if (collected > 0) {
        const boneRows = sp.bones
          .map((b) =>
            this.state.hasBone(sp.id, b.id)
              ? `<li>✅ ${b.nameJa}<div class="dim">🔍 ${b.feature}</div></li>`
              : `<li class="dim">❓ まだ みつけていない</li>`,
          )
          .join('');
        return `<div class="nb-page">
          <div class="nb-head"><span class="nb-emoji sil">${sp.emoji}</span><b>${sp.nameJa}</b></div>
          <div class="nb-row">ホネ ${collected}/${sp.bones.length} — ぜんぶ あつめて はくぶつかんで ふくげんしよう!</div>
          <ul class="nb-bones">${boneRows}</ul>
        </div>`;
      }
      return `<div class="nb-page dim">
        <div class="nb-head"><span class="nb-emoji sil">❓</span><b>？？？</b></div>
        <div class="nb-row">まだ みつけていない…</div>
      </div>`;
    });
    if (this.state.flag('ceremonyDone')) {
      pages.push(`<div class="nb-page blank">
        <div class="nb-head"><span class="nb-emoji">📄</span><b>はくしの ページ</b></div>
        <div class="nb-fact">「つづきは きみが かくんじゃ」— かせきはかせ</div>
      </div>`);
    }
    return pages.join('');
  }

  private renderEraPages(): string {
    return ERAS.map(
      (era) => `<div class="nb-page">
        <div class="nb-head"><span class="nb-emoji">🌋</span><b>${era.nameJa}</b></div>
        <div class="nb-row">${era.yearsAgo}</div>
        <div class="nb-fact">${era.desc}</div>
        <div class="nb-fact">📝 ${era.learn}</div>
      </div>`,
    ).join('');
  }

  private renderKnowledgePages(): string {
    return (
      this.renderMarksPage() +
      KNOWLEDGE.map(
        (k) => `<div class="nb-page">
        <div class="nb-head"><span class="nb-emoji">🔍</span><b>${k.title}</b></div>
        <div class="nb-fact">${k.body}</div>
      </div>`,
      ).join('')
    );
  }

  // 触った封印の記録。あけられるようになったものには ✅ が付く
  private renderMarksPage(): string {
    const marks = this.state.markList();
    if (marks.length === 0) return '';
    const rows = marks
      .map((m) => {
        const ok = this.state.meetsNeed(m.needs);
        const gate = GATE_LOOKS[m.look]?.nameJa ?? m.look;
        const need = NEED_LABELS[m.needs] ?? m.needs;
        return `<li class="${ok ? '' : 'dim'}">${ok ? '✅ いける!' : '🔴'} ${pitById(m.pitId).nameJa}（${islandById(m.islandId).nameJa}）<div class="dim">${gate} — ${need}が いる</div></li>`;
      })
      .join('');
    return `<div class="nb-page">
      <div class="nb-head"><span class="nb-emoji">📍</span><b>きになるリスト</b></div>
      <ul class="nb-bones">${rows}</ul>
    </div>`;
  }

  // ---- ⛵しまセレクト -----------------------------------------------------------

  openBoat(): void {
    const rows = ISLANDS.map((island) => {
      const here = island.id === this.state.data.currentIsland;
      const unlocked = this.state.islandUnlocked(island.id);
      const note = here ? 'いま ここに いる' : unlocked ? '' : 'まだ いけない…';
      const label = here ? 'いまここ' : unlocked ? 'いく' : '？？？';
      return `<div class="recipe">
        <div>
          <b>${unlocked ? island.emoji : '❓'} ${unlocked ? island.nameJa : '？？？の しま'}</b>
          <small>${note}</small>
        </div>
        <button type="button" ${here || !unlocked ? 'disabled' : `data-travel="${island.id}"`}>${label}</button>
      </div>`;
    }).join('');
    // 全島解禁後は「うわさ」の行を出さない(第10章で航路はコンプリート)
    const teaser = ISLANDS.every((i) => this.state.islandUnlocked(i.id))
      ? ''
      : `<div class="recipe teaser">
        <div>
          <b>？？？の しま</b>
          <small>あたらしい しまの うわさが きこえてくる…</small>
        </div>
        <button type="button" disabled>じゅんびちゅう</button>
      </div>`;
    el('boat-list').innerHTML = rows + teaser;
    for (const btn of el('boat-list').querySelectorAll('button[data-travel]')) {
      btn.addEventListener('click', () => {
        this.hide('ov-boat');
        this.hooks.onTravel((btn as HTMLElement).dataset.travel!);
      });
    }
    this.show('ov-boat');
  }

  // ---- クラフト ----------------------------------------------------------------

  openCraft(): void {
    this.refreshCraft();
    this.show('ov-craft');
    this.state.save();
    this.hooks.showMsg('⛺ テントに もどった（きろくした）');
  }

  refreshCraft(): void {
    const tool = this.state.tool;
    const inv = this.state.inv;
    el('craft-pick-status').textContent = tool.broken
      ? 'こわれている…'
      : `⛏️ Lv${tool.level}（あと ${tool.hp} かい）`;
    const costHtml = (parts: [string, number, number][]): string =>
      parts
        .map(
          ([emoji, have, need]) =>
            `${emoji}<span class="${have >= need ? 'have-ok' : 'have-ng'}">${have}/${need}</span>`,
        )
        .join(' ');
    el('craft-repair-cost').innerHTML = costHtml([
      ['🪵', inv.wood, RECIPES.repair.wood],
      ['🪨', inv.stone, RECIPES.repair.stone],
    ]);
    el('craft-upgrade-cost').innerHTML = costHtml([
      ['🪵', inv.wood, RECIPES.upgrade.wood],
      ['🔩', inv.iron, RECIPES.upgrade.iron],
      ['💎', inv.crystal, RECIPES.upgrade.crystal],
    ]);
    el('craft-upgrade2-cost').innerHTML = costHtml([
      ['🪵', inv.wood, RECIPES.upgrade2.wood],
      ['🔩', inv.iron, RECIPES.upgrade2.iron],
      ['💎', inv.crystal, RECIPES.upgrade2.crystal],
    ]);
    (el('craft-repair') as HTMLButtonElement).disabled =
      !this.state.canAfford(RECIPES.repair) || (!tool.broken && tool.hp >= PICK_MAX_HP);
    // レシピは「一段階うえ」まで見せる:
    // Lv1=がんじょうのレシピ / Lv2=？？？の予告 → ジュラのしま到達で くろがねのレシピ解禁
    const level = tool.level;
    const knowsIron = this.state.flag('visited:k2');
    el('craft-upgrade-row').style.display = level === 1 ? '' : 'none';
    el('craft-upgrade2-row').classList.toggle('hidden', !(level === 2 && knowsIron));
    el('craft-teaser').classList.toggle('hidden', !(level === 2 && !knowsIron));
    (el('craft-upgrade') as HTMLButtonElement).disabled =
      level >= 2 || !this.state.canAfford(RECIPES.upgrade);
    (el('craft-upgrade2') as HTMLButtonElement).disabled =
      level !== 2 || !knowsIron || !this.state.canAfford(RECIPES.upgrade2);
    // どうぐ(ピッケル以外): 章の島に到達でレシピ解禁。つくったら行ごと消える
    const toolRows: [
      'pump' | 'lamp' | 'chisel' | 'sieve' | 'firestone',
      string,
      [string, number, number][],
    ][] = [
      [
        'pump',
        'k3',
        [
          ['🪵', inv.wood, RECIPES.pump.wood],
          ['🔩', inv.iron, RECIPES.pump.iron],
          ['💎', inv.crystal, RECIPES.pump.crystal],
        ],
      ],
      [
        'lamp',
        'k4',
        [
          ['🪵', inv.wood, RECIPES.lamp.wood],
          ['🪨', inv.stone, RECIPES.lamp.stone],
          ['💎', inv.crystal, RECIPES.lamp.crystal],
        ],
      ],
      [
        'chisel',
        'k4',
        [
          ['🪵', inv.wood, RECIPES.chisel.wood],
          ['🔩', inv.iron, RECIPES.chisel.iron],
          ['🪨', inv.stone, RECIPES.chisel.stone],
        ],
      ],
      [
        'sieve',
        'k5',
        [
          ['🪵', inv.wood, RECIPES.sieve.wood],
          ['🪨', inv.stone, RECIPES.sieve.stone],
          ['🔩', inv.iron, RECIPES.sieve.iron],
        ],
      ],
      [
        'firestone',
        'k9',
        [
          ['🪨', inv.stone, RECIPES.firestone.stone],
          ['🔩', inv.iron, RECIPES.firestone.iron],
          ['💎', inv.crystal, RECIPES.firestone.crystal],
        ],
      ],
    ];
    for (const [kind, islandId, parts] of toolRows) {
      const known = this.state.flag(`visited:${islandId}`);
      const has = this.state.flag(`item:${kind}`);
      el(`craft-${kind}-cost`).innerHTML = costHtml(parts);
      el(`craft-${kind}-row`).classList.toggle('hidden', !known || has);
      (el(`craft-${kind}`) as HTMLButtonElement).disabled =
        has || !this.state.canAfford(RECIPES[kind]);
    }
  }

  private craft(
    kind: 'repair' | 'upgrade' | 'upgrade2' | 'pump' | 'lamp' | 'chisel' | 'sieve' | 'firestone',
  ): void {
    if (kind === 'repair') {
      if (!this.state.canAfford(RECIPES.repair)) return;
      this.state.spend(RECIPES.repair);
      this.state.repairPick();
      this.sfx.shine();
      this.hooks.showMsg('🛠️ ピッケルを なおした!');
    } else if (kind === 'upgrade2') {
      if (this.state.tool.level !== 2 || !this.state.canAfford(RECIPES.upgrade2)) return;
      this.state.spend(RECIPES.upgrade2);
      this.state.setPickLevel(3);
      this.sfx.fanfare();
      const lines = ['⚒️ くろがねの ピッケル かんせい! あかい がんばんも ほれるぞ!'];
      if (this.state.openableMarks().length > 0) {
        lines.push('📍 きになるリストの ふういんが あけられるぞ! まえの しまも みてみよう');
      }
      this.hooks.queueMsgs(lines);
    } else if (
      kind === 'pump' ||
      kind === 'lamp' ||
      kind === 'chisel' ||
      kind === 'sieve' ||
      kind === 'firestone'
    ) {
      if (this.state.flag(`item:${kind}`) || !this.state.canAfford(RECIPES[kind])) return;
      this.state.spend(RECIPES[kind]);
      this.state.setFlag(`item:${kind}`);
      this.sfx.fanfare();
      const doneLine = {
        pump: '💧 みずぬきポンプ かんせい! みずの しみだす いわも ほれるぞ!',
        lamp: '🏮 ランタン かんせい! まっくらな ばしょも ほれるぞ!',
        chisel: '🔨 のみ かんせい! いしばんの かたまりを けずりだせるぞ!',
        sieve: '🧺 ふるい かんせい! かたい すなの そうも ほれるぞ!',
        firestone: '🔥 ひばなの石 かんせい! こおった つちを とかして ほれるぞ!',
      }[kind];
      const lines = [doneLine];
      if (kind === 'firestone') {
        lines.push('🎩 はかせ「にっぽんのしまの こおりだな…あの おおきな きばも とかせるのう!」');
      }
      if (this.state.openableMarks().length > 0) {
        lines.push('📍 きになるリストの ふういんが あけられるぞ! まえの しまも みてみよう');
      }
      this.hooks.queueMsgs(lines);
    } else {
      if (this.state.tool.level >= 2 || !this.state.canAfford(RECIPES.upgrade)) return;
      this.state.spend(RECIPES.upgrade);
      this.state.upgradePick();
      this.sfx.fanfare();
      const lines = ['✨ がんじょうピッケル かんせい! がんばんも ほれるぞ!'];
      if (this.state.openableMarks().length > 0) {
        lines.push('📍 きになるリストの ふういんが あけられるぞ!');
      }
      this.hooks.queueMsgs(lines);
    }
    this.refreshCraft();
    this.hooks.onHudChange();
  }

  // ---- 博物館 ------------------------------------------------------------------

  openMuseum(): void {
    if (this.state.allRestored() && !this.state.flag('ceremonyDone')) {
      this.runCeremony();
      return;
    }
    if (
      this.state.flag('ceremonyDone') &&
      this.state.allRestored('k2') &&
      !this.state.flag('wing:k2')
    ) {
      this.runWingCeremony('k2');
      return;
    }
    if (this.state.flag('wing:k2') && this.state.allRestored('k3') && !this.state.flag('wing:k3')) {
      this.runWingCeremony('k3');
      return;
    }
    if (this.state.flag('wing:k3') && this.state.allRestored('k4') && !this.state.flag('wing:k4')) {
      this.runWingCeremony('k4');
      return;
    }
    if (this.state.flag('wing:k4') && this.state.allRestored('k5') && !this.state.flag('wing:k5')) {
      this.runWingCeremony('k5');
      return;
    }
    if (this.state.flag('wing:k5') && this.state.allRestored('k6') && !this.state.flag('wing:k6')) {
      this.runWingCeremony('k6');
      return;
    }
    if (this.state.flag('wing:k6') && this.state.allRestored('k7') && !this.state.flag('wing:k7')) {
      this.runWingCeremony('k7');
      return;
    }
    if (this.state.flag('wing:k7') && this.state.allRestored('k8') && !this.state.flag('wing:k8')) {
      this.runWingCeremony('k8');
      return;
    }
    if (this.state.flag('wing:k8') && this.state.allRestored('k9') && !this.state.flag('wing:k9')) {
      this.runWingCeremony('k9');
      return;
    }
    if (
      this.state.flag('wing:k9') &&
      this.state.allRestored('k10') &&
      !this.state.flag('wing:k10')
    ) {
      this.runWingCeremony('k10');
      return;
    }
    const cards = SPECIES.filter((sp) => this.state.isSpeciesVisible(sp.id))
      .map((sp) => {
        if (this.state.isRestored(sp.id)) {
          const s = this.state.data.restored[sp.id] ?? 1;
          return `<div class="mu-card done${s === 3 ? ' gold-base' : ''}">
          <div class="mu-emoji">${sp.emoji}</div>
          <b>${sp.nameJa}</b>
          <div class="gold">${stars(s)}</div>
          ${hasDinoModel(sp.id) ? `<button data-exhibit="${sp.id}" type="button">🏛️ てんじを みる</button>` : ''}
          <button data-note="${sp.id}" type="button">📖 ノートでみる</button>
        </div>`;
        }
        if (this.state.speciesComplete(sp.id)) {
          return `<div class="mu-card ready">
          <div class="mu-emoji glow">${sp.emoji}</div>
          <b>ホネが そろった!</b>
          <button data-restore="${sp.id}" type="button">✨ ふくげんする</button>
        </div>`;
        }
        const found = this.state.collectedCount(sp.id);
        return `<div class="mu-card">
        <div class="mu-emoji sil">${sp.emoji}</div>
        <b>${found > 0 ? sp.nameJa : 'じゅんびちゅう'}</b>
        <div class="dim">ホネ ${found}/${sp.bones.length}</div>
      </div>`;
      })
      .join('');
    const wingLabel = this.state.flag('wing:k9')
      ? 'いのちのうみの ウィング'
      : this.state.flag('wing:k8')
        ? 'こおりの ウィング'
        : this.state.flag('wing:k7')
          ? 'はじまりの ウィング'
          : this.state.flag('wing:k6')
            ? 'にっぽんの ウィング'
            : this.state.flag('wing:k5')
              ? 'かりうどの ウィング'
              : this.state.flag('wing:k4')
                ? 'よろいの ウィング'
                : this.state.flag('wing:k3')
                  ? 'そらの ウィング'
                  : this.state.flag('wing:k2')
                    ? 'うみの ウィング'
                    : this.state.flag('ceremonyDone')
                      ? 'ジュラの ウィング'
                      : 'あたらしい ウィング';
    // 10ウィングが そろったら 準備中の とびらは 完成カードに かわる
    const wingCard = this.state.flag('wing:k10')
      ? `<div class="mu-card wing gold-base"><div class="mu-emoji">🏆</div><b>だいはくぶつかん かんせい!</b><div class="dim">★あつめと ？？？さがしは つづく</div></div>`
      : `<div class="mu-card wing"><div class="mu-emoji">🚪</div><b>${wingLabel}</b><div class="dim">じゅんびちゅう…</div></div>`;
    el('museum-cards').innerHTML = cards + wingCard;
    for (const btn of el('museum-cards').querySelectorAll('button[data-restore]')) {
      btn.addEventListener('click', () =>
        this.startAssembly((btn as HTMLElement).dataset.restore!),
      );
    }
    for (const btn of el('museum-cards').querySelectorAll('button[data-exhibit]')) {
      btn.addEventListener('click', () =>
        this.hooks.onOpenExhibit((btn as HTMLElement).dataset.exhibit!),
      );
    }
    for (const btn of el('museum-cards').querySelectorAll('button[data-note]')) {
      btn.addEventListener('click', () => {
        this.hide('ov-museum');
        this.openNotebook('dino');
      });
    }
    this.show('ov-museum');
  }

  // ---- 復元(かんたん組み立て) ---------------------------------------------------

  private startAssembly(speciesId: string): void {
    this.hide('ov-museum');
    const sp = speciesById(speciesId);
    el('asm-title').textContent = `ホネを ならべて ふくげんしよう!`;
    const slots = el('asm-slots');
    slots.innerHTML = sp.bones
      .map((b) => `<div class="asm-slot" data-slot="${b.id}">?</div>`)
      .join('');
    const chips = el('asm-chips');
    chips.innerHTML = sp.bones
      .map(
        (b) =>
          `<button class="asm-chip" data-bone="${b.id}" type="button">🦴 ${b.nameJa} <span class="gold">${stars(this.state.boneStars(speciesId, b.id))}</span></button>`,
      )
      .join('');
    let placed = 0;
    for (const chip of chips.querySelectorAll('button')) {
      chip.addEventListener('click', () => {
        const boneId = (chip as HTMLElement).dataset.bone!;
        const slot = slots.querySelector(`[data-slot="${boneId}"]`) as HTMLElement;
        slot.textContent = `🦴 ${sp.bones.find((b) => b.id === boneId)?.nameJa}`;
        slot.classList.add('filled');
        if (boneId === sp.featureBone) slot.classList.add('feature');
        (chip as HTMLButtonElement).disabled = true;
        this.sfx.hint();
        placed++;
        if (boneId === sp.featureBone && sp.id !== 'ammonite') {
          this.hooks.showMsg(
            `⭐ とくちょうの ${sp.bones.find((b) => b.id === boneId)?.nameJa}! ${sp.nameJa}らしく なってきた!`,
          );
        }
        if (placed === sp.bones.length) {
          setTimeout(() => this.finishRestore(speciesId), 700);
        }
      });
    }
    this.show('ov-assembly');
  }

  private finishRestore(speciesId: string): void {
    this.hide('ov-assembly');
    this.lastRestored = speciesId;
    const sp = speciesById(speciesId);
    const s = this.state.restore(speciesId);
    if (sp.id === 'ammonite') this.sfx.fanfare();
    else this.sfx.roar();
    el('cel-emoji').textContent = sp.emoji;
    el('cel-name').textContent = sp.nameJa;
    el('cel-stars').textContent = stars(s);
    el('cel-fact').textContent = `💡 ${sp.funFact}`;
    el('cel-learn').textContent = `📝 ${sp.learn}`;
    const confetti = el('cel-confetti');
    confetti.innerHTML = Array.from(
      { length: 24 },
      (_, i) =>
        `<span style="left:${(i * 41) % 100}%; animation-delay:${(i % 8) * 0.15}s; background:${['#ffd75e', '#7fd7ff', '#ff9d9d', '#9dffb0'][i % 4]}"></span>`,
    ).join('');
    this.show('ov-celebrate');
    this.hooks.onHudChange();
    if (!this.state.flag('firstRestore')) {
      this.state.setFlag('firstRestore');
      this.hooks.queueMsgs(STORY.hakase.afterFirstRestore);
    }
  }

  // ---- 開館式(第1章クライマックス) ----------------------------------------------

  private runCeremonySteps(steps: string[], onDone: () => void): void {
    let step = 0;
    const body = el('ceremony-body');
    const render = (): void => {
      body.innerHTML = steps[step]!;
      el('ceremony-next').textContent = step === steps.length - 1 ? 'おわる' : 'つぎへ ▶';
    };
    const next = (): void => {
      step++;
      if (step >= steps.length) {
        this.hide('ov-ceremony');
        el('ceremony-next').removeEventListener('click', next);
        onDone();
        this.hooks.onHudChange();
        return;
      }
      render();
    };
    el('ceremony-next').addEventListener('click', next);
    this.sfx.grandFanfare();
    render();
    this.show('ov-ceremony');
  }

  private runCeremony(): void {
    const c = STORY.ceremony;
    this.runCeremonySteps(
      [
        `<h1>${c.title}</h1>` + c.lines.map((l) => `<p>${l}</p>`).join(''),
        `<div class="letter">${c.letter.map((l) => `<p>${l}</p>`).join('')}</div>`,
        `<div class="trophy">🏆</div><p><b>${c.outro}</b></p><p class="dim">— だい1しょう おわり。まだまだ つづく! —</p>`,
      ],
      () => {
        this.state.setFlag('ceremonyDone');
        this.hooks.queueMsgs(STORY.hakase.postCeremony);
      },
    );
  }

  // 章クリア(その島の表の種をぜんぶ復元)ごとの ウィング開館
  private runWingCeremony(islandId: string): void {
    const c = (STORY.wings as Record<string, typeof STORY.ceremony>)[islandId];
    if (!c) return;
    this.runCeremonySteps(
      [
        `<h1>${c.title}</h1>` + c.lines.map((l) => `<p>${l}</p>`).join(''),
        `<div class="letter">${c.letter.map((l) => `<p>${l}</p>`).join('')}</div>`,
        `<div class="trophy">🏆</div><p><b>${c.outro}</b></p><p class="dim">— だい${islandById(islandId).order}しょう おわり。まだまだ つづく! —</p>`,
      ],
      () => {
        this.state.setFlag(`wing:${islandId}`);
      },
    );
  }
}
