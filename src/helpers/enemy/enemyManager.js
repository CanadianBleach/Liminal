import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { base64ToBlob } from '../ui/imageLoader.js';
import { playSound } from '../sounds/audio.js';
import { enemyTypes } from './enemyConfig.js';


export class EnemyManager {
  constructor(scene, camera, rapierWorld, playerController) {
    this.playerController = playerController;
    this.roundStartDelay = 10;
    this.roundDelayTimer = 0;
    this.readyToSpawn = false;


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
    this.enemiesSpawnedThisRound = 0;
    this.killsThisRound = 0;
    this.killCount = 0; // Local tracker to avoid syncing back to player each time
  }

  spawnEnemy() {
    if (!this.waveInProgress) return;

    if (this.enemiesSpawnedThisRound >= this.killsNeededForNextRound) {
      this.waveInProgress = false;
      return; // Stop spawning for now
    }

    const pos = new THREE.Vector3(Math.random() * 20 - 10, 1.5, Math.random() * 20 - 10);

    const eligibleTypes = Object.entries(enemyTypes)
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
        return;
      }
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      typeCfg.texture,
      (texture) => {
        const enemy = new Enemy(this.scene, this.rapierWorld, pos, texture, typeCfg, this.playerController, this);
        this.enemies.push(enemy);
        this.enemiesSpawnedThisRound++;
      },
      undefined,
      (err) => console.error(`Failed to load texture for ${typeKey}`, err)
    );
  }


  checkRoundProgress(playerState) {
    if (this.killsThisRound >= this.killsNeededForNextRound && !this.waveInProgress) {
      this.waveNumber++;
      this.killsNeededForNextRound += Math.floor(5 + this.waveNumber * 2);

      this.killsThisRound = 0;
      this.enemiesSpawnedThisRound = 0;
      this.waveInProgress = true;

      this.readyToSpawn = false;       // ⬅️ Delay next wave start
      this.roundDelayTimer = 0;        // ⬅️ Reset the timer

      console.log(`New wave: ${this.waveNumber}, need ${this.killsNeededForNextRound} kills next round`);
    }
  }

  update(delta, playerState) {
    if (this.readyToSpawn) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnEnemy();
        this.spawnTimer = 0;
      }
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

    // Handle round start delay
    if (!this.readyToSpawn) {
      this.roundDelayTimer += delta;
      if (this.roundDelayTimer >= this.roundStartDelay) {
        this.readyToSpawn = true;
        console.log(`Wave ${this.waveNumber} spawning begins`);
      }
    }
  }
}
