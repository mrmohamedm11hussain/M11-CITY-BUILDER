"use strict";

(() => {
const $ = (id) => document.getElementById(id);

const canvas = $("game-canvas");
const ctx = canvas.getContext("2d");

const screens = {
loading: $("loading-screen"),
menu: $("main-menu"),
play: $("play-screen"),
worlds: $("worlds-screen"),
settings: $("settings-screen")
};

const overlays = {
pause: $("pause-screen"),
result: $("result-screen"),
gameOver: $("game-over-screen")
};

const WORLD_NAMES = [
"رمال مصر القديمة",
"معبد الأسرار",
"أعماق الأهرامات",
"وادي الفراعنة",
"المدينة المفقودة",
"قلعة الظلال"
];

const WORLD_DESCRIPTIONS = [
"ابدأ رحلتك بين الرمال والأطلال القديمة.",
"اكتشف أسرار المعبد وتجنب المومياوات.",
"استكشف الممرات العميقة داخل الأهرامات.",
"واجه التماثيل والألغاز الفرعونية.",
"ابحث عن المدينة التي اختفت من الخرائط.",
"واجه التحدي الأخير واكتشف سر الظل."
];

const TOTAL_WORLDS = 6;
const LEVELS_PER_WORLD = 10;
const TOTAL_LEVELS = TOTAL_WORLDS * LEVELS_PER_WORLD;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const rand = (min, max) => Math.random() * (max - min) + min;

function arabicNumber(value) {
return Math.floor(value).toLocaleString("ar-EG");
}

function loadSave() {
const fallback = {
coins: 0,
unlockedLevel: 1,
sound: true,
screenShake: true
};

try {
  const parsed = JSON.parse(
    localStorage.getItem("m11_old_version_save") || "null"
  );

  if (!parsed || typeof parsed !== "object") return fallback;

  return {
    ...fallback,
    coins: Math.max(0, Number(parsed.coins) || 0),
    unlockedLevel: clamp(
      Math.floor(Number(parsed.unlockedLevel) || 1),
      1,
      TOTAL_LEVELS
    ),
    sound: parsed.sound !== false,
    screenShake: parsed.screenShake !== false
  };
} catch {
  return fallback;
}

}

let save = loadSave();

let currentLevel = 1;
let gameRunning = false;
let paused = false;
let finished = false;

let width = 960;
let height = 540;
let pixelRatio = 1;

let cameraX = 0;
let cameraY = 0;
let screenShake = 0;

let lastFrame = 0;
let animationFrame = 0;
let lastShadowMessage = 0;
let audioContext = null;

const input = {
left: false,
right: false,
jump: false,
jumpPressed: false
};

const game = {
gravity: 1700,
groundY: 0,
worldWidth: 4200,
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
} catch {
// اللعبة تظل قابلة للعب إذا كان التخزين غير متاح.
}
}

function showScreen(name) {
Object.entries(screens).forEach(([key, element]) => {
element.classList.toggle("hidden", key !== name);
});
}

function hideOverlays() {
Object.values(overlays).forEach((element) => {
element.classList.add("hidden");
});
}

function setShadowMessage(message, force = false) {
const now = performance.now();

if (!force && now - lastShadowMessage < 2200) return;

lastShadowMessage = now;
$("shadow-text").textContent = message;

const box = $("shadow-message");

box.animate(
  [
    { opacity: 0.4, transform: "translateY(5px)" },
    { opacity: 1, transform: "translateY(0)" }
  ],
  { duration: 180, easing: "ease-out" }
);

}

function playTone(frequency = 440, duration = 0.07, type = "sine") {
if (!save.sound) return;

try {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  audioContext ||= new AudioContextClass();

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
} catch {
  // الصوت اختياري.
}

}

function resizeCanvas() {
const rect = canvas.getBoundingClientRect();

if (!rect.width || !rect.height) return;

width = rect.width;
height = rect.height;

pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

canvas.width = Math.round(width * pixelRatio);
canvas.height = Math.round(height * pixelRatio);

ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

if (game.player) {
  game.player.y = Math.min(
    game.player.y,
    Math.max(0, height - game.player.h)
  );
}

}

function worldForLevel(level) {
return Math.floor((level - 1) / LEVELS_PER_WORLD);
}

function levelInWorld(level) {
return ((level - 1) % LEVELS_PER_WORLD) + 1;
}

function createPlayer() {
return {
x: 70,
y: 0,
w: 32,
h: 45,
vx: 0,
vy: 0,
speed: 260,
jumpPower: 650,
onGround: false,
facing: 1,
invulnerable: 0,
walkTime: 0,
lives: 3,
spawnX: 70,
spawnY: 0
};
}

function addPlatform(x, y, w, h, type = "stone") {
game.platforms.push({ x, y, w, h, type });
}

function addCoin(x, y) {
game.coins.push({
x,
y,
r: 10,
collected: false,
phase: rand(0, Math.PI * 2)
});
}

function addEnemy(x, y, type = "mummy", minX = x - 80, maxX = x + 80) {
game.enemies.push({
x,
y,
w: 32,
h: 38,
vx: 42,
minX,
maxX,
type,
alive: true,
phase: rand(0, Math.PI * 2)
});
}

function buildLevel(level) {
const worldIndex = worldForLevel(level);

game.worldWidth = 4200 + (level - 1) * 60;
game.groundY = height - Math.max(60, height * 0.16);

game.platforms = [];
game.coins = [];
game.enemies = [];
game.decorations = [];
game.particles = [];
game.exit = null;

const groundY = game.groundY;

// الأرض الرئيسية مقسمة حتى يمكن إنشاء فجوات حقيقية.
let x = 0;

while (x < game.worldWidth) {
  const sectionWidth = rand(300, 560);
  const gapWidth = level >= 3 ? rand(45, 85) : 0;

  addPlatform(
    x,
    groundY,
    Math.min(sectionWidth, game.worldWidth - x),
    height - groundY + 140,
    "ground"
  );

  if (gapWidth > 0 && x + sectionWidth < game.worldWidth - 250) {
    x += sectionWidth + gapWidth;
  } else {
    x += sectionWidth;
  }
}

// منصات علوية وسلالم.
const platformCount = 15 + Math.min(level, 15);

for (let i = 0; i < platformCount; i++) {
  const px = 220 + i * 230 + rand(-45, 45);
  const py = groundY - rand(85, Math.min(height * 0.48, 220));
  const pw = rand(85, 155);

  if (px + pw < game.worldWidth - 150) {
    addPlatform(px, py, pw, 20, i % 3 === 0 ? "ruins" : "stone");

    if (i % 2 === 0) {
      addCoin(px + pw / 2, py - 27);
    }
  }
}

// سلالم خشبية وحجرية.
for (let i = 0; i < 8; i++) {
  const sx = 390 + i * 470;
  const sy = groundY - 100 - (i % 3) * 28;

  game.decorations.push({
    type: "ladder",
    x: sx,
    y: sy,
    w: 36,
    h: 100 + (i % 3) * 28,
    broken: (i + level) % 3 === 0
  });
}

// جنيهات منتشرة فوق الأرض وعلى المسار.
for (let i = 0; i < 46; i++) {
  const cx = 180 + i * 84;

  if (cx < game.worldWidth - 150) {
    addCoin(cx, groundY - 35 - (i % 3) * 15);
  }
}

// الأعداء.
const enemyCount = 5 + Math.min(level, 12);

for (let i = 0; i < enemyCount; i++) {
  const ex = 520 + i * 310;

  if (ex < game.worldWidth - 200) {
    const ey = groundY - 38;
    addEnemy(
      ex,
      ey,
      worldIndex >= 4 && i % 3 === 0 ? "guardian" : "mummy",
      ex - 55,
      ex + 85
    );
  }
}

// زخارف مصرية.
for (let i = 0; i < 40; i++) {
  game.decorations.push({
    type: ["palm", "pyramid", "pillar", "rock"][i % 4],
    x: i * 125 + rand(0, 50),
    y: groundY,
    size: rand(0.65, 1.35)
  });
}

// نقطة النهاية.
game.exit = {
  x: game.worldWidth - 110,
  y: groundY - 92,
  w: 46,
  h: 92
};

game.player = createPlayer();
game.player.y = groundY - game.player.h;
game.player.spawnY = game.player.y;

cameraX = 0;
cameraY = 0;
screenShake = 0;

finished = false;

$("world-name").textContent = WORLD_NAMES[worldIndex];
$("level-name").textContent =
  "المستوى " +
  arabicNumber(worldIndex + 1) +
  " - " +
  arabicNumber(levelInWorld(level));

updateHUD();
renderWorldCards();

setShadowMessage(
  level === 1
    ? "أهلًا يا أنطونيو! اتبع الطريق، واجمع الجنيهات. سأحذرك من الأخطار!"
    : "مستوى جديد! خليك حذر، فالآثار تخفي أسرارًا كثيرة.",
  true
);

}

function updateHUD() {
$("coin-count").textContent = arabicNumber(save.coins);
$("life-count").textContent = arabicNumber(
game.player ? game.player.lives : 3
);
}

function renderWorldCards() {
const container = $("world-list");
container.replaceChildren();

for (let world = 0; world < TOTAL_WORLDS; world++) {
  const firstLevel = world * LEVELS_PER_WORLD + 1;
  const lastLevel = firstLevel + LEVELS_PER_WORLD - 1;
  const unlocked = save.unlockedLevel >= firstLevel;

  const card = document.createElement("article");
  card.className = "world-card " + (unlocked ? "unlocked" : "locked");

  const title = document.createElement("strong");
  title.textContent = "العالم " + arabicNumber(world + 1);

  const name = document.createElement("span");
  name.textContent = WORLD_NAMES[world];

  const description = document.createElement("span");
  description.textContent = WORLD_DESCRIPTIONS[world];

  const progress = document.createElement("span");
  progress.textContent =
    "المستويات " +
    arabicNumber(firstLevel) +
    "–" +
    arabicNumber(lastLevel);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = unlocked ? "دخول العالم" : "مغلق";

  button.disabled = !unlocked;

  button.addEventListener("click", () => {
    const level = Math.max(
      firstLevel,
      Math.min(save.unlockedLevel, lastLevel)
    );

    startLevel(level);
  });

  card.append(title, name, description, progress, button);
  container.appendChild(card);
}

}

function startLevel(level) {
currentLevel = clamp(Math.floor(level), 1, TOTAL_LEVELS);

hideOverlays();
showScreen("play");

paused = false;
gameRunning = true;

resizeCanvas();
buildLevel(currentLevel);

lastFrame = performance.now();
cancelAnimationFrame(animationFrame);

animationFrame = requestAnimationFrame(loop);

}

function pauseGame() {
if (!gameRunning || paused || finished) return;

paused = true;
overlays.pause.classList.remove("hidden");

}

function resumeGame() {
if (finished) return;

hideOverlays();
paused = false;
lastFrame = performance.now();

animationFrame = requestAnimationFrame(loop);

}

function goHome() {
gameRunning = false;
paused = false;
finished = false;

cancelAnimationFrame(animationFrame);
hideOverlays();
showScreen("menu");

renderWorldCards();

}

function restartLevel() {
startLevel(currentLevel);
}

function completeLevel() {
if (finished) return;

finished = true;
gameRunning = false;

const next = Math.min(TOTAL_LEVELS, currentLevel + 1);

save.unlockedLevel = Math.max(save.unlockedLevel, next);
persist();

playTone(660, 0.12);
setTimeout(() => playTone(880, 0.18), 100);

$("result-title").textContent =
  currentLevel === TOTAL_LEVELS
    ? "لقد أنهيت المغامرة!"
    : "أحسنت يا أنطونيو!";

$("result-text").textContent =
  currentLevel === TOTAL_LEVELS
    ? "لقد كشفت أسرار مصر القديمة وأكملت المستويات الستين!"
    : "أنهيت المستوى " +
      arabicNumber(currentLevel) +
      " بنجاح. استعد لاكتشاف منطقة جديدة.";

$("next-level-button").textContent =
  currentLevel === TOTAL_LEVELS
    ? "العودة إلى القائمة"
    : "المستوى التالي";

overlays.result.classList.remove("hidden");

}

function gameOver() {
gameRunning = false;
finished = true;

overlays.gameOver.classList.remove("hidden");

}

function loseLife() {
const p = game.player;

if (p.invulnerable > 0) return;

p.lives--;
p.invulnerable = 1.5;

updateHUD();

if (save.screenShake) screenShake = 8;

playTone(140, 0.16, "sawtooth");

if (p.lives <= 0) {
  gameOver();
  return;
}

p.x = p.spawnX;
p.y = p.spawnY;
p.vx = 0;
p.vy = 0;

setShadowMessage(
  "خلي بالك يا أنطونيو! لسه عندك " +
    arabicNumber(p.lives) +
    " محاولات.",
  true
);

}

function collectCoin(coin) {
if (coin.collected) return;

coin.collected = true;
save.coins += 1;

updateHUD();
persist();

playTone(790, 0.055);

}

function createParticle(x, y, color) {
game.particles.push({
x,
y,
vx: rand(-80, 80),
vy: rand(-140, -30),
life: rand(0.25, 0.5),
maxLife: 0.5,
color,
size: rand(2, 5)
});
}

function updateParticles(dt) {
for (let i = game.particles.length - 1; i >= 0; i--) {
const particle = game.particles[i];

  particle.life -= dt;
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.vy += 300 * dt;

  if (particle.life <= 0) {
    game.particles.splice(i, 1);
  }
}

}

function overlaps(a, b) {
return (
a.x < b.x + b.w &&
a.x + a.w > b.x &&
a.y < b.y + b.h &&
a.y + a.h > b.y
);
}

function update(dt) {
const p = game.player;

if (!p) return;

dt = Math.min(dt, 0.033);

p.invulnerable = Math.max(0, p.invulnerable - dt);

// الحركة الأفقية.
const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);

p.vx = direction * p.speed;

if (direction !== 0) {
  p.facing = direction;
  p.walkTime += dt * 12;
}

if (input.jumpPressed && p.onGround) {
  p.vy = -p.jumpPower;
  p.onGround = false;

  playTone(330, 0.07);
}

input.jumpPressed = false;

// الجاذبية والحركة الرأسية.
p.vy += game.gravity * dt;

p.x += p.vx * dt;
p.x = clamp(p.x, 0, game.worldWidth - p.w);

const oldY = p.y;

p.y += p.vy * dt;
p.onGround = false;

// التصادم مع المنصات أثناء السقوط.
if (p.vy >= 0) {
  for (const platform of game.platforms) {
    const horizontalOverlap =
      p.x + p.w > platform.x &&
      p.x < platform.x + platform.w;

    const crossedTop =
      oldY + p.h <= platform.y &&
      p.y + p.h >= platform.y;

    if (horizontalOverlap && crossedTop) {
      p.y = platform.y - p.h;
      p.vy = 0;
      p.onGround = true;

      if (platform.type === "ground") {
        p.spawnX = Math.max(0, platform.x + 15);
        p.spawnY = p.y;
      }

      break;
    }
  }
}

// التقاط العملات.
for (const coin of game.coins) {
  if (coin.collected) continue;

  const box = {
    x: coin.x - coin.r,
    y: coin.y - coin.r,
    w: coin.r * 2,
    h: coin.r * 2
  };

  if (overlaps(p, box)) {
    collectCoin(coin);

    for (let i = 0; i < 5; i++) {
      createParticle(coin.x, coin.y, "#ffd76a");
    }
  }
}

// حركة الأعداء والتصادم معهم.
for (const enemy of game.enemies) {
  if (!enemy.alive) continue;

  enemy.x += enemy.vx * dt;

  if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
    enemy.vx *= -1;
  }

  enemy.y =
    game.groundY - enemy.h +
    Math.sin(performance.now() / 350 + enemy.phase) * 1.5;

  if (overlaps(p, enemy)) {
    const playerBottom = p.y + p.h;
    const enemyTop = enemy.y;

    if (p.vy > 80 && playerBottom - enemyTop < 20) {
      enemy.alive = false;
      p.vy = -390;

      for (let i = 0; i < 9; i++) {
        createParticle(
          enemy.x + enemy.w / 2,
          enemy.y + enemy.h / 2,
          "#d8c6a3"
        );
      }

      playTone(230, 0.08);
      setShadowMessage("برافو يا أنطونيو! تخطيت العدو بنجاح.");
    } else {
      loseLife();
    }
  }
}

