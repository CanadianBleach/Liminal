const webLoadFader = document.getElementById("web-load-fader");
const sensitivity = document.getElementById("sensitivity");
const volume = document.getElementById("volume");

const sensitivityVal = document.getElementById("sensitivity-value");
const volumeVal = document.getElementById("volume-value");

const saveButton = document.getElementById("save-settings");
const backButton = document.getElementById("back-button");

// Load saved settings
window.addEventListener("DOMContentLoaded", () => {
    const storedSensitivity = localStorage.getItem("mouseSensitivity");
    const storedVolume = localStorage.getItem("masterVolume");

    if (storedSensitivity !== null) {
        sensitivity.value = storedSensitivity;
        sensitivityVal.textContent = parseFloat(storedSensitivity).toFixed(2);
    }

    if (storedVolume !== null) {
        volume.value = storedVolume;
        volumeVal.textContent = parseFloat(storedVolume).toFixed(2);
    }
});

// Update label when sliders move
function updateLabel(input, label) {
    input.addEventListener("input", () => {
        label.textContent = parseFloat(input.value).toFixed(2);
    });
}

updateLabel(sensitivity, sensitivityVal);
updateLabel(volume, volumeVal);

// Save to localStorage
saveButton.addEventListener("click", () => {
    localStorage.setItem("mouseSensitivity", sensitivity.value);
    localStorage.setItem("masterVolume", volume.value);
    alert("Settings saved!");
});

// Back button handler
backButton.addEventListener("click", () => {
    window.location.href = "../";
});

// Page fade effect
window.addEventListener('load', () => {
    webLoadFader.classList = "visible";
});