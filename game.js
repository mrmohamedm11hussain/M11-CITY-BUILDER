(() => {
"use strict";

const $ = id => document.getElementById(id);
const canvas = $("c");
if (!canvas) return;

const ctx = canvas.getContext("2d");
if (!ctx) return;

const W = canvas.width;
const H = canvas.height;
const TILE = 48;

const SAVE_KEY = "m11_your_old_version_save_v3";
const CHARACTER_KEY = "m11_selected_character";

const COLORS = {
purple: "#a78bfa",
cyan: "#67e8f9",
gold: "#fcd34d",
green: "#86efac",
red: "#fb7185",
white: "#f8fafc"
};

const getLevels = () =>
Array.isArray(window.LEVELS) ? window.LEVELS :
(typeof LEVELS !== "undefined" && Array.isArray(LEVELS) ? LEVELS : []);

const levels = getLevels();

const state = {
running: false,
paused: false,
won: false,
gameOver: false,
muted: false,

levelIndex: 0,
unlockedLevel: 0,
score: 0,
totalGems: 0,
lives: 3,

character: "adam",
cameraX: 0,
frame: 0,
shake: 0,

recording: [],
ghosts: [],
particles: [],
floatingTexts: [],
gems: [],
powerups: [],
movers: [],

keys: Object.create(null),
pointerButtons: Object.create(null),

player: null,
level: null,
map: [],
cols: 0,
rows: 0,
doorsOpen: { a: false, b: false, c: false },
plates: { "1": false, "2": false, "3": false }

};

function loadSave() {
try {
const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
state.score = Math.max(0, Number(data.score) || 0);
state.unlockedLevel = Math.max(0, Number(data.unlockedLevel) || 0);
state.levelIndex = Math.min(state.unlockedLevel, Math.max(0, levels.length - 1));
state.totalGems = Math.max(0, Number(data.totalGems) || 0);
state.muted = !!data.muted;
} catch (_) {}
}

function saveProgress() {
try {
localStorage.setItem(SAVE_KEY, JSON.stringify({
score: state.score,
unlockedLevel: state.unlockedLevel,
totalGems: state.totalGems,
muted: state.muted
}));
} catch (_) {}
}

function currentLevel() {
return levels[state.levelIndex] || levels[0] || {
world: 0,
t: "المغامرة الأولى",
map: [
"####################",
"#                  #",
"#                  #",
"#        ^         #",
"#    ###           #",
"# S            E  #",
"####################"
]
};
}

function normaliseMap(level) {
const source = level.map || level.grid || [];
const rows = source.map(row => String(row).split(""));
const cols = Math.max(20, ...rows.map(row => row.length));

return {
  cols,
  rows: rows.map(row => {
    while (row.length < cols) row.push(" ");
    return row;
  })
};

}

function getTile(tx, ty) {
if (ty < 0) return " ";
if (tx < 0 || tx >= state.cols || ty >= state.rows) return "#";
return state.map[ty]?.[tx] || " ";
}

function setTile(tx, ty, value) {
if (tx < 0 || tx >= state.cols || ty < 0 || ty >= state.rows) return;
state.map[ty][tx] = value;
}

function isSolid(tile) {
if (tile === "#") return true;
if ("abc".includes(tile) && tile !== " ") {
return !state.doorsOpen[tile];
}
return false;
}

function isHazard(tile) {
return tile === "^" || tile === "!";
}

function createPlayer(x, y) {
return {
x, y,
w: 27,
h: 38,
vx: 0,
vy: 0,
speed: 3.2,
jumpPower: 10.7,
grounded: false,
facing: 1,
invulnerable: 0,
shield: 0,
speedBoost: 0,
coyote: 0,
jumpBuffer: 0,
anim: 0
};
}

function findStart() {
for (let y = 0; y < state.rows; y++) {
for (let x = 0; x < state.cols; x++) {
if (state.map[y][x] === "S") {
setTile(x, y, " ");
return { x: x * TILE + 10, y: y * TILE + 4 };
}
}
}
return { x: TILE, y: TILE };
}

function createLevelObjects() {
state.gems = [];
state.powerups = [];
state.movers = [];

for (let y = 0; y < state.rows; y++) {
  for (let x = 0; x < state.cols; x++) {
    const tile = state.map[y][x];

    if (tile === "$") {
      state.gems.push({
        x: x * TILE + TILE / 2,
        y: y * TILE + TILE / 2,
        taken: false,
        phase: Math.random() * 6
      });
      setTile(x, y, " ");
    }

    if (tile === "M") {
      state.movers.push({
        x: x * TILE,
        y: y * TILE,
        startX: x * TILE,
        range: TILE * 2,
        w: TILE,
        h: 12,
        vx: 1.2 + state.levelIndex * 0.04
      });
      setTile(x, y, " ");
    }
  }
}

// توزيع جواهر إضافية في أماكن مناسبة فوق الأرض.
for (let x = 2; x < state.cols - 2; x++) {
  for (let y = 1; y < state.rows - 1; y++) {
    if (getTile(x, y) === " " && getTile(x, y + 1) === "#") {
      if ((x * 7 + y * 11 + state.levelIndex * 3) % 9 === 0) {
        state.gems.push({
          x: x * TILE + TILE / 2,
          y: y * TILE - 18,
          taken: false,
          phase: Math.random() * 6
        });
      }
    }
  }
}

// قدرات قابلة للجمع.
for (let x = 4; x < state.cols - 3; x += 7) {
  for (let y = 1; y < state.rows - 1; y++) {
    if (getTile(x, y) === " " && getTile(x, y + 1) === "#") {
      state.powerups.push({
        x: x * TILE + TILE / 2,
        y: y * TILE - 20,
        type: ((x + state.levelIndex) % 2 === 0) ? "shield" : "speed",
        taken: false,
        phase: Math.random() * 6
      });
      break;
    }
  }
}

}

function loadLevel(index, keepLives = true) {
if (!levels.length) {
showHint("ملف levels.js لا يحتوي على مراحل صالحة.");
return;
}

state.levelIndex = Math.max(0, Math.min(index, levels.length - 1));
state.level = currentLevel();

const normalized = normaliseMap(state.level);
state.cols = normalized.cols;
state.rows = normalized.rows;
state.map = normalized.rows;

state.doorsOpen = { a: false, b: false, c: false };
state.plates = { "1": false, "2": false, "3": false };
state.recording = [];
state.particles = [];
state.floatingTexts = [];
state.cameraX = 0;
state.frame = 0;
state.won = false;
state.gameOver = false;

if (!keepLives) state.lives = 3;

const start = findStart();
state.player = createPlayer(start.x, start.y);

createLevelObjects();
updateHUD();
hideOverlay("o2");
hideOverlay("gameOver");
showHint("اجمع الجواهر، وتجنب الأشواك، وابحث عن المخرج.");

}

function worldNumber() {
const level = currentLevel();
if (typeof level.world === "number") return level.world;
return Math.floor(state.levelIndex / 10);
}

function updateHUD() {
const worldNames = [
"الغابة المسحورة",
"الأطلال القديمة",
"مملكة الكريستال"
];

if ($("wn")) $("wn").textContent =
  worldNames[worldNumber()] || "العالم المجهول";

if ($("lv")) $("lv").textContent = String(state.levelIndex + 1);
if ($("lp")) $("lp").textContent = String(state.score);

if ($("healthValue")) {
  $("healthValue").textContent = `${state.lives} فرص`;
}

const fill = $("fill");
if (fill) {
  const progress = Math.max(
    0,
    Math.min(100, (state.levelIndex / Math.max(1, levels.length - 1)) * 100)
  );
  fill.style.width = `${progress}%`;
}

}

function showOverlay(id) {
$(id)?.classList.add("show");
}

function hideOverlay(id) {
$(id)?.classList.remove("show");
}

let hintTimer;

function showHint(message) {
const hint = $("hint");
if (!hint) return;
hint.textContent = message;
hint.classList.add("visible");

clearTimeout(hintTimer);
hintTimer = setTimeout(() => hint.classList.remove("visible"), 2600);

}

// الصوت باستخدام Web Audio دون الحاجة إلى ملفات خارجية.
let audioContext;

function sound(frequency = 440, duration = 0.08, type = "sine") {
if (state.muted) return;

try {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();

  if (audioContext.state === "suspended") audioContext.resume();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.055, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
} catch (_) {}

}

function spawnParticles(x, y, color, count = 12) {
for (let i = 0; i < count; i++) {
const angle = Math.random() * Math.PI * 2;
const speed = 1 + Math.random() * 4;

  state.particles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 25 + Math.random() * 25,
    maxLife: 50,
    size: 2 + Math.random() * 4,
    color
  });
}

}

