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
