// MOONKEEPER — tiny sound synth (no audio files). Sounds are quiet on purpose: on the Moon you only hear what travels through your suit.
export class Sound {
  constructor() { this.on = true; this.ctx = null; }
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.22; this.master.connect(this.ctx.destination); } catch (e) { this.on = false; } }
  toggle() { this.on = !this.on; return this.on; }
  tone(f, dur, type = 'sine', vol = 1, slideTo = null, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.5, lp = 1200, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.buffer = b; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  }
  play(name) {
    if (!this.on || !this.ctx) return; if (this.ctx.state === 'suspended') this.ctx.resume();
    switch (name) {
      case 'click': this.tone(620, 0.05, 'square', 0.25); break;
      case 'blip': this.tone(880, 0.07, 'sine', 0.4); break;
      case 'ok': this.tone(660, 0.09, 'sine', 0.5); this.tone(990, 0.14, 'sine', 0.5, null, 0.08); break;
      case 'bad': this.tone(190, 0.25, 'sawtooth', 0.35, 120); break;
      case 'alarm': for (let i = 0; i < 3; i++) this.tone(540, 0.14, 'square', 0.3, null, i * 0.2); break;
      case 'chirp': this.tone(900, 0.07, 'sine', 0.4, 1500); this.tone(1500, 0.08, 'sine', 0.4, 1100, 0.07); this.tone(1250, 0.06, 'sine', 0.35, 1700, 0.16); break;
      case 'radio': this.noise(0.18, 0.25, 3000); this.tone(1000, 0.08, 'sine', 0.25, null, 0.16); break;
      case 'boom': this.tone(70, 0.9, 'sine', 1, 28); this.noise(0.7, 0.6, 260); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.5, null, i * 0.11)); break;
      case 'geiger': this.noise(0.012, 0.5, 6000); break;
      case 'step': this.tone(85, 0.06, 'sine', 0.3, 55); break;
      case 'lift': this.tone(120, 1.0, 'sawtooth', 0.12, 60); break;
    }
  }
}
