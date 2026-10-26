/* الأسطى - لعبة ميكروباص | Developed by Mr. Mohamed Hussain - M11 */
'use strict';

const FARE = 5;                       // أجرة الفرد
const NOTES = [1, 5, 10, 20, 50];     // فئات الباقي
const PAID = [10, 20, 50, 100];       // اللي الراكب ممكن يدفعه
const FACES = ['🧔', '👩', '👴', '👵', '🧑‍🎓', '👨‍💼', '👩‍🦱', '🧕', '👨‍🔧'];
const SAYS = ['على جنب يا أسطى!', 'الأجرة يا أسطى', 'ماشي ورايا مشوار', 'خد يا أسطى', 'يا أسطى بسرعة شوية'];
const REQUESTS = [
  { key: 'right', say: 'على اليمين يا أسطى!', btn: '↪ يمين' },
  { key: 'left',  say: 'على الشمال يا أسطى!', btn: '↩ شمال' },
  { key: 'wait',  say: 'استنى لحظة يا أسطى!', btn: '✋ استنى' },
];
const MAX_LIVES = 3;
const FUEL_PER_TRIP = 15;             // استهلاك البنزين بين كل محطتين (٪)
const FUEL_PRICE = 3;                 // تمن كل ١٠٪ بنزين

const $ = (id) => document.getElementById(id);
const el = {
  stop: $('hudStop'), score: $('hudScore'), lives: $('hudLives'), fuel: $('hudFuel'), fuelBox: $('fuelBox'),
  road: $('road'), queue: $('queue'), face: $('face'), say: $('say'), bill: $('bill'),
  patience: $('patience'), hand: $('handSum'), notes: $('notes'), requests: $('requests'), toast: $('toast'),
  give: $('give'), clear: $('clear'), refuel: $('refuel'), mute: $('mute'), desk: document.querySelector('.desk'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), start: $('start'),
  nameForm: $('nameForm'), nameInput: $('nameInput'), boardBox: $('boardBox'), board: $('board'),
};

let s;          // حالة اللعبة
let timer = null;

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

/* ---------- إنشاء الركاب ---------- */
function makePassenger(stop) {
  const seats = 1 + rand(Math.min(4, 1 + Math.floor(stop / 3)));
  const total = FARE * seats;
  const options = PAID.filter((p) => p > total);
  const paid = stop < 3 ? options[0] : pick(options.slice(0, stop < 6 ? 2 : 3));
  const maxPatience = Math.max(6, 14 - stop * 0.6) + seats + 2;
  const request = stop >= 2 && Math.random() < 0.4 ? pick(REQUESTS) : null;
  return { seats, total, paid, change: paid - total, face: pick(FACES), say: pick(SAYS), request, maxPatience };
}

/* ---------- الدورة ---------- */
function startGame() {
  s = { stop: 1, score: 0, lives: MAX_LIVES, fuel: 100, queue: [], hand: 0, patience: 0, reqDone: false, busy: false };
  el.overlay.classList.add('hidden');
  el.nameForm.hidden = true;
  Sound.startMusic();
  beginStop();
}

function beginStop() {
  const count = Math.min(6, 2 + Math.floor(s.stop / 2));
  s.queue = Array.from({ length: count }, () => makePassenger(s.stop));
  el.road.classList.remove('driving');
  s.busy = false;
  Sound.horn();
  nextPassenger();
  renderHud();
}

function nextPassenger() {
  if (!s.queue.length) return travel();
  s.hand = 0;
  s.reqDone = false;
  s.patience = s.queue[0].maxPatience;
  setToast('');
  render();
  clearInterval(timer);
  timer = setInterval(tick, 100);
}

function tick() {
  s.patience -= 0.1;
  if (s.patience <= 0) return passengerLeft();
  renderPatience();
}

function passengerLeft() {
  clearInterval(timer);
  s.queue.shift();
  s.lives--;
  Sound.angry();
  setToast('الراكب نزل زعلان!', 'bad');
  renderHud();
  if (s.lives <= 0) return gameOver('٣ ركاب نزلوا زعلانين.');
  setTimeout(nextPassenger, 700);
}

function penalize(ratio, message) {
  const p = s.queue[0];
  s.patience = Math.max(0.5, s.patience - p.maxPatience * ratio);
  Sound.wrong();
  setToast(message, 'bad');
  el.desk.classList.remove('shake'); void el.desk.offsetWidth; el.desk.classList.add('shake');
}

function submit() {
  if (s.busy || !s.queue.length) return;
  const p = s.queue[0];
  if (p.request && !s.reqDone) return setToast('الراكب عايز منك حاجة الأول!', 'bad');
  if (s.hand === p.change) {
    clearInterval(timer);
    const tip = Math.floor((s.patience / p.maxPatience) * 5) + (p.request ? 2 : 0);
    s.score += p.total + tip;
    Sound.coin();
    setToast(tip ? `تمام! +${p.total} وبقشيش ${tip}` : `تمام! +${p.total}`, 'ok');
    s.queue.shift();
    renderHud();
    s.busy = true;
    setTimeout(() => { s.busy = false; nextPassenger(); }, 600);
  } else {
    penalize(0.2, s.hand > p.change ? 'كده كتير يا أسطى!' : 'ناقص يا أسطى!');
    s.hand = 0;
    render();
  }
}