function floatingText(x, y, text, color = COLORS.gold) {
state.floatingTexts.push({ x, y, text, color, life: 50 });
}

function rectsOverlap(a, b) {
return a.x < b.x + b.w &&
a.x + a.w > b.x &&
a.y < b.y + b.h &&
a.y + a.h > b.y;
}

function getPlayerTileBounds() {
const p = state.player;
return {
left: Math.floor(p.x / TILE),
right: Math.floor((p.x + p.w - 1) / TILE),
top: Math.floor(p.y / TILE),
bottom: Math.floor((p.y + p.h - 1) / TILE)
};
}

function collideX(amount) {
const p = state.player;
p.x += amount;

const b = getPlayerTileBounds();

for (let ty = b.top; ty <= b.bottom; ty++) {
  for (let tx = b.left; tx <= b.right; tx++) {
    if (!isSolid(getTile(tx, ty))) continue;

    if (amount > 0) p.x = tx * TILE - p.w;
    else if (amount < 0) p.x = (tx + 1) * TILE;
    p.vx = 0;
  }
}

p.x = Math.max(0, Math.min(p.x, state.cols * TILE - p.w));

}

function collideY(amount) {
const p = state.player;
p.y += amount;
p.grounded = false;

const b = getPlayerTileBounds();

for (let ty = b.top; ty <= b.bottom; ty++) {
  for (let tx = b.left; tx <= b.right; tx++) {
    if (!isSolid(getTile(tx, ty))) continue;

    if (amount > 0) {
      p.y = ty * TILE - p.h;
      p.vy = 0;
      p.grounded = true;
      p.coyote = 7;
    } else if (amount < 0) {
      p.y = (ty + 1) * TILE;
      p.vy = 0;
    }
  }
}

if (!p.grounded && p.coyote > 0) p.coyote--;

}

