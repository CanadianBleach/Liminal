// GunManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { playSound } from '../sounds/audio.js';
import GunController from './gunController.js';
import { weaponConfigs } from './weaponConfigs.js';

class GunManager {
    constructor() {
        this.camera = null;
        this.scene = null;
        this.rapierWorld = null;
        this.enemies = null;
        this.weaponConfigs = weaponConfigs;
        this.guns = {};
        this.currentGun = null;
        this.loader = new GLTFLoader();
    }

    init(camera, scene, rapierWorld, enemies) {
        this.camera = camera;
        this.scene = scene;
        this.rapierWorld = rapierWorld;
        this.enemies = enemies;
    }

    updateMovementState({ moving, sprinting }) {
        if (this.currentGun?.setMovementState) {
            this.currentGun.setMovementState({ moving, sprinting });
        }
    }

    async preloadWeapons() {
        const loadPromises = Object.entries(this.weaponConfigs).map(
            async ([key, config]) => {
                const gun = await this.setupGun(config); // await setup
                this.guns[key] = gun;
            }
        );
        await Promise.all(loadPromises);
        gunManager.switchWeapon('rifle');
    }

    async setupGun(config) {
        const gun = new GunController(this.camera, this.scene, this.rapierWorld, this.enemies, config);
        await gun.loadModel(); // ensure model is fully loaded
        gun.visible = false;
        this.camera.add(gun); // only add after model is in
        return gun;
    }

    switchWeapon(key) {
        if (this.currentGun) {
            this.currentGun.visible = false;
        }
        this.currentGun = this.guns[key];
        if (this.currentGun) {
            this.currentGun.visible = true;
            playSound('weapon_switch');
        }

        console.log(this.currentGun.config.name);
    }

    update(delta, controls) {
        if (this.currentGun?.update) {
            this.currentGun.update(delta, controls);
        }
    }
}

// Export singleton instance
const gunManager = new GunManager();
export { gunManager };
export default GunManager;
