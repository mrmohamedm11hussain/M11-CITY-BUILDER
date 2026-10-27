import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

(() => {
  "use strict";

  // =====================================================
  // M11 CITY BUILDER 2.0
  // City planning, roads, buildings, parks and traffic
  // Developer: M11 / Mr. Mohamed Hussain
  // =====================================================

  const $ = id => document.getElementById(id);
  const SAVE_KEY = "M11_CITY_BUILDER_SAVE_V2";
  const CELL = 2;
  const SIZE = 24;
  const HALF = SIZE / 2;

  const COST = {
    house: 500,
    shop: 900,
    road: 100,
    tree: 150,
    apartment: 1800,
    tower: 3500,
    park: 700,
    traffic: 400
  };

  const INFO = {
    house:     { population: 4,  income: 0,   label: "بيت" },
    shop:      { population: 2,  income: 45,  label: "محل" },
    road:      { population: 0,  income: 0,   label: "طريق" },
    tree:      { population: 0,  income: 0,   label: "شجرة" },
    apartment: { population: 16, income: 0,   label: "عمارة" },
    tower:     { population: 35, income: 100, label: "برج سكني" },
    park:      { population: 0,  income: 0,   label: "حديقة" },
    traffic:   { population: 0,  income: 0,   label: "إشارة مرور" }
  };

  let money = 5000;
  let population = 0;
  let income = 0;
  let buildingCount = 0;

  let scene, camera, renderer, raycaster, ground, cityGroup;
  let previewGroup, previewFootprint;
  let selectedType = null;
  let cameraAngle = Math.PI / 4;
  let cameraDistance = 24;
  let cameraHeight = 20;

  let toastTimer;
  let lastIncomeTime = Date.now();
  let lastSaveTime = Date.now();
  let lastToastIncomeTime = 0;

  const occupied = new Set();
  const objects = [];
  const cars = [];
  const pointers = new Map();
  const roadTiles = new Map();

  let pointerStart = null;
  let pointerMoved = false;
  let previousPinchDistance = null;

  const material = (color, roughness = 0.88, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });

  const mats = {
    grass: material("#85b96a"),
    road: material("#343d48"),
    roadEdge: material("#606b74"),
    line: material("#f8d66b"),
    trunk: material("#79513a"),
    leaf: material("#328b57"),
    leaf2: material("#5ab86d"),
    white: material("#f5f1e6"),
    concrete: material("#c9c8bd"),
    glass: new THREE.MeshStandardMaterial({
      color: "#86d8f0",
      roughness: 0.2,
      metalness: 0.12,
      emissive: "#123c4a",
      emissiveIntensity: 0.12
    })
  };

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function updateHUD() {
    if (moneyLabel) moneyLabel.textContent = money.toLocaleString("en-US");
    if (populationLabel) populationLabel.textContent = population.toLocaleString("en-US");
    if (buildingsLabel) buildingsLabel.textContent = buildingCount.toLocaleString("en-US");
    if (incomeLabel) incomeLabel.textContent = income.toLocaleString("en-US");
  }

  function box(parent, w, h, d, mat, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function group() {
    return new THREE.Group();
  }

  function cellKey(x, z) {
    return `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
  }

  function snap(value) {
    return Math.round(value / CELL) * CELL;
  }

  function isInside(x, z) {
    return Math.abs(x) < HALF && Math.abs(z) < HALF;
  }

  function getObjectAt(key) {
    return objects.find(item => item.key === key);
  }

  function isRoadAt(x, z) {
    const item = getObjectAt(cellKey(x, z));
    return !!item && item.type === "road";
  }

  // =====================================================
  // WORLD
  // =====================================================

  function createWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#b8dcd7");
    scene.fog = new THREE.Fog("#b8dcd7", 45, 100);

    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      180
    );

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // ظلال محسّنة مع مراعاة أداء الأجهزة المحمولة
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const game = $("game");
    if (!game) throw new Error("عنصر اللعبة game غير موجود في index.html");

    game.prepend(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#f3fff7", "#61764d", 2.1));

    const sun = new THREE.DirectionalLight("#fff3d4", 2.4);
    sun.position.set(12, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 65;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    cityGroup = group();
    scene.add(cityGroup);

    createGround();
    createBoundary();
    createStartingRoads();
    createDecorations();
    createCars();
    createPreview();

    raycaster = new THREE.Raycaster();

    updateCamera();
    connectControls();
    createExtraBuildButtons();

    window.addEventListener("resize", onResize);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveGame();
    });

    window.addEventListener("pagehide", saveGame);

    const restored = loadGame();

    if (loading) loading.classList.add("hidden");
    if (hud) hud.classList.remove("hidden");

    updateHUD();

    showToast(
      restored
        ? "أهلًا بعودتك! مدينتك المحفوظة جاهزة 🏙️"
        : "أهلًا بك في M11 CITY BUILDER 2.0!"
    );

    animate();
  }

  function createGround() {
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE, SIZE),
      mats.grass
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    cityGroup.add(ground);

    const grid = new THREE.GridHelper(
      SIZE,
      SIZE / CELL,
      "#d7e8b8",
      "#d7e8b8"
    );

    grid.position.y = -0.045;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    cityGroup.add(grid);

    // علامات تخطيط الأراضي
    const plotMat = new THREE.LineBasicMaterial({
      color: "#eff5d4",
      transparent: true,
      opacity: 0.35
    });

    for (let x = -10; x <= 10; x += CELL) {
      for (let z = -10; z <= 10; z += CELL) {
        const points = [
          new THREE.Vector3(x - 0.86, -0.035, z - 0.86),
          new THREE.Vector3(x + 0.86, -0.035, z - 0.86),
          new THREE.Vector3(x + 0.86, -0.035, z + 0.86),
          new THREE.Vector3(x - 0.86, -0.035, z + 0.86),
          new THREE.Vector3(x - 0.86, -0.035, z - 0.86)
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        cityGroup.add(new THREE.Line(geometry, plotMat));
      }
    }
  }

  function createBoundary() {
    const wallMat = material("#6f9c70");

    for (let i = -HALF; i <= HALF; i += CELL) {
      box(cityGroup, 0.15, 0.4, 0.15, wallMat, i, 0.1, -HALF);
      box(cityGroup, 0.15, 0.4, 0.15, wallMat, i, 0.1, HALF);
      box(cityGroup, 0.15, 0.4, 0.15, wallMat, -HALF, 0.1, i);
      box(cityGroup, 0.15, 0.4, 0.15, wallMat, HALF, 0.1, i);
    }
  }

  // =====================================================
  // ROADS AND INTERSECTIONS
  // =====================================================

  function createRoad(x, z) {
    const road = group();

    // بلاطة طريق تتصل من الجهات الأربع.
    // وضع الطرق في خلايا متجاورة يصنع شبكة قابلة للتوسّع.
    box(road, CELL, 0.09, CELL, mats.road, 0, 0, 0);

    // حواف الأرصفة
    const curb = material("#aab0ae");

    box(road, CELL, 0.07, 0.1, curb, 0, 0.075, -0.95);
    box(road, CELL, 0.07, 0.1, curb, 0, 0.075, 0.95);
    box(road, 0.1, 0.07, CELL, curb, -0.95, 0.075, 0);
    box(road, 0.1, 0.07, CELL, curb, 0.95, 0.075, 0);

    // خطوط الطريق الأفقية والرأسية تجعل التقاطعات واضحة.
    const stripe = material("#f6d77a");

    box(road, 0.75, 0.012, 0.045, stripe, 0, 0.055, -0.38);
    box(road, 0.75, 0.012, 0.045, stripe, 0, 0.055, 0.38);
    box(road, 0.045, 0.012, 0.75, stripe, -0.38, 0.056, 0);
    box(road, 0.045, 0.012, 0.75, stripe, 0.38, 0.056, 0);

    road.position.set(x, 0, z);
    road.userData.isRoad = true;
    cityGroup.add(road);

    roadTiles.set(cellKey(x, z), road);
    return road;
  }

  function createStartingRoads() {
    for (let x = -10; x <= 10; x += CELL) {
      const road = createRoad(x, 0);
      const key = cellKey(x, 0);

      occupied.add(key);
      objects.push({
        type: "road",
        object: road,
        key,
        x,
        z: 0,
        starter: true
      });
    }
  }

  function createTrafficLight(x, z) {
    const g = group();

    const poleMat = material("#343c42");
    const housingMat = material("#20272b");

    box(g, 0.09, 1.35, 0.09, poleMat, 0.45, 0.68, 0.35);
    box(g, 0.3, 0.68, 0.2, housingMat, 0.45, 1.35, 0.35);

    const red = new THREE.MeshStandardMaterial({
      color: "#ff3b35",
      emissive: "#ff130d",
      emissiveIntensity: 0.7
    });

    const yellow = new THREE.MeshStandardMaterial({
      color: "#ffd43b",
      emissive: "#c78d00",
      emissiveIntensity: 0.5
    });

    const green = new THREE.MeshStandardMaterial({
      color: "#35e879",
      emissive: "#0a9b42",
      emissiveIntensity: 0.6
    });

    for (const [y, mat] of [
      [1.55, red],
      [1.35, yellow],
      [1.15, green]
    ]) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 8),
        mat
      );

      light.position.set(0.45, y, 0.47);
      g.add(light);
    }

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  // =====================================================
  // BUILDINGS
  // =====================================================

  function createHouse(x, z) {
    const g = group();

    const colors = [
      "#f3c98b", "#e9a99a", "#e8dfc7",
      "#b8dcd0", "#d6b7e8", "#f0d59b", "#c5d7eb"
    ];

    const wall = material(colors[Math.floor(Math.random() * colors.length)]);
    const roof = material("#a94e3e");
    const door = material("#674431");
    const frame = material("#f4ead7");

    box(g, 1.45, 1.35, 1.45, wall, 0, 0.75, 0);
    box(g, 1.58, 0.12, 1.58, mats.concrete, 0, 0.08, 0);
    box(g, 1.62, 0.2, 1.62, roof, 0, 1.52, 0);

    box(g, 0.34, 0.7, 0.075, door, 0, 0.43, 0.76);

    for (const wx of [-0.46, 0.46]) {
      box(g, 0.39, 0.42, 0.055, frame, wx, 0.98, 0.755);
      box(g, 0.31, 0.34, 0.035, mats.glass, wx, 0.98, 0.79);
      box(g, 0.035, 0.34, 0.02, frame, wx, 0.98, 0.815);
    }

    box(g, 0.25, 0.45, 0.25, material("#813b32"), 0.42, 1.8, -0.38);
    box(g, 0.7, 0.08, 0.35, roof, 0, 0.9, 0.93);

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  function createShop(x, z) {
    const g = group();

    const wall = material("#f1d6a1");
    const sign = material("#e85c48");
    const dark = material("#59463a");

    box(g, 1.55, 1.4, 1.48, wall, 0, 0.76, 0);
    box(g, 1.68, 0.12, 1.6, mats.concrete, 0, 0.08, 0);
    box(g, 1.5, 0.25, 0.09, sign, 0, 1.32, 0.78);

    box(g, 1.18, 0.64, 0.06, dark, 0, 0.79, 0.77);
    box(g, 1.08, 0.53, 0.035, mats.glass, 0, 0.81, 0.81);

    box(g, 1.3, 0.08, 0.35, material("#f4f0e4"), 0, 1.14, 0.82);
    box(g, 0.28, 0.66, 0.07, dark, -0.48, 0.42, 0.78);

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  function createApartment(x, z) {
    const g = group();

    const wallColors = ["#e6d9c3", "#c8d9e7", "#e5c7b8", "#d2d7c2"];
    const wall = material(wallColors[Math.floor(Math.random() * wallColors.length)]);
    const balcony = material("#e9e5dc");
    const floors = 4;

    box(g, 1.72, 0.12, 1.72, mats.concrete, 0, 0.08, 0);
    box(g, 1.52, floors * 0.58, 1.52, wall, 0, 0.15 + floors * 0.29, 0);

    for (let floor = 0; floor < floors; floor++) {
      const y = 0.38 + floor * 0.58;

      for (const side of [-1, 1]) {
        box(g, 0.4, 0.29, 0.035, mats.glass, side * 0.43, y, 0.78);
        box(g, 0.4, 0.045, 0.06, balcony, side * 0.43, y - 0.17, 0.81);
      }

      box(g, 1.25, 0.035, 0.035, balcony, 0, y - 0.27, 0.79);
    }

    box(g, 1.7, 0.13, 1.7, material("#7b8c9c"), 0, 0.15 + floors * 0.58, 0);
    box(g, 0.42, 0.66, 0.06, material("#6b503a"), 0, 0.43, 0.78);

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  function createTower(x, z) {
    const g = group();

    const base = material("#aab7c3");
    const glassBlue = new THREE.MeshStandardMaterial({
      color: "#6db9d5",
      roughness: 0.22,
      metalness: 0.3,
      emissive: "#123846",
      emissiveIntensity: 0.1
    });

    const floors = 7;
    const floorHeight = 0.47;
    const totalHeight = floors * floorHeight;

    box(g, 1.78, 0.13, 1.78, mats.concrete, 0, 0.08, 0);
    box(g, 1.55, totalHeight, 1.55, base, 0, 0.15 + totalHeight / 2, 0);

    for (let floor = 0; floor < floors; floor++) {
      const y = 0.32 + floor * floorHeight;

      for (const side of [-1, 1]) {
        box(g, 0.42, 0.29, 0.035, glassBlue, side * 0.42, y, 0.79);
        box(g, 0.42, 0.29, 0.035, glassBlue, side * 0.42, y, -0.79);
      }

      box(g, 1.3, 0.035, 0.035, mats.white, 0, y - 0.19, 0.79);
    }

    box(g, 0.62, 0.5, 0.62, material("#8799a8"), 0, 0.15 + totalHeight + 0.25, 0);
    box(g, 0.12, 0.7, 0.12, material("#e6c96e"), 0, 0.15 + totalHeight + 0.8, 0);

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  // =====================================================
  // PARKS AND TREES
  // =====================================================

  function createTree(x, z) {
    const g = group();

    box(g, 0.25, 0.85, 0.25, mats.trunk, 0, 0.43, 0);

    const lower = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 1.1, 7),
      mats.leaf
    );

    lower.position.y = 1.2;
    lower.castShadow = true;
    g.add(lower);

    const upper = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.8, 7),
      mats.leaf2
    );

    upper.position.y = 1.7;
    upper.castShadow = true;
    g.add(upper);

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  function createPark(x, z) {
    const g = group();

    const grass = material("#69b86a");
    const path = material("#e1d9c6");
    const benchWood = material("#875b3b");
    const metal = material("#424d53");

    box(g, 1.85, 0.08, 1.85, grass, 0, 0.04, 0);

    box(g, 0.25, 0.025, 1.55, path, 0, 0.09, 0);
    box(g, 1.55, 0.025, 0.25, path, 0, 0.1, 0);

    // شجيرات صغيرة
    for (const [tx, tz] of [
      [-0.65, -0.65],
      [0.65, -0.65],
      [-0.65, 0.65],
      [0.65, 0.65]
    ]) {
      const shrub = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 6),
        mats.leaf
      );

      shrub.position.set(tx, 0.24, tz);
      shrub.castShadow = true;
      g.add(shrub);
    }

    // مقعد الحديقة
    box(g, 0.65, 0.09, 0.22, benchWood, 0, 0.35, -0.35);
    box(g, 0.65, 0.32, 0.06, benchWood, 0, 0.48, -0.43);
    box(g, 0.07, 0.3, 0.07, metal, -0.23, 0.19, -0.35);
    box(g, 0.07, 0.3, 0.07, metal, 0.23, 0.19, -0.35);

    g.position.set(x, 0, z);
    cityGroup.add(g);
    return g;
  }

  function createDecorations() {
    for (let i = 0; i < 13; i++) {
      const x = (Math.random() - 0.5) * (SIZE - 4);
      const z = (Math.random() - 0.5) * (SIZE - 4);

      if (Math.abs(z) < 2.5) continue;

      const g = group();
      box(g, 0.15, 0.6, 0.15, mats.trunk, 0, 0.3, 0);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 6),
        mats.leaf
      );

      crown.position.y = 0.9;
      crown.castShadow = true;
      g.add(crown);

      g.position.set(x, 0, z);
      cityGroup.add(g);
    }
  }

  // =====================================================
  // CARS
  // =====================================================

  function createCar(color, x, z, direction = 1) {
    const car = group();
    const carMat = material(color);
    const tireMat = material("#242a30");

    box(car, 1.0, 0.34, 0.58, carMat, 0, 0.26, 0);
    box(car, 0.52, 0.28, 0.46, mats.glass, 0, 0.55, 0);

    for (const wx of [-0.31, 0.31]) {
      for (const wz of [-0.27, 0.27]) {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.09, 10),
          tireMat
        );

        tire.rotation.z = Math.PI / 2;
        tire.position.set(wx, 0.13, wz);
        car.add(tire);
      }
    }

    const headlight = new THREE.MeshBasicMaterial({ color: "#fff0b2" });
    const rearLight = new THREE.MeshBasicMaterial({ color: "#ed534b" });

    box(car, 0.13, 0.09, 0.04, headlight, -0.39, 0.29, 0.31);
    box(car, 0.13, 0.09, 0.04, headlight, 0.39, 0.29, 0.31);
    box(car, 0.13, 0.09, 0.04, rearLight, -0.39, 0.29, -0.31);
    box(car, 0.13, 0.09, 0.04, rearLight, 0.39, 0.29, -0.31);

    car.position.set(x, 0.08, z);
    car.userData.speed = 0.65 + Math.random() * 0.5;
    car.userData.direction = direction;
    car.userData.axis = "x";
    car.userData.startX = x;
    car.userData.startZ = z;

    cityGroup.add(car);
    cars.push(car);
    return car;
  }

  function createCars() {
    const colors = ["#e85c4a", "#e9cf58", "#4d94e8", "#f4f4ef"];

    for (let i = 0; i < 4; i++) {
      createCar(colors[i], -10 + i * 5, 0, 1);
    }
  }

  // =====================================================
  // BUILD PREVIEW
  // =====================================================

  function createPreview() {
    previewGroup = group();

    const ghostMat = new THREE.MeshBasicMaterial({
      color: "#5df5a5",
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });

    previewFootprint = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.06, 1.8),
      ghostMat
    );

    previewFootprint.position.y = 0.05;
    previewGroup.add(previewFootprint);
    previewGroup.visible = false;
    scene.add(previewGroup);
  }

  function updatePreview(point) {
    if (!selectedType || !point) {
      previewGroup.visible = false;
      return;
    }

    const x = snap(point.x);
    const z = snap(point.z);
    const key = cellKey(x, z);

    previewGroup.position.set(x, 0, z);
    previewGroup.visible = true;

    const valid =
      isInside(x, z) &&
      !occupied.has(key) &&
      money >= COST[selectedType];

    previewFootprint.material.color.set(
      valid ? "#5df5a5" : "#ff5555"
    );

    previewFootprint.scale.set(1, 1, 1);
  }

  // =====================================================
  // PLACEMENT AND ECONOMY
  // =====================================================

  function placeBuilding(type, x, z) {
    const gx = snap(x);
    const gz = snap(z);
    const key = cellKey(gx, gz);

    if (!isInside(gx, gz)) {
      showToast("اختار قطعة أرض داخل حدود المدينة.");
      return;
    }

    if (occupied.has(key)) {
      showToast("قطعة الأرض مشغولة! اختار مكانًا فاضيًا.");
      return;
    }

    if (!COST.hasOwnProperty(type)) return;

    if (money < COST[type]) {
      showToast("رصيدك مش كفاية للبناء ده 💰");
      return;
    }

    // وضع المباني بجوار شبكة الطرق.
    // يسمح ببناء أول قطعة، ثم يشجع على التخطيط قرب الطرق.
    if (type !== "road" && !hasNearbyRoad(gx, gz)) {
      showToast("ابنِ طريقًا قريبًا أولًا لتخطيط المنطقة.");
      return;
    }

    let object = null;

    switch (type) {
      case "house":
        object = createHouse(gx, gz);
        break;
      case "shop":
        object = createShop(gx, gz);
        break;
      case "road":
        object = createRoad(gx, gz);
        break;
      case "tree":
        object = createTree(gx, gz);
        break;
      case "apartment":
        object = createApartment(gx, gz);
        break;
      case "tower":
        object = createTower(gx, gz);
        break;
      case "park":
        object = createPark(gx, gz);
        break;
      case "traffic":
        object = createTrafficLight(gx, gz);
        break;
    }

    if (!object) return;

    occupied.add(key);

    objects.push({
      type,
      object,
      key,
      x: gx,
      z: gz
    });

    money -= COST[type];
    population += INFO[type].population;
    income += INFO[type].income;

    if (
      type === "house" ||
      type === "shop" ||
      type === "apartment" ||
      type === "tower"
    ) {
      buildingCount++;
    }

    updateHUD();
    saveGame();

    showToast(`${INFO[type].label} جديد! 🏗️`);
  }

  function hasNearbyRoad(x, z) {
    return (
      isRoadAt(x + CELL, z) ||
      isRoadAt(x - CELL, z) ||
      isRoadAt(x, z + CELL) ||
      isRoadAt(x, z - CELL)
    );
  }

  // =====================================================
  // SAVE AND LOAD
  // =====================================================

  function saveGame() {
    try {
      const data = {
        version: 2,
        money,
        cameraAngle,
        cameraDistance,
        objects: objects
          .filter(item => !item.starter)
          .map(item => ({
            type: item.type,
            x: item.x,
            z: item.z
          }))
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      lastSaveTime = Date.now();
    } catch (error) {
      console.warn("تعذر حفظ المدينة:", error);
    }
  }

  function loadGame() {
    let data;

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;

      data = JSON.parse(raw);

      if (
        !data ||
        data.version !== 2 ||
        !Array.isArray(data.objects)
      ) {
        return false;
      }
    } catch (error) {
      console.warn("بيانات الحفظ غير صالحة:", error);
      return false;
    }

    if (Number.isFinite(data.money)) {
      money = Math.max(0, data.money);
    }

    if (Number.isFinite(data.cameraAngle)) {
      cameraAngle = data.cameraAngle;
    }

    if (Number.isFinite(data.cameraDistance)) {
      cameraDistance = THREE.MathUtils.clamp(
        data.cameraDistance,
        13,
        42
      );
    }

    for (const item of data.objects) {
      if (
        !item ||
        !Object.prototype.hasOwnProperty.call(COST, item.type) ||
        !Number.isFinite(item.x) ||
        !Number.isFinite(item.z)
      ) {
        continue;
      }

      const x = snap(item.x);
      const z = snap(item.z);
      const key = cellKey(x, z);

      if (!isInside(x, z) || occupied.has(key)) continue;

      let object = null;

      switch (item.type) {
        case "house":
          object = createHouse(x, z);
          break;
        case "shop":
          object = createShop(x, z);
          break;
        case "road":
          object = createRoad(x, z);
          break;
        case "tree":
          object = createTree(x, z);
          break;
        case "apartment":
          object = createApartment(x, z);
          break;
        case "tower":
          object = createTower(x, z);
          break;
        case "park":
          object = createPark(x, z);
          break;
        case "traffic":
          object = createTrafficLight(x, z);
          break;
      }

      if (!object) continue;

      occupied.add(key);
      objects.push({ type: item.type, object, key, x, z });

      population += INFO[item.type].population;
      income += INFO[item.type].income;

      if (
        item.type === "house" ||
        item.type === "shop" ||
        item.type === "apartment" ||
        item.type === "tower"
      ) {
        buildingCount++;
      }
    }

    updateCamera();
    return true;
  }

  // =====================================================
  // BUILD MENU
  // =====================================================

  function createExtraBuildButtons() {
    const existing = document.querySelector(".build-btn");
    if (!existing) {
      console.warn("لم يتم العثور على أزرار البناء في index.html");
      return;
    }

    const container = existing.parentElement;
    if (!container) return;

    const extras = [
      { type: "apartment", label: "🏢 عمارة", title: "عمارة سكنية - 1800" },
      { type: "tower", label: "🏙️ برج", title: "برج سكني - 3500" },
      { type: "park", label: "🌳 حديقة", title: "حديقة - 700" },
      { type: "traffic", label: "🚦 إشارة", title: "إشارة مرور - 400" }
    ];

    for (const item of extras) {
      if (document.querySelector(`.build-btn[data-type="${item.type}"]`)) {
        continue;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = existing.className || "build-btn";
      button.classList.remove("active");
      button.dataset.type = item.type;
      button.textContent = item.label;
      button.title = item.title;
      button.setAttribute("aria-label", item.title);

      container.appendChild(button);
    }

    // إضافة اسم المطور داخل واجهة اللعبة إن أمكن.
    const game = $("game");

    if (game && !$("m11-credit")) {
      const credit = document.createElement("div");
      credit.id = "m11-credit";
      credit.textContent = "M11 CITY BUILDER 2.0";
      credit.style.cssText = [
        "position:absolute",
        "top:8px",
        "left:10px",
        "z-index:5",
        "padding:6px 10px",
        "border-radius:10px",
        "background:rgba(17,35,43,.72)",
        "color:#fff",
        "font:700 11px Arial,sans-serif",
        "pointer-events:none"
      ].join(";");

      game.appendChild(credit);
    }
  }

  // =====================================================
  // CONTROLS
  // =====================================================

  function connectControls() {
    document.querySelectorAll(".build-btn").forEach(button => {
      button.addEventListener("click", () => {
        const type = button.dataset.type;

        if (!Object.prototype.hasOwnProperty.call(COST, type)) {
          showToast("نوع البناء ده غير متاح.");
          return;
        }

        selectedType = type;

        document.querySelectorAll(".build-btn").forEach(b => {
          b.classList.toggle("active", b === button);
        });

        showToast(
          `${INFO[type].label} — التكلفة ${COST[type].toLocaleString("en-US")} 💰`
        );

        previewGroup.visible = false;
      });
    });

    if ($("cancelBuild")) {
      $("cancelBuild").addEventListener("click", () => {
        selectedType = null;
        previewGroup.visible = false;

        document.querySelectorAll(".build-btn").forEach(button => {
          button.classList.remove("active");
        });

        showToast("تم إلغاء البناء.");
      });
    }

    if ($("cameraBtn")) {
      $("cameraBtn").addEventListener("click", () => {
        cameraAngle += Math.PI / 4;
        updateCamera();
        saveGame();
      });
    }

    if ($("zoomInBtn")) {
      $("zoomInBtn").addEventListener("click", () => {
        cameraDistance = Math.max(13, cameraDistance - 3);
        updateCamera();
        saveGame();
      });
    }

    if ($("zoomOutBtn")) {
      $("zoomOutBtn").addEventListener("click", () => {
        cameraDistance = Math.min(42, cameraDistance + 3);
        updateCamera();
        saveGame();
      });
    }

    renderer.domElement.style.touchAction = "none";

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);

    renderer.domElement.addEventListener("wheel", event => {
      event.preventDefault();

      cameraDistance = THREE.MathUtils.clamp(
        cameraDistance + event.deltaY * 0.025,
        13,
        42
      );

      updateCamera();
    }, { passive: false });

    renderer.domElement.addEventListener("contextmenu", event => {
      event.preventDefault();
    });
  }

  function onPointerDown(event) {
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    try {
      renderer.domElement.setPointerCapture(event.pointerId);
    } catch (_) {}

    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      angle: cameraAngle,
      height: cameraHeight
    };

    pointerMoved = false;

    if (pointers.size === 2) {
      previousPinchDistance = getPinchDistance();
    }
  }

  function getPinchDistance() {
    const values = Array.from(pointers.values());
    if (values.length < 2) return null;

    return Math.hypot(
      values[0].x - values[1].x,
      values[0].y - values[1].y
    );
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (pointers.size >= 2) {
      const distance = getPinchDistance();

      if (distance && previousPinchDistance) {
        cameraDistance = THREE.MathUtils.clamp(
          cameraDistance + (previousPinchDistance - distance) * 0.045,
          13,
          42
        );

        updateCamera();
      }

      previousPinchDistance = distance;
      pointerMoved = true;
      return;
    }

    if (!pointerStart) return;

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      pointerMoved = true;
    }

    if (pointerMoved) {
      cameraAngle = pointerStart.angle + dx * 0.009;
      cameraHeight = THREE.MathUtils.clamp(
        20 + dy * 0.04,
        13,
        28
      );

      updateCamera();
    }

    if (selectedType) {
      updatePreviewFromScreen(event.clientX, event.clientY);
    }
  }

  function onPointerUp(event) {
    const start = pointerStart;
    pointers.delete(event.pointerId);

    if (pointers.size < 2) {
      previousPinchDistance = null;
    }

    if (start && !pointerMoved && pointers.size === 0) {
      handleWorldTap(event.clientX, event.clientY);
    }

    if (pointers.size === 0) {
      pointerStart = null;
      pointerMoved = false;
    } else {
      pointerStart = {
        x: event.clientX,
        y: event.clientY,
        angle: cameraAngle,
        height: cameraHeight
      };
    }

    saveGame();
  }

  function onPointerCancel(event) {
    pointers.delete(event.pointerId);

    if (pointers.size === 0) {
      pointerStart = null;
      pointerMoved = false;
      previousPinchDistance = null;
    }
  }

  function getGroundPoint(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObject(ground, false);
    return hits.length ? hits[0].point : null;
  }

  function updatePreviewFromScreen(clientX, clientY) {
    updatePreview(getGroundPoint(clientX, clientY));
  }

  function handleWorldTap(clientX, clientY) {
    if (!selectedType) return;

    const point = getGroundPoint(clientX, clientY);
    if (!point) return;

    placeBuilding(selectedType, point.x, point.z);
    updatePreview(point);
  }

  // =====================================================
  // CAMERA / GAME LOOP
  // =====================================================

  function updateCamera() {
    camera.position.set(
      Math.cos(cameraAngle) * cameraDistance,
      cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    camera.lookAt(0, 0, 0);
  }

  function onResize() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();

    // تحصيل دخل المتاجر والأبراج كل 10 ثوانٍ.
    if (now - lastIncomeTime >= 10000) {
      const intervals = Math.floor((now - lastIncomeTime) / 10000);

      if (income > 0) {
        const earned = income * intervals;
        money += earned;
        updateHUD();

        if (now - lastToastIncomeTime > 5000) {
          showToast(`دخل المدينة: +${earned.toLocaleString("en-US")} 💰`);
          lastToastIncomeTime = now;
        }
      }

      lastIncomeTime += intervals * 10000;
    }

    // حركة السيارات على الطريق الأساسي.
    const delta = Math.min(0.05, (now - (animate.lastTime || now)) / 1000);
    animate.lastTime = now;

    for (const car of cars) {
      if (car.userData.axis === "x") {
        car.position.x += car.userData.speed * delta * car.userData.direction;

        if (car.userData.direction > 0 && car.position.x > 12) {
          car.position.x = -12;
        } else if (car.userData.direction < 0 && car.position.x < -12) {
          car.position.x = 12;
        }
      }
    }

    // حفظ احتياطي دوري.
    if (now - lastSaveTime > 15000) {
      saveGame();
    }

    renderer.render(scene, camera);
  }

  try {
    createWorld();
  } catch (error) {
    console.error("M11 CITY BUILDER:", error);

    if (loading) {
      loading.classList.remove("hidden");
      loading.innerHTML = `
        <h2>تعذر تشغيل اللعبة</h2>
        <p>تأكد من اتصال الإنترنت، ثم أعد تحميل الصفحة.</p>
      `;
    }
  }
})(); 