// السقوط في الفجوات.
if (p.y > height + 100) {
  loseLife();
}

// الكاميرا تتبع اللاعب أفقيًا ورأسيًا بسلاسة.
const targetCameraX = clamp(
  p.x - width * 0.36,
  0,
  Math.max(0, game.worldWidth - width)
);

const targetCameraY = clamp(
  p.y - height * 0.58,
  0,
  Math.max(0, game.groundY - height * 0.35)
);

cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 6);
cameraY += (targetCameraY - cameraY) * Math.min(1, dt * 5);

// تحذيرات الظل.
if (p.x > 450 && p.x < 520 && performance.now() - lastShadowMessage > 3500) {
  setShadowMessage("خلي بالك! الطريق قدامك مليان مفاجآت.");
}

const nearbyEnemy = game.enemies.find(
  (enemy) =>
    enemy.alive &&
    Math.abs(enemy.x - p.x) < 150 &&
    enemy.x > p.x - 10
);

if (nearbyEnemy && performance.now() - lastShadowMessage > 4000) {
  setShadowMessage("خلي بالك يا أنطونيو، فيه عدو قريب منك!");
}

// الوصول إلى نهاية المستوى.
if (overlaps(p, game.exit)) {
  completeLevel();
}

screenShake *= Math.max(0, 1 - dt * 8);

