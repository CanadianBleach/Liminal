import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { buildStaticCollidersFromGLTF } from '../loaders/buildStaticColliders.js';

export const flickeringLights = [];

export function loadGLBModel(scene, rapierWorld) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      '/models/backroom_lit.glb',
      (gltf) => {
        if (!gltf.scene) {
          reject('GLTF has no scene');
          return;
        }

        const model = gltf.scene;
        model.position.set(-5, 0, 0);
        model.scale.set(1.5, 1.5, 1.5);

        model.traverse((child) => {
          if (child.isMesh) {
            const material = child.material;
            if (material.isMeshBasicMaterial) {
              child.material = new THREE.MeshStandardMaterial({
                color: material.color,
                map: material.map,
              });
            }
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.needsUpdate = true;
          } else if (child.isLight) {
            child.intensity = 60;

            if (child.isSpotLight) {
              child.angle = Math.PI / 3;
              child.penumbra = 1.0;
              child.distance = 15;
              child.decay = 2;
            }

            flickeringLights.push(child);
          }
        });

        scene.add(model);
        buildStaticCollidersFromGLTF(gltf, rapierWorld);
        resolve(); // ✅ done loading
      },
      undefined,
      (err) => reject(err)
    );
  });
}