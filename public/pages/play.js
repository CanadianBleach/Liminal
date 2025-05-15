import { initMainScene } from "../../src/scenes/mainScene";

window.addEventListener("load", async () => {
  const loader = document.getElementById("container");
  const gameContainer = document.getElementById("game-container");
  const gameUI = document.getElementById("game-ui");

  loader.classList.remove("hidden");
  loader.classList.add("visible");

  const textureUrl = localStorage.getItem('enemyTexture') || null;
  const startRendering = await initMainScene(textureUrl);

  setTimeout(() => {
    loader.classList.remove("visible");
    loader.classList.add("hidden");

    gameContainer.classList.remove("hidden");
    gameContainer.classList.add("visible");

    if (gameUI) {
      gameUI.classList.remove("hidden");
      gameUI.classList.add("visible");
    }

    startRendering();
  }, 2000);
});
