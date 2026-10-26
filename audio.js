/* أصوات وموسيقى مولّدة بالكود (بدون ملفات) | M11 */
'use strict';

const Sound = (() => {
  let ctx = null, muted = false, musicTimer = null, step = 0;

  function audio() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) ctx = new A();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
    if (muted || !audio()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  // مقام حجاز على ري، نغمة شعبية بسيطة
  const scale = [293.7, 311.1, 370, 392, 440, 466.2, 523.3, 587.3];
  const pattern = [0, 2, 3, 2, 4, 3, 2, 1, 0, 1, 2, 3, 5, 4, 3, 2];

  function startMusic() {
    stopMusic();
    if (muted) return;
    musicTimer = setInterval(() => {
      tone(scale[pattern[step++ % pattern.length]], 0.22, 'triangle', 0.045);
      if (step % 4 === 1) tone(scale[0] / 2, 0.3, 'sine', 0.06);
    }, 260);
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  return {
    coin:  () => { tone(880, 0.1, 'square', 0.07); tone(1320, 0.15, 'square', 0.07, 0.08); },
    wrong: () => tone(140, 0.3, 'sawtooth', 0.1),
    angry: () => { tone(220, 0.15, 'sawtooth', 0.1); tone(165, 0.3, 'sawtooth', 0.1, 0.15); },
    horn:  () => { tone(330, 0.35, 'square', 0.06); tone(415, 0.35, 'square', 0.06); },
    fuel:  () => { tone(500, 0.08, 'triangle', 0.12); tone(700, 0.08, 'triangle', 0.12, 0.1); },
    over:  () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.25)),
    startMusic,
    stopMusic,
    toggleMute() {
      muted = !muted;
      if (muted) stopMusic();
      return muted;
    },
    isMuted: () => muted,
  };
})();
