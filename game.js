import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/* =========================================
   EL OSTTA — Egyptian Microbus Driving
   Developer: M11 / Mr. Mohamed Hussain
   ========================================= */

const $ = (selector) => document.querySelector(selector);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9dc8e5);
scene.fog = new THREE.Fog(0x9dc8e5, 90, 360);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.1,
  700
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

document.body.appendChild(renderer.domElement);

renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.zIndex = '0';

const gameUI = document.querySelectorAll(
  'button, .hud, .controls, .game-ui, .dashboard, .control-panel'
);

gameUI.forEach(element => {
  element.style.position = element.style.position || 'relative';
  element.style.zIndex = '5';
});

scene.add(new THREE.HemisphereLight(0xe5f4ff, 0x78624b, 2.0));

const sunlight = new THREE.DirectionalLight(0xffedcf, 2.5);
sunlight.position.set(-35, 65, -20);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.left = -45;
sunlight.shadow.camera.right = 45;
sunlight.shadow.camera.top = 45;
sunlight.shadow.camera.bottom = -45;
scene.add(sunlight);

/* ---------- Materials ---------- */

function material(color, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

const materials = {
  road: material(0x373a3d),
  asphalt: material(0x55565a),
  pavement: material(0xb9ad98),
  sand: material(0xbda783),
  white: material(0xf3eee3),
  black: material(0x17191b),
  rubber: material(0x171819),
  glass: new THREE.MeshStandardMaterial({
    color: 0x79b8d0,
    roughness: 0.2,
    metalness: 0.12,
    transparent: true,
    opacity: 0.72
  }),
  chrome: material(0xb9c1c7, 0.25, 0.8),
  yellow: material(0xe5b52d),
  red: material(0xb62d26),
  green: material(0x43845a)
};

/* ---------- Helpers ---------- */

function box(parent, width, height, depth, mat, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  return mesh;
}

function cylinder(parent, radius, length, mat, x, y, z, rotationZ = 0) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 16),
    mat
  );

  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;
  mesh.castShadow = true;
  parent.add(mesh);

  return mesh;
}

/* ---------- World ---------- */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(700, 700),
  material(0xc3b08b)
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.16;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 650),
  materials.road
);

road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.08, -120);
road.receiveShadow = true;
scene.add(road);

/* Sidewalks */

for (const side of [-1, 1]) {
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.2, 650),
    materials.pavement
  );

  sidewalk.position.set(side * 8.65, 0, -120);
  sidewalk.receiveShadow = true;
  scene.add(sidewalk);

  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.28, 650),
    materials.white
  );

  curb.position.set(side * 7.48, 0.04, -120);
  scene.add(curb);
}

/* Road markings */

const roadMarkings = [];

for (let z = -430; z < 180; z += 10) {
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.025, 4.4),
    materials.white
  );

  stripe.position.set(0, 0.015, z);
  scene.add(stripe);
  roadMarkings.push(stripe);
}

for (const side of [-1, 1]) {
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.025, 650),
    material(0xe8e1d4)
  );

  edge.position.set(side * 6.9, 0.02, -120);
  scene.add(edge);
}

/* ---------- Egyptian Buildings ---------- */

const buildingColors = [
  0xc9a783,
  0xe0c5a1,
  0xb6a18a,
  0xd6c4ad,
  0xa99780,
  0xd8b98c,
  0xc3b4a0
];

