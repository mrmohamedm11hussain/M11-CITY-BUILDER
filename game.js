/* =========================================
   EL OSTTA — الأسطى المصري
   Developer: M11 / Mr. Mohamed Hussain
   ========================================= */

const $ = (selector) => document.querySelector(selector);

const loading = $('#loading');
const hud = $('#hud');
const errorBox = $('#errorBox');
const errorText = $('#errorText');

function showError(message) {
  if (loading) loading.style.display = 'none';

  if (hud) hud.classList.remove('hidden');

  if (errorBox) errorBox.classList.remove('hidden');

  if (errorText) errorText.textContent = message;
}

function showGame() {
  if (loading) loading.style.display = 'none';

  if (hud) {
    hud.classList.remove('hidden');
    hud.style.visibility = 'visible';
    hud.style.opacity = '1';
  }

  if (errorBox) errorBox.classList.add('hidden');
}

window.addEventListener('error', (event) => {
  console.error('EL OSTTA:', event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('EL OSTTA:', event.reason);
});

/*
  تحميل Three.js من عدة مصادر.
  لو المصدر الأول لم يعمل، نجرب المصدر التالي.
*/
async function loadThree() {
  const sources = [
    'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
    'https://unpkg.com/three@0.170.0/build/three.module.js',
    'https://esm.sh/three@0.170.0'
  ];

  let lastError;

  for (const source of sources) {
    try {
      if ($('#loadingText')) {
        $('#loadingText').textContent = 'بنحمّل عالم اللعبة...';
      }

      const THREE = await import(source);

      console.log('Three.js loaded:', source);

      return THREE;
    } catch (error) {
      lastError = error;
      console.warn('Failed to load:', source, error);
    }
  }

  throw lastError || new Error('تعذر تحميل Three.js');
}

async function startGame() {
  let THREE;

  try {
    THREE = await loadThree();
  } catch (error) {
    console.error(error);

    showError(
      'مكتبة اللعبة ثلاثية الأبعاد لم تتحمّل. تأكد من اتصال الإنترنت، ثم افتح الصفحة من جديد. لو استمرت المشكلة، فقد يكون مصدر المكتبة محجوبًا على شبكتك.'
    );

    return;
  }

  try {
    buildGame(THREE);
  } catch (error) {
    console.error('Game initialization failed:', error);

    showError(
      'تم تحميل المكتبة، لكن اللعبة واجهت خطأ أثناء التجهيز. أعد المحاولة، وإذا استمرت المشكلة أرسل لي صورة الخطأ.'
    );
  }
}

function buildGame(THREE) {
  const gameRoot = $('#game') || document.body;

  /* المشهد */
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x9cc8e7);
  scene.fog = new THREE.Fog(0x9cc8e7, 90, 380);

  const camera = new THREE.PerspectiveCamera(
    70,
    innerWidth / innerHeight,
    0.1,
    700
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;

  renderer.domElement.id = 'gameCanvas';

  renderer.domElement.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:0;display:block;touch-action:none;';

  gameRoot.prepend(renderer.domElement);

  /* الإضاءة */
  scene.add(
    new THREE.HemisphereLight(0xffffff, 0x77604a, 2.2)
  );

  const sun = new THREE.DirectionalLight(0xffedcf, 2);

  sun.position.set(-25, 50, -30);

  scene.add(sun);

  /* الخامات */
  function mat(color, roughness = 0.8, metalness = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  const M = {
    road: mat(0x383a3d),
    ground: mat(0xc5b18d),
    pavement: mat(0xb9ad99),
    white: mat(0xf5f0e4),
    black: mat(0x17191b),
    rubber: mat(0x191919),
    chrome: mat(0xbfc5c9, 0.25, 0.7),
    glass: mat(0x477b91, 0.25, 0.1),
    green: mat(0x278b91),
    bus: mat(0xe9e4d5, 0.4),
    red: mat(0xb32d29)
  };

  function box(parent, w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );

    mesh.position.set(x, y, z);
    parent.add(mesh);

    return mesh;
  }

  /* الأرض والطريق */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    M.ground
  );

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.15;

  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 650),
    M.road
  );

  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.06, -120);

  scene.add(road);

  /* الأرصفة */
  for (const side of [-1, 1]) {
    box(
      scene, 2.3, 0.18, 650, M.pavement,
      side * 8.6, -0.01, -120
    );

    box(
      scene, 0.2, 0.24, 650, M.white,
      side * 7.48, 0.02, -120
    );
  }

  /* خطوط الطريق */
  const roadLines = [];

  for (let z = -430; z < 180; z += 10) {
    roadLines.push(
      box(scene, 0.12, 0.025, 4.3, M.white, 0, 0.015, z)
    );
  }

  for (const side of [-1, 1]) {
    box(
      scene, 0.1, 0.025, 650, M.white,
      side * 6.9, 0.02, -120
    );
  }

  /* مباني الشارع المصري */
  const buildings = [];

  const buildingColors = [
    0xc9a783, 0xe0c5a1, 0xb6a18a,
    0xd6c4ad, 0xa99780, 0xd8b98c
  ];

  function createBuilding(side, z) {
    const group = new THREE.Group();

    const w = 5 + Math.random() * 5;
    const h = 8 + Math.random() * 14;
    const d = 8 + Math.random() * 8;

    box(
      group, w, h, d,
      mat(buildingColors[
        Math.floor(Math.random() * buildingColors.length)
      ]),
      0, h / 2, 0
    );

    const windowMat = mat(0x456b7e, 0.25);

    for (let row = 0; row < Math.floor(h / 3); row++) {
      for (let col = -1; col <= 1; col++) {
        box(
          group, 0.9, 1.2, 0.07, windowMat,
          col * w * 0.27,
          1.8 + row * 2.5,
          side < 0 ? d / 2 + 0.04 : -d / 2 - 0.04
        );
      }
    }

    const front = side < 0 ? d / 2 + 0.07 : -d / 2 - 0.07;

    box(
      group, w * 0.6, 1.8, 0.12,
      mat(0x70513a), 0, 1, front
    );

    box(
      group, w * 0.7, 0.3, 0.15,
      mat(0x247f83), 0, 2.1, front
    );

    group.position.set(side * (10 + w / 2), 0, z);

    scene.add(group);
    buildings.push(group);
  }

  for (let z = -420; z < 130; z += 19) {
    createBuilding(-1, z);
    createBuilding(1, z - 8);
  }

  /* أعمدة الإنارة */
  const lights = [];

  function createStreetLight(side, z) {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 5.2, 10),
      mat(0x484c4e)
    );

    pole.position.y = 2.6;

    group.add(pole);

    box(
      group, 1.1, 0.12, 0.12, mat(0x484c4e),
      side * 0.4, 5.1, 0
    );

    box(
      group, 0.4, 0.16, 0.28, mat(0xffe6a1),
      side * 0.9, 5, 0
    );

    group.position.set(side * 7.7, 0, z);

    scene.add(group);
    lights.push(group);
  }

  for (let z = -400; z < 120; z += 36) {
    createStreetLight(-1, z);
    createStreetLight(1, z - 15);
  }

  /* الميكروباص */
  const bus = new THREE.Group();

  scene.add(bus);

  box(bus, 2.35, 1.65, 5.1, M.bus, 0, 1.55, 0);
  box(bus, 2.38, 0.52, 5.05, M.green, 0, 0.72, 0);
  box(bus, 2.15, 0.14, 4.55, M.white, 0, 2.43, 0);

  box(bus, 1.93, 0.77, 0.05, M.glass, 0, 2, -2.57);
  box(bus, 1.8, 0.7, 0.05, M.glass, 0, 1.95, 2.57);

  box(bus, 2.4, 0.18, 0.18, M.chrome, 0, 0.52, -2.64);
  box(bus, 2.4, 0.18, 0.18, M.chrome, 0, 0.52, 2.64);

  for (const side of [-1, 1]) {
    box(bus, 0.36, 0.22, 0.08, M.white, side * 0.83, 0.92, -2.64);
    box(bus, 0.3, 0.15, 0.08, M.red, side * 0.83, 0.9, 2.64);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      box(
        bus, 0.05, 0.65, 0.82, M.glass,
        side * 1.19, 2, -1.55 + i * 0.95
      );
    }

    box(
      bus, 0.18, 0.15, 0.25, M.black,
      side * 1.32, 1.75, -2
    );
  }

  const wheels = [];

  for (const side of [-1, 1]) {
    for (const z of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.24, 20),
        M.rubber
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.2, 0.53, z);

      bus.add(wheel);
      wheels.push(wheel);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.26, 16),
        M.chrome
      );

      hub.rotation.z = Math.PI / 2;
      hub.position.set(side * 1.2, 0.53, z);

      bus.add(hub);
    }
  }

  box(bus, 1.85, 0.3, 0.65, mat(0x343a3c), 0, 1.15, -1.75);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.035, 8, 22),
    M.black
  );

  steeringWheel.position.set(-0.48, 1.48, -1.55);
  steeringWheel.rotation.x = 0.45;

  bus.add(steeringWheel);

  /* لافتة الميكروباص */
  const signCanvas = document.createElement('canvas');

  signCanvas.width = 512;
  signCanvas.height = 128;

  const ctx = signCanvas.getContext('2d');

  ctx.fillStyle = '#143f40';
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = '#fff0bd';
  ctx.font = 'bold 58px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText('الميكروباص', 256, 64);

  const signTexture = new THREE.CanvasTexture(signCanvas);

  signTexture.colorSpace = THREE.SRGBColorSpace;

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 0.42),
    new THREE.MeshBasicMaterial({ map: signTexture })
  );

  sign.position.set(0, 2.25, -2.61);

  bus.add(sign);

  /* السيارات الأخرى */
  const traffic = [];

  const carColors = [
    0xf1e5ca, 0x303c48, 0xb9b5a8,
    0x8f3e34, 0xd4a72c, 0x367d73
  ];

  function createCar(color, taxi = false) {
    const car = new THREE.Group();

    box(car, 1.75, 0.62, 3.2, mat(color, 0.4), 0, 0.78, 0);
    box(car, 1.38, 0.62, 1.65, M.glass, 0, 1.35, -0.1);

    for (const side of [-1, 1]) {
      for (const z of [-1.05, 1.05]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12),
          M.rubber
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.88, 0.38, z);

        car.add(wheel);
      }
    }

    if (taxi) {
      box(car, 0.65, 0.1, 0.28, M.black, 0, 1.68, 0);
    }

    scene.add(car);

    return car;
  }

  for (let i = 0; i < 9; i++) {
    const taxi = i % 3 === 0;

    const car = createCar(
      taxi ? 0xd6b52b : carColors[i % carColors.length],
      taxi
    );

    car.position.set(
      [-4.2, -1.5, 1.6, 4.1][i % 4],
      0,
      -35 - i * 36
    );

    traffic.push({
      mesh: car,
      speed: 9 + Math.random() * 13
    });
  }

  /* حالة القيادة */
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

  /* أدوات التحكم */
  function bindHold(selector, down, up) {
    const button = $(selector);

    if (!button) {
      console.warn('Missing control:', selector);
      return;
    }

    button.style.pointerEvents = 'auto';
    button.style.touchAction = 'none';

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();

      try {
        button.setPointerCapture(event.pointerId);
      } catch (_) {}

      down();
    });

    const release = (event) => {
      if (event) event.preventDefault();
      up();
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', up);
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }

  bindHold(
    '[data-control="left"]',
    () => { state.steering = -1; },
    () => {
      if (state.steering === -1) state.steering = 0;
    }
  );

  bindHold(
    '[data-control="right"]',
    () => { state.steering = 1; },
    () => {
      if (state.steering === 1) state.steering = 0;
    }
  );

  bindHold(
    '#gasBtn',
    () => { state.throttle = true; },
    () => { state.throttle = false; }
  );

  bindHold(
    '#brakeBtn',
    () => { state.brake = true; },
    () => { state.brake = false; }
  );

  /* رسائل */
  function showMessage(message) {
    const element = $('#message');

    if (element) {
      element.textContent = message;
    }
  }

  /* حالة المحرك */
  function updateEngineDisplay() {
    const status = $('#engineStatus');
    const light = $('#engineLight');
    const gear = $('#gear');
    const engineButton = $('#engineBtn');

    if (status) {
      status.textContent = state.engine
        ? 'المحرك يعمل'
        : 'المحرك متوقف';
    }

    if (light) {
      light.classList.toggle('on', state.engine);
    }

    if (gear) {
      gear.textContent = state.engine ? 'D' : 'N';
    }

    if (engineButton) {
      const label = engineButton.querySelector('span');

      if (label) {
        label.textContent = state.engine
          ? 'إطفاء المحرك'
          : 'تشغيل المحرك';
      }
    }
  }

  function updateHUD() {
    const speed = $('#speed');
    const fuelText = $('#fuelText');
    const fuelBar = $('#fuelBar');
    const money = $('#money');

    if (speed) {
      speed.textContent = Math.round(state.speed);
    }

    if (fuelText) {
      fuelText.textContent = Math.round(state.fuel) + '%';
    }

    if (fuelBar) {
      fuelBar.style.width = state.fuel + '%';

      fuelBar.style.background =
        state.fuel < 20 ? '#df6258' : '#72d5a0';
    }

    if (money) {
      money.textContent = Math.round(state.balance) + ' ج.م';
    }

    updateEngineDisplay();
  }

  /* تشغيل المحرك */
  $('#engineBtn')?.addEventListener('click', () => {
    if (!state.engine && state.fuel <= 0) {
      showMessage('الوقود خلص! لا يمكن تشغيل المحرك.');
      return;
    }

    state.engine = !state.engine;

    showMessage(
      state.engine
        ? 'المحرك اشتغل! دوس بنزين يا أسطى.'
        : 'المحرك اتقفل.'
    );

    updateHUD();
  });

  /* الكاميرا */
  function toggleCamera() {
    state.cameraMode =
      state.cameraMode === 'outside' ? 'inside' : 'outside';

    const button = $('#cameraBtn');

    if (button) {
      button.innerHTML =
        state.cameraMode === 'outside'
          ? '<span>◉</span> كاميرا داخلية'
          : '<span>◉</span> كاميرا خارجية';
    }
  }

  $('#cameraBtn')?.addEventListener('click', toggleCamera);

  window.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;

    if (event.key.toLowerCase() === 'c' && !event.repeat) {
      toggleCamera();
    }

    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();

      if (state.fuel > 0 || state.engine) {
        state.engine = !state.engine;
        updateHUD();
      }
    }
  });

  window.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  /* الكاميرا */
  const clock = new THREE.Clock();

  const target = new THREE.Vector3();

  function updateCamera(dt) {
    if (state.cameraMode === 'inside') {
      const position = bus.localToWorld(
        new THREE.Vector3(-0.35, 2.05, -0.65)
      );

      camera.position.lerp(
        position,
        1 - Math.exp(-dt * 8)
      );

      target.copy(
        bus.localToWorld(
          new THREE.Vector3(0, 1.9, -18)
        )
      );

      camera.fov = THREE.MathUtils.lerp(
        camera.fov, 76, dt * 4
      );

      camera.lookAt(target);
    } else {
      const position = new THREE.Vector3(
        bus.position.x * 0.65,
        5.2,
        10.8
      );

      camera.position.lerp(
        position,
        1 - Math.exp(-dt * 4)
      );

      target.set(bus.position.x * 0.45, 1.1, -7);

      camera.lookAt(target);

      camera.fov = THREE.MathUtils.lerp(
        camera.fov, 70, dt * 4
      );
    }

    camera.updateProjectionMatrix();
  }

  camera.position.set(0, 5.2, 10.8);
  camera.lookAt(0, 1, -7);

  /* تحديث حركة اللعبة */
  function updateGame(dt) {
    const accelerating =
      state.throttle || keys['w'] || keys['arrowup'];

    const braking =
      state.brake || keys['s'] || keys['arrowdown'];

    const left =
      state.steering < 0 || keys['a'] || keys['arrowleft'];

    const right =
      state.steering > 0 || keys['d'] || keys['arrowright'];

    if (state.engine && accelerating && state.fuel > 0) {
      state.speed += 24 * dt;
    } else {
      state.speed -= 5 * dt;
    }

    if (braking) {
      state.speed -= 45 * dt;
    }

    state.speed = THREE.MathUtils.clamp(
      state.speed, 0, state.maxSpeed
    );

    const normalized = state.speed / state.maxSpeed;

    if (left) {
      bus.position.x -= (2.5 + normalized * 4) * dt;
    }

    if (right) {
      bus.position.x += (2.5 + normalized * 4) * dt;
    }

    bus.position.x = THREE.MathUtils.clamp(
      bus.position.x, -5.1, 5.1
    );

    steeringWheel.rotation.z = THREE.MathUtils.lerp(
      steeringWheel.rotation.z,
      left ? 0.55 : right ? -0.55 : 0,
      Math.min(1, dt * 6)
    );

    for (const wheel of wheels) {
      wheel.rotation.x += normalized * dt * 5;
    }

    const worldSpeed = state.speed * 0.24;

    for (const line of roadLines) {
      line.position.z += worldSpeed * dt;

      if (line.position.z > 18) {
        line.position.z -= 610;
      }
    }

    for (const building of buildings) {
      building.position.z += worldSpeed * dt;

      if (building.position.z > 35) {
        building.position.z -= 550;
      }
    }

    for (const light of lights) {
      light.position.z += worldSpeed * dt;

      if (light.position.z > 35) {
        light.position.z -= 520;
      }
    }

    for (const car of traffic) {
      car.mesh.position.z +=
        (worldSpeed - car.speed * 0.22) * dt;

      if (car.mesh.position.z > 18) {
        car.mesh.position.z = -300 - Math.random() * 100;

        car.mesh.position.x =
          [-4.2, -1.5, 1.6, 4.1][
            Math.floor(Math.random() * 4)
          ];
      }

      const dx = Math.abs(
        bus.position.x - car.mesh.position.x
      );

      const dz = Math.abs(car.mesh.position.z);

      if (dx < 1.7 && dz < 3 && state.speed > 10) {
        state.speed *= 0.94;
      }
    }

    if (state.engine && state.speed > 0) {
      state.fuel = Math.max(
        0,
        state.fuel - 0.0018 * normalized * dt * 60
      );
    }

    if (state.fuel <= 0) {
      state.engine = false;
      state.speed = Math.max(0, state.speed - 15 * dt);
    }

    updateHUD();
  }

  /* بدء التشغيل */
  showGame();
  updateHUD();

  let animationId = 0;

  function animate() {
    animationId = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.04);

    updateGame(dt);
    updateCamera(dt);

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(innerWidth, innerHeight);

    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, 1.5)
    );
  });

  console.log('EL OSTTA: Game started successfully.');
}

/* بدء تحميل اللعبة */
startGame();
