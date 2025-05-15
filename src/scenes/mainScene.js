
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

import { initPlayerPhysics, updatePlayerPhysics } from '../helpers/player/player.js';
import { EnemyManager } from '../helpers/enemy/enemyManager.js';
import { initPlayerState, setupInputHandlers } from '../helpers/player/player.js';
import BulletManager from '../helpers/combat/bulletManager.js';
import { loadGunModel } from '../helpers/player/gunModel.js';
import { attachGun, updateGunAnimation, setGunMovementState } from '../helpers/player/gunAnimation.js';
import Gun from '../helpers/combat/gun.js';
import { createFlashlight, updateFlashlightBattery, updateFlashlight, flashlightState } from '../helpers/player/flashlight.js';
import { loadGLBModel, flickeringLights } from '../loaders/modelLoader.js';

import { listener, loadSounds } from '../helpers/sounds/audio.js';
import { getUIElements, setupDeathOverlay, updateUI } from '../helpers/ui/ui.js';

export async function initMainScene() {
    const { scene, camera, renderer, controls, tiltContainer } = initCore();
    const clock = new THREE.Clock();
    const composer = setupPostProcessingEffects(renderer, scene, camera);
    const playerState = initPlayerState();
    const enemyManager = new EnemyManager(scene, camera);
    const deathOverlay = setupDeathOverlay();

    getUIElements();

    await RAPIER.init();
    const rapierWorld = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
    const bulletManager = new BulletManager(scene, rapierWorld, enemyManager);
    const gunController = new Gun(bulletManager, camera);

    const { playerBody, playerCollider } = initPlayerPhysics(rapierWorld);
    const gun = await loadGunModel(camera);
    attachGun(gun);
    await loadGLBModel(scene, rapierWorld);
    setupLighting(scene);

    const { flashlight, flashlightTarget } = createFlashlight();
    flashlight.intensity = 0;
    scene.add(flashlight, flashlightTarget);

    scene.add(controls.object);
    setupInputHandlers(playerState);
    setupEvents(camera, renderer, controls);

    document.body.appendChild(renderer.domElement);

    return function startRendering() {
        animate();
    };

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        updateFlashlightBattery(delta);
        updateFlashlight(camera, flashlight, flashlightTarget);
        enemyManager.update(delta, playerState.health);

        updatePlayer(delta);
        bulletManager.update(delta);
        gunController.update(delta, controls);
        gunController.handleBulletCollisions(enemyManager.enemies);
        updateGunAnimation(delta, camera);

        flickeringLights.forEach(light => {
            if (Math.random() < 0.1) light.intensity = 60 + Math.random() * 60;
        });

        composer.render();
        updateUI(playerState, enemyManager.killCount, flashlightState);

        if (playerState.health.current <= 0) {
            deathOverlay.style.opacity = '1';
            setTimeout(() => location.reload(), 2000);
        }
    }

    function updatePlayer(delta) {
        if (controls.isLocked) {
            updatePlayerPhysics(delta, playerState, playerBody, controls, tiltContainer, playerCollider);
            rapierWorld.step();
            const newPos = playerBody.translation();
            controls.object.position.set(newPos.x, newPos.y, newPos.z);
            setGunMovementState({
                moving: playerState.velocityTarget.lengthSq() > 0.001,
                sprinting: playerState.keys.sprint
            });
        }
    }
}

function initCore() {
    const scene = new THREE.Scene();
    const canvas = document.getElementById("game-canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.add(listener);
    loadSounds(camera);

    const tiltContainer = new THREE.Object3D();
    tiltContainer.add(camera);

    const cameraWrapper = new THREE.Object3D();
    cameraWrapper.add(tiltContainer);
    scene.add(cameraWrapper);

    const controls = new PointerLockControls(cameraWrapper, renderer.domElement);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return { scene, camera, cameraWrapper, renderer, controls, tiltContainer };
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
    scene.add(new THREE.AmbientLight(0xffffff, 4));
}
