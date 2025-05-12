// /helpers/player/Gun.js
import * as THREE from 'three';
import { triggerRecoil } from '../helpers/player/gunAnimation.js';

class Gun {
  constructor(bulletManager, camera) {
    this._shootOrigin = new THREE.Vector3();
    this._shootDir = new THREE.Vector3();

    this.bulletManager = bulletManager;
    this.camera = camera;

    this.cooldown = 0.15; // seconds
    this.timeSinceLastShot = 0;
    this.isMouseDown = false;

    // Input tracking
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
      const shootOrigin = new THREE.Vector3();
      const shootDir = new THREE.Vector3();
  
      this.camera.getWorldPosition(shootOrigin);
      this.camera.getWorldDirection(shootDir).normalize();
      shootOrigin.add(shootDir.clone().multiplyScalar(0.5));
  
      this.bulletManager.shoot(shootOrigin, shootDir);
      triggerRecoil();
  
      // === Crosshair UI Effects ===
      const crosshair = document.getElementById("crosshair");
      const lines = document.querySelectorAll("#crosshair .line");
  
      // 1. Trigger spread effect on container
      crosshair.classList.remove("crosshair-spread");
      void crosshair.offsetWidth;
      crosshair.classList.add("crosshair-spread");
  
      setTimeout(() => {
        crosshair.classList.remove("crosshair-spread");
      }, 100);
  
      // 2. Flash one random color per shot
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

export default Gun;