function updateGhosts() {
for (const ghost of state.ghosts) {
if (ghost.index < ghost.frames.length) {
const frame = ghost.frames[ghost.index++];
ghost.x = frame.x;
ghost.y = frame.y;
} else {
ghost.finished = true;
}
}

state.ghosts = state.ghosts.filter(g => !g.finished);

}

function createGhost() {
if (state.recording.length < 10) return;

state.ghosts.push({
  frames: state.recording.map(f => ({ ...f })),
  index: 0,
  x: state.recording[0].x,
  y: state.recording[0].y,
  finished: false
});

// احتفظ بعدد محدود لتجنب استهلاك الذاكرة.
if (state.ghosts.length > 4) state.ghosts.shift();

}

function resetAfterHit() {
if (state.player.shield > 0) {
state.player.shield = 0;
spawnParticles(
state.player.x + state.player.w / 2,
state.player.y + state.player.h / 2,
COLORS.cyan,
20
);
floatingText(state.player.x, state.player.y, "الدرع حماك!", COLORS.cyan);
sound(660, 0.13);
return;
}

if (state.player.invulnerable > 0 || state.gameOver || state.won) return;

createGhost();
state.lives--;
state.shake = 12;

sound(130, 0.25, "sawtooth");
spawnParticles(
  state.player.x + state.player.w / 2,
  state.player.y + state.player.h / 2,
  COLORS.red,
  24
);

if (state.lives <= 0) {
  state.lives = 0;
  state.gameOver = true;
  state.running = false;

  if ($("finalScore")) $("finalScore").textContent = String(state.score);
  if ($("finalLevel")) $("finalLevel").textContent = String(state.levelIndex + 1);

  updateHUD();
  showOverlay("gameOver");
  return;
}

const start = findStart();
state.player.x = start.x;
state.player.y = start.y;
state.player.vx = 0;
state.player.vy = 0;
state.player.invulnerable = 90;
state.recording = [];

updateHUD();
showHint(`خسرت فرصة! متبقي ${state.lives}.`);

}

