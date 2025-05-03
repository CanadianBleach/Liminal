import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export const loadHDRI = (renderer, camera, scene, imagePath) => {
    const loader = new RGBELoader();
    loader.load(imagePath, function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        renderer.render(scene, camera);
    }, undefined, function (err) {
        console.error('An error occurred while loading the HDR.', err);
    });
}