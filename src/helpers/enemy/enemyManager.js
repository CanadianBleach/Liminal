import * as THREE from 'three';
import { Enemy } from './enemy.js';

export class EnemyManager {
  constructor(scene, camera, textureUrl) {
    this.scene = scene;
    this.camera = camera;
    this.enemies = [];
    this.textureUrl = textureUrl || './textures/scary.png';

    this.spawnInterval = 8;
    this.spawnTimer = 0;
    this.timeElapsed = 0;
    this.killCount = 0;

    this.spawnRateMin = 1.5;
    this.spawnRateDecay = 0.95;
    this.lastRampTime = 0;

    this.enemyLifetime = 25;
    this._cameraPos = new THREE.Vector3(); // reusable
  }

  spawnEnemy(textureUrl = this.textureUrl) {
    const spawnPos = new THREE.Vector3(
      Math.random() * 40 - 20,
      1.5,
      Math.random() * 40 - 20
    );
    const enemy = new Enemy(this.scene, spawnPos, textureUrl);
    enemy.spawnedAt = performance.now() / 1000;
    this.enemies.push(enemy);
  }
  

  update(delta, playerHealth) {
    const now = performance.now() / 1000;
    this.spawnTimer += delta;
    this.timeElapsed += delta;

    // Spawn rate ramping
    if (now - this.lastRampTime > 20 && this.spawnInterval > this.spawnRateMin) {
      this.spawnInterval *= this.spawnRateDecay;
      this.spawnInterval = Math.max(this.spawnInterval, this.spawnRateMin);
      this.lastRampTime = now;
      console.log(`Spawn interval now: ${this.spawnInterval.toFixed(2)}s`);
    }

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Get player world position
    this.camera.getWorldPosition(this._cameraPos);

    // Update each enemy
    this.enemies = this.enemies.filter(enemy => {
      const age = now - enemy.spawnedAt;

      // Remove if dead or expired
      if (!enemy.alive || age > this.enemyLifetime) {
        if (enemy.mesh) {
          this.scene.remove(enemy.mesh);
          enemy.mesh.geometry.dispose();
          enemy.mesh.material.dispose();
        }

        if (!enemy.alive) {
          this.killCount++;
          const killsDisplay = document.getElementById('kills');
          if (killsDisplay) {
            killsDisplay.textContent = String(this.killCount);
          }
          console.log(`Enemy removed. Kill count: ${this.killCount}`);
        }

        return false; // remove from array
      }

      // Still alive – move and possibly damage player
      enemy.update(this._cameraPos, delta);

      const dist = enemy.mesh.position.distanceTo(this._cameraPos);
      if (dist <= enemy.minDistanceToPlayer) {
        playerHealth.damageTimer += delta;
        if (playerHealth.damageTimer >= playerHealth.damageInterval) {
          playerHealth.damageTimer = 0;
          playerHealth.current = Math.max(0, playerHealth.current - 10);
          console.log(`Player hit! Health: ${playerHealth.current}`);
        }
      } else {
        playerHealth.damageTimer = 0;
      }

      return true; // keep enemy
    });
  }
}
