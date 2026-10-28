/* ========================================================
   YOUR OLD VERSION
   Developed by M11 / Mr. Mohamed Hussain
   Version 2.0

   Features:
   - Three worlds
   - Two playable characters
   - Time-loop ghost system
   - Pressure plates and doors
   - Spikes and checkpoints
   - Automatic progress saving
   - Keyboard and touchscreen controls
======================================================== */

(() => {
  "use strict";

  const canvas = document.getElementById("c");
  if (!canvas) {
    console.error("YOUR OLD VERSION: Canvas #c not found.");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (typeof LEVELS === "undefined" || !LEVELS.length) {
    console.error("YOUR OLD VERSION: levels.js was not loaded.");
    return;
  }

  const $ = id => document.getElementById(id);

  const ui = {
    world: $("wn"),
    level: $("lv"),
    progress: $("lp"),
    fill: $("fill"),
    hint: $("hint"),
    reset: $("rs"),
    next: $("nx"),
    menu: $("o1"),
    win: $("o2"),
    winTitle: $("t2"),
    winPoints: $("p2"),
    winNext: $("n2"),
    go: $("go"),
    characters: $("chs")
  };

  const TILE = 40;
  const COLS = 20;
  const ROWS = 11;
  const W = canvas.width || COLS * TILE;
  const H = canvas.height || ROWS * TILE;

  const SAVE_KEY = "your_old_version_save_v1";

  const CHARACTERS = [
    {
      id: "adam",
      name: "آدم",
      color: "#52d8ff",
      secondary: "#d9f8ff"
    },
    {
      id: "layan",
      name: "ليان",
      color: "#ff83c8",
      secondary: "#fff0f8"
    }
  ];

  const WORLDS = [
    {
      name: "الغابة المسحورة",
      sky: "#102b39",
      sky2: "#28564e",
      ground: "#245447",
      top: "#72d99b",
      block: "#356d59",
      edge: "#a0edb9",
      glow: "#92ffd0",
      star: "#d9ffea"
    },
    {
      name: "الآثار القديمة",
      sky: "#382b39",
      sky2: "#80563c",
      ground: "#6b4c3c",
      top: "#e4bb7c",
      block: "#987352",
      edge: "#f6d5a0",
      glow: "#ffdb91",
      star: "#fff0ce"
    },
    {
      name: "مملكة الكريستال",
      sky: "#111d48",
      sky2: "#384f89",
      ground: "#344b82",
      top: "#92dfff",
      block: "#566db0",
      edge: "#d0f7ff",
      glow: "#8df5ff",
      star: "#e3fbff"
    }
  ];

  let save = readSave();

  let levelIndex = clamp(
    Number(save.level) || 0,
    0,
    LEVELS.length - 1
  );

  let unlocked = clamp(
    Number(save.unlocked) || 0,
    0,
    LEVELS.length - 1
  );

  let characterIndex = save.character === "layan" ? 1 : 0;

  let level = null;
  let grid = [];
  let player = null;
  let ghosts = [];
  let recording = [];

  let plates = [];
  let doors = { a: false, b: false, c: false };

  let startCell = { x: 1, y: 9 };
  let exitCell = { x: 18, y: 9 };

  let frame = 0;
  let roundDuration = 480;
  let roundNumber = 1;

  let started = false;
  let paused = false;
  let won = false;
  let dead = false;

  let lastTime = 0;
  let accumulator = 0;
  let messageFrames = 0;

  let keys = Object.create(null);

  const touch = {
    left: false,
    right: false,
    jump: false
  };

  let particles = [];
  let stars = [];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readSave() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        level: levelIndex,
        unlocked,
        character: CHARACTERS[characterIndex].id
      }));
    } catch (error) {
      console.warn("Unable to save progress.", error);
    }
  }

  function worldFor(index = levelIndex) {
    const worldIndex = Number(LEVELS[index]?.world) || 0;
    return WORLDS[clamp(worldIndex, 0, WORLDS.length - 1)];
  }

  function makeGrid(data) {
    return Array.from({ length: ROWS }, (_, y) => {
      const row = String(data.map?.[y] || "");
      return Array.from({ length: COLS }, (_, x) => row[x] || ".");
    });
  }

  function findSymbol(symbol, fallback) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] === symbol) return { x, y };
      }
    }
    return { ...fallback };
  }

  function createPlayer(x, y) {
    return {
      x,
      y,
      w: 26,
      h: 34,
      vx: 0,
      vy: 0,
      speed: 3.1,
      jumpPower: -9.5,
      onGround: false,
      facing: 1,
      frame: 0
    };
  }

  function createStars() {
    stars = [];
    const world = worldFor();

    for (let i = 0; i < 65; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.75,
        r: 0.5 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        color: world.star
      });
    }
  }

  function updateUI() {
    const world = worldFor();

    if (ui.world) ui.world.textContent = world.name;
    if (ui.level) ui.level.textContent = levelIndex + 1;

    if (ui.progress) {
      ui.progress.textContent =
        `${levelIndex + 1} / ${LEVELS.length}`;
    }

    if (ui.fill) {
      ui.fill.style.width =
        `${((levelIndex + 1) / LEVELS.length) * 100}%`;
    }

    if (ui.next) {
      ui.next.disabled = levelIndex >= unlocked;
    }
  }

  function message(text, duration = 180) {
    if (ui.hint) ui.hint.textContent = text;
    messageFrames = duration;
  }

  function loadLevel(index) {
    levelIndex = clamp(index, 0, LEVELS.length - 1);
    level = LEVELS[levelIndex];

    grid = makeGrid(level);

    ghosts = [];
    recording = [];
    particles = [];

    frame = 0;
    roundNumber = 1;

    won = false;
    dead = false;
    paused = false;

    doors = { a: false, b: false, c: false };

    plates = [];

    startCell = findSymbol("S", { x: 1, y: 9 });
    exitCell = findSymbol("E", { x: 18, y: 9 });

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = grid[y][x];

        if ("123".includes(tile)) {
          plates.push({
            id: tile,
            x,
            y,
            active: false
          });
        }
      }
    }

    player = createPlayer(
      startCell.x * TILE + 7,
      startCell.y * TILE + 3
    );

    roundDuration =
      clamp(Number(level.t) || 8, 4, 30) * 60;

    createStars();
    updateUI();
    saveGame();

    if (ui.win) ui.win.classList.remove("show");

    message(
      level.h || "تحرك واقفز، واستعن بنسختك السابقة لفتح الأبواب.",
      240
    );
  }

  function tileAtPixel(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);

    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) {
      return "#";
    }

    return grid[ty]?.[tx] || ".";
  }

  function isSolid(tile) {
    if (tile === "#") return true;

    if (tile === "a" || tile === "b" || tile === "c") {
      return !doors[tile];
    }

    return false;
  }

  function hitsWall(x, y, w, h) {
    const left = Math.floor(x / TILE);
    const right = Math.floor((x + w - 1) / TILE);
    const top = Math.floor(y / TILE);
    const bottom = Math.floor((y + h - 1) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (
          tx < 0 || tx >= COLS ||
          ty < 0 || ty >= ROWS
        ) {
          return true;
        }

        if (isSolid(grid[ty]?.[tx] || ".")) {
          return true;
        }
      }
    }

    return false;
  }

  function touchesSymbol(entity, symbol) {
    const left = Math.floor(entity.x / TILE);
    const right = Math.floor((entity.x + entity.w - 1) / TILE);
    const top = Math.floor(entity.y / TILE);
    const bottom = Math.floor((entity.y + entity.h - 1) / TILE);

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (grid[y]?.[x] === symbol) return true;
      }
    }

    return false;
  }

  function moveEntity(entity, dx, dy) {
    if (dx !== 0) {
      const nx = entity.x + dx;

      if (!hitsWall(nx, entity.y, entity.w, entity.h)) {
        entity.x = nx;
      } else {
        entity.vx = 0;
      }
    }

    if (dy !== 0) {
      const ny = entity.y + dy;

      if (!hitsWall(entity.x, ny, entity.w, entity.h)) {
        entity.y = ny;
        entity.onGround = false;
      } else {
        if (dy > 0) entity.onGround = true;
        entity.vy = 0;
      }
    }
  }

  function getInput() {
    return {
      left: !!(
        keys.ArrowLeft ||
        keys.KeyA ||
        touch.left
      ),

      right: !!(
        keys.ArrowRight ||
        keys.KeyD ||
        touch.right
      ),

      jump: !!(
        keys.ArrowUp ||
        keys.KeyW ||
        keys.Space ||
        touch.jump
      )
    };
  }

  function updatePlayer() {
    if (!player || won || dead || paused) return;

    const input = getInput();

    player.vx = 0;

    if (input.left) {
      player.vx = -player.speed;
      player.facing = -1;
    }

    if (input.right) {
      player.vx = player.speed;
      player.facing = 1;
    }

    if (input.jump && player.onGround) {
      player.vy = player.jumpPower;
      player.onGround = false;
    }

    player.vy = Math.min(player.vy + 0.43, 10);

    moveEntity(player, player.vx, 0);
    moveEntity(player, 0, player.vy);

    player.x = clamp(player.x, 0, W - player.w);
    player.frame++;

    if (touchesSymbol(player, "^")) {
      die();
      return;
    }

    if (
      Math.abs(player.x / TILE - exitCell.x) < 0.8 &&
      Math.abs(player.y / TILE - exitCell.y) < 0.9
    ) {
      winLevel();
    }
  }

  function rectOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function updateGhosts() {
    for (const ghost of ghosts) {
      const pose = ghost.path[frame];

      if (pose) {
        ghost.x = pose.x;
        ghost.y = pose.y;
        ghost.facing = pose.facing;
      } else {
        ghost.finished = true;
      }
    }
  }

  function updatePlatesAndDoors() {
    for (const plate of plates) {
      const box = {
        x: plate.x * TILE + 5,
        y: plate.y * TILE + 19,
        w: TILE - 10,
        h: 18
      };

      let pressed = rectOverlap(player, box);

      if (!pressed) {
        for (const ghost of ghosts) {
          if (ghost.finished) continue;

          const ghostBox = {
            x: ghost.x,
            y: ghost.y,
            w: player.w,
            h: player.h
          };

          if (rectOverlap(ghostBox, box)) {
            pressed = true;
            break;
          }
        }
      }

      plate.active = pressed;
      doors[String.fromCharCode(96 + Number(plate.id))] = pressed;
    }
  }

  function finishRound() {
    if (recording.length) {
      ghosts.push({
        path: recording.map(p => ({ ...p })),
        x: recording[0].x,
        y: recording[0].y,
        facing: recording[0].facing,
        finished: false
      });
    }

    recording = [];
    frame = 0;
    roundNumber++;

    if (player) {
      player.x = startCell.x * TILE + 7;
      player.y = startCell.y * TILE + 3;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
    }

    updateGhosts();
    updatePlatesAndDoors();

    message(
      `الجولة ${roundNumber}: تعاون مع نسختك السابقة!`,
      150
    );
  }

  function die() {
    if (dead || won) return;

    dead = true;
    createBurst(
      player.x + player.w / 2,
      player.y + player.h / 2,
      "#ff687c"
    );

    message("حاول مرة أخرى! اضغط إعادة المحاولة.", 240);

    setTimeout(() => {
      if (dead && !won) restartLevel();
    }, 700);
  }

  function winLevel() {
    if (won) return;

    won = true;

    unlocked = Math.max(
      unlocked,
      Math.min(levelIndex + 1, LEVELS.length - 1)
    );

    saveGame();

    createBurst(
      player.x + player.w / 2,
      player.y + player.h / 2,
      worldFor().glow
    );

    if (ui.winTitle) {
      ui.winTitle.textContent =
        levelIndex === LEVELS.length - 1
          ? "أكملت اللعبة!"
          : "نجحت في المستوى!";
    }

    if (ui.winPoints) {
      ui.winPoints.textContent =
        `الجولة ${roundNumber} — المستوى ${levelIndex + 1}`;
    }

    if (ui.winNext) {
      ui.winNext.textContent =
        levelIndex === LEVELS.length - 1
          ? "العب من جديد"
          : "المستوى التالي";
    }

    if (ui.win) {
      ui.win.classList.add("show");
    } else {
      message("رائع! لقد أكملت المستوى.", 240);
    }
  }

  function restartLevel() {
    loadLevel(levelIndex);
  }

  function nextLevel() {
    if (levelIndex < LEVELS.length - 1) {
      if (levelIndex + 1 > unlocked) return;
      loadLevel(levelIndex + 1);
    } else {
      loadLevel(0);
    }
  }

  function createBurst(x, y, color) {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 35 + Math.random() * 25,
        color,
        size: 2 + Math.random() * 4
      });
    }
  }

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life--;
    }

    particles = particles.filter(p => p.life > 0);
  }

  function update() {
    if (!started || paused) return;

    updateParticles();

    if (messageFrames > 0) messageFrames--;

    if (won || dead) return;

    updateGhosts();
    updatePlayer();

    if (won || dead) return;

    recording.push({
      x: player.x,
      y: player.y,
      facing: player.facing
    });

    updatePlatesAndDoors();

    frame++;

    if (frame >= roundDuration) {
      finishRound();
    }
  }

  function drawBackground() {
    const world = worldFor();

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, world.sky);
    gradient.addColorStop(1, world.sky2);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    for (const star of stars) {
      const alpha =
        0.35 + 0.45 * Math.sin(performance.now() / 800 + star.phase);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    drawBackgroundShapes(world);
  }

  function drawBackgroundShapes(world) {
    const worldIndex = Number(level?.world) || 0;

    ctx.save();

    if (worldIndex === 0) {
      for (let i = 0; i < 9; i++) {
        const x = i * 105 - 20;

        ctx.fillStyle = "rgba(5, 24, 27, 0.3)";
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.lineTo(x + 45, 100 + (i % 3) * 35);
        ctx.lineTo(x + 105, H);
        ctx.fill();

        ctx.fillStyle = "rgba(100, 200, 140, 0.12)";
        ctx.beginPath();
        ctx.arc(x + 52, 180 + (i % 2) * 30, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (worldIndex === 1) {
      for (let i = 0; i < 8; i++) {
        const x = i * 115;

        ctx.fillStyle = "rgba(20, 15, 25, 0.3)";
        ctx.fillRect(x + 15, 115, 22, 180);

        ctx.fillRect(x, 110, 52, 13);

        ctx.fillStyle = "rgba(255, 210, 130, 0.08)";
        ctx.fillRect(x + 18, 125, 4, 165);
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const x = i * 85 + 10;
        const y = 120 + (i % 4) * 35;

        ctx.fillStyle = "rgba(115, 210, 255, 0.09)";
        ctx.beginPath();
        ctx.moveTo(x, y + 45);
        ctx.lineTo(x + 25, y);
        ctx.lineTo(x + 50, y + 45);
        ctx.lineTo(x + 25, y + 70);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawBlock(x, y, world) {
    const px = x * TILE;
    const py = y * TILE;

    ctx.fillStyle = world.block;
    ctx.fillRect(px, py, TILE, TILE);

    ctx.fillStyle = world.top;
    ctx.fillRect(px, py, TILE, 5);

    ctx.fillStyle = world.edge;
    ctx.fillRect(px, py + 5, 3, TILE - 5);

    ctx.fillStyle = "rgba(0,0,0,0.13)";
    ctx.fillRect(px, py + TILE - 4, TILE, 4);

    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
  }

  function drawDoor(x, y, symbol, world) {
    const px = x * TILE;
    const py = y * TILE;
    const active = doors[symbol];

    if (active) {
      ctx.fillStyle = "rgba(120,255,190,0.12)";
      ctx.fillRect(px + 5, py + 2, TILE - 10, TILE - 4);

      ctx.strokeStyle = world.glow;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 5, py + 2, TILE - 10, TILE - 4);
      ctx.lineWidth = 1;
      return;
    }

    ctx.fillStyle = world.block;
    ctx.fillRect(px + 4, py + 1, TILE - 8, TILE - 1);

    ctx.strokeStyle = world.edge;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 5, py + 2, TILE - 10, TILE - 4);

    ctx.fillStyle = world.glow;

    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px + 10 + i * 8, py + 8, 3, TILE - 15);
    }

    ctx.lineWidth = 1;
  }

  function drawPlate(plate, world) {
    const x = plate.x * TILE;
    const y = plate.y * TILE;

    ctx.fillStyle = plate.active ? world.glow : "#34434d";

    roundedRect(x + 6, y + 25, TILE - 12, 8, 3);
    ctx.fill();

    if (plate.active) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = world.glow;
      ctx.fillStyle = world.glow;
      roundedRect(x + 6, y + 25, TILE - 12, 8, 3);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(plate.id, x + TILE / 2, y + 20);
  }

  function drawSpikes(x, y, world) {
    const px = x * TILE;
    const py = y * TILE;

    ctx.fillStyle = "#f36c85";

    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 10, py + TILE);
      ctx.lineTo(px + i * 10 + 5, py + 8);
      ctx.lineTo(px + i * 10 + 10, py + TILE);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = world.block;
    ctx.fillRect(px, py + TILE - 3, TILE, 3);
  }

  function drawExit(world) {
    const x = exitCell.x * TILE;
    const y = exitCell.y * TILE;

    ctx.save();

    ctx.shadowBlur = 18;
    ctx.shadowColor = world.glow;

    ctx.strokeStyle = world.glow;
    ctx.lineWidth = 3;

    roundedRect(x + 8, y + 3, TILE - 16, TILE - 6, 10);
    ctx.stroke();

    ctx.fillStyle = "rgba(150,255,220,0.18)";
    roundedRect(x + 8, y + 3, TILE - 16, TILE - 6, 10);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("E", x + TILE / 2, y + 26);
  }

  function drawCharacter(entity, character, ghost = false) {
    if (!entity) return;

    const x = entity.x;
    const y = entity.y;
    const color = character.color;

    ctx.save();

    ctx.globalAlpha = ghost ? 0.4 : 1;

    if (ghost) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(
      x + entity.w / 2,
      y + entity.h + 2,
      entity.w * 0.58,
      4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Legs
    ctx.fillStyle = color;

    const legMove = ghost ? 0 : Math.sin(entity.frame * 0.18) * 2;

    roundedRect(x + 4, y + 24, 8, 10 + legMove, 3);
    ctx.fill();

    roundedRect(x + 15, y + 24, 8, 10 - legMove, 3);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    roundedRect(x + 2, y + 11, 22, 17, 6);
    ctx.fill();

    // Face
    ctx.fillStyle = character.secondary;
    roundedRect(x + 4, y + 1, 19, 16, 6);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#182733";

    const eyeX = entity.facing < 0 ? x + 7 : x + 15;

    ctx.beginPath();
    ctx.arc(eyeX, y + 8, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(eyeX + 5, y + 8, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Character accent
    ctx.fillStyle = ghost ? "#ffffff" : color;
    roundedRect(x + 7, y + 15, 12, 4, 2);
    ctx.fill();

    ctx.restore();
  }

  function drawWorld() {
    const world = worldFor();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = grid[y][x];

        if (tile === "#") {
          drawBlock(x, y, world);
        } else if (tile === "a" || tile === "b" || tile === "c") {
          drawDoor(x, y, tile, world);
        } else if (tile === "^") {
          drawSpikes(x, y, world);
        }
      }
    }

    for (const plate of plates) {
      drawPlate(plate, world);
    }

    drawExit(world);
  }

  function drawTimer() {
    if (!started || won || dead) return;

    const remaining = Math.max(
      0,
      (roundDuration - frame) / roundDuration
    );

    const barWidth = 180;
    const x = W - barWidth - 18;
    const y = 14;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundedRect(x, y, barWidth, 10, 5);
    ctx.fill();

    ctx.fillStyle =
      remaining < 0.2 ? "#ff7187" : worldFor().glow;

    roundedRect(
      x,
      y,
      barWidth * remaining,
      10,
      5
    );

    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `الجولة ${roundNumber}`,
      x,
      y + 25
    );
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    ctx.globalAlpha = 1;
  }

  function render() {
    drawBackground();

    if (level) {
      drawWorld();

      for (const ghost of ghosts) {
        if (!ghost.finished) {
          drawCharacter(
            ghost,
            CHARACTERS[characterIndex],
            true
          );
        }
      }

      drawCharacter(
        player,
        CHARACTERS[characterIndex],
        false
      );

      drawTimer();
    }

    drawParticles();

    if (!started) {
      ctx.fillStyle = "rgba(5,10,25,0.24)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function loop(time) {
    if (!lastTime) lastTime = time;

    const delta = Math.min(time - lastTime, 100);
    lastTime = time;

    accumulator += delta;

    const STEP_MS = 1000 / 60;

    while (accumulator >= STEP_MS) {
      update();
      accumulator -= STEP_MS;
    }

    render();

    animationFrame = requestAnimationFrame(loop);
  }

  function startGame() {
    started = true;
    paused = false;

    if (ui.menu) {
      ui.menu.classList.remove("show");
      ui.menu.style.display = "none";
    }

    loadLevel(levelIndex);
  }

  function chooseCharacter(index) {
    characterIndex = clamp(index, 0, CHARACTERS.length - 1);
    saveGame();

    if (ui.characters) {
      const items = ui.characters.querySelectorAll("button");

      items.forEach((button, i) => {
        button.classList.toggle("selected", i === characterIndex);
        button.setAttribute(
          "aria-pressed",
          i === characterIndex ? "true" : "false"
        );
      });
    }
  }

  function bindEvents() {
    window.addEventListener("keydown", event => {
      const blocked = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Space"
      ];

      if (blocked.includes(event.code)) {
        event.preventDefault();
      }

      keys[event.code] = true;

      if (event.code === "KeyR") restartLevel();

      if (event.code === "Escape") {
        paused = !paused;
        message(paused ? "اللعبة متوقفة مؤقتًا." : "واصل اللعب.");
      }
    });

    window.addEventListener("keyup", event => {
      keys[event.code] = false;
    });

    window.addEventListener("blur", () => {
      keys = Object.create(null);
      touch.left = false;
      touch.right = false;
      touch.jump = false;
    });

    if (ui.reset) {
      ui.reset.addEventListener("click", restartLevel);
    }

    if (ui.next) {
      ui.next.addEventListener("click", nextLevel);
    }

    if (ui.winNext) {
      ui.winNext.addEventListener("click", () => {
        if (ui.win) ui.win.classList.remove("show");
        nextLevel();
      });
    }

    if (ui.go) {
      ui.go.addEventListener("click", startGame);
    }

    if (ui.characters) {
      const buttons = ui.characters.querySelectorAll("button");

      buttons.forEach((button, index) => {
        button.addEventListener("click", () => {
          chooseCharacter(index);
        });
      });
    }

    const controls = [
      { ids: ["left", "btnLeft", "l"], key: "left" },
      { ids: ["right", "btnRight", "r"], key: "right" },
      { ids: ["jump", "btnJump", "j"], key: "jump" }
    ];

    for (const control of controls) {
      let button = null;

      for (const id of control.ids) {
        button = $(id);
        if (button) break;
      }

      if (!button) continue;

      const press = event => {
        event.preventDefault();
        touch[control.key] = true;

        if (button.setPointerCapture && event.pointerId !== undefined) {
          try {
            button.setPointerCapture(event.pointerId);
          } catch {}
        }
      };

      const release = event => {
        event.preventDefault();
        touch[control.key] = false;
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
      button.addEventListener("contextmenu", e => e.preventDefault());
    }
  }

  function setupMenu() {
    if (ui.menu) {
      ui.menu.classList.add("show");
      ui.menu.style.display = "";
    }

    if (ui.characters) {
      const buttons = ui.characters.querySelectorAll("button");

      buttons.forEach((button, index) => {
        button.classList.toggle(
          "selected",
          index === characterIndex
        );
      });
    }
  }

  function init() {
    canvas.width = W;
    canvas.height = H;

    bindEvents();
    loadLevel(levelIndex);
    setupMenu();

    if (ui.win) {
      ui.win.classList.remove("show");
    }

    animationFrame = requestAnimationFrame(loop);
  }

  window.YOUR_OLD_VERSION = {
    restart: restartLevel,
    next: nextLevel,
    loadLevel,
    chooseCharacter,
    getState: () => ({
      level: levelIndex + 1,
      unlockedLevel: unlocked + 1,
      character: CHARACTERS[characterIndex].name,
      round: roundNumber,
      started,
      won
    })
  };

  init();
})();