function checkPlates() {
const plateOccupied = { "1": false, "2": false, "3": false };
const p = state.player;

const occupants = [
  { x: p.x, y: p.y, w: p.w, h: p.h },
  ...state.ghosts.map(g => ({ x: g.x, y: g.y, w: p.w, h: p.h }))
];

for (let y = 0; y < state.rows; y++) {
  for (let x = 0; x < state.cols; x++) {
    const tile = getTile(x, y);
    if (!["1", "2", "3"].includes(tile)) continue;

    const plate = { x: x * TILE, y: y * TILE + 8, w: TILE, h: TILE - 8 };

    if (occupants.some(o => rectsOverlap(o, plate))) {
      plateOccupied[tile] = true;
    }
  }
}

for (const key of ["1", "2", "3"]) {
  if (plateOccupied[key] && !state.plates[key]) {
    sound(520, 0.1);
    showHint(`تم تفعيل لوحة الضغط ${key}`);
  }
}

state.plates = plateOccupied;
state.doorsOpen.a = plateOccupied["1"];
state.doorsOpen.b = plateOccupied["2"];
state.doorsOpen.c = plateOccupied["3"];

}

function collectObjects() {
const p = state.player;
const box = { x: p.x, y: p.y, w: p.w, h: p.h };

for (const gem of state.gems) {
  if (gem.taken) continue;

  const boxGem = { x: gem.x - 10, y: gem.y - 10, w: 20, h: 20 };

  if (rectsOverlap(box, boxGem)) {
    gem.taken = true;
    state.score += 10;
    state.totalGems++;

    sound(800, 0.08);
    spawnParticles(gem.x, gem.y, COLORS.gold, 9);
    floatingText(gem.x, gem.y, "+10", COLORS.gold);
    updateHUD();
    saveProgress();
  }
}

for (const power of state.powerups) {
  if (power.taken) continue;

  const boxPower = {
    x: power.x - 13,
    y: power.y - 13,
    w: 26,
    h: 26
  };

  if (!rectsOverlap(box, boxPower)) continue;

  power.taken = true;

  if (power.type === "shield") {
    p.shield = 60 * 8;
    floatingText(power.x, power.y, "درع!", COLORS.cyan);
    showHint("🛡️ حصلت على درع مؤقت!");
  } else {
    p.speedBoost = 60 * 6;
    floatingText(power.x, power.y, "سرعة!", COLORS.green);
    showHint("⚡ سرعتك زادت مؤقتًا!");
  }

  state.score += 25;
  sound(920, 0.15);
  spawnParticles(power.x, power.y, COLORS.cyan, 16);
  updateHUD();
  saveProgress();
}

}

function updateMovers() {
for (const m of state.movers) {
m.x += m.vx;

  if (m.x > m.startX + m.range || m.x < m.startX - m.range) {
    m.vx *= -1;
  }

  const p = state.player;
  const platform = { x: m.x, y: m.y, w: m.w, h: m.h };
  const feet = { x: p.x, y: p.y + p.h - 3, w: p.w, h: 7 };

  if (p.vy >= 0 && rectsOverlap(feet, platform)) {
    p.y = m.y - p.h;
    p.vy = 0;
    p.grounded = true;
    p.coyote = 7;
  }
}

}

function checkHazardsAndExit() {
const p = state.player;
const b = getPlayerTileBounds();

for (let ty = b.top; ty <= b.bottom; ty++) {
  for (let tx = b.left; tx <= b.right; tx++) {
    const tile = getTile(tx, ty);

    if (isHazard(tile)) {
      resetAfterHit();
      return;
    }

    if (tile === "E" && !state.won && !state.gameOver) {
      completeLevel();
      return;
    }
  }
}

if (p.y > state.rows * TILE + 80) {
  resetAfterHit();
}

}