function makeBuilding(side, z) {
  const group = new THREE.Group();

  const width = 5 + Math.random() * 7;
  const height = 8 + Math.random() * 18;
  const depth = 9 + Math.random() * 12;

  const color = buildingColors[
    Math.floor(Math.random() * buildingColors.length)
  ];

  box(
    group,
    width,
    height,
    depth,
    material(color),
    0,
    height / 2,
    0
  );

  /* Roof parapet */

  box(
    group,
    width + 0.25,
    0.35,
    depth + 0.25,
    material(0x8f806d),
    0,
    height + 0.16,
    0
  );

  /* Windows on the street-facing wall */

  const windowMaterial = material(0x41677a, 0.25, 0.15);
  const rows = Math.max(2, Math.floor(height / 3));

  for (let row = 0; row < rows; row++) {
    for (let col = -1; col <= 1; col++) {
      const wx = col * width * 0.28;
      const wy = 1.8 + row * 2.6;

      if (wy < height - 0.7) {
        box(
          group,
          0.95,
          1.25,
          0.08,
          windowMaterial,
          wx,
          wy,
          side < 0 ? depth / 2 + 0.045 : -depth / 2 - 0.045
        );
      }
    }
  }

  /* Ground-floor shopfront */

  const frontZ = side < 0 ? depth / 2 + 0.06 : -depth / 2 - 0.06;

  box(
    group,
    width * 0.62,
    1.8,
    0.12,
    material(0x70533d),
    0,
    1.05,
    frontZ
  );

  box(
    group,
    width * 0.7,
    0.32,
    0.16,
    material(0x297d87),
    0,
    2.15,
    frontZ
  );

  group.position.set(
    side * (10 + width / 2),
    0,
    z
  );

  scene.add(group);

  return group;
}

const buildings = [];

for (let z = -420; z < 130; z += 19) {
  buildings.push(makeBuilding(-1, z));
  buildings.push(makeBuilding(1, z - 8));
}

/* ---------- Street Lights ---------- */

const streetLights = [];

function makeStreetLight(side, z) {
  const group = new THREE.Group();

  cylinder(
    group,
    0.09,
    5.4,
    material(0x4d5153),
    0,
    2.7,
    0
  );

  box(
    group,
    1.3,
    0.12,
    0.12,
    material(0x4d5153),
    side * 0.55,
    5.3,
    0
  );

  box(
    group,
    0.45,
    0.18,
    0.3,
    material(0xffe6a1),
    side * 1.05,
    5.2,
    0
  );

  group.position.set(side * 7.7, 0, z);
  scene.add(group);

  return group;
}

for (let z = -400; z < 120; z += 36) {
  streetLights.push(makeStreetLight(-1, z));
  streetLights.push(makeStreetLight(1, z - 15));
}

/* ---------- Player Microbus ---------- */

const bus = new THREE.Group();
scene.add(bus);

const busPaint = material(0xe9e4d5, 0.38, 0.15);
const busLower = material(0x278b91, 0.38, 0.1);
const darkGlass = new THREE.MeshStandardMaterial({
  color: 0x31576b,
  roughness: 0.22,
  metalness: 0.1
});

/* Main body */

box(bus, 2.35, 1.65, 5.1, busPaint, 0, 1.55, 0);
box(bus, 2.38, 0.52, 5.05, busLower, 0, 0.72, 0);

/* Roof */

box(bus, 2.15, 0.14, 4.55, materials.white, 0, 2.43, 0.02);

/* Front and rear windows */

box(bus, 1.93, 0.77, 0.045, darkGlass, 0, 2.0, -2.57);
box(bus, 1.8, 0.7, 0.045, darkGlass, 0, 1.95, 2.57);

/* Front bumper */

box(bus, 2.4, 0.18, 0.18, materials.chrome, 0, 0.52, -2.64);

/* Headlights */

for (const side of [-1, 1]) {
  box(
    bus,
    0.38,
    0.22,
    0.07,
    material(0xfff0bb, 0.25),
    side * 0.83,
    0.92,
    -2.63
  );

  box(
    bus,
    0.32,
    0.16,
    0.08,
    materials.red,
    side * 0.84,
    0.88,
    2.63
  );
}

/* Side windows */

for (const side of [-1, 1]) {
  for (let i = 0; i < 4; i++) {
    box(
      bus,
      0.045,
      0.67,
      0.83,
      darkGlass,
      side * 1.19,
      2.0,
      -1.55 + i * 0.95
    );
  }

  /* Side mirrors */

  box(
    bus,
    0.18,
    0.15,
    0.22,
    materials.black,
    side * 1.32,
    1.75,
    -2.0
  );

  box(
    bus,
    0.09,
    0.09,
    0.48,
    materials.black,
    side * 1.28,
    1.72,
    -1.94
  );
}

