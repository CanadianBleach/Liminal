import * as THREE from 'three';
import { Enemy } from './enemy.js';

export class EnemyManager {
  constructor(scene, camera, rapierWorld) {
    this.scene = scene;
    this.camera = camera;
    this.rapierWorld = rapierWorld;

    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 5; // seconds
    this._cameraPos = new THREE.Vector3();
    this.waveNumber = 1; // ✅ start at wave 1

    this.enemyTypes = {
      grunt: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 50,
        size: 1,
        texture: '/textures/scary.png',
        tier: 1,
        onDeathEffect: 'blood_splatter'
      },

      shadow: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 50,
        size: 1,
        texture: '/textures/shadow.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter'
      }
      // Add more types later
    };
  }
  spawnEnemy() {
    const pos = new THREE.Vector3(Math.random() * 20 - 10, 1.5, Math.random() * 20 - 10);

    // Get eligible types by wave
    const eligibleTypes = Object.entries(this.enemyTypes)
      .filter(([_, cfg]) => cfg.tier <= this.waveNumber);

    if (eligibleTypes.length === 0) return;

    const [typeKey, typeCfg] = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      typeCfg.texture,
      (texture) => {
        const enemy = new Enemy(
          this.scene,
          this.rapierWorld,
          pos,
          texture,
          typeCfg // pass full config object
        );
        this.enemies.push(enemy);
      },
      undefined,
      (err) => console.error(`Failed to load texture for ${typeKey}`, err)
    );
  }

  update(delta, playerState) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    this.camera.getWorldPosition(this._cameraPos);

    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.alive) {
        enemy.destroy();
        return false;
      }

      enemy.update(this._cameraPos, delta, playerState);
      return true;
    });
  }
}
