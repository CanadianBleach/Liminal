// Get start screen element and add click event listener
let startButton = document.getElementById("start-button");
startButton.addEventListener("click", startGame);

let testButton = document.getElementById("test-button");
testButton.addEventListener("click", startTestScene);

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

function startTestScene() {
    fader.classList = 'hidden';
    setTimeout(() => {
        window.location.href = '/movement';
    }, 1000);
}
