import * as THREE from 'three';

// GPU資源の後始末。モードを 捨てるときに シーンごと 呼ぶ(ジオメトリ・マテリアル・テクスチャ・
// インスタンス用バッファ・影のレンダーターゲット)。共有していた資源も 捨ててよい —
// 次に使うとき three.js が 自動で もう一度 アップロードする

const disposeMaterial = (mat: THREE.Material): void => {
  for (const value of Object.values(mat)) {
    if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
  }
  mat.dispose();
};

export function disposeObject3D(root: THREE.Object3D): void {
  const targets: THREE.Object3D[] = [];
  root.traverse((obj) => targets.push(obj));
  for (const obj of targets) {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && mesh.material) {
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m) disposeMaterial(m);
    }
    if ((obj as THREE.InstancedMesh).isInstancedMesh) (obj as THREE.InstancedMesh).dispose();
    const light = obj as THREE.Light;
    if (light.isLight && light.shadow) light.shadow.dispose();
  }
  root.clear();
}
