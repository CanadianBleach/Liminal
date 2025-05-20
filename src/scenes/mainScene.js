
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

import { PlayerController } from '../helpers/player/playerController.js';
import { EnemyManager } from '../helpers/enemy/enemyManager.js';
import { createFlashlight, updateFlashlight, flashlightState } from '../helpers/player/flashlight.js';
import { loadGLBModel, flickeringLights } from '../loaders/modelLoader.js';

import { listener, loadSounds, playSound } from '../helpers/sounds/audio.js';
import { getUIElements, setupDeathOverlay, updateUI } from '../helpers/ui/ui.js';
import { setupRoundIndicator } from '../helpers/ui/ui.js';
import { setupDamageOverlay } from '../helpers/ui/ui.js';
import { gunManager } from '../helpers/combat/gunManager.js';
import { weaponConfigs } from '../helpers/combat/weaponConfigs.js';

export async function initMainScene() {
    playSound('bg_noise');
    const { scene, camera, gunCamera, renderer, controls, cameraWrapper, tiltContainer } = initCore();
    const clock = new THREE.Clock();
    const composer = setupPostProcessingEffects(renderer, scene, camera);
    const deathOverlay = setupDeathOverlay();
    setupRoundIndicator();
    setupDamageOverlay();

    getUIElements();

    await RAPIER.init();
    const rapierWorld = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
    const enemyManager = new EnemyManager(scene, camera, rapierWorld);
    const player = new PlayerController(rapierWorld, controls, cameraWrapper, tiltContainer);

    gunManager.init(camera, scene, rapierWorld, enemyManager.enemies, weaponConfigs);
    await gunManager.preloadWeapons();

    await loadGLBModel(scene, rapierWorld);
    setupLighting(scene);

    const { flashlight, flashlightTarget } = createFlashlight();
    flashlight.intensity = 0;
    scene.add(flashlight, flashlightTarget);

    scene.add(controls.object);
    setupEvents(camera, renderer, controls);

    document.body.appendChild(renderer.domElement);

    return function startRendering() {
        animate();
    };

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        rapierWorld.step();

        player.update(delta);
        gunManager.update(delta, controls);
        enemyManager.update(delta, player.state);
        updateFlashlight(camera, flashlight, flashlightTarget, delta);

        flickeringLights.forEach(light => {
            if (Math.random() < 0.1) light.intensity = 60 + Math.random() * 60;
        });

        updateUI(player.state, enemyManager, flashlightState, gunManager.currentGun);

        if (player.state.health.current <= 0) {
            deathOverlay.style.opacity = '1';
            setTimeout(() => window.location.reload(), 2000);
        }

        // Sync gun camera
        gunCamera.position.copy(camera.position);
        gunCamera.quaternion.copy(camera.quaternion);

        // Render world first
        camera.layers.set(0);
        renderer.clear();
        composer.render();

        // Then render weapon over top
        renderer.clearDepth();
        gunCamera.layers.set(1);
        renderer.render(scene, gunCamera);
    }
}

function initCore() {
    const scene = new THREE.Scene();
    const canvas = document.getElementById("game-canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.autoClear = false; // ⬅️ Add this

    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.name = 'MainCamera';

    const gunCamera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    gunCamera.layers.set(1); // Only sees gun layer
    gunCamera.fov = 75; // or whatever you want for weapon view
    gunCamera.updateProjectionMatrix();

    camera.add(listener);
    loadSounds(camera);

    const tiltContainer = new THREE.Object3D();
    tiltContainer.add(camera);
    tiltContainer.add(gunCamera); // ← Add the gun camera here too

    const cameraWrapper = new THREE.Object3D();
    cameraWrapper.add(tiltContainer);
    scene.add(cameraWrapper);

    const controls = new PointerLockControls(cameraWrapper, renderer.domElement);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return { scene, camera, gunCamera, renderer, controls, cameraWrapper, tiltContainer };
}

function setupPostProcessingEffects(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
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
        if (!controls.isLocked) controls.lock();
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function setupLighting(scene) {
    const light = new THREE.AmbientLight(0xffffff, 10);
    light.layers.enable(1);
    scene.add(light);
}
