import * as THREE from 'three';

function createHealthBar() {
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  const barFg = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  barFg.position.z = 0.01; // prevent z-fighting
  const container = new THREE.Group();
  container.add(barBg);
  container.add(barFg);
  container.position.set(0, 1.5, 0); // position above head
  return { group: container, fg: barFg };
}

export class Enemy {
  constructor(scene, position = new THREE.Vector3(0, 1.5, -5), textureUrl = null) {
    this.scene = scene;
    this.mesh = this.createMesh(position);
    scene.add(this.mesh);

    this.maxHealth = 3;
this.health = this.maxHealth;

const { group, fg } = createHealthBar();
this.healthBar = group;
this.healthBarFg = fg;
this.mesh.add(this.healthBar);


    this.moveSpeed = 2.0;
    this.minDistanceToPlayer = 2.5;
    this.health = 3;

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
    const imageDataUrl = localStorage.getItem('enemyTexture') || url;
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
    this.healthBar.lookAt(playerPosition);
  }

  takeDamage(amount) {
    this.health -= amount;
    this.health = Math.max(0, this.health);
  
    // Update health bar
    const healthPercent = this.health / this.maxHealth;
    this.healthBarFg.scale.x = healthPercent;
    this.healthBarFg.position.x = -(1 - healthPercent) / 2;
  
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }  

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
