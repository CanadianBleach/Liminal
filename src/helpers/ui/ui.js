import { getMaxSprintTime } from "../player/player";

let batteryBar;
let deathOverlay;
let killCounter;
let healthBar;
let sprintBar;

export function getUIElements() {
  batteryBar = document.getElementById('battery-bar');
  killCounter = document.getElementById('kill-count');
  healthBar = document.getElementById('health-bar');
  sprintBar = document.getElementById('sprint-bar');
}

export function updateUI(playerState, kills, battery) {
  updateHealthUI(playerState.health);
  updateKillsUI(kills);
  updateFlashlightUI(battery);
  updateSprintUI(playerState);
}

export function updateSprintUI(playerState) {
  if (!sprintBar) return;

  const percent = Math.max(0, Math.min(100, (playerState.sprintTime / getMaxSprintTime()) * 100));
  sprintBar.style.width = `${percent}%`;

  // Optional: Color change or fade effect
  if (percent > 60) {
    sprintBar.style.backgroundColor = 'cyan';
  } else if (percent > 25) {
    sprintBar.style.backgroundColor = 'deepskyblue';
  } else {
    sprintBar.style.backgroundColor = 'darkblue';
  }
}

export function updateHealthUI(health) {
  if (!healthBar) return;

  const percent = Math.max(0, Math.min(100, (health.current / health.max) * 100));
  healthBar.style.width = `${percent}%`;

  if (percent > 60) {
    healthBar.style.backgroundColor = 'limegreen';
  } else if (percent > 25) {
    healthBar.style.backgroundColor = 'gold';
  } else {
    healthBar.style.backgroundColor = 'red';
  }
}

export function updateKillsUI(kills) {
  killCounter.textContent = kills;
}

export function setupDeathOverlay() {
  deathOverlay = document.createElement('div');
  deathOverlay.id = 'death-overlay';
  Object.assign(deathOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(255, 0, 0, 0.4)',
    zIndex: '200',
    opacity: '0',
    transition: 'opacity 1s ease'
  });
  document.body.appendChild(deathOverlay);
  return deathOverlay;
}

export function updateFlashlightUI(flashlightState) {
  if (!batteryBar) return;

  const percent = Math.max(0, Math.min(100, (flashlightState.battery / flashlightState.maxBattery) * 100));
  batteryBar.style.width = `${percent}%`;

  if (percent > 60) {
    batteryBar.style.backgroundColor = 'limegreen';
  } else if (percent > 25) {
    batteryBar.style.backgroundColor = 'gold';
  } else {
    batteryBar.style.backgroundColor = 'red';
  }
}

