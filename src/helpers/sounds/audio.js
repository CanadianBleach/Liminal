import * as THREE from 'three';

export const listener = new THREE.AudioListener();
export const soundBuffers = {};
let backgroundSound = null;
let footstepSound = null;

export function loadSounds(camera) {
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();

  const loadSound = (name, url, loop = false) => {
    audioLoader.load(url, (buffer) => {
      if (loop) {
        const sound = new THREE.Audio(listener);
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);

        if (name === 'bg_noise') {
          backgroundSound = sound;
          backgroundSound.play(); // autoplay bg noise
        } else if (name === 'footsteps') {
          footstepSound = sound;
        }
      } else {
        soundBuffers[name] = buffer;
      }
    });
  };

  // Load regular sounds
  loadSound('jump', '/sounds/jump.mp3');
  loadSound('dive', '/sounds/dive.mp3');
  loadSound('vine_boom', '/sounds/vine_boom.mp3');
  loadSound('gunshot_1', './sounds/gunshot_1.MP3');
  loadSound('gunshot_2', './sounds/gunshot_2.MP3');
  loadSound('gunshot_3', './sounds/gunshot_3.MP3');
  loadSound('round_change', './sounds/round_change.mp3');
  loadSound('flashlight_click', './sounds/flashlight_click.mp3');


  // Looped sounds
  loadSound('bg_noise', './sounds/bg_noise.mp3', true);
  loadSound('footsteps', './sounds/footsteps.mp3', true);
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

export function playSound(name, volume = 1.0) {
  const buffer = soundBuffers[name];
  if (buffer) {
    const sound = new THREE.Audio(listener);
    sound.setBuffer(buffer);
    sound.setVolume(volume);
    sound.play();
  }
}

export function stopBackgroundSound() {
  if (backgroundSound && backgroundSound.isPlaying) {
    backgroundSound.stop();
  }
}

export function setBackgroundVolume(vol) {
  if (backgroundSound) backgroundSound.setVolume(vol);
}
