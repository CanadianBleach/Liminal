// player.js

import * as THREE from 'three';

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

export function initPlayerState() {
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

export function setupInputHandlers(state) {
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
}

export function updatePlayer(delta, state, controls, camera) {
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