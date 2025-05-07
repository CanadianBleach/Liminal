import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function loadGunModel(camera) {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load('/models/fps_mine_sketch_galil.glb', (gltf) => {
      const gun = gltf.scene;

      // Scale and position gun in front of camera
      gun.scale.set(.5, .5, .5); // adjust to taste
      gun.position.set(0.3, -0.4, 0); // right, down, forward
      gun.rotation.set(0, 0, 0); // face the right way

      // Attach to camera
      camera.add(gun);
      resolve(gun);
    }, undefined, reject);
  });
}