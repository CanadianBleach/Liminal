import { initMainScene } from './scenes/mainScene.js';

// Get start screen element and add click event listener
let startButton = document.getElementById("start-button");
if (!startButton) {
    console.error("Start button not found in the DOM.");
} else {
    startButton.addEventListener("click", startGame);
}

let fader = document.getElementById("fader");
let gameFader = document.getElementById("game-fader");

window.addEventListener('load', function () {
    fader.classList = 'visible';
});

function startGame() {
    console.log("starting game...");
    startFadeOut();
    setTimeout(() => {
        initMainScene();
    }, 1000);
}

function startFadeIn() {
    console.log("fade in...");
    if (!window.AnimationEvent) { return; }
    gameFader.classList = 'visible';
}

function startFadeOut() {
    console.log("fade out...");
    if (!window.AnimationEvent) { return; }
    fader.classList = 'hidden';
}