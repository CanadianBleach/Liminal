import * as THREE from 'three';
import { triggerRecoil } from '../player/gunAnimation.js';
import { triggerMuzzleFlash } from '../player/gunAnimation.js';
import { attachGun } from '../player/gunAnimation.js';
import { getMuzzleWorldPosition } from '../player/gunAnimation.js';
import { playSound } from '../sounds/audio.js';



class Gun {
  constructor(bulletManager, camera) {
    this._shootOrigin = new THREE.Vector3();
    this._shootDir = new THREE.Vector3();

    this.bulletManager = bulletManager;
    this.camera = camera;

    this.cooldown = 0.15;
    this.timeSinceLastShot = 0;
    this.isMouseDown = false;

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.isMouseDown = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
    });
  }

  update(delta, controls) {
    this.timeSinceLastShot += delta;

    if (!controls.isLocked) return;

    if (this.isMouseDown && this.timeSinceLastShot >= this.cooldown) {
      const shootOrigin = getMuzzleWorldPosition();
      const shootDir = new THREE.Vector3();
      this.camera.getWorldDirection(shootDir).normalize();

      if (shootOrigin) {
        this.bulletManager.shoot(shootOrigin, shootDir);
        triggerRecoil();
        triggerMuzzleFlash();
        const variant = Math.floor(Math.random() * 3) + 1;
        playSound(`gunshot_${variant}`);


        const crosshair = document.getElementById("crosshair");
        const lines = document.querySelectorAll("#crosshair .line");

        crosshair.classList.remove("crosshair-spread");
        void crosshair.offsetWidth;
        crosshair.classList.add("crosshair-spread");

        setTimeout(() => {
          crosshair.classList.remove("crosshair-spread");
        }, 100);

        const flashColors = ['white', 'orange', 'yellow', 'red'];
        const color = flashColors[Math.floor(Math.random() * flashColors.length)];

        lines.forEach((line) => {
          line.classList.remove("crosshair-flash");
          line.style.backgroundColor = color;
          void line.offsetWidth;
          line.classList.add("crosshair-flash");

          setTimeout(() => {
            line.classList.remove("crosshair-flash");
            line.style.backgroundColor = 'white';
          }, 150);
        });

        this.timeSinceLastShot = 0;
      }
    }
  }

  handleBulletCollisions(enemies) {
    for (const bullet of this.bulletManager.bullets) {
      for (const enemy of enemies) {
        if (!enemy.alive || !enemy.mesh) continue;

        const bulletPos = bullet.getPosition();
        const enemyPos = enemy.mesh.position;
        const distance = bulletPos.distanceTo(enemyPos);

        if (distance < 0.6 && !bullet.hitEnemies.has(enemy)) {
          bullet.hitEnemies.add(enemy);
          enemy.takeDamage(10);

          if (!enemy.alive) {
            enemy.destroy();
          }

          bullet.markedForRemoval = true;
        }
      }
    }
  }
}

export default Gun;
