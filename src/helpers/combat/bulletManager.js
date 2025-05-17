import Bullet from './bullet.js';
import ShellCasing from './shells.js';
import { getMuzzleWorldPosition } from '../player/gunAnimation.js';
import * as THREE from 'three';



export default class BulletManager {
  constructor(scene, rapierWorld, enemyManager) {
    this.bullets = [];
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.enemyManager = enemyManager;
    this.shellCasings = [];
  }

  shoot(position, direction) {
    const muzzlePos = getMuzzleWorldPosition();
    const offset = new THREE.Vector3(0, 0, 0.5); // X, Y, Z

    const bullet = new Bullet(position, direction, this.rapierWorld, this.scene);
    this.bullets.push(bullet);
  
    if (muzzlePos) {
      const shell = new ShellCasing(muzzlePos, direction, this.scene, offset);
      this.shellCasings.push(shell);
    }
  }
  

  update(delta) {
    this.bullets = this.bullets.filter(bullet =>
      bullet.update(delta, this.scene, this.enemyManager)
    );
    this.shellCasings = this.shellCasings.filter(shell =>
      shell.update(delta)
    );
  }
}
