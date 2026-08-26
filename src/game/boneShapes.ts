import * as THREE from 'three';
import type { FossilDef } from '../core/state';

// 骨の「形状語彙」レジストリ。章ごとにビルダーを足すだけで新しい見た目を追加できる。
// 未知の kind は blob にフォールバックする(データを先行追加してもゲームが壊れない)。

type Builder = (def: FossilDef, material: THREE.MeshStandardMaterial, pitch: number) => THREE.Group;

const long: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const alongX = def.cells[1]![0] !== def.cells[0]![0];
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, pitch * def.cells.length * 0.86, 10),
    material,
  );
  shaft.rotation.z = Math.PI / 2;
  group.add(shaft);
  const knobGeo = new THREE.SphereGeometry(0.15, 10, 8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const knob = new THREE.Mesh(knobGeo, material);
      knob.position.set((sx * pitch * def.cells.length * 0.86) / 2, 0, sz * 0.09);
      group.add(knob);
    }
  }
  if (!alongX) group.rotation.y = Math.PI / 2;
  return group;
};

const blob: Builder = (_def, material) => {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), material);
  dome.scale.set(1.2, 0.8, 1.2);
  group.add(dome);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.3), material);
  snout.position.set(0.42, -0.06, 0);
  group.add(snout);
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3226 });
  for (const sz of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dark);
    socket.position.set(0.18, 0.12, sz * 0.18);
    group.add(socket);
  }
  return group;
};

const ammonite: Builder = (_def, material) => {
  const group = new THREE.Group();
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 8, 16, Math.PI * 1.7), material);
  coil.rotation.x = -Math.PI / 2;
  group.add(coil);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.08, 8, 12), material);
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), material);
  tip.position.set(0.32, 0, 0.24);
  group.add(tip);
  return group;
};

// 石板化石(あしあと等): うすい板 + くぼんだ足あと
const slab: Builder = (_def, material, pitch) => {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(pitch * 1.7, 0.14, pitch * 1.7), material);
  group.add(plate);
  const dark = new THREE.MeshStandardMaterial({ color: 0x8a7a5e, roughness: 1 });
  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), dark);
  heel.scale.set(1.2, 0.35, 1.5);
  heel.position.set(-0.08, 0.07, 0.05);
  group.add(heel);
  for (const angle of [-0.5, 0, 0.5]) {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), dark);
    toe.scale.set(1, 0.35, 1.6);
    toe.position.set(-0.08 + Math.sin(angle) * 0.26 * -1, 0.07, 0.05 + 0.3);
    toe.position.x = -0.08 + Math.sin(angle) * 0.22;
    toe.position.z = 0.05 + Math.cos(angle) * 0.34;
    group.add(toe);
  }
  return group;
};

// ひれあし(海生はちゅうるいのパドル): 平たい ひれ + 指の うね
const fin: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const len = Math.max(def.cells.length, 2) * pitch;
  const paddle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), material);
  paddle.scale.set(len * 0.92, 0.22, 0.62);
  group.add(paddle);
  for (const off of [-0.21, -0.07, 0.07, 0.21]) {
    const digit = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, len * 0.42, 4, 6), material);
    digit.rotation.z = Math.PI / 2;
    digit.position.set(len * 0.12, 0.09, off);
    group.add(digit);
  }
  const alongX = (def.cells[1]?.[0] ?? def.cells[0]![0] + 1) !== def.cells[0]![0];
  if (!alongX) group.rotation.y = Math.PI / 2;
  return group;
};

// つつ形(ベレムナイトの しん): 円筒 + とがった 先
const tube: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const len = Math.max(def.cells.length, 2) * pitch * 0.82;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, len * 0.6, 10), material);
  body.rotation.z = Math.PI / 2;
  body.position.x = -len * 0.14;
  group.add(body);
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.15, len * 0.5, 10), material);
  point.rotation.z = -Math.PI / 2;
  point.position.x = len * 0.32;
  group.add(point);
  const alongX = (def.cells[1]?.[0] ?? def.cells[0]![0] + 1) !== def.cells[0]![0];
  if (!alongX) group.rotation.y = Math.PI / 2;
  return group;
};

// こうら(アーケロン): ドーム + ふちの リング + ほねの うね
const shell: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const r = pitch * Math.sqrt(def.cells.length) * 0.52;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    material,
  );
  dome.scale.y = 0.42;
  group.add(dome);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.96, r * 0.09, 6, 22), material);
  brim.rotation.x = Math.PI / 2;
  group.add(brim);
  for (let k = 0; k < 3; k++) {
    const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, r * 0.85, 4, 6), material);
    ridge.rotation.z = Math.PI / 2;
    ridge.rotation.y = (k / 3) * Math.PI;
    ridge.position.y = r * 0.3;
    group.add(ridge);
  }
  return group;
};

// いしばんの さかな: いた + せぼねの せん + ヒレ
const fish: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const w = pitch * Math.sqrt(def.cells.length) * 0.9;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w * 1.9, 0.14, w * 1.9), material);
  group.add(plate);
  const dark = new THREE.MeshStandardMaterial({ color: 0x8a7a5e, roughness: 1 });
  const spineLine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, w * 1.2, 6), dark);
  spineLine.rotation.z = Math.PI / 2;
  spineLine.position.y = 0.08;
  group.add(spineLine);
  for (let k = -2; k <= 2; k++) {
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), dark);
    rib.rotation.x = Math.PI / 2;
    rib.position.set(k * w * 0.2, 0.08, 0);
    group.add(rib);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dark);
  head.scale.set(1.3, 0.4, 1);
  head.position.set(-w * 0.66, 0.08, 0);
  group.add(head);
  const tailFin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dark);
  tailFin.scale.set(1.6, 0.4, 2.2);
  tailFin.position.set(w * 0.66, 0.08, 0);
  group.add(tailFin);
  return group;
};

