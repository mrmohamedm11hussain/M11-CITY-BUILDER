import * as THREE from
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const $ = id => document.getElementById(id);

const loading = $('loading');
const hud = $('hud');
const errorBox = $('errorBox');

let scene, camera, renderer, bus;
let wheels = [];
let traffic = [];
let buildings = [];
let roadLines = [];
let engineOn = false;
let interiorCamera = false;
let steering = 0;
let speed = 0;
let fuel = 100;
let money = 250;
let distance = 0;
let lastTime = 0;
let messageTimer = 0;

const keys = {
  left: false,
  right: false,
  gas: false,
  brake: false
};

const state = {
  velocity: 0,
  heading: 0
};

const colors = {
  asphalt: 0x454746,
  sand: 0xc8b99a,
  concrete: 0xb8b3a5,
  white: 0xf3f0e5,
  yellow: 0xe7b84d,
  green: 0x387655,
  glass: 0x263d43
};

function message(text, seconds = 3) {
  $('message').textContent = text;
  messageTimer = seconds;
}

function makeMaterial(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.02
  });
}

function box(parent, name, size, position, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    material
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radiusTop, radiusBottom, height,
                  position, material, segments = 20) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radiusTop, radiusBottom, height, segments
    ),
    material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createBus() {
  bus = new THREE.Group();
  bus.position.set(0, 0, 3);

  const body = makeMaterial(0xf1eee4);
  const dark = makeMaterial(0x252b2c);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x42636b,
    roughness: 0.3,
    metalness: 0.1
  });
  const rubber = makeMaterial(0x17191a);
  const metal = makeMaterial(0xaeb6b5, 0.45);
  const seatMat = makeMaterial(0x555c52);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffedbd,
    emissive: 0x66502a
  });

  // Body and roof
  box(bus, 'body', [2.15, 1.65, 4.6], [0, 1.25, 0], body);
  box(bus, 'roof', [2.05, 0.13, 4.15], [0, 2.13, 0], body);

  // Front windshield and rear glass
  box(bus, 'windshield', [1.72, 0.74, 0.055],
      [0, 1.84, -2.31], glass);
  box(bus, 'rear-glass', [1.6, 0.65, 0.05],
      [0, 1.82, 2.32], glass);

  // Side windows, doors and lower trim
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      box(bus, 'side-window', [0.045, 0.65, 0.82],
          [side * 1.083, 1.83, -1.2 + i * 1.02], glass);
    }

    box(bus, 'side-trim', [0.04, 0.12, 4.15],
        [side * 1.09, 0.72, 0], dark);

    // Mirrors
    box(bus, 'mirror-arm', [0.28, 0.055, 0.06],
        [side * 1.27, 1.73, -1.75], metal);
    box(bus, 'mirror', [0.12, 0.26, 0.16],
        [side * 1.4, 1.74, -1.75], dark);
  }

  // Front bumper and grille
  box(bus, 'bumper', [2.05, 0.19, 0.18],
      [0, 0.58, -2.34], metal);
  box(bus, 'grille', [0.7, 0.3, 0.04],
      [0, 1.05, -2.33], dark);

  for (const x of [-0.77, 0.77]) {
    box(bus, 'headlight', [0.34, 0.23, 0.08],
        [x, 1.17, -2.35], lightMat);
    box(bus, 'tail-light', [0.25, 0.3, 0.07],
        [x, 1.05, 2.34], makeMaterial(0xa72f27));
  }

  // Wheels: cylinder axis is rotated to align with the axle
  for (const x of [-1.08, 1.08]) {
    for (const z of [-1.48, 1.48]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.48, z);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.23, 24),
        rubber
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheel.add(tire);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.245, 20),
        metal
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);

      bus.add(wheel);
      wheels.push(wheel);
    }
  }

  // Dashboard, steering wheel and front seats
  box(bus, 'dashboard', [1.65, 0.2, 0.45],
      [0, 1.17, -1.7], dark);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.035, 10, 24),
    dark
  );
  steeringWheel.position.set(-0.48, 1.47, -1.63);
  bus.add(steeringWheel);

  for (const x of [-0.5, 0.5]) {
    box(bus, 'seat', [0.55, 0.75, 0.5],
        [x, 0.9, -0.85], seatMat);
  }

  scene.add(bus);
}

function createWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc6d8);
  scene.fog = new THREE.Fog(0xb7c7c0, 65, 230);

  camera = new THREE.PerspectiveCamera(
    68, innerWidth / innerHeight, 0.1, 500
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  $('game').prepend(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xe0efff, 0x77705b, 2.0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe2b2, 2.3);
  sun.position.set(-35, 55, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  scene.add(sun);

  createGround();
  createRoad();
  createSidewalks();
  createBuildings();
  createStreetLights();
  createTraffic();
  createBus();
}

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    makeMaterial(0xb6aa8b)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  scene.add(ground);
}

