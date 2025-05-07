import * as THREE from 'three';

const MOVE_SPEED = 4;
const MOVEMENT_INTERPOLATION = 6;
const JUMP_SPEED = 5;
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
    velocityTarget: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    canJump: true,
    isJumping: false,
    jumpStartTime: 0,
    sprintTime: MAX_SPRINT_DURATION,
    sprintReleased: true,
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

export function updatePlayerPhysics(delta, state, body, controls, rapierWorld, playerCollider) {
  const { keys, direction } = state;

  // === Movement State: Sprinting, Crouching, Speed ===
  let speed = MOVE_SPEED;
  let isSprinting = false;
  const isAirborne = state.verticalVelocity !== 0;

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

  // === Camera FOV Adjustment ===
  const camera = controls.object;
  const targetFov = isSprinting ? SPRINT_FOV : BASE_FOV;
  camera.fov += (targetFov - camera.fov) * 10 * delta;
  camera.updateProjectionMatrix();

  // === Movement Direction Based on Camera ===
  direction.set(
    Number(keys.right) - Number(keys.left),
    0,
    Number(keys.forward) - Number(keys.backward)
  );

  if (direction.lengthSq() > 0) {
    direction.normalize();

    const camDir = new THREE.Vector3();
    controls.getDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

    const worldMove = new THREE.Vector3();
    worldMove.addScaledVector(camDir, direction.z);
    worldMove.addScaledVector(right, direction.x);
    direction.copy(worldMove.normalize());
  }

  const moveTarget = direction.clone().multiplyScalar(speed);

  // === Easing Horizontal Movement ===
  const isIdle = moveTarget.lengthSq() === 0;
  if (!isIdle) {
    state.velocityTarget.lerp(moveTarget, MOVEMENT_INTERPOLATION * delta);
  } else {
    state.velocityTarget.set(0, 0, 0);
  }

  // === Gravity and Jump Logic ===
  const currentVel = body.linvel();
  let newY = currentVel.y;

  // Jump
  if (state.isJumping) {
    newY = JUMP_SPEED;
    state.isJumping = false; // one-shot jump
  }

  // === Apply Final Velocity ===
  const velocity = new THREE.Vector3(
    state.velocityTarget.x,
    newY,
    state.velocityTarget.z
  );

  body.setLinvel(velocity, true);

  // === Ground Contact Detection ===
  let grounded = false;

  console.log("Checking contacts for", playerCollider.handle);
  rapierWorld.contactPairsWith(playerCollider.handle, (h1, h2, contactPair) => {
    for (let i = 0; i < contactPair.numContactManifolds(); i++) {
      console.log("Contact with:", h1, h2, "Normal Y:", normal.y);
      const manifold = contactPair.contactManifold(i);
      const normal = manifold.normal();
      if (normal.y > 0.5) {
        grounded = true;
        break;
      }
    }
  });

  if (grounded) {
    state.canJump = true;
    state.isJumping = false;

  }
}
