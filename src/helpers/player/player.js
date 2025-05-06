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
const DIVE_IMPULSE = 12.0; // adjusted for smoothness
const DIVE_DURATION = 0.25;

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
    sprintReleased: true,
    shouldDive: false,
    diveTimer: 0,
    diveDirection: new THREE.Vector3()
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
          state.shouldDive = true;
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

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.set(
    Number(keys.right) - Number(keys.left),
    0,
    Number(keys.forward) - Number(keys.backward)
  ).normalize();

  const isAirborne = velocity.y !== 0;
  let speed = MOVE_SPEED;
  let isSprinting = false;

  if (!isAirborne && state.isCrouching) {
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

  const targetFov = isSprinting ? SPRINT_FOV : BASE_FOV;
  camera.fov += (targetFov - camera.fov) * 10 * delta;
  camera.updateProjectionMatrix();

  const now = performance.now() / 1000;
  if (state.isJumping && keys.jump) {
    const held = now - state.jumpStartTime;
    if (held < MAX_JUMP_DURATION) {
      velocity.y = JUMP_SPEED;
    } else {
      state.isJumping = false;
    }
  }

  velocity.y -= GRAVITY * delta;
  camera.position.y += velocity.y * delta;

  const groundHeight = state.isCrouching ? CROUCH_HEIGHT : STAND_HEIGHT;
  const landing = camera.position.y <= groundHeight && velocity.y <= 0;

  if (landing) {
    if (state.shouldDive && state.isCrouching) {
      state.diveDirection.set(0, 0, 0);
      camera.getWorldDirection(state.diveDirection);
      state.diveDirection.y = 0;
      state.diveDirection.normalize();
      state.diveTimer = DIVE_DURATION;
    }

    camera.position.y = groundHeight;
    velocity.y = 0;
    state.canJump = true;
    state.isJumping = false;
    state.shouldDive = false;
  }

  if (state.diveTimer > 0) {
    controls.moveRight(state.diveDirection.x * DIVE_IMPULSE * delta);
    controls.moveForward(state.diveDirection.z * DIVE_IMPULSE * delta);
    state.diveTimer -= delta;
  }

  const heightDiff = groundHeight - camera.position.y;
  if (Math.abs(heightDiff) > 0.001 && velocity.y === 0) {
    camera.position.y += heightDiff * 10 * delta;
  }

  controls.moveRight(direction.x * speed * delta);
  controls.moveForward(direction.z * speed * delta);
}
