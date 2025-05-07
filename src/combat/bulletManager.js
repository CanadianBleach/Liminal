import Bullet from './bullet.js';

export default class BulletManager {
  constructor(scene, rapierWorld) {
    this.bullets = [];
    this.scene = scene;
    this.rapierWorld = rapierWorld;
  }

  shoot(position, direction) {
    const bullet = new Bullet(position, direction, this.rapierWorld, this.scene);
    this.bullets.push(bullet);
  }

  update(delta) {
    this.bullets = this.bullets.filter(bullet => bullet.update(delta, this.scene));
  }
}