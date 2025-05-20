import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export class MysteryBox {
    constructor(scene, rapierWorld, position) {
        this.scene = scene;
        this.rapierWorld = rapierWorld;
        this.position = position;

        // Simple cube mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ccff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        // Static sensor collider for interaction
        const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
            .setTranslation(position.x, position.y, position.z)
            .setSensor(true)
            .setCollisionGroups(0b0011 << 16 | 0b0001)

        this.collider = rapierWorld.createCollider(colliderDesc);

        this.collider.userData = {
            type: 'interactable',
            interactRef: this
        };
    }

    onInteract() {
        console.log("Mystery box used!");
        // Next: random weapon logic
    }
}
