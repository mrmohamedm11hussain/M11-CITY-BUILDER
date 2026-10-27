import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const SAVE_KEY = "M11_CITY_BUILDER_SAVE_V2";

  const loading = $("loading");
  const hud = $("hud");
  const moneyLabel = $("money");
  const populationLabel = $("population");
  const buildingsLabel = $("buildings");
  const incomeLabel = $("income");
  const toast = $("toast");

  const COST = { house: 500, shop: 900, road: 100, tree: 150 };
  const INFO = {
    house: { population: 4, income: 0 },
    shop: { population: 2, income: 45 },
    road: { population: 0, income: 0 },
    tree: { population: 0, income: 0 }
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

  const SIZE = 24;
  const HALF = SIZE / 2;
  const CELL = 2;

  const occupied = new Set();
  const objects = [];
  const cars = [];
  const pointers = new Map();

  let pointerStart = null;
  let pointerMoved = false;
  let previousPinchDistance = null;

  const material = (color, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color, roughness });

  const mats = {
    grass: material("#85b96a"),
    road: material("#414b56"),
    line: material("#f7d66b"),
    trunk: material("#79513a"),
    leaf: material("#328b57"),
    leaf2: material("#5ab86d"),
    glass: new THREE.MeshStandardMaterial({
      color: "#8fd3e8",
      roughness: 0.25,
      metalness: 0.1
    })
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function updateHUD() {
    moneyLabel.textContent = money.toLocaleString("en-US");
    populationLabel.textContent = population.toLocaleString("en-US");
    buildingsLabel.textContent = buildingCount.toLocaleString("en-US");
    incomeLabel.textContent = income.toLocaleString("en-US");
  }

  function box(parent, w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function makeGroup() {
    return new THREE.Group();
  }

  function createWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#b8dcd7");
    scene.fog = new THREE.Fog("#b8dcd7", 40, 95);

    camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 150
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

    // الظلال: تحسين شكل المباني مع مراعاة أداء الهاتف
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    $("game").prepend(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#f3fff7", "#61764d", 2.1));

    const sun = new THREE.DirectionalLight("#fff3d4", 2.5);
    sun.position.set(12, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    cityGroup = new THREE.Group();
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
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveGame();
    });
    window.addEventListener("pagehide", saveGame);

    const restored = loadGame();

    loading.classList.add("hidden");
    hud.classList.remove("hidden");
    updateHUD();

    showToast(
      restored ? "رجعت مدينتك المحفوظة! 🏙️" : "أهلًا بك في M11 CITY BUILDER!"
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
      SIZE, SIZE / CELL, "#d7e8b8", "#d7e8b8"
    );

    grid.position.y = -0.045;
    grid.material.transparent = true;
    grid.material.opacity = 0.34;
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

  function cellKey(x, z) {
    return `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
  }

  function snap(value) {
    return Math.round(value / CELL) * CELL;
  }

  function createRoad(x, z, horizontal = true) {
    const group = makeGroup();
    const width = 1.7;
    const length = CELL;

    box(
      group,
      horizontal ? length : width,
      0.08,
      horizontal ? width : length,
      mats.road, 0, 0, 0
    );

    if (horizontal) {
      box(group, length * 0.65, 0.015, 0.055, mats.line, 0, 0.05, 0);
    } else {
      box(group, 0.055, 0.015, length * 0.65, mats.line, 0, 0.05, 0);
    }

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createStartingRoads() {
    for (let x = -10; x <= 10; x += CELL) {
      createRoad(x, 0, true);
      occupied.add(cellKey(x, 0));
    }
  }

  // منزل مطوّر بواجهة ونوافذ ومدخنة ومظلة وسياج
  function createHouse(x, z) {
    const group = makeGroup();

    const colors = [
      "#f3c98b", "#e9a99a", "#e8dfc7",
      "#b8dcd0", "#d6b7e8", "#f0d59b", "#c5d7eb"
    ];

    const wall = material(colors[Math.floor(Math.random() * colors.length)]);
    const roof = material("#a94e3e");
    const roofDark = material("#813b32");
    const door = material("#674431");
    const frame = material("#f4ead7");

    const windowGlass = new THREE.MeshStandardMaterial({
      color: "#83d7ef",
      roughness: 0.2,
      metalness: 0.12,
      emissive: "#174454",
      emissiveIntensity: 0.12
    });

    box(group, 1.45, 1.45, 1.45, wall, 0, 0.78, 0);
    box(group, 1.58, 0.12, 1.58, material("#d9d0bc"), 0, 0.08, 0);
    box(group, 1.62, 0.2, 1.62, roof, 0, 1.58, 0);
    box(group, 1.7, 0.07, 1.7, roofDark, 0, 1.48, 0);

    box(group, 0.34, 0.72, 0.075, door, 0, 0.43, 0.76);
    box(group, 0.045, 0.045, 0.025, material("#e8c56b"), 0.1, 0.45, 0.81);

    for (const wx of [-0.46, 0.46]) {
      box(group, 0.39, 0.42, 0.055, frame, wx, 0.98, 0.755);
      box(group, 0.31, 0.34, 0.035, windowGlass, wx, 0.98, 0.79);
      box(group, 0.035, 0.34, 0.02, frame, wx, 0.98, 0.815);
      box(group, 0.46, 0.055, 0.11, frame, wx, 0.75, 0.79);
    }

    for (const side of [-1, 1]) {
      box(group, 0.055, 0.36, 0.34, frame, side * 0.755, 0.98, -0.05);
      box(group, 0.035, 0.28, 0.26, windowGlass, side * 0.79, 0.98, -0.05);
    }

    box(group, 0.25, 0.48, 0.25, roofDark, 0.42, 1.85, -0.38);
    box(group, 0.7, 0.09, 0.35, roof, 0, 0.92, 0.93);
    box(group, 0.65, 0.08, 0.25, material("#c9c5b9"), 0, 0.08, 1.0);

    const fenceMat = material("#eee5d5");
    for (let i = 0; i < 4; i++) {
      box(group, 0.07, 0.36, 0.07, fenceMat, -0.8, 0.2, -0.65 + i * 0.35);
    }
    box(group, 0.07, 0.07, 1.15, fenceMat, -0.8, 0.35, -0.12);

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  // متجر مطوّر بواجهة زجاجية ومظلة ولافتة
  function createShop(x, z) {
    const group = makeGroup();

    const wall = material("#f1d6a1");
    const sign = material("#e85c48");
    const awning = material("#f4f0e4");
    const dark = material("#59463a");

    const glass = new THREE.MeshStandardMaterial({
      color: "#75d5ed",
      roughness: 0.18,
      metalness: 0.12
    });

    box(group, 1.55, 1.45, 1.48, wall, 0, 0.77, 0);
    box(group, 1.68, 0.12, 1.6, material("#cfc8b6"), 0, 0.08, 0);
    box(group, 1.7, 0.16, 1.62, material("#8b5145"), 0, 1.55, 0);
    box(group, 1.5, 0.27, 0.09, sign, 0, 1.31, 0.78);

    box(group, 1.18, 0.64, 0.06, dark, 0, 0.79, 0.77);
    box(group, 1.08, 0.53, 0.035, glass, 0, 0.81, 0.81);

    box(group, 0.06, 0.72, 0.09, awning, -0.62, 0.8, 0.78);
    box(group, 0.06, 0.72, 0.09, awning, 0.62, 0.8, 0.78);
    box(group, 1.28, 0.07, 0.09, awning, 0, 1.16, 0.78);

    box(group, 0.28, 0.66, 0.07, dark, -0.48, 0.42, 0.78);
    box(group, 0.04, 0.04, 0.025, material("#f3cb6d"), -0.55, 0.42, 0.82);

    box(group, 1.75, 0.1, 0.38, sign, 0, 1.17, 0.96);
    box(group, 0.07, 0.58, 0.07, awning, -0.78, 0.88, 1.08);
    box(group, 0.07, 0.58, 0.07, awning, 0.78, 0.88, 1.08);

    for (const lx of [-0.48, 0.48]) {
      box(group, 0.12, 0.06, 0.1, material("#ffdc83"), lx, 1.12, 0.85);
    }

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createTree(x, z) {
    const group = makeGroup();

    box(group, 0.25, 0.9, 0.25, mats.trunk, 0, 0.45, 0);

    const lower = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.2, 7), mats.leaf);
    lower.position.y = 1.25;
    lower.castShadow = true;
    group.add(lower);

    const upper = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 7), mats.leaf2);
    upper.position.y = 1.75;
    upper.castShadow = true;
    group.add(upper);

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createDecorations() {
    for (let i = 0; i < 16; i++) {
      const x = (Math.random() - 0.5) * (SIZE - 4);
      const z = (Math.random() - 0.5) * (SIZE - 4);

      if (Math.abs(z) < 2.5) continue;

      const group = makeGroup();
      box(group, 0.15, 0.6, 0.15, mats.trunk, 0, 0.3, 0);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mats.leaf);
      crown.position.y = 0.9;
      crown.castShadow = true;
      group.add(crown);

      group.position.set(x, 0, z);
      cityGroup.add(group);
    }
  }

  function createCars() {
    const colors = ["#e85c4a", "#e9cf58", "#4d94e8", "#f4f4ef"];

    for (let i = 0; i < 4; i++) {
      const car = makeGroup();
      const carMat = material(colors[i]);
      const tireMat = material("#242a30");

      box(car, 1.0, 0.35, 0.65, carMat, 0, 0.25, 0);
      box(car, 0.5, 0.3, 0.52, mats.glass, 0, 0.55, 0);

      for (const wx of [-0.32, 0.32]) {
        for (const wz of [-0.28, 0.28]) {
          const tire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.13, 0.09, 10),
            tireMat
          );
          tire.rotation.z = Math.PI / 2;
          tire.position.set(wx, 0.13, wz);
          tire.castShadow = true;
          car.add(tire);
        }
      }

      const lightMat = new THREE.MeshBasicMaterial({ color: "#fff0b2" });
      box(car, 0.13, 0.1, 0.06, lightMat, -0.38, 0.28, 0.34);
      box(car, 0.13, 0.1, 0.06, lightMat, 0.38, 0.28, 0.34);

      car.position.set(-10 + i * 5, 0.08, 0);
      car.userData.speed = 1.0 + Math.random() * 1.3;

      cityGroup.add(car);
      cars.push(car);
    }
  }

  function createPreview() {
    previewGroup = makeGroup();

    const ghostMat = new THREE.MeshBasicMaterial({
      color: "#5df5a5",
      transparent: true,
      opacity: 0.48,
      depthWrite: false
    });

    previewFootprint = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.06, 1.8),
      ghostMat
    );

    previewFootprint.position.y = 0.04;
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

    previewGroup.position.set(x, 0, z);
    previewGroup.visible = true;

    const key = cellKey(x, z);
    const valid =
      Math.abs(x) < HALF &&
      Math.abs(z) < HALF &&
      !occupied.has(key) &&
      money >= COST[selectedType];

    previewFootprint.material.color.set(valid ? "#5df5a5" : "#ff5555");
    previewFootprint.scale.set(
      selectedType === "road" ? 1.1 : 1,
      1,
      selectedType === "road" ? 0.85 : 1
    );
  }

  function placeBuilding(type, x, z) {
    const gx = snap(x);
    const gz = snap(z);

    if (Math.abs(gx) >= HALF || Math.abs(gz) >= HALF) {
      showToast("اختار مكانًا داخل حدود المدينة.");
      return;
    }

    const key = cellKey(gx, gz);

    if (occupied.has(key)) {
      showToast("المكان ده مشغول! اختار مكانًا تانيًا.");
      return;
    }

    if (money < COST[type]) {
      showToast("فلوسك مش كفاية للبناء ده.");
      return;
    }

    let object;

    switch (type) {
      case "house": object = createHouse(gx, gz); break;
      case "shop": object = createShop(gx, gz); break;
      case "road": object = createRoad(gx, gz, true); break;
      case "tree": object = createTree(gx, gz); break;
    }

    if (!object) return;

    occupied.add(key);
    objects.push({ type, object, key, x: gx, z: gz });

    money -= COST[type];
    population += INFO[type].population;
    income += INFO[type].income;

    if (type === "house" || type === "shop") buildingCount++;

    updateHUD();
    saveGame();
    showToast("تم البناء بنجاح! 🏗️");
  }

  function saveGame() {
    try {
      const data = {
        version: 2,
        money,
        cameraAngle,
        cameraDistance,
        objects: objects.map(item => ({
          type: item.type, x: item.x, z: item.z
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

      if (!data || data.version !== 2 || !Array.isArray(data.objects)) {
        return false;
      }
    } catch (error) {
      console.warn("ملف الحفظ غير صالح:", error);
      return false;
    }

    if (Number.isFinite(data.money)) money = Math.max(0, data.money);
    if (Number.isFinite(data.cameraAngle)) cameraAngle = data.cameraAngle;

    if (Number.isFinite(data.cameraDistance)) {
      cameraDistance = THREE.MathUtils.clamp(data.cameraDistance, 13, 42);
    }

    for (const item of data.objects) {
      if (
        !item ||
        !Object.prototype.hasOwnProperty.call(COST, item.type) ||
        !Number.isFinite(item.x) ||
        !Number.isFinite(item.z)
      ) continue;

      const x = snap(item.x);
      const z = snap(item.z);
      const key = cellKey(x, z);

      if (Math.abs(x) >= HALF || Math.abs(z) >= HALF || occupied.has(key)) {
        continue;
      }

      let object;

      if (item.type === "house") object = createHouse(x, z);
      if (item.type === "shop") object = createShop(x, z);
      if (item.type === "road") object = createRoad(x, z, true);
      if (item.type === "tree") object = createTree(x, z);

      if (!object) continue;

      occupied.add(key);
      objects.push({ type: item.type, object, key, x, z });

      population += INFO[item.type].population;
      income += INFO[item.type].income;

      if (item.type === "house" || item.type === "shop") buildingCount++;
    }

    updateCamera();
    return true;
  }

  function connectControls() {
    document.querySelectorAll(".build-btn").forEach(button => {
      button.addEventListener("click", () => {
        selectedType = button.dataset.type;

        document.querySelectorAll(".build-btn").forEach(b => {
          b.classList.toggle("active", b === button);
        });

        showToast("اختار مكانًا فاضيًا على الأرض للبناء.");
        previewGroup.visible = false;
      });
    });

    $("cancelBuild").addEventListener("click", () => {
      selectedType = null;
      previewGroup.visible = false;

      document.querySelectorAll(".build-btn").forEach(button => {
        button.classList.remove("active");
      });

      showToast("تم إلغاء اختيار البناء.");
    });

    $("cameraBtn").addEventListener("click", () => {
      cameraAngle += Math.PI / 4;
      updateCamera();
      saveGame();
    });

    $("zoomInBtn").addEventListener("click", () => {
      cameraDistance = Math.max(13, cameraDistance - 3);
      updateCamera();
      saveGame();
    });

    $("zoomOutBtn").addEventListener("click", () => {
      cameraDistance = Math.min(42, cameraDistance + 3);
      updateCamera();
      saveGame();
    });

    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);

    renderer.domElement.addEventListener("wheel", event => {
      event.preventDefault();

      cameraDistance = THREE.MathUtils.clamp(
        cameraDistance + event.deltaY * 0.025, 13, 42
      );

      updateCamera();
    }, { passive: false });

    renderer.domElement.addEventListener("contextmenu", event => {
      event.preventDefault();
    });
  }

  function onPointerDown(event) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    try {
      renderer.domElement.setPointerCapture(event.pointerId);
    } catch (_) {}

    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      angle: cameraAngle,
      distance: cameraDistance
    };

    pointerMoved = false;

    if (pointers.size === 2) previousPinchDistance = getPinchDistance();
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

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const distance = getPinchDistance();

      if (distance && previousPinchDistance) {
        cameraDistance = THREE.MathUtils.clamp(
          cameraDistance + (previousPinchDistance - distance) * 0.045,
          13, 42
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

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) pointerMoved = true;

    if (pointerMoved) {
      cameraAngle = pointerStart.angle + dx * 0.009;
      cameraHeight = THREE.MathUtils.clamp(20 + dy * 0.04, 13, 28);
      updateCamera();
    }

    if (selectedType) updatePreviewFromScreen(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    const start = pointerStart;
    pointers.delete(event.pointerId);

    if (pointers.size < 2) previousPinchDistance = null;

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
        distance: cameraDistance
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

  function updateCamera() {
    camera.position.set(
      Math.cos(cameraAngle) * cameraDistance,
      cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    camera.lookAt(0, 0, 0);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();

    // دخل المتاجر كل عشر ثوانٍ
    if (now - lastIncomeTime >= 10000) {
      const intervals = Math.floor((now - lastIncomeTime) / 10000);

      if (income > 0) {
        money += income * intervals;
        updateHUD();

        if (now - lastToastIncomeTime > 5000) {
          showToast(`دخل المدينة: +${income * intervals} 💰`);
          lastToastIncomeTime = now;
        }
      }

      lastIncomeTime += intervals * 10000;
    }

    // حركة السيارات
    const delta = 0.016;

    for (const car of cars) {
      car.position.x += car.userData.speed * delta;

      if (car.position.x > 12) car.position.x = -12;
    }

    // حفظ دوري احتياطي
    if (now - lastSaveTime > 15000) saveGame();

    renderer.render(scene, camera);
  }

  try {
    createWorld();
  } catch (error) {
    console.error("M11 CITY BUILDER:", error);

    loading.classList.remove("hidden");
    loading.innerHTML = `
      <h2>تعذر تشغيل اللعبة</h2>
      <p>تأكد من اتصال الإنترنت، ثم أعد تحميل الصفحة.</p>
    `;
  }
})(); 