updateParticles(dt);

}

function drawBackground() {
const worldIndex = worldForLevel(currentLevel);

const sky = ctx.createLinearGradient(0, 0, 0, height);

if (worldIndex === 2) {
  sky.addColorStop(0, "#101a35");
  sky.addColorStop(1, "#3a3150");
} else if (worldIndex === 5) {
  sky.addColorStop(0, "#191a2f");
  sky.addColorStop(1, "#62464b");
} else {
  sky.addColorStop(0, "#5e9bb1");
  sky.addColorStop(0.62, "#e9bd7b");
  sky.addColorStop(1, "#f2d6a0");
}

ctx.fillStyle = sky;
ctx.fillRect(0, 0, width, height);

// الشمس.
const sunX = width * 0.77 - cameraX * 0.04;
const sunY = height * 0.23 - cameraY * 0.03;

const sunGlow = ctx.createRadialGradient(
  sunX, sunY, 4, sunX, sunY, 75
);

sunGlow.addColorStop(0, "#fff4c4cc");
sunGlow.addColorStop(1, "#fff4c400");

ctx.fillStyle = sunGlow;
ctx.fillRect(sunX - 80, sunY - 80, 160, 160);

// جبال بعيدة تتحرك ببطء مع الكاميرا.
ctx.save();
ctx.translate(-cameraX * 0.15, -cameraY * 0.1);

for (let i = -1; i < 8; i++) {
  const x = i * 240;
  const baseY = game.groundY + 15;

  ctx.fillStyle = worldIndex >= 4 ? "#514451" : "#b48d6d";
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + 120, baseY - 130 - (i % 3) * 25);
  ctx.lineTo(x + 250, baseY);
  ctx.closePath();
  ctx.fill();
}

