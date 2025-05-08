import * as THREE from 'three';

let recoilOffset = 0;
let recoilVelocity = 0;
let gunMesh = null;
let gunLerp = 15;

let lastYaw = 0;
let swayOffset = new THREE.Vector3();

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

  // --- Horizontal (yaw) sway only ---
  const currentYaw = camera.rotation.y;
  const yawDelta = currentYaw - lastYaw;

  const maxSway = 0.25;
  const targetX = THREE.MathUtils.clamp(-yawDelta * 2, -maxSway, maxSway);

  // Smoothly interpolate to target sway
  swayOffset.x = THREE.MathUtils.lerp(swayOffset.x, targetX, delta * gunLerp);

  lastYaw = currentYaw;

  // --- Final gun transform ---
  gunMesh.position.set(0.3 + swayOffset.x, -0.4, 0.2 + recoilOffset);
}
