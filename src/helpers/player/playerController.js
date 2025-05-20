
import * as THREE from 'three';
import { toggleFlashlight } from './flashlight.js';
import { controlFootsteps, playSound } from '../sounds/audio.js';
import { gunManager } from '../combat/gunManager.js';
import RAPIER from '@dimforge/rapier3d-compat';

export class PlayerController {
  constructor(rapierWorld, controls, cameraWrapper, tiltContainer) {
    this.controls = controls;
    this.cameraWrapper = cameraWrapper;
    this.tiltContainer = tiltContainer;
    this.rapierWorld = rapierWorld;

    this.config = {
      MOVE_SPEED: 3,
      MOVEMENT_INTERPOLATION: 6,
      JUMP_SPEED: 8,
      GRAVITY: 9.81,
      STAND_HEIGHT: 1.6,
      CROUCH_HEIGHT: 1.0,
      CROUCH_SPEED_MULTIPLIER: 0.4,
      SPRINT_SPEED_MULTIPLIER: 1.8,
      MAX_SPRINT_DURATION: 5.0,
      SPRINT_RECHARGE_RATE: 0.5,
      BASE_FOV: 80,
      SPRINT_FOV: 105,
      DOLPHIN_DIVE_FORCE: 100,
      DOLPHIN_DIVE_UPWARD: 5,
      DOLPHIN_DIVE_COOLDOWN_TIME: 5,
      DIVE_TILT_AMOUNT: .2,
      BUNNY_BOOST: 5,
    };

    this.state = {
      keys: { forward: false, backward: false, left: false, right: false, jump: false, sprint: false },
      isCrouching: false,
      isCrouchCollider: false,
      velocity: new THREE.Vector3(),
      velocityTarget: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      canJump: true,
      isJumping: false,
      jumpTriggered: false,
      jumpStartTime: 0,
      sprintTime: this.config.MAX_SPRINT_DURATION,
      maxSprintTime: this.config.MAX_SPRINT_DURATION,
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
      },
    };

