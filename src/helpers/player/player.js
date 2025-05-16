
import * as THREE from 'three';
import { toggleFlashlight } from './flashlight';
import { controlFootsteps, playSound } from '../sounds/audio';
import RAPIER from '@dimforge/rapier3d-compat';
import { setGunMovementState } from './gunAnimation';

const MOVE_SPEED = 3;
const MOVEMENT_INTERPOLATION = 6;
const JUMP_SPEED = 8;
const GRAVITY = 9.81;
const STAND_HEIGHT = 1.6;
const CROUCH_HEIGHT = 1.0;
const CROUCH_SPEED_MULTIPLIER = 0.4;
const SPRINT_SPEED_MULTIPLIER = 1.8;
const MAX_SPRINT_DURATION = 5.0;
const SPRINT_RECHARGE_RATE = 0.5;
const BASE_FOV = 80;
const SPRINT_FOV = 105;
const DOLPHIN_DIVE_FORCE = 100;
const DOLPHIN_DIVE_UPWARD = 5;
const DOLPHIN_DIVE_COOLDOWN_TIME = 5;
const DIVE_TILT_AMOUNT = .2;
const BUNNY_BOOST = 5;

export function initPlayerState() {
  return {
    keys: { forward: false, backward: false, left: false, right: false, jump: false, sprint: false },
    isCrouching: false,
    velocity: new THREE.Vector3(),
    velocityTarget: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    canJump: true,
    isJumping: false,
    jumpTriggered: false,
    jumpStartTime: 0,
    sprintTime: MAX_SPRINT_DURATION,
    maxSprintTime: MAX_SPRINT_DURATION,
    wasSprinting: false,
    lastSprintTime: 0,
    sprintReleased: true,
    dolphinDiveActive: false,
    dolphinDiveCooldown: 0,
    dolphinDiveTriggered: false,
    dolphinDiveVelocity: new THREE.Vector3(),
    lastJumpTime: 0,
    lastGroundedTime: 0,
    jumpBufferedTime: 0,
    health: {
      current: 100,
      max: 100,
      damageInterval: 3,
      damageTimer: 0
    }
  };
}

export function initPlayerPhysics(world) {
  const playerDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2.0, 0);
  playerDesc.canSleep = false;
  const body = world.createRigidBody(playerDesc);
  body.setEnabledRotations(false, true, false);

  const colliderDesc = RAPIER.ColliderDesc.capsule(0.35, 0.8).setFriction(0.0).setDensity(1.0);
  const collider = world.createCollider(colliderDesc, body);

  return { playerBody: body, playerCollider: collider };
}

