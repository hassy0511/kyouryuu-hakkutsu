import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCharacter, type CharacterRig } from '../../src/art/chars';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Character viewer UI is missing: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#scene');
const motionButton = requireElement<HTMLButtonElement>('#motion-button');
const stats = requireElement<HTMLElement>('#stats');
const loading = requireElement<HTMLElement>('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#202826');
scene.fog = new THREE.Fog('#202826', 8, 16);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 30);
camera.position.set(2.7, 2.1, 4.2);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight('#e4eee7', '#75664c', 2.1));
const key = new THREE.DirectionalLight('#fff0ce', 3.5);
key.position.set(3, 6, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 2.3, 0.18, 40),
  new THREE.MeshStandardMaterial({ color: '#554B3A', roughness: 0.92 }),
);
pedestal.position.y = -0.09;
pedestal.receiveShadow = true;
scene.add(pedestal);

const rigs: CharacterRig[] = [];
const player = buildCharacter('player');
const hakase = buildCharacter('hakase');
if (player) rigs.push(player);
if (hakase) rigs.push(hakase);
if (rigs.length === 0) throw new Error('No character models are registered.');
if (player && hakase) {
  player.group.position.x = -0.55;
  hakase.group.position.x = 0.55;
} else if (player) player.group.position.x = 0;
else if (hakase) hakase.group.position.x = 0;
rigs.forEach((rig) => scene.add(rig.group));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.65, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.4;
controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI / 2.03;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.75;

let moving = true;
motionButton.addEventListener('click', () => {
  moving = !moving;
  motionButton.setAttribute('aria-pressed', String(moving));
  motionButton.textContent = moving
    ? '🚶 あるいています → 🧍 とまる'
    : '🧍 とまっています → 🚶 あるく';
});

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.fov = camera.aspect < 0.8 ? 58 : 48;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
}
window.addEventListener('resize', resize, { passive: true });
resize();

let previous = performance.now();
function animate(now: number): void {
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  player?.update(dt, moving, 1.4);
  hakase?.update(dt, false, 0);
  controls.update(dt);
  renderer.render(scene, camera);
  stats.textContent = `△ ${renderer.info.render.triangles.toLocaleString()} / draw ${renderer.info.render.calls}`;
  requestAnimationFrame(animate);
}

requestAnimationFrame(() => {
  loading.classList.add('done');
  window.setTimeout(() => loading.remove(), 350);
  requestAnimationFrame(animate);
});