/* Wheels */

const wheels = [];

for (const side of [-1, 1]) {
  for (const z of [-1.65, 1.65]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.24, 20),
      materials.rubber
    );

    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.2, 0.53, z);
    wheel.castShadow = true;
    bus.add(wheel);
    wheels.push(wheel);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.255, 16),
      materials.chrome
    );

    hub.rotation.z = Math.PI / 2;
    hub.position.set(side * 1.2, 0.53, z);
    bus.add(hub);
  }
}

/* Front dashboard for interior camera */

const dashboard = box(
  bus,
  1.85,
  0.3,
  0.65,
  material(0x343a3c),
  0,
  1.15,
  -1.75
);

box(
  bus,
  0.7,
  0.12,
  0.18,
  material(0x141719),
  0,
  1.34,
  -1.72
);

/* Steering wheel */

const steeringWheel = new THREE.Mesh(
  new THREE.TorusGeometry(0.23, 0.035, 8, 22),
  materials.black
);

steeringWheel.position.set(-0.48, 1.48, -1.55);
steeringWheel.rotation.x = 0.45;
bus.add(steeringWheel);

/* Arabic destination sign */

function makeArabicSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#143f40';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff0bd';
  ctx.font = 'bold 58px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText('الميكروباص', 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 0.42),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  sign.position.set(0, 2.25, -2.61);
  bus.add(sign);
}

makeArabicSign();

/* ---------- Traffic ---------- */

const traffic = [];
const trafficColors = [
  0xf1e5ca,
  0x303c48,
  0xb9b5a8,
  0x8f3e34,
  0xd4a72c,
  0x367d73
];

function makeCar(color, isTaxi = false) {
  const car = new THREE.Group();

  const paint = material(color, 0.35, 0.1);

  box(car, 1.75, 0.62, 3.2, paint, 0, 0.78, 0);
  box(car, 1.38, 0.62, 1.65, darkGlass, 0, 1.35, -0.1);

  box(car, 1.82, 0.16, 0.16, materials.black, 0, 0.51, -1.63);
  box(car, 1.82, 0.14, 0.16, materials.black, 0, 0.51, 1.63);

  for (const side of [-1, 1]) {
    for (const z of [-1.05, 1.05]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.31, 0.31, 0.16, 14),
        materials.rubber
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.88, 0.38, z);
      car.add(wheel);
    }
  }

  if (isTaxi) {
    box(car, 0.7, 0.09, 0.28, materials.black, 0, 1.68, 0);
  }

  scene.add(car);
  return car;
}

for (let i = 0; i < 9; i++) {
  const isTaxi = i % 3 === 0;
  const car = makeCar(
    isTaxi ? 0xd6b52b : trafficColors[i % trafficColors.length],
    isTaxi
  );

  car.position.set(
    [-4.2, -1.5, 1.6, 4.1][i % 4],
    0,
    -35 - i * 36
  );

  traffic.push({
    mesh: car,
    speed: 9 + Math.random() * 13,
    lane: car.position.x
  });
}

/* ---------- Controls and State ---------- */

const state = {
  speed: 0,
  maxSpeed: 115,
  fuel: 100,
  balance: 250,
  engine: false,
  cameraMode: 'outside',
  steering: 0,
  throttle: false,
  brake: false
};

const keys = {};

window.addEventListener('keydown', event => {
  keys[event.key.toLowerCase()] = true;

  if (event.key.toLowerCase() === 'c') {
    toggleCamera();
  }

  if (event.key === ' ') {
    event.preventDefault();
    state.engine = !state.engine;
  }
});

window.addEventListener('keyup', event => {
  keys[event.key.toLowerCase()] = false;
});

function bindButton(selectors, down, up) {
  let element = null;

  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) break;
  }

  if (!element) return;

  element.addEventListener('pointerdown', event => {
    event.preventDefault();
    down();
  });

  for (const eventName of ['pointerup', 'pointerleave', 'pointercancel']) {
    element.addEventListener(eventName, event => {
      up();
    });
  }
}

