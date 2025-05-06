import * as THREE from 'three';
import { Enemy } from './enemy.js';

export class EnemyManager {
  constructor(scene, camera, textureUrl) {
    this.scene = scene;
    this.camera = camera;
    this.enemies = [];
    this.textureUrl = textureUrl || './textures/scary.png';

    this.spawnInterval = 8; // seconds between spawns
    this.spawnTimer = 0;
    this.timeElapsed = 0;

    this.spawnRateMin = 1.5; // fastest possible spawn interval
    this.spawnRateDecay = 0.95; // how much to reduce interval every 20s
    this.lastRampTime = 0;

    this.enemyLifetime = 25; // seconds before enemy disappears
  }

  spawnEnemy() {
    const spawnPos = new THREE.Vector3(
      Math.random() * 40 - 20,
      1.5,
      Math.random() * 40 - 20
    );

    const enemy = new Enemy(this.scene, spawnPos, this.textureUrl);
    enemy.spawnedAt = performance.now() / 1000;
    this.enemies.push(enemy);
  }

  update(delta) {
    const now = performance.now() / 1000;
    this.spawnTimer += delta;
    this.timeElapsed += delta;

    // Decrease spawn interval every 20 seconds
    if (now - this.lastRampTime > 20 && this.spawnInterval > this.spawnRateMin) {
      this.spawnInterval *= this.spawnRateDecay;
      this.spawnInterval = Math.max(this.spawnInterval, this.spawnRateMin);
      this.lastRampTime = now;
      console.log(`Spawn interval now: ${this.spawnInterval.toFixed(2)}s`);
    }

    // Spawn new enemy if timer expired
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Update existing enemies
    this.enemies = this.enemies.filter(enemy => {
      const age = now - enemy.spawnedAt;
      if (age > this.enemyLifetime) {
        enemy.destroy();
        return false;
      } else {
        enemy.update(this.camera.position, delta);
        return true;
      }
    });
  }
}
