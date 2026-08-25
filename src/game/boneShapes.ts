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

const SHAPES: Record<string, Builder> = { long, blob, ammonite };

export function buildBoneShape(
  def: FossilDef,
  material: THREE.MeshStandardMaterial,
  pitch: number,
): THREE.Group {
  return (SHAPES[def.kind] ?? blob)(def, material, pitch);
}