function createRoad() {
  // Main road: long enough to test driving and steering
  box(scene, 'road', [13, 0.12, 1100], [0, -0.04, 0],
      makeMaterial(colors.asphalt));

  // Road markings
  for (let z = -520; z < 540; z += 12) {
    const line = box(scene, 'lane-line', [0.13, 0.015, 5],
        [0, 0.03, z], makeMaterial(0xe6dfc7));
    roadLines.push(line);
  }

  // Edge lines
  for (const x of [-6.2, 6.2]) {
    box(scene, 'edge-line', [0.12, 0.02, 1100],
        [x, 0.035, 0], makeMaterial(0xf0e6ce));
  }

  // Broken yellow centre line
  for (let z = -520; z < 540; z += 22) {
    box(scene, 'centre-line', [0.11, 0.025, 9],
        [0, 0.04, z], makeMaterial(0xe7c45b));
  }
}

function createSidewalks() {
  for (const side of [-1, 1]) {
    box(scene, 'sidewalk', [2.1, 0.22, 1100],
        [side * 7.55, 0.02, 0], makeMaterial(0xc1b9a7));

    box(scene, 'curb', [0.22, 0.3, 1100],
        [side * 6.55, 0.08, 0], makeMaterial(0xe3d8bd));
  }
}

function createBuilding(x, z, width, depth, height, index) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const palette = [
    0xd6c3a0, 0xcab99c, 0xe0d3ba,
    0xb7aa91, 0xd7c8ad, 0xc8b99d
  ];
  const wall = makeMaterial(palette[index % palette.length]);

  box(group, 'building', [width, height, depth],
      [0, height / 2, 0], wall);

  // Roof lip and small rooftop structures
  box(group, 'roof-edge', [width + 0.25, 0.18, depth + 0.2],
      [0, height + 0.07, 0], makeMaterial(0x9c927f));

  if (index % 3 === 0) {
    box(group, 'rooftop-room',
        [width * 0.35, 1.7, depth * 0.4],
        [0, height + 0.95, 0],
        makeMaterial(0xb9aa8f));
  }

  // Front-facing windows
  const cols = Math.max(2, Math.floor(width / 2.4));
  const rows = Math.max(2, Math.floor(height / 2.5));
  const frontZ = -depth / 2 - 0.015;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = -width / 2 + (col + 0.5) * width / cols;
      const wy = 1.4 + row * 2.15;

      if (wy > height - 0.4) continue;

      box(group, 'window', [0.65, 0.9, 0.04],
          [wx, wy, frontZ],
          makeMaterial(index % 2 ? 0x536b70 : 0x64777a));
    }
  }

  // Ground-floor shop fronts
  if (index % 2 === 0) {
    box(group, 'shop-sign', [width * 0.78, 0.65, 0.08],
        [0, 2.0, frontZ - 0.04],
        makeMaterial(index % 4 === 0 ? 0x37664c : 0x8b4b34));

    box(group, 'shop-door', [0.9, 1.65, 0.05],
        [-width * 0.25, 0.9, frontZ - 0.055],
        makeMaterial(0x4c5c59));
  }

  scene.add(group);
  buildings.push(group);
}

function createBuildings() {
  for (let side of [-1, 1]) {
    for (let i = 0; i < 38; i++) {
      const z = -520 + i * 28 + Math.random() * 7;
      const width = 8 + Math.random() * 7;
      const depth = 8 + Math.random() * 5;
      const height = 8 + Math.random() * 18;
      const x = side * (15 + Math.random() * 9);

      createBuilding(x, z, width, depth, height, i + (side === 1 ? 2 : 0));
    }
  }

  // Far silhouettes create a deeper city skyline
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    const height = 10 + Math.random() * 28;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        8 + Math.random() * 12, height, 10 + Math.random() * 10
      ),
      makeMaterial(0xb4b3a5)
    );

    mesh.position.set(
      side * (45 + Math.random() * 75),
      height / 2,
      -520 + i * 16
    );

    scene.add(mesh);
  }
}

function createStreetLights() {
  const poleMat = makeMaterial(0x525b57);
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffedbd,
    emissive: 0x332816
  });

  for (let z = -500; z < 530; z += 38) {
    for (const side of [-1, 1]) {
      const x = side * 9.3;

      cylinder(scene, 0.065, 0.09, 5.8,
          [x, 2.9, z], poleMat, 8);

      const arm = box(scene, 'lamp-arm', [0.95, 0.08, 0.08],
          [x - side * 0.4, 5.65, z], poleMat);
      arm.rotation.y = side * 0.08;

      box(scene, 'lamp-head', [0.4, 0.12, 0.24],
          [x - side * 0.78, 5.55, z], lampMat);
    }
  }
}

