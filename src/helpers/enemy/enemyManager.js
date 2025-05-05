// EnemyManager.js
import * as THREE from 'three';
import { Enemy } from './enemy.js';
export class EnemyManager {
  constructor(scene, camera, textureUrl) {
    this.scene = scene;
    this.camera = camera;
    this.enemies = [];

    this.textureUrl = './textures/scary.png'

    this.spawnInterval = 8; // seconds between spawns (start slow)
    this.spawnTimer = 0;
    this.timeElapsed = 0;

    this.spawnRateMin = 1.5; // min interval between spawns
    this.spawnRateDecay = 0.95; // decrease interval by this factor every 20 sec
    this.lastRampTime = 0;

    this.enemyLifetime = 25; // seconds before enemy disappears
  }

  spawnEnemy(textureUrl) {
    const spawnPos = new THREE.Vector3(
      Math.random() * 40 - 20,
      1.5,
      Math.random() * 40 - 20
    );
    const enemy = new Enemy(this.scene, spawnPos, textureUrl);
    enemy.spawnedAt = performance.now() / 1000;
    this.enemies.push(enemy);
  }

  update(delta) {
    const now = performance.now() / 1000;
    this.spawnTimer += delta;
    this.timeElapsed += delta;

    // Ramping difficulty over time
    if (now - this.lastRampTime > 20 && this.spawnInterval > this.spawnRateMin) {
      this.spawnInterval *= this.spawnRateDecay;
      this.spawnInterval = Math.max(this.spawnInterval, this.spawnRateMin);
      this.lastRampTime = now;
      console.log(`Spawn interval now: ${this.spawnInterval.toFixed(2)}s`);
    }

    // Spawn enemy
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy(this.textureUrl);
      this.spawnTimer = 0;
    }

    // Update and cull enemies
    this.enemies = this.enemies.filter(enemy => {
      const age = now - enemy.spawnedAt;
      if (age > this.enemyLifetime) {
        this.scene.remove(enemy.mesh);
        enemy.mesh.geometry.dispose();
        enemy.mesh.material.dispose();
        return false;
      } else {
        enemy.update(this.camera.position, delta);
        return true;
      }
    });
  }
}