function completeLevel() {
if (state.won || state.gameOver) return;

state.won = true;
state.running = false;

state.score += 100 + state.lives * 20;
state.unlockedLevel = Math.max(
  state.unlockedLevel,
  Math.min(state.levelIndex + 1, levels.length - 1)
);

if ($("t2")) $("t2").textContent = "أحسنت! 🎉";
if ($("p2")) {
  $("p2").textContent =
    state.levelIndex >= levels.length - 1
      ? "أنهيت جميع المراحل المتاحة!"
      : "أنهيت المرحلة بنجاح وفتحت المرحلة التالية.";
}

if ($("victoryScore")) $("victoryScore").textContent = String(state.score);
if ($("victoryGems")) {
  $("victoryGems").textContent = String(
    state.gems.filter(g => g.taken).length
  );
}

const nextButton = $("n2");

if (nextButton) {
  nextButton.textContent =
    state.levelIndex >= levels.length - 1
      ? "العب من البداية ↻"
      : "المرحلة التالية ←";
}

spawnParticles(
  state.player.x + state.player.w / 2,
  state.player.y + state.player.h / 2,
  COLORS.gold,
  50
);

sound(660, 0.16);
setTimeout(() => sound(880, 0.2), 100);

updateHUD();
saveProgress();
showOverlay("o2");

}

function update() {
if (!state.running || state.paused || state.won || state.gameOver) return;

state.frame++;

const p = state.player;
const left = state.keys.ArrowLeft || state.keys.KeyA ||
  state.pointerButtons.left;
const right = state.keys.ArrowRight || state.keys.KeyD ||
  state.pointerButtons.right;
const jump = state.keys.ArrowUp || state.keys.KeyW ||
  state.keys.Space || state.pointerButtons.jump;

const speedMultiplier = p.speedBoost > 0 ? 1.65 : 1;
const target = (Number(right) - Number(left)) * p.speed * speedMultiplier;

if (left || right) {
  p.vx += (target - p.vx) * 0.28;
  p.facing = right ? 1 : -1;
  p.anim += 0.2;
} else {
  p.vx *= 0.76;
  if (Math.abs(p.vx) < 0.1) p.vx = 0;
}

if (jump) p.jumpBuffer = 8;
else if (p.jumpBuffer > 0) p.jumpBuffer--;

if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0)) {
  p.vy = -p.jumpPower;
  p.grounded = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  sound(300, 0.07);
}

p.vy = Math.min(p.vy + 0.48, 12);

if (p.invulnerable > 0) p.invulnerable--;
if (p.shield > 0) p.shield--;
if (p.speedBoost > 0) p.speedBoost--;

collideX(p.vx);
collideY(p.vy);

updateGhosts();
updateMovers();
checkPlates();
collectObjects();
checkHazardsAndExit();

if (!state.won && !state.gameOver) {
  state.recording.push({ x: p.x, y: p.y });

  // الحد الأعلى للتسجيل يمنع استهلاك ذاكرة كبيرة.
  if (state.recording.length > 1800) state.recording.shift();
}

state.cameraX = Math.max(
  0,
  Math.min(p.x - W * 0.38, state.cols * TILE - W)
);

for (const particle of state.particles) {
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.vy += 0.08;
  particle.life--;
}

state.particles = state.particles.filter(particle => particle.life > 0);

for (const text of state.floatingTexts) {
  text.y -= 0.6;
  text.life--;
}

state.floatingTexts = state.floatingTexts.filter(text => text.life > 0);

if (state.shake > 0) state.shake *= 0.82;

updateHUD();

}

function roundedRect(x, y, w, h, r) {
ctx.beginPath();
ctx.roundRect(x, y, w, h, r);
}

function drawBackground() {
const world = worldNumber();

const palettes = [
  ["#10152d", "#253b51", "#507c73"],
  ["#16132d", "#44335e", "#936b65"],
  ["#101c3b", "#284e77", "#72b6db"]
];

const colors = palettes[world] || palettes[0];

const gradient = ctx.createLinearGradient(0, 0, 0, H);
gradient.addColorStop(0, colors[0]);
gradient.addColorStop(0.65, colors[1]);
gradient.addColorStop(1, colors[2]);

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, W, H);