function createTrafficCar(color, z, laneX) {
  const car = new THREE.Group();
  car.position.set(laneX, 0, z);

  const paint = makeMaterial(color, 0.5);
  const glass = makeMaterial(0x3c555a, 0.3);
  const rubber = makeMaterial(0x17191a);

  box(car, 'car-body', [1.8, 0.7, 3.6], [0, 0.75, 0], paint);
  box(car, 'car-roof', [1.45, 0.65, 1.8], [0, 1.37, 0.1], paint);
  box(car, 'car-window', [1.25, 0.4, 1.48],
      [0, 1.4, 0.1], glass);

  for (const x of [-0.94, 0.94]) {
    for (const zz of [-1.1, 1.1]) {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.29, 0.29, 0.14, 12),
        rubber
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.35, zz);
      car.add(tire);
    }
  }

  scene.add(car);
  traffic.push({
    mesh: car,
    laneX,
    speed: 3 + Math.random() * 5,
    phase: Math.random() * 20
  });
}

function createTraffic() {
  const palette = [
    0xd8d6ca, 0x2f6654, 0x9b3f32,
    0xc5a34c, 0x727b82, 0xe9e3d4
  ];

  for (let i = 0; i < 11; i++) {
    const z = -150 + i * 27;
    const lane = i % 2 === 0 ? -3.4 : 3.4;
    createTrafficCar(palette[i % palette.length], z, lane);
  }
}

function setupControls() {
  document.querySelectorAll('[data-control]').forEach(button => {
    const control = button.dataset.control;

    const press = event => {
      event.preventDefault();
      keys[control] = true;

      if (button.setPointerCapture &&
          event.pointerId !== undefined) {
        try { button.setPointerCapture(event.pointerId); } catch {}
      }
    };

    const release = event => {
      event.preventDefault();
      keys[control] = false;
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => {
      keys[control] = false;
    });
    button.addEventListener('contextmenu', e => e.preventDefault());
  });

  addEventListener('keydown', event => {
    if (event.repeat) return;

    if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = true;
    if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = true;
    if (['ArrowUp', 'w', 'W'].includes(event.key)) keys.gas = true;
    if (['ArrowDown', 's', 'S'].includes(event.key)) keys.brake = true;

    if (event.key === ' ') {
      event.preventDefault();
      toggleEngine();
    }
  });

  addEventListener('keyup', event => {
    if (['ArrowLeft', 'a', 'A'].includes(event.key)) keys.left = false;
    if (['ArrowRight', 'd', 'D'].includes(event.key)) keys.right = false;
    if (['ArrowUp', 'w', 'W'].includes(event.key)) keys.gas = false;
    if (['ArrowDown', 's', 'S'].includes(event.key)) keys.brake = false;
  });

  $('engineBtn').addEventListener('click', toggleEngine);

  $('cameraBtn').addEventListener('click', () => {
    interiorCamera = !interiorCamera;
    message(
      interiorCamera
        ? 'الكاميرا الداخلية — مكان السواق'
        : 'الكاميرا الخارجية — خلف الميكروباص'
    );
  });
}

function toggleEngine() {
  if (fuel <= 0) {
    message('البنزين خلص يا أسطى! محتاج تموّن.');
    return;
  }

  engineOn = !engineOn;

  $('engineStatus').textContent =
    engineOn ? 'المحرك شغال' : 'المحرك متوقف';

  $('engineLight').classList.toggle('on', engineOn);
  $('engineBtn').innerHTML =
    engineOn ? '⏻ <span>إطفاء المحرك</span>' :
               '⏻ <span>تشغيل المحرك</span>';

  if (!engineOn) {
    keys.gas = false;
    message('المحرك اتقفل.');
  } else {
    message('يلا يا أسطى، بالراحة في الأول!');
  }
}

