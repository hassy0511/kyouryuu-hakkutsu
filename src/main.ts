import * as THREE from 'three';
import { Sfx } from './core/audio';
import {
  GameState,
  ISLANDS,
  PICK_MAX_HP,
  RECIPES,
  SPECIES,
  STORY,
  islandById,
  speciesById,
  type PitDef,
} from './core/state';
import { ExhibitMode } from './game/exhibit';
import { FpsMeter } from './ui/fps';
import { FieldMode, type FieldCallbacks } from './game/field';
import { PitMode } from './game/pit';
import { Overlays } from './ui/overlays';

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

const TAP_DEFER_MS = 70;

// ---- 基盤 -------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
el('app').appendChild(renderer.domElement);

// iPad Safari はツールバーの出入りで「100%」と実表示域がズレるため、
// #app(全画面固定)の実サイズからキャンバスを合わせる
function fitViewport(): void {
  const w = el('app').clientWidth || window.innerWidth;
  const h = el('app').clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  for (const camera of [field?.camera, pit?.camera, exhibit?.camera]) {
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
}

const sfx = new Sfx();
// かんりしゃモード(?admin=1): 全ステージ解放・全図鑑登録ずみの確認用。
// セーブは べつのキーに書くので、ふつうのセーブデータには影響しない
const ADMIN = new URLSearchParams(location.search).has('admin');
const state = new GameState(ADMIN ? 'honehori-save-admin' : undefined);

// ---- メッセージ --------------------------------------------------------------

let msgTimer: ReturnType<typeof setTimeout> | undefined;
let msgNextTimer: ReturnType<typeof setTimeout> | undefined;
const msgQueue: string[] = [];
function displayMsg(text: string): void {
  const msg = el('msg');
  msg.textContent = text;
  msg.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => {
    msg.classList.remove('show');
    const next = msgQueue.shift();
    if (next) msgNextTimer = setTimeout(() => displayMsg(next), 200);
  }, 2600);
}
function showMsg(text: string): void {
  // 連続メッセージ(鑑定など)の再生中は割り込まず、後ろに並べて取りこぼしを防ぐ
  if (msgQueue.length > 0) {
    msgQueue.push(text);
    return;
  }
  displayMsg(text);
}
function queueMsgs(lines: string[]): void {
  const [first, ...rest] = lines;
  if (!first) return;
  // 古いキューの「次を出す」予約が残っていると新しい1行目を上書きするため、必ず止める
  clearTimeout(msgNextTimer);
  msgQueue.length = 0;
  msgQueue.push(...rest);
  displayMsg(first);
}

// ---- HUD --------------------------------------------------------------------

function updateHud(): void {
  el('hud-bones').textContent = `${state.totalBonesCollected()}/${state.totalBones()}`;
  el('hud-crystal').textContent = `${state.inv.crystal}`;
  el('hud-wood').textContent = `${state.inv.wood}`;
  el('hud-stone').textContent = `${state.inv.stone}`;
  el('hud-iron').textContent = `${state.inv.iron}`;
  const tool = state.tool;
  el('btn-pick').textContent = tool.broken ? '✋ てで ほる' : `⛏️ Lv${tool.level}`;
  const bar = el('pick-bar');
  bar.style.width = `${(tool.hp / PICK_MAX_HP) * 100}%`;
  bar.style.background = tool.broken
    ? '#ff6b6b'
    : tool.hp > PICK_MAX_HP * 0.3
      ? '#6adf6a'
      : '#ffd75e';
}
state.onChange = updateHud;

const overlays = new Overlays(state, sfx, {
  showMsg,
  queueMsgs,
  onHudChange: updateHud,
  onOpenExhibit: (id) => enterExhibit(id),
  onTravel: (id) => travelTo(id),
});

// ---- モード管理 --------------------------------------------------------------

let pit: PitMode | null = null;
let exhibit: ExhibitMode | null = null;