// أهرامات بعيدة.
for (let i = -1; i < 6; i++) {
  const x = i * 340 + 120;
  const y = game.groundY - 15;

  ctx.fillStyle = worldIndex >= 4 ? "#65505b" : "#c6a16f";

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 85, y - 105);
  ctx.lineTo(x + 170, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e6c38c66";
  ctx.beginPath();
  ctx.moveTo(x + 85, y - 105);
  ctx.lineTo(x + 170, y);
  ctx.lineTo(x + 92, y);
  ctx.closePath();
  ctx.fill();
}

ctx.restore();

}

function drawPalm(x, y, scale) {
ctx.save();
ctx.translate(x, y);
ctx.scale(scale, scale);

ctx.strokeStyle = "#62452e";
ctx.lineWidth = 7;
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.quadraticCurveTo(-5, -45, 2, -85);
ctx.stroke();

ctx.strokeStyle = "#476b40";
ctx.lineWidth = 5;

for (let i = 0; i < 6; i++) {
  const angle = -Math.PI + (i / 5) * Math.PI;
  ctx.beginPath();
  ctx.moveTo(2, -82);
  ctx.quadraticCurveTo(
    Math.cos(angle) * 24,
    -105 + Math.sin(angle) * 15,
    Math.cos(angle) * 55,
    -80 + Math.sin(angle) * 38
  );
  ctx.stroke();
}

ctx.restore();

}

