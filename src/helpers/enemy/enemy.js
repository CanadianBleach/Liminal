import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

let enemyCounter = 0;

export class Enemy {
  constructor(scene, rapierWorld, position = new THREE.Vector3(0, 1.5, -5), textureUrl = null) {
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.health = 100;
    this.alive = true;
    this.id = enemyCounter++;
    this.textureUrl = textureUrl;

    this.originalColor = new THREE.Color(0xffffff);
    this.hitFlashTime = 0;

    this.moveSpeed = 1.5;
    this.minDistanceToPlayer = 1;

    this.mesh = this._createMesh(position);
    this.scene.add(this.mesh);

    this.collider = this._createCollider(position);
  }

  _createMesh(position) {
    const texture = this.textureUrl instanceof THREE.Texture ? this.textureUrl : null;

    console.log('Loaded texture:', texture.image);

    const material = new THREE.MeshBasicMaterial({
      map: texture || null,
      color: texture ? 0xffffff : 0xff00ff, // fallback pink if no texture
      //transparent: true,
      side: THREE.DoubleSide,
      //alphaTest: 0.5
    });

    const geometry = new THREE.PlaneGeometry(1, 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.y = Math.PI;

    const boxHelper = new THREE.BoxHelper(mesh, 0xffff00);
    this.scene.add(boxHelper);

    return mesh;
  }


  _createCollider(position) {
    const desc = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.01) // Thin Z to match plane
      .setTranslation(position.x, position.y, position.z)
      .setCollisionGroups(0b01 << 16 | 0b01);

    const collider = this.rapierWorld.createCollider(desc);
    collider.userData = {
      type: 'enemy',
      enemyId: this.id,
      enemyRef: this
    };
    return collider;
  }

  update(playerPosition, delta) {
    const dir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
    const dist = dir.length();

    if (dist > this.minDistanceToPlayer) {
      dir.normalize();
      this.mesh.position.add(dir.multiplyScalar(this.moveSpeed * delta));
    }

    this.collider.setTranslation({
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z
    }, true);

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= delta;
      if (this.hitFlashTime <= 0) {
        this.mesh.material.color.copy(this.originalColor);
      }
    }

    const lookAtPos = new THREE.Vector3().copy(playerPosition);
    lookAtPos.y = this.mesh.position.y;
    this.mesh.lookAt(lookAtPos);
    this.mesh.rotateY(Math.PI); // Flip since plane geometry faces +Z
  }

  takeDamage(amount) {
    if (!this.alive) return;

    this.health -= amount;
    if (this.mesh?.material) {
      this.mesh.material.color.set(0xff0000);
      this.hitFlashTime = 0.05;
    }

    if (this.health <= 0) {
      this.alive = false;
      this.destroy();
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
    }
    if (this.collider) {
      this.rapierWorld.removeCollider(this.collider, true);
    }
  }
}
