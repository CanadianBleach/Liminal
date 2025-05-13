export function updateHealthUI(health) {
  const healthUI = document.getElementById('player-health');
  if (healthUI) healthUI.textContent = health.current;
}

export function updateKillsUI(kills) {
  const killsUI = document.getElementById('kills');
  if (killsUI) killsUI.textContent = kills;
}

export function setupDeathOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'death-overlay';
    Object.assign(overlay.style, {
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
    document.body.appendChild(overlay);
    return overlay;
}