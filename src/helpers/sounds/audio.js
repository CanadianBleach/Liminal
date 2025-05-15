import * as THREE from 'three';

export const listener = new THREE.AudioListener();

const soundBuffers = {}; // Stores raw AudioBuffers

export function loadSounds(camera) {
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();

  const loadSound = (name, url) => {
    audioLoader.load(url, (buffer) => {
      soundBuffers[name] = buffer;
    });
  };

  loadSound('jump', '/sounds/jump.mp3');
  loadSound('dive', '/sounds/dive.mp3');
  loadSound('vine_boom', '/sounds/vine_boom.mp3');
  loadSound('gunshot_1', './sounds/gunshot_1.MP3');
  loadSound('gunshot_2', './sounds/gunshot_2.MP3');
  loadSound('gunshot_3', './sounds/gunshot_3.MP3');

  return soundBuffers;
}

export function playSound(name, volume = 1.0) {
  const buffer = soundBuffers[name];
  if (!buffer) return;

  const sound = new THREE.Audio(listener);
  sound.setBuffer(buffer);
  sound.setVolume(volume);
  sound.play();
}
