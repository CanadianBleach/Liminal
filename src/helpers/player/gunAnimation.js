import * as THREE from 'three';

let recoilOffset = 0;
let recoilVelocity = 0;
let gunMesh = null;
let gunLerp = 15;
let bobTime = 0;
let bobSpeed = 16;
let bobDepth = .1;

let lastYaw = 0;
let swayOffset = new THREE.Vector3();

let isMoving = false;
let isSprinting = false;

export function setGunMovementState({ moving, sprinting }) {
  isMoving = moving;
  isSprinting = sprinting;
}

export function attachGun(gun) {
  gunMesh = gun;
  lastYaw = 0;
}

export function triggerRecoil() {
  recoilVelocity = 0.07;
}

export function updateGunAnimation(delta, camera) {
  if (!gunMesh || !camera) return;

  // --- Recoil spring ---
  recoilVelocity += (0 - recoilOffset) * 9 * delta;
  recoilVelocity *= 0.8;
  recoilOffset += recoilVelocity;

  // --- View sway (same as before) ---
  const currentYaw = camera.rotation.y;
  const yawDelta = currentYaw - lastYaw;
  const maxSway = 0.25;
  const targetX = THREE.MathUtils.clamp(-yawDelta * 2, -maxSway, maxSway);
  swayOffset.x = THREE.MathUtils.lerp(swayOffset.x, targetX, delta * gunLerp);
  lastYaw = currentYaw;

  // --- Bobbing / breathing ---
  bobTime += delta * (isMoving ? (isSprinting ? bobSpeed : 8) : 1.5);
  const bobAmount = isMoving ? (isSprinting ? bobDepth : 0.05) : 0.01;
  const bobOffsetY = Math.sin(bobTime) * bobAmount;
  const bobOffsetX = Math.cos(bobTime * 0.5) * bobAmount * 0.5;

  // --- Final gun transform ---
  gunMesh.position.set(
    0.3 + swayOffset.x + bobOffsetX,
    -0.4 + bobOffsetY,
    0.2 + recoilOffset
  );
}