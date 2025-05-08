// Refactored mainScene.js to return startRendering and delay animation start

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import { updatePlayerPhysics } from '../helpers/player/player.js';
import { EnemyManager } from '../helpers/enemy/enemyManager.js';
import { initPlayerState, setupInputHandlers } from '../helpers/player/player.js';
import BulletManager from '../combat/bulletManager.js';
import { loadGunModel } from '../helpers/player/gunModel.js';
import { attachGun, triggerRecoil, updateGunAnimation, setGunMovementState } from '../helpers/player/gunAnimation.js';
import Gun from '../combat/gun.js';
import {
    createFlashlight,
    updateFlashlightBattery,
    updateFlashlight,
    toggleFlashlight
} from '../helpers/player/flashlight.js';
import { loadGLBModel, flickeringLights } from '../loaders/modelLoader.js';

export async function initMainScene() {
    const { scene, camera, renderer, controls } = initCore();
    const clock = new THREE.Clock();
    const composer = setupPostProcessingEffects(renderer, scene, camera);
    const playerState = initPlayerState();
    const enemyManager = new EnemyManager(scene, camera);

    await RAPIER.init();
    const rapierWorld = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
    const bulletManager = new BulletManager(scene, rapierWorld);
    const gunController = new Gun(bulletManager, camera);

    const playerDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2.0, 0);
    const playerBody = rapierWorld.createRigidBody(playerDesc);
    playerBody.setEnabledRotations(false, true, false);
    playerBody.setAngularDamping(1.0);

    const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.35, 0.8).setFriction(0.0);
    const playerCollider = rapierWorld.createCollider(playerColliderDesc, playerBody);

    const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
    const groundBody = rapierWorld.createRigidBody(groundDesc);
    const groundCollider = RAPIER.ColliderDesc.cuboid(50, 0.5, 50).setFriction(0.01);
    rapierWorld.createCollider(groundCollider, groundBody);

    const gun = await loadGunModel(camera);
    attachGun(gun);
    await loadGLBModel(scene, rapierWorld);

    addEnvironment(scene);

    const { flashlight, flashlightTarget } = createFlashlight();
    flashlight.visible = false;
    scene.add(flashlight, flashlightTarget);

    scene.add(controls.object);
    setupInputHandlers(playerState);
    setupEvents(camera, renderer, controls);

    document.body.appendChild(renderer.domElement);

    // Return a startRendering function that begins the render loop when called
    return function startRendering() {
        animate();
    };

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        updateFlashlightBattery(delta);
        updateFlashlight(camera, flashlight, flashlightTarget);
        enemyManager.update(delta);

        if (controls.isLocked) {
            updatePlayerPhysics(delta, playerState, playerBody, controls, rapierWorld, playerCollider);
            rapierWorld.step();

            const newPos = playerBody.translation();
            controls.object.position.set(newPos.x, newPos.y, newPos.z);

            setGunMovementState({
                moving: playerState.velocityTarget.lengthSq() > 0.001,
                sprinting: playerState.keys.sprint
            });
        }

        flickeringLights.forEach(light => {
            if (Math.random() < 0.1) {
                light.intensity = 60 + Math.random() * 60;
            }
        });

        bulletManager.update(delta);
        updateGunAnimation(delta, camera);
        gunController.update(delta, controls);
        composer.render();
    }
}

function initCore() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    const canvas = document.getElementById("game-canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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
        if (!controls.isLocked) {
            controls.lock();
        }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function addEnvironment(scene) {
    scene.add(initGround());
    initLighting(scene);
}

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