function drawDecorations() {
for (const d of game.decorations) {
const x = d.x - cameraX;
const y = (d.y || game.groundY) - cameraY;

  if (x < -150 || x > width + 150) continue;

  ctx.save();

  if (d.type === "palm") {
    drawPalm(x, y, d.size);
  } else if (d.type === "pillar") {
    ctx.fillStyle = "#b69a72";
    ctx.fillRect(x, y - 75 * d.size, 24 * d.size, 75 * d.size);

    ctx.fillStyle = "#e0c69a";
    ctx.fillRect(x - 5 * d.size, y - 79 * d.size, 34 * d.size, 8 * d.size);

    ctx.fillStyle = "#84694c";
    ctx.fillRect(x + 5 * d.size, y - 65 * d.size, 4 * d.size, 55 * d.size);
  } else if (d.type === "rock") {
    ctx.fillStyle = "#947b60";
    ctx.beginPath();
    ctx.ellipse(x, y - 7, 18 * d.size, 10 * d.size, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.type === "ladder") {
    const ladderHeight = d.h;
    const ladderWidth = d.w;

    ctx.strokeStyle = "#725337";
    ctx.lineWidth = 5;
    ctx.beginPath();

    ctx.moveTo(x, y);
    ctx.lineTo(x, y - ladderHeight);
    ctx.moveTo(x + ladderWidth, y);
    ctx.lineTo(x + ladderWidth, y - ladderHeight);

    for (let rung = 10; rung < ladderHeight; rung += 18) {
      if (d.broken && rung > ladderHeight * 0.55) continue;

      ctx.moveTo(x, y - rung);
      ctx.lineTo(x + ladderWidth, y - rung);
    }

    ctx.stroke();

    if (d.broken) {
      ctx.strokeStyle = "#b48a58";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - ladderHeight * 0.55);
      ctx.lineTo(x + 13, y - ladderHeight * 0.45);
      ctx.lineTo(x + ladderWidth + 7, y - ladderHeight * 0.5);
      ctx.stroke();
    }
  }

  ctx.restore();
}

}

