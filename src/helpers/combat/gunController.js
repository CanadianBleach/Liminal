import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { playSound } from '../sounds/audio.js';
import RAPIER from '@dimforge/rapier3d-compat';

export default class GunController extends THREE.Object3D {
  constructor(camera, scene, rapierWorld, enemies, config = {}) {
    super();
    this.camera = camera;
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.enemies = enemies;
    this.config = config;

    // Core config
    this.cooldown = config.fireRate ?? 0.15;
    this.damage = config.damage ?? 10;
    this.recoilStrength = config.recoil ?? 0.07;
    this.modelPath = config.model ?? '/models/fps_mine_sketch_galil.glb';
    this.texturePath = config.texture ?? '/textures/muzzle1.png';
    this.modelScale = config.modelScale ?? [0.5, 0.5, 0.5];
    this.modelOffset = config.modelOffset ?? [0, -1, -2];
    this.modelRotation = config.modelRotation ?? [0, 0, 0];
    this.flashSize = config.muzzleFlashSize ?? [5, 5];
    this.fireMode = config.fireMode ?? 'auto'; // 'auto', 'semi', 'burst'
    this.burstCount = config.burstCount ?? 3;

    // ADS
    this.canADS = config.canADS ?? false;
    this.adsOffset = config.adsOffset ?? [0, -0.15, -0.3];
    this.defaultOffset = this.modelOffset;
    this.adsFOV = config.adsFOV ?? 45;
    this.defaultFOV = this.camera.fov;
    this.isAiming = false;

    // Ammo
    this.maxAmmo = config.ammoCapacity ?? 90;
    this.clipSize = config.clipSize ?? 30;
    this.currentAmmo = this.clipSize;
    this.reserveAmmo = this.maxAmmo - this.clipSize;
    this.isReloading = false;
    this.reloadTime = config.reloadTime ?? 2.0;
    this.reloadTimer = 0;

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
    this.hasFiredSinceMouseDown = false;

    // Burst fire state
    this.burstShotsRemaining = 0;
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.modelPath);

    this.model = gltf.scene;

    // Create a wrapper group
    const wrapper = new THREE.Group();
    wrapper.add(this.model);

    // Set wrapper's position/scale
    wrapper.scale.set(...this.modelScale);
    wrapper.position.set(...this.modelOffset);

    // 👇 Make the wrapper look forward
    const target = new THREE.Vector3();
    this.camera.getWorldDirection(target);
    target.multiplyScalar(10).add(this.camera.position);
    wrapper.lookAt(target);

    // 👇 Apply model rotation INSIDE the wrapper
    if (this.modelRotation) {
      this.model.rotation.set(...this.modelRotation);
    }

    this.add(wrapper);

    // Viewmodel layer
    wrapper.traverse(obj => obj.layers.set(1));

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
    this.muzzleFlashMesh.layers.set(1);
    this.add(this.muzzleFlashMesh);

