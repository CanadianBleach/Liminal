import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

export default class Bullet {
  constructor(position, direction, rapierWorld, scene) {
    this.speed = 150;
    this.lifetime = 2; // seconds
    this.spawnTime = performance.now() / 1000;
    this.hitEnemies = new Set();

    // Create dynamic rigid body
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
    this.body = rapierWorld.createRigidBody(desc);

    // Collider
    const colliderDesc = RAPIER.ColliderDesc.ball(0.05);
    this.collider = rapierWorld.createCollider(colliderDesc, this.body);

    // Set velocity
    const velocity = direction.clone().multiplyScalar(this.speed);
    this.body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);

    // Mesh
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  update(delta, scene, enemyManager) {
    const pos = this.body.translation();
    this.mesh.position.set(pos.x, pos.y, pos.z);

    const now = performance.now() / 1000;
    if (now - this.spawnTime > this.lifetime) {
      scene.remove(this.mesh);
      return false;
    }

    // --- Enhanced hit detection ---
    const bulletPos = this.getPosition();
    for (const enemy of enemyManager.enemies) {
      if (!enemy.alive || this.hitEnemies.has(enemy)) continue;

      const dist = bulletPos.distanceTo(enemy.mesh.position);
      if (dist < 1.0) {
        enemy.takeDamage(10);
        this.hitEnemies.add(enemy);
        scene.remove(this.mesh);
        return false;
      }
    }

    return true;
  }

  getPosition() {
    const pos = this.body.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }
}
