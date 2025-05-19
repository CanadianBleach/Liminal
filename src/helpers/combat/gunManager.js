// GunManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { playSound } from '../sounds/audio.js';
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
                const gltf = await this.loader.loadAsync(config.model);
                const gun = this.setupGun(gltf, config);
                this.guns[key] = gun;
            }
        );
        await Promise.all(loadPromises);
    }

    setupGun(gltf, config) {
        const gun = new THREE.Object3D();
        const model = gltf.scene;
        model.scale.set(...(config.modelScale || [1, 1, 1]));
        model.position.set(...(config.modelOffset || [0, 0, 0]));
        gun.add(model);
        gun.visible = false;
        this.camera.add(gun);
        return gun;
    }

    switchWeapon(key) {
        console.log(this.currentGun)
        if (this.currentGun) {
            this.currentGun.visible = false;
        }
        this.currentGun = this.guns[key];
        if (this.currentGun) {
            this.currentGun.visible = true;
            playSound('weapon_switch');
        }
        console.log(this.currentGun);
    }

    update(delta, controls) {
        console.log(this.currentGun)
        if (this.currentGun?.update) {
            this.currentGun.update(delta, controls);
        }
    }
}

// Export singleton instance
const gunManager = new GunManager();
export { gunManager };
export default GunManager;
