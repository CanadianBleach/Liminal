import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import { EnemyManager } from '../helpers/enemy/enemyManager';

const MOVE_SPEED = 10.0;
const JUMP_SPEED = 2.25;
const GRAVITY = 20;
const MAX_JUMP_DURATION = 0.25;
const BASE_FOV = 80;
const SPRINT_FOV = 105;
const MAX_SPRINT_DURATION = 5.0;
const SPRINT_RECHARGE_RATE = 0.5;

const flashlightState = {
  isOn: false,
  battery: 15.0,
  maxBattery: 15.0,
  rechargeRate: 2.0,
  drainRate: 1.0,
  flashlightIntensity: 100,
  flashlight: null
};

const bullets = [];
const bulletSpeed = 50;

export function initMainScene() {
  const { scene, camera, renderer, controls } = initCore();
  const playerState = initPlayerState();
  const clock = new THREE.Clock();
  const composer = setupPostProcessingEffects(renderer, scene, camera);
  const enemyManager = new EnemyManager(scene, camera);

  document.body.appendChild(renderer.domElement);
  scene.add(controls.getObject());
  addEnvironment(scene);
  loadGLBModel(scene); // 👈 Add this here  

  const { flashlight, flashlightTarget } = createFlashlight(camera);
  flashlightState.flashlight = flashlight;
  scene.add(flashlight, flashlightTarget);
  flashlight.visible = false;

  setupInputHandlers(playerState, camera, scene);

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    enemyManager.update(delta);
    if (controls.isLocked) {
        updatePlayer(delta, playerState, controls, camera);
      }
    updateBullets(delta, scene, camera, enemyManager);
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

  document.body.addEventListener('click', () => {
    controls.lock();
  });  
}

function initCore() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const controls = new PointerLockControls(camera, renderer.domElement);
    camera.position.y = 1.6;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
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
  
  
  function setupInputHandlers(state, camera, scene) {
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
  
    document.addEventListener('pointerdown', (e) => {
      if (e.button === 0) shootBullet(camera, scene);
      if (e.button === 2) toggleFlashlight();
    });
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
  
  function updatePlayer(delta, state, controls, camera) {
    const { keys, velocity, direction } = state;
  
    // Dampen horizontal velocity
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
  
    // Movement direction
    direction.set(
      Number(keys.right) - Number(keys.left),
      0,
      Number(keys.forward) - Number(keys.backward)
    ).normalize();
  
    // Movement speed
    let speed = MOVE_SPEED;
    let isSprinting = false;
  
    if (state.isCrouching) {
      speed *= 0.4;
      state.sprintTime = Math.min(MAX_SPRINT_DURATION, state.sprintTime + SPRINT_RECHARGE_RATE * delta);
    } else if (keys.sprint && state.sprintTime > 0) {
      isSprinting = true;
      speed *= 1.2;
      state.sprintTime -= delta;
      if (state.sprintTime <= 0) {
        state.sprintTime = 0;
        keys.sprint = false;
        state.sprintReleased = false;
      }
    } else {
      state.sprintTime = Math.min(MAX_SPRINT_DURATION, state.sprintTime + SPRINT_RECHARGE_RATE * delta);
    }
  
    // Apply movement
    controls.moveRight(direction.x * speed * delta);
    controls.moveForward(direction.z * speed * delta);
  
    // Smooth FOV transition
    const targetFov = isSprinting ? SPRINT_FOV : BASE_FOV;
    camera.fov += (targetFov - camera.fov) * 10 * delta;
    camera.updateProjectionMatrix();
  
    // Handle jumping
    const now = performance.now() / 1000;
    if (state.isJumping && keys.jump) {
      const held = now - state.jumpStartTime;
      if (held < MAX_JUMP_DURATION) {
        velocity.y = JUMP_SPEED;
      } else {
        state.isJumping = false;
      }
    }
  
    // Apply gravity
    velocity.y -= GRAVITY * delta;
    camera.position.y += velocity.y * delta;
  
    // Handle ground and crouch height
    const groundHeight = state.isCrouching ? 1.0 : 1.6;
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
  
  
  function shootBullet(camera, scene) {
    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    bullet.position.copy(camera.position).add(dir.clone().multiplyScalar(1));
    bullet.userData = { velocity: dir.clone().multiplyScalar(bulletSpeed) };
    scene.add(bullet);
    bullets.push(bullet);
  }
  
  function updateBullets(delta, scene, camera, enemyManager) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.position.add(b.userData.velocity.clone().multiplyScalar(delta));
      if (b.position.distanceTo(camera.position) > 100) {
        scene.remove(b);
        bullets.splice(i, 1);
        continue;
      }
      for (let j = enemyManager.enemies.length - 1; j >= 0; j--) {
        const enemy = enemyManager.enemies[j];
        const bulletBox = new THREE.Box3().setFromObject(b);
        const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
        if (bulletBox.intersectsBox(enemyBox)) {
          const isDead = enemy.takeDamage(1);
          if (isDead) enemyManager.enemies.splice(j, 1);
          scene.remove(b);
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }
  
  function createFlashlight(camera) {
    const light = new THREE.SpotLight(0xffffff, 25, 100, Math.PI / 8, 0.5, 1);
    light.castShadow = true;
    const target = new THREE.Object3D();
    light.target = target;
    return { flashlight: light, flashlightTarget: target };
  }
  
  function updateFlashlight(camera, flashlight, target) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    flashlight.position.copy(camera.position);
    target.position.copy(camera.position.clone().add(dir.clone().multiplyScalar(10)));
    flashlight.target.updateMatrixWorld();
  }
  
  function updateFlashlightBattery(delta) {
    const light = flashlightState.flashlight;
    if (flashlightState.isOn) {
      flashlightState.battery -= flashlightState.drainRate * delta;
      if (flashlightState.battery <= 0) {
        flashlightState.battery = 0;
        flashlightState.isOn = false;
        light.visible = false;
      }
    } else {
      flashlightState.battery = Math.min(
        flashlightState.maxBattery,
        flashlightState.battery + flashlightState.rechargeRate * delta
      );
    }
  }
  
  function toggleFlashlight() {
    const light = flashlightState.flashlight;
    if (!light) return;
    flashlightState.isOn = !flashlightState.isOn;
    light.visible = flashlightState.isOn && flashlightState.battery > 0;
  }
  
  function addEnvironment(scene) {
    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  
    // Ambient Light - gentle global lighting
    const ambient = new THREE.AmbientLight(0xffffff, 12); // ⬅️ Increased from 1.0
    scene.add(ambient);
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
  
          if (material.isMeshBasicMaterial) {
            child.material = new THREE.MeshStandardMaterial({
              color: material.color,
              map: material.map,
            });
          }
  
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.needsUpdate = true;
  
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
  
  