export function setupInputHandlers(state) {
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': state.keys.forward = true; break;
      case 'KeyS': state.keys.backward = true; break;
      case 'KeyA': state.keys.left = true; break;
      case 'KeyD': state.keys.right = true; break;
      case 'KeyF': toggleFlashlight(); break;
      case 'ControlLeft':
        state.isCrouching = true;
        const now = performance.now() / 1000;
        const recentlySprinted = (now - state.lastSprintTime) < 1.5;
        const recentlyJumped = (now - state.lastJumpTime) < 1.5;

        console.log("Check:", recentlySprinted, recentlyJumped, state.dolphinDiveCooldown);

        if (
          recentlyJumped &&
          recentlySprinted &&
          state.dolphinDiveCooldown <= 0
        ) {
          state.dolphinDiveTriggered = true;
          console.log("DIVE INPUT FIRED");
        }
        break;
      case 'ShiftLeft':
        if (state.sprintTime > 0 && state.sprintReleased) {
          state.keys.sprint = true;
          state.lastSprintTime = performance.now() / 1000;
        }
        break;
      case 'Space':
        if (!state.keys.jump) {
          state.keys.jump = true;
          state.lastJumpTime = performance.now() / 1000;
          state.jumpBufferedTime = performance.now() / 1000;
          state.jumpTriggered = true;
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

export function updatePlayer(delta, state, body, controls, tiltContainer, collider, rapierWorld) {
  if (!controls.isLocked) return;

  const currentVel = body.linvel();
  const isAirborne = Math.abs(currentVel.y) > 0.1;

  const cameraWrapper = controls.object;
  let camera;
  cameraWrapper.traverse(obj => {
    if (obj instanceof THREE.PerspectiveCamera) {
      camera = obj;
    }
  });
  if (!camera) {
    console.warn("PerspectiveCamera not found in wrapper!");
    return;
  }

  // Main movement logic
  if (state.dolphinDiveCooldown > 0) {
    state.dolphinDiveCooldown = Math.max(0, state.dolphinDiveCooldown - delta);
  }

  updateFOV(camera, state, delta);
  updateDiveCameraFX(tiltContainer, state, delta);
  handleSprintCrouch(delta, state, isAirborne);
  updateMovementDirection(state, controls);
  updateMovementVelocity(delta, state, isAirborne);

  const grounded = Math.abs(currentVel.y) < 0.05;
  const now = performance.now() / 1000;

  if (grounded) {
    if (!state.wasGrounded) state.lastGroundedTime = now;
    state.canJump = true;
  }

  handleDolphinDiveTrigger(state, controls, collider);
  updateDolphinDive(delta, state, controls, collider);
  state.wasGrounded = grounded;

  // Handle jumping
  let newY = currentVel.y;
  const jumpBuffered = (now - state.jumpBufferedTime) < 0.15;
  const groundedBuffered = grounded || (now - state.lastGroundedTime) < 0.1;

  if (state.jumpTriggered && state.canJump && jumpBuffered && groundedBuffered) {
    newY = JUMP_SPEED;
    state.canJump = false;
    state.jumpTriggered = false;
    state.jumpBufferedTime = 0;

    const justLanded = (now - state.lastGroundedTime) < 0.1;
    if (justLanded && state.direction.lengthSq() > 0.1) {
      const boost = state.direction.clone().multiplyScalar(BUNNY_BOOST);
      state.velocityTarget.add(boost);
    }

    playSound('jump');
  }

  // Apply movement
  const finalVelocity = new THREE.Vector3(
    state.velocityTarget.x,
    newY - GRAVITY * delta,
    state.velocityTarget.z
  );
  body.setLinvel(finalVelocity, true);

  rapierWorld.step();

  const newPos = body.translation();
  controls.object.position.set(newPos.x, newPos.y, newPos.z);

  setGunMovementState({
    moving: state.velocityTarget.lengthSq() > 0.001,
    sprinting: state.keys.sprint
  });

  const isMoving = state.direction.lengthSq() > 0.1;
  let footstepRate = 1;

  if (state.isCrouching) {
    footstepRate = 0.6;
  } else if (state.keys.sprint) {
    footstepRate = 1.5;
  }

  controlFootsteps(grounded && isMoving, footstepRate);
}



function updateFOV(camera, state, delta) {
  const targetFov = state.keys.sprint ? SPRINT_FOV : BASE_FOV;
  camera.fov += (targetFov - camera.fov) * 10 * delta;
  camera.updateProjectionMatrix();
}

function updateDiveCameraFX(cameraWrapper, state, delta) {
  const t = performance.now() * 0.005;

  const targetTiltX = state.dolphinDiveActive
    ? -DIVE_TILT_AMOUNT + Math.sin(t * 2.2) * 0.5 * DIVE_TILT_AMOUNT
    : 0;

  const targetTiltZ = state.dolphinDiveActive
    ? Math.sin(t) * 0.15 * DIVE_TILT_AMOUNT
    : 0;

  cameraWrapper.rotation.x += (targetTiltX - cameraWrapper.rotation.x) * 10 * delta;
  cameraWrapper.rotation.z += (targetTiltZ - cameraWrapper.rotation.z) * 10 * delta;

  cameraWrapper.rotation.x = THREE.MathUtils.clamp(cameraWrapper.rotation.x, -Math.PI / 4, Math.PI / 4);
  cameraWrapper.rotation.z = THREE.MathUtils.clamp(cameraWrapper.rotation.z, -Math.PI / 4, Math.PI / 4);
}

function handleSprintCrouch(delta, state, isAirborne) {
  const now = performance.now() / 1000;
  const isSprinting = state.keys.sprint && state.sprintTime > 0;

  if (!isAirborne && state.isCrouching) {
    state.sprintTime = Math.min(MAX_SPRINT_DURATION, state.sprintTime + SPRINT_RECHARGE_RATE * delta);
  } else if (isSprinting) {
    state.sprintTime -= delta;
    state.wasSprinting = true;
    state.lastSprintTime = now;

    if (state.sprintTime <= 0) {
      state.sprintTime = 0;
      state.keys.sprint = false;
      state.sprintReleased = false;
    }
  } else {
    state.sprintTime = Math.min(MAX_SPRINT_DURATION, state.sprintTime + SPRINT_RECHARGE_RATE * delta);
    state.wasSprinting = false;
  }
}

function updateMovementDirection(state, controls) {
  const { keys, direction } = state;
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
}

function updateMovementVelocity(delta, state, isAirborne) {
  const speedMult = state.isCrouching ? CROUCH_SPEED_MULTIPLIER : (state.keys.sprint ? SPRINT_SPEED_MULTIPLIER : 1);
  const moveTarget = state.direction.clone().multiplyScalar(MOVE_SPEED * speedMult);

  if (isAirborne) {
    state.velocityTarget.lerp(moveTarget, 2 * delta);
  } else {
    if (moveTarget.lengthSq() > 0) {
      state.velocityTarget.lerp(moveTarget, MOVEMENT_INTERPOLATION * delta);
    } else {
      state.velocityTarget.set(0, 0, 0);
    }
  }
}

function handleDolphinDiveTrigger(state, controls, playerCollider) {
  if (state.dolphinDiveTriggered && state.dolphinDiveCooldown <= 0) {
    state.dolphinDiveCooldown = Math.max(0, state.dolphinDiveCooldown - 0.016);
  }

  if (state.dolphinDiveTriggered && state.dolphinDiveCooldown <= 0) {
    const camDir = new THREE.Vector3();
    controls.getDirection(camDir);
    camDir.y = 0;
    camDir.normalize();

    state.dolphinDiveVelocity.copy(camDir).multiplyScalar(DOLPHIN_DIVE_FORCE);
    state.dolphinDiveVelocity.y = DOLPHIN_DIVE_UPWARD;

    state.dolphinDiveActive = true;
    state.dolphinDiveTriggered = false;
    state.dolphinDiveCooldown = DOLPHIN_DIVE_COOLDOWN_TIME;

    playerCollider.setHalfHeight(CROUCH_HEIGHT / 2);
    controls.object.position.y = CROUCH_HEIGHT;
  } else if (!state.dolphinDiveActive && state.dolphinDiveCooldown <= 0) {
    playerCollider.setHalfHeight(STAND_HEIGHT / 2);
    controls.object.position.y = STAND_HEIGHT;
  }
}

function updateDolphinDive(delta, state, controls, playerCollider) {
  if (state.dolphinDiveActive) {
    state.dolphinDiveVelocity.x *= 0.96;
    state.dolphinDiveVelocity.z *= 0.96;

    state.velocityTarget.add(
      new THREE.Vector3(state.dolphinDiveVelocity.x, 0, state.dolphinDiveVelocity.z).multiplyScalar(delta)
    );

    const horizontalSpeedSq =
      state.dolphinDiveVelocity.x ** 2 + state.dolphinDiveVelocity.z ** 2;

    if (horizontalSpeedSq < 0.15) {
      state.dolphinDiveActive = false;
      state.dolphinDiveVelocity.set(0, 0, 0);

      // 👇 Reset posture
      playerCollider.setHalfHeight(STAND_HEIGHT / 2);
      controls.object.position.y = STAND_HEIGHT;
    }
  }
}

