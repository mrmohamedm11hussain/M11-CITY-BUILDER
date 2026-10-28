"use strict";

/* =========================================================
   YOUR OLD VERSION
   M11 / Mr. Mohamed Hussain
   GAME ENGINE — VERSION 3.0
========================================================= */

(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas?.getContext("2d");

  if (!canvas || !ctx) {
    console.error("YOUR OLD VERSION: canvas not found.");
    return;
  }

  const $ = id => document.getElementById(id);

  const ui = {
    world: $("wn"),
    level: $("lv"),
    gems: $("lp"),
    fill: $("fill"),
    hint: $("hint"),
    start: $("o1"),
    win: $("o2"),
    winTitle: $("t2"),
    winText: $("p2"),
    nextWin: $("n2"),
    restartWin: $("winRestart"),
    startButton: $("go"),
    characterArea: $("chs"),
    left: $("left"),
    right: $("right"),
    jump: $("jump"),
    restart: $("rs"),
    next: $("nx")
  };

  const W = canvas.width;
  const H = canvas.height;

  const TILE = 48;
  const COLS = 20;
  const ROWS = 11;

  const GRAVITY = 0.55;
  const MOVE_SPEED = 4.0;
  const JUMP_FORCE = -11.7;
  const MAX_FALL_SPEED = 14;

  const STORAGE_KEY = "m11_your_old_version_save_v3";

  const COLORS = {
    white: "#f4f7ff",
    cyan: "#72f5e1",
    blue: "#78a7ff",
    purple: "#b19aff",
    gold: "#ffd77c",
    red: "#ff738e",
    green: "#92f5b2"
  };

  const WORLDS = [
    {
      name: "الغابة المسحورة",
      icon: "🌲",
      skyTop: "#102e43",
      skyBottom: "#286b68",
      far: "#214f58",
      mid: "#183f46",
      ground: "#32634d",
      groundTop: "#80d6a1",
      accent: "#8df2bd"
    },
    {
      name: "الآثار القديمة",
      icon: "🏛️",
      skyTop: "#332b4e",
      skyBottom: "#a66e66",
      far: "#594765",
      mid: "#40334e",
      ground: "#66516a",
      groundTop: "#e4b58d",
      accent: "#ffcb91"
    },
    {
      name: "مملكة الكريستال",
      icon: "🔮",
      skyTop: "#101d50",
      skyBottom: "#3f579b",
      far: "#293d79",
      mid: "#1e2e61",
      ground: "#374b91",
      groundTop: "#8de7ff",
      accent: "#a9f6ff"
    }
  ];

  const state = {
    levelIndex: 0,
    character: "adam",
    gems: 0,
    totalGems: 0,
    deaths: 0,
    running: false,
    won: false,
    paused: false,
    muted: false,
    elapsed: 0,
    cameraX: 0,
    particles: [],
    stars: [],
    clouds: [],
    ghosts: [],
    recording: [],
    activePlates: new Set(),
    doorOpen: new Set(),
    shake: 0,
    flash: 0,
    time: 0,
    lastFrame: 0,
    audio: null
  };

  const input = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
  };

  const player = {
    x: 0,
    y: 0,
    w: 29,
    h: 38,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    frame: 0,
    invulnerable: 0,
    spawnX: 0,
    spawnY: 0
  };

  let level = null;
  let map = [];
  let animationId = 0;
  let lastTime = 0;
  let currentCharacterButtons = [];
  let audioContext = null;

  /* =====================================================
     حفظ التقدم
  ===================================================== */

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

      state.levelIndex = clamp(
        Number(saved.levelIndex) || 0,
        0,
        LEVELS.length - 1
      );

      state.gems = Math.max(0, Number(saved.gems) || 0);
      state.totalGems = Math.max(0, Number(saved.totalGems) || 0);

      if (saved.character === "layan") {
        state.character = "layan";
      }
    } catch (error) {
      console.warn("Save data could not be loaded.");
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        levelIndex: state.levelIndex,
        gems: state.gems,
        totalGems: state.totalGems,
        character: state.character
      }));
    } catch (error) {
      // تستمر اللعبة حتى إذا لم يسمح المتصفح بالحفظ.
    }
  }

  /* =====================================================
     أدوات مساعدة
  ===================================================== */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillRounded(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundedRect(x, y, w, h, r);
    ctx.fill();
  }

  function line(x1, y1, x2, y2, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function getTile(tx, ty) {
    if (tx < 0 || tx >= COLS || ty >= ROWS) return "#";
    if (ty < 0) return " ";

    return map[ty]?.[tx] ?? " ";
  }

  function tileIsSolid(tile) {
    return tile === "#" ||
      (["a", "b", "c"].includes(tile) && !state.doorOpen.has(tile));
  }

  function getWorld() {
    const index = Math.floor(state.levelIndex / 10);
    return WORLDS[Math.min(index, WORLDS.length - 1)];
  }

  function getLevelNumber() {
    return state.levelIndex % 10 + 1;
  }

  /* =====================================================
     الصوت
  ===================================================== */

  function playSound(frequency = 440, duration = 0.08, type = "sine") {
    if (state.muted) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContext) audioContext = new AudioCtx();

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      // الصوت اختياري.
    }
  }

  /* =====================================================
     الجسيمات والمؤثرات
  ===================================================== */

  function burst(x, y, color, amount = 12, power = 3) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = random(0.5, power);

      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: random(2, 5),
        life: random(20, 42),
        maxLife: 42,
        color,
        gravity: 0.045
      });
    }
  }

  function updateParticles(dt) {
    const factor = dt / 16.667;

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];

      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.vy += p.gravity * factor;
      p.life -= factor;

      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    if (state.particles.length > 220) {
      state.particles.splice(0, state.particles.length - 220);
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /* =====================================================
     بناء المرحلة
  ===================================================== */

  function loadLevel(index, options = {}) {
    if (!Array.isArray(LEVELS) || LEVELS.length === 0) {
      console.error("LEVELS is missing or empty.");
      return;
    }

    state.levelIndex = clamp(index, 0, LEVELS.length - 1);
    level = LEVELS[state.levelIndex];

    map = Array.from({ length: ROWS }, (_, y) => {
      const source = level.map?.[y] || "";
      return String(source).padEnd(COLS, " ").slice(0, COLS).split("");
    });

    state.activePlates.clear();
    state.doorOpen.clear();
    state.recording = [];
    state.ghosts = [];
    state.elapsed = 0;
    state.won = false;
    state.paused = false;
    state.particles = [];
    state.shake = 0;
    state.flash = 0;

    // إعداد نسخ من الخريطة لاكتشاف الأبواب وألواح الضغط.
    const start = findTile("S");
    const spawnX = start ? start.x * TILE + 9 : TILE;
    const spawnY = start ? start.y * TILE + 4 : TILE;

    player.x = spawnX;
    player.y = spawnY;
    player.spawnX = spawnX;
    player.spawnY = spawnY;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.facing = 1;
    player.frame = 0;
    player.invulnerable = 35;

    state.cameraX = 0;

    updateHUD();
    saveProgress();

    if (!options.silent) {
      burst(player.x + player.w / 2, player.y + player.h / 2, getWorld().accent, 15);
    }
  }

  function findTile(symbol) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === symbol) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /* =====================================================
     الواجهة والإحصائيات
  ===================================================== */

  function updateHUD() {
    if (!level) return;

    const worldIndex = Math.floor(state.levelIndex / 10);
    const world = WORLDS[worldIndex] || WORLDS[0];

    if (ui.world) ui.world.textContent = world.name;
    if (ui.level) {
      ui.level.textContent = `${getLevelNumber()} / 10`;
    }
    if (ui.gems) ui.gems.textContent = String(state.gems);

    if (ui.hint) {
      ui.hint.textContent = level.h || "استكشف المكان وفكر قبل أن تتحرك.";
    }

    if (ui.fill) {
      const percent = (state.levelIndex / LEVELS.length) * 100;
      ui.fill.style.width = `${percent}%`;
    }
  }

  function updateWinProgress() {
    if (ui.fill) {
      ui.fill.style.width = `${((state.levelIndex + 1) / LEVELS.length) * 100}%`;
    }
  }

  /* =====================================================
     التحكم
  ===================================================== */

  function setButtonInput(button, key) {
    if (!button) return;

    const press = event => {
      event.preventDefault();

      if (key === "jump") {
        if (!input.jump) input.jumpPressed = true;
        input.jump = true;
      } else {
        input[key] = true;
      }

      button.classList.add("pressed");

      try {
        button.setPointerCapture?.(event.pointerId);
      } catch (error) {}
    };

    const release = event => {
      if (event) event.preventDefault();

      input[key] = false;
      button.classList.remove("pressed");
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", event => event.preventDefault());
  }

  setButtonInput(ui.left, "left");
  setButtonInput(ui.right, "right");
  setButtonInput(ui.jump, "jump");

  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if ([
      "arrowleft", "arrowright", "arrowup",
      " ", "w", "a", "d"
    ].includes(key)) {
      event.preventDefault();
    }

    if (key === "arrowleft" || key === "a") input.left = true;
    if (key === "arrowright" || key === "d") input.right = true;

    if (key === " " || key === "arrowup" || key === "w") {
      if (!input.jump) input.jumpPressed = true;
      input.jump = true;
    }

    if (key === "r") restartLevel();
  }, { passive: false });

  window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (key === "arrowleft" || key === "a") input.left = false;
    if (key === "arrowright" || key === "d") input.right = false;

    if (key === " " || key === "arrowup" || key === "w") {
      input.jump = false;
    }
  });

  window.addEventListener("blur", () => {
    input.left = false;
    input.right = false;
    input.jump = false;
  });

  /* =====================================================
     التصادم
  ===================================================== */

  function overlaps(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function getNearbyTiles(entity) {
    const left = Math.floor(entity.x / TILE);
    const right = Math.floor((entity.x + entity.w - 1) / TILE);
    const top = Math.floor(entity.y / TILE);
    const bottom = Math.floor((entity.y + entity.h - 1) / TILE);

    const result = [];

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        result.push({
          x,
          y,
          tile: getTile(x, y),
          rect: {
            x: x * TILE,
            y: y * TILE,
            w: TILE,
            h: TILE
          }
        });
      }
    }

    return result;
  }

  function moveAndCollide(dt) {
    const factor = dt / 16.667;

    player.x += player.vx * factor;

    for (const item of getNearbyTiles(player)) {
      if (!tileIsSolid(item.tile)) continue;

      if (!overlaps(player, item.rect)) continue;

      if (player.vx > 0) {
        player.x = item.rect.x - player.w;
      } else if (player.vx < 0) {
        player.x = item.rect.x + item.rect.w;
      }

      player.vx = 0;
    }

    player.y += player.vy * factor;
    player.grounded = false;

    for (const item of getNearbyTiles(player)) {
      if (!tileIsSolid(item.tile)) continue;

      if (!overlaps(player, item.rect)) continue;

      if (player.vy > 0) {
        player.y = item.rect.y - player.h;
        player.grounded = true;
      } else if (player.vy < 0) {
        player.y = item.rect.y + item.rect.h;
      }

      player.vy = 0;
    }

    // حدود الخريطة
    player.x = clamp(player.x, 0, W - player.w);

    if (player.y > H + 90) {
      die();
    }
  }

  /* =====================================================
     الأشباح — أثر حركتك السابقة
  ===================================================== */

  function recordFrame() {
    state.recording.push({
      x: player.x,
      y: player.y,
      facing: player.facing,
      frame: player.frame,
      grounded: player.grounded
    });

    // حماية من تسجيل طويل جدًا.
    if (state.recording.length > 60 * 30) {
      state.recording.shift();
    }
  }

  function spawnGhostFromRecording() {
    if (state.recording.length < 20) return;

    state.ghosts.push({
      frames: state.recording.slice(),
      index: 0,
      alpha: 0.65
    });

    // الحد الأقصى 3 أشباح لتجنب ازدحام الشاشة.
    if (state.ghosts.length > 3) {
      state.ghosts.shift();
    }
  }

  function updateGhosts() {
    for (const ghost of state.ghosts) {
      if (ghost.index < ghost.frames.length - 1) {
        ghost.index++;
      }
    }
  }

  function drawGhosts() {
    for (const ghost of state.ghosts) {
      const frame = ghost.frames[ghost.index];
      if (!frame) continue;

      const x = frame.x - state.cameraX;
      const y = frame.y;

      ctx.save();
      ctx.globalAlpha = ghost.alpha * (0.65 + Math.sin(state.time * 0.005) * 0.12);

      // هالة الشبح
      ctx.shadowColor = "#78f5ff";
      ctx.shadowBlur = 18;

      drawCharacter(x, y, frame.facing, frame.frame, true);

      ctx.restore();
    }
  }

  /* =====================================================
     الألواح والأبواب
  ===================================================== */

  function updatePlates() {
    state.activePlates.clear();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const symbol = map[y][x];

        if (!["1", "2", "3"].includes(symbol)) continue;

        const plateRect = {
          x: x * TILE + 4,
          y: y * TILE + TILE - 11,
          w: TILE - 8,
          h: 12
        };

        let pressed = overlaps(player, plateRect);

        for (const ghost of state.ghosts) {
          const frame = ghost.frames[ghost.index];

          if (!frame) continue;

          const ghostRect = {
            x: frame.x,
            y: frame.y,
            w: player.w,
            h: player.h
          };

          if (overlaps(ghostRect, plateRect)) {
            pressed = true;
          }
        }

        if (pressed) state.activePlates.add(symbol);
      }
    }

    const doors = [
      ["a", "1"],
      ["b", "2"],
      ["c", "3"]
    ];

    for (const [door, plate] of doors) {
      if (state.activePlates.has(plate)) {
        state.doorOpen.add(door);
      } else {
        state.doorOpen.delete(door);
      }
    }
  }

  /* =====================================================
     تحديث اللعبة
  ===================================================== */

  function update(dt) {
    if (!state.running || state.won || state.paused) return;

    const factor = clamp(dt / 16.667, 0, 2);
    state.time += dt;
    state.elapsed += dt;

    if (player.invulnerable > 0) {
      player.invulnerable -= factor;
    }

    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - factor);
    }

    if (state.flash > 0) {
      state.flash = Math.max(0, state.flash - factor);
    }

    // الحركة الأفقية
    let direction = 0;

    if (input.left) direction -= 1;
    if (input.right) direction += 1;

    player.vx = direction * MOVE_SPEED;

    if (direction !== 0) {
      player.facing = direction;
      player.frame += factor * 0.18;
    } else {
      player.frame = 0;
    }

    // القفز
    if (input.jumpPressed && player.grounded) {
      player.vy = JUMP_FORCE;
      player.grounded = false;
      playSound(340, 0.1, "triangle");
      burst(player.x + player.w / 2, player.y + player.h, getWorld().accent, 5, 1.5);
    }

    input.jumpPressed = false;

    // قفزة أطول عند استمرار الضغط لفترة قصيرة.
    if (input.jump && player.vy < -3) {
      player.vy -= 0.16 * factor;
    }

    player.vy += GRAVITY * factor;
    player.vy = Math.min(player.vy, MAX_FALL_SPEED);

    moveAndCollide(dt);

    updateGhosts();
    updatePlates();
    checkHazards();
    checkExit();
    checkGems();
    recordFrame();

    updateCamera();
    updateParticles(dt);
  }

  /* =====================================================
     الفخاخ
  ===================================================== */

  function checkHazards() {
    if (player.invulnerable > 0) return;

    for (const item of getNearbyTiles(player)) {
      if (item.tile !== "^") continue;

      const spikeRect = {
        x: item.rect.x + 5,
        y: item.rect.y + 16,
        w: item.rect.w - 10,
        h: item.rect.h - 16
      };

      if (overlaps(player, spikeRect)) {
        die();
        return;
      }
    }
  }

  function die() {
    if (player.invulnerable > 0 || state.won) return;

    state.deaths++;
    state.shake = 12;
    state.flash = 8;

    burst(
      player.x + player.w / 2,
      player.y + player.h / 2,
      COLORS.red,
      22,
      4
    );

    playSound(125, 0.22, "sawtooth");

    spawnGhostFromRecording();

    const previousGhosts = state.ghosts.slice();

    const currentIndex = state.levelIndex;
    loadLevel(currentIndex, { silent: true });

    state.ghosts = previousGhosts;

    // الشبح يعود للبداية ليعيد مسار حركتك.
    for (const ghost of state.ghosts) {
      ghost.index = 0;
    }

    player.invulnerable = 70;
  }

  /* =====================================================
     الجواهر
  ===================================================== */

  function checkGems() {
    // أماكن الجواهر مشتقة من بعض المساحات الفارغة فوق المنصات.
    // لا يتم تعديل الخريطة أثناء اللعب.
    if (!level._gemLocations) {
      level._gemLocations = [];

      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          const tile = getTile(x, y);

          if (
            tile === " " &&
            getTile(x, y + 1) === "#" &&
            Math.random() < 0.035
          ) {
            level._gemLocations.push({
              x: x * TILE + TILE / 2,
              y: y * TILE - 20,
              collected: false
            });
          }
        }
      }
    }

    for (const gem of level._gemLocations) {
      if (gem.collected) continue;

      const rect = {
        x: gem.x - 10,
        y: gem.y - 10,
        w: 20,
        h: 20
      };

      if (overlaps(player, rect)) {
        gem.collected = true;
        state.gems++;
        state.totalGems++;

        burst(gem.x, gem.y, COLORS.gold, 14, 3);
        playSound(720, 0.12, "sine");
        updateHUD();
        saveProgress();
      }
    }
  }

  /* =====================================================
     باب النهاية
  ===================================================== */

  function checkExit() {
    const exit = findTile("E");
    if (!exit) return;

    const exitRect = {
      x: exit.x * TILE + 8,
      y: exit.y * TILE + 3,
      w: TILE - 16,
      h: TILE - 3
    };

    if (overlaps(player, exitRect)) {
      completeLevel();
    }
  }

  function completeLevel() {
    if (state.won) return;

    state.won = true;
    state.running = false;

    burst(
      player.x + player.w / 2,
      player.y + player.h / 2,
      COLORS.gold,
      35,
      5
    );

    playSound(660, 0.14, "triangle");
    setTimeout(() => playSound(880, 0.22, "triangle"), 100);

    const nextIndex = state.levelIndex + 1;
    const completedWorld = Math.floor(state.levelIndex / 10);
    const nextWorld = Math.floor(nextIndex / 10);

    if (nextIndex < LEVELS.length) {
      if (completedWorld !== nextWorld) {
        if (ui.winTitle) {
          ui.winTitle.textContent = `🌟 وصلت إلى ${WORLDS[nextWorld].name}!`;
        }

        if (ui.winText) {
          ui.winText.textContent =
            "أنهيت العالم السابق بنجاح. استعد لتحديات وأسرار جديدة!";
        }
      } else {
        if (ui.winTitle) ui.winTitle.textContent = "أحسنت أيها المغامر!";
        if (ui.winText) {
          ui.winText.textContent =
            `أنهيت المرحلة ${getLevelNumber()} بنجاح. تابع رحلتك لاكتشاف المزيد.`;
        }
      }

      if (ui.nextWin) ui.nextWin.textContent = "المرحلة التالية ←";
    } else {
      if (ui.winTitle) ui.winTitle.textContent = "🏆 أنهيت المغامرة!";
      if (ui.winText) {
        ui.winText.textContent =
          "لقد اجتزت العوالم الثلاثة! أنت بطل YOUR OLD VERSION الحقيقي.";
      }

      if (ui.nextWin) ui.nextWin.textContent = "ابدأ من جديد ↻";
    }

    if (ui.win) ui.win.classList.add("show");

    updateWinProgress();

    state.levelIndex = Math.min(state.levelIndex + 1, LEVELS.length - 1);
    saveProgress();
  }

  /* =====================================================
     إعادة المرحلة والانتقال
  ===================================================== */

  function restartLevel() {
    if (state.recording.length > 20) {
      spawnGhostFromRecording();
    }

    const previousGhosts = state.ghosts.slice();
    const index = state.levelIndex;

    loadLevel(index, { silent: true });

    state.ghosts = previousGhosts;

    for (const ghost of state.ghosts) {
      ghost.index = 0;
    }

    state.running = true;

    if (ui.start) ui.start.classList.remove("show");
    if (ui.win) ui.win.classList.remove("show");
  }

  function nextLevel() {
    const next = state.levelIndex + 1;

    if (next >= LEVELS.length) {
      state.levelIndex = 0;
      state.gems = 0;
      state.totalGems = 0;
      loadLevel(0);
    } else {
      loadLevel(next);
    }

    state.running = true;

    if (ui.win) ui.win.classList.remove("show");
    if (ui.start) ui.start.classList.remove("show");
  }

  if (ui.restart) {
    ui.restart.addEventListener("click", restartLevel);
  }

  if (ui.restartWin) {
    ui.restartWin.addEventListener("click", restartLevel);
  }

  if (ui.next) {
    ui.next.addEventListener("click", nextLevel);
  }

  if (ui.nextWin) {
    ui.nextWin.addEventListener("click", nextLevel);
  }

  /* =====================================================
     اختيار الشخصية
  ===================================================== */

  function chooseCharacter(character) {
    if (!["adam", "layan"].includes(character)) return;

    state.character = character;

    if (ui.characterArea) {
      currentCharacterButtons =
        [...ui.characterArea.querySelectorAll("[data-character]")];

      for (const button of currentCharacterButtons) {
        const selected = button.dataset.character === character;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
    }

    saveProgress();
  }

  if (ui.characterArea) {
    ui.characterArea.querySelectorAll("[data-character]").forEach(button => {
      button.addEventListener("click", () => {
        chooseCharacter(button.dataset.character);
      });
    });
  }

  /* =====================================================
     الكاميرا
  ===================================================== */

  function updateCamera() {
    const target = clamp(
      player.x + player.w / 2 - W / 2,
      0,
      Math.max(0, COLS * TILE - W)
    );

    state.cameraX = lerp(state.cameraX, target, 0.12);
  }

  /* =====================================================
     رسم الخلفية
  ===================================================== */

  function createBackgroundObjects() {
    state.stars = [];
    state.clouds = [];

    for (let i = 0; i < 60; i++) {
      state.stars.push({
        x: random(0, W),
        y: random(10, H * 0.72),
        size: random(1, 2.8),
        phase: random(0, Math.PI * 2)
      });
    }

    for (let i = 0; i < 7; i++) {
      state.clouds.push({
        x: random(0, W),
        y: random(35, H * 0.42),
        scale: random(0.5, 1.25),
        speed: random(0.1, 0.3)
      });
    }
  }

  function drawBackground() {
    const world = getWorld();

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, world.skyTop);
    gradient.addColorStop(1, world.skyBottom);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // ضوء القمر أو الشمس.
    const glow = ctx.createRadialGradient(
      W * 0.76, H * 0.22, 4,
      W * 0.76, H * 0.22, 170
    );

    glow.addColorStop(0, "rgba(255,255,230,0.20)");
    glow.addColorStop(1, "rgba(255,255,230,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(W * 0.76, H * 0.22, 27, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,248,214,0.88)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(W * 0.76 + 10, H * 0.22 - 6, 25, 0, Math.PI * 2);
    ctx.fillStyle = world.skyTop;
    ctx.fill();

    // نجوم خافتة.
    for (const star of state.stars) {
      const alpha = 0.25 + Math.abs(Math.sin(state.time * 0.001 + star.phase)) * 0.55;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#e4f5ff";

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    drawDistantLandscape(world);
    drawClouds();
    drawAtmosphere(world);
  }

  function drawDistantLandscape(world) {
    // الجبال الخلفية.
    ctx.fillStyle = world.far;
    ctx.beginPath();
    ctx.moveTo(0, H);

    for (let x = -80; x <= W + 100; x += 80) {
      const y = H * 0.57 + Math.sin(x * 0.013) * 24;
      ctx.lineTo(x, y);
      ctx.lineTo(x + 40, y - random(10, 28));
    }

    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // التلال الأمامية.
    ctx.fillStyle = world.mid;
    ctx.beginPath();
    ctx.moveTo(0, H);

    for (let x = -40; x <= W + 80; x += 60) {
      const y = H * 0.72 + Math.sin(x * 0.019 + 2) * 25;
      ctx.lineTo(x, y);
      ctx.lineTo(x + 30, y - random(12, 25));
    }

    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawClouds() {
    for (const cloud of state.clouds) {
      const x = (cloud.x + state.time * cloud.speed * 0.02) % (W + 150) - 75;
      const y = cloud.y;
      const s = cloud.scale;

      ctx.globalAlpha = 0.09;
      ctx.fillStyle = "#e7f6ff";

      ctx.beginPath();
      ctx.ellipse(x, y, 37 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 23 * s, y - 8 * s, 24 * s, 17 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 19 * s, y - 3 * s, 21 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function drawAtmosphere(world) {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "rgba(8,12,29,0)");
    gradient.addColorStop(1, "rgba(8,12,29,0.22)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // إضاءة أطراف المشهد.
    const vignette = ctx.createRadialGradient(
      W / 2, H / 2, H * 0.2,
      W / 2, H / 2, H * 0.85
    );

    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.2)");

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  /* =====================================================
     رسم الأرض والمنصات
  ===================================================== */

  function drawGround(x, y, world) {
    ctx.fillStyle = world.ground;
    ctx.fillRect(x, y, TILE, TILE);

    // سطح الأرض.
    ctx.fillStyle = world.groundTop;
    ctx.fillRect(x, y, TILE, 6);

    // خطوط وحجارة صغيرة.
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + 5, y + 18, 12, 3);
    ctx.fillRect(x + 25, y + 33, 15, 3);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + 7, y + 12, 8, 2);
  }

  function drawDoor(x, y, open, world) {
    if (open) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = world.accent;
      ctx.shadowColor = world.accent;
      ctx.shadowBlur = 20;
      ctx.fillRect(x + 10, y + 6, TILE - 20, TILE - 6);
      ctx.restore();
      return;
    }

    ctx.save();

    ctx.shadowColor = world.accent;
    ctx.shadowBlur = 10;

    fillRounded(x + 8, y + 4, TILE - 16, TILE - 4, 8, "#171d36");

    ctx.shadowBlur = 0;
    ctx.strokeStyle = world.accent;
    ctx.lineWidth = 3;
    roundedRect(x + 8, y + 4, TILE - 16, TILE - 4, 8);
    ctx.stroke();

    ctx.fillStyle = world.accent;
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + 23, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawPlate(x, y, symbol, active, world) {
    const plateColor = active ? COLORS.green : world.accent;

    ctx.save();

    ctx.shadowColor = plateColor;
    ctx.shadowBlur = active ? 15 : 4;

    fillRounded(
      x + 5,
      y + TILE - 11,
      TILE - 10,
      8,
      4,
      active ? "#92f5b2" : "#637b98"
    );

    ctx.restore();

    ctx.fillStyle = active ? COLORS.green : "#d3e4ff";
    ctx.font = "bold 12px Cairo";
    ctx.textAlign = "center";
    ctx.fillText(symbol, x + TILE / 2, y + TILE - 16);
  }

  function drawSpikes(x, y) {
    ctx.save();

    ctx.fillStyle = "#28324b";
    ctx.fillRect(x, y + TILE - 8, TILE, 8);

    const gradient = ctx.createLinearGradient(x, y + 12, x, y + TILE);
    gradient.addColorStop(0, "#ffd6e0");
    gradient.addColorStop(1, "#e64f7a");

    ctx.fillStyle = gradient;

    ctx.beginPath();

    const count = 4;
    const spikeWidth = TILE / count;

    for (let i = 0; i < count; i++) {
      const sx = x + i * spikeWidth;

      ctx.moveTo(sx, y + TILE - 7);
      ctx.lineTo(sx + spikeWidth / 2, y + 13);
      ctx.lineTo(sx + spikeWidth, y + TILE - 7);
    }

    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const sx = x + i * spikeWidth;
      line(
        sx + 3,
        y + TILE - 12,
        sx + spikeWidth / 2,
        y + 18,
        "rgba(255,255,255,0.3)",
        1
      );
    }

    ctx.restore();
  }

  function drawGem(gem) {
    const pulse = 1 + Math.sin(state.time * 0.005 + gem.x) * 0.1;

    ctx.save();
    ctx.translate(gem.x - state.cameraX, gem.y);
    ctx.scale(pulse, pulse);

    ctx.shadowColor = COLORS.gold;
    ctx.shadowBlur = 15;

    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(9, -2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-9, -2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff2c7";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  function drawMap() {
    const world = getWorld();

    const startCol = Math.max(0, Math.floor(state.cameraX / TILE) - 1);
    const endCol = Math.min(COLS, Math.ceil((state.cameraX + W) / TILE) + 1);

    for (let y = 0; y < ROWS; y++) {
      for (let x = startCol; x < endCol; x++) {
        const symbol = getTile(x, y);

        const px = x * TILE - state.cameraX;
        const py = y * TILE;

        if (symbol === "#") {
          drawGround(px, py, world);
        } else if (symbol === "^") {
          drawSpikes(px, py);
        } else if (["a", "b", "c"].includes(symbol)) {
          drawDoor(px, py, state.doorOpen.has(symbol), world);
        } else if (["1", "2", "3"].includes(symbol)) {
          drawPlate(
            px,
            py,
            symbol,
            state.activePlates.has(symbol),
            world
          );
        } else if (symbol === "E") {
          drawExit(px, py, world);
        }
      }
    }

    if (level?._gemLocations) {
      for (const gem of level._gemLocations) {
        if (!gem.collected) drawGem(gem);
      }
    }
  }

  function drawExit(x, y, world) {
    const pulse = Math.sin(state.time * 0.004) * 3;

    ctx.save();

    ctx.shadowColor = world.accent;
    ctx.shadowBlur = 17 + pulse;

    fillRounded(x + 7, y + 4, TILE - 14, TILE - 4, 9, "#151b34");

    ctx.shadowBlur = 0;

    ctx.strokeStyle = world.accent;
    ctx.lineWidth = 3;

    roundedRect(x + 7, y + 4, TILE - 14, TILE - 4, 9);
    ctx.stroke();

    ctx.fillStyle = world.accent;
    ctx.globalAlpha = 0.8;

    ctx.beginPath();
    ctx.ellipse(
      x + TILE / 2,
      y + TILE / 2,
      7 + pulse / 3,
      13 + pulse / 3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* =====================================================
     رسم الشخصيات
  ===================================================== */

  function drawCharacter(x, y, facing = 1, frame = 0, ghost = false) {
    ctx.save();

    const walking = Math.abs(player.vx) > 0.2 && !ghost;
    const legSwing = walking ? Math.sin(frame * 2.3) * 4 : 0;
    const bob = walking ? Math.abs(Math.sin(frame * 2.3)) * 2 : 0;

    ctx.translate(x + player.w / 2, y + player.h / 2 + bob);

    if (facing < 0) ctx.scale(-1, 1);

    const bodyColor = state.character === "layan" ? "#c58bff" : "#68d8ff";
    const suitColor = ghost ? "#83f7ff" : bodyColor;
    const outlineColor = ghost ? "#e4ffff" : "#26314f";

    // الظل تحت الشخصية.
    if (!ghost) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(0, player.h / 2 + 2, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // الرجلان.
    fillRounded(-10, 7 + legSwing * 0.35, 8, 13, 4, outlineColor);
    fillRounded(2, 7 - legSwing * 0.35, 8, 13, 4, outlineColor);

    fillRounded(-9, 9 + legSwing * 0.35, 6, 9, 3, suitColor);
    fillRounded(3, 9 - legSwing * 0.35, 6, 9, 3, suitColor);

    // الجسم.
    ctx.fillStyle = outlineColor;
    roundedRect(-12, -7, 24, 22, 8);
    ctx.fill();

    ctx.fillStyle = suitColor;
    roundedRect(-10, -6, 20, 19, 7);
    ctx.fill();

    // الصدر.
    fillRounded(-5, -1, 10, 7, 3, ghost ? "#ffffff" : "#e8f7ff");

    // الذراعان.
    fillRounded(-15, -4, 6, 15, 3, outlineColor);
    fillRounded(9, -4, 6, 15, 3, outlineColor);

    fillRounded(-14, -3, 4, 12, 2, suitColor);
    fillRounded(10, -3, 4, 12, 2, suitColor);

    // الرأس.
    ctx.fillStyle = outlineColor;
    ctx.beginPath();
    ctx.arc(0, -13, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ghost ? "#c9ffff" : "#f2c5a3";
    ctx.beginPath();
    ctx.arc(0, -13, 11, 0, Math.PI * 2);
    ctx.fill();

    // الشعر.
    ctx.fillStyle = state.character === "layan" ? "#432a68" : "#24314a";

    ctx.beginPath();
    ctx.arc(-1, -17, 11, Math.PI, Math.PI * 2);
    ctx.lineTo(10, -13);
    ctx.lineTo(6, -19);
    ctx.lineTo(0, -21);
    ctx.lineTo(-8, -17);
    ctx.closePath();
    ctx.fill();

    // العين.
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(4, -13, 3, 3.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#18233b";
    ctx.beginPath();
    ctx.arc(5, -13, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // وهج الشبح.
    if (ghost) {
      ctx.strokeStyle = "rgba(120,245,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -7, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlayer() {
    if (
      player.invulnerable > 0 &&
      Math.floor(player.invulnerable / 5) % 2 === 0
    ) {
      return;
    }

    drawCharacter(
      player.x - state.cameraX,
      player.y,
      player.facing,
      player.frame,
      false
    );
  }

  /* =====================================================
     واجهة داخل اللعبة
  ===================================================== */

  function drawGameOverlay() {
    // اسم العالم والمرحلة أعلى ساحة اللعب.
    ctx.save();

    const gradient = ctx.createLinearGradient(0, 0, 0, 54);
    gradient.addColorStop(0, "rgba(5,10,22,0.58)");
    gradient.addColorStop(1, "rgba(5,10,22,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, 54);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#f4f7ff";
    ctx.font = "bold 16px Cairo";
    ctx.fillText(`${getWorld().icon} ${getWorld().name}`, 20, 23);

    ctx.fillStyle = "rgba(240,246,255,0.7)";
    ctx.font = "12px Cairo";
    ctx.fillText(`المرحلة ${getLevelNumber()} / 10`, 20, 43);

    // عداد الأشباح.
    if (state.ghosts.length > 0) {
      ctx.textAlign = "right";
      ctx.font = "bold 13px Cairo";
      ctx.fillStyle = COLORS.cyan;
      ctx.fillText(`👻 ${state.ghosts.length}`, W - 20, 26);
    }

    ctx.restore();
  }

  /* =====================================================
     الإطار الرئيسي للرسم
  ===================================================== */

  function render() {
    ctx.save();

    if (state.shake > 0) {
      ctx.translate(
        random(-state.shake, state.shake),
        random(-state.shake, state.shake)
      );
    }

    drawBackground();
    drawMap();
    drawGhosts();
    drawPlayer();
    drawParticles();
    drawGameOverlay();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,100,130,${state.flash * 0.012})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  /* =====================================================
     بدء اللعبة
  ===================================================== */

  function startGame() {
    if (ui.start) ui.start.classList.remove("show");
    if (ui.win) ui.win.classList.remove("show");

    state.running = true;
    state.won = false;
    state.paused = false;

    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }

    playSound(520, 0.1, "triangle");
  }

  if (ui.startButton) {
    ui.startButton.addEventListener("click", () => {
      startGame();
    });
  }

  /* =====================================================
     حلقة التشغيل
  ===================================================== */

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;

    const dt = Math.min(timestamp - lastTime, 34);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  /* =====================================================
     تهيئة اللعبة
  ===================================================== */

  function init() {
    loadSave();

    createBackgroundObjects();
    loadLevel(state.levelIndex, { silent: true });
    chooseCharacter(state.character);

    // عرض القائمة الرئيسية حتى يضغط اللاعب على ابدأ.
    state.running = false;

    if (ui.start) ui.start.classList.add("show");

    // إعداد الصوت من زر الواجهة.
    const soundButton = $("soundToggle");

    if (soundButton) {
      soundButton.addEventListener("click", () => {
        state.muted = window.gameMuted === true;
      });
    }

    // منع تمرير الصفحة عند استخدام أزرار الحركة.
    document.querySelectorAll(".control-btn").forEach(button => {
      button.addEventListener("contextmenu", event => {
        event.preventDefault();
      });
    });

    updateHUD();

    if (!animationId) {
      animationId = requestAnimationFrame(gameLoop);
    }

    console.log("YOUR OLD VERSION initialized successfully.");
    console.log("Levels:", LEVELS.length);
    console.log("Character:", state.character);
  }

  init();

})(); 