bindButton(
  ['#leftBtn', '#left', '[data-control="left"]'],
  () => { state.steering = -1; },
  () => { if (state.steering < 0) state.steering = 0; }
);

bindButton(
  ['#rightBtn', '#right', '[data-control="right"]'],
  () => { state.steering = 1; },
  () => { if (state.steering > 0) state.steering = 0; }
);

bindButton(
  ['#gasBtn', '#gas', '#accelerate', '[data-control="gas"]'],
  () => { state.throttle = true; },
  () => { state.throttle = false; }
);

bindButton(
  ['#brakeBtn', '#brake', '[data-control="brake"]'],
  () => { state.brake = true; },
  () => { state.brake = false; }
);

function toggleCamera() {
  state.cameraMode =
    state.cameraMode === 'outside' ? 'inside' : 'outside';

  const cameraButton = $(
    '#cameraBtn, #cameraButton, [data-control="camera"]'
  );

  if (cameraButton) {
    cameraButton.textContent =
      state.cameraMode === 'outside'
        ? '📷 كاميرا داخلية'
        : '📷 كاميرا خارجية';
  }
}

const cameraButton = $(
  '#cameraBtn, #cameraButton, [data-control="camera"]'
);

if (cameraButton) {
  cameraButton.addEventListener('click', toggleCamera);
}

const engineButton = $(
  '#engineBtn, #engineButton, [data-control="engine"]'
);

if (engineButton) {
  engineButton.addEventListener('click', () => {
    state.engine = !state.engine;

    engineButton.textContent =
      state.engine ? 'إطفاء المحرك' : 'تشغيل المحرك';
  });
}

/* ---------- HUD ---------- */

function updateText(selectors, text) {
  for (const selector of selectors) {
    const element = $(selector);

    if (element) {
      element.textContent = text;
      return;
    }
  }
}

function updateHUD() {
  updateText(
    ['#speed', '#speedValue', '[data-hud="speed"]'],
    Math.round(state.speed) + ' كم/س'
  );

  updateText(
    ['#fuel', '#fuelValue', '[data-hud="fuel"]'],
    Math.round(state.fuel) + '%'
  );

  updateText(
    ['#balance', '#balanceValue', '[data-hud="balance"]'],
    Math.round(state.balance) + ' ج.م'
  );

  updateText(
    ['#engineStatus', '[data-hud="engine"]'],
    state.engine ? 'المحرك يعمل' : 'المحرك متوقف'
  );
}

/* ---------- Driving Loop ---------- */

const clock = new THREE.Clock();

const outsideCameraOffset = new THREE.Vector3(0, 5.1, 10.8);
const insideCameraPosition = new THREE.Vector3(0, 1.82, -1.05);

let cameraShake = 0;
let distanceTravelled = 0;

