import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { weaponConfigs } from '../combat/weaponConfigs';
import { selectBoxSpawnByChance } from './mysteryBoxSpawns';
import { FBXLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { playSound } from '../sounds/audio';

export class MysteryBox {
    constructor(scene, rapierWorld, player) {
        this.scene = scene;
        this.rapierWorld = rapierWorld;
        this.boxSpawn = selectBoxSpawnByChance();
        this.player = player;

        this.cooldown = 0;
        this.cooldownTime = 5;
        this.rolling = false;

        this.pendingWeapon = null;
        this.pendingTimeout = null;

        this.cost = 125;

        const loader = new GLTFLoader();
        loader.load('/models/mysteryBox/mystery_box.glb', (glb) => {
            const { wrapper, collider } = this.setupModelWithCollider({
                model: glb.scene,
                position: this.boxSpawn.position,
                scene: this.scene,
                rapierWorld: this.rapierWorld
            });

            this.wrapper = wrapper;
            this.collider = collider;
            this.collider.userData = {
                type: 'interactable',
                interactRef: this
            };
        }, undefined, err => {
            console.error("Failed to load model:", err);
        });
    }

    setupModelWithCollider({
        model,
        position,
        scene,
        rapierWorld,
        collisionGroup = 0b0011 << 16 | 0b0001,
        debug = true
    }) {
        // 1. Compute bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // 2. Center the model
        model.position.sub(center);

        // 3. Wrap the model
        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.position.copy(position);
        scene.add(wrapper);

        // 4. Create a static RAPIER body and collider
        const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
        const body = rapierWorld.createRigidBody(bodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
            .setSensor(false)
            .setCollisionGroups(collisionGroup);

        const collider = rapierWorld.createCollider(colliderDesc, body);

                 // 5. Debug mesh
                let debugMesh = null;
                if (debug) {
                    const debugMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.3
                    });
        
                    const debugGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
                    debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
                    debugMesh.position.copy(position);
                    scene.add(debugMesh);
                } 

        return {
            wrapper,
            collider,
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
        if (this.player.state.score < this.cost) {
            playSound("box_error");
            console.log("Not enough points to use the mystery box.");
            return;
        }

        // ✅ Deduct cost
        this.player.state.score -= this.cost;
        console.log(`100 points deducted. Remaining: ${this.player.state.score}`);

        this.rolling = true;
        this.lastUseTime = now;

        const owned = this.player.state.inventory.slots;
        const eligibleWeapons = Object.entries(weaponConfigs)
            .filter(([key, config]) =>
                config.mysteryBoxEligible && !owned.includes(key)
            )
            .map(([key]) => key);

        if (eligibleWeapons.length === 0) {
            console.log("Mystery box: No new weapons to give.");
            return;
        }

        const rollDuration = 5000;
        const intervalTime = 150;

        let rollInterval = setInterval(() => {
            const fakePick = eligibleWeapons[Math.floor(Math.random() * eligibleWeapons.length)];
            console.log('Rolling... showing:', fakePick);
        }, intervalTime);

        playSound("box_spin");
        setTimeout(() => {
            playSound("box_win");
            clearInterval(rollInterval);

            const selectedWeapon = eligibleWeapons[Math.floor(Math.random() * eligibleWeapons.length)];
            console.log(`Mystery box rolled: ${selectedWeapon}`);

            this.pendingWeapon = selectedWeapon;
            console.log(this.pendingWeapon.name);
            this.rolling = false;

            this.pendingTimeout = setTimeout(() => {
                console.log("Mystery box weapon expired.");
                this.pendingWeapon = null;
            }, 5000);
        }, rollDuration);
    }
}
