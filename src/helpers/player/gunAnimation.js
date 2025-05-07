let recoilOffset = 0;
let recoilVelocity = 0;
let gunMesh = null;

export function attachGun(gun) {
  gunMesh = gun;
}

export function triggerRecoil() {
  recoilVelocity = 0.07;
}

export function updateGunAnimation(delta) {
  if (!gunMesh) return;

  recoilVelocity += (0 - recoilOffset) * 9 * delta; // spring force
  recoilVelocity *= 0.8; // damping
  recoilOffset += recoilVelocity;

  gunMesh.position.z = 0.2 + recoilOffset; // adjust to your base offset
}
console.log("✅ gunAnimation.js loaded");

