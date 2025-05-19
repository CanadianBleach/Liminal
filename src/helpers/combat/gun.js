import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { playSound } from '../sounds/audio.js';

export default class Gun {
  constructor(camera, scene, rapierWorld, enemies) {
    this.camera = camera;
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.enemies = enemies;

    this.gunMesh = null;
    this.muzzleFlashMesh = null;
    this.muzzleFlashLight = null;

    this.recoilOffset = 0;
    this.recoilVelocity = 0;
    this.bobTime = 0;
    this.lastYaw = 0;
    this.swayOffset = new THREE.Vector3();
    this.isMoving = false;
    this.isSprinting = false;
    this.muzzleFlashTimer = 0;

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

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/models/fps_mine_sketch_galil.glb');
    this.gunMesh = gltf.scene;
    this.gunMesh.scale.set(0.5, 0.5, 0.5);
    this.gunMesh.position.set(0, 1, -2);
    this.gunMesh.rotation.set(0, 0, 0);
    this.camera.add(this.gunMesh);
    this.attachMuzzleFlash();
  }

  attachMuzzleFlash() {
    const texture = new THREE.TextureLoader().load('/textures/muzzle1.png');
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(5, 5);
    this.muzzleFlashMesh = new THREE.Mesh(geo, mat);
    this.muzzleFlashMesh.position.set(0.375, -0.175, -3);
    this.gunMesh.add(this.muzzleFlashMesh);

    this.muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 5);
    this.muzzleFlashLight.position.set(0.375, -0.15, -3);
    this.gunMesh.add(this.muzzleFlashLight);
  }

  update(delta, controls) {
    this.timeSinceLastShot += delta;
    this.updateAnimation(delta, controls);

    if (!controls.isLocked) return;
    if (this.isMouseDown && this.timeSinceLastShot >= this.cooldown) {
      const origin = this.getMuzzleWorldPosition();
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction).normalize();

      const ray = new RAPIER.Ray(origin, direction);
      const hit = this.rapierWorld.castRay(ray, 100, true);
      if (hit) {
        const collider = hit.collider;
        if (collider?.userData?.type === 'enemy') {
          collider.userData.enemyRef.takeDamage(10);
        }
      }

      this.triggerRecoil();
      this.triggerMuzzleFlash();
      const variant = Math.floor(Math.random() * 3) + 1;
      playSound(`gunshot_${variant}`);
      this.timeSinceLastShot = 0;
    }
  }

  updateAnimation(delta, controls) {
    const currentYaw = this.camera.rotation.y;
    const yawDelta = currentYaw - this.lastYaw;
    const maxSway = 0.25;
    const targetX = THREE.MathUtils.clamp(-yawDelta * 2, -maxSway, maxSway);
    this.swayOffset.x = THREE.MathUtils.lerp(this.swayOffset.x, targetX, delta * 15);
    this.lastYaw = currentYaw;

    this.bobTime += delta * (this.isMoving ? (this.isSprinting ? 16 : 8) : 1.5);
    const bobAmount = this.isMoving ? (this.isSprinting ? 0.1 : 0.05) : 0.01;
    const bobOffsetY = Math.sin(this.bobTime) * bobAmount;
    const bobOffsetX = Math.cos(this.bobTime * 0.5) * bobAmount * 0.5;

    this.recoilVelocity += (0 - this.recoilOffset) * 9 * delta;
    this.recoilVelocity *= 0.8;
    this.recoilOffset += this.recoilVelocity;

    this.gunMesh.position.set(
      0 + this.swayOffset.x + bobOffsetX,
      -0.15 + bobOffsetY,
      0.2 + this.recoilOffset
    );

    if (this.muzzleFlashMesh?.material?.opacity > 0) {
      this.muzzleFlashTimer -= delta;
      const fade = Math.max(0, this.muzzleFlashTimer * 50);
      this.muzzleFlashMesh.material.opacity = fade;
      this.muzzleFlashLight.intensity = fade * 100;
    }
  }

  triggerRecoil() {
    this.recoilVelocity = 0.07;
  }

  triggerMuzzleFlash() {
    if (!this.muzzleFlashMesh) return;
    this.muzzleFlashMesh.material.opacity = 1;
    this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
    const scale = THREE.MathUtils.randFloat(0.3, 0.6);
    this.muzzleFlashMesh.scale.setScalar(scale);
    this.muzzleFlashTimer = 0.05;
    if (this.muzzleFlashLight) this.muzzleFlashLight.intensity = 10;
  }

  getMuzzleWorldPosition() {
    if (!this.muzzleFlashMesh) return null;
    const worldPos = new THREE.Vector3();
    this.muzzleFlashMesh.getWorldPosition(worldPos);
    return worldPos;
  }

  setMovementState({ moving, sprinting }) {
    this.isMoving = moving;
    this.isSprinting = sprinting;
  }
}
