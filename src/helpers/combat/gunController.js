// GunController.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { playSound } from '../sounds/audio.js';
import RAPIER from '@dimforge/rapier3d-compat';

export default class GunController extends THREE.Object3D {
  constructor(camera, rapierWorld, enemies, config) {
    super();
    this.camera = camera;
    this.rapierWorld = rapierWorld;
    this.enemies = enemies;
    this.config = config;

    // Core props
    this.cooldown = config.fireRate;
    this.damage = config.damage;
    this.recoilStrength = config.recoil ?? 0.07;
    this.modelPath = config.model;
    this.texturePath = config.texture;
    this.modelScale = config.modelScale || [1, 1, 1];
    this.modelOffset = config.modelOffset || [0, 0, 0];
    this.flashSize = config.muzzleFlashSize || [5, 5];

    // State
    this.model = null;
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
    const gltf = await loader.loadAsync(this.modelPath);
    this.model = gltf.scene;
    this.model.scale.set(...this.modelScale);
    this.model.position.set(...this.modelOffset);
    this.add(this.model);
    this.attachMuzzleFlash();
  }

  attachMuzzleFlash() {
    const texture = new THREE.TextureLoader().load(this.texturePath);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(...this.flashSize);
    this.muzzleFlashMesh = new THREE.Mesh(geo, mat);
    this.muzzleFlashMesh.position.set(0.375, -0.175, -3);
    this.add(this.muzzleFlashMesh);

    this.muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 5);
    this.muzzleFlashLight.position.set(0.375, -0.15, -3);
    this.add(this.muzzleFlashLight);
  }

  update(delta, controls) {
    this.timeSinceLastShot += delta;
    this.updateAnimation(delta);

    if (!controls.isLocked) return;
    if (this.isMouseDown && this.timeSinceLastShot >= this.cooldown) {
      this.handleFire();
      this.timeSinceLastShot = 0;
    }
  }

  handleFire() {
    const origin = this.getMuzzleWorldPosition();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction).normalize();

    const ray = new RAPIER.Ray(origin, direction);
    const hit = this.rapierWorld.castRay(ray, 100, true);
    if (hit) {
      const collider = hit.collider;
      if (collider?.userData?.type === 'enemy') {
        collider.userData.enemyRef.takeDamage(this.damage);
      }
    }

    this.triggerRecoil();
    this.triggerMuzzleFlash();
    const variant = Math.floor(Math.random() * 3) + 1;
    playSound(`gunshot_${variant}`);
  }

  updateAnimation(delta) {
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

    this.position.set(
      this.swayOffset.x + bobOffsetX,
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
    this.recoilVelocity = this.recoilStrength;
  }

  triggerMuzzleFlash() {
    this.muzzleFlashMesh.material.opacity = 1;
    this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
    const scale = THREE.MathUtils.randFloat(0.3, 0.6);
    this.muzzleFlashMesh.scale.setScalar(scale);
    this.muzzleFlashTimer = 0.05;
    this.muzzleFlashLight.intensity = 10;
  }

  getMuzzleWorldPosition() {
    const worldPos = new THREE.Vector3();
    this.muzzleFlashMesh.getWorldPosition(worldPos);
    return worldPos;
  }

  setMovementState({ moving, sprinting }) {
    this.isMoving = moving;
    this.isSprinting = sprinting;
  }
}