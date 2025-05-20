import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { weaponConfigs } from '../combat/weaponConfigs';

export class MysteryBox {
    constructor(scene, rapierWorld, position, player) {
        this.scene = scene;
        this.rapierWorld = rapierWorld;
        this.position = position;
        this.player = player;

        this.cooldown = 0;
        this.cooldownTime = 5;
        this.rolling = false;

        this.pendingWeapon = null;
        this.pendingTimeout = null;

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ccff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
            .setTranslation(position.x, position.y, position.z)
            .setSensor(true)
            .setCollisionGroups(0b0011 << 16 | 0b0001);

        this.collider = rapierWorld.createCollider(colliderDesc);

        this.collider.userData = {
            type: 'interactable',
            interactRef: this
        };
    }

    onInteract() {
        const now = performance.now() / 1000;

        // If a weapon is waiting to be picked up
        if (this.pendingWeapon) {
            this.player.pickupWeapon(this.pendingWeapon);
            this.pendingWeapon = null;
            clearTimeout(this.pendingTimeout);
            console.log("Weapon claimed.");
            return;
        }

        // If rolling or on cooldown
        if (this.rolling || (now - (this.lastUseTime || 0)) < this.cooldownTime) {
            return;
        }

        this.rolling = true;
        this.lastUseTime = now;

        const eligibleWeapons = Object.entries(weaponConfigs)
            .filter(([_, config]) => config.mysteryBoxEligible)
            .map(([key]) => key);

        if (eligibleWeapons.length === 0) return;

        const rollDuration = 2000;
        const intervalTime = 150;

        let rollInterval = setInterval(() => {
            const fakePick = eligibleWeapons[Math.floor(Math.random() * eligibleWeapons.length)];
            console.log('Rolling... showing:', fakePick);
        }, intervalTime);

        setTimeout(() => {
            clearInterval(rollInterval);

            const selectedWeapon = eligibleWeapons[Math.floor(Math.random() * eligibleWeapons.length)];
            console.log(`Mystery box rolled: ${selectedWeapon}`);

            this.pendingWeapon = selectedWeapon;
            this.rolling = false;

            // Timeout to auto-cancel if not picked
            this.pendingTimeout = setTimeout(() => {
                console.log("Mystery box weapon expired.");
                this.pendingWeapon = null;
            }, 5000); // 5 seconds to claim
        }, rollDuration);
    }
}
