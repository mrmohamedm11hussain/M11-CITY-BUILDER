import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const loading = $("loading");
  const hud = $("hud");
  const moneyLabel = $("money");
  const populationLabel = $("population");
  const buildingsLabel = $("buildings");
  const incomeLabel = $("income");
  const toast = $("toast");

  const COST = {
    house: 500,
    shop: 900,
    road: 100,
    tree: 150
  };

  const BUILDING_INFO = {
    house: { emoji: "🏠", population: 4, income: 0 },
    shop: { emoji: "🏪", population: 2, income: 45 },
    road: { emoji: "🛣️", population: 0, income: 0 },
    tree: { emoji: "🌳", population: 0, income: 0 }
  };

  let money = 5000;
  let population = 0;
  let income = 0;
  let buildingCount = 0;
  let selectedType = null;
  let scene, camera, renderer, raycaster, ground;
  let cityGroup;
  let cameraAngle = Math.PI / 4;
  let cameraHeight = 20;
  let cameraDistance = 24;
  let lastIncomeTime = Date.now();
  let toastTimer;

  const occupied = new Set();
  const objects = [];
  const groundSize = 24;
  const cellSize = 2;
  const half = groundSize / 2;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateHUD() {
    moneyLabel.textContent = money.toLocaleString("en-US");
    populationLabel.textContent = population.toLocaleString("en-US");
    buildingsLabel.textContent = buildingCount.toLocaleString("en-US");
    incomeLabel.textContent = income.toLocaleString("en-US");
  }

  function material(color, roughness = 0.9) {
    return new THREE.MeshStandardMaterial({ color, roughness });
  }

  const mats = {
    grass: material("#85b96a"),
    grid: material("#a7d28b"),
    road: material("#414b56"),
    roadLine: material("#f7d66b"),
    sidewalk: material("#c9cfc5"),
    white: material("#f4f0e6"),
    glass: new THREE.MeshStandardMaterial({
      color: "#8fd3e8",
      roughness: 0.25,
      metalness: 0.1
    }),
    trunk: material("#79513a"),
    leaf: material("#328b57"),
    leaf2: material("#5ab86d")
  };

  function createBox(parent, w, h, d, mat, x, y, z) {
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

  function createWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#b8dcd7");
    scene.fog = new THREE.Fog("#b8dcd7", 35, 85);

    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      150
    );

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    $("game").prepend(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#f3fff7", "#61764d", 2.1));

    const sun = new THREE.DirectionalLight("#fff3d4", 2.5);
    sun.position.set(12, 25, 10);
    scene.add(sun);

    cityGroup = new THREE.Group();
    scene.add(cityGroup);

    createGround();
    createBoundary();
    createStartingRoads();
    createDecorations();
    createCars();

    raycaster = new THREE.Raycaster();

    updateCamera();
    connectControls();

    window.addEventListener("resize", onResize);

    loading.classList.add("hidden");
    hud.classList.remove("hidden");

    showToast("أهلًا بك في مدينتك! اختر مبنى وابدأ البناء.");
    updateHUD();

    animate();
  }

  function createGround() {
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      mats.grass
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    cityGroup.add(ground);

    const grid = new THREE.GridHelper(
      groundSize,
      groundSize / cellSize,
      "#d7e8b8",
      "#d7e8b8"
    );

    grid.position.y = -0.045;
    grid.material.transparent = true;
    grid.material.opacity = 0.34;
    cityGroup.add(grid);
  }

  function createBoundary() {
    const wallMat = material("#6f9c70");

    for (let i = -half; i <= half; i += cellSize) {
      createBox(cityGroup, 0.15, 0.4, 0.15, wallMat, i, 0.1, -half);
      createBox(cityGroup, 0.15, 0.4, 0.15, wallMat, i, 0.1, half);
      createBox(cityGroup, 0.15, 0.4, 0.15, wallMat, -half, 0.1, i);
      createBox(cityGroup, 0.15, 0.4, 0.15, wallMat, half, 0.1, i);
    }
  }

  function createRoad(x, z, horizontal = true) {
    const group = new THREE.Group();
    const width = 1.7;
    const length = cellSize;

    createBox(
      group,
      horizontal ? length : width,
      0.08,
      horizontal ? width : length,
      mats.road,
      0,
      0,
      0
    );

    if (horizontal) {
      createBox(
        group,
        length * 0.65,
        0.015,
        0.055,
        mats.roadLine,
        0,
        0.05,
        0
      );
    } else {
      createBox(
        group,
        0.055,
        0.015,
        length * 0.65,
        mats.roadLine,
        0,
        0.05,
        0
      );
    }

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createStartingRoads() {
    for (let x = -half + 1; x < half; x += cellSize) {
      createRoad(x, 0, true);
      occupied.add(`${Math.round(x / cellSize)},0`);
    }
  }

  function createHouse(x, z) {
    const group = new THREE.Group();

    const colors = ["#f1c27d", "#e8a99a", "#e8d9b5", "#b6d8cf"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const wall = material(color);
    const roof = material("#b65342");
    const door = material("#674b39");
    const windowMat = mats.glass;

    createBox(group, 1.35, 1.3, 1.35, wall, 0, 0.68, 0);
    createBox(group, 1.5, 0.22, 1.5, roof, 0, 1.43, 0);

    createBox(group, 0.32, 0.65, 0.07, door, 0, 0.34, 0.69);

    createBox(group, 0.3, 0.3, 0.07, windowMat, -0.43, 0.88, 0.69);
    createBox(group, 0.3, 0.3, 0.07, windowMat, 0.43, 0.88, 0.69);

    createBox(group, 0.3, 0.3, 0.07, windowMat, -0.69, 0.88, 0);
    createBox(group, 0.3, 0.3, 0.07, windowMat, 0.69, 0.88, 0);

    createBox(group, 0.25, 0.55, 0.25, roof, 0.38, 1.75, -0.35);

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createShop(x, z) {
    const group = new THREE.Group();

    const wall = material("#f0d8a5");
    const sign = material("#e95d48");
    const glass = new THREE.MeshStandardMaterial({
      color: "#8bd4e8",
      roughness: 0.2
    });

    createBox(group, 1.5, 1.45, 1.45, wall, 0, 0.75, 0);
    createBox(group, 1.58, 0.16, 1.52, sign, 0, 1.55, 0);
    createBox(group, 1.0, 0.5, 0.07, glass, 0, 0.8, 0.76);
    createBox(group, 0.34, 0.62, 0.07, material("#704b36"), -0.48, 0.34, 0.77);
    createBox(group, 0.35, 0.12, 0.15, material("#f7df9b"), 0.35, 1.12, 0.8);

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createTree(x, z) {
    const group = new THREE.Group();

    createBox(group, 0.25, 0.9, 0.25, mats.trunk, 0, 0.45, 0);

    const leaf1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 1.2, 7),
      mats.leaf
    );
    leaf1.position.y = 1.25;
    group.add(leaf1);

    const leaf2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.9, 7),
      mats.leaf2
    );
    leaf2.position.y = 1.75;
    group.add(leaf2);

    group.position.set(x, 0, z);
    cityGroup.add(group);
    return group;
  }

  function createDecorations() {
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * (groundSize - 4);
      const z = (Math.random() - 0.5) * (groundSize - 4);

      if (Math.abs(z) < 2.3) continue;

      const group = new THREE.Group();
      createBox(group, 0.15, 0.6, 0.15, mats.trunk, 0, 0.3, 0);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 6),
        mats.leaf
      );
      crown.position.y = 0.9;
      group.add(crown);

      group.position.set(x, 0, z);
      cityGroup.add(group);
    }
  }

  const cars = [];

  function createCars() {
    const carColors = ["#e85c4a", "#e9cf58", "#4d94e8", "#f4f4ef"];

    for (let i = 0; i < 4; i++) {
      const car = new THREE.Group();

      createBox(
        car,
        1.0,
        0.35,
        0.65,
        material(carColors[i]),
        0,
        0.25,
        0
      );

      createBox(
        car,
        0.5,
        0.3,
        0.52,
        mats.glass,
        0,
        0.55,
        0
      );

      car.position.set(-10 + i * 5, 0.08, 0);
      car.userData.speed = 0.8 + Math.random() * 1.2;

      cityGroup.add(car);
      cars.push(car);
    }
  }

  function snap(value) {
    return Math.round(value / cellSize) * cellSize;
  }

  function placeBuilding(type, x, z) {
    const gx = snap(x);
    const gz = snap(z);

    if (
      Math.abs(gx) > half - 1 ||
      Math.abs(gz) > half - 1
    ) {
      showToast("اختار مكانًا داخل حدود المدينة.");
      return;
    }

    const key = `${Math.round(gx / cellSize)},${Math.round(gz / cellSize)}`;

    if (occupied.has(key)) {
      showToast("المكان ده مشغول! اختار مكانًا تانيًا.");
      return;
    }

    if (money < COST[type]) {
      showToast("فلوسك مش كفاية للبناء ده.");
      return;
    }

    let object;

    if (type === "house") object = createHouse(gx, gz);
    else if (type === "shop") object = createShop(gx, gz);
    else if (type === "tree") object = createTree(gx, gz);
    else if (type === "road") object = createRoad(gx, gz, true);

    if (!object) return;

    occupied.add(key);
    objects.push({ type, object, key });

    money -= COST[type];
    population += BUILDING_INFO[type].population;
    income += BUILDING_INFO[type].income;

    if (type !== "road" && type !== "tree") {
      buildingCount++;
    }

    updateHUD();
    showToast("تم البناء بنجاح! 🎉");
  }

  function connectControls() {
    document.querySelectorAll(".build-btn").forEach((button) => {
      button.addEventListener("click", () => {
        selectedType = button.dataset.type;

        document.querySelectorAll(".build-btn").forEach((b) => {
          b.classList.toggle("active", b === button);
        });

        showToast("اضغط على مكان فاضي في الأرض للبناء.");
      });
    });

    $("cancelBuild").addEventListener("click", () => {
      selectedType = null;
      document.querySelectorAll(".build-btn").forEach((b) => {
        b.classList.remove("active");
      });
      showToast("تم إلغاء اختيار البناء.");
    });

    $("cameraBtn").addEventListener("click", () => {
      cameraAngle += Math.PI / 4;
      updateCamera();
    });

    $("zoomInBtn").addEventListener("click", () => {
      cameraDistance = Math.max(13, cameraDistance - 3);
      updateCamera();
    });

    $("zoomOutBtn").addEventListener("click", () => {
      cameraDistance = Math.min(42, cameraDistance + 3);
      updateCamera();
    });

    renderer.domElement.addEventListener("pointerdown", onWorldClick);
  }

  function onWorldClick(event) {
    if (!selectedType) return;

    const rect = renderer.domElement.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObject(ground, true);

    if (!hits.length) return;

    const point = hits[0].point;
    placeBuilding(selectedType, point.x, point.z);
  }

  function updateCamera() {
    const target = new THREE.Vector3(0, 0, 0);

    camera.position.set(
      Math.cos(cameraAngle) * cameraDistance,
      cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    camera.lookAt(target);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();

    if (now - lastIncomeTime >= 10000) {
      money += income;
      lastIncomeTime = now;
      updateHUD();

      if (income > 0) {
        showToast(`وصل دخل مدينتك: +${income} 💰`);
      }
    }

    for (const car of cars) {
      car.position.x += car.userData.speed * 0.016;

      if (car.position.x > 12) {
        car.position.x = -12;
      }
    }

    renderer.render(scene, camera);
  }

  try {
    createWorld();
  } catch (error) {
    console.error("M11 CITY BUILDER error:", error);
    loading.classList.remove("hidden");
    loading.innerHTML = `
      <h2>تعذر تشغيل اللعبة</h2>
      <p>تأكد من اتصال الإنترنت ثم أعد تحميل الصفحة.</p>
    `;
  }
})();
