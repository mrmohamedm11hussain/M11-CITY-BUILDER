import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

(() => {
  "use strict";

  // ============================================
  // M11 CITY BUILDER
  // Developer: M11 Development
  // Created by M11 / Mr. Mohamed Hussain
  // ============================================

  const $ = id => document.getElementById(id);

  const loading = $("loading");
  const hud = $("hud");
  const moneyLabel = $("money");
  const populationLabel = $("population");
  const buildingsLabel = $("buildings");
  const incomeLabel = $("income");
  const toast = $("toast");

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
    house:     { population: 4,  income: 0,   label: "منزل" },
    shop:      { population: 2,  income: 45,  label: "متجر" },
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

  let scene;
  let camera;
  let renderer;
  let raycaster;
  let ground;
  let cityGroup;
  let previewGroup;
  let previewFootprint;

  let selectedType = null;
  let cameraAngle = Math.PI / 4;
  let cameraDistance = 24;
  let cameraHeight = 20;

  let lastIncomeTime = Date.now();
  let lastSaveTime = Date.now();
  let toastTimer;

  const occupied = new Set();
  const objects = [];
  const cars = [];
  const pointers = new Map();

  let pointerStart = null;
  let pointerMoved = false;
  let previousPinchDistance = null;

  // ============================================
  // MATERIALS AND UTILITIES
  // ============================================

  const material = (color, roughness = 0.85, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });

  const mats = {
    grass: material("#85b96a"),
    road: material("#343d48"),
    curb: material("#b6bdb9"),
    line: material("#f8d66b"),
    trunk: material("#79513a"),
    leaf: material("#328b57"),
    leaf2: material("#5ab86d"),
    concrete: material("#d0d0c5"),

    glass: new THREE.MeshStandardMaterial({
      color: "#86d8f0",
      roughness: 0.2,
      metalness: 0.12,
      emissive: "#123c4a",
      emissiveIntensity: 0.12
    })
  };

  function box(parent, w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
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

  function hasNearbyRoad(x, z) {
    return (
      isRoadAt(x + CELL, z) ||
      isRoadAt(x - CELL, z) ||
      isRoadAt(x, z + CELL) ||
      isRoadAt(x, z - CELL)
    );
  }

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function updateHUD() {
    if (moneyLabel) {
      moneyLabel.textContent = money.toLocaleString("en-US");
    }

    if (populationLabel) {
      populationLabel.textContent = population.toLocaleString("en-US");
    }

    if (buildingsLabel) {
      buildingsLabel.textContent = buildingCount.toLocaleString("en-US");
    }

    if (incomeLabel) {
      incomeLabel.textContent = income.toLocaleString("en-US");
    }
  }

  // ============================================
  // WORLD CREATION
  // ============================================

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
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const game = $("game");

    if (!game) {
      throw new Error("عنصر اللعبة غير موجود في index.html");
    }

    game.prepend(renderer.domElement);

    scene.add(
      new THREE.HemisphereLight("#f3fff7", "#61764d", 2.1)
    );

    const sun = new THREE.DirectionalLight("#fff3d4", 2.4);

    sun.position.set(12, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
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

    raycaster = new THREE.Raycaster();

    createPreview();

    updateCamera();

    // مهم: أنشئ الأزرار الإضافية قبل ربط الأحداث.
    createExtraBuildButtons();
    connectControls();

    window.addEventListener("resize", onResize);

    window.addEventListener("pagehide", saveGame);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveGame();
    });

    const restored = loadGame();

    if (loading) loading.classList.add("hidden");
    if (hud) hud.classList.remove("hidden");

    updateHUD();

    showToast(
      restored
        ? "أهلًا بعودتك! مدينتك المحفوظة جاهزة 🏙️"
        : "أهلًا بك في M11 CITY BUILDER!"
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

  // ============================================
  // ROADS
  // ============================================

  function createRoad(x, z) {
    const g = group();

    box(g, CELL, 0.09, CELL, mats.road, 0, 0, 0);

    box(g, CELL, 0.07, 0.1, mats.curb, 0, 0.075, -0.95);
    box(g, CELL, 0.07, 0.1, mats.curb, 0, 0.075, 0.95);
    box(g, 0.1, 0.07, CELL, mats.curb, -0.95, 0.075, 0);
    box(g, 0.1, 0.07, CELL, mats.curb, 0.95, 0.075, 0);

    box(g, 0.65, 0.015, 0.045, mats.line, 0, 0.055, -0.35);
    box(g, 0.65, 0.015, 0.045, mats.line, 0, 0.055, 0.35);

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
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

  // ============================================
  // BUILDING MODELS
  // ============================================

  function createHouse(x, z) {
    const g = group();

    const colors = [
      "#f3c98b",
      "#e9a99a",
      "#e8dfc7",
      "#b8dcd0",
      "#d6b7e8",
      "#f0d59b"
    ];

    const wall = material(
      colors[Math.floor(Math.random() * colors.length)]
    );

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
    }

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

    box(g, 1.18, 0.64, 0.06, dark, 0, 0.79, 0);
    box(g, 1.08, 0.53, 0.035, mats.glass, 0, 0.81, 0.04);

    box(g, 0.28, 0.66, 0.07, dark, -0.48, 0.42, 0.78);

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
  }

  function createApartment(x, z) {
    const g = group();

    const colors = ["#e6d9c3", "#c8d9e7", "#e5c7b8", "#d2d7c2"];
    const wall = material(colors[Math.floor(Math.random() * colors.length)]);

    const floors = 4;
    const floorHeight = 0.58;

    box(g, 1.72, 0.12, 1.72, mats.concrete, 0, 0.08, 0);

    box(
      g,
      1.52,
      floors * floorHeight,
      1.52,
      wall,
      0,
      0.15 + floors * floorHeight / 2,
      0
    );

    for (let floor = 0; floor < floors; floor++) {
      const y = 0.38 + floor * floorHeight;

      for (const side of [-1, 1]) {
        box(g, 0.4, 0.29, 0.035, mats.glass, side * 0.43, y, 0.78);
      }
    }

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
  }

  function createTower(x, z) {
    const g = group();

    const wall = material("#aab7c3");
    const floors = 7;
    const floorHeight = 0.47;
    const totalHeight = floors * floorHeight;

    box(g, 1.78, 0.13, 1.78, mats.concrete, 0, 0.08, 0);

    box(
      g,
      1.55,
      totalHeight,
      1.55,
      wall,
      0,
      0.15 + totalHeight / 2,
      0
    );

    for (let floor = 0; floor < floors; floor++) {
      const y = 0.32 + floor * floorHeight;

      for (const side of [-1, 1]) {
        box(g, 0.42, 0.29, 0.035, mats.glass, side * 0.42, y, 0.79);
      }
    }

    box(
      g,
      0.12,
      0.7,
      0.12,
      material("#e6c96e"),
      0,
      0.15 + totalHeight + 0.45,
      0
    );

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
  }

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

    box(g, 1.85, 0.08, 1.85, material("#69b86a"), 0, 0.04, 0);
    box(g, 0.25, 0.025, 1.55, material("#e1d9c6"), 0, 0.09, 0);
    box(g, 1.55, 0.025, 0.25, material("#e1d9c6"), 0, 0.1, 0);

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
      g.add(shrub);
    }

    box(g, 0.65, 0.09, 0.22, material("#875b3b"), 0, 0.35, -0.35);

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
  }

  function createTrafficLight(x, z) {
    const g = group();

    box(g, 0.09, 1.35, 0.09, material("#343c42"), 0.45, 0.68, 0.35);
    box(g, 0.3, 0.68, 0.2, material("#20272b"), 0.45, 1.35, 0.35);

    const colors = ["#ff3b35", "#ffd43b", "#35e879"];

    for (let i = 0; i < colors.length; i++) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 8),
        new THREE.MeshStandardMaterial({
          color: colors[i],
          emissive: colors[i],
          emissiveIntensity: 0.45
        })
      );

      light.position.set(0.45, 1.55 - i * 0.2, 0.47);
      g.add(light);
    }

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
  }

  // ============================================
  // DECORATION AND TRAFFIC
  // ============================================

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
      g.add(crown);

      g.position.set(x, 0, z);
      cityGroup.add(g);
    }
  }

  function createCar(color, x, z) {
    const car = group();

    box(car, 1, 0.34, 0.58, material(color), 0, 0.26, 0);
    box(car, 0.52, 0.28, 0.46, mats.glass, 0, 0.55, 0);

    const tireMat = material("#242a30");

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

    car.position.set(x, 0.08, z);
    car.userData.speed = 0.65 + Math.random() * 0.5;
    car.userData.direction = 1;

    cityGroup.add(car);
    cars.push(car);

    return car;
  }

  function createCars() {
    const colors = ["#e85c4a", "#e9cf58", "#4d94e8", "#f4f4ef"];

    for (let i = 0; i < colors.length; i++) {
      createCar(colors[i], -10 + i * 5, 0);
    }
  }

  // ============================================
  // BUILD PREVIEW
  // ============================================

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
      money >= COST[selectedType] &&
      (selectedType === "road" || hasNearbyRoad(x, z));

    previewFootprint.material.color.set(
      valid ? "#5df5a5" : "#ff5555"
    );
  }

  // ============================================
  // PLACEMENT AND ECONOMY
  // ============================================

  function createBuilding(type, x, z) {
    switch (type) {
      case "house": return createHouse(x, z);
      case "shop": return createShop(x, z);
      case "road": return createRoad(x, z);
      case "tree": return createTree(x, z);
      case "apartment": return createApartment(x, z);
      case "tower": return createTower(x, z);
      case "park": return createPark(x, z);
      case "traffic": return createTrafficLight(x, z);
      default: return null;
    }
  }

  function placeBuilding(type, x, z) {
    const gx = snap(x);
    const gz = snap(z);
    const key = cellKey(gx, gz);

    if (!isInside(gx, gz)) {
      showToast("اختار أرضًا داخل حدود المدينة.");
      return;
    }

    if (occupied.has(key)) {
      showToast("المكان مشغول! اختار مكانًا آخر.");
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(COST, type)) {
      return;
    }

    if (money < COST[type]) {
      showToast("رصيدك مش كفاية للبناء ده 💰");
      return;
    }

    if (type !== "road" && !hasNearbyRoad(gx, gz)) {
      showToast("ابنِ طريقًا قريبًا أولًا.");
      return;
    }

    const object = createBuilding(type, gx, gz);
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

    if (["house", "shop", "apartment", "tower"].includes(type)) {
      buildingCount++;
    }

    updateHUD();
    saveGame();

    showToast(`${INFO[type].label} جديد! 🏗️`);
  }

  // ============================================
  // SAVE AND LOAD
  // ============================================

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

      const object = createBuilding(item.type, x, z);
      if (!object) continue;

      occupied.add(key);

      objects.push({
        type: item.type,
        object,
        key,
        x,
        z
      });

      population += INFO[item.type].population;
      income += INFO[item.type].income;

      if (["house", "shop", "apartment", "tower"].includes(item.type)) {
        buildingCount++;
      }
    }

    updateCamera();
    return true;
  }

  // ============================================
  // EXTRA BUILD BUTTONS
  // ============================================

  function createExtraBuildButtons() {
    const first = document.querySelector(".build-btn");
    if (!first) return;

    const container = first.parentElement;
    if (!container) return;

    const extras = [
      { type: "apartment", icon: "🏢", label: "عمارة" },
      { type: "tower", icon: "🏙️", label: "برج" },
      { type: "park", icon: "🌳", label: "حديقة" },
      { type: "traffic", icon: "🚦", label: "إشارة" }
    ];

    for (const item of extras) {
      if (document.querySelector(`.build-btn[data-type="${item.type}"]`)) {
        continue;
      }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "build-btn";
      button.dataset.type = item.type;
      button.title = `${item.label} — ${COST[item.type]} 💰`;
      button.setAttribute("aria-label", button.title);

      const icon = document.createElement("span");
      icon.className = "building-icon";
      icon.textContent = item.icon;

      const label = document.createElement("span");
      label.className = "building-name";
      label.textContent = item.label;

      const cost = document.createElement("small");
      cost.textContent = `${COST[item.type].toLocaleString("en-US")} 💰`;

      button.append(icon, label, cost);
      container.appendChild(button);
    }
  }

  // ============================================
  // CONTROLS
  // ============================================

  function connectControls() {
    document.querySelectorAll(".build-btn").forEach(button => {
      button.addEventListener("click", () => {
        const type = button.dataset.type;

        if (!Object.prototype.hasOwnProperty.call(COST, type)) {
          showToast("نوع البناء غير متاح.");
          return;
        }

        selectedType = type;

        document.querySelectorAll(".build-btn").forEach(item => {
          item.classList.toggle("active", item === button);
          item.setAttribute(
            "aria-pressed",
            item === button ? "true" : "false"
          );
        });

        showToast(
          `${INFO[type].label} — ${COST[type].toLocaleString("en-US")} 💰`
        );

        previewGroup.visible = false;
      });
    });

    const cancel = $("cancelBuild");

    if (cancel) {
      cancel.addEventListener("click", () => {
        selectedType = null;
        previewGroup.visible = false;

        document.querySelectorAll(".build-btn").forEach(button => {
          button.classList.remove("active");
          button.setAttribute("aria-pressed", "false");
        });

        showToast("تم إلغاء البناء.");
      });
    }

    const cameraButton = $("cameraBtn");

    if (cameraButton) {
      cameraButton.addEventListener("click", () => {
        cameraAngle += Math.PI / 4;
        updateCamera();
        saveGame();
      });
    }

    const zoomIn = $("zoomInBtn");

    if (zoomIn) {
      zoomIn.addEventListener("click", () => {
        cameraDistance = Math.max(13, cameraDistance - 3);
        updateCamera();
        saveGame();
      });
    }

    const zoomOut = $("zoomOutBtn");

    if (zoomOut) {
      zoomOut.addEventListener("click", () => {
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

  // ============================================
  // TOUCH AND POINTER HANDLING
  // ============================================

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
        pointerStart.height + dy * 0.035,
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

  // ============================================
  // CAMERA
  // ============================================

  function updateCamera() {
    if (!camera) return;

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

  // ============================================
  // GAME LOOP
  // ============================================

  function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();

    // دخل المتاجر والأبراج كل عشر ثوانٍ.
    if (now - lastIncomeTime >= 10000) {
      const intervals = Math.floor(
        (now - lastIncomeTime) / 10000
      );

      if (income > 0) {
        const earned = income * intervals;

        money += earned;
        updateHUD();

        showToast(
          `دخل المدينة: +${earned.toLocaleString("en-US")} 💰`
        );
      }

      lastIncomeTime += intervals * 10000;
    }

    const delta = Math.min(
      0.05,
      (now - (animate.lastTime || now)) / 1000
    );

    animate.lastTime = now;

    // حركة السيارات على الطريق الرئيسي.
    for (const car of cars) {
      car.position.x += car.userData.speed * delta;

      if (car.position.x > 12) {
        car.position.x = -12;
      }
    }

    // حفظ احتياطي دوري.
    if (now - lastSaveTime > 15000) {
      saveGame();
    }

    renderer.render(scene, camera);
  }

  // ============================================
  // START
  // ============================================

  try {
    createWorld();
  } catch (error) {
    console.error("M11 CITY BUILDER:", error);

    if (loading) {
      loading.classList.remove("hidden");

      loading.innerHTML = `
        <h2>تعذر تشغيل اللعبة</h2>
        <p>أعد تحميل الصفحة. إذا استمر الخطأ، أرسل رسالة الخطأ للمطور.</p>
      `;
    }
  }

})();
