import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildDinoModel } from '../../src/art/dino3d';

type ViewMode = 'skeleton' | 'living';

const SPECIES = {
  allosaurus: {
    name: 'アロサウルス',
    feature: '🔍 3ぼんの ゆびと めのうえの つのに ちゅうもく!',
    skeletonTip: 'めのうえの つの・3ぼんゆび・ほそながい あたまを みてみよう!',
  },
  ankylosaurus: {
    name: 'アンキロサウルス',
    feature: '🔍 せなかの よろいと しっぽの こんぼうに ちゅうもく!',
    skeletonTip: 'よろいの ほね・はばひろい あばら・しっぽの こんぼうを みてみよう!',
  },
  archelon: {
    name: 'アーケロン',
    feature: '🔍 おおきな まえびれと ひくい こうらに ちゅうもく!',
    skeletonTip: 'すきまのある こうらの わく・ひれの ながい ゆびを みてみよう!',
  },
  ammonite: {
    name: 'アンモナイト',
    feature: '🔍 うずまきの からと 10ぽんの しょくわんに ちゅうもく!',
    skeletonTip: 'ほうしゃじょうの すじと うずまきの ほうせんを みてみよう!',
  },
  belemnite: {
    name: 'ベレムナイト',
    feature: '🔍 つつがたの かせきと 10ぽんの うでに ちゅうもく!',
    skeletonTip: 'さきの とがった ロストルムと せいちょうの すじを みてみよう!',
  },
  brachiosaurus: {
    name: 'ブラキオサウルス',
    feature: '🔍 たかい かた・ながい くび・ちいさな あたまに ちゅうもく!',
    skeletonTip: 'ながい くびの ほねと はしらのような 4ほんあしを みてみよう!',
  },
  carnotaurus: {
    name: 'カルノタウルス',
    feature: '🔍 めのうえの 2ほんの つのと ちいさな うでに ちゅうもく!',
    skeletonTip: 'うしのような つの・たかい とうこつ・とても ちいさな うでを みてみよう!',
  },
  iguanodon: {
    name: 'イグアノドン',
    feature: '🔍 おやゆびの スパイクと まっすぐな しっぽに ちゅうもく!',
    skeletonTip: 'おやゆびスパイク・5ほんゆび・かたい しっぽを みてみよう!',
  },
  ichthyosaurus: {
    name: 'イクチオサウルス',
    feature: '🔍 おおきな めと タテむきの おびれに ちゅうもく!',
    skeletonTip: 'めの なかの ほねのリングと したに まがる せぼねを みてみよう!',
  },
  mosasaurus: {
    name: 'モササウルス',
    feature: '🔍 4まいの ひれと したに まがる しっぽに ちゅうもく!',
    skeletonTip: 'ながい あご・ひれの ゆび・したに まがる しっぽを みてみよう!',
  },
  plesiosaurus: {
    name: 'プレシオサウルス',
    feature: '🔍 ながい くびと おなじかたちの 4まいの ひれに ちゅうもく!',
    skeletonTip: 'くびの ほねの れつ・4まいの ひれの ゆびを みてみよう!',
  },
  pachycephalosaurus: {
    name: 'パキケファロサウルス',
    feature: '🔍 ぶあつい あたまの ドームと ふちの こトゲに ちゅうもく!',
    skeletonTip: 'まるく もりあがった とうこつ・2ほんあし・みじかい うでを みてみよう!',
  },
  parasaurolophus: {
    name: 'パラサウロロフス',
    feature: '🔍 うしろへ のびる くだの とさかと ひらたい くちばしに ちゅうもく!',
    skeletonTip: 'ほねの とさか・カモのような くちばし・かたい しっぽを みてみよう!',
  },
  velociraptor: {
    name: 'ヴェロキラプトル',
    feature: '🔍 あしの おおきな かぎづめと うでの はねに ちゅうもく!',
    skeletonTip: 'もちあげた だいにしの かぎづめ・ながく かたい しっぽを みてみよう!',
  },
  therizinosaurus: {
    name: 'テリジノサウルス',
    feature: '🔍 ながい 3ぼんの ての かぎづめと ふくらんだ おなかに ちゅうもく!',
    skeletonTip: 'あたまより ながい 3ぼんの つめ・ながい くび・にそくほこうを みてみよう!',
  },
  pteranodon: {
    name: 'プテラノドン',
    feature: '🔍 ながい とさかと つばさの くすりゆびに ちゅうもく!',
    skeletonTip: 'うでから のびる ながい第4指と むねの りゅうこつを みてみよう!',
  },
  quetzalcoatlus: {
    name: 'ケツァルコアトルス',
    feature: '🔍 キリンのような ながいくびと たたんだ つばさに ちゅうもく!',
    skeletonTip: 'ながい くびのほねと おりたたまれた第4指を みてみよう!',
  },
  rhamphorhynchus: {
    name: 'ランフォリンクス',
    feature: '🔍 ながい しっぽと ひしがたの かじに ちゅうもく!',
    skeletonTip: 'ながい しっぽのほね・第4指・ちいさな まえばを みてみよう!',
  },
  spinosaurus: {
    name: 'スピノサウルス',
    feature: '🔍 せなかの おおきな ほ! スピノサウルスの しるし',
    skeletonTip: 'ながい口・せなかのトゲ・ひらたいしっぽに ちゅうもく!',
  },
  stegosaurus: {
    name: 'ステゴサウルス',
    feature: '🔍 2れつの いたと しっぽの 4ほんトゲに ちゅうもく!',
    skeletonTip: 'ほねの いた・4ほんの トゲ・たかい こしを みてみよう!',
  },
  styracosaurus: {
    name: 'スティラコサウルス',
    feature: '🔍 フリルの 6ぽんの とげと ながい はなヅノに ちゅうもく!',
    skeletonTip: 'とうこつと つながる フリルのとげ・はなヅノ・くちばしを みてみよう!',
  },
  tyrannosaurus: {
    name: 'ティラノサウルス',
    feature: '🔍 おおきな あたま と 2ほんゆびに ちゅうもく!',
    skeletonTip: 'おおきな とうこつ・2ほんゆび・ふとい あしを みてみよう!',
  },
  triceratops: {
    name: 'トリケラトプス',
    feature: '🔍 3ぼんの ツノと おおきな フリルに ちゅうもく!',
    skeletonTip: 'フリルと ツノ・くちばし・4ほんの あしを みてみよう!',
  },
} as const;
type SpeciesId = keyof typeof SPECIES;

