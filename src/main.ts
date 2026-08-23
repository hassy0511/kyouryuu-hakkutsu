import * as THREE from 'three';
import { Sfx } from './core/audio';
import { GameState, PICK_MAX_HP, STORY, speciesById, type PitDef } from './core/state';
import { FpsMeter } from './ui/fps';
import { FieldMode } from './game/field';
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
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
el('app').appendChild(renderer.domElement);

const sfx = new Sfx();
const state = new GameState();

// ---- メッセージ --------------------------------------------------------------

let msgTimer: ReturnType<typeof setTimeout> | undefined;
const msgQueue: string[] = [];
function displayMsg(text: string): void {
  const msg = el('msg');
  msg.textContent = text;
  msg.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => {
    msg.classList.remove('show');
    const next = msgQueue.shift();
    if (next) setTimeout(() => displayMsg(next), 200);
  }, 2600);
}
function showMsg(text: string): void {
  msgQueue.length = 0;
  displayMsg(text);
}
function queueMsgs(lines: string[]): void {
  const [first, ...rest] = lines;
  if (!first) return;
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
  el('btn-pick').textContent = tool.broken ? '⛏️ こわれた…' : `⛏️ Lv${tool.level}`;
  const bar = el('pick-bar');
  bar.style.width = `${(tool.hp / PICK_MAX_HP) * 100}%`;
  bar.style.background = tool.broken
    ? '#ff6b6b'
    : tool.hp > PICK_MAX_HP * 0.3
      ? '#6adf6a'
      : '#ffd75e';
}
state.onChange = updateHud;

const overlays = new Overlays(state, sfx, { showMsg, queueMsgs, onHudChange: updateHud });

// ---- モード管理 --------------------------------------------------------------

let pit: PitMode | null = null;

const field = new FieldMode(renderer, sfx, state, {
  onEnterPit(def) {
    enterPit(def);
  },
  onOpenCraft() {
    overlays.openCraft();
  },
  onOpenMuseum() {
    overlays.openMuseum();
  },
  onHakase() {
    sfx.hint();
    if (state.allRestored() && !state.flag('ceremonyDone')) {
      queueMsgs(STORY.hakase.preCeremony);
      return;
    }
    showMsg(`🎩 はかせ「${state.nextHint(STORY.hakase.hints)}」`);
  },
  onDiscover(def) {
    showMsg(`🔍 ${def.discoverText}`);
  },
  showMsg,
});

function enterPit(def: PitDef): void {
  field.deactivate();
  pit = new PitMode(renderer, sfx, def, state, {
    showMsg,
    onExit: exitPit,
    onBedrockBlocked() {
      if (!state.flag('bedrockSeen')) {
        state.setFlag('bedrockSeen');
        queueMsgs(['🧱 カキン! かたすぎる…', ...STORY.hakase.bedrockBlocked]);
      } else {
        showMsg('🧱 カキン! かたすぎる… がんじょうピッケルが いる!');
      }
    },
    onBoneCollected(speciesId, boneId, boneStars) {
      state.collectBone(speciesId, boneId, boneStars);
      const sp = speciesById(speciesId);
      const bone = sp.bones.find((b) => b.id === boneId);
      const starsText = '★'.repeat(boneStars) + '☆'.repeat(3 - boneStars);
      const lines = [
        `${sp.id === 'ammonite' ? '🐚' : '🦴'} ${bone?.nameJa}を てにいれた! ${starsText}`,
      ];
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
  if (overlays.anyOpen()) return;
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
  if (!actionStarted || overlays.anyOpen()) return;
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

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  for (const camera of [field.camera, pit?.camera].filter(Boolean) as THREE.PerspectiveCamera[]) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
});

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

{
  el('title-logo').textContent = STORY.title;
  el('title-sub').textContent = STORY.subtitle || 'カセキ島で ホネを ほりだせ!';
  (el('title-continue') as HTMLButtonElement).style.display = GameState.hasSave() ? '' : 'none';
  if (!location.search.includes('debug')) el('fps-panel').classList.add('hidden');
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
  mode: () => (pit ? `pit:${pit.def.id}` : 'field'),
  pitPick: (gx: number, gz: number, l: number) => pit?.debugPick(gx, gz, l),
  pitPolish: (gx: number, gz: number, l: number, a: number) => pit?.debugPolish(gx, gz, l, a),
  pitCollectAll: () => pit?.collectAllPickups(),
  pitCellScreen: (gx: number, gz: number, l: number) => pit?.cellScreen(gx, gz, l),
  pitDump: () => pit?.debugDump(),
  exitPit: () => exitPit(),
  openMuseum: () => overlays.openMuseum(),
  openNotebook: () => overlays.openNotebook(),
  debugFinish: () => {
    // スモークテスト用: 全ホネ回収+全復元(開館式の直前状態を作る)
    import('./core/state').then(({ SPECIES }) => {
      for (const sp of SPECIES) {
        for (const b of sp.bones) state.collectBone(sp.id, b.id, 3);
        if (!state.isRestored(sp.id)) state.restore(sp.id);
      }
      updateHud();
    });
  },
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

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (pit) {
    pit.update(dt, time);
    renderer.render(pit.scene, pit.camera);
  } else {
    field.update(dt);
    renderer.render(field.scene, field.camera);
  }
  meter?.tick();
});
