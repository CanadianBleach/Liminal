import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function initMovementScene() {
    const MOVE_SPEED = 125.0;
    const JUMP_SPEED = 2.25;
    const GRAVITY = 20;
    const MAX_JUMP_DURATION = .25;
    const STAND_HEIGHT = 1.6;
    const CROUCH_HEIGHT = 1.0;
    const CROUCH_SPEED_MULTIPLIER = 0.4;
    const SPRINT_SPEED_MULTIPLIER = 1.2;
    const MAX_SPRINT_DURATION = 5.0;
    const SPRINT_RECHARGE_RATE = .5;
    const BASE_FOV = 80;
    const SPRINT_FOV = 105;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Create checkerboard texture for ground
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
    const checkerTexture = new THREE.CanvasTexture(canvas);
    checkerTexture.wrapS = checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.repeat.set(10, 10);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ map: checkerTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01; // Avoid Z-fighting
    ground.receiveShadow = true;
    scene.add(ground);

    const loader = new GLTFLoader();
    loader.load('./models/backrooms_another_level.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(-5, 0, 0);
        model.scale.set(1.5, 1.5, 1.5);
        model.traverse(child => {
            if (child.isMesh) {
                // Ensure it's affected by lights
                if (child.material && child.material.isMeshBasicMaterial) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: child.material.color,
                        map: child.material.map,
                    });
                }
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.needsUpdate = true;
            }
        });
        scene.add(model);
    });

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 10, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const controls = new PointerLockControls(camera, renderer.domElement);
    camera.position.y = STAND_HEIGHT;
    scene.add(controls.getObject());

    // Flashlight setup
    const flashlight = new THREE.SpotLight(0xffffff, 15, 50, Math.PI / 12, 0.2, 1);
    flashlight.castShadow = true;
    flashlight.position.set(.5, .5, 0);
    flashlight.visible = true;

    const flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0, -2, -10);

    camera.add(flashlight);
    camera.add(flashlightTarget);
    flashlight.target = flashlightTarget;
    scene.add(camera);

    let flashlightOn = true;

    document.body.addEventListener('click', () => controls.lock());

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        sprint: false
    };

    let canJump = true;
    let isJumping = false;
    let isCrouching = false;
    let jumpStartTime = 0;
    let sprintTime = MAX_SPRINT_DURATION;
    let sprintReleasedSinceDepletion = true;

    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': keys.forward = true; break;
            case 'KeyS': keys.backward = true; break;
            case 'KeyA': keys.left = true; break;
            case 'KeyD': keys.right = true; break;
            case 'ControlLeft': isCrouching = true; break;
            case 'ShiftLeft':
                if (sprintTime > 0 && sprintReleasedSinceDepletion) {
                    keys.sprint = true;
                }
                break;
            case 'Space':
                if (canJump && !keys.jump) {
                    keys.jump = true;
                    jumpStartTime = performance.now() / 1000;
                    isJumping = true;
                    canJump = false;
                }
                break;
            case 'KeyF':
                flashlightOn = !flashlightOn;
                flashlight.visible = flashlightOn;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': keys.forward = false; break;
            case 'KeyS': keys.backward = false; break;
            case 'KeyA': keys.left = false; break;
            case 'KeyD': keys.right = false; break;
            case 'ControlLeft': isCrouching = false; break;
            case 'ShiftLeft':
                keys.sprint = false;
                sprintReleasedSinceDepletion = true;
                break;
            case 'Space': keys.jump = false; break;
        }
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(keys.forward) - Number(keys.backward);
        direction.x = Number(keys.right) - Number(keys.left);
        direction.normalize();

        let currentMoveSpeed = MOVE_SPEED;

        if (isCrouching) {
            currentMoveSpeed *= CROUCH_SPEED_MULTIPLIER;
            sprintTime = Math.min(MAX_SPRINT_DURATION, sprintTime + SPRINT_RECHARGE_RATE * delta);
        } else if (keys.sprint && sprintTime > 0 && sprintReleasedSinceDepletion) {
            currentMoveSpeed *= SPRINT_SPEED_MULTIPLIER;
            sprintTime -= delta;
            if (sprintTime <= 0) {
                sprintTime = 0;
                keys.sprint = false;
                sprintReleasedSinceDepletion = false;
            }
        } else {
            sprintTime = Math.min(MAX_SPRINT_DURATION, sprintTime + SPRINT_RECHARGE_RATE * delta);
        }

        const isActuallySprinting = keys.sprint && sprintTime > 0 && !isCrouching;
        const targetFov = isActuallySprinting ? SPRINT_FOV : BASE_FOV;
        camera.fov += (targetFov - camera.fov) * 10 * delta;
        camera.updateProjectionMatrix();

        if (controls.isLocked) {
            velocity.z -= direction.z * currentMoveSpeed * delta;

            const groundHeight = isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;

            if (camera.position.y <= groundHeight + 0.001) {
                velocity.x -= direction.x * currentMoveSpeed * delta;
            }

            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);

            const currentTime = performance.now() / 1000;
            if (isJumping && keys.jump) {
                const heldTime = currentTime - jumpStartTime;
                if (heldTime < MAX_JUMP_DURATION) {
                    velocity.y = JUMP_SPEED;
                } else {
                    isJumping = false;
                }
            }

            velocity.y -= GRAVITY * delta;
            camera.position.y += velocity.y * delta;

            if (camera.position.y <= groundHeight) {
                camera.position.y = groundHeight;
                velocity.y = 0;
                canJump = true;
                isJumping = false;
            }

            const targetHeight = isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;
            const heightDiff = targetHeight - camera.position.y;
            if (Math.abs(heightDiff) > 0.001 && velocity.y === 0) {
                camera.position.y += heightDiff * 10 * delta;
            }
        }

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