    this.muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 5);
    this.muzzleFlashLight.position.set(0.375, -0.15, -3);
    this.muzzleFlashLight.layers.enable(1);
    this.add(this.muzzleFlashLight);
  }


  update(delta, controls) {
    if (this.isReloading) {
      this.reloadTimer += delta;
      if (this.reloadTimer >= this.reloadTime) {
        const needed = this.clipSize - this.currentAmmo;
        const toReload = Math.min(needed, this.reserveAmmo);
        this.currentAmmo += toReload;
        this.reserveAmmo -= toReload;
        this.isReloading = false;
      }
      return;
    }

    this.timeSinceLastShot += delta;
    this.updateAnimation(delta);

    if (!controls.isLocked) return;
    const readyToFire = this.timeSinceLastShot >= this.cooldown;

    switch (this.fireMode) {
      case 'auto':
        if (this.isMouseDown && readyToFire) {
          this.handleFire();
          this.timeSinceLastShot = 0;
        }
        break;

      case 'semi':
        if (this.isMouseDown && readyToFire && !this.hasFiredSinceMouseDown) {
          this.handleFire();
          this.timeSinceLastShot = 0;
          this.hasFiredSinceMouseDown = true;
        }
        break;

      case 'burst':
        if (this.burstShotsRemaining > 0 && readyToFire) {
          this.handleFire();
          this.timeSinceLastShot = 0;
          this.burstShotsRemaining--;
        }
        break;

      case 'pump':
        if (this.isMouseDown && readyToFire && !this.hasFiredSinceMouseDown) {
          this.handleFire();
          this.timeSinceLastShot = 0;
          this.hasFiredSinceMouseDown = true;
        }
        break;

      case 'melee':
        if (this.isMouseDown && readyToFire && !this.hasFiredSinceMouseDown) {
          this.handleMelee();
          this.timeSinceLastShot = 0;
          this.hasFiredSinceMouseDown = true;
        }
        break;
    }
  }

  handleMelee() {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3();
    origin.add(direction.clone().multiplyScalar(.9)); // Adjust distance if needed
    this.camera.getWorldDirection(direction);

    const ray = new RAPIER.Ray(origin, direction);
    const hit = this.rapierWorld.castRay(ray, 2.0, true); // Short melee range

    if (hit) {
      const collider = hit.collider;
      if (collider?.userData?.type === 'enemy') {
        collider.userData.enemyRef.takeDamage(this.config.damage);
        console.log("Melee hit:", collider.userData);
      }
    }

    playSound('knife_swing'); // Add this to your sound list
  }

  handleFire() {
    if (this.currentAmmo <= 0) {
      playSound('dry_fire'); // optional sound
      if (this.fireMode === 'burst') {
        this.burstShotsRemaining = 0;
      }
      return;
    }

    this.currentAmmo--;

    // 1. Get camera position and direction
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction).normalize();

    // 2. Move the ray origin slightly forward from the camera to avoid self-hit
    origin.add(direction.clone().multiplyScalar(.9)); // Adjust distance if needed

    // 3. Raycast
    const ray = new RAPIER.Ray(origin, direction);
    const hit = this.rapierWorld.castRay(ray, 100, true);

    if (hit) {
      const collider = hit.collider;
      const tag = collider?.userData?.type;

      if (tag === 'enemy') {
        collider.userData.enemyRef.takeDamage(this.damage);
      } else if (tag === 'player') {
        console.log("Ray hit the player (self), ignoring...");
      } else {
        console.log("Ray hit something else:", tag);
      }
    }

    this.triggerRecoil();
    this.triggerMuzzleFlash();
    const variant = Math.floor(Math.random() * 3) + 1;
    playSound(`gunshot_${variant}`);
  }


  startReload() {
    if (this.isReloading || this.currentAmmo === this.clipSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadTimer = 0;
    playSound('reload');
  }

  updateAnimation(delta) {
    // 🔁 Mouse-based sway
    const currentYaw = this.camera.parent?.parent?.rotation.y ?? 0;
    const yawDelta = currentYaw - this.lastYaw;
    const maxSway = 0.25;
    const targetX = THREE.MathUtils.clamp(-yawDelta * 2, -maxSway, maxSway);
    this.swayOffset.x = THREE.MathUtils.lerp(this.swayOffset.x, targetX, delta * 15);
    this.lastYaw = currentYaw;

    // 🫁 Movement-based bobbing
    this.bobTime += delta * (this.isMoving ? (this.isSprinting ? 16 : 8) : 1.5);
    const bobAmount = this.isMoving ? (this.isSprinting ? 0.1 : 0.05) : 0.01;
    const bobOffsetY = Math.sin(this.bobTime) * bobAmount;
    const bobOffsetX = Math.cos(this.bobTime * 0.5) * bobAmount * 0.5;

    // 🔫 Recoil spring
    this.recoilVelocity += (0 - this.recoilOffset) * 9 * delta;
    this.recoilVelocity *= 0.8;
    this.recoilOffset += this.recoilVelocity;

    // 🎯 ADS logic
    const baseOffset = this.isAiming && this.canADS ? this.adsOffset : this.defaultOffset;
    const baseVec = new THREE.Vector3(...baseOffset);

    // ➕ Combine all animation offsets
    const animatedOffset = baseVec.clone().add(new THREE.Vector3(
      this.swayOffset.x + bobOffsetX,
      bobOffsetY,
      this.recoilOffset
    ));

    this.position.lerp(animatedOffset, delta * 10);

    // 🔍 FOV zoom
    if (this.canADS) {
      const targetFOV = this.isAiming ? this.adsFOV : this.defaultFOV;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, delta * 10);
      this.camera.updateProjectionMatrix();
    }

    // 🔥 Muzzle flash fade
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
