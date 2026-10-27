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
// ======================================================
// M11 CITY BUILDER — EXPANSION PACK
// Categories + New Buildings + Upgrades + City Expansion
// Developer: M11 Development
// ======================================================

(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  // نتأكد أن أساسيات اللعبة موجودة.
  if (
    typeof THREE === "undefined" ||
    typeof cityGroup === "undefined" ||
    typeof objects === "undefined"
  ) {
    console.warn("M11 Expansion: game systems are not ready.");
    return;
  }

  // ------------------------------------------------------
  // 1. بيانات المباني الجديدة
  // ------------------------------------------------------

  const EXTRA_BUILDINGS = {
    cafe: {
      label: "مقهى",
      icon: "☕",
      category: "commerce",
      cost: 1200,
      population: 3,
      income: 80,
      color: "#bc8060",
      height: 1.7
    },

    supermarket: {
      label: "سوبر ماركت",
      icon: "🛒",
      category: "commerce",
      cost: 2500,
      population: 8,
      income: 160,
      color: "#75b9a0",
      height: 2.1
    },

    bank: {
      label: "بنك",
      icon: "🏦",
      category: "commerce",
      cost: 6500,
      population: 0,
      income: 450,
      color: "#d8bd75",
      height: 3.2
    },

    factory: {
      label: "مصنع",
      icon: "🏭",
      category: "commerce",
      cost: 8000,
      population: 10,
      income: 220,
      color: "#a5abb4",
      height: 2.7
    },

    office: {
      label: "مكاتب",
      icon: "🏢",
      category: "commerce",
      cost: 7000,
      population: 30,
      income: 300,
      color: "#81a8c8",
      height: 4.5
    },

    hotel: {
      label: "فندق",
      icon: "🏨",
      category: "residential",
      cost: 9000,
      population: 12,
      income: 280,
      color: "#d8a6bd",
      height: 4
    },

    school: {
      label: "مدرسة",
      icon: "🏫",
      category: "education",
      cost: 4500,
      population: 0,
      income: 0,
      color: "#e7c76f",
      height: 2.2
    },

    university: {
      label: "جامعة",
      icon: "🎓",
      category: "education",
      cost: 15000,
      population: 0,
      income: 0,
      color: "#b9a2d9",
      height: 4.3
    },

    library: {
      label: "مكتبة",
      icon: "📚",
      category: "education",
      cost: 3000,
      population: 0,
      income: 0,
      color: "#c69a73",
      height: 1.8
    },

    hospital: {
      label: "مستشفى",
      icon: "🏥",
      category: "services",
      cost: 10000,
      population: 0,
      income: 0,
      color: "#f0eee7",
      height: 3.2
    },

    police: {
      label: "مركز شرطة",
      icon: "🚔",
      category: "services",
      cost: 6000,
      population: 0,
      income: 0,
      color: "#6284b6",
      height: 2.1
    },

    firestation: {
      label: "مركز إطفاء",
      icon: "🚒",
      category: "services",
      cost: 5500,
      population: 0,
      income: 0,
      color: "#d95749",
      height: 2.1
    },

    cinema: {
      label: "سينما",
      icon: "🎬",
      category: "fun",
      cost: 7000,
      population: 8,
      income: 180,
      color: "#a98ac8",
      height: 2.8
    },

    stadium: {
      label: "استاد رياضي",
      icon: "🏟️",
      category: "fun",
      cost: 25000,
      population: 20,
      income: 350,
      color: "#83b58c",
      height: 3.5
    },

    fountain: {
      label: "نافورة",
      icon: "⛲",
      category: "fun",
      cost: 1800,
      population: 0,
      income: 0,
      color: "#68c8e0",
      height: 0.8
    },

    solar: {
      label: "طاقة شمسية",
      icon: "☀️",
      category: "services",
      cost: 5000,
      population: 0,
      income: 90,
      color: "#e3ca62",
      height: 0.7
    }
  };

  for (const [type, data] of Object.entries(EXTRA_BUILDINGS)) {
    COST[type] = data.cost;

    INFO[type] = {
      label: data.label,
      population: data.population,
      income: data.income
    };
  }

  // ------------------------------------------------------
  // 2. إنشاء أشكال ثلاثية الأبعاد للمباني الجديدة
  // ------------------------------------------------------

  const originalCreateBuilding = createBuilding;

  function createSpecialBuilding(type, x, z) {
    const data = EXTRA_BUILDINGS[type];

    if (!data) return null;

    const g = new THREE.Group();

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.72
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: "#a9e5f3",
      roughness: 0.2,
      metalness: 0.12,
      emissive: "#153b4a",
      emissiveIntensity: 0.1
    });

    function addBox(w, h, d, mat, px, py, pz) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        mat
      );

      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      g.add(mesh);
      return mesh;
    }

    const height = data.height;

    // قاعدة المبنى.
    addBox(
      1.8, 0.12, 1.8,
      new THREE.MeshStandardMaterial({ color: "#d1d0c7" }),
      0, 0.06, 0
    );

    // الجسم الأساسي.
    addBox(
      1.45,
      height,
      1.45,
      wallMaterial,
      0,
      0.12 + height / 2,
      0
    );

    // النوافذ.
    const floors = Math.max(1, Math.floor(height / 0.55));

    for (let floor = 0; floor < floors; floor++) {
      const y = 0.35 + floor * 0.48;

      if (y > height) continue;

      for (const side of [-1, 1]) {
        addBox(
          0.32,
          0.25,
          0.035,
          glassMaterial,
          side * 0.39,
          y,
          0.745
        );
      }
    }

    // السقف.
    addBox(
      1.55,
      0.12,
      1.55,
      new THREE.MeshStandardMaterial({ color: "#606d7b" }),
      0,
      height + 0.17,
      0
    );

    // واجهة مميزة لبعض المباني.
    if (["school", "hospital", "university"].includes(type)) {
      addBox(
        0.5,
        0.45,
        0.06,
        glassMaterial,
        0,
        0.48,
        0.76
      );
    }

    // ألواح الطاقة الشمسية.
    if (type === "solar") {
      for (let i = -1; i <= 1; i++) {
        addBox(
          0.42,
          0.045,
          0.5,
          new THREE.MeshStandardMaterial({
            color: "#244d80",
            metalness: 0.35,
            roughness: 0.3
          }),
          i * 0.48,
          0.9,
          0
        );
      }
    }

    // النافورة.
    if (type === "fountain") {
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.48, 0.12, 16),
        new THREE.MeshStandardMaterial({
          color: "#5fcce9",
          metalness: 0.35,
          roughness: 0.18
        })
      );

      water.position.y = 0.35;
      g.add(water);
    }

    g.position.set(x, 0, z);
    cityGroup.add(g);

    return g;
  }

  createBuilding = function(type, x, z) {
    if (EXTRA_BUILDINGS[type]) {
      return createSpecialBuilding(type, x, z);
    }

    return originalCreateBuilding(type, x, z);
  };

  // ------------------------------------------------------
  // 3. أقسام البناء
  // ------------------------------------------------------

  const CATEGORIES = [
    {
      id: "all",
      label: "الكل",
      icon: "🏙️"
    },
    {
      id: "residential",
      label: "السكن",
      icon: "🏠"
    },
    {
      id: "commerce",
      label: "التجارة والاقتصاد",
      icon: "💼"
    },
    {
      id: "education",
      label: "التعليم",
      icon: "🎓"
    },
    {
      id: "services",
      label: "الخدمات",
      icon: "🏥"
    },
    {
      id: "fun",
      label: "الترفيه",
      icon: "🎡"
    },
    {
      id: "roads",
      label: "الطرق والتجميل",
      icon: "🛣️"
    }
  ];

  const BUILDING_CATEGORY = {
    house: "residential",
    apartment: "residential",
    tower: "residential",
    hotel: "residential",

    shop: "commerce",
    cafe: "commerce",
    supermarket: "commerce",
    bank: "commerce",
    factory: "commerce",
    office: "commerce",

    school: "education",
    university: "education",
    library: "education",

    hospital: "services",
    police: "services",
    firestation: "services",
    solar: "services",

    park: "fun",
    cinema: "fun",
    stadium: "fun",
    fountain: "fun",

    road: "roads",
    tree: "roads",
    traffic: "roads"
  };

  function addStyle() {
    if ($("m11-expansion-style")) return;

    const style = document.createElement("style");
    style.id = "m11-expansion-style";

    style.textContent = `
      #m11-city-categories {
        direction: rtl;
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        padding: 10px;
        margin: 8px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 16px;
        background: rgba(14,24,39,.94);
        backdrop-filter: blur(14px);
        max-height: 150px;
        overflow-y: auto;
      }

      #m11-city-categories button {
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 10px;
        padding: 9px 12px;
        background: #263449;
        color: #fff;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }

      #m11-city-categories button.active {
        background: #d8b66a;
        color: #182333;
        border-color: #f4d994;
      }

      .build-btn.m11-hidden {
        display: none !important;
      }

      #m11-city-actions {
        position: fixed;
        z-index: 30;
        left: 12px;
        top: 105px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 185px;
        direction: rtl;
      }

      .m11-city-action {
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 12px;
        padding: 11px 13px;
        color: #fff;
        background: rgba(18,29,46,.94);
        box-shadow: 0 6px 20px #0003;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .m11-city-action.active {
        background: #b98a3e;
        color: #111c29;
      }

      #m11-city-level {
        color: #fff;
        background: rgba(18,29,46,.94);
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
      }

      @media (max-width: 650px) {
        #m11-city-actions {
          top: 100px;
          left: 7px;
          max-width: 150px;
        }

        .m11-city-action {
          padding: 9px 10px;
          font-size: 11px;
        }

        #m11-city-categories {
          gap: 5px;
          padding: 7px;
          margin: 5px;
          max-height: 120px;
        }

        #m11-city-categories button {
          padding: 8px;
          font-size: 11px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function setupCategories() {
    const firstButton = document.querySelector(".build-btn");

    if (!firstButton || !firstButton.parentElement) return;

    const container = firstButton.parentElement;

    // إضافة أزرار المباني الجديدة.
    for (const [type, data] of Object.entries(EXTRA_BUILDINGS)) {
      if (document.querySelector(
        '.build-btn[data-type="' + type + '"]'
      )) continue;

      const button = document.createElement("button");

      button.type = "button";
      button.className = "build-btn";
      button.dataset.type = type;
      button.title = data.label + " — " + data.cost + " 💰";
      button.setAttribute("aria-pressed", "false");

      const icon = document.createElement("span");
      icon.className = "building-icon";
      icon.textContent = data.icon;

      const label = document.createElement("span");
      label.className = "building-name";
      label.textContent = data.label;

      const price = document.createElement("small");
      price.textContent = data.cost.toLocaleString("en-US") + " 💰";

      button.append(icon, label, price);
      container.appendChild(button);

      // نفس نظام اختيار المباني الموجود في اللعبة.
      button.addEventListener("click", () => {
        selectedType = type;

        document.querySelectorAll(".build-btn").forEach(other => {
          const active = other === button;

          other.classList.toggle("active", active);
          other.setAttribute("aria-pressed", String(active));
        });

        upgradeMode = false;
        $("m11-upgrade-btn")?.classList.remove("active");

        showToast(data.label + " — اختر مكان البناء.");
      });
    }

    // إنشاء قائمة الأقسام.
    if (!$("m11-city-categories")) {
      const panel = document.createElement("div");
      panel.id = "m11-city-categories";

      CATEGORIES.forEach(category => {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = category.icon + " " + category.label;
        button.dataset.category = category.id;

        if (category.id === "all") button.classList.add("active");

        button.addEventListener("click", () => {
          panel.querySelectorAll("button").forEach(b => {
            b.classList.toggle("active", b === button);
          });

          document.querySelectorAll(".build-btn").forEach(buildButton => {
            const type = buildButton.dataset.type;
            const typeCategory = BUILDING_CATEGORY[type] || "roads";

            buildButton.classList.toggle(
              "m11-hidden",
              category.id !== "all" && typeCategory !== category.id
            );
          });
        });

        panel.appendChild(button);
      });

      container.parentElement.insertBefore(panel, container);
    }
  }

  // ------------------------------------------------------
  // 4. تطوير المباني
  // ------------------------------------------------------

  const UPGRADE_KEY = "M11_CITY_UPGRADES_V1";

  let upgradeLevels = {};

  try {
    upgradeLevels = JSON.parse(
      localStorage.getItem(UPGRADE_KEY) || "{}"
    );

    if (!upgradeLevels || typeof upgradeLevels !== "object") {
      upgradeLevels = {};
    }
  } catch (_) {
    upgradeLevels = {};
  }

  let upgradeMode = false;

  function getLevel(item) {
    return Math.max(1, Number(upgradeLevels[item.key]) || 1);
  }

  function saveUpgradeLevels() {
    try {
      localStorage.setItem(
        UPGRADE_KEY,
        JSON.stringify(upgradeLevels)
      );
    } catch (error) {
      console.warn("تعذر حفظ الترقيات:", error);
    }
  }

  function applyVisualLevel(item) {
    if (!item || !item.object) return;

    const level = getLevel(item);

    // تكبير المبنى تدريجيًا مع كل مستوى.
    const scale = Math.min(1 + (level - 1) * 0.09, 1.65);

    item.object.scale.setScalar(scale);
  }

  function restoreUpgradeLevels() {
    for (const item of objects) {
      const level = getLevel(item);

      if (level <= 1) continue;

      // إحصاءات المستوى الأول محسوبة بالفعل عند تحميل المدينة.
      const info = INFO[item.type];

      if (info) {
        population += info.population * (level - 1);
        income += info.income * (level - 1);
      }

      applyVisualLevel(item);
    }

    updateHUD();
  }

  function upgradeBuildingAt(x, z) {
    const key = cellKey(snap(x), snap(z));
    const item = objects.find(obj => obj.key === key);

    if (!item || item.starter) {
      showToast("اختار مبنى موجودًا لترقيته.");
      return;
    }

    const oldLevel = getLevel(item);
    const price = Math.round(1500 * Math.pow(oldLevel, 1.65));

    if (money < price) {
      showToast(
        "تحتاج إلى " + price.toLocaleString("en-US") + " 💰 للترقية."
      );
      return;
    }

    money -= price;

    const info = INFO[item.type];

    if (info) {
      population += info.population;
      income += info.income;
    }

    upgradeLevels[item.key] = oldLevel + 1;

    applyVisualLevel(item);
    saveUpgradeLevels();
    saveGame();
    updateHUD();

    showToast(
      "تم تطوير المبنى إلى المستوى " +
      (oldLevel + 1) +
      " 🏗️"
    );
  }

  const originalHandleWorldTap = handleWorldTap;

  handleWorldTap = function(clientX, clientY) {
    if (!upgradeMode) {
      return originalHandleWorldTap(clientX, clientY);
    }

    const point = getGroundPoint(clientX, clientY);

    if (point) {
      upgradeBuildingAt(point.x, point.z);
    }
  };

  // ------------------------------------------------------
  // 5. توسيع مساحة المدينة
  // ------------------------------------------------------

  const EXPANSION_KEY = "M11_CITY_EXPANSION_V1";

  let citySize = 24;
  const MAX_CITY_SIZE = 60;
  const EXPANSION_STEP = 12;

  try {
    const savedSize = Number(localStorage.getItem(EXPANSION_KEY));

    if (savedSize >= 24 && savedSize <= MAX_CITY_SIZE) {
      citySize = savedSize;
    }
  } catch (_) {}

  // نوسّع حدود البناء دون تغيير مواقع المباني الموجودة.
  isInside = function(x, z) {
    return Math.abs(x) < citySize / 2 &&
           Math.abs(z) < citySize / 2;
  };

  function updateLandVisuals() {
    if (ground) {
      const scale = citySize / 24;
      ground.scale.set(scale, 1, scale);
    }

    // توسيع شبكة الأرض.
    if (cityGroup) {
      cityGroup.children.forEach(child => {
        if (child.type === "GridHelper") {
          const scale = citySize / 24;
          child.scale.set(scale, 1, scale);
        }
      });
    }

    // حدود الأرض الخارجية الجديدة.
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: "#47734c",
      roughness: 0.9
    });

    const half = citySize / 2;

    for (const i of [-1, 1]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(citySize, 0.25, 0.2),
        borderMaterial
      );

      edge.position.set(0, 0.13, i * half);
      cityGroup.add(edge);

      const side = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.25, citySize),
        borderMaterial
      );

      side.position.set(i * half, 0.13, 0);
      cityGroup.add(side);
    }
  }

  function expandCity() {
    if (citySize >= MAX_CITY_SIZE) {
      showToast("وصلت إلى أكبر مساحة متاحة للمدينة! 🌍");
      return;
    }

    const nextSize = Math.min(
      citySize + EXPANSION_STEP,
      MAX_CITY_SIZE
    );

    const price = Math.round(
      50000 * Math.pow((nextSize - 24) / 12, 1.4)
    );

    if (money < price) {
      showToast(
        "تحتاج إلى " + price.toLocaleString("en-US") +
        " 💰 لتوسيع المدينة."
      );
      return;
    }

    money -= price;
    citySize = nextSize;

    try {
      localStorage.setItem(EXPANSION_KEY, String(citySize));
    } catch (_) {}

    updateLandVisuals();
    updateHUD();
    saveGame();

    showToast(
      "مبروك! مساحة مدينتك أصبحت " +
      citySize + " × " + citySize + " 🏙️"
    );

    const levelLabel = $("m11-city-level");

    if (levelLabel) {
      levelLabel.textContent = "مساحة المدينة: " + citySize + " × " + citySize;
    }
  }

  // ------------------------------------------------------
  // 6. أزرار التطوير والتوسعة
  // ------------------------------------------------------

  function createCityActions() {
    if ($("m11-city-actions")) return;

    const actions = document.createElement("div");
    actions.id = "m11-city-actions";

    const upgradeButton = document.createElement("button");
    upgradeButton.id = "m11-upgrade-btn";
    upgradeButton.className = "m11-city-action";
    upgradeButton.textContent = "⬆️ تطوير مبنى";

    upgradeButton.addEventListener("click", () => {
      upgradeMode = !upgradeMode;

      if (upgradeMode) {
        selectedType = null;

        document.querySelectorAll(".build-btn").forEach(button => {
          button.classList.remove("active");
          button.setAttribute("aria-pressed", "false");
        });

        showToast("اضغط على المبنى الذي تريد تطويره.");
      } else {
        showToast("تم إلغاء وضع التطوير.");
      }

      upgradeButton.classList.toggle("active", upgradeMode);
    });

    const expandButton = document.createElement("button");
    expandButton.id = "m11-expand-btn";
    expandButton.className = "m11-city-action";
    expandButton.textContent = "🌍 توسيع المدينة";

    expandButton.addEventListener("click", expandCity);

    const levelLabel = document.createElement("div");
    levelLabel.id = "m11-city-level";
    levelLabel.textContent =
      "مساحة المدينة: " + citySize + " × " + citySize;

    actions.append(upgradeButton, expandButton, levelLabel);
    document.body.appendChild(actions);
  }

  // ------------------------------------------------------
  // 7. تشغيل الإضافات
  // ------------------------------------------------------

  addStyle();
  setupCategories();
  createCityActions();

  // تطبيق حجم الترقيات المحفوظة.
  restoreUpgradeLevels();

  // إعادة رسم الأرض إذا كانت المدينة موسعة من قبل.
  updateLandVisuals();

  console.log("M11 CITY BUILDER Expansion Pack loaded.");
})();
})();
