import * as THREE from 'three';

// アセット配布サイトへこの環境から到達できないため、POC-1 では実素材 glb と
// 同等の描画負荷(スキンメッシュ約1.2万トライアングル+ボーンアニメ)を
// コード生成で再現する。実素材の検証は POC-3 で行う。

const LENGTH = 10;
const RADIAL_SEGMENTS = 48;
const LENGTH_SEGMENTS = 120;
const ANIM_DURATION = 4;

// [t(0=しっぽの先→1=鼻先), 中心線の高さy, 半径r] 竜脚類シルエット
const PROFILE: [number, number, number][] = [
  [0.0, 2.55, 0.06],
  [0.1, 2.4, 0.15],
  [0.22, 2.15, 0.28],
  [0.32, 2.0, 0.46],
  [0.4, 1.95, 0.62],
  [0.48, 1.95, 0.6],
  [0.55, 2.05, 0.46],
  [0.62, 2.45, 0.3],
  [0.72, 3.25, 0.22],
  [0.82, 4.05, 0.18],
  [0.9, 4.55, 0.16],
  [0.94, 4.65, 0.27],
  [1.0, 4.6, 0.1],
];

// parent は BONES 配列内インデックス(-1 が root)。t 昇順を保つこと(スキン重み計算が前提にする)
const BONES: { name: string; t: number; parent: number }[] = [
  { name: 'tail3', t: 0.03, parent: 1 },
  { name: 'tail2', t: 0.13, parent: 2 },
  { name: 'tail1', t: 0.23, parent: 3 },
  { name: 'hip', t: 0.33, parent: -1 },
  { name: 'back', t: 0.45, parent: 3 },
  { name: 'shoulder', t: 0.57, parent: 4 },
  { name: 'neck1', t: 0.68, parent: 5 },
  { name: 'neck2', t: 0.79, parent: 6 },
  { name: 'neck3', t: 0.88, parent: 7 },
  { name: 'head', t: 0.95, parent: 8 },
];
const ROOT_BONE = 3;

function sampleProfile(t: number): { y: number; r: number } {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  let i = 0;
  while (i < PROFILE.length - 2 && PROFILE[i + 1]![0] < clamped) i++;
  const a = PROFILE[i]!;
  const b = PROFILE[i + 1]!;
  const w = THREE.MathUtils.clamp((clamped - a[0]) / (b[0] - a[0]), 0, 1);
  return { y: THREE.MathUtils.lerp(a[1], b[1], w), r: THREE.MathUtils.lerp(a[2], b[2], w) };
}

function buildBodyGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1, 1, 1, RADIAL_SEGMENTS, LENGTH_SEGMENTS, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(v.y + 0.5, 0, 1);
    const { y, r } = sampleProfile(t);
    pos.setXYZ(i, t * LENGTH, y + v.x * r, v.z * r);

    let j = 0;
    while (j < BONES.length - 2 && BONES[j + 1]!.t < t) j++;
    const w = THREE.MathUtils.clamp((t - BONES[j]!.t) / (BONES[j + 1]!.t - BONES[j]!.t), 0, 1);
    skinIndices.push(j, j + 1, 0, 0);
    skinWeights.push(1 - w, w, 0, 0);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geo.computeVertexNormals();
  return geo;
}

function buildBones(): THREE.Bone[] {
  const stations = BONES.map((b) => new THREE.Vector3(b.t * LENGTH, sampleProfile(b.t).y, 0));
  const bones = BONES.map((def) => {
    const bone = new THREE.Bone();
    bone.name = def.name;
    return bone;
  });
  BONES.forEach((def, i) => {
    if (def.parent === -1) {
      bones[i]!.position.copy(stations[i]!);
    } else {
      bones[def.parent]!.add(bones[i]!);
      bones[i]!.position.copy(stations[i]!.clone().sub(stations[def.parent]!));
    }
  });
  return bones;
}

function makeLeg(x: number, z: number, height: number): THREE.Group {
  const leg = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6a9c4c,
    roughness: 0.9,
    flatShading: true,
  });
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, height, 10), mat);
  thigh.position.y = height / 2;
  thigh.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.16, 10), mat);
  foot.position.y = 0.08;
  foot.castShadow = true;
  leg.add(thigh, foot);
  leg.position.set(x, 0, z);
  return leg;
}

function makeClip(): THREE.AnimationClip {
  const times: number[] = [];
  for (let i = 0; i <= 40; i++) times.push((i / 40) * ANIM_DURATION);

  const tracks: THREE.KeyframeTrack[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();

  const sway = (name: string, fn: (p: number) => [number, number, number]) => {
    const values: number[] = [];
    for (const time of times) {
      const p = (time / ANIM_DURATION) * Math.PI * 2;
      const [rx, ry, rz] = fn(p);
      q.setFromEuler(e.set(rx, ry, rz));
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
  };

  sway('neck1', (p) => [0, 0.04 * Math.sin(p + 0.5), 0.05 * Math.sin(p)]);
  sway('neck2', (p) => [0, 0.05 * Math.sin(p + 0.8), 0.07 * Math.sin(p + 0.3)]);
  sway('neck3', (p) => [0, 0.05 * Math.sin(p + 1.1), 0.08 * Math.sin(p + 0.6)]);
  sway('head', (p) => [0, 0.12 * Math.sin(p + 1.4), 0.12 * Math.sin(2 * p + 0.5)]);
  sway('tail1', (p) => [0, 0.08 * Math.sin(p), 0]);
  sway('tail2', (p) => [0, 0.14 * Math.sin(p + 0.7), 0]);
  sway('tail3', (p) => [0, 0.2 * Math.sin(p + 1.4), 0]);
  sway('back', (p) => [0.015 * Math.sin(2 * p), 0, 0.02 * Math.sin(p + 2)]);
  sway('shoulder', (p) => [0, 0, 0.02 * Math.sin(p + 2.5)]);

  const hipBase = new THREE.Vector3(
    BONES[ROOT_BONE]!.t * LENGTH,
    sampleProfile(BONES[ROOT_BONE]!.t).y,
    0,
  );
  const posValues: number[] = [];
  for (const time of times) {
    const p = (time / ANIM_DURATION) * Math.PI * 2;
    posValues.push(hipBase.x, hipBase.y + 0.04 * Math.sin(2 * p), hipBase.z);
  }
  tracks.push(new THREE.VectorKeyframeTrack('hip.position', times, posValues));

  return new THREE.AnimationClip('idle', ANIM_DURATION, tracks);
}

export function createDino(): { object: THREE.Group; clip: THREE.AnimationClip } {
  const bones = buildBones();
  const material = new THREE.MeshStandardMaterial({
    color: 0x76ac54,
    roughness: 0.9,
    flatShading: true,
  });
  const mesh = new THREE.SkinnedMesh(buildBodyGeometry(), material);
  mesh.castShadow = true;
  mesh.add(bones[ROOT_BONE]!);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
  const eyeGeo = new THREE.SphereGeometry(0.07, 8, 6);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0.12, 0.13, side * 0.2);
    bones[BONES.length - 1]!.add(eye);
  }

  const inner = new THREE.Group();
  inner.add(mesh);
  inner.add(makeLeg(5.7, -0.42, 1.9), makeLeg(5.7, 0.42, 1.9));
  inner.add(makeLeg(3.4, -0.45, 1.85), makeLeg(3.4, 0.45, 1.85));
  inner.position.x = -LENGTH / 2;

  const object = new THREE.Group();
  object.name = 'dino';
  object.add(inner);
  return { object, clip: makeClip() };
}