    this.initPhysics();
    this.setupInputHandlers();
  }

  setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.state.keys.forward = true; break;
        case 'KeyS': this.state.keys.backward = true; break;
        case 'KeyA': this.state.keys.left = true; break;
        case 'KeyD': this.state.keys.right = true; break;
        case 'ShiftLeft':
          this.state.keys.sprint = true;
          this.state.lastSprintTime = performance.now() / 1000;
          break;
        case 'ControlLeft':
          this.state.isCrouching = true;
          const now = performance.now() / 1000;
          if ((now - this.state.lastSprintTime) < 1.5 && (now - this.state.lastJumpTime) < 1.5 && this.state.dolphinDiveCooldown <= 0) {
            this.state.dolphinDiveTriggered = true;
          }
          break;
        case 'Space':
          if (!this.state.keys.jump) {
            this.state.keys.jump = true;
            this.state.jumpTriggered = true;
            this.state.lastJumpTime = performance.now() / 1000;
            this.state.jumpBufferedTime = performance.now() / 1000;
          }
          break;
        case 'KeyR':
          gunManager.currentGun.startReload?.();
          break;
        case 'KeyF':
          toggleFlashlight();
          break;
        case 'Digit1':
          gunManager.switchWeapon('rifle');
          break;
        case 'Digit2':
          gunManager.switchWeapon('awp');
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.state.keys.forward = false; break;
        case 'KeyS': this.state.keys.backward = false; break;
        case 'KeyA': this.state.keys.left = false; break;
        case 'KeyD': this.state.keys.right = false; break;
        case 'ShiftLeft': this.state.keys.sprint = false; this.state.sprintReleased = true; break;
        case 'ControlLeft': this.state.isCrouching = false; break;
        case 'Space': this.state.keys.jump = false; break;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        gunManager.currentGun.isMouseDown = true;
        gunManager.currentGun.hasFiredSinceMouseDown = false;
        if (gunManager.currentGun.fireMode === 'burst') {
          gunManager.currentGun.burstShotsRemaining = gunManager.currentGun.burstCount;
        }
      }
      if (e.button === 2 && gunManager.currentGun.canADS) {
        gunManager.currentGun.isAiming = true;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        gunManager.currentGun.isMouseDown = false;
        gunManager.currentGun.hasFiredSinceMouseDown = false;
      }
      if (e.button === 2 && gunManager.currentGun.canADS) {
        gunManager.currentGun.isAiming = false;
      }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  initPhysics() {
    const playerDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 3, 0)  // Lift player off ground
      .setCanSleep(false);
    this.body = this.rapierWorld.createRigidBody(playerDesc);
    this.body.setEnabledRotations(false, true, false);

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.35, this.config.STAND_HEIGHT / 2)
      .setFriction(0.0)
      .setDensity(1.0);

    this.collider = this.rapierWorld.createCollider(colliderDesc, this.body);
    this.collider.userData = {
      type: 'player',
      playerRef: this // optional: reference back to the controller
    };
  }

  update(delta) {
    if (!this.controls.isLocked) return;

    const currentVel = this.body.linvel();
    const isAirborne = Math.abs(currentVel.y) > 0.1;

    const camera = this._getCamera();
    if (!camera) return;

    if (this.state.dolphinDiveCooldown > 0) {
      this.state.dolphinDiveCooldown = Math.max(0, this.state.dolphinDiveCooldown - delta);
    }

    this._updateFOV(camera, delta);
    this._updateDiveCameraFX(delta);
    this._handleSprintCrouch(delta, isAirborne);
    this._updateMovementDirection();
    this._updateMovementVelocity(delta, isAirborne);

    const grounded = Math.abs(currentVel.y) < 0.05;
    const now = performance.now() / 1000;

    if (grounded) {
      if (!this.state.wasGrounded) this.state.lastGroundedTime = now;
      this.state.canJump = true;
    }

    this._handleDolphinDiveTrigger();
    this._updateDolphinDive(delta);
    this.state.wasGrounded = grounded;

    let newY = currentVel.y;
    const jumpBuffered = (now - this.state.jumpBufferedTime) < 0.15;
    const groundedBuffered = grounded || (now - this.state.lastGroundedTime) < 0.1;

    if (this.state.jumpTriggered && this.state.canJump && jumpBuffered && groundedBuffered) {
      newY = this.config.JUMP_SPEED;
      this.state.canJump = false;
      this.state.jumpTriggered = false;
      this.state.jumpBufferedTime = 0;

      const justLanded = (now - this.state.lastGroundedTime) < 0.1;
      if (justLanded && this.state.direction.lengthSq() > 0.1) {
        const boost = this.state.direction.clone().multiplyScalar(this.config.BUNNY_BOOST);
        this.state.velocityTarget.add(boost);
      }

      playSound('jump');
    }

    const finalVelocity = new THREE.Vector3(
      this.state.velocityTarget.x,
      newY - this.config.GRAVITY * delta,
      this.state.velocityTarget.z
    );
    this.body.setLinvel(finalVelocity, true);

    const newPos = this.body.translation();
    this.cameraWrapper.position.set(newPos.x, newPos.y, newPos.z);

    gunManager.updateMovementState({
      moving: this.state.direction.lengthSq() > 0.001,
      sprinting: this.state.keys.sprint
    });

    const isMoving = this.state.direction.lengthSq() > 0.1;
    let footstepRate = 1;
    if (this.state.isCrouching) footstepRate = 0.6;
    else if (this.state.keys.sprint) footstepRate = 1.5;

    controlFootsteps(grounded && isMoving, footstepRate);
  }

  _getCamera() {
    let cam = null;
    this.cameraWrapper.traverse(obj => {
      if (obj instanceof THREE.PerspectiveCamera && obj.name === 'MainCamera') {
        cam = obj;
      }
    });
    return cam;
  }

  _updateFOV(camera, delta) {
    const targetFov = this.state.keys.sprint ? this.config.SPRINT_FOV : this.config.BASE_FOV;
    camera.fov += (targetFov - camera.fov) * 10 * delta;
    camera.updateProjectionMatrix();
  }

  _updateDiveCameraFX(delta) {
    const t = performance.now() * 0.005;
    const targetTiltX = this.state.dolphinDiveActive ? -this.config.DIVE_TILT_AMOUNT + Math.sin(t * 2.2) * 0.5 * this.config.DIVE_TILT_AMOUNT : 0;
    const targetTiltZ = this.state.dolphinDiveActive ? Math.sin(t) * 0.15 * this.config.DIVE_TILT_AMOUNT : 0;

    this.tiltContainer.rotation.x += (targetTiltX - this.tiltContainer.rotation.x) * 10 * delta;
    this.tiltContainer.rotation.z += (targetTiltZ - this.tiltContainer.rotation.z) * 10 * delta;

    this.tiltContainer.rotation.x = THREE.MathUtils.clamp(this.tiltContainer.rotation.x, -Math.PI / 4, Math.PI / 4);
    this.tiltContainer.rotation.z = THREE.MathUtils.clamp(this.tiltContainer.rotation.z, -Math.PI / 4, Math.PI / 4);
  }

  _handleSprintCrouch(delta, isAirborne) {
    const now = performance.now() / 1000;
    const isSprinting = this.state.keys.sprint && this.state.sprintTime > 0;

    if (!isAirborne && this.state.isCrouching) {
      this.state.sprintTime = Math.min(this.config.MAX_SPRINT_DURATION, this.state.sprintTime + this.config.SPRINT_RECHARGE_RATE * delta);
    } else if (isSprinting) {
      this.state.sprintTime -= delta;
      this.state.wasSprinting = true;
      this.state.lastSprintTime = now;
      if (this.state.sprintTime <= 0) {
        this.state.sprintTime = 0;
        this.state.keys.sprint = false;
        this.state.sprintReleased = false;
      }
    } else {
      this.state.sprintTime = Math.min(this.config.MAX_SPRINT_DURATION, this.state.sprintTime + this.config.SPRINT_RECHARGE_RATE * delta);
      this.state.wasSprinting = false;
    }
  }

  _updateMovementDirection() {
    const { keys, direction } = this.state;
    direction.set(
      Number(keys.right) - Number(keys.left),
      0,
      Number(keys.forward) - Number(keys.backward)
    );

    if (direction.lengthSq() > 0) {
      direction.normalize();
      const camDir = new THREE.Vector3();
      this.controls.getDirection(camDir);
      camDir.y = 0;
      camDir.normalize();

      const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
      const worldMove = new THREE.Vector3();
      worldMove.addScaledVector(camDir, direction.z);
      worldMove.addScaledVector(right, direction.x);
      direction.copy(worldMove.normalize());
    }
  }


  _updateMovementVelocity(delta, isAirborne) {
    const speedMult = this.state.isCrouching
      ? this.config.CROUCH_SPEED_MULTIPLIER
      : this.state.keys.sprint
        ? this.config.SPRINT_SPEED_MULTIPLIER
        : 1;
    const moveTarget = this.state.direction.clone().multiplyScalar(this.config.MOVE_SPEED * speedMult);

    if (isAirborne) {
      this.state.velocityTarget.lerp(moveTarget, 2 * delta);
    } else {
      if (moveTarget.lengthSq() > 0) {
        this.state.velocityTarget.lerp(moveTarget, this.config.MOVEMENT_INTERPOLATION * delta);
      } else {
        this.state.velocityTarget.set(0, 0, 0);
      }
    }
  }

  _handleDolphinDiveTrigger() {
    if (this.state.dolphinDiveTriggered && this.state.dolphinDiveCooldown <= 0) {
      playSound('dive');
      const camDir = new THREE.Vector3();
      this.controls.getDirection(camDir);
      camDir.y = 0;
      camDir.normalize();

      this.state.dolphinDiveVelocity.copy(camDir).multiplyScalar(this.config.DOLPHIN_DIVE_FORCE);
      this.state.dolphinDiveVelocity.y = this.config.DOLPHIN_DIVE_UPWARD;

      this.state.dolphinDiveActive = true;
      this.state.dolphinDiveTriggered = false;
      this.state.dolphinDiveCooldown = this.config.DOLPHIN_DIVE_COOLDOWN_TIME;

      this._replacePlayerCollider(this.config.CROUCH_HEIGHT);
      this.cameraWrapper.position.y = this.config.CROUCH_HEIGHT;
      this.state.isCrouchCollider = true;
    }

    else if (
      !this.state.dolphinDiveActive &&
      this.state.dolphinDiveCooldown <= 0 &&
      this.state.isCrouchCollider
    ) {
      this._replacePlayerCollider(this.config.STAND_HEIGHT);
      this.cameraWrapper.position.y = this.config.STAND_HEIGHT;
      this.state.isCrouchCollider = false;
    }
  }

  _updateDolphinDive(delta) {
    if (this.state.dolphinDiveActive) {
      this.state.dolphinDiveVelocity.x *= 0.96;
      this.state.dolphinDiveVelocity.z *= 0.96;

      this.state.velocityTarget.add(
        new THREE.Vector3(this.state.dolphinDiveVelocity.x, 0, this.state.dolphinDiveVelocity.z).multiplyScalar(delta)
      );

      const horizontalSpeedSq = this.state.dolphinDiveVelocity.x ** 2 + this.state.dolphinDiveVelocity.z ** 2;
      if (horizontalSpeedSq < 0.15) {
        this.state.dolphinDiveActive = false;
        this.state.dolphinDiveVelocity.set(0, 0, 0);
      }
    }
  }

  _replacePlayerCollider(newHeight) {
    const currentPos = this.body.translation();


    if (this.body) {
      this.rapierWorld.removeRigidBody(this.body);
    }

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
      currentPos.x, currentPos.y, currentPos.z
    );

    bodyDesc.setCanSleep(false);
    this.body = this.rapierWorld.createRigidBody(bodyDesc);
    this.body.setEnabledRotations(false, true, false);

    const colliderDesc = RAPIER.ColliderDesc.capsule(0.35, newHeight / 2)
      .setFriction(0.0)
      .setDensity(1.0)
      .setCollisionGroups(0b01 << 16 | 0b01);
    this.collider = this.rapierWorld.createCollider(colliderDesc, this.body);

    const pos = this.body.translation();
    this.cameraWrapper.position.set(pos.x, pos.y, pos.z);
  }
}
