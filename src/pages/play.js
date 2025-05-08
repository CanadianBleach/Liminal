import { initMainScene } from "../scenes/mainScene.js";

window.addEventListener('load', () => {
  const loader = document.getElementById('container');
  if (loader) {
    loader.classList.remove('hidden');
    loader.classList.add('visible');
  }
});