// نجوم ثابتة بالنسبة للكاميرا لتجنب اهتزاز الخلفية.
for (let i = 0; i < 50; i++) {
  const sx = ((i * 137 + 43) % W);
  const sy = ((i * 71 + 19) % Math.max(1, H * 0.75));

  ctx.globalAlpha = 0.25 + ((i % 4) * 0.15);
  ctx.fillStyle = i % 5 === 0 ? COLORS.cyan : "#ffffff";
  ctx.fillRect(sx, sy, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
}

ctx.globalAlpha = 1;

// جبال متعددة الطبقات.
for (let layer = 0; layer < 3; layer++) {
  ctx.beginPath();
  ctx.moveTo(0, H);

  const baseY = H * (0.59 + layer * 0.12);
  const parallax = state.cameraX * (0.12 + layer * 0.13);

  for (let x = -100; x <= W + 100; x += 100) {
    const worldX = x + parallax;
    const height = 25 + ((Math.floor(worldX / 100) * 37 + layer * 29) % 85);
    ctx.lineTo(x, baseY - height);
  }

  ctx.lineTo(W, H);
  ctx.closePath();

  ctx.globalAlpha = 0.24 + layer * 0.12;
  ctx.fillStyle = layer === 0 ? "#a99aff" :
    layer === 1 ? "#6679ae" : "#243456";
  ctx.fill();
}

ctx.globalAlpha = 1;

}

function drawTile(x, y, tile) {
const px = x * TILE;
const py = y * TILE;

if (tile === "#") {
  const world = worldNumber();

  const base = world === 0 ? "#253d48" :
    world === 1 ? "#49364e" : "#24496a";

  ctx.fillStyle = base;
  ctx.fillRect(px, py, TILE, TILE);

  ctx.fillStyle = "rgba(255,255,255,0.055)";
  ctx.fillRect(px + 2, py + 2, TILE - 4, 4);

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(px, py + TILE - 5, TILE, 5);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);

  if ((x + y) % 4 === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(px + 12, py + 15, 3, 3);
    ctx.fillRect(px + 34, py + 31, 4, 2);
  }
} else if (tile === "^" || tile === "!") {
  ctx.fillStyle = COLORS.red;

  ctx.beginPath();
  ctx.moveTo(px + 3, py + TILE);
  ctx.lineTo(px + TILE / 2, py + 5);
  ctx.lineTo(px + TILE - 3, py + TILE);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffe4e6";
  ctx.beginPath();
  ctx.moveTo(px + TILE / 2, py + 5);
  ctx.lineTo(px + TILE / 2 + 4, py + 20);
  ctx.lineTo(px + TILE / 2 - 1, py + 17);
  ctx.closePath();
  ctx.fill();
} else if ("abc".includes(tile) && tile !== " ") {
  if (!state.doorsOpen[tile]) {
    ctx.fillStyle = "#32294f";
    roundedRect(px + 5, py + 2, TILE - 10, TILE - 2, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.purple;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
} else if (["1", "2", "3"].includes(tile)) {
  const active = state.plates[tile];

  ctx.fillStyle = active ? COLORS.green : COLORS.purple;
  ctx.shadowBlur = active ? 15 : 6;
  ctx.shadowColor = ctx.fillStyle;

  roundedRect(px + 7, py + TILE - 13, TILE - 14, 8, 4);
  ctx.fill();

  ctx.shadowBlur = 0;
} else if (tile === "E") {
  const glow = 0.7 + Math.sin(state.frame * 0.07) * 0.2;

  ctx.save();
  ctx.globalAlpha = glow;
  ctx.shadowBlur = 24;
  ctx.shadowColor = COLORS.cyan;
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 4;

  roundedRect(px + 9, py + 3, TILE - 18, TILE - 4, 14);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = "rgba(103,232,249,0.12)";
  roundedRect(px + 13, py + 7, TILE - 26, TILE - 12, 10);
  ctx.fill();
}

}

function drawGems() {
for (const gem of state.gems) {
if (gem.taken) continue;

  const y = gem.y + Math.sin(state.frame * 0.06 + gem.phase) * 4;

  ctx.save();
  ctx.translate(gem.x, y);
  ctx.rotate(Math.sin(state.frame * 0.025 + gem.phase) * 0.2);

  ctx.shadowBlur = 14;
  ctx.shadowColor = COLORS.gold;
  ctx.fillStyle = COLORS.gold;

  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 10);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff7d6";
  ctx.fillRect(-1, -6, 2, 5);

  ctx.restore();
}

}

