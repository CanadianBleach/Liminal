import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { base64ToBlob } from '../ui/imageLoader';

export class EnemyManager {
  constructor(scene, camera, rapierWorld) {
    this.scene = scene;
    this.camera = camera;
    this.rapierWorld = rapierWorld;

    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 5; // seconds
    this._cameraPos = new THREE.Vector3();
  }

  spawnEnemy() {
    console.log("SPAWNING");

    const pos = new THREE.Vector3(Math.random() * 20 - 10, 1.5, Math.random() * 20 - 10);

    let imageUrl = null;
    const base64Image = localStorage.getItem('enemyTexture');
    if (base64Image) {
      const blob = base64ToBlob(base64Image, 'image/png');
      imageUrl = URL.createObjectURL(blob);
    }

    if (!imageUrl) {
      imageUrl = '/public/textures/scary.png';
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      imageUrl,
      (texture) => {
        const enemy = new Enemy(this.scene, this.rapierWorld, pos, texture);
        this.enemies.push(enemy);
      },
      undefined,
      (err) => {
        console.error('Failed to load enemy texture:', err);
      }
    );
  }



  update(delta) {
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

      enemy.update(delta, this._cameraPos);
      return true;
    });
  }
}
