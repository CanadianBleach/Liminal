import * as THREE from 'three';

export default class ShellCasing {
  constructor(position, direction, scene, offset = new THREE.Vector3(0, 0, 0)) {
    this.lifetime = 3; // seconds
    this.spawnTime = performance.now() / 1000;

    // Create cylinder mesh for the shell
    const geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0xaaaa22, metalness: 1, roughness: 0.3 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.z = Math.PI / 2;

    // Apply offset
    const spawnPos = position.clone().add(offset);
    this.mesh.position.copy(spawnPos);

    // Randomized ejection direction
    const side = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    const upward = new THREE.Vector3(0, 1, 0);
    this.velocity = side.multiplyScalar(2).add(upward.multiplyScalar(3)).add(direction.multiplyScalar(0.5));

    scene.add(this.mesh);
    this.scene = scene;
  }

  update(delta) {
    const now = performance.now() / 1000;
    if (now - this.spawnTime > this.lifetime) {
      this.scene.remove(this.mesh);
      return false;
    }

    // Simple physics simulation
    this.velocity.y -= 9.8 * delta; // gravity
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    this.mesh.rotation.x += delta * 5;
    this.mesh.rotation.z += delta * 3;

    return true;
  }
}
