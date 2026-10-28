"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");

  const TOTAL_LEVELS = 60;
  const LEVELS_PER_WORLD = 10;

  const WORLDS = [
    {
      name: "رمال مصر القديمة",
      sky: ["#66b7d0", "#f1d09a"],
      ground: "#c49a63",
      grass: "#75864a",
      stone: "#b9a17c",
      dark: "#795638",
      accent: "#f4cf77",
      enemy: "mummy"
    },
    {
      name: "معبد الأسرار",
      sky: ["#446f7d", "#c4a578"],
      ground: "#9b7854",
      grass: "#61714b",
      stone: "#d0b38a",
      dark: "#604a36",
      accent: "#f3cf78",
      enemy: "guardian"
    },
    {
      name: "أعماق الأهرامات",
      sky: ["#161d39", "#58425b"],
      ground: "#51464c",
      grass: "#71634b",
      stone: "#82756b",
      dark: "#302d39",
      accent: "#a9a0ff",
      enemy: "mummy"
    },
    {
      name: "وادي الفراعنة",
      sky: ["#b66d55", "#f1c18a"],
      ground: "#b28a63",
      grass: "#6e7747",
      stone: "#c1a17a",
      dark: "#76513d",
      accent: "#ffe18a",
      enemy: "guardian"
    },
    {
      name: "المدينة المفقودة",
      sky: ["#244b61", "#789e9b"],
      ground: "#776a58",
      grass: "#58734f",
      stone: "#b4ad8b",
      dark: "#46473f",
      accent: "#76f0df",
      enemy: "phantom"
    },
    {
      name: "قلعة الظلال",
      sky: ["#17182c", "#654050"],
      ground: "#4b3e4b",
      grass: "#665044",
      stone: "#85717c",
      dark: "#292332",
      accent: "#e4a4ff",
      enemy: "guardian"
    }
  ];

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const random = (a, b) => a + Math.random() * (b - a);

  function ar(n) {
    return Math.floor(n).toLocaleString("ar-EG");
  }

  function worldIndex(level) {
    return Math.floor((level - 1) / LEVELS_PER_WORLD);
  }

  function levelIndex(level) {
    return ((level - 1) % LEVELS_PER_WORLD) + 1;
  }

  function loadSave() {
    const defaults = {
      coins: 0,
      unlockedLevel: 1,
      sound: true,
      screenShake: true
    };

    try {
      const saved = JSON.parse(
        localStorage.getItem("m11_old_version_save") || "null"
      );

      if (!saved || typeof saved !== "object") return defaults;

      return {
        coins: Math.max(0, Number(saved.coins) || 0),
        unlockedLevel: clamp(
          Math.floor(Number(saved.unlockedLevel) || 1),
          1,
          TOTAL_LEVELS
        ),
        sound: saved.sound !== false,
        screenShake: saved.screenShake !== false
      };
    } catch {
      return defaults;
    }
  }

  let save = loadSave();

  let W = 960;
  let H = 540;
  let DPR = 1;

  let level = 1;
  let cameraX = 0;
  let cameraY = 0;

  let running = false;
  let paused = false;
  let finished = false;

  let raf = 0;
  let lastTime = 0;
  let audio = null;
  let shake = 0;
  let lastWarning = 0;

  const input = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
  };

  const world = {
    width: 4600,
    groundY: 0,
    platforms: [],
    coins: [],
    enemies: [],
    decorations: [],
    particles: [],
    exit: null,
    player: null
  };

  function persist() {
    try {
      localStorage.setItem(
        "m11_old_version_save",
        JSON.stringify(save)
      );
    } catch {}
  }

  function showScreen(name) {
    ["loading", "menu", "play", "worlds", "settings"].forEach(key => {
      const el = ({
        loading: $("loading-screen"),
        menu: $("main-menu"),
        play: $("play-screen"),
        worlds: $("worlds-screen"),
        settings: $("settings-screen")
      })[key];

      el.classList.toggle("hidden", key !== name);
    });
  }

  function hideOverlays() {
    [
      "pause-screen",
      "result-screen",
      "game-over-screen"
    ].forEach(id => $(id).classList.add("hidden"));
  }

  function message(text, force = false) {
    const now = performance.now();

    if (!force && now - lastWarning < 2600) return;

    lastWarning = now;
    $("shadow-text").textContent = text;

    $("shadow-message").animate(
      [
        { opacity: 0.5, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 220 }
    );
  }

  function tone(freq = 440, duration = 0.07) {
    if (!save.sound) return;

    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;

      audio ||= new Audio();

      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration
      );

      osc.connect(gain);
      gain.connect(audio.destination);

      osc.start();
      osc.stop(audio.currentTime + duration);
    } catch {}
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    W = rect.width;
    H = rect.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (world.player && world.player.y > world.groundY) {
      world.player.y = world.groundY - world.player.h;
    }
  }

  function makePlayer() {
    return {
      x: 70,
      y: 0,
      w: 34,
      h: 49,
      vx: 0,
      vy: 0,
      speed: 275,
      jumpPower: 650,
      grounded: false,
      facing: 1,
      lives: 3,
      invulnerable: 0,
      walk: 0,
      spawnX: 70,
      spawnY: 0
    };
  }

  function platform(x, y, w, h, type = "stone") {
    world.platforms.push({ x, y, w, h, type });
  }

  function coin(x, y) {
    world.coins.push({
      x, y,
      r: 12,
      collected: false,
      phase: random(0, 6)
    });
  }

  function enemy(x, type, minX, maxX) {
    world.enemies.push({
      x,
      y: world.groundY - 42,
      w: 35,
      h: 42,
      vx: random(40, 60),
      minX,
      maxX,
      type,
      alive: true,
      phase: random(0, 6)
    });
  }

  function buildLevel(n) {
    level = clamp(n, 1, TOTAL_LEVELS);

    const wi = worldIndex(level);
    const theme = WORLDS[wi];

    world.width = 4600 + level * 35;
    world.groundY = H - Math.max(65, H * 0.16);

    world.platforms = [];
    world.coins = [];
    world.enemies = [];
    world.decorations = [];
    world.particles = [];

    const gy = world.groundY;

    // الأرض مع فجوات متفاوتة.
    let x = 0;
    let section = 0;

    while (x < world.width) {
      const length = random(340, 530);
      const gap = level >= 3 && section % 3 === 1
        ? random(65, 100)
        : 0;

      platform(
        x,
        gy,
        Math.min(length, world.width - x),
        H - gy + 150,
        "ground"
      );

      x += length + gap;
      section++;
    }

    // منصات حجرية موزعة على ارتفاعات مختلفة.
    const count = 18 + Math.min(level, 14);

    for (let i = 0; i < count; i++) {
      const px = 230 + i * 225 + random(-30, 30);
      const py = gy - random(90, Math.min(H * 0.46, 225));
      const pw = random(90, 160);

      if (px + pw < world.width - 150) {
        platform(px, py, pw, 22, i % 3 === 0 ? "ruins" : "stone");

        if (i % 2 === 0) {
          coin(px + pw / 2, py - 30);
        }
      }
    }

    // سلالم متضررة وآثار.
    for (let i = 0; i < 12; i++) {
      const sx = 260 + i * 355;
      const sh = random(80, 150);

      world.decorations.push({
        type: "ladder",
        x: sx,
        y: gy,
        h: sh,
        broken: (i + level) % 3 === 0
      });
    }

    // العملات.
    for (let i = 0; i < 54; i++) {
      const cx = 170 + i * 81;

      if (cx < world.width - 140) {
        coin(cx, gy - 36 - (i % 3) * 20);
      }
    }

    // أعداء يختلف شكلهم حسب العالم.
    for (let i = 0; i < 7 + Math.min(level, 12); i++) {
      const ex = 560 + i * 300;

      if (ex < world.width - 180) {
        let type = theme.enemy;

        if (wi === 0 && i % 3 === 0) type = "scarab";
        if (wi === 1 && i % 2 === 0) type = "guardian";
        if (wi === 2 && i % 3 === 0) type = "phantom";
        if (wi === 3 && i % 2 === 0) type = "guardian";
        if (wi === 4 && i % 2 === 0) type = "phantom";
        if (wi === 5) type = i % 2 ? "guardian" : "phantom";

        enemy(ex, type, ex - 70, ex + 90);
      }
    }

    // زخارف الخلفية.
    const decoTypes = ["palm", "pillar", "obelisk", "ruin", "rock"];

    for (let i = 0; i < 90; i++) {
      world.decorations.push({
        type: decoTypes[(i + wi) % decoTypes.length],
        x: i * 62 + random(0, 35),
        y: gy,
        scale: random(0.65, 1.25),
        phase: random(0, 6)
      });
    }

    world.exit = {
      x: world.width - 115,
      y: gy - 100,
      w: 54,
      h: 100
    };

    world.player = makePlayer();
    world.player.y = gy - world.player.h;
    world.player.spawnY = world.player.y;

    cameraX = 0;
    cameraY = 0;
    shake = 0;
    finished = false;

    $("world-name").textContent = theme.name;
    $("level-name").textContent =
      "المستوى " + ar(wi + 1) + " - " + ar(levelIndex(level));

    updateHUD();
    renderWorlds();

    message(
      level === 1
        ? "أنا ظلك يا أنطونيو! اجمع الجنيهات، وانتبه للأطلال."
        : "وصلنا لمنطقة جديدة. راقب الطريق، فالأسرار في كل مكان!",
      true
    );
  }

  function updateHUD() {
    $("coin-count").textContent = ar(save.coins);
    $("life-count").textContent = ar(
      world.player ? world.player.lives : 3
    );
  }

  function renderWorlds() {
    const list = $("world-list");
    list.replaceChildren();

    WORLDS.forEach((theme, wi) => {
      const first = wi * 10 + 1;
      const last = first + 9;
      const unlocked = save.unlockedLevel >= first;

      const card = document.createElement("article");
      card.className = "world-card " +
        (unlocked ? "unlocked" : "locked");

      const title = document.createElement("strong");
      title.textContent = "العالم " + ar(wi + 1);

      const name = document.createElement("span");
      name.textContent = theme.name;

      const desc = document.createElement("span");
      desc.textContent = unlocked
        ? "اكتشف الآثار، واجمع الكنوز، وتجاوز الحراس."
        : "أكمل العالم السابق لفتح هذه المنطقة.";

      const progress = document.createElement("span");
      progress.textContent =
        "المستويات " + ar(first) + " - " + ar(last);

      const btn = document.createElement("button");
      btn.textContent = unlocked ? "دخول العالم" : "مغلق";
      btn.disabled = !unlocked;

      btn.addEventListener("click", () => {
        startLevel(Math.max(first, Math.min(last, save.unlockedLevel)));
      });

      card.append(title, name, desc, progress, btn);
      list.append(card);
    });
  }

  function startLevel(n) {
    cancelAnimationFrame(raf);

    hideOverlays();
    showScreen("play");

    paused = false;
    running = true;

    resize();
    buildLevel(n);

    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!running || paused || finished) return;

    paused = true;
    $("pause-screen").classList.remove("hidden");
  }

  function resumeGame() {
    if (finished) return;

    hideOverlays();
    paused = false;
    lastTime = performance.now();

    raf = requestAnimationFrame(loop);
  }

  function home() {
    running = false;
    paused = false;
    finished = false;

    cancelAnimationFrame(raf);
    hideOverlays();
    showScreen("menu");
    renderWorlds();
  }

  function completeLevel() {
    if (finished) return;

    finished = true;
    running = false;

    save.unlockedLevel = Math.max(
      save.unlockedLevel,
      Math.min(TOTAL_LEVELS, level + 1)
    );

    persist();

    $("result-title").textContent =
      level === TOTAL_LEVELS
        ? "اكتملت المغامرة!"
        : "أحسنت يا أنطونيو!";

    $("result-text").textContent =
      level === TOTAL_LEVELS
        ? "لقد كشفت أسرار مصر القديمة وأكملت المستويات الستين."
        : "أنهيت المستوى " + ar(level) + " بنجاح. استعد للمغامرة التالية.";

    $("next-level-button").textContent =
      level === TOTAL_LEVELS ? "القائمة الرئيسية" : "المستوى التالي";

    $("result-screen").classList.remove("hidden");

    tone(660, 0.1);
    setTimeout(() => tone(880, 0.15), 110);
  }

  function loseLife() {
    const p = world.player;

    if (p.invulnerable > 0 || finished) return;

    p.lives--;
    p.invulnerable = 1.7;

    updateHUD();

    if (save.screenShake) shake = 10;

    tone(145, 0.15);

    if (p.lives <= 0) {
      running = false;
      finished = true;
      $("game-over-screen").classList.remove("hidden");
      return;
    }

    p.x = p.spawnX;
    p.y = p.spawnY;
    p.vx = 0;
    p.vy = 0;

    message("خلي بالك يا أنطونيو! باقي لك " + ar(p.lives) + " محاولات.", true);
  }

  function collectCoin(c) {
    if (c.collected) return;

    c.collected = true;
    save.coins++;

    persist();
    updateHUD();
    tone(820, 0.06);

    for (let i = 0; i < 9; i++) {
      particle(c.x, c.y, "#ffd35b");
    }
  }

  function particle(x, y, color) {
    world.particles.push({
      x,
      y,
      vx: random(-100, 100),
      vy: random(-150, -25),
      life: 0.5,
      maxLife: 0.5,
      size: random(3, 6),
      color
    });
  }

  function overlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function update(dt) {
    const p = world.player;
    if (!p) return;

    dt = Math.min(dt, 0.033);

    p.invulnerable = Math.max(0, p.invulnerable - dt);

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    p.vx = dir * p.speed;

    if (dir) {
      p.facing = dir;
      p.walk += dt * 13;
    }

    if (input.jumpPressed && p.grounded) {
      p.vy = -p.jumpPower;
      p.grounded = false;
      tone(340, 0.06);
    }

    input.jumpPressed = false;

    p.vy += 1700 * dt;

    const oldY = p.y;

    p.x = clamp(p.x + p.vx * dt, 0, world.width - p.w);
    p.y += p.vy * dt;
    p.grounded = false;

    if (p.vy >= 0) {
      for (const plat of world.platforms) {
        if (
          p.x + p.w > plat.x &&
          p.x < plat.x + plat.w &&
          oldY + p.h <= plat.y &&
          p.y + p.h >= plat.y
        ) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;

          if (plat.type === "ground") {
            p.spawnX = Math.max(0, plat.x + 12);
            p.spawnY = p.y;
          }

          break;
        }
      }
    }

    for (const c of world.coins) {
      if (
        !c.collected &&
        overlap(p, {
          x: c.x - c.r,
          y: c.y - c.r,
          w: c.r * 2,
          h: c.r * 2
        })
      ) {
        collectCoin(c);
      }
    }

    for (const e of world.enemies) {
      if (!e.alive) continue;

      e.x += e.vx * dt;

      if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;

      e.y = world.groundY - e.h;

      if (!overlap(p, e)) continue;

      if (p.vy > 80 && p.y + p.h - e.y < 23) {
        e.alive = false;
        p.vy = -400;

        for (let i = 0; i < 12; i++) {
          particle(e.x + e.w / 2, e.y + e.h / 2, "#e8d3a3");
        }

        tone(250, 0.09);
        message("ممتاز يا أنطونيو! تخطيت الحارس.");
      } else {
        loseLife();
      }
    }

    if (p.y > H + 120) loseLife();

    // كاميرا تتبع البطل أفقيًا ورأسيًا.
    const targetX = clamp(
      p.x - W * 0.36,
      0,
      Math.max(0, world.width - W)
    );

    const targetY = clamp(
      p.y - H * 0.57,
      0,
      Math.max(0, world.groundY - H * 0.35)
    );

    cameraX += (targetX - cameraX) * Math.min(1, dt * 7);
    cameraY += (targetY - cameraY) * Math.min(1, dt * 5);

    // تحذيرات الظل.
    const now = performance.now();

    const near = world.enemies.some(e =>
      e.alive &&
      Math.abs(e.x - p.x) < 145 &&
      e.x > p.x - 10
    );

    if (near && now - lastWarning > 4500) {
      message("خلي بالك يا أنطونيو! فيه وحش قريب منك.");
    }

    if (p.x > 450 && p.x < 510 && now - lastWarning > 4500) {
      message("راقب الأرض! بعض الممرات فيها فجوات.");
    }

    if (overlap(p, world.exit)) completeLevel();

    shake *= Math.max(0, 1 - dt * 8);

    for (let i = world.particles.length - 1; i >= 0; i--) {
      const pt = world.particles[i];

      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 350 * dt;

      if (pt.life <= 0) world.particles.splice(i, 1);
    }
  }

  // =====================================================
  // الرسومات المطورة
  // =====================================================

  function drawBackground() {
    const theme = WORLDS[worldIndex(level)];

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // الشمس وهالة الضوء.
    const sx = W * 0.78 - cameraX * 0.035;
    const sy = H * 0.22 - cameraY * 0.02;

    const glow = ctx.createRadialGradient(sx, sy, 5, sx, sy, 95);
    glow.addColorStop(0, "#fff6d5cc");
    glow.addColorStop(1, "#fff6d500");

    ctx.fillStyle = glow;
    ctx.fillRect(sx - 100, sy - 100, 200, 200);

    // جبال بعيدة.
    ctx.save();
    ctx.translate(-cameraX * 0.13, -cameraY * 0.04);

    for (let i = -2; i < 12; i++) {
      const x = i * 230;
      const y = world.groundY + 10;

      ctx.fillStyle = i % 2 ? "#8e827a66" : "#685e6655";

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 120, y - 110 - (i % 3) * 25);
      ctx.lineTo(x + 260, y);
      ctx.closePath();
      ctx.fill();
    }

    // أهرامات متدرجة في الخلفية.
    for (let i = -1; i < 9; i++) {
      const x = i * 330 + 120;
      const y = world.groundY + 4;

      ctx.fillStyle = "#c9a77988";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 85, y - 105);
      ctx.lineTo(x + 170, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f1d3a066";
      ctx.beginPath();
      ctx.moveTo(x + 85, y - 105);
      ctx.lineTo(x + 170, y);
      ctx.lineTo(x + 105, y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // آثار معمارية بعيدة في العوالم المتقدمة.
    const wi = worldIndex(level);

    if (wi >= 1) {
      ctx.save();
      ctx.translate(-cameraX * 0.22, -cameraY * 0.06);

      for (let i = 0; i < 12; i++) {
        const x = i * 250 + 80;
        const y = world.groundY;

        ctx.fillStyle = "#66564b66";
        ctx.fillRect(x, y - 135, 22, 135);

        ctx.fillStyle = "#c7ab7c66";
        ctx.fillRect(x - 8, y - 143, 38, 12);

        ctx.fillRect(x + 45, y - 90, 15, 90);
      }

      ctx.restore();
    }
  }

  function drawGround() {
    const theme = WORLDS[worldIndex(level)];

    for (const p of world.platforms) {
      const x = p.x - cameraX;
      const y = p.y - cameraY;

      if (x + p.w < -20 || x > W + 20) continue;

      if (p.type === "ground") {
        ctx.fillStyle = theme.ground;
        ctx.fillRect(x, y, p.w, p.h);

        ctx.fillStyle = theme.grass;
        ctx.fillRect(x, y, p.w, 8);

        // حبيبات الرمال والحجارة.
        for (let tx = x + 13; tx < x + p.w; tx += 38) {
          ctx.fillStyle = tx % 2 ? "#e9c38c66" : "#76583c55";

          ctx.beginPath();
          ctx.ellipse(tx, y + 23, 4, 2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillRect(tx + 7, y + 36, 3, 2);
        }
      } else {
        // منصة حجرية ذات حافة ثلاثية الأبعاد.
        ctx.fillStyle = theme.dark;
        ctx.fillRect(x, y + 5, p.w, p.h);

        ctx.fillStyle = theme.stone;
        ctx.fillRect(x, y, p.w, p.h - 3);

        ctx.fillStyle = "#f3dbad99";
        ctx.fillRect(x, y, p.w, 4);

        ctx.strokeStyle = "#51423888";
        ctx.lineWidth = 1;

        for (let tx = x + 28; tx < x + p.w; tx += 34) {
          ctx.beginPath();
          ctx.moveTo(tx, y + 5);
          ctx.lineTo(tx - 5, y + p.h - 2);
          ctx.stroke();
        }

        ctx.strokeStyle = "#594a3c55";
        ctx.beginPath();
        ctx.moveTo(x, y + 12);
        ctx.lineTo(x + p.w, y + 12);
        ctx.stroke();
      }
    }
  }

  function drawPalm(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.strokeStyle = "#69452b";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-9, -48, 3, -85);
    ctx.stroke();

    ctx.strokeStyle = "#456b3e";
    ctx.lineWidth = 6;

    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i * Math.PI / 6;

      ctx.beginPath();
      ctx.moveTo(3, -85);
      ctx.quadraticCurveTo(
        3 + Math.cos(a) * 28,
        -100 + Math.sin(a) * 16,
        3 + Math.cos(a) * 60,
        -75 + Math.sin(a) * 30
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawObelisk(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.fillStyle = "#89765c";
    ctx.fillRect(-12, -95, 24, 90);

    ctx.fillStyle = "#c6ad85";
    ctx.beginPath();
    ctx.moveTo(-12, -95);
    ctx.lineTo(0, -123);
    ctx.lineTo(12, -95);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#5d4939";
    ctx.fillRect(-15, -5, 30, 7);

    ctx.strokeStyle = "#6e573e";
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-6, -80 + i * 18);
      ctx.lineTo(6, -74 + i * 18);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawLadder(d) {
    const x = d.x - cameraX;
    const y = d.y - cameraY;

    if (x < -80 || x > W + 80) return;

    ctx.save();

    ctx.strokeStyle = "#64462e";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - d.h);
    ctx.moveTo(x + 34, y);
    ctx.lineTo(x + 34, y - d.h);

    for (let i = 12; i < d.h; i += 17) {
      if (d.broken && i > d.h * 0.55) continue;

      ctx.moveTo(x, y - i);
      ctx.lineTo(x + 34, y - i);
    }

    ctx.stroke();

    if (d.broken) {
      ctx.strokeStyle = "#b68d58";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(x - 3, y - d.h * 0.53);
      ctx.lineTo(x + 14, y - d.h * 0.43);
      ctx.lineTo(x + 39, y - d.h * 0.48);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDecorations() {
    for (const d of world.decorations) {
      const x = d.x - cameraX;
      const y = d.y - cameraY;

      if (x < -150 || x > W + 150) continue;

      if (d.type === "ladder") {
        drawLadder(d);
        continue;
      }

      if (d.type === "palm") {
        drawPalm(x, y, d.scale);
        continue;
      }

      if (d.type === "obelisk") {
        drawObelisk(x, y, d.scale);
        continue;
      }

      if (d.type === "pillar") {
        ctx.fillStyle = "#b59b77";
        ctx.fillRect(x, y - 85 * d.scale, 28 * d.scale, 85 * d.scale);

        ctx.fillStyle = "#e3c99c";
        ctx.fillRect(x - 6, y - 91 * d.scale, 40 * d.scale, 10);

        ctx.fillStyle = "#76604a";
        ctx.fillRect(x + 6, y - 75 * d.scale, 3, 62 * d.scale);

        continue;
      }

      if (d.type === "ruin") {
        ctx.fillStyle = "#87735a";
        ctx.fillRect(x, y - 45 * d.scale, 50 * d.scale, 45 * d.scale);

        ctx.fillStyle = "#bba17b";
        ctx.fillRect(x - 4, y - 49 * d.scale, 58 * d.scale, 7);

        ctx.fillStyle = "#5c4a39";
        ctx.fillRect(x + 10, y - 34 * d.scale, 7, 18);

        continue;
      }

      if (d.type === "rock") {
        ctx.fillStyle = "#8f775e";
        ctx.beginPath();
        ctx.moveTo(x - 19 * d.scale, y);
        ctx.lineTo(x - 12 * d.scale, y - 18 * d.scale);
        ctx.lineTo(x + 6 * d.scale, y - 25 * d.scale);
        ctx.lineTo(x + 23 * d.scale, y - 7 * d.scale);
        ctx.lineTo(x + 20 * d.scale, y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawCoin(c, time) {
    if (c.collected) return;

    const x = c.x - cameraX;
    const y = c.y - cameraY + Math.sin(time / 260 + c.phase) * 3;

    if (x < -30 || x > W + 30) return;

    // دوران بصري مع انعكاس الضوء.
    const spin = Math.abs(Math.cos(time / 350 + c.phase));
    const rx = 3 + spin * 9;

    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = "#ffd84e";
    ctx.shadowBlur = 15;

    const gold = ctx.createLinearGradient(-rx, -13, rx, 13);
    gold.addColorStop(0, "#8d5517");
    gold.addColorStop(0.25, "#ffdc63");
    gold.addColorStop(0.52, "#fff1ae");
    gold.addColorStop(0.75, "#d99828");
    gold.addColorStop(1, "#8e591b");

    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#8c5a19";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (spin > 0.25) {
      ctx.strokeStyle = "#fff0a5";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, rx - 3), 9, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#704315";
      ctx.font = "bold 12px Tahoma";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ج", 0, 0);
    }

    ctx.restore();
  }

  function drawMummy(e, x, y, time) {
    const bob = Math.sin(time / 170 + e.phase) * 2;

    ctx.save();
    ctx.translate(x + e.w / 2, y + bob);

    // الظل الأرضي.
    ctx.fillStyle = "#17141a66";
    ctx.beginPath();
    ctx.ellipse(0, e.h - 1, 21, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // الذراعان.
    ctx.strokeStyle = "#d5c5a3";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-19, 16);
    ctx.moveTo(10, 4);
    ctx.lineTo(19, 13);
    ctx.stroke();

    // الجسم.
    const bandage = ctx.createLinearGradient(-14, 0, 14, 0);
    bandage.addColorStop(0, "#a8997a");
    bandage.addColorStop(0.45, "#f0e2c1");
    bandage.addColorStop(1, "#b5a383");

    ctx.fillStyle = bandage;
    ctx.fillRect(-12, -1, 24, 27);

    // لفائف القماش.
    ctx.strokeStyle = "#8c795c";
    ctx.lineWidth = 3;

    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-12, 3 + i * 6);
      ctx.lineTo(12, 7 + i * 6);
      ctx.stroke();
    }

    // الرأس.
    ctx.fillStyle = "#e7d9b7";
    ctx.beginPath();
    ctx.ellipse(0, -12, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#9f8d6c";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-11, -17);
    ctx.lineTo(10, -11);
    ctx.moveTo(-10, -7);
    ctx.lineTo(9, -3);
    ctx.stroke();

    // العينان.
    ctx.fillStyle = "#36252b";
    ctx.beginPath();
    ctx.ellipse(-5, -12, 3, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -12, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb66c";
    ctx.fillRect(-6, -13, 2, 2);
    ctx.fillRect(4, -13, 2, 2);

    // القدمين.
    ctx.fillStyle = "#c4b18d";
    ctx.fillRect(-11, 25, 9, 12);
    ctx.fillRect(2, 25, 9, 12);

    ctx.restore();
  }

  function drawGuardian(e, x, y, time) {
    const bob = Math.sin(time / 200 + e.phase) * 2;

    ctx.save();
    ctx.translate(x + e.w / 2, y + bob);

    // ظل.
    ctx.fillStyle = "#16111d66";
    ctx.beginPath();
    ctx.ellipse(0, e.h - 1, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // الرداء.
    ctx.fillStyle = "#ad874b";
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(14, -4);
    ctx.lineTo(20, 34);
    ctx.lineTo(-20, 34);
    ctx.closePath();
    ctx.fill();

    // درع الصدر.
    ctx.fillStyle = "#e4c477";
    ctx.fillRect(-13, 1, 26, 17);

    ctx.fillStyle = "#866032";
    ctx.fillRect(-8, 4, 16, 11);

    // الرأس.
    ctx.fillStyle = "#c39c58";
    ctx.fillRect(-12, -24, 24, 22);

    // تاج فرعوني.
    ctx.fillStyle = "#e2c47b";
    ctx.fillRect(-15, -28, 30, 6);

    ctx.fillStyle = "#8f6b36";
    ctx.beginPath();
    ctx.moveTo(-10, -28);
    ctx.lineTo(-6, -38);
    ctx.lineTo(0, -28);
    ctx.lineTo(6, -38);
    ctx.lineTo(10, -28);
    ctx.closePath();
    ctx.fill();

    // العينان.
    ctx.fillStyle = "#2a1b25";
    ctx.fillRect(-8, -17, 5, 4);
    ctx.fillRect(3, -17, 5, 4);

    ctx.fillStyle = "#ffe38c";
    ctx.fillRect(-7, -17, 2, 2);
    ctx.fillRect(4, -17, 2, 2);

    // الذراعان.
    ctx.fillStyle = "#d0ad6a";
    ctx.fillRect(-19, 0, 7, 22);
    ctx.fillRect(12, 0, 7, 22);

    // العصا.
    ctx.strokeStyle = "#61472c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(22, -3);
    ctx.lineTo(22, 37);
    ctx.stroke();

    ctx.restore();
  }

  function drawPhantom(e, x, y, time) {
    const bob = Math.sin(time / 180 + e.phase) * 5;

    ctx.save();
    ctx.translate(x + e.w / 2, y + bob);

    ctx.globalAlpha = 0.82;

    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 38);
    glow.addColorStop(0, "#b8b7ff");
    glow.addColorStop(1, "#8574ff00");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9e98df";
    ctx.beginPath();
    ctx.moveTo(-15, -13);
    ctx.quadraticCurveTo(-15, -31, 0, -30);
    ctx.quadraticCurveTo(16, -29, 15, -13);
    ctx.lineTo(18, 20);
    ctx.lineTo(8, 14);
    ctx.lineTo(0, 23);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-18, 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#29243f";
    ctx.fillRect(-8, -14, 5, 6);
    ctx.fillRect(3, -14, 5, 6);

    ctx.fillStyle = "#fff0b4";
    ctx.fillRect(-7, -13, 2, 3);
    ctx.fillRect(4, -13, 2, 3);

    ctx.restore();
  }

  function drawEnemy(e, time) {
    if (!e.alive) return;

    const x = e.x - cameraX;
    const y = e.y - cameraY;

    if (x < -80 || x > W + 80) return;

    if (e.type === "guardian") {
      drawGuardian(e, x, y, time);
    } else if (e.type === "phantom") {
      drawPhantom(e, x, y, time);
    } else if (e.type === "scarab") {
      drawScarab(e, x, y, time);
    } else {
      drawMummy(e, x, y, time);
    }
  }

  function drawScarab(e, x, y, time) {
    const bob = Math.sin(time / 120 + e.phase) * 2;

    ctx.save();
    ctx.translate(x + e.w / 2, y + 24 + bob);

    ctx.fillStyle = "#2c4c3d";
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const shell = ctx.createLinearGradient(-12, -10, 12, 10);
    shell.addColorStop(0, "#79b66e");
    shell.addColorStop(0.5, "#356c4b");
    shell.addColorStop(1, "#173e32");

    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(0, -3, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#b0c78a";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 6);
    ctx.stroke();

    ctx.strokeStyle = "#263d30";
    ctx.lineWidth = 3;

    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, 4);
      ctx.lineTo(i * 13, 12);
      ctx.stroke();
    }

    ctx.fillStyle = "#e8cb6d";
    ctx.fillRect(-10, -5, 3, 3);
    ctx.fillRect(7, -5, 3, 3);

    ctx.restore();
  }

  function drawPlayer(time) {
    const p = world.player;
    if (!p) return;

    if (p.invulnerable > 0 && Math.floor(time / 90) % 2 === 0) {
      return;
    }

    const x = p.x - cameraX;
    const y = p.y - cameraY;

    ctx.save();
    ctx.translate(x + p.w / 2, y);
    ctx.scale(p.facing, 1);

    const walk = Math.abs(p.vx) > 1 ? Math.sin(p.walk) * 4 : 0;

    // ظل واقعي أسفل القدمين.
    ctx.fillStyle = "#1e1a1555";
    ctx.beginPath();
    ctx.ellipse(0, p.h - 1, 21, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // الحقيبة.
    ctx.fillStyle = "#63432b";
    ctx.fillRect(-16, 20, 10, 19);

    ctx.fillStyle = "#a67c45";
    ctx.fillRect(-16, 24, 10, 4);

    // الساقان.
    ctx.fillStyle = "#594632";
    ctx.fillRect(-10, 33, 8, 11 + walk);
    ctx.fillRect(3, 33, 8, 11 - walk);

    // الحذاء.
    ctx.fillStyle = "#33251d";
    ctx.fillRect(-14, 42 + walk, 13, 6);
    ctx.fillRect(2, 42 - walk, 14, 6);

    ctx.fillStyle = "#c29a5e";
    ctx.fillRect(-12, 43 + walk, 9, 2);
    ctx.fillRect(4, 43 - walk, 9, 2);

    // الجسم والملابس.
    const shirt = ctx.createLinearGradient(-12, 15, 12, 35);
    shirt.addColorStop(0, "#789b71");
    shirt.addColorStop(1, "#385b45");

    ctx.fillStyle = shirt;
    ctx.fillRect(-12, 15, 24, 21);

    // حزام المستكشف.
    ctx.fillStyle = "#b68b49";
    ctx.fillRect(-12, 29, 24, 4);

    ctx.fillStyle = "#f2d58b";
    ctx.fillRect(-3, 29, 6, 4);

    // الرقبة.
    ctx.fillStyle = "#bc865c";
    ctx.fillRect(-4, 11, 8, 7);

    // الذراعان.
    ctx.fillStyle = "#d1a076";
    ctx.fillRect(-16, 18, 6, 15);
    ctx.fillRect(10, 18, 6, 15);

    ctx.fillStyle = "#6c8c64";
    ctx.fillRect(-16, 18, 6, 7);
    ctx.fillRect(10, 18, 6, 7);

    // الرأس.
    ctx.fillStyle = "#d8a477";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // الأذن.
    ctx.fillStyle = "#b87f58";
    ctx.fillRect(8, 5, 4, 6);

    // الشعر.
    ctx.fillStyle = "#473126";
    ctx.beginPath();
    ctx.arc(0, 3, 10, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(-10, 1, 4, 8);

    // قبعة المستكشف.
    ctx.fillStyle = "#8b693c";
    ctx.fillRect(-12, 0, 24, 4);

    ctx.fillStyle = "#e2c38a";
    ctx.fillRect(-9, -7, 18, 8);

    ctx.fillStyle = "#b08a50";
    ctx.fillRect(-9, -2, 18, 3);

    ctx.fillStyle = "#f4dfae";
    ctx.fillRect(-5, -6, 9, 2);

    // العين والحاجب.
    ctx.fillStyle = "#3a2921";
    ctx.fillRect(4, 6, 3, 3);
    ctx.fillRect(3, 4, 5, 2);

    // وشاح صغير.
    ctx.fillStyle = "#b85d42";
    ctx.fillRect(-8, 16, 16, 4);

    ctx.fillStyle = "#d9895d";
    ctx.fillRect(3, 19, 5, 9);

    ctx.restore();
  }

  function drawExit(time) {
    const e = world.exit;

    if (!e) return;

    const x = e.x - cameraX;
    const y = e.y - cameraY;

    if (x < -100 || x > W + 100) return;

    ctx.save();

    // بوابة حجرية.
    ctx.fillStyle = "#806347";
    ctx.fillRect(x - 5, y, e.w + 10, e.h);

    ctx.fillStyle = "#cbb18a";
    ctx.fillRect(x, y, e.w, e.h);

    ctx.fillStyle = "#3a3040";
    ctx.beginPath();
    ctx.moveTo(x + 8, y + e.h);
    ctx.lineTo(x + 8, y + 30);
    ctx.quadraticCurveTo(
      x + e.w / 2,
      y - 8,
      x + e.w - 8,
      y + 30
    );
    ctx.lineTo(x + e.w - 8, y + e.h);
    ctx.closePath();
    ctx.fill();

    // رمز متوهج.
    ctx.shadowColor = "#ffd86a";
    ctx.shadowBlur = 16 + Math.sin(time / 150) * 5;

    ctx.fillStyle = "#ffdf83";
    ctx.beginPath();
    ctx.arc(x + e.w / 2, y + 48, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#fff0c6";
    ctx.font = "bold 12px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText("النهاية", x + e.w / 2, y - 12);

    ctx.restore();
  }

  function drawParticles() {
    for (const p of world.particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(
        p.x - cameraX,
        p.y - cameraY,
        p.size,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }
  }

  function render(time) {
    ctx.save();

    if (shake > 0.5) {
      ctx.translate(random(-shake, shake), random(-shake, shake));
    }

    drawBackground();
    drawDecorations();
    drawGround();

    for (const c of world.coins) {
      drawCoin(c, time);
    }

    for (const e of world.enemies) {
      drawEnemy(e, time);
    }

    drawExit(time);
    drawParticles();
    drawPlayer(time);

    ctx.restore();
  }

  function loop(time) {
    if (!running || paused || finished) return;

    const dt = Math.min((time - lastTime) / 1000, 0.033);
    lastTime = time;

    update(dt);
    render(time);

    if (running && !paused && !finished) {
      raf = requestAnimationFrame(loop);
    }
  }

  // =====================================================
  // التحكم
  // =====================================================

  function bindButton(id, key) {
    const button = $(id);

    const press = event => {
      event.preventDefault();

      input[key] = true;
      button.classList.add("is-pressed");

      if (key === "jump") input.jumpPressed = true;
    };

    const release = event => {
      if (event) event.preventDefault();

      input[key] = false;
      button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  bindButton("left-button", "left");
  bindButton("right-button", "right");
  bindButton("jump-button", "jump");

  window.addEventListener("keydown", e => {
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"]
        .includes(e.code)
    ) {
      e.preventDefault();
    }

    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;

    if (
      e.code === "Space" ||
      e.code === "ArrowUp" ||
      e.code === "KeyW"
    ) {
      if (!input.jump) input.jumpPressed = true;
      input.jump = true;
    }

    if (e.code === "Escape") {
      paused ? resumeGame() : pauseGame();
    }
  });

  window.addEventListener("keyup", e => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;

    if (
      e.code === "Space" ||
      e.code === "ArrowUp" ||
      e.code === "KeyW"
    ) {
      input.jump = false;
    }
  });

  window.addEventListener("blur", () => {
    input.left = false;
    input.right = false;
    input.jump = false;
  });

  $("start-button").addEventListener("click", () => startLevel(1));
  $("continue-button").addEventListener("click", () => startLevel(save.unlockedLevel));

  $("worlds-button").addEventListener("click", () => {
    renderWorlds();
    showScreen("worlds");
  });

  $("settings-button").addEventListener("click", () => showScreen("settings"));

  document.querySelectorAll("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => showScreen("menu"));
  });

  $("pause-button").addEventListener("click", pauseGame);
  $("resume-button").addEventListener("click", resumeGame);

  $("restart-level-button").addEventListener("click", () => startLevel(level));
  $("home-button").addEventListener("click", home);
  $("result-home-button").addEventListener("click", home);
  $("game-over-home-button").addEventListener("click", home);
  $("retry-button").addEventListener("click", () => startLevel(level));

  $("next-level-button").addEventListener("click", () => {
    if (level >= TOTAL_LEVELS) home();
    else startLevel(level + 1);
  });

  $("sound-toggle").checked = save.sound;
  $("shake-toggle").checked = save.screenShake;

  $("sound-toggle").addEventListener("change", e => {
    save.sound = e.target.checked;
    persist();
  });

  $("shake-toggle").addEventListener("change", e => {
    save.screenShake = e.target.checked;
    persist();
  });

  $("reset-progress-button").addEventListener("click", () => {
    if (!confirm("هل تريد إعادة العملات والتقدم إلى البداية؟")) return;

    save.coins = 0;
    save.unlockedLevel = 1;

    persist();
    updateHUD();
    renderWorlds();

    message("بدأنا رحلة جديدة يا أنطونيو!", true);
  });

  window.addEventListener("resize", () => {
    resize();

    if (world.player && world.player.grounded) {
      world.player.y = world.groundY - world.player.h;
      world.player.spawnY = world.player.y;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused) pauseGame();
  });

  function boot() {
    const bar = $("loading-progress");
    const label = $("loading-message");

    const texts = [
      "نجهز معدات أنطونيو...",
      "نرسم أطلال مصر القديمة...",
      "نوقظ الحراس القدماء...",
      "المغامرة جاهزة!"
    ];

    let step = 0;

    const timer = setInterval(() => {
      step++;

      bar.style.width = Math.min(step * 25, 100) + "%";
      label.textContent = texts[Math.min(step - 1, texts.length - 1)];

      if (step >= 4) {
        clearInterval(timer);

        setTimeout(() => {
          showScreen("menu");
          renderWorlds();
          persist();
        }, 350);
      }
    }, 220);
  }

  resize();
  renderWorlds();
  boot();
})();
