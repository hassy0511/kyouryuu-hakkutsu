import * as THREE from 'three';

const POOL_SIZE = 96;
const GRAVITY = 14;

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

// 削った破片の飛び散り。小さな箱を InstancedMesh でプール再利用する
export class DebrisParticles {
  readonly mesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private cursor = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();

  constructor() {
    const geo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    const mat = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.InstancedMesh(geo, mat, POOL_SIZE);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 1,
      });
      this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, new THREE.Color(0xffffff));
    }
  }

  burst(center: THREE.Vector3, color: THREE.Color, count: number): void {
    for (let n = 0; n < count; n++) {
      const p = this.particles[this.cursor]!;
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      p.pos.copy(center);
      p.vel.set(
        (Math.random() - 0.5) * 3.2,
        1.8 + Math.random() * 2.6,
        (Math.random() - 0.5) * 3.2,
      );
      p.maxLife = 0.45 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.size = 0.6 + Math.random() * 0.8;
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    this.particles.forEach((p, i) => {
      if (p.life <= 0) return;
      p.life -= dt;
      p.vel.y -= GRAVITY * dt;
      p.pos.addScaledVector(p.vel, dt);
      const k = Math.max(p.life / p.maxLife, 0) * p.size;
      this.q.setFromEuler(new THREE.Euler(p.life * 7, p.life * 9, 0));
      this.m.compose(p.pos, this.q, this.s.set(k, k, k));
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
