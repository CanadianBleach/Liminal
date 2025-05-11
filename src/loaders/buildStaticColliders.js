// /helpers/physics/buildStaticColliders.js
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

export function buildStaticCollidersFromGLTF(gltf, rapierWorld) {
  gltf.scene.updateMatrixWorld(true); // Ensure transforms are current

  gltf.scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const clonedGeometry = child.geometry.clone();
    clonedGeometry.applyMatrix4(child.matrixWorld); // Bake position, rotation, scale

    // Ensure the geometry has an index
    if (!clonedGeometry.index) {
      const count = clonedGeometry.attributes.position.count;
      const indexArray = Array.from({ length: count }, (_, i) => i);
      clonedGeometry.setIndex(indexArray);
    }

    const vertices = clonedGeometry.attributes.position.array;
    const indices = clonedGeometry.index.array;

    if (!vertices || vertices.length === 0) return;

    try {
      const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
      rapierWorld.createCollider(colliderDesc);
    } catch (e) {
      console.warn('[Collider Error] Skipped mesh:', child.name, e);
    }
  });
}