function answerRequest(key) {
  if (s.busy || !s.queue.length) return;
  const p = s.queue[0];
  if (!p.request) return setToast('محدش طلب منك حاجة.');
  if (s.reqDone) return;
  if (p.request.key === key) {
    s.reqDone = true;
    Sound.fuel();
    setToast('تمام يا باشا!', 'ok');
    render();
  } else {
    penalize(0.15, 'مش ده اللي طلبه!');
  }
}

/* ---------- البنزين ---------- */
function refuel(auto = false) {
  if (s.busy && !auto) return;
  const units = Math.min(Math.ceil((100 - s.fuel) / 10), Math.floor(s.score / FUEL_PRICE));
  if (s.fuel >= 100) return setToast('التنك مليان.');
  if (units <= 0) return setToast('الحساب مش مكفّي بنزين.', 'bad');
  s.fuel = Math.min(100, s.fuel + units * 10);
  s.score -= units * FUEL_PRICE;
  Sound.fuel();
  setToast(`اتموّنت بـ ${units * FUEL_PRICE} جنيه.`, 'ok');
  renderHud();
}

function travel() {
  clearInterval(timer);
  s.busy = true;
  if (s.fuel < FUEL_PER_TRIP) refuel(true);
  if (s.fuel < FUEL_PER_TRIP) return gameOver('البنزين خلص في الطريق.');
  s.fuel -= FUEL_PER_TRIP;
  s.stop++;
  el.road.classList.add('driving');
  setToast('في السكة للمحطة اللي بعدها...');
  renderHud();
  setTimeout(beginStop, 1600);
}

function gameOver(reason) {
  clearInterval(timer);
  Sound.stopMusic();
  Sound.over();
  el.road.classList.remove('driving');
  el.ovTitle.textContent = 'خلصت الوردية';
  el.ovText.textContent = `${reason} وصلت المحطة ${s.stop} وجمعت ${s.score} جنيه.`;
  el.start.textContent = 'وردية جديدة';
  el.nameForm.hidden = !Board.qualifies(s.score);
  el.nameInput.value = Board.lastName();
  renderBoard();
  el.overlay.classList.remove('hidden');
  (el.nameForm.hidden ? el.start : el.nameInput).focus();
}

/* ---------- العرض ---------- */
function renderHud() {
  el.stop.textContent = s.stop;
  el.score.textContent = s.score;
  el.fuel.textContent = `${s.fuel}%`;
  el.fuelBox.classList.toggle('low', s.fuel < 30);
  el.lives.textContent = '😠'.repeat(MAX_LIVES - s.lives) + '🙂'.repeat(s.lives);
}

function renderPatience() {
  const p = s.queue[0];
  if (!p) return;
  const ratio = Math.max(0, s.patience / p.maxPatience);
  el.patience.style.transform = `scaleX(${ratio})`;
  el.patience.parentElement.classList.toggle('low', ratio < 0.3);
}

function render() {
  const p = s.queue[0];
  el.queue.replaceChildren(...s.queue.map((q) => Object.assign(document.createElement('span'), { textContent: q.face })));
  el.face.textContent = p.face;
  el.say.textContent = p.request ? `${s.reqDone ? '✔ ' : ''}${p.request.say}` : p.say;
  el.bill.textContent = `${p.seats} ${p.seats === 1 ? 'فرد' : 'أفراد'} · الأجرة ${p.total} · دفع ${p.paid}`;
  el.hand.textContent = s.hand;
  renderPatience();
}

function renderBoard() {
  const list = Board.read();
  el.boardBox.hidden = !list.length;
  el.board.replaceChildren(...list.map((r) =>
    Object.assign(document.createElement('li'), { textContent: `${r.name} · ${r.score} جنيه · محطة ${r.stop}` })));
}

function setToast(text, type = '') {
  el.toast.textContent = text;
  el.toast.className = `toast ${type}`;
}

/* ---------- ربط الأزرار ---------- */
NOTES.forEach((n) => {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: n });
  b.addEventListener('click', () => {
    if (s.busy || !s.queue.length) return;
    s.hand += n;
    el.hand.textContent = s.hand;
  });
  el.notes.append(b);
});
REQUESTS.forEach((r) => {
  const b = Object.assign(document.createElement('button'), { type: 'button', textContent: r.btn });
  b.addEventListener('click', () => answerRequest(r.key));
  el.requests.append(b);
});
el.clear.addEventListener('click', () => { if (!s.busy) { s.hand = 0; el.hand.textContent = 0; } });
el.give.addEventListener('click', submit);
el.refuel.addEventListener('click', () => refuel());
el.start.addEventListener('click', startGame);
el.mute.addEventListener('click', () => {
  const muted = Sound.toggleMute();
  el.mute.textContent = muted ? '🔇' : '🔊';
  const playing = el.overlay.classList.contains('hidden');
  if (!muted && playing) Sound.startMusic();
});
el.nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  Board.add(el.nameInput.value, s.score, s.stop);
  el.nameForm.hidden = true;
  renderBoard();
  el.start.focus();
});

s = { stop: 1, score: 0, lives: MAX_LIVES, fuel: 100, queue: [], hand: 0, patience: 0, reqDone: false, busy: true };
renderHud();
renderBoard();
