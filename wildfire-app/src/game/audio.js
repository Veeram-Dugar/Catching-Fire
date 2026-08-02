// Procedurally synthesized sound effects via the Web Audio API — no audio
// asset files, matching how the game's visuals are all drawn in code
// (Boot.js) rather than loaded images. Volumes are kept low since spray
// and coin sounds fire constantly during gameplay.

let ctx;

function getContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null; // unsupported browser — sound is optional
    ctx = new AudioContextClass();
  }
  // Browsers start the context suspended until a user gesture. By the time
  // any sound here plays, the player has already clicked/pressed something
  // to reach this point (Menu's Start button, a key press), so this just
  // wakes it up rather than waiting on a dedicated "enable audio" step.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, duration, type = 'sine', volume = 0.15, delay = 0, freqEnd }) {
  const audio = getContext();
  if (!audio) return;

  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);

  // Exponential decay reads as a natural "pluck" rather than an abrupt cutoff.
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function playSpray() {
  tone({ freq: 900, freqEnd: 500, duration: 0.12, type: 'sine', volume: 0.07 });
}

export function playCoin() {
  tone({ freq: 660, duration: 0.08, type: 'square', volume: 0.09 });
  tone({ freq: 990, duration: 0.1, type: 'square', volume: 0.09, delay: 0.05 });
}

export function playCombo(comboCount) {
  const freq = 500 + Math.min(comboCount, 6) * 80;
  tone({ freq, duration: 0.12, type: 'triangle', volume: 0.11 });
}

export function playGolden() {
  [660, 880, 1100, 1320].forEach((freq, i) =>
    tone({ freq, duration: 0.1, type: 'triangle', volume: 0.11, delay: i * 0.06 })
  );
}

export function playWaveClear() {
  [523, 659, 784, 1047].forEach((freq, i) =>
    tone({ freq, duration: 0.18, type: 'sine', volume: 0.13, delay: i * 0.09 })
  );
}

export function playGameOver() {
  [440, 370, 294, 220].forEach((freq, i) =>
    tone({ freq, duration: 0.25, type: 'sawtooth', volume: 0.09, delay: i * 0.15 })
  );
}

export function playShield() {
  tone({ freq: 300, freqEnd: 700, duration: 0.3, type: 'sine', volume: 0.11 });
}
