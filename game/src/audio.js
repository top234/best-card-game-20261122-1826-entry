// Ember Duel — tiny WebAudio bleeps, synthesised in code (no audio files, no
// network). Silent until the first click unlocks the AudioContext.
let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, duration, type = 'triangle', volume = 0.12, delay = 0) {
  try {
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ac.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // No audio device, or autoplay blocked: the game stays silent.
  }
}

export const sfx = {
  unlock() { audio(); },
  click() { tone(660, 0.07); },
  play() { tone(440, 0.1); tone(660, 0.13, 'triangle', 0.1, 0.06); },
  hit() { tone(150, 0.16, 'sawtooth', 0.16); },
  heal() { tone(520, 0.16, 'sine', 0.1); tone(780, 0.22, 'sine', 0.08, 0.09); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.24, 'triangle', 0.12, i * 0.13)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.26, 'triangle', 0.1, i * 0.15)); },
};