function updateDriving(dt) {
  const accelerating =
    state.throttle || keys['w'] || keys['arrowup'];

  const braking =
    state.brake || keys['s'] || keys['arrowdown'];

  const left =
    state.steering < 0 || keys['a'] || keys['arrowleft'];

  const right =
    state.steering > 0 || keys['d'] || keys['arrowright'];

  if (state.engine && accelerating) {
    state.speed += 24 * dt;
  } else {
    state.speed -= 7 * dt;
  }

  if (braking) {
    state.speed -= 48 * dt;
  }

  state.speed = THREE.MathUtils.clamp(
    state.speed,
    0,
    state.maxSpeed
  );

  const normalizedSpeed = state.speed / state.maxSpeed;

  if (left) bus.position.x -= (2.4 + normalizedSpeed * 4) * dt;
  if (right) bus.position.x += (2.4 + normalizedSpeed * 4) * dt;

  bus.position.x = THREE.MathUtils.clamp(bus.position.x, -5.1, 5.1);

  /* Wheel movement */

  wheels.forEach(wheel => {
    wheel.rotation.x += normalizedSpeed * dt * 5;
  });

  steeringWheel.rotation.z = THREE.MathUtils.lerp(
    steeringWheel.rotation.z,
    left ? 0.55 : right ? -0.55 : 0,
    dt * 7
  );

  /* Roadside world moves toward the player */

  const worldSpeed = state.speed * 0.24;
  distanceTravelled += worldSpeed * dt;

  for (const stripe of roadMarkings) {
    stripe.position.z += worldSpeed * dt;

    if (stripe.position.z > 18) {
      stripe.position.z -= 610;
    }
  }

  for (const building of buildings) {
    building.position.z += worldSpeed * dt;

    if (building.position.z > 35) {
      building.position.z -= 550;
    }
  }

  for (const light of streetLights) {
    light.position.z += worldSpeed * dt;

    if (light.position.z > 35) {
      light.position.z -= 520;
    }
  }

  /* Traffic moves independently */

  for (const car of traffic) {
    car.mesh.position.z += (worldSpeed - car.speed * 0.22) * dt;

    if (car.mesh.position.z > 18) {
      car.mesh.position.z = -300 - Math.random() * 100;
      car.mesh.position.x = [-4.2, -1.5, 1.6, 4.1][
        Math.floor(Math.random() * 4)
      ];
    }

    /* Simple collision detection */

    const dx = Math.abs(bus.position.x - car.mesh.position.x);
    const dz = Math.abs(car.mesh.position.z);

    if (dx < 1.75 && dz < 3.1 && state.speed > 10) {
      state.speed *= 0.94;
      cameraShake = 0.12;
    }
  }

  /* Fuel */

  if (state.engine && state.speed > 0) {
    state.fuel = Math.max(
      0,
      state.fuel - 0.0018 * normalizedSpeed * dt * 60
    );
  }

  if (state.fuel <= 0) {
    state.engine = false;
    state.speed = Math.max(0, state.speed - 15 * dt);
  }

  cameraShake = Math.max(0, cameraShake - dt);

  updateHUD();
}

/* ---------- Camera ---------- */

const lookTarget = new THREE.Vector3();

function updateCamera(dt) {
  if (state.cameraMode === 'inside') {
    const desiredPosition = bus.localToWorld(
      insideCameraPosition.clone()
    );

    camera.position.lerp(desiredPosition, 1 - Math.exp(-dt * 9));

    lookTarget.copy(
      bus.localToWorld(new THREE.Vector3(0, 1.7, -18))
    );

    camera.lookAt(lookTarget);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 76, dt * 4);
  } else {
    const desiredPosition = new THREE.Vector3(
      bus.position.x * 0.65,
      5.2,
      10.8
    );

    if (cameraShake > 0) {
      desiredPosition.x += (Math.random() - 0.5) * 0.15;
      desiredPosition.y += (Math.random() - 0.5) * 0.12;
    }

    camera.position.lerp(
      desiredPosition,
      1 - Math.exp(-dt * 4)
    );

    lookTarget.set(bus.position.x * 0.45, 1.1, -7);

    camera.lookAt(lookTarget);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 68, dt * 4);
  }

  camera.updateProjectionMatrix();
}

/* ---------- Start Screen Helpers ---------- */

updateHUD();

const startButton = $(
  '#startBtn, #startButton, [data-control="start"]'
);

if (startButton) {
  startButton.addEventListener('click', () => {
    state.engine = true;

    const startScreen = $(
      '#startScreen, .start-screen, .start-overlay'
    );

    if (startScreen) startScreen.style.display = 'none';
  });
}

/* ---------- Main Loop ---------- */

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.04);

  updateDriving(dt);
  updateCamera(dt);

  renderer.render(scene, camera);
}

camera.position.set(0, 5.2, 10.8);
camera.lookAt(0, 1, -7);

animate();

/* ---------- Resize ---------- */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );
});

/* Keep the game from scrolling while using touch controls */

document.addEventListener('touchmove', event => {
  if (event.target.closest('button, .controls, .game-ui')) {
    event.preventDefault();
  }
}, { passive: false });

console.log('EL OSTTA — Game initialized successfully.'); 
