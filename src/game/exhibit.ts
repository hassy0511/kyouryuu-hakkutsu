import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildDinoModel } from '../art/dino3d';

// 博物館の3D展示モード。POC-9 のビューアーをゲーム内モードとして移植したもの。
// モデル(MODEL I)の造形には手を入れず、カメラ・照明・演出だけを持つ。

export type ExhibitView = 'skeleton' | 'living';

export class ExhibitMode {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  view: ExhibitView = 'skeleton';

  private readonly controls: OrbitControls;
  private readonly skeleton: THREE.Group;
  private readonly living: THREE.Group;
  private readonly transitionMs: number;
  private transitionStart = 0;
  private transitionFrom = 0;
  private transitionTo = 0;
  private transitionActive = false;
  private livingOpacity = 0;
  // トーンマッピングはレンダラー全体に効くため、展示中だけ切り替えて退出時に戻す
  private readonly prevToneMapping: THREE.ToneMapping;
  private readonly prevExposure: number;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    readonly speciesId: string,
  ) {
    this.prevToneMapping = renderer.toneMapping;
    this.prevExposure = renderer.toneMappingExposure;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    this.scene.background = new THREE.Color('#202826');
    this.scene.fog = new THREE.Fog('#202826', 19, 36);

    const w = renderer.domElement.clientWidth || window.innerWidth;
    const h = renderer.domElement.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 80);
    this.camera.position.set(0.4, 5, 20.5);

    this.scene.add(new THREE.AmbientLight('#d8e3dc', 1.9));
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
    this.scene.add(keyLight);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(7.8, 8.1, 0.32, 48),
      new THREE.MeshStandardMaterial({ color: '#4A4337', roughness: 0.92, metalness: 0 }),
    );
    pedestal.position.y = -0.18;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(7.75, 0.055, 6, 64),
      new THREE.MeshStandardMaterial({ color: '#8A7654', roughness: 0.8 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.005;
    this.scene.add(rim);

    const views = buildDinoModel(speciesId);
    if (!views) throw new Error(`no 3d model for ${speciesId}`);
    this.skeleton = views.skeleton;
    this.living = views.living;
    this.scene.add(this.skeleton, this.living);
    this.setOpacity(this.skeleton, 1);
    this.setOpacity(this.living, 0);

    // 実寸レンジ(アンモナイト0.3m〜ブラキオ23m)に対応するため、
    // モデルのバウンディングボックスからカメラ・台座・霧をフィットさせる
    const bounds = new THREE.Box3().setFromObject(this.living);
    bounds.union(new THREE.Box3().setFromObject(this.skeleton));
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    const fitDist = Math.max(radius * 2.4, 1.2);
    this.camera.position.set(center.x, center.y + radius * 0.55, fitDist + center.z);
    this.camera.near = fitDist / 100;
    this.camera.far = fitDist * 8;
    this.camera.updateProjectionMatrix();
    this.scene.fog = new THREE.Fog('#202826', fitDist * 1.4, fitDist * 3.2);
    const stageScale = Math.max(radius / 7.8, 0.04);
    pedestal.scale.setScalar(stageScale);
    pedestal.position.y = -0.18 * stageScale;
    rim.scale.setScalar(stageScale);
    rim.position.y = -0.005 * stageScale;
    keyLight.position.set(radius * 0.9, radius * 1.55, radius * 1.05);
    const shadowSpan = Math.max(radius * 1.25, 0.6);
    keyLight.shadow.camera.left = -shadowSpan;
    keyLight.shadow.camera.right = shadowSpan;
    keyLight.shadow.camera.top = shadowSpan;
    keyLight.shadow.camera.bottom = -shadowSpan * 0.5;
    keyLight.shadow.camera.near = radius * 0.1 + 0.05;
    keyLight.shadow.camera.far = radius * 4.5 + 4;
    keyLight.shadow.camera.updateProjectionMatrix();

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.target.set(center.x, center.y, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = fitDist * 0.35;
    this.controls.maxDistance = fitDist * 1.6;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = Math.PI / 2.03;
    this.controls.update();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.transitionMs = reducedMotion ? 0 : 650;
  }

  private setOpacity(root: THREE.Object3D, opacity: number): void {
    root.visible = opacity > 0.002;
    root.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        material.transparent = true;
        material.opacity = opacity;
        material.depthWrite = opacity > 0.42;
      }
    });
  }

  setView(view: ExhibitView): void {
    if (this.view === view && !this.transitionActive) return;
    this.view = view;
    this.transitionFrom = this.livingOpacity;
    this.transitionTo = view === 'living' ? 1 : 0;
    this.transitionStart = performance.now();
    this.transitionActive = this.transitionMs > 0;
    if (!this.transitionActive) {
      this.livingOpacity = this.transitionTo;
      this.setOpacity(this.skeleton, 1 - this.livingOpacity);
      this.setOpacity(this.living, this.livingOpacity);
    }
  }

  update(): void {
    if (this.transitionActive) {
      const progress = Math.min((performance.now() - this.transitionStart) / this.transitionMs, 1);
      const eased = progress * progress * (3 - 2 * progress);
      this.livingOpacity = THREE.MathUtils.lerp(this.transitionFrom, this.transitionTo, eased);
      this.setOpacity(this.skeleton, 1 - this.livingOpacity);
      this.setOpacity(this.living, this.livingOpacity);
      if (progress >= 1) this.transitionActive = false;
    }
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
    this.renderer.toneMapping = this.prevToneMapping;
    this.renderer.toneMappingExposure = this.prevExposure;
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) material.dispose();
      }
    });
  }
}
