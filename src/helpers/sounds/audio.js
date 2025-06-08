import * as THREE from 'three';

export const listener = new THREE.AudioListener();
export const soundBuffers = {};

let backgroundSound = null;
let footstepSound = null;

function getMasterVolume() {
  const stored = localStorage.getItem("masterVolume");
  return stored !== null ? parseFloat(stored) : 0.8;
}

export function setMasterVolume(vol) {
  localStorage.setItem("masterVolume", vol);

  if (backgroundSound) backgroundSound.setVolume(0.5 * vol);
  if (footstepSound) footstepSound.setVolume(1.0 * vol);
}

export function loadSounds(camera) {
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();
  const masterVolume = getMasterVolume();

  const loadSound = (name, url, loop = false) => {
    audioLoader.load(url, (buffer) => {
      if (loop) {
        const sound = new THREE.Audio(listener);
        sound.setBuffer(buffer);
        sound.setLoop(true);

        if (name === 'bg_noise') {
          backgroundSound = sound;
          backgroundSound.setVolume(0.5 * masterVolume);
          backgroundSound.play();
        } else if (name === 'footsteps') {
          footstepSound = sound;
          footstepSound.setVolume(1.0 * masterVolume);
        }
      } else {
        soundBuffers[name] = buffer;
      }
    });
  };

  // Load one-shot and looped sounds
  loadSound('jump', '/sounds/jump.mp3');
  loadSound('dive', '/sounds/dive.mp3');
  loadSound('vine_boom', '/sounds/vine_boom.mp3');
  loadSound('gunshot_1', './sounds/gunshot_1.MP3');
  loadSound('gunshot_2', './sounds/gunshot_2.MP3');
  loadSound('gunshot_3', './sounds/gunshot_3.MP3');
  loadSound('dry_fire', './sounds/combat/dry_fire.mp3');
  loadSound('start_reload', './sounds/combat/start_reload.mp3');
  loadSound('end_reload', './sounds/combat/end_reload.mp3');
  loadSound('round_change', './sounds/round_change.mp3');
  loadSound('wasted', './sounds/wasted.mp3');
  loadSound('flashlight_click', './sounds/flashlight_click.mp3');
  loadSound('box_spin', './sounds/mysteryBox/box_spin.mp3');
  loadSound('box_win', './sounds/mysteryBox/box_win.mp3');
  loadSound('box_error', './sounds/mysteryBox/box_error.mp3');
  loadSound('bg_noise', './sounds/bg_noise.mp3', true);
  loadSound('footsteps', './sounds/footsteps.mp3', true);
}

export function playSound(name, baseVolume = 1.0) {
  const buffer = soundBuffers[name];
  if (buffer) {
    const sound = new THREE.Audio(listener);
    const volume = baseVolume * getMasterVolume();
    sound.setBuffer(buffer);
    sound.setVolume(volume);
    sound.play();
  }
}

export function controlFootsteps(shouldPlay, rate = 1) {
  if (!footstepSound) return;
  footstepSound.setPlaybackRate(rate);

  if (shouldPlay) {
    if (!footstepSound.isPlaying) footstepSound.play();
  } else {
    if (footstepSound.isPlaying) footstepSound.stop();
  }
}

export function stopBackgroundSound() {
  if (backgroundSound && backgroundSound.isPlaying) {
    backgroundSound.stop();
  }
}
