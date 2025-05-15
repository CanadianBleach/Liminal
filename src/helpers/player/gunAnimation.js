import * as THREE from 'three';

let recoilOffset = 0;
let recoilVelocity = 0;
let gunMesh = null;
let gunLerp = 15;
let bobTime = 0;
let bobSpeed = 16;
let bobDepth = 0.1;

let lastYaw = 0;
let swayOffset = new THREE.Vector3();

let isMoving = false;
let isSprinting = false;

let muzzleFlashMesh = null;
let muzzleFlashLight = null;
let muzzleFlashTimer = 0;



export function setGunMovementState({ moving, sprinting }) {
  isMoving = moving;
  isSprinting = sprinting;
}

export function attachGun(gun) {
  gunMesh = gun;
  lastYaw = 0;

  // Load muzzle flash texture
  const flashTexture = new THREE.TextureLoader().load('/textures/muzzle1.png');
  const flashMaterial = new THREE.MeshBasicMaterial({
    map: flashTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const flashGeometry = new THREE.PlaneGeometry(3, 3);
  muzzleFlashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
  muzzleFlashMesh.position.set(0.375, -0.175, -3);
  gunMesh.add(muzzleFlashMesh);

  muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 5); // Start at 0 intensity
  muzzleFlashLight.position.set(0.375, -0.15, -3);
  // Do NOT toggle visibility
  gunMesh.add(muzzleFlashLight);
}

export function triggerRecoil() {
  recoilVelocity = 0.07;
}

export function triggerMuzzleFlash() {
  if (muzzleFlashMesh && muzzleFlashMesh.material) {
    muzzleFlashMesh.material.opacity = 1;
    muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
    const scale = THREE.MathUtils.randFloat(0.3, 0.6);
    muzzleFlashMesh.scale.setScalar(scale);

    muzzleFlashTimer = 0.05;

    if (muzzleFlashLight) {
      muzzleFlashLight.intensity = 10; // Big pop
    }
  }
}

export function updateGunAnimation(delta, camera) {
  if (!gunMesh || !camera) return;

  // Recoil
  recoilVelocity += (0 - recoilOffset) * 9 * delta;
  recoilVelocity *= 0.8;
  recoilOffset += recoilVelocity;

  // View sway
  const currentYaw = camera.rotation.y;
  const yawDelta = currentYaw - lastYaw;
  const maxSway = 0.25;
  const targetX = THREE.MathUtils.clamp(-yawDelta * 2, -maxSway, maxSway);
  swayOffset.x = THREE.MathUtils.lerp(swayOffset.x, targetX, delta * gunLerp);
  lastYaw = currentYaw;

  // Bobbing
  bobTime += delta * (isMoving ? (isSprinting ? bobSpeed : 8) : 1.5);
  const bobAmount = isMoving ? (isSprinting ? bobDepth : 0.05) : 0.01;
  const bobOffsetY = Math.sin(bobTime) * bobAmount;
  const bobOffsetX = Math.cos(bobTime * 0.5) * bobAmount * 0.5;

  gunMesh.position.set(
    0 + swayOffset.x + bobOffsetX,
    -0.15 + bobOffsetY,
    0.2 + recoilOffset
  );

  // Muzzle flash fade
  if (muzzleFlashMesh && muzzleFlashMesh.material.opacity > 0) {
    muzzleFlashTimer -= delta;
    const fade = Math.max(0, muzzleFlashTimer * 20);
    muzzleFlashMesh.material.opacity = fade;

    if (muzzleFlashLight) {
      muzzleFlashLight.intensity = fade * 100; // 👈 Use intensity only
    }
  }
}

export function getMuzzleWorldPosition() {
  if (!muzzleFlashMesh) return null;
  const worldPos = new THREE.Vector3();
  muzzleFlashMesh.getWorldPosition(worldPos);
  return worldPos;
}