const FIELD_CALLBACKS: FieldCallbacks = {
  onEnterPit(def) {
    enterPit(def);
  },
  onOpenCraft() {
    overlays.openCraft();
  },
  onOpenMuseum() {
    overlays.openMuseum();
  },
  onOpenBoat() {
    overlays.openBoat();
  },
  onHakase() {
    sfx.hint();
    if (state.allRestored() && !state.flag('ceremonyDone')) {
      queueMsgs(STORY.hakase.preCeremony);
      return;
    }
    if (state.flag('ceremonyDone') && state.allRestored('k2') && !state.flag('wing:k2')) {
      queueMsgs(STORY.hakase.preWingK2);
      return;
    }
    if (state.flag('wing:k2') && state.allRestored('k3') && !state.flag('wing:k3')) {
      queueMsgs(STORY.hakase.preWingK3);
      return;
    }
    if (state.flag('wing:k3') && state.allRestored('k4') && !state.flag('wing:k4')) {
      queueMsgs(STORY.hakase.preWingK4);
      return;
    }
    if (state.flag('wing:k4') && state.allRestored('k5') && !state.flag('wing:k5')) {
      queueMsgs(STORY.hakase.preWingK5);
      return;
    }
    if (state.flag('wing:k5') && state.allRestored('k6') && !state.flag('wing:k6')) {
      queueMsgs(STORY.hakase.preWingK6);
      return;
    }
    // 詰み防止: ピッケルが こわれて 修理素材も 足りないときは 分けてくれる
    if (state.tool.broken && !state.canAfford(RECIPES.repair)) {
      const giveWood = Math.max(0, RECIPES.repair.wood - state.inv.wood);
      const giveStone = Math.max(0, RECIPES.repair.stone - state.inv.stone);
      if (giveWood > 0) state.addMaterial('wood', giveWood);
      if (giveStone > 0) state.addMaterial('stone', giveStone);
      queueMsgs([
        '🎩 はかせ「よわったのう… わしの よびの ざいりょうを わけてやろう」',
        `🎁 ${giveWood > 0 ? `🪵×${giveWood} ` : ''}${giveStone > 0 ? `🪨×${giveStone}` : ''}を もらった! テントで なおそう`,
      ]);
      return;
    }
    showMsg(`🎩 はかせ「${state.nextHint(STORY.hakase.hints)}」`);
  },
  onDiscover(def) {
    showMsg(`🔍 ${def.discoverText}`);
  },
  showMsg,
};

function rebuildField(): FieldMode {
  return new FieldMode(renderer, sfx, state, FIELD_CALLBACKS);
}
let field = rebuildField();

