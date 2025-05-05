// Enemy.js
import * as THREE from 'three';

export class Enemy {
  constructor(scene, position = new THREE.Vector3(0, 1.5, -5), textureUrl = null) {
    this.scene = scene;
    this.mesh = this.createMesh(position);
    scene.add(this.mesh);

    this.moveSpeed = 2.0;
    this.minDistanceToPlayer = 2.5;

    if (textureUrl) {
      this.loadTexture(textureUrl);
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

  loadTexture(url) {
    // setup enemy texture
    const imageDataUrl = localStorage.getItem('enemyTexture');

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      imageDataUrl,
      (texture) => {
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.5,
        });
        this.mesh.material.dispose();
        this.mesh.material = material;

        const img = texture.image;
        if (img && img.width && img.height) {
          const aspect = img.width / img.height;
          this.mesh.scale.x = aspect;
        }
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

    const angle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = angle;
  }
}
