import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { weaponConfigs } from '../combat/weaponConfigs';
import { selectBoxSpawnByChance } from './mysteryBoxSpawns';

export class MysteryBox {
    constructor(scene, rapierWorld, player) {
        this.scene = scene;
        this.rapierWorld = rapierWorld;
        this.boxSpawn = selectBoxSpawnByChance();
        console.log(this.position)
        this.player = player;

        this.cooldown = 0;
        this.cooldownTime = 5;
        this.rolling = false;

        this.pendingWeapon = null;
        this.pendingTimeout = null;

        this.cost = 50;

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ccff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.boxSpawn.position);
        scene.add(this.mesh);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
            .setTranslation(this.boxSpawn.position.x, this.boxSpawn.position.y, this.boxSpawn.position.z)
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

        // ✅ Claim weapon if one is waiting
        if (this.pendingWeapon) {
            this.player.pickupWeapon(this.pendingWeapon);
            this.pendingWeapon = null;
            clearTimeout(this.pendingTimeout);
            console.log("Weapon claimed.");
            return;
        }

        // ❌ Block if cooling down or rolling
        if (this.rolling || (now - (this.lastUseTime || 0)) < this.cooldownTime) {
            return;
        }

        // 💰 Require 100 points to roll
        if (this.player.state.points < this.cost) {
            console.log("Not enough points to use the mystery box.");
            return;
        }

        // ✅ Deduct cost
        this.player.state.score -= cost;
        console.log(`100 points deducted. Remaining: ${this.player.state.score}`);

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

            this.pendingTimeout = setTimeout(() => {
                console.log("Mystery box weapon expired.");
                this.pendingWeapon = null;
            }, 5000);
        }, rollDuration);
    }
}
