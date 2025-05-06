import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import { EnemyManager } from '../helpers/enemy/enemyManager.js';
import { initPlayerState, setupInputHandlers, updatePlayer } from '../helpers/player/player.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

import {
    flashlightState,
    createFlashlight,
    updateFlashlightBattery,
    updateFlashlight,
    toggleFlashlight
} from '../helpers/player/flashlight.js';

import { loadGLBModel, flickeringLights } from '../loaders/modelLoader.js';

export function initMainScene() {
    const { scene, camera, renderer, controls } = initCore();
    const clock = new THREE.Clock();
    const composer = setupPostProcessingEffects(renderer, scene, camera);
    const playerState = initPlayerState();
    const enemyManager = new EnemyManager(scene, camera);

    document.body.appendChild(renderer.domElement);
    scene.add(controls.object);

    addEnvironment(scene);
    loadGLBModel(scene);

    // Flashlight setup
    const { flashlight, flashlightTarget } = createFlashlight();
    flashlight.visible = false;
    scene.add(flashlight, flashlightTarget);

    // Input setup
    setupInputHandlers(playerState);

    // Resize & pointer lock
    setupEvents(camera, renderer, controls);

    // Main render loop
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        updateFlashlightBattery(delta);
        updateFlashlight(camera, flashlight, flashlightTarget);

        enemyManager.update(delta);

        if (controls.isLocked) {
            updatePlayer(delta, playerState, controls, camera);
        }

        // Flicker lights slightly
        flickeringLights.forEach(light => {
            if (Math.random() < 0.1) {
                light.intensity = 60 + Math.random() * 60; // brief flicker
            }
        });

        composer.render();
    }

    animate();
}

// -- Core Setup Functions --

function initCore() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const controls = new PointerLockControls(camera, renderer.domElement);

    camera.position.y = 1.6;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return { scene, camera, renderer, controls };
}

function setupPostProcessingEffects(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new ShaderPass(LuminosityShader));
    composer.addPass(new FilmPass(0.4, 0.025, 648, false));
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['offset'].value = 1.0;
    vignettePass.uniforms['darkness'].value = 1.2;
    composer.addPass(vignettePass);
    return composer;
}

function setupEvents(camera, renderer, controls) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.body.addEventListener('click', () => {
        controls.lock();
    });

    // Add flashlight toggle on right click
    document.addEventListener('pointerdown', (e) => {
        if (e.button === 2) {
            toggleFlashlight();
        }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault()); // prevent browser menu
}

function addEnvironment(scene) {
    scene.add(initGround());
    initLighting(scene);
}

// --- SCENE HELPERS ---

function initGround() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const size = 64;
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            ctx.fillStyle = (x + y) % 2 ? '#000' : '#fff';
            ctx.fillRect(x * size, y * size, size, size);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.01;
    mesh.receiveShadow = true;
    return mesh;
}

function initLighting(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 4));
}