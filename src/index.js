import { initMainScene } from './scenes/mainScene.js';

window.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById("start-button");
  const startScreen = document.getElementById("start-screen");
  const gameCanvas = document.getElementById("game-canvas");
  const crosshair = document.getElementById("crosshair");
  const fadeOverlay = document.getElementById("fade-overlay");

  // Hide the fade screen initially until game is triggered
  fadeOverlay.style.display = "none";

  startButton.addEventListener("click", async () => {
    // Show loading overlay
    fadeOverlay.style.display = "flex";

    // Hide menu
    startScreen.style.display = "none";

    // Show canvas + crosshair
    gameCanvas.style.display = "block";
    crosshair.style.display = "block";

    // Wait a frame so fade is visible before loading
    await new Promise(r => requestAnimationFrame(r));

    // Initialize game scene
    await initMainScene(gameCanvas);

    await new Promise(r => setTimeout(r, 700)); // 2 seconds

    // Fade out overlay
    fadeOverlay.classList.add("fade-out");

    // Fully remove after transition
    fadeOverlay.addEventListener("transitionend", () => {
      fadeOverlay.style.display = "none";
    });
  });
});
