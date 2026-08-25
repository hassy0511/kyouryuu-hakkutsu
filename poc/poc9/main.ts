import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSpinosaurus } from '../../src/art/dino3d/spinosaurus';

type ViewMode = 'skeleton' | 'living';

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
keyLight.shadow.bias = -0.0008;
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

const { skeleton, living } = buildSpinosaurus();
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
controls.target.set(0.4, 3.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minDistance = 6.5;
controls.maxDistance = 25;
controls.minPolarAngle = 0.45;
controls.maxPolarAngle = Math.PI / 2.03;
controls.autoRotate = false;
controls.update();

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
    ? 'ながい口・せなかのトゲ・ひらたいしっぽに ちゅうもく!'
    : 'ホネと おなじポーズに からだが ついたよ!';
  const currentStats = showingSkeleton ? skeletonStats : livingStats;
  statsLabel.textContent = `MODEL I · △ ${currentStats.triangles.toLocaleString()} / draw ${currentStats.drawCalls}`;
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
