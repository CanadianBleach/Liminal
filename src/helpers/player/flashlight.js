import * as THREE from 'three';

export const flashlightState = {
  isOn: false,
  battery: 15.0,
  maxBattery: 15.0,
  rechargeRate: 2.0,
  drainRate: 1.0,
  maxIntensity: 250,
  currentIntensity: 250,
  flashlight: null,
  flashlightTarget: null,
};

export function createFlashlight() {
  const light = new THREE.SpotLight(0xf8ffa2, flashlightState.maxIntensity, 90, Math.PI / 8, 0.2, 1);
  light.castShadow = true;

  const target = new THREE.Object3D();
  light.target = target;

  flashlightState.flashlight = light;
  flashlightState.flashlightTarget = target;

  return { flashlight: light, flashlightTarget: target };
}

export function toggleFlashlight() {
  const light = flashlightState.flashlight;
  if (!light) return;

  if (flashlightState.isOn) {
    flashlightState.isOn = false;
    light.visible = false;
  } else if (flashlightState.battery >= 1) {
    flashlightState.isOn = true;
    light.visible = true;
    // Don't override currentIntensity — keep it dynamic
    light.intensity = flashlightState.currentIntensity;
  }
}

export function updateFlashlightBattery(delta) {
  const light = flashlightState.flashlight;
  if (!light) return;

  if (flashlightState.isOn) {
    // Drain battery
    flashlightState.battery -= flashlightState.drainRate * delta;
    flashlightState.battery = Math.max(0, flashlightState.battery);

    if (flashlightState.battery <= 0) {
      flashlightState.isOn = false;
      light.visible = false;
      return;
    }

    const batteryFactor = flashlightState.battery / flashlightState.maxBattery;
    flashlightState.currentIntensity = flashlightState.maxIntensity * batteryFactor;

    // Flicker when under 20%
    if (batteryFactor < 0.25) {
      light.visible = Math.random() > 0.9;
      flashlightState.currentIntensity += Math.random() * 2;
    }

    light.intensity = flashlightState.currentIntensity;

  } else {
    // Recharge battery
    flashlightState.battery = Math.min(
      flashlightState.maxBattery,
      flashlightState.battery + flashlightState.rechargeRate * delta
    );
  }
  const batteryDisplay = document.getElementById("battery");
if (batteryDisplay) {
  const percent = (flashlightState.battery / flashlightState.maxBattery) * 100;
  batteryDisplay.textContent = `${Math.floor(percent)}%`;
}
}

export function updateFlashlight(camera, flashlight, target) {
  const right = new THREE.Vector3();
  camera.getWorldDirection(right);
  right.cross(camera.up).normalize();

  const offset = right.multiplyScalar(0.3).add(new THREE.Vector3(0, -0.25, 0));
  flashlight.position.lerp(camera.position.clone().add(offset), 0.15);

  const lookDir = new THREE.Vector3();
  camera.getWorldDirection(lookDir);
  const targetPos = camera.position.clone().add(lookDir.multiplyScalar(10));
  target.position.lerp(targetPos, 0.15);
  target.updateMatrixWorld();

  flashlight.lookAt(target.position);
}
