import * as THREE from 'three';
import { triggerRecoil } from './gunAnimation.js';
import { triggerMuzzleFlash } from './gunAnimation.js';
import { getMuzzleWorldPosition } from './gunAnimation.js';
import { playSound } from '../sounds/audio.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { cos, oscTriangle } from 'three/tsl';

class Gun {
  constructor(camera, scene, rapierWorld, enemies) {
    this._shootOrigin = new THREE.Vector3();
    this._shootDir = new THREE.Vector3();

    this.camera = camera;

    this.scene = scene;
    this.enemies = enemies;
    this.rapierWorld = rapierWorld;

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

  update(delta, controls, rapierWorld) {
    this.timeSinceLastShot += delta;

    if (!controls.isLocked) return;

    if (this.isMouseDown && this.timeSinceLastShot >= this.cooldown) {
      const origin = getMuzzleWorldPosition();
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction).normalize();

      if (origin) {
        const ray = new RAPIER.Ray(origin, direction);
        const hit = this.rapierWorld.castRay(ray, 100, true); // true = solid

        const length = 10; // how far the ray visually extends
        const arrowHelper = new THREE.ArrowHelper(direction.clone().normalize(), origin.clone(), length, 0xffff00);
        this.scene.add(arrowHelper);

        // Auto-remove after 0.1s
        setTimeout(() => {
          this.scene.remove(arrowHelper);
        }, 100);

        if (hit) {
          const collider = hit.collider
          if (collider?.userData?.type === 'enemy') {
            console.log(`Hit enemy ID: ${collider.userData.enemyId}`);
            collider.userData.enemyRef.takeDamage(10);
          }
        }
      }

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

export default Gun;