function updateDriving(dt) {
  if (!bus) return;

  if (engineOn && keys.gas && fuel > 0) {
    state.velocity += 8 * dt;
    fuel -= 0.07 * dt * (1 + state.velocity / 10);
  } else {
    state.velocity -= 2.2 * dt;
  }

  if (keys.brake) {
    state.velocity -= 16 * dt;
  }

  state.velocity = THREE.MathUtils.clamp(state.velocity, 0, 24);

  if (fuel <= 0) {
    fuel = 0;
    engineOn = false;
    $('engineStatus').textContent = 'البنزين خلص';
    $('engineLight').classList.remove('on');
    message('البنزين خلص! اضغط فرامل ووقف.');
  }

  steering = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);

  const speedFactor = state.velocity / 24;
  state.heading += steering * dt * 0.9 * speedFactor;

  // Keep the vehicle in a reasonable road corridor
  bus.position.x += Math.sin(state.heading) * state.velocity * dt * 0.55;
  bus.position.x = THREE.MathUtils.clamp(bus.position.x, -5.2, 5.2);

  // Forward motion in world coordinates
  const travel = state.velocity * dt;
  bus.position.z -= travel;
  distance += travel;

  bus.rotation.y = state.heading;
  bus.rotation.z = -steering * speedFactor * 0.035;

  wheels.forEach(wheel => {
    wheel.rotation.x += travel * 1.8;
  });

  // Move the environment towards the player to create an endless road
  if (bus.position.z < -420) {
    bus.position.z += 760;

    buildings.forEach(building => {
      building.position.z += 760;
    });

    traffic.forEach(car => {
      car.mesh.position.z += 760;
    });
  }

  traffic.forEach(car => {
    car.mesh.position.z -= car.speed * dt;

    if (car.mesh.position.z > bus.position.z + 20) {
      car.mesh.position.z = bus.position.z - 130 - Math.random() * 120;
      car.laneX = Math.random() < 0.5 ? -3.4 : 3.4;
      car.mesh.position.x = car.laneX;
    }

    const dz = Math.abs(car.mesh.position.z - bus.position.z);
    const dx = Math.abs(car.mesh.position.x - bus.position.x);

    if (dz < 3.2 && dx < 1.7 && state.velocity > 2) {
      state.velocity *= 0.93;
      message('خلي بالك من العربيات يا أسطى!', 1.2);
    }
  });

  speed = Math.round(state.velocity * 3.6);

  $('speed').textContent = speed;
  $('fuelText').textContent = Math.ceil(fuel) + '%';
  $('fuelBar').style.width = fuel + '%';
  $('fuelBar').style.background = fuel < 20 ? '#e65c50' : '#72d5a0';
  $('gear').textContent = !engineOn ? 'N' :
    state.velocity < 0.5 ? '1' :
    state.velocity < 8 ? '1' :
    state.velocity < 15 ? '2' : '3';

  if (distance > 80) {
    distance = 0;
    money += 5;
    $('money').textContent = money + ' ج.م';
    message('قطعت مسافة جديدة! مكافأة 5 جنيه.', 2);
  }
}

function updateCamera(dt) {
  if (!bus || !camera) return;

  const forward = new THREE.Vector3(
    Math.sin(state.heading), 0, -Math.cos(state.heading)
  );

  const right = new THREE.Vector3(
    Math.cos(state.heading), 0, Math.sin(state.heading)
  );

  let desiredPosition, target;

  if (interiorCamera) {
    desiredPosition = bus.position.clone()
      .add(new THREE.Vector3(0, 1.7, 0))
      .add(forward.clone().multiplyScalar(-0.35))
      .add(right.clone().multiplyScalar(-0.42));

    target = desiredPosition.clone().add(forward.clone().multiplyScalar(22));
    camera.fov = 75;
  } else {
    desiredPosition = bus.position.clone()
      .add(forward.clone().multiplyScalar(-8.5))
      .add(new THREE.Vector3(0, 4.5, 0))
      .add(right.clone().multiplyScalar(steering * 0.8));

    target = bus.position.clone()
      .add(forward.clone().multiplyScalar(5))
      .add(new THREE.Vector3(0, 1, 0));

    camera.fov = 65;
  }

  camera.position.lerp(desiredPosition, 1 - Math.exp(-5 * dt));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function animate(time) {
  requestAnimationFrame(animate);

  const dt = Math.min((time - lastTime) / 1000 || 0, 0.04);
  lastTime = time;

  updateDriving(dt);
  updateCamera(dt);

  if (messageTimer > 0) {
    messageTimer -= dt;
  }

  renderer.render(scene, camera);
}

function resize() {
  if (!camera || !renderer) return;

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
}

async function startGame() {
  try {
    createWorld();
    setupControls();

    addEventListener('resize', resize);

    loading.classList.add('hidden');
    hud.classList.remove('hidden');

    message('أهلاً يا أسطى! اضغط تشغيل المحرك وانطلق.');
    requestAnimationFrame(animate);
  } catch (error) {
    console.error(error);
    loading.classList.add('hidden');
    errorBox.classList.remove('hidden');
    $('errorText').textContent =
      'تعذر إنشاء العالم ثلاثي الأبعاد. تأكد من دعم المتصفح لـ WebGL واتصال الإنترنت، ثم أعد المحاولة.';
  }
}

startGame();
