import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { flashDamageOverlay } from '../ui/ui.js';
import { base64ToBlob } from '../ui/imageLoader.js';

let enemyCounter = 0;

export class Enemy {
  constructor(scene, rapierWorld, position = new THREE.Vector3(0, 1.5, -5), texture = null, config = {}) {
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.id = enemyCounter++;
    this.alive = true;

    this.health = config.health ?? 100;
    this.moveSpeed = config.speed ?? 1.5;
    this.damageAmount = config.damage ?? 10;
    this.attackRadius = config.attackRadius ?? 1.5;
    this.pointValue = config.pointValue ?? 50;
    this.size = config.size ?? 1;

    this.hitFlashTime = 0;
    this.originalColor = new THREE.Color(0xffffff);
    this.damageInterval = 1.5;
    this.damageTimer = 0;
    this.minDistanceToPlayer = 1;

    this.texture = texture;
    this.mesh = this._createMesh(position);
    this.scene.add(this.mesh);

    this.collider = this._createCollider(position);

    this.onDeathEffect = config.onDeathEffect ?? null;
  }

  _createMesh(position) {
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      color: this.texture ? 0xffffff : 0xff00ff,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.5
    });

    const geometry = new THREE.PlaneGeometry(1 * this.size, 2 * this.size);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;

    return mesh;
  }

  _createCollider(position) {
    const desc = RAPIER.ColliderDesc.cuboid(0.5 * this.size, 1 * this.size, 0.05)
      .setTranslation(position.x, position.y, position.z)
      .setCollisionGroups(0b01 << 16 | 0b01)
      .setSensor(false)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    const collider = this.rapierWorld.createCollider(desc);
    collider.userData = {
      type: 'enemy',
      enemyId: this.id,
      enemyRef: this
    };
    return collider;
  }

  update(playerPosition, delta, playerState) {
    const dir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
    const dist = dir.length();

    const lookAtPos = new THREE.Vector3().copy(playerPosition);
    lookAtPos.y = this.mesh.position.y;
    this.mesh.lookAt(lookAtPos);

    if (dist > this.minDistanceToPlayer) {
      dir.normalize();
      this.mesh.position.add(dir.multiplyScalar(this.moveSpeed * delta));
    }

    this.collider.setTranslation({
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z
    }, true);

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= delta;
      if (this.hitFlashTime <= 0) {
        this.mesh.material.color.copy(this.originalColor);
      }
    }

    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
    if (distanceToPlayer < this.attackRadius) {
      this.damageTimer += delta;
      if (this.damageTimer >= this.damageInterval) {
        this.damageTimer = 0;
        playerState.health.current = Math.max(0, playerState.health.current - this.damageAmount);
        console.log(`Player damaged by enemy ${this.id}, health now:`, playerState.health.current);
        flashDamageOverlay(); 
      }
    } else {
      this.damageTimer = 0;
    }
  }

  takeDamage(amount) {
    if (!this.alive) return;

    this.health -= amount;
    if (this.mesh?.material) {
      this.mesh.material.color.set(0xff0000);
      this.hitFlashTime = 0.05;
    }

    if (this.health <= 0) {
      this.alive = false;
      this.destroy();
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
    }
    if (this.collider) {
      this.rapierWorld.removeCollider(this.collider, true);
    }
  }
}
