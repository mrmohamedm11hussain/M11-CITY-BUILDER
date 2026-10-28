const Snd = {
c: null,
nb: null,
master: null,
droneGain: null,
heartbeatTimer: null,
ambientTimer: null,
started: false,

init() {
if (this.started) {
if (this.c && this.c.state === 'suspended') this.c.resume();
return;
}

try {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const c = this.c = new AudioContextClass();
  this.started = true;

  this.master = c.createGain();
  this.master.gain.value = 0.72;
  this.master.connect(c.destination);

  const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  this.nb = buffer;

  // Deep atmospheric drone
  [38, 51.5, 76].forEach((frequency, index) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();

    osc.type = index === 0 ? 'sine' : 'triangle';
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    gain.gain.value = [0.19, 0.075, 0.025][index];

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
  });

  // Slow, uneasy atmospheric movement
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();

  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 5;

  lfo.connect(lfoGain);
  lfoGain.connect(this.droneFrequencyTarget());
  lfo.start();

  // Filtered room noise
  const noise = c.createBufferSource();
  const noiseFilter = c.createBiquadFilter();
  const noiseGain = c.createGain();

  noise.buffer = buffer;
  noise.loop = true;

  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 650;

  noiseGain.gain.value = 0.035;

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(this.master);
  noise.start();

  // Very subtle high-frequency air
  const air = c.createBufferSource();
  const airFilter = c.createBiquadFilter();
  const airGain = c.createGain();

  air.buffer = buffer;
  air.loop = true;

  airFilter.type = 'highpass';
  airFilter.frequency.value = 2400;

  airGain.gain.value = 0.006;

  air.connect(airFilter);
  airFilter.connect(airGain);
  airGain.connect(this.master);
  air.start();

  this.startAmbientEvents();
} catch (error) {
  console.warn('Audio could not start:', error);
}

},

droneFrequencyTarget() {
const c = this.c;
const osc = c.createOscillator();
const gain = c.createGain();

osc.type = 'sine';
osc.frequency.value = 42;
gain.gain.value = 0.012;

osc.connect(gain);
gain.connect(this.master);
osc.start();

return osc.frequency;

},

tone(frequency, duration, volume, type, endFrequency) {
if (!this.c || !this.master) return;

try {
  const c = this.c;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(Math.max(1, frequency), now);

  if (endFrequency && endFrequency > 0) {
    osc.frequency.exponentialRampToValueAtTime(
      endFrequency,
      now + Math.max(0.03, duration)
    );
  }

  gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + Math.max(0.03, duration)
  );

  osc.connect(gain);
  gain.connect(this.master);

  osc.start(now);
  osc.stop(now + Math.max(0.03, duration) + 0.02);
} catch (error) {
  // Ignore unsupported audio operations.
}

},

thump(intensity) {
if (!this.c) return;

const level = Math.max(0.2, Math.min(1.5, intensity || 1));

this.tone(75, 0.24, 0.34 * level, 'sine', 35);
this.tone(48, 0.32, 0.13 * level, 'sine', 25);

},

beat() {
this.thump(0.85);
setTimeout(() => this.thump(0.55), 180);
},

ding() {
this.tone(660, 0.8, 0.055, 'sine', 520);
setTimeout(() => this.tone(880, 1.1, 0.035, 'sine', 660), 130);
},

creak() {
this.tone(85, 1.1, 0.085, 'sawtooth', 190);
setTimeout(() => this.tone(125, 0.7, 0.035, 'triangle', 75), 160);
},

hiss() {
if (!this.c || !this.nb) return;

try {
  const c = this.c;
  const now = c.currentTime;
  const source = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();

  source.buffer = this.nb;

  filter.type = 'highpass';
  filter.frequency.value = 2200;

  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.master);

  source.start(now);
  source.stop(now + 1.25);
} catch (error) {
  // Keep gameplay running if a sound effect fails.
}

},

startAmbientEvents() {
if (this.ambientTimer) clearInterval(this.ambientTimer);

this.ambientTimer = setInterval(() => {
  if (!this.c || this.c.state !== 'running') return;

  // Random distant metallic creaks
  if (Math.random() < 0.38) {
    this.tone(
      180 + Math.random() * 180,
      0.7 + Math.random() * 1.1,
      0.009 + Math.random() * 0.012,
      'triangle',
      65 + Math.random() * 35
    );
  }

  // Occasional faint low rumble
  if (Math.random() < 0.2) {
    this.tone(55, 1.6, 0.065, 'sine', 28);
  }
}, 4200);

},

stop() {
if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
if (this.ambientTimer) clearInterval(this.ambientTimer);

this.heartbeatTimer = null;
this.ambientTimer = null;

}
};
