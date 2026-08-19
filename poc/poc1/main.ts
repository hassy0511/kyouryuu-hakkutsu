import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDino } from './dino';
import { FpsMeter } from './fps';

// 発掘グリッド(02_TECH_SPEC §4 の想定サイズ)
const GRID_X = 8;
const GRID_Z = 8;
const GRID_DEPTH = 6;
const CELL = 0.55;
const PITCH = 0.57;

// 層ごとの色(上から 白亜紀/ジュラ紀/三畳紀 のイメージ)
const STRATA_COLORS = [0xe6d491, 0xe6d491, 0xb59a76, 0xb59a76, 0xa8674a, 0xa8674a];

const el = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} not found`);
  return found;
};

// ---- renderer / scene / camera ----------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
el('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed4ef);
scene.fog = new THREE.Fog(0x9ed4ef, 40, 110);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(8, 6.5, 11);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 26;
controls.minPolarAngle = THREE.MathUtils.degToRad(20);
controls.maxPolarAngle = THREE.MathUtils.degToRad(85);

// ---- lights -----------------------------------------------------------------

scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
sun.position.set(12, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---- terrain ----------------------------------------------------------------

{
  const geo = new THREE.PlaneGeometry(70, 70, 44, 44);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h =
      0.8 * Math.sin(x * 0.25) * Math.cos(z * 0.3) +
      0.4 * Math.sin(x * 0.7 + 1.3) * Math.sin(z * 0.5 + 0.7);
    const dist = Math.max(Math.abs(x), Math.abs(z));
    const factor = THREE.MathUtils.smoothstep(dist, 9, 18);
    pos.setY(i, Math.max(0, h) * factor);
  }
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0xd4bd8a, roughness: 1, flatShading: true }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);
}

{
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x9b8f7c,
    roughness: 1,
    flatShading: true,
  });
  for (let i = 0; i < 14; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const angle = (i / 14) * Math.PI * 2 + Math.sin(i * 7.3) * 0.5;
    const radius = 11 + ((i * 37) % 15);
    const s = 0.3 + ((i * 13) % 10) / 12;
    rock.position.set(Math.cos(angle) * radius, s * 0.35, Math.sin(angle) * radius);
    rock.scale.set(s, s * 0.7, s);
    rock.rotation.y = i * 1.7;
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}

// ---- excavation block (InstancedMesh) ---------------------------------------

let voxels: THREE.InstancedMesh;
{
  const geo = new THREE.BoxGeometry(CELL, CELL, CELL);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
  voxels = new THREE.InstancedMesh(geo, mat, GRID_X * GRID_Z * GRID_DEPTH);
  voxels.castShadow = true;
  voxels.receiveShadow = true;

  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  let idx = 0;
  for (let layer = 0; layer < GRID_DEPTH; layer++) {
    for (let gx = 0; gx < GRID_X; gx++) {
      for (let gz = 0; gz < GRID_Z; gz++) {
        const x = (gx - (GRID_X - 1) / 2) * PITCH;
        const z = (gz - (GRID_Z - 1) / 2) * PITCH;
        const y = (GRID_DEPTH - layer - 0.5) * PITCH;
        // 上の角を少し「掘りかけ」にする(削除セル=スケール0。実装方針どおり非表示扱い)
        const carved = (layer === 0 && gx < 3 && gz < 3) || (layer === 1 && gx < 2 && gz < 2);
        m.makeScale(carved ? 0 : 1, carved ? 0 : 1, carved ? 0 : 1);
        m.setPosition(x, y, z);
        voxels.setMatrixAt(idx, m);
        color.setHex(STRATA_COLORS[layer]!);
        color.offsetHSL(0, 0, (((gx * 31 + gz * 17 + layer * 7) % 10) / 10 - 0.5) * 0.05);
        voxels.setColorAt(idx, color);
        idx++;
      }
    }
  }
  scene.add(voxels);
}

{
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a6b47, roughness: 0.9 });
  const size = GRID_X * PITCH + 0.4;
  const topY = GRID_DEPTH * PITCH + 0.06;
  const plankGeo = new THREE.BoxGeometry(size + 0.3, 0.12, 0.18);
  for (const [rot, x, z] of [
    [0, 0, size / 2],
    [0, 0, -size / 2],
    [Math.PI / 2, size / 2, 0],
    [Math.PI / 2, -size / 2, 0],
  ] as const) {
    const plank = new THREE.Mesh(plankGeo, frameMat);
    plank.position.set(x, topY, z);
    plank.rotation.y = rot;
    plank.castShadow = true;
    scene.add(plank);
  }
}

// ---- dinosaur ---------------------------------------------------------------

const dino = createDino();
dino.object.position.set(-8, 0, 2);
dino.object.rotation.y = 0.35;
dino.object.scale.setScalar(0.85);
scene.add(dino.object);

const mixer = new THREE.AnimationMixer(dino.object);
mixer.clipAction(dino.clip).play();

// ---- HUD --------------------------------------------------------------------

const meter = new FpsMeter(el('fps'), el('ms'), el('fps-min'));
const infoEl = el('info');
const loadEl = el('load-time');
let firstFrame = true;
let animOn = true;

el('btn-shadow').addEventListener('click', () => {
  renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(
        (mat) => (mat.needsUpdate = true),
      );
    }
  });
  el('btn-shadow').textContent = renderer.shadowMap.enabled ? 'かげ ON' : 'かげ OFF';
});

const DPR_OPTIONS = [1, 1.5, 2];
let dprIndex = DPR_OPTIONS.indexOf(2);
el('btn-dpr').addEventListener('click', () => {
  dprIndex = (dprIndex + 1) % DPR_OPTIONS.length;
  const dpr = Math.min(DPR_OPTIONS[dprIndex]!, window.devicePixelRatio);
  renderer.setPixelRatio(dpr);
  el('btn-dpr').textContent = `がしつ ${dpr.toFixed(1)}x`;
});
el('btn-dpr').textContent = `がしつ ${renderer.getPixelRatio().toFixed(1)}x`;

el('btn-anim').addEventListener('click', () => {
  animOn = !animOn;
  el('btn-anim').textContent = animOn ? 'アニメ ON' : 'アニメ OFF';
});

// iPad Safari: ページ自体のピンチズーム・ダブルタップズームを抑止
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- loop -------------------------------------------------------------------

// スモークテスト(ヘッドレスブラウザ)からカメラを動かすための入口
(window as unknown as Record<string, unknown>).__poc = { camera, controls };

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (animOn) mixer.update(dt);
  controls.update();
  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    loadEl.textContent = (performance.now() / 1000).toFixed(1);
  }
  if (meter.tick() !== null) {
    const info = renderer.info.render;
    const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
    const memText = memory ? `${(memory.usedJSHeapSize / 1048576).toFixed(0)}MB` : '—';
    infoEl.textContent =
      `さんかっけい ${info.triangles.toLocaleString()} / ` +
      `ドローコール ${info.calls} / メモリ ${memText}`;
  }
});
