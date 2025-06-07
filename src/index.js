// UI Elements
const startButton = document.getElementById("start-button");
const fader = document.getElementById("fader");
const webLoadFader = document.getElementById("web-load-fader");
const uploadButton = document.getElementById('upload-button');

const fileInput = document.getElementById('enemy-input');
const clearButton = document.getElementById('clear-image-button');

// Page load effect
window.addEventListener('load', () => {
    webLoadFader.classList = "visible";
});

// Start Game
startButton.addEventListener("click", () => {
    fader.classList = 'hidden';
    setTimeout(() => {
        window.location.href = './play';
    }, 1000);
});

clearButton.addEventListener("click", () => {
    localStorage.clear();
});

// Upload Button Behavior
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        localStorage.setItem('enemyTexture', reader.result);
        uploadButton.textContent = file.name;
    };
    reader.readAsDataURL(file);
});

