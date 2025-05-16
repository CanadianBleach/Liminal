import Bullet from './bullet.js';
import ShellCasing from './shells.js';

export default class BulletManager {
  constructor(scene, rapierWorld, enemyManager) {
    this.bullets = [];
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.enemyManager = enemyManager;
  }

  shoot(position, direction) {
    const bullet = new Bullet(position, direction, this.rapierWorld, this.scene);
    this.bullets.push(bullet);
    const shell = new ShellCasing(muzzlePosition, bulletDirection, scene, new THREE.Vector3(-0.1, 0.05, 0));
    shellCasings.push(shell); // Add to array for updates
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
