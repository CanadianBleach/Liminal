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
  checkForRoundUpdate(enemyManager);
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
let roundWrapper;

export function setupRoundIndicator() {
  // Create wrapper div with perspective
  roundWrapper = document.createElement('div');
  roundWrapper.id = 'round-wrapper';
  Object.assign(roundWrapper.style, {
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    perspective: '800px',
    zIndex: '999',
    pointerEvents: 'none',
  });

  // Create the rotating inner div
  roundOverlay = document.createElement('div');
  roundOverlay.id = 'round-indicator';
  Object.assign(roundOverlay.style, {
    fontSize: '48px',
    fontWeight: 'bold',
    color: 'red',
    textAlign: 'center',
    width: '300px',
    backgroundColor: '#111',
    border: '2px solid red',
    boxShadow: '0 0 20px red',
    borderRadius: '10px',
    transform: 'rotateY(0deg)',
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
    opacity: '0',
    transition: 'opacity 0.3s ease, transform 3s ease',
  });

  // Nest the indicator inside the wrapper
  roundWrapper.appendChild(roundOverlay);
  document.body.appendChild(roundWrapper);

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
let lastWaveNumber = 0;

function checkForRoundUpdate(enemyManager) {
  const currentWave = enemyManager.waveNumber;

  if (currentWave !== lastWaveNumber && enemyManager.waveInProgress) {
    lastWaveNumber = currentWave;
    showRoundText(currentWave);
  }
}

let totalRotation = 0;

export function showRoundText(roundNumber) {
  if (!roundOverlay) return;

  totalRotation += 360;

  roundOverlay.textContent = `ROUND ${roundNumber}`;
  roundOverlay.style.opacity = '1';
  roundOverlay.style.transform = `rotateY(${totalRotation - 360}deg)`;

  // Force reflow
  roundOverlay.offsetHeight;

  roundOverlay.style.transform = `rotateY(${totalRotation}deg)`;

  setTimeout(() => {
    roundOverlay.style.opacity = '0';
  }, 2500);
}









