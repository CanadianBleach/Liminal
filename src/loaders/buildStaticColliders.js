import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

export function buildStaticCollidersFromGLTF(gltf, rapierWorld) {
  gltf.scene.updateMatrixWorld(true); // Ensure transforms are applied

  gltf.scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    try {
      const clonedGeometry = child.geometry.clone();
      clonedGeometry.applyMatrix4(child.matrixWorld);

      // Ensure indexed geometry
      if (!clonedGeometry.index) {
        const count = clonedGeometry.attributes.position.count;
        const indices = Array.from({ length: count }, (_, i) => i);
        clonedGeometry.setIndex(indices);
      }

      const vertices = clonedGeometry.attributes.position.array;
      const indices = clonedGeometry.index.array;

      if (!vertices || vertices.length === 0 || !indices || indices.length === 0) {
        console.warn(`[Collider Skipped] ${child.name} has invalid geometry`);
        return;
      }

      const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
      colliderDesc.setFriction(0.0);

      const collider = rapierWorld.createCollider(colliderDesc);
      if (collider && typeof collider.setUserData === 'function') {
        collider.userData = {
          type: 'environment',
        };
      }

    } catch (err) {
      console.warn(`[Collider Error] Skipped mesh: ${child.name}`, err);
    }
  });
}
