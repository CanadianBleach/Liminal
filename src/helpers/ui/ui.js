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

export function updateUI(playerState, enemyManager, battery) {
  updateHealthUI(playerState.health);
  updateKillsUI(enemyManager);
  updateFlashlightUI(battery);
  updateSprintUI(playerState);
  updateRoundUI(enemyManager);
  checkForRoundUpdate(enemyManager);
}

export function updateRoundUI(enemyManager) {
  const roundCounter = document.getElementById('round-count');
  if (roundCounter) {
    roundCounter.textContent = enemyManager.waveNumber;
  }
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

export function updateKillsUI(enemyManager) {
  killCounter.textContent = enemyManager.killCount;
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

function checkForRoundUpdate(enemyManager) {
  if (enemyManager.killCount >= lastKillCount + 5) {
    currentRound++;
    lastKillCount = enemyManager.killCount;
    showRoundText(currentRound); // <- call the Three.js text function
  }
}
let totalRotation = 0;

export function showRoundText(roundNumber) {
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








