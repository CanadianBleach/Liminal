import { initMainScene } from "../scenes/mainScene.js";

window.addEventListener("load", async () => {
  const loader = document.getElementById("container");
  const gameContainer = document.getElementById("game-container");

  // Show loader
  loader.classList.remove("hidden");
  loader.classList.add("visible");

  // Load the scene in background
  const startRendering = await initMainScene();

  // Artificial delay (e.g., 2 seconds)
  setTimeout(() => {
    loader.classList.remove("visible");
    loader.classList.add("hidden");
    gameContainer.classList.remove("hidden");
    gameContainer.classList.add("visible");

    // Start rendering loop
    startRendering();
  }, 2000); // adjust time as needed
});