function drawPlatforms() {
for (const platform of game.platforms) {
const x = platform.x - cameraX;
const y = platform.y - cameraY;

  if (x + platform.w < 0 || x > width) continue;

  if (platform.type === "ground") {
    ctx.fillStyle = "#b68b58";
    ctx.fillRect(x, y, platform.w, platform.h);

    ctx.fillStyle = "#637c46";
    ctx.fillRect(x, y, platform.w, 7);

    ctx.strokeStyle = "#8c6845";
    ctx.lineWidth = 2;

    for (let tx = x + 15; tx < x + platform.w; tx += 44) {
      ctx.beginPath();
      ctx.moveTo(tx, y + 12);
      ctx.lineTo(tx - 9, y + 24);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = platform.type === "ruins" ? "#87745c" : "#a99a7f";
    ctx.fillRect(x, y, platform.w, platform.h);

    ctx.fillStyle = "#d5bd93";
    ctx.fillRect(x, y, platform.w, 5);

    ctx.strokeStyle = "#665443";
    ctx.lineWidth = 1;

    for (let tx = x + 25; tx < x + platform.w; tx += 35) {
      ctx.beginPath();
      ctx.moveTo(tx, y + 5);
      ctx.lineTo(tx - 5, y + platform.h);
      ctx.stroke();
    }
  }
}

}

function drawCoin(coin, time) {
if (coin.collected) return;

const x = coin.x - cameraX;
const y = coin.y - cameraY + Math.sin(time / 300 + coin.phase) * 3;

if (x < -30 || x > width + 30) return;

const shine = 0.78 + Math.sin(time / 180 + coin.phase) * 0.15;

ctx.save();
ctx.translate(x, y);

ctx.shadowColor = "#ffd35b";
ctx.shadowBlur = 12;

ctx.fillStyle = `rgba(255, 211, 91, ${shine})`;
ctx.beginPath();
ctx.ellipse(0, 0, coin.r * 0.85, coin.r, 0, 0, Math.PI * 2);
ctx.fill();

ctx.shadowBlur = 0;
ctx.strokeStyle = "#9b631d";
ctx.lineWidth = 2;
ctx.stroke();

ctx.fillStyle = "#714616";
ctx.font = "bold 12px Tahoma";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("ج", 0, 0.5);

ctx.restore();

}

function drawEnemy(enemy, time) {
if (!enemy.alive) return;

const x = enemy.x - cameraX;
const y = enemy.y - cameraY;

if (x < -70 || x > width + 70) return;

ctx.save();
ctx.translate(x + enemy.w / 2, y + enemy.h / 2);

const bob = Math.sin(time / 180 + enemy.phase) * 1.8;
ctx.translate(0, bob);

if (enemy.type === "guardian") {
  ctx.fillStyle = "#b88c46";
  ctx.fillRect(-15, -17, 30, 34);

  ctx.fillStyle = "#e4c17b";
  ctx.fillRect(-12, -23, 24, 13);

  ctx.fillStyle = "#28252a";
  ctx.fillRect(-8, -18, 4, 4);
  ctx.fillRect(4, -18, 4, 4);

  ctx.fillStyle = "#7d5c35";
  ctx.fillRect(-20, -7, 5, 21);
  ctx.fillRect(15, -7, 5, 21);
} else {
  // جسم مومياء كرتوني.
  ctx.fillStyle = "#e1d3ae";
  ctx.fillRect(-12, -17, 24, 29);

  ctx.fillStyle = "#b6a27f";
  ctx.fillRect(-13, -12, 26, 4);
  ctx.fillRect(-12, -2, 24, 4);
  ctx.fillRect(-12, 8, 24, 4);

  ctx.fillStyle = "#d6c59f";
  ctx.fillRect(-11, -26, 22, 16);

  ctx.fillStyle = "#30272a";
  ctx.fillRect(-7, -20, 4, 4);
  ctx.fillRect(3, -20, 4, 4);

  ctx.fillStyle = "#b69c76";
  ctx.fillRect(-11, 12, 8, 8);
  ctx.fillRect(3, 12, 8, 8);
}

ctx.restore();

}

function drawPlayer(time) {
const p = game.player;
if (!p) return;

if (p.invulnerable > 0 && Math.floor(time / 90) % 2 === 0) {
  return;
}

const x = p.x - cameraX;
const y = p.y - cameraY;

ctx.save();
ctx.translate(x + p.w / 2, y);
ctx.scale(p.facing, 1);

const moving = Math.abs(p.vx) > 1;
const walk = moving ? Math.sin(p.walkTime) * 4 : 0;

// ظل القدمين.
ctx.fillStyle = "#382b2055";
ctx.beginPath();
ctx.ellipse(0, p.h - 1, 20, 5, 0, 0, Math.PI * 2);
ctx.fill();

// الحقيبة.
ctx.fillStyle = "#795338";
ctx.fillRect(-15, 18, 9, 18);

// الساقان.
ctx.fillStyle = "#54402e";
ctx.fillRect(-10, 31, 8, 11 + walk);
ctx.fillRect(3, 31, 8, 11 - walk);

// الحذاء.
ctx.fillStyle = "#352820";
ctx.fillRect(-13, 40 + walk, 12, 5);
ctx.fillRect(2, 40 - walk, 12, 5);

// الجسم.
ctx.fillStyle = "#d6a15b";
ctx.fillRect(-12, 15, 24, 20);

// الملابس.
ctx.fillStyle = "#5a785c";
ctx.fillRect(-11, 19, 22, 13);

// الرقبة.
ctx.fillStyle = "#bd8b60";
ctx.fillRect(-4, 12, 8, 5);

// الرأس.
ctx.fillStyle = "#d9a477";
ctx.beginPath();
ctx.arc(0, 8, 10, 0, Math.PI * 2);
ctx.fill();

// الشعر.
ctx.fillStyle = "#44352d";
ctx.beginPath();
ctx.arc(0, 5, 10, Math.PI, Math.PI * 2);
ctx.fill();
ctx.fillRect(-10, 2, 4, 7);

// قبعة المستكشف.
ctx.fillStyle = "#d8bd82";
ctx.fillRect(-12, -2, 24, 4);
ctx.fillRect(-8, -7, 16, 7);

// العين.
ctx.fillStyle = "#28211d";
ctx.fillRect(4, 7, 2, 3);

// الذراعان.
ctx.fillStyle = "#bd8b60";
ctx.fillRect(-15, 18, 5, 14);
ctx.fillRect(10, 18, 5, 14);

ctx.restore();

}

function drawExit(time) {
const exit = game.exit;

if (!exit) return;

const x = exit.x - cameraX;
const y = exit.y - cameraY;

if (x < -100 || x > width + 100) return;

ctx.save();

ctx.fillStyle = "#d2b57d";
ctx.fillRect(x, y, exit.w, exit.h);

ctx.fillStyle = "#75583a";
ctx.fillRect(x + 8, y + 10, exit.w - 16, exit.h - 10);

ctx.fillStyle = "#f4d88d";
ctx.fillRect(x + 12, y + 20, exit.w - 24, exit.h - 20);

ctx.fillStyle = "#3d3024";
ctx.beginPath();
ctx.arc(
  x + exit.w / 2,
  y + 31,
  6 + Math.sin(time / 150) * 2,
  0,
  Math.PI * 2
);
ctx.fill();

ctx.fillStyle = "#fff0b3";
ctx.font = "bold 12px Tahoma";
ctx.textAlign = "center";
ctx.fillText("النهاية", x + exit.w / 2, y - 12);

ctx.restore();

}

function drawParticles() {
for (const particle of game.particles) {
ctx.save();
ctx.globalAlpha = clamp(
particle.life / particle.maxLife,
0,
1
);

  ctx.fillStyle = particle.color;
  ctx.fillRect(
    particle.x - cameraX,
    particle.y - cameraY,
    particle.size,
    particle.size
  );

  ctx.restore();
}

}

function render(time) {
ctx.save();

if (screenShake > 0.5) {
  ctx.translate(
    rand(-screenShake, screenShake),
    rand(-screenShake, screenShake)
  );
}

drawBackground();
drawDecorations();
drawPlatforms();

for (const coin of game.coins) {
  drawCoin(coin, time);
}

for (const enemy of game.enemies) {
  drawEnemy(enemy, time);
}

drawExit(time);
drawParticles();
drawPlayer(time);

ctx.restore();

}

function loop(time) {
if (!gameRunning || paused || finished) return;

const dt = Math.min((time - lastFrame) / 1000, 0.033);
lastFrame = time;

update(dt);
render(time);

if (gameRunning && !paused && !finished) {
  animationFrame = requestAnimationFrame(loop);
}

}

function bindHoldButton(id, key) {
const button = $(id);

const press = (event) => {
  event.preventDefault();

  input[key] = true;
  button.classList.add("is-pressed");

  if (button.setPointerCapture && event.pointerId !== undefined) {
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // بعض المتصفحات لا تدعم التقاط المؤشر هنا.
    }
  }

  if (key === "jump") {
    input.jumpPressed = true;
  }
};

const release = (event) => {
  if (event) event.preventDefault();

  input[key] = false;
  button.classList.remove("is-pressed");
};

button.addEventListener("pointerdown", press);
button.addEventListener("pointerup", release);
button.addEventListener("pointercancel", release);
button.addEventListener("lostpointercapture", release);
button.addEventListener("contextmenu", (event) => event.preventDefault());

}

