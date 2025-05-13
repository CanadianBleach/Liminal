import * as THREE from 'three';

export class Enemy {
  constructor(scene, position = new THREE.Vector3(0, 1.5, -5), textureUrl = null) {
    this.scene = scene;
    this.textureUrl = textureUrl;

    this.mesh = this.createMesh(position);
    scene.add(this.mesh);

    this.moveSpeed = 4.0;
    this.minDistanceToPlayer = 3;
    this.health = 100;
    this.alive = true;

    this.originalColor = new THREE.Color(0xffffff);
    this.hitFlashTime = 0;

    this.loadTexture(textureUrl);
  }

  takeDamage(amount) {
    if (!this.alive) return;

    this.health -= amount;
    console.log(`Enemy took ${amount} damage, health: ${this.health}`);

    if (this.mesh?.material) {
      this.mesh.material.color.set(0xff0000);
      this.hitFlashTime = 0.15;
    }

    if (this.health <= 0) {
      this.alive = false;
      console.log('%cEnemy died', 'color: red;');
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
      this.mesh = null;
    }
  }

  createMesh(position) {
    const geometry = new THREE.PlaneGeometry(1, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
  }

  loadTexture(textureUrl) {
    const imageDataUrl = textureUrl || this.textureUrl;
    if (!imageDataUrl) return;

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      imageDataUrl,
      (texture) => {
        const newMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.5,
        });
        this.mesh.material.dispose();
        this.mesh.material = newMat;
        this.mesh.castShadow = true;

        const img = texture.image;
        if (img?.width && img?.height) {
          const aspect = img.width / img.height;
          this.mesh.scale.x = aspect;
        }

        this.originalColor.copy(newMat.color);
      },
      undefined,
      (err) => {
        console.error('Texture load error:', err);
      }
    );
  }

  update(playerPosition, delta) {
    const dir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
    const dist = dir.length();

    if (dist > this.minDistanceToPlayer) {
      dir.normalize();
      this.mesh.position.add(dir.multiplyScalar(this.moveSpeed * delta));
    }

    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= delta;
      if (this.hitFlashTime <= 0) {
        this.mesh.material.color.copy(this.originalColor);
      }
    }
  }
}
