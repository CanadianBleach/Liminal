import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

export default class Bullet {
  constructor(position, direction, rapierWorld, scene) {
    this.speed = 50;
    this.lifetime = 2; // seconds
    this.spawnTime = performance.now() / 1000;
    this.hitEnemies = new Set();

    
    // Create dynamic rigid body
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
    this.body = rapierWorld.createRigidBody(desc);

    // Create small sphere collider
    const colliderDesc = RAPIER.ColliderDesc.ball(0.05);
    this.collider = rapierWorld.createCollider(colliderDesc, this.body);

    // Apply velocity in shoot direction
    const velocity = direction.clone().multiplyScalar(this.speed);
    this.body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);

console.log('Bullet direction:', direction.toArray());
console.log('Velocity set:', velocity.toArray());

    // Create visible mesh
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  update(delta, scene) {
    const pos = this.body.translation();
    this.mesh.position.set(pos.x, pos.y, pos.z);

    const now = performance.now() / 1000;
    if (now - this.spawnTime > this.lifetime) {
      scene.remove(this.mesh);
      return false; // expired
    }

    return true; // active
  }

  getPosition() {
    const pos = this.body.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }
  
} 