bindHoldButton("left-button", "left");
bindHoldButton("right-button", "right");
bindHoldButton("jump-button", "jump");

window.addEventListener("keydown", (event) => {
if (
["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(
event.code
)
) {
event.preventDefault();
}

if (event.code === "ArrowLeft" || event.code === "KeyA") {
  input.left = true;
}

if (event.code === "ArrowRight" || event.code === "KeyD") {
  input.right = true;
}

if (
  event.code === "Space" ||
  event.code === "ArrowUp" ||
  event.code === "KeyW"
) {
  if (!input.jump) input.jumpPressed = true;
  input.jump = true;
}

if (event.code === "Escape") {
  if (paused) resumeGame();
  else pauseGame();
}

});

window.addEventListener("keyup", (event) => {
if (event.code === "ArrowLeft" || event.code === "KeyA") {
input.left = false;
}

if (event.code === "ArrowRight" || event.code === "KeyD") {
  input.right = false;
}

if (
  event.code === "Space" ||
  event.code === "ArrowUp" ||
  event.code === "KeyW"
) {
  input.jump = false;
}

});

window.addEventListener("blur", () => {
input.left = false;
input.right = false;
input.jump = false;

document.querySelectorAll(".control-button").forEach((button) => {
  button.classList.remove("is-pressed");
});

});

