import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function initMovementScene() {
    // === Player Control Settings ===
    const MOVE_SPEED = 200.0;
    const JUMP_SPEED = 6;
    const GRAVITY = 20;
    const MAX_JUMP_DURATION = 0.25; // seconds

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Checkerboard texture for ground
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
    scene.add(ground);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    camera.position.y = 1.6;
    scene.add(controls.getObject());

    document.body.addEventListener('click', () => controls.lock());

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false
    };

    let canJump = true;
    let isJumping = false;
    let jumpStartTime = 0;
    let yPosition = camera.position.y;

    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': keys.forward = true; break;
            case 'KeyS': keys.backward = true; break;
            case 'KeyA': keys.left = true; break;
            case 'KeyD': keys.right = true; break;
            case 'Space':
                if (canJump && !keys.jump) {
                    keys.jump = true;
                    jumpStartTime = performance.now() / 1000;
                    isJumping = true;
                    canJump = false;
                }
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') keys.jump = false;
        if (e.code === 'KeyW') keys.forward = false;
        if (e.code === 'KeyS') keys.backward = false;
        if (e.code === 'KeyA') keys.left = false;
        if (e.code === 'KeyD') keys.right = false;
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

        if (controls.isLocked) {
            direction.z = Number(keys.forward) - Number(keys.backward);
            direction.x = Number(keys.right) - Number(keys.left);
            direction.normalize();

            // Apply forward/backward movement even in air
            velocity.z -= direction.z * MOVE_SPEED * delta;

            // Only apply left/right movement when grounded
            if (yPosition <= 1.6) {
                velocity.x -= direction.x * MOVE_SPEED * delta;
            }

            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);

            // Jumping logic
            const currentTime = performance.now() / 1000;
            if (isJumping && keys.jump) {
                const heldTime = currentTime - jumpStartTime;
                if (heldTime < MAX_JUMP_DURATION) {
                    velocity.y = JUMP_SPEED;
                } else {
                    isJumping = false;
                }
            }

            // Apply gravity
            velocity.y -= GRAVITY * delta;
            yPosition += velocity.y * delta;

            if (yPosition <= 1.6) {
                velocity.y = 0;
                yPosition = 1.6;
                canJump = true;
                isJumping = false;
            }

            camera.position.y = yPosition;
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
