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
  
      this.timeSinceLastShot = 0;
    }
  }  
}

export default Gun;
