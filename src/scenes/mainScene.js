import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import { EnemyManager } from './enemyManager.js';


const MOVE_SPEED = 10.0;
const JUMP_SPEED = 2.25;
const GRAVITY = 20;
const MAX_JUMP_DURATION = 0.25;
const STAND_HEIGHT = 1.6;
const CROUCH_HEIGHT = 1.0;
const CROUCH_SPEED_MULTIPLIER = 0.4;
const SPRINT_SPEED_MULTIPLIER = 1.2;
const MAX_SPRINT_DURATION = 5.0;
const SPRINT_RECHARGE_RATE = 0.5;
const BASE_FOV = 80;
const SPRINT_FOV = 105;

let flickerMaterial;

const flashlightState = {
    isOn: false,
    battery: 15.0,
    maxBattery: 15.0,
    rechargeRate: 2.0,
    drainRate: 1.0,
    flashlightIntensity: 100,
    flashlight: null
};

export function setupPostProcessingEffects(renderer, scene, camera) {
    const composer = new EffectComposer(renderer);

    // Base render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Convert to black & white
    const luminosityPass = new ShaderPass(LuminosityShader);
    composer.addPass(luminosityPass);

    // Add film grain and scanlines
    const filmPass = new FilmPass(
        0.4,   // noise intensity
        0.025,  // scanline intensity
        648,    // scanline count
        false   // grayscale (already handled by luminosity)
    );
    composer.addPass(filmPass);

    // Add vignette
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['offset'].value = 1.0;
    vignettePass.uniforms['darkness'].value = 1.2;
    composer.addPass(vignettePass);

    return composer;
}

export function initMainScene() {
    const { scene, camera, renderer, controls } = initCore();
    const playerState = initPlayerState();
    const clock = new THREE.Clock();

    const composer = setupPostProcessingEffects(renderer, scene, camera);

    const enemyManager = new EnemyManager(scene, camera);

    document.body.appendChild(renderer.domElement);
    scene.add(controls.object);
    addEnvironment(scene);
    loadGLBModel(scene);

    const { flashlight, flashlightTarget } = createFlashlight(camera);
    flashlightState.flashlight = flashlight;
    flashlight.visible = false;
    scene.add(flashlight, flashlightTarget);

    document.body.addEventListener('click', () => controls.lock());
    setupInputHandlers(playerState);

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        enemyManager.update(delta);

        if (controls.isLocked) {
            updatePlayer(delta, playerState, controls, camera);
        }

        updateFlashlightBattery(delta);
        updateFlashlight(camera, flashlight, flashlightTarget);
        composer.render();
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- CORE SETUP ---

function initCore() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const controls = new PointerLockControls(camera, renderer.domElement);
    camera.position.y = STAND_HEIGHT;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return { scene, camera, renderer, controls };
}

function initPlayerState() {
    return {
        keys: { forward: false, backward: false, left: false, right: false, jump: false, sprint: false },
        isCrouching: false,
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        canJump: true,
        isJumping: false,
        jumpStartTime: 0,
        sprintTime: MAX_SPRINT_DURATION,
        sprintReleased: true
    };
}

function addEnvironment(scene) {
    scene.add(initGround());
    initLighting(scene);
}

// --- INPUT HANDLING ---

function setupInputHandlers(state) {
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': state.keys.forward = true; break;
            case 'KeyS': state.keys.backward = true; break;
            case 'KeyA': state.keys.left = true; break;
            case 'KeyD': state.keys.right = true; break;
            case 'ControlLeft': state.isCrouching = true; break;
            case 'ShiftLeft':
                if (state.sprintTime > 0 && state.sprintReleased) state.keys.sprint = true;
                break;
            case 'Space':
                if (state.canJump && !state.keys.jump) {
                    state.keys.jump = true;
                    state.jumpStartTime = performance.now() / 1000;
                    state.isJumping = true;
                    state.canJump = false;
                }
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': state.keys.forward = false; break;
            case 'KeyS': state.keys.backward = false; break;
            case 'KeyA': state.keys.left = false; break;
            case 'KeyD': state.keys.right = false; break;
            case 'ControlLeft': state.isCrouching = false; break;
            case 'ShiftLeft':
                state.keys.sprint = false;
                state.sprintReleased = true;
                break;
            case 'Space': state.keys.jump = false; break;
        }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerdown', (e) => {
        if (e.button === 2) toggleFlashlight();
    });
}

// --- PLAYER MOVEMENT ---

