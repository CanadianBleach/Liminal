import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { loadHDRI } from '../loaders/hdriLoader.js';

export function initMainScene() {
  // Set up scene
  const scene = new THREE.Scene();
  const clock = new THREE.Clock();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });
  renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new FirstPersonControls(camera, renderer.domElement);
  controls.movementSpeed = 20;
  controls.lookSpeed = 0.1;
  controls.lookVertical = true;

  camera.position.set(4.61, 2.74, 8);

  // Load HDRI background/environment
  loadHDRI(scene, "/textures/hdri/metro_vijzelgracht_4k.hdr");

  // const controls = new OrbitControls(camera, renderer.domElement);

  class Box extends THREE.Mesh {
    constructor({
      width,
      height,
      depth,
      color = '#ffffff',
      metalness = 0,
      roughness = 1,
      velocity = { x: 0, y: 0, z: 0 },
      position = { x: 999, y: 999, z: 999 },
      zAcceleration = false
    }) {
      super(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, metalness, roughness })
      );

      this.width = width;
      this.height = height;
      this.depth = depth;

      this.position.set(position.x, position.y, position.z);

      this.right = this.position.x + this.width / 2;
      this.left = this.position.x - this.width / 2;

      this.bottom = this.position.y - this.height / 2;
      this.top = this.position.y + this.height / 2;

      this.front = this.position.z + this.depth / 2;
      this.back = this.position.z - this.depth / 2;

      this.velocity = velocity;
      this.gravity = -0.002;

      this.zAcceleration = zAcceleration;
    }

    updateSides() {
      this.right = this.position.x + this.width / 2;
      this.left = this.position.x - this.width / 2;

      this.bottom = this.position.y - this.height / 2;
      this.top = this.position.y + this.height / 2;

      this.front = this.position.z + this.depth / 2;
      this.back = this.position.z - this.depth / 2;
    }

    update(ground) {
      this.updateSides();

      if (this.zAcceleration) this.velocity.z += 0.0003;

      this.position.x += this.velocity.x;
      this.position.z += this.velocity.z;

      this.applyGravity(ground);
    }

    applyGravity(ground) {
      this.velocity.y += this.gravity;

      if (boxCollision({ box1: this, box2: ground })) {
        const friction = 0.8;
        this.velocity.y *= friction;
        this.velocity.y = -this.velocity.y;
      } else {
        this.position.y += this.velocity.y;
      }
    }
  }

  function boxCollision({ box1, box2 }) {
    const xCollision = box1.right >= box2.left && box1.left <= box2.right;
    const yCollision =
      box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom;
    const zCollision = box1.front >= box2.back && box1.back <= box2.front;

    return xCollision && yCollision && zCollision;
  }

  const cube = new Box({
    width: 1,
    height: 1,
    depth: 1,
    metalness: 1,
    roughness: 0,
    velocity: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 2, z: 0 },
    color: '#ff0000'
  });
  cube.castShadow = true;
  scene.add(cube);

  const ground = new Box({
    width: 50,
    height: 0.5,
    depth: 50,
    metalness: 1,
    roughness: 1,
    color: '#89CFF0',
    position: { x: 0, y: 0, z: 0 }
  });
  ground.receiveShadow = true;
  scene.add(ground);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 3, 1);
  light.castShadow = true;
  scene.add(light);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  camera.position.z = 5;
  console.log(ground.top);
  console.log(cube.bottom);

  const keys = {
    a: { pressed: false },
    d: { pressed: false },
    s: { pressed: false },
    w: { pressed: false }
  };

  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'KeyA':
        keys.a.pressed = true;
        break;
      case 'KeyD':
        keys.d.pressed = true;
        break;
      case 'KeyS':
        keys.s.pressed = true;
        break;
      case 'KeyW':
        keys.w.pressed = true;
        break;
      case 'Space':
        cube.velocity.y = 0.08;
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyA':
        keys.a.pressed = false;
        break;
      case 'KeyD':
        keys.d.pressed = false;
        break;
      case 'KeyS':
        keys.s.pressed = false;
        break;
      case 'KeyW':
        keys.w.pressed = false;
        break;
    }
  });

  const enemies = [];
  let frames = 0;
  let spawnRate = 200;

  function animate() {
    const animationId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    controls.update(delta);
    renderer.render(scene, camera);

    // movement code
    cube.velocity.x = 0;
    cube.velocity.z = 0;
    if (keys.a.pressed) cube.velocity.x = -0.05;
    else if (keys.d.pressed) cube.velocity.x = 0.05;

    if (keys.s.pressed) cube.velocity.z = 0.05;
    else if (keys.w.pressed) cube.velocity.z = -0.05;

    cube.update(ground);

    enemies.forEach((enemy) => {
      enemy.update(ground);
      if (boxCollision({ box1: cube, box2: enemy })) {
        cancelAnimationFrame(animationId);
        console.log('Game Over!');
      }
    });

    if (frames % spawnRate === 0) {
      if (spawnRate > 20) spawnRate -= 20;

      const enemy = new Box({
        width: 1,
        height: 1,
        depth: 1,
        position: {
          x: (Math.random() - 0.5) * 10,
          y: ground.top + 0.5, // ensures enemy starts *on top* of the ground
          z: -20
        },
        velocity: { x: 0, y: 0, z: 0.005 },
        color: 'red',
        zAcceleration: true
      });
      
      enemy.castShadow = true;
      scene.add(enemy);
      enemies.push(enemy);
    }

    frames++;
  }

  animate();
}
export function resizeMainScene(renderer, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}