function enterPit(def: PitDef): void {
  field.deactivate();
  pit = new PitMode(renderer, sfx, def, state, {
    showMsg,
    onExit: exitPit,
    onGateBlocked(look) {
      if (look === 'slabrock') {
        if (!state.flag('slabrockSeen')) {
          state.setFlag('slabrockSeen');
          queueMsgs(['🪨 カツン… いしの いたが かさなってる!', ...STORY.hakase.slabrockBlocked]);
        } else {
          showMsg('🪨 いしばんの かたまりは のみ（チゼル）が ないと ほれない…');
        }
        return;
      }
      if (look === 'sandrock') {
        if (!state.flag('sandrockSeen')) {
          state.setFlag('sandrockSeen');
          queueMsgs(['🫙 サラサラ… すなが かたく つまってる!', ...STORY.hakase.sandrockBlocked]);
        } else {
          showMsg('🫙 かたい すなの そうは ふるいの ような どうぐが いる…');
        }
        return;
      }
      if (look === 'darkrock') {
        if (!state.flag('darkrockSeen')) {
          state.setFlag('darkrockSeen');
          queueMsgs(['🕳️ ここから さきは まっくら…!', ...STORY.hakase.darkrockBlocked]);
        } else {
          showMsg('🕳️ まっくらで ほれない… あかりに なる どうぐが いる');
        }
        return;
      }
      if (look === 'wetrock') {
        if (!state.flag('wetrockSeen')) {
          state.setFlag('wetrockSeen');
          queueMsgs(['💧 ジュワ… みずが しみだしてきた!', ...STORY.hakase.wetrockBlocked]);
        } else {
          showMsg('💧 みずが しみだして ほれない… ポンプのような どうぐが いる');
        }
        return;
      }
      if (look === 'redrock') {
        if (!state.flag('redrockSeen')) {
          state.setFlag('redrockSeen');
          queueMsgs(['🟥 ガキイイン!! びくとも しない…', ...STORY.hakase.redrockBlocked]);
        } else {
          showMsg('🟥 ガキイイン! あかい がんばんは いまの どうぐでは ほれない…');
        }
        return;
      }
      if (!state.flag('bedrockSeen')) {
        state.setFlag('bedrockSeen');
        queueMsgs(['🧱 カキン! かたすぎる…', ...STORY.hakase.bedrockBlocked]);
      } else {
        showMsg('🧱 カキン! かたすぎる… がんじょうピッケルが いる!');
      }
    },
    onBoneCollected(speciesId, boneId, boneStars) {
      const prevStars = state.hasBone(speciesId, boneId) ? state.boneStars(speciesId, boneId) : -1;
      state.collectBone(speciesId, boneId, boneStars);
      const sp = speciesById(speciesId);
      const bone = sp.bones.find((b) => b.id === boneId);
      const starsText = '★'.repeat(boneStars) + '☆'.repeat(3 - boneStars);
      if (prevStars >= 0) {
        // きねんほり(とりなおし): 鑑定ずみのホネは 短い報告にして、★の記録だけ伝える
        const lines = [`🔁 ${sp.nameJa}の 「${bone?.nameJa}」を ほりなおした! ${starsText}`];
        if (boneStars > prevStars) lines.push('✨ ★が あがった! ノートに きろくしたぞ');
        else if (boneStars < prevStars) lines.push(`だいじょうぶ、きろくは ★${prevStars}の まま`);
        queueMsgs(lines);
        updateHud();
        return;
      }
      const lines = [
        `${sp.id === 'ammonite' ? '🐚' : '🦴'} これは… ${sp.nameJa}の 「${bone?.nameJa}」だ! ${starsText}`,
      ];
      if (bone?.feature) lines.push(`🔍 ${bone.feature}`);
      if (!state.flag(`learn:${speciesId}`)) {
        state.setFlag(`learn:${speciesId}`);
        lines.push(`📝 ${sp.learn}`);
      }
      if (!state.flag('firstFossil')) {
        state.setFlag('firstFossil');
        lines.push(...STORY.hakase.firstFossil);
      }
      if (state.speciesComplete(speciesId) && !state.isRestored(speciesId)) {
        sfx.fanfare();
        lines.push(...STORY.hakase.speciesReady);
      }
      queueMsgs(lines);
      updateHud();
    },
    onFirstReveal() {
      if (!state.flag('firstReveal')) {
        state.setFlag('firstReveal');
        sfx.hint();
        showMsg('🦴 なにか でてきた! ⛏️はNG、🖌️ブラシで こすろう');
      }
    },
  });
  el('pit-ui').classList.remove('hidden');
  setTool('pick');
  fitViewport();
  // 壁面発掘の初回だけ、掘り方(横から掘る・上を削ると崩れる)を説明する
  if (def.dig === 'wall' && !state.flag('wallSeen')) {
    state.setFlag('wallSeen');
    queueMsgs([
      '🧗 ここは がけの よこっぱらを ほる「へきめん はっくつ」だ!',
      '⚠️ うえの いわを けずりすぎると、うえから くずれてくるぞ',
    ]);
  }
}

function exitPit(): void {
  if (!pit) return;
  state.storePit(pit.def.id, pit.serialize());
  const done = pit.isFinished();
  const pitName = pit.def.nameJa;
  pit.dispose();
  pit = null;
  el('pit-ui').classList.add('hidden');
  field.activate();
  updateHud();
  if (done) showMsg(`✅ ${pitName}は ほりつくした!`);
}

