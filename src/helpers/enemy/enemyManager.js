import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { base64ToBlob } from "../ui/imageLoader";

export class EnemyManager {
  constructor(scene, camera, textureUrl) {
    this.scene = scene;
    this.camera = camera;
    this.enemies = [];
    this.textureUrl = textureUrl || './textures/scary.png';

    // Wave system properties
    this.waveNumber = 0;
    this.waveInProgress = false;
    this.waveCooldown = 10;
    this.cooldownTimer = 0;

    // Enemy spawn properties
    this.enemiesToSpawn = 0;
    this.spawnedEnemies = 0;
    this.baseSpawnInterval = 3; // Base time between spawns
    this.spawnInterval = this.getNextSpawnInterval(); // Randomized spawn interval
    this.spawnTimer = 0;

    this.enemyLifetime = 25;
    this.killCount = 0;

    this._cameraPos = new THREE.Vector3();
  }

  getNextSpawnInterval() {
    const variance = 0.5;
    return this.baseSpawnInterval + (Math.random() * variance * 2 - variance);
  }

  spawnEnemy() {
    const spawnPos = new THREE.Vector3(
      Math.random() * 40 - 20,
      1.5,
      Math.random() * 40 - 20
    );

    let textureUrl = this.textureUrl;
    const base64Image = localStorage.getItem('enemyTexture');
    if (base64Image) {
      const blob = base64ToBlob(base64Image, 'image/png');
      textureUrl = URL.createObjectURL(blob);
    }

    const enemy = new Enemy(this.scene, spawnPos, textureUrl);
    enemy.spawnedAt = performance.now() / 1000;
    this.enemies.push(enemy);
  }

  update(delta, playerHealth) {
    const now = performance.now() / 1000;

    if (!this.waveInProgress && this.enemies.length === 0) {
      this.cooldownTimer += delta;
      if (this.cooldownTimer >= this.waveCooldown) {
        this.waveNumber++;
        this.enemiesToSpawn = 5 + this.waveNumber * 2;
        this.spawnedEnemies = 0;
        this.spawnTimer = 0;
        this.spawnInterval = this.getNextSpawnInterval();
        this.waveInProgress = true;
        this.cooldownTimer = 0;
      }
    }

    if (this.waveInProgress && this.spawnedEnemies < this.enemiesToSpawn) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnEnemy();
        this.spawnedEnemies++;
        this.spawnTimer = 0;
        this.spawnInterval = this.getNextSpawnInterval();
      }
    }

    if (this.waveInProgress && this.spawnedEnemies >= this.enemiesToSpawn && this.enemies.length === 0) {
      this.waveInProgress = false;
    }

    // Get player position
    this.camera.getWorldPosition(this._cameraPos);

    this.enemies = this.enemies.filter(enemy => {
      const age = now - enemy.spawnedAt;

      if (!enemy.alive || age > this.enemyLifetime) {
        if (enemy.mesh) {
          this.scene.remove(enemy.mesh);
          enemy.mesh.geometry.dispose();
          enemy.mesh.material.dispose();
        }

        if (!enemy.alive) {
          this.killCount++;
          const killsDisplay = document.getElementById('kills');
          if (killsDisplay) killsDisplay.textContent = String(this.killCount);
        }

        return false;
      }

      enemy.update(this._cameraPos, delta);

      const dist = enemy.mesh.position.distanceTo(this._cameraPos);
      if (dist <= enemy.minDistanceToPlayer) {
        playerHealth.damageTimer += delta;
        if (playerHealth.damageTimer >= playerHealth.damageInterval) {
          playerHealth.damageTimer = 0;
          playerHealth.current = Math.max(0, playerHealth.current - 10);
        }
      } else {
        playerHealth.damageTimer = 0;
      }

      return true;
    });
  }
}
