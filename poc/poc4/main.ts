import * as THREE from 'three';
import { FpsMeter } from '../shared/fps';
import { Sfx } from '../poc2/audio';
import { FieldMode } from './field';
import { DigMode } from './dig';
import { SITES, SPECIES } from './data';

const STAMINA_MAX = 60;

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
el('app').appendChild(renderer.domElement);

const sfx = new Sfx();

// ---- 共有状態 ----------------------------------------------------------------

let stamina = STAMINA_MAX;
const collected = new Map<string, Map<string, number>>(); // speciesId -> boneId -> ★
for (const sp of SPECIES) collected.set(sp.id, new Map());

let msgTimer: ReturnType<typeof setTimeout> | undefined;
function showMsg(text: string): void {
  const msg = el('msg');
  msg.textContent = text;
  msg.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => msg.classList.remove('show'), 2800);
}

function updateStaminaHud(): void {
  const ratio = stamina / STAMINA_MAX;
  const bar = el('stamina-bar');
  bar.style.width = `${ratio * 100}%`;
  bar.style.background = ratio > 0.5 ? '#6adf6a' : ratio > 0.25 ? '#ffd75e' : '#ff6b6b';
  el('stamina-num').textContent = `${stamina}`;
}

function starsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

function updateSpeciesHud(): void {
  for (const sp of SPECIES) {
    el(`sp-${sp.id}`).textContent = `${collected.get(sp.id)!.size}/${sp.bones.length}`;
  }
}

let bannerTimer: ReturnType<typeof setTimeout> | undefined;
function showBanner(title: string, sub: string): void {
  el('banner-title').textContent = title;
  el('banner-sub').textContent = sub;
  el('banner').classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el('banner').classList.remove('show'), 4200);
}

function collectBone(siteId: string, boneId: string, nameJa: string, stars: number): void {
  const site = SITES.find((s) => s.id === siteId)!;
  const species = SPECIES.find((s) => s.id === site.speciesId)!;
  const bag = collected.get(species.id)!;
  bag.set(boneId, Math.max(bag.get(boneId) ?? 0, stars));
  updateSpeciesHud();
  showMsg(`🦴 ${species.nameJa}の ${nameJa}を ほりだした! ${starsText(stars)}`);
  if (bag.size === species.bones.length) {
    setTimeout(() => {
      sfx.fanfare();
      showBanner(
        `🎉 ${species.nameJa}の ホネが ぜんぶ そろった!`,
        'ふくげんラボは 本実装で つくるよ',
      );
    }, 1600);
  }
}

// ---- モード管理 ---------------------------------------------------------------

const digs = new Map<string, DigMode>();
let activeDig: DigMode | null = null;

const field = new FieldMode(renderer, sfx, {
  onEnterSite(site) {
    let dig = digs.get(site.id);
    if (!dig) {
      dig = new DigMode(renderer, sfx, site, {
        getStamina: () => stamina,
        spendStamina(cost) {
          stamina = Math.max(0, stamina - cost);
          updateStaminaHud();
          return stamina;
        },
        onCollect: collectBone,
        onExit() {
          exitDig();
        },
        showMsg,
      });
      digs.set(site.id, dig);
    }
    field.deactivate();
    activeDig = dig;
    dig.activate();
  },
  onRest() {
    stamina = STAMINA_MAX;
    updateStaminaHud();
    sfx.hint();
    showMsg('⛺ ぐっすり やすんだ! げんき まんたん!');
  },
  showMsg,
});

function exitDig(): void {
  if (!activeDig) return;
  const dig = activeDig;
  activeDig = null;
  dig.deactivate();
  if (dig.finished) field.markSiteDone(dig.site.id);
  field.activate();
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const cameras = [field.camera, ...[...digs.values()].map((d) => d.camera)];
  for (const camera of cameras) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
});
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- スモークテスト用フック ----------------------------------------------------

(window as unknown as Record<string, unknown>).__poc4 = {
  mode: () => (activeDig ? 'dig' : 'field'),
  stamina: () => stamina,
  playerPos: () => field.playerPos(),
  teleport: (x: number, z: number) => field.teleport(x, z),
  forceInteract: (id: string) => field.forceInteract(id),
  siteState: (id: string) => field.siteState(id),
  collected: () =>
    Object.fromEntries([...collected.entries()].map(([k, v]) => [k, Object.fromEntries(v)])),
  worldScreen: (x: number, y: number, z: number) => field.worldScreen(x, y, z),
  digCellScreen: (gx: number, gz: number, layer: number) => activeDig?.cellScreen(gx, gz, layer),
  digCell: (gx: number, gz: number, layer: number) => activeDig?.debugDigCell(gx, gz, layer),
};

// ---- ループ -------------------------------------------------------------------

const meter = new FpsMeter(el('fps'), el('ms'), el('fps-min'));
const clock = new THREE.Clock();
updateStaminaHud();
updateSpeciesHud();
field.activate();
showMsg('🔍 しまを あるいて ❗マークを さがそう!');

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const mode = activeDig ?? field;
  mode.update(dt);
  renderer.render(mode.scene, mode.camera);
  meter.tick();
});