function drawPowerups() {
for (const power of state.powerups) {
if (power.taken) continue;

  const y = power.y + Math.sin(state.frame * 0.05 + power.phase) * 4;

  ctx.save();
  ctx.translate(power.x, y);

  ctx.shadowBlur = 16;
  ctx.shadowColor = power.type === "shield" ? COLORS.cyan : COLORS.green;

  ctx.fillStyle = power.type === "shield" ? "#164e63" : "#14532d";
  roundedRect(-13, -13, 26, 26, 8);
  ctx.fill();

  ctx.strokeStyle = power.type === "shield" ? COLORS.cyan : COLORS.green;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(power.type === "shield" ? "◆" : "⚡", 0, 1);

  ctx.restore();
}

}

function drawMovers() {
for (const mover of state.movers) {
const gradient = ctx.createLinearGradient(
mover.x, mover.y, mover.x, mover.y + mover.h
);

  gradient.addColorStop(0, COLORS.cyan);
  gradient.addColorStop(1, "#6366f1");

  ctx.fillStyle = gradient;
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLORS.cyan;

  roundedRect(
    mover.x - state.cameraX,
    mover.y,
    mover.w,
    mover.h,
    6
  );

  ctx.fill();
  ctx.shadowBlur = 0;
}

}

function drawPlayer(player, ghost = false) {
const x = player.x - state.cameraX;
const y = player.y;

if (x < -80 || x > W + 80) return;

ctx.save();

if (ghost) {
  ctx.globalAlpha = 0.42;
  ctx.shadowBlur = 18;
  ctx.shadowColor = COLORS.cyan;
} else if (player.invulnerable > 0 && state.frame % 8 < 4) {
  ctx.globalAlpha = 0.35;
}

if (!ghost && player.shield > 0) {
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.65 + Math.sin(state.frame * 0.15) * 0.2;

  ctx.beginPath();
  ctx.ellipse(x + player.w / 2, y + player.h / 2, 23, 28, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// الجسم.
const bodyGradient = ctx.createLinearGradient(x, y, x + player.w, y + player.h);
bodyGradient.addColorStop(0, ghost ? "#a5f3fc" : "#c4b5fd");
bodyGradient.addColorStop(1, ghost ? "#38bdf8" : "#7c3aed");

ctx.fillStyle = bodyGradient;
roundedRect(x, y + 8, player.w, player.h - 8, 9);
ctx.fill();

// الرأس.
ctx.fillStyle = ghost ? "#e0faff" : "#ffdfbd";
ctx.beginPath();
ctx.arc(x + player.w / 2, y + 8, 11, 0, Math.PI * 2);
ctx.fill();

// غطاء الرأس.
ctx.fillStyle = ghost ? "#67e8f9" :
  (state.character === "layan" ? "#ec4899" : "#4f46e5");

ctx.beginPath();
ctx.arc(x + player.w / 2, y + 5, 11, Math.PI, Math.PI * 2);
ctx.fill();

// العينان.
ctx.fillStyle = "#111827";
const eyeX = player.facing >= 0 ? x + 18 : x + 9;

ctx.beginPath();
ctx.arc(eyeX, y + 9, 1.5, 0, Math.PI * 2);
ctx.fill();

// تفاصيل اللباس.
ctx.fillStyle = ghost ? "#e0faff" : COLORS.cyan;
ctx.fillRect(x + 5, y + 20, player.w - 10, 3);

// القدمين.
ctx.fillStyle = ghost ? "#bae6fd" : "#27234a";

const step = Math.sin(player.anim || 0) * 3;

ctx.fillRect(x + 3, y + player.h - 5, 9, 6 + step);
ctx.fillRect(x + player.w - 12, y + player.h - 5, 9, 6 - step);

ctx.restore();

}

function drawPlatesAndDoors() {
for (let y = 0; y < state.rows; y++) {
for (let x = 0; x < state.cols; x++) {
drawTile(x, y, getTile(x, y));
}
}
}

function drawEffects() {
for (const particle of state.particles) {
ctx.save();
ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
ctx.fillStyle = particle.color;

  ctx.beginPath();
  ctx.arc(
    particle.x - state.cameraX,
    particle.y,
    particle.size,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

ctx.textAlign = "center";
ctx.font = "bold 15px Cairo, Arial";

for (const text of state.floatingTexts) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, text.life / 15);
  ctx.fillStyle = text.color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#000";

  ctx.fillText(
    text.text,
    text.x - state.cameraX,
    text.y
  );

  ctx.restore();
}

}

function render() {
ctx.save();

if (state.shake > 0.5) {
  ctx.translate(
    (Math.random() - 0.5) * state.shake,
    (Math.random() - 0.5) * state.shake
  );
}

drawBackground();

if (state.level) {
  drawPlatesAndDoors();
  drawMovers();
  drawGems();
  drawPowerups();

  for (const ghost of state.ghosts) {
    drawPlayer(ghost, true);
  }

  if (state.player) drawPlayer(state.player);
  drawEffects();
}

ctx.restore();

}

function gameLoop() {
update();
render();
requestAnimationFrame(gameLoop);
}

function startGame() {
if (!levels.length) {
showHint("تعذر تحميل المراحل. تأكد من ملف levels.js.");
return;
}

const savedCharacter = localStorage.getItem(CHARACTER_KEY);
const selected = document.querySelector("[data-character].selected");

state.character =
  selected?.dataset.character ||
  savedCharacter ||
  "adam";

state.lives = 3;
state.running = true;
state.paused = false;

loadLevel(state.levelIndex, true);
hideOverlay("o1");
hideOverlay("gameOver");
hideOverlay("o2");

canvas.focus();
sound(520, 0.08);

}

function restartLevel() {
state.ghosts = [];
state.recording = [];
state.lives = 3;
state.running = true;
state.paused = false;

loadLevel(state.levelIndex, true);
hideOverlay("gameOver");
hideOverlay("o2");
hideOverlay("o1");

}

function nextLevel() {
if (state.levelIndex >= levels.length - 1) {
state.levelIndex = 0;
state.score = 0;
state.totalGems = 0;
} else {
state.levelIndex++;
}

state.lives = 3;
state.running = true;
state.ghosts = [];

loadLevel(state.levelIndex, true);
hideOverlay("o2");

}

// لوحة المفاتيح.
window.addEventListener("keydown", event => {
const keys = [
"ArrowLeft", "ArrowRight", "ArrowUp",
"ArrowDown", "Space"
];

if (keys.includes(event.code)) event.preventDefault();

state.keys[event.code] = true;

if (event.code === "Escape" && state.running) {
  state.paused = !state.paused;
  showHint(state.paused ? "اللعبة متوقفة مؤقتًا" : "رجعنا للعب!");
}

if (event.code === "KeyR" && state.gameOver) restartLevel();

});

window.addEventListener("keyup", event => {
state.keys[event.code] = false;
});

window.addEventListener("blur", () => {
state.keys = Object.create(null);
state.pointerButtons = Object.create(null);
});

// تحكم باللمس والماوس مع دعم الضغط المستمر.
function bindHoldButton(id, key) {
const button = $(id);
if (!button) return;

const down = event => {
  event.preventDefault();
  state.pointerButtons[key] = true;

  try {
    button.setPointerCapture(event.pointerId);
  } catch (_) {}
};

const up = event => {
  event.preventDefault();
  state.pointerButtons[key] = false;
};

button.addEventListener("pointerdown", down);
button.addEventListener("pointerup", up);
button.addEventListener("pointercancel", up);
button.addEventListener("lostpointercapture", up);
button.addEventListener("contextmenu", e => e.preventDefault());

}

bindHoldButton("left", "left");
bindHoldButton("right", "right");
bindHoldButton("jump", "jump");

$("go")?.addEventListener("click", startGame);
$("rs")?.addEventListener("click", restartLevel);
$("nx")?.addEventListener("click", nextLevel);
$("n2")?.addEventListener("click", nextLevel);
$("winRestart")?.addEventListener("click", restartLevel);
$("gameOverRestart")?.addEventListener("click", restartLevel);

$("soundToggle")?.addEventListener("click", () => {
state.muted = !state.muted;
saveProgress();

$("soundToggle").textContent = state.muted ? "🔇" : "🔊";
showHint(state.muted ? "الصوت مكتوم" : "الصوت يعمل");

});

// دوال اختيارية للربط مع أجزاء أخرى من المشروع.
window.restartLevel = restartLevel;
window.startM11Game = startGame;
window.nextM11Level = nextLevel;

loadSave();

if (levels.length) {
loadLevel(state.levelIndex, true);
}

requestAnimationFrame(gameLoop);
})();
