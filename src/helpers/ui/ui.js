import { playSound } from "../sounds/audio";

let batteryBar;
let deathOverlay;
let killCounter;
let healthBar;
let sprintBar;

let ammoCurrent;
let ammoReserve;

export function getUIElements() {
  batteryBar = document.getElementById('battery-bar');
  killCounter = document.getElementById('kill-count');
  healthBar = document.getElementById('health-bar');
  sprintBar = document.getElementById('sprint-bar');
  ammoCurrent = document.getElementById('ammo-current');
  ammoReserve = document.getElementById('ammo-reserve');
}


export function updateUI(playerState, enemyManager, battery, currentGun) {
  updateHealthUI(playerState.health);
  updateKillsUI(enemyManager);
  updateFlashlightUI(battery);
  updateSprintUI(playerState);
  updateRoundUI(enemyManager);
  checkForRoundUpdate(enemyManager);
  updateAmmoUI(currentGun);
}


export function updateAmmoUI(currentGun) {
  if (!ammoCurrent || !ammoReserve || !currentGun) return;
  ammoCurrent.textContent = currentGun.currentAmmo;
  ammoReserve.textContent = currentGun.reserveAmmo;
}


export function updateRoundUI(enemyManager) {
  const roundCounter = document.getElementById('round-count');
  if (roundCounter) {
    roundCounter.textContent = enemyManager.waveNumber;
  }
}

export function updateSprintUI(playerState) {
  if (!sprintBar) return;

  const percent = Math.max(0, Math.min(100, (playerState.sprintTime / playerState.maxSprintTime) * 100));
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

export function updateKillsUI(enemyManager) {
  killCounter.textContent = enemyManager.killCount;
}
let damageOverlay;

export function setupDamageOverlay() {
  damageOverlay = document.createElement('div');
  damageOverlay.id = 'damage-overlay';
  Object.assign(damageOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    zIndex: '300',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease',
  });
  document.body.appendChild(damageOverlay);
}

export function flashDamageOverlay() {
  if (!damageOverlay) return;
  damageOverlay.style.opacity = '1';

  setTimeout(() => {
    damageOverlay.style.opacity = '0';
  }, 250); // short flash
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

let roundOverlay;

export function setupRoundIndicator() {
  roundOverlay = document.createElement('div');
  roundOverlay.id = 'round-indicator';
  Object.assign(roundOverlay.style, {
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '100px',
    fontWeight: 'bold',
    color: 'red',
    opacity: '0',
    zIndex: '300',
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease, transform 3s ease',
    transformStyle: 'preserve-3d',
    perspective: '1000px',
  });
  document.body.appendChild(roundOverlay);
  return roundOverlay;
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
let currentRound = 1;
let lastKillCount = 0;
let lastWaveNumber = 0;


function checkForRoundUpdate(enemyManager) {
  const currentWave = enemyManager.waveNumber;

  if (currentWave !== lastWaveNumber && enemyManager.waveInProgress) {
    lastWaveNumber = currentWave;
    showRoundText(currentWave);
    playSound('round_change');
  }
}
let totalRotation = 0;

export function showRoundText(roundNumber) {
  playSound('round_change');
  if (!roundOverlay) return;

  totalRotation += 360; // Increase every round

  roundOverlay.textContent = `ROUND ${roundNumber}`;
  roundOverlay.style.opacity = '1';
  roundOverlay.style.transform = `translate(-50%, -50%) rotateY(${totalRotation - 360}deg)`;

  // Force reflow
  roundOverlay.offsetHeight;

  // Apply new transform
  roundOverlay.style.transform = `translate(-50%, -50%) rotateY(${totalRotation}deg)`;

  // Fade out
  setTimeout(() => {
    roundOverlay.style.opacity = '0';
  }, 4000);
}