$("start-button").addEventListener("click", () => {
startLevel(1);
});

$("continue-button").addEventListener("click", () => {
startLevel(save.unlockedLevel);
});

$("worlds-button").addEventListener("click", () => {
renderWorldCards();
showScreen("worlds");
});

$("settings-button").addEventListener("click", () => {
showScreen("settings");
});

document.querySelectorAll("[data-back]").forEach((button) => {
button.addEventListener("click", () => showScreen("menu"));
});

$("pause-button").addEventListener("click", pauseGame);
$("resume-button").addEventListener("click", resumeGame);
$("restart-level-button").addEventListener("click", restartLevel);

$("home-button").addEventListener("click", goHome);
$("result-home-button").addEventListener("click", goHome);
$("game-over-home-button").addEventListener("click", goHome);

$("next-level-button").addEventListener("click", () => {
if (currentLevel >= TOTAL_LEVELS) {
goHome();
} else {
startLevel(currentLevel + 1);
}
});

$("retry-button").addEventListener("click", restartLevel);

$("sound-toggle").checked = save.sound;
$("shake-toggle").checked = save.screenShake;

$("sound-toggle").addEventListener("change", (event) => {
save.sound = event.target.checked;
persist();
});

$("shake-toggle").addEventListener("change", (event) => {
save.screenShake = event.target.checked;
persist();
});

$("reset-progress-button").addEventListener("click", () => {
const confirmed = window.confirm(
"هل أنت متأكد أنك تريد إعادة العملات والتقدم إلى البداية؟"
);

if (!confirmed) return;

save.coins = 0;
save.unlockedLevel = 1;

persist();
updateHUD();
renderWorldCards();

setShadowMessage("بدأنا من جديد يا أنطونيو. رحلة موفقة!", true);

});

window.addEventListener("resize", () => {
resizeCanvas();

if (game.player) {
  game.groundY = height - Math.max(60, height * 0.16);
}

});

document.addEventListener("visibilitychange", () => {
if (document.hidden && gameRunning && !paused) {
pauseGame();
}
});

// شاشة التحميل.
function boot() {
const progress = $("loading-progress");
const message = $("loading-message");

const messages = [
  "نجهز معدات أنطونيو...",
  "نستكشف أطلال مصر القديمة...",
  "نوقظ الظل الغامض...",
  "المغامرة جاهزة!"
];

let step = 0;

const timer = setInterval(() => {
  step++;

  progress.style.width = Math.min(step * 25, 100) + "%";
  message.textContent = messages[Math.min(step - 1, messages.length - 1)];

  if (step >= 4) {
    clearInterval(timer);

    setTimeout(() => {
      showScreen("menu");
      renderWorldCards();
      persist();
    }, 350);
  }
}, 220);

}

resizeCanvas();
renderWorldCards();
boot();
})();