// つばさの ゆびのほね(よくりゅう): 関節つきの ながい ゆびが ゆるく そりあがる
const wingfinger: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const len = Math.max(def.cells.length, 2) * pitch * 0.92;
  const segs = 4;
  let x = -len / 2;
  for (let s = 0; s < segs; s++) {
    const segLen = (len / segs) * (1 - s * 0.06);
    const bone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065 - s * 0.008, 0.078 - s * 0.008, segLen * 0.9, 8),
      material,
    );
    bone.rotation.z = Math.PI / 2;
    bone.position.set(x + segLen / 2, s * 0.05, 0);
    group.add(bone);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.095 - s * 0.012, 8, 6), material);
    joint.position.set(x, s * 0.05, 0);
    group.add(joint);
    x += segLen;
  }
  const alongX = (def.cells[1]?.[0] ?? def.cells[0]![0] + 1) !== def.cells[0]![0];
  if (!alongX) group.rotation.y = Math.PI / 2;
  return group;
};

// いしばんの はねの かせき(しそちょう): いた + ひらいた はね + からだ
const featherslab: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const w = pitch * Math.sqrt(def.cells.length) * 0.9;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w * 1.9, 0.14, w * 1.9), material);
  group.add(plate);
  const dark = new THREE.MeshStandardMaterial({ color: 0x86755a, roughness: 1 });
  for (let k = -2; k <= 2; k++) {
    const feather = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, w * 0.55, 4, 6), dark);
    feather.rotation.z = Math.PI / 2;
    feather.rotation.y = k * 0.32;
    feather.position.set(-w * 0.12, 0.08, 0);
    group.add(feather);
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dark);
  body.scale.set(1.4, 0.4, 0.9);
  body.position.set(w * 0.28, 0.08, 0);
  group.add(body);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), dark);
  skull.scale.y = 0.5;
  skull.position.set(w * 0.52, 0.08, 0.14);
  group.add(skull);
  return group;
};

// こんぼうの しっぽ(アンキロサウルス): 節のある じく + 先の おおきな かたまり
const club: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const len = Math.max(def.cells.length, 2) * pitch * 0.9;
  for (let s = 0; s < 3; s++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09 - s * 0.012, 0.11 - s * 0.012, len * 0.24, 8),
      material,
    );
    seg.rotation.z = Math.PI / 2;
    seg.position.x = -len / 2 + len * 0.24 * (s + 0.5);
    group.add(seg);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), material);
  knob.scale.set(1.25, 0.85, 1.5);
  knob.position.x = len * 0.36;
  group.add(knob);
  const alongX = (def.cells[1]?.[0] ?? def.cells[0]![0] + 1) !== def.cells[0]![0];
  if (!alongX) group.rotation.y = Math.PI / 2;
  return group;
};

// よろいの小板の むれ: ちいさな 五角形の板が ちらばる
const scatter: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const w = pitch * Math.sqrt(def.cells.length) * 0.85;
  for (let k = 0; k < 7; k++) {
    const a = k * 2.4;
    const s = 0.1 + ((k * 13) % 5) / 30;
    const plate = new THREE.Mesh(new THREE.ConeGeometry(s * 1.6, s * 1.1, 5), material);
    plate.position.set(
      Math.cos(a) * w * 0.55 * ((k % 3) + 1) * 0.33,
      s * 0.4,
      Math.sin(a) * w * 0.55 * ((k % 3) + 1) * 0.33,
    );
    plate.rotation.y = a;
    group.add(plate);
  }
  return group;
};

// とげとげフリル(スティラコサウルス): おうぎ形の板 + ほうしゃじょうの とげ
const spikefrill: Builder = (def, material, pitch) => {
  const group = new THREE.Group();
  const r = pitch * Math.sqrt(def.cells.length) * 0.5;
  const fan = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.12, 14, 1, false, 0, Math.PI),
    material,
  );
  group.add(fan);
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 5; k++) {
    const a = (k / 4) * Math.PI;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, r * 0.75, 6), material);
    spike.position.copy(dir).multiplyScalar(r * 1.05);
    spike.quaternion.setFromUnitVectors(up, dir);
    group.add(spike);
  }
  return group;
};

// めの ほねリング(イクチオサウルスの こうまくりん)
const ring: Builder = (_def, material) => {
  const group = new THREE.Group();
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 18), material);
  hoop.rotation.x = -Math.PI / 2;
  group.add(hoop);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 14), material);
  inner.rotation.x = -Math.PI / 2;
  group.add(inner);
  return group;
};

const SHAPES: Record<string, Builder> = {
  long,
  blob,
  ammonite,
  slab,
  fin,
  tube,
  shell,
  fish,
  ring,
  wingfinger,
  featherslab,
  club,
  scatter,
  spikefrill,
};

export function buildBoneShape(
  def: FossilDef,
  material: THREE.MeshStandardMaterial,
  pitch: number,
): THREE.Group {
  return (SHAPES[def.kind] ?? blob)(def, material, pitch);
}
