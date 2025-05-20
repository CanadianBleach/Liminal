import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { base64ToBlob } from '../ui/imageLoader.js';
import { playSound } from '../sounds/audio.js';


export class EnemyManager {
  constructor(scene, camera, rapierWorld, playerController) {
    this.playerController = playerController;

    this.scene = scene;
    this.camera = camera;
    this.rapierWorld = rapierWorld;

    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = 5; // seconds
    this._cameraPos = new THREE.Vector3();
    this.waveNumber = 1; // ✅ start at wave 1

    this.waveInProgress = true;

    this.killsNeededForNextRound = 10; // Starting requirement
    this.killCount = 0; // Local tracker to avoid syncing back to player each time

    this.enemyTypes = {
      scary: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 50,
        size: 1,
        texture: '/textures/scary.png',
        tier: 1,
        onDeathEffect: 'blood_splatter'
      },

      nugget: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 50,
        size: 1,
        texture: '/textures/shadow.png', // ✅ your new image
        tier: 1,
        onDeathEffect: 'blood_splatter'
      },

      custom: {
        health: 100,
        speed: 1.5,
        damage: 10,
        pointValue: 75,
        size: 1,
        texture: null, // placeholder, we’ll override it dynamically
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

    // 🔽 Handle 'custom' texture from localStorage
    if (typeKey === 'custom') {
      const base64Image = localStorage.getItem('enemyTexture');
      if (base64Image) {
        const blob = base64ToBlob(base64Image, 'image/png');
        typeCfg.texture = URL.createObjectURL(blob);
      } else {
        console.warn("Custom enemy selected but no 'enemyTexture' found in localStorage.");
        return; // Skip spawning if no custom image
      }
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      typeCfg.texture,
      (texture) => {
        const enemy = new Enemy(this.scene, this.rapierWorld, pos, texture, typeCfg, this.playerController);
        this.enemies.push(enemy);
      },
      undefined,
      (err) => console.error(`Failed to load texture for ${typeKey}`, err)
    );
  }
  checkRoundProgress(playerState) {
    if (playerState.killCount >= this.killsNeededForNextRound) {
      this.waveNumber++;
      this.waveInProgress = true;

      // Scale difficulty: increase kill requirement exponentially or linearly
      this.killsNeededForNextRound += Math.floor(5 + this.waveNumber * 2);

      console.log(`New wave: ${this.waveNumber}, next at ${this.killsNeededForNextRound} kills`);

      // Optional: Trigger audio/visual feedback
      playSound('round_change');
    }
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
    this.checkRoundProgress(playerState);

  }
}
