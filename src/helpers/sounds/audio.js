import * as THREE from 'three';

export const listener = new THREE.AudioListener();

const sounds = {};

export function loadSounds(camera) {
  camera.add(listener);

  const audioLoader = new THREE.AudioLoader();

  const loadSound = (name, url, isLoop = false, volume = 1.0) => {
    const sound = new THREE.Audio(listener);
    audioLoader.load(url, (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(isLoop);
      sound.setVolume(volume);
    });
    sounds[name] = sound;
  };

  loadSound('jump', '/sounds/jump.mp3');
  loadSound('dive', '/sounds/dive.mp3');

  return sounds;
}

export function playSound(name) {
  if (sounds[name] && sounds[name].isPlaying === false) {
    sounds[name].play();
  }
}
