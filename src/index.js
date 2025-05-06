// UI Elements
const startButton = document.getElementById("start-button");
const testButton = document.getElementById("test-button");
const fader = document.getElementById("fader");
const webLoadFader = document.getElementById("web-load-fader");
const uploadButton = document.getElementById('upload-button');

const fileInput = document.getElementById('enemy-input');
console.log(fileInput); // Should NOT be null

// Page load effect
window.addEventListener('load', () => {
    webLoadFader.classList = "visible";
});

// Start Game
startButton.addEventListener("click", () => {
    fader.classList = 'hidden';
    setTimeout(() => {
        window.location.href = '/play';
    }, 1000);
});

// Upload Button Behavior
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    console.log('[DEBUG] File selected:', file);

    if (!file) {
        console.warn('[DEBUG] No file selected');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        const imageDataUrl = event.target.result;
        console.log('[DEBUG] Data URL:', imageDataUrl);
        localStorage.setItem('enemyTexture', imageDataUrl);
        uploadButton.textContent = `Selected: ${file.name}`;
    };

    reader.onerror = function (error) {
        console.error('[ERROR] FileReader failed:', error);
    };

    try {
        reader.readAsDataURL(file);
        console.log('[DEBUG] Called readAsDataURL');
    } catch (e) {
        console.error('[EXCEPTION] Failed to read file:', e);
    }
});