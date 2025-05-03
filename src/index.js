// Get start screen element and add click event listener
let startButton = document.getElementById("start-button");
if (!startButton) {
    console.error("Start button not found in the DOM.");
} else {
    startButton.addEventListener("click", startGame);
}

let fader = document.getElementById("fader");
let webLoadFader = document.getElementById("web-load-fader");

window.addEventListener('load', function () {
    webLoadFader.classList = "visible";
});

function startGame() {
    fader.classList = 'hidden';
    setTimeout(() => {
        window.location.href = '/play';
    }, 1000);
}