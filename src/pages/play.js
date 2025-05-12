import { initMainScene } from "../scenes/mainScene.js";

window.addEventListener("load", async () => {
  const loader = document.getElementById("container");
  const gameContainer = document.getElementById("game-container");
  const gameUI = document.getElementById("game-ui");

  // Show loader
  loader.classList.remove("hidden");
  loader.classList.add("visible");

  // Load the scene in background
  const startRendering = await initMainScene();

  // Artificial delay before revealing game
  setTimeout(() => {
    // Hide loading screen
    loader.classList.remove("visible");
    loader.classList.add("hidden");

    // Show canvas
    gameContainer.classList.remove("hidden");
    gameContainer.classList.add("visible");

    // Show UI
    if (gameUI) {
      gameUI.classList.remove("hidden");
      gameUI.classList.add("visible");
    }

    // Start render loop
    startRendering();
  }, 2000); // adjust delay as needed
});
