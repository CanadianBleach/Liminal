class Gun {
    constructor(bulletManager) {
      this.bulletManager = bulletManager;
      this.cooldown = 0.2;
      this.timeSinceLastShot = 0;
    }
  
    update(delta) {
      this.timeSinceLastShot += delta;
    }
  
    tryShoot(position, direction) {
      if (this.timeSinceLastShot >= this.cooldown) {
        this.bulletManager.shoot(position, direction);
        this.timeSinceLastShot = 0;
      }
    }
  }
  
  export default Gun;  