function travelTo(islandId: string): void {
  if (pit || exhibit) return;
  if (!state.islandUnlocked(islandId) || islandId === state.data.currentIsland) return;
  const firstVisit = !state.flag(`visited:${islandId}`);
  overlays.closeAll();
  field.deactivate();
  field.dispose();
  state.travel(islandId);
  field = rebuildField();
  field.activate();
  updateHud();
  const island = islandById(islandId);
  // 初上陸のはかせ口上は story.json の「<島id>Arrival」を拾う(データ駆動)
  const arrival = (STORY.hakase as Record<string, unknown>)[`${islandId}Arrival`];
  if (firstVisit && Array.isArray(arrival)) {
    queueMsgs(arrival as string[]);
  } else {
    showMsg(`⛵ ${island.nameJa}に ついた!`);
  }
  fitViewport();
}

function enterExhibit(speciesId: string): void {
  if (exhibit || pit) return;
  overlays.closeAll();
  field.deactivate();
  exhibit = new ExhibitMode(renderer, speciesId);
  const sp = speciesById(speciesId);
  el('exhibit-name').textContent = sp.nameJa;
  el('exhibit-note').textContent =
    `🔍 ${sp.bones.find((b) => b.id === sp.featureBone)?.feature ?? ''}`;
  el('exhibit-skel').classList.add('active');
  el('exhibit-living').classList.remove('active');
  el('exhibit-ui').classList.remove('hidden');
  el('hud').classList.add('hidden');
  sfx.grandFanfare();
  fitViewport();
}

function exitExhibit(): void {
  if (!exhibit) return;
  exhibit.dispose();
  exhibit = null;
  el('exhibit-ui').classList.add('hidden');
  el('hud').classList.remove('hidden');
  field.activate();
  overlays.openMuseum();
}

function setExhibitView(view: 'skeleton' | 'living'): void {
  if (!exhibit) return;
  exhibit.setView(view);
  el('exhibit-skel').classList.toggle('active', view === 'skeleton');
  el('exhibit-living').classList.toggle('active', view === 'living');
}

function setTool(tool: 'pick' | 'brush' | 'ear'): void {
  if (pit) pit.tool = tool;
  el('btn-pick').classList.toggle('active', tool === 'pick');
  el('btn-brush').classList.toggle('active', tool === 'brush');
  el('btn-ear').classList.toggle('active', tool === 'ear');
}

// ---- 入力(1本指=操作 / 2本指=カメラ) ------------------------------------------

const pointers = new Set<number>();
let activePointer: number | null = null;
let actionStarted = false;
let pendingTap: ReturnType<typeof setTimeout> | undefined;
const downPos = { x: 0, y: 0 };

function cancelPendingTap(): void {
  if (pendingTap !== undefined) {
    clearTimeout(pendingTap);
    pendingTap = undefined;
  }
}

function tapAction(x: number, y: number): void {
  if (overlays.anyOpen() || exhibit) return;
  if (pit) pit.tapAction(x, y);
  else field.tap(x, y);
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  pointers.add(e.pointerId);
  if (pointers.size === 1 && e.button === 0) {
    activePointer = e.pointerId;
    actionStarted = false;
    downPos.x = e.clientX;
    downPos.y = e.clientY;
    pendingTap = setTimeout(() => {
      pendingTap = undefined;
      if (pointers.size === 1 && activePointer === e.pointerId) {
        actionStarted = true;
        tapAction(downPos.x, downPos.y);
      }
    }, TAP_DEFER_MS);
  } else {
    cancelPendingTap();
    activePointer = null;
    actionStarted = false;
  }
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (pointers.size !== 1 || e.pointerId !== activePointer) return;
  const prevX = downPos.x;
  const prevY = downPos.y;
  downPos.x = e.clientX;
  downPos.y = e.clientY;
  if (!actionStarted || overlays.anyOpen() || exhibit) return;
  if (pit) {
    if (pit.tool === 'pick') pit.tapAction(e.clientX, e.clientY);
    else if (pit.tool === 'brush')
      pit.dragBrush(e.clientX, e.clientY, prevX, prevY, performance.now());
  } else {
    field.tap(e.clientX, e.clientY, true);
  }
});
const release = (e: PointerEvent): void => {
  pointers.delete(e.pointerId);
  if (e.pointerId === activePointer) {
    if (pendingTap !== undefined) {
      cancelPendingTap();
      if (pointers.size === 0) tapAction(downPos.x, downPos.y);
    }
    activePointer = null;
    actionStarted = false;
  }
};
renderer.domElement.addEventListener('pointerup', release);
renderer.domElement.addEventListener('pointercancel', release);
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

el('btn-pick').addEventListener('click', () => setTool('pick'));
el('btn-brush').addEventListener('click', () => setTool('brush'));
el('btn-ear').addEventListener('click', () => setTool('ear'));
el('btn-back').addEventListener('click', exitPit);
el('btn-notebook').addEventListener('click', () => overlays.openNotebook());
el('exhibit-skel').addEventListener('click', () => setExhibitView('skeleton'));
el('exhibit-living').addEventListener('click', () => setExhibitView('living'));
el('exhibit-back').addEventListener('click', exitExhibit);

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
window.addEventListener('resize', fitViewport);
window.visualViewport?.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 150));

// ---- タイトル・オープニング ---------------------------------------------------

function startGame(): void {
  el('ov-title').classList.remove('show');
  if (!state.flag('letterSeen')) {
    el('letter-body').innerHTML = STORY.openingLetter.map((l) => `<p>${l}</p>`).join('');
    el('ov-letter').classList.add('show');
  } else {
    field.activate();
  }
}

el('title-continue').addEventListener('click', () => {
  sfx.unlock();
  state.load();
  updateHud();
  startGame();
});
el('title-new').addEventListener('click', () => {
  sfx.unlock();
  if (GameState.hasSave()) {
    el('title-buttons').classList.add('hidden');
    el('title-confirm').classList.remove('hidden');
  } else {
    state.reset();
    startGame();
  }
});
el('title-confirm-yes').addEventListener('click', () => {
  state.reset();
  updateHud();
  el('title-confirm').classList.add('hidden');
  el('title-buttons').classList.remove('hidden');
  startGame();
});
el('title-confirm-no').addEventListener('click', () => {
  el('title-confirm').classList.add('hidden');
  el('title-buttons').classList.remove('hidden');
});
el('letter-next').addEventListener('click', () => {
  el('ov-letter').classList.remove('show');
  state.setFlag('letterSeen');
  field.activate();
  queueMsgs(STORY.hakase.start);
});

function applyAdminUnlock(): void {
  for (const sp of SPECIES) {
    for (const b of sp.bones) state.collectBone(sp.id, b.id, 3);
    if (!state.isRestored(sp.id)) state.restore(sp.id);
  }
  const flags = [
    'letterSeen',
    'ceremonyDone',
    'wing:k2',
    'wing:k3',
    'wing:k4',
    'wing:k5',
    'wing:k6',
    'fragileSeen',
    'firstFossil',
    'firstReveal',
    'firstRestore',
    'bedrockSeen',
    'redrockSeen',
    'wetrockSeen',
    'darkrockSeen',
    'slabrockSeen',
    'sandrockSeen',
    'wallSeen',
    'item:pump',
    'item:lamp',
    'item:chisel',
    'item:sieve',
  ];
  for (const flag of flags) state.setFlag(flag);
  const homeIsland = state.data.currentIsland;
  for (const island of ISLANDS) {
    state.setFlag(`visited:${island.id}`);
    state.data.currentIsland = island.id;
    for (const p of island.pits) state.discover(p.id);
  }
  state.data.currentIsland = homeIsland;
  state.setPickLevel(3);
  for (const kind of ['wood', 'stone', 'crystal', 'iron'] as const) {
    if (state.inv[kind] < 20) state.addMaterial(kind, 20 - state.inv[kind]);
  }
}

{
  el('title-logo').textContent = STORY.title;
  el('title-sub').textContent = STORY.subtitle || 'カセキ島で ホネを ほりだせ!';
  (el('title-continue') as HTMLButtonElement).style.display = GameState.hasSave(
    ADMIN ? 'honehori-save-admin' : undefined,
  )
    ? ''
    : 'none';
  if (!location.search.includes('debug')) el('fps-panel').classList.add('hidden');
  if (ADMIN) {
    state.load();
    applyAdminUnlock();
    updateHud();
    el('ov-title').classList.remove('show');
    el('ov-letter').classList.remove('show');
    field.activate();
    queueMsgs([
      '🔧 かんりしゃモード: ぜんステージかいほう・ぜん図鑑とうろくずみ',
      '💾 セーブは べつわく。ふつうの データには えいきょうしない',
    ]);
  }
}

const meter = location.search.includes('debug')
  ? new FpsMeter(el('fps'), el('ms'), el('fps-min'))
  : null;

// ---- デバッグフック(スモークテスト用) ------------------------------------------

(window as unknown as Record<string, unknown>).__game = {
  state: () => JSON.parse(JSON.stringify(state.data)),
  teleport: (x: number, z: number) => field.teleport(x, z),
  interact: (id: string) => field.forceInteract(id),
  playerPos: () => field.playerPos(),
  mode: () => (exhibit ? `exhibit:${exhibit.speciesId}` : pit ? `pit:${pit.def.id}` : 'field'),
  pitPick: (gx: number, gz: number, l: number) => pit?.debugPick(gx, gz, l),
  pitPolish: (gx: number, gz: number, l: number, a: number) => pit?.debugPolish(gx, gz, l, a),
  pitCollectAll: () => pit?.collectAllPickups(),
  pitCellScreen: (gx: number, gz: number, l: number) => pit?.cellScreen(gx, gz, l),
  pitDump: () => pit?.debugDump(),
  exitPit: () => exitPit(),
  wear: (n: number) => state.wearPick(n),
  openMuseum: () => overlays.openMuseum(),
  openExhibit: (id: string) => enterExhibit(id),
  exitExhibit: () => exitExhibit(),
  openNotebook: () => overlays.openNotebook(),
  debugFinish: (islandId = 'k1') => {
    // スモークテスト用: 指定した章のホネ回収+復元(開館式/ウィング開館の直前状態を作る)
    import('./core/state').then(({ SPECIES }) => {
      for (const sp of SPECIES) {
        if (sp.hidden || (sp.island ?? 'k1') !== islandId) continue;
        for (const b of sp.bones) state.collectBone(sp.id, b.id, 3);
        if (!state.isRestored(sp.id)) state.restore(sp.id);
      }
      updateHud();
    });
  },
  give: (kind: 'wood' | 'stone' | 'crystal' | 'iron', n: number) => state.addMaterial(kind, n),
  pickLevel: (n: number) => state.setPickLevel(n),
  travel: (id: string) => travelTo(id),
  startNew: () => {
    state.reset();
    updateHud();
    el('ov-title').classList.remove('show');
    el('ov-letter').classList.remove('show');
    state.setFlag('letterSeen');
    field.activate();
  },
};

// ---- ループ ------------------------------------------------------------------

// ホーム画面追加でアプリとして動くよう、オフラインキャッシュを登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 登録に失敗しても通常のWeb表示で遊べる
    });
  });
}

const clock = new THREE.Clock();
updateHud();
fitViewport();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (exhibit) {
    exhibit.update();
    renderer.render(exhibit.scene, exhibit.camera);
  } else if (pit) {
    pit.update(dt, time);
    renderer.render(pit.scene, pit.camera);
  } else {
    field.update(dt);
    renderer.render(field.scene, field.camera);
  }
  meter?.tick();
});