function updatePlayer(delta, state, controls, camera) {
    const { keys, velocity, direction } = state;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.set(
        Number(keys.right) - Number(keys.left),
        0,
        Number(keys.forward) - Number(keys.backward)
    ).normalize();

    let speed = MOVE_SPEED;
    let isSprinting = false;

    if (state.isCrouching) {
        speed *= CROUCH_SPEED_MULTIPLIER;
        state.sprintTime = Math.min(MAX_SPRINT_DURATION, state.sprintTime + SPRINT_RECHARGE_RATE * delta);
    } else if (keys.sprint && state.sprintTime > 0) {
        isSprinting = true;
        speed *= SPRINT_SPEED_MULTIPLIER;
        state.sprintTime -= delta;
        if (state.sprintTime <= 0) {
            state.sprintTime = 0;
            keys.sprint = false;
            state.sprintReleased = false;
        }
    } else {
        state.sprintTime = Math.min(MAX_SPRINT_DURATION, state.sprintTime + SPRINT_RECHARGE_RATE * delta);
    }

    // Smooth FOV transition
    const targetFov = isSprinting ? SPRINT_FOV : BASE_FOV;
    camera.fov += (targetFov - camera.fov) * 10 * delta;
    camera.updateProjectionMatrix();

    const moveX = direction.x * speed * delta;
    const moveZ = direction.z * speed * delta;

    controls.moveRight(moveX);
    controls.moveForward(moveZ);

    const currentTime = performance.now() / 1000;
    if (state.isJumping && keys.jump) {
        const heldTime = currentTime - state.jumpStartTime;
        if (heldTime < MAX_JUMP_DURATION) {
            velocity.y = JUMP_SPEED;
        } else {
            state.isJumping = false;
        }
    }

    velocity.y -= GRAVITY * delta;
    camera.position.y += velocity.y * delta;

    const groundHeight = state.isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;
    if (camera.position.y <= groundHeight) {
        camera.position.y = groundHeight;
        velocity.y = 0;
        state.canJump = true;
        state.isJumping = false;
    }

    const heightDiff = groundHeight - camera.position.y;
    if (Math.abs(heightDiff) > 0.001 && velocity.y === 0) {
        camera.position.y += heightDiff * 10 * delta;
    }
}

// --- FLASHLIGHT ---

function toggleFlashlight() {
    const light = flashlightState.flashlight;
    if (flashlightState.isOn) {
        flashlightState.isOn = false;
        light.visible = false;
    } else if (flashlightState.battery >= 1) {
        flashlightState.isOn = true;
        light.visible = true;
        light.intensity = 25;
    }
}

function updateFlashlightBattery(delta) {
    const light = flashlightState.flashlight;

    if (flashlightState.isOn) {
        flashlightState.battery -= flashlightState.drainRate * delta;
        flashlightState.battery = Math.max(0, flashlightState.battery);

        if (flashlightState.battery < 1) {
            flashlightState.isOn = false;
            light.visible = false;
            return;
        }

        if (flashlightState.battery < 5) {
            light.visible = Math.random() > 0.95;
        } else if (flashlightState.battery < 20) {
            light.intensity = flashlightState.flashlightIntensity - 50 + Math.random() * 5;
        } else if (flashlightState.battery < 50) {
            light.intensity = flashlightState.flashlightIntensity - 25 + Math.random() * 2;
        } else {
            light.intensity = flashlightState.flashlightIntensity;
        }
    } else {
        flashlightState.battery = Math.min(
            flashlightState.maxBattery,
            flashlightState.battery + flashlightState.rechargeRate * delta
        );
    }
}

function createFlashlight(camera) {
    const light = new THREE.SpotLight(0xf8ffa2, flashlightState.flashlightIntensity, 90, Math.PI / 8, 0.2, 1);
    light.castShadow = true;
    const target = new THREE.Object3D();
    light.target = target;
    return { flashlight: light, flashlightTarget: target };
}

function updateFlashlight(camera, flashlight, target) {
    const right = new THREE.Vector3();
    camera.getWorldDirection(right);
    right.cross(camera.up).normalize();

    const offset = right.multiplyScalar(0.3).add(new THREE.Vector3(0, -0.25, 0));
    flashlight.position.lerp(camera.position.clone().add(offset), 0.15);

    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    const targetPos = camera.position.clone().add(lookDir.multiplyScalar(10));
    target.position.lerp(targetPos, 0.15);
    target.updateMatrixWorld();

    flashlight.lookAt(target.position);
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

function loadGLBModel(scene) {
    const loader = new GLTFLoader();
    loader.load('./models/backroom_lit.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(-5, 0, 0);
        model.scale.set(1.5, 1.5, 1.5);

        model.traverse((child) => {
            if (child.isMesh) {
                const material = child.material;

                // Replace MeshBasicMaterial with MeshStandardMaterial for proper lighting
                if (material.isMeshBasicMaterial) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: material.color,
                        map: material.map,
                    });
                }

                child.castShadow = true;
                child.receiveShadow = true;
                child.material.needsUpdate = true;

                // Check for emissive property
                if (material.emissive && material.emissiveIntensity > 0) {
                    const light = new THREE.PointLight(0xffffff, 100, 10);
                    light.position.copy(child.getWorldPosition(new THREE.Vector3()));
                    light.castShadow = true;
                    scene.add(light);
                }
            }
        });

        scene.add(model);
    });
}