interface ModelStats {
  triangles: number;
  drawCalls: number;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`3D viewer UI is missing: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#scene');
const skeletonButton = requireElement<HTMLButtonElement>('#skeleton-button');
const livingButton = requireElement<HTMLButtonElement>('#living-button');
const modeLabel = requireElement<HTMLElement>('#mode-label');
const statsLabel = requireElement<HTMLElement>('#stats');
const loading = requireElement<HTMLElement>('#loading');
const tip = requireElement<HTMLElement>('#tip');
const speciesName = requireElement<HTMLElement>('#species-name');
const speciesFeature = requireElement<HTMLElement>('#species-feature');
const speciesLinks = document.querySelectorAll<HTMLAnchorElement>('[data-species]');

const requestedSpecies = new URLSearchParams(window.location.search).get('species');
const speciesId: SpeciesId =
  requestedSpecies && requestedSpecies in SPECIES ? (requestedSpecies as SpeciesId) : 'spinosaurus';
const speciesInfo = SPECIES[speciesId];
speciesName.textContent = speciesInfo.name;
speciesFeature.textContent = speciesInfo.feature;
canvas.setAttribute('aria-label', `まわして見られる ${speciesInfo.name}の3Dてんじ`);
document.title = `${speciesInfo.name} 3Dミュージアム | ほねほり調査隊`;
speciesLinks.forEach((link) => {
  const isCurrent = link.dataset.species === speciesId;
  link.classList.toggle('active', isCurrent);
  if (isCurrent) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
});

const scene = new THREE.Scene();
scene.background = new THREE.Color('#202826');
scene.fog = new THREE.Fog('#202826', 19, 36);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
camera.position.set(0.4, 5, 20.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambient = new THREE.AmbientLight('#d8e3dc', 1.9);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight('#fff1d2', 3.2);
keyLight.position.set(7, 12, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -9;
keyLight.shadow.camera.right = 9;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 32;
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.035;
scene.add(keyLight);

const pedestalMaterial = new THREE.MeshStandardMaterial({
  color: '#4A4337',
  roughness: 0.92,
  metalness: 0,
});
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8.1, 0.32, 48), pedestalMaterial);
pedestal.position.y = -0.18;
pedestal.receiveShadow = true;
scene.add(pedestal);

const rim = new THREE.Mesh(
  new THREE.TorusGeometry(7.75, 0.055, 6, 64),
  new THREE.MeshStandardMaterial({ color: '#8A7654', roughness: 0.8 }),
);
rim.rotation.x = Math.PI / 2;
rim.position.y = -0.005;
scene.add(rim);

const views = buildDinoModel(speciesId);
if (!views) throw new Error(`3D model is not registered: ${speciesId}`);
const { skeleton, living } = views;
scene.add(skeleton, living);

function forEachMaterial(root: THREE.Object3D, callback: (material: THREE.Material) => void): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(callback);
  });
}

function setOpacity(root: THREE.Object3D, opacity: number): void {
  root.visible = opacity > 0.002;
  forEachMaterial(root, (material) => {
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.42;
  });
}

function getStats(root: THREE.Object3D): ModelStats {
  let triangles = 0;
  let drawCalls = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    drawCalls += Array.isArray(object.material) ? object.material.length : 1;
    const geometry = object.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
  });
  return { triangles: Math.round(triangles), drawCalls };
}

const skeletonStats = getStats(skeleton);
const livingStats = getStats(living);
console.info('[POC-9] Model budget', { skeleton: skeletonStats, living: livingStats });

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minPolarAngle = 0.45;
controls.maxPolarAngle = Math.PI / 2.03;
controls.autoRotate = false;

function fitCameraToModel(): void {
  const bounds = new THREE.Box3()
    .setFromObject(skeleton)
    .union(new THREE.Box3().setFromObject(living));
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const distanceForHeight = size.y / (2 * Math.tan(verticalFov / 2));
  const isFlyingPterosaur = speciesId === 'pteranodon' || speciesId === 'rhamphorhynchus';
  const projectedWidth = isFlyingPterosaur ? Math.max(size.x, size.z) : size.x;
  const distanceForWidth = projectedWidth / (2 * Math.tan(verticalFov / 2) * camera.aspect);
  const cameraPadding =
    speciesId === 'ammonite' || speciesId === 'belemnite'
      ? 1.42
      : speciesId === 'brachiosaurus'
        ? 1.6
        : speciesId === 'archelon'
          ? 2.25
          : speciesId === 'plesiosaurus'
            ? 1.5
            : speciesId === 'ichthyosaurus'
              ? 1.4
              : speciesId === 'pteranodon'
                ? 1.08
                : speciesId === 'rhamphorhynchus'
                  ? 1.12
                  : speciesId === 'quetzalcoatlus'
                    ? 2
                    : 1.15;
  const distance = Math.max(distanceForHeight, distanceForWidth) * cameraPadding;

  const targetOffsetY = speciesId === 'quetzalcoatlus' ? size.y * 0.1 : 0;
  controls.target.set(center.x, center.y + targetOffsetY, center.z);
  const cameraOffsetX = isFlyingPterosaur ? distance * 0.72 : size.x * 0.015;
  const cameraOffsetZ = isFlyingPterosaur ? distance * 0.72 : distance;
  const cameraOffsetY = isFlyingPterosaur ? distance * 0.28 : size.y * 0.08;
  camera.position.set(
    center.x + cameraOffsetX,
    center.y + targetOffsetY + cameraOffsetY,
    center.z + cameraOffsetZ,
  );
  controls.minDistance = Math.max(size.y * 1.25, distance * 0.45);
  controls.maxDistance = distance * 2.25;
  controls.update();
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const transitionDuration = reducedMotion ? 0 : 650;
let mode: ViewMode = 'skeleton';
let transitionStart = 0;
let transitionFrom = 0;
let transitionTo = 0;
let transitionActive = false;
let livingOpacity = 0;

setOpacity(skeleton, 1);
setOpacity(living, 0);

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function updateButtons(): void {
  const showingSkeleton = mode === 'skeleton';
  skeletonButton.classList.toggle('active', showingSkeleton);
  livingButton.classList.toggle('active', !showingSkeleton);
  skeletonButton.setAttribute('aria-pressed', String(showingSkeleton));
  livingButton.setAttribute('aria-pressed', String(!showingSkeleton));
  modeLabel.textContent = showingSkeleton
    ? speciesInfo.skeletonTip
    : 'ホネと おなじポーズに からだが ついたよ!';
  const currentStats = showingSkeleton ? skeletonStats : livingStats;
  statsLabel.textContent = `${speciesInfo.name} · △ ${currentStats.triangles.toLocaleString()} / draw ${currentStats.drawCalls}`;
}

function showMode(nextMode: ViewMode): void {
  if (mode === nextMode && !transitionActive) return;
  mode = nextMode;
  transitionFrom = livingOpacity;
  transitionTo = nextMode === 'living' ? 1 : 0;
  transitionStart = performance.now();
  transitionActive = transitionDuration > 0;
  if (!transitionActive) {
    livingOpacity = transitionTo;
    setOpacity(skeleton, 1 - livingOpacity);
    setOpacity(living, livingOpacity);
  }
  updateButtons();
}

function registerInteraction(): void {
  tip.classList.add('hidden');
}

skeletonButton.addEventListener('click', () => showMode('skeleton'));
livingButton.addEventListener('click', () => showMode('living'));
controls.addEventListener('start', registerInteraction);
renderer.domElement.addEventListener('pointerdown', registerInteraction, { passive: true });
renderer.domElement.addEventListener('wheel', registerInteraction, { passive: true });

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = camera.aspect < 0.8 ? 63 : 50;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
}

window.addEventListener('resize', resize, { passive: true });
resize();
fitCameraToModel();
updateButtons();

let lastFrame = performance.now();
function animate(now: number): void {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  if (transitionActive) {
    const progress = Math.min((now - transitionStart) / transitionDuration, 1);
    livingOpacity = THREE.MathUtils.lerp(transitionFrom, transitionTo, smoothStep(progress));
    setOpacity(skeleton, 1 - livingOpacity);
    setOpacity(living, livingOpacity);
    if (progress >= 1) transitionActive = false;
  }

  controls.update(deltaSeconds);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(() => {
  loading.classList.add('done');
  window.setTimeout(() => loading.remove(), 400);
  requestAnimationFrame(animate);
});
