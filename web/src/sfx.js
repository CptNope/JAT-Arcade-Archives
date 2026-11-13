// Tiny synthesized sound effects (no audio files). Audio starts only after a user gesture.
const SOUNDS = {
  start:  [['square', 440, 0.06], ['square', 660, 0.06], ['square', 880, 0.1]],
  paddle: [['square', 520, 0.04]],
  wall:   [['square', 260, 0.03]],
  point:  [['triangle', 180, 0.25]],
  shoot:  [['sawtooth', 900, 0.06, 300]],
  hit:    [['noise', 0, 0.12]],
  die:    [['sawtooth', 300, 0.5, 40]],
  over:   [['triangle', 330, 0.15], ['triangle', 247, 0.15], ['triangle', 196, 0.35]],
  gem:    [['square', 1200, 0.025]],
  power:  [['square', 300, 0.08, 900]],
  step1:  [['square', 70, 0.05]],
  step2:  [['square', 60, 0.05]],
};

export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.vol = 0.12; }
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  }
  play(name) {
    const ac = this.ctx; if (!ac || this.muted) return;
    let t = ac.currentTime;
    for (const [type, f, dur, f2] of SOUNDS[name] || []) {
      const g = ac.createGain();
      g.gain.setValueAtTime(this.vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(ac.destination);
      let src;
      if (type === 'noise') {
        const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        src = ac.createBufferSource(); src.buffer = buf;
      } else {
        src = ac.createOscillator(); src.type = type; src.frequency.setValueAtTime(f, t);
        if (f2) src.frequency.exponentialRampToValueAtTime(f2, t + dur);
      }
      src.connect(g); src.start(t); src.stop(t + dur + 0.02);
      t += dur;
    }
  }
}
