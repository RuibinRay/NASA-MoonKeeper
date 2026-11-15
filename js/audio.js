// MOONKEEPER — sound made in the browser (no audio files).
// The Moon has no air, so nothing outside reaches your ears through space. What you hear with the helmet on
// comes through the suit and the ground: dull, low and close. Indoors, with the suit off, the station hums.
const CALM = [[110.0, 164.81, 261.63, 392.0], [87.31, 174.61, 220.0, 329.63], [130.81, 196.0, 261.63, 329.63], [98.0, 146.83, 246.94, 293.66]];   // A minor 9, F major 7, C major, G major
const TENSE = [[82.41, 123.47, 174.61, 233.08], [87.31, 130.81, 185.0, 246.94]];                                                                   // close, uneasy clusters
const INTERFACE = { click: 1, blip: 1, ok: 1, win: 1, chirp: 1, radio: 1, alarm: 1, geiger: 1, call: 1, static: 1 };   // sounds made inside the helmet or by the screen: never muffled

export class Sound {
  constructor() { this.on = true; this.music = true; this.ctx = null; this.st = {}; this.breath = 0; this.mood = 0; this.chordT = 0; this.chordI = 0; this.wasTense = false; }
  init() {
    if (this.ctx) return;
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)(), G = (v, to) => { const g = c.createGain(); g.gain.value = v; g.connect(to); return g; };
      const F = (type, hz, to, q = 0.7) => { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q; f.connect(to); return f; };
      this.master = G(0.22, c.destination);
      this.suit = F('lowpass', 16000, this.master);                      // world sounds pass through here: it closes when the helmet is on
      // two loops of noise: a soft rumble for air and engines, a bright hiss for breath
      const mk = (brown) => { const n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let last = 0;
        for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
        for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] *= k; d[n - 1 - i] *= k; }                                                    // no click where the loop joins
        return b; };
      const loop = (buf, to) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(to); s.start(); return s; }, osc = (type, hz, to) => { const o = c.createOscillator(); o.type = type; o.frequency.value = hz; o.connect(to); o.start(); return o; };
      const brown = mk(true), white = mk(false);
      // the station's air: fans and ducts, and the low hum of its machines
      this.ventG = G(0, this.suit); this.ventF = F('lowpass', 500, this.ventG); loop(brown, this.ventF);
      this.humG = G(0, this.suit); this.hum = osc('sine', 55, this.humG); this.hum2 = osc('sine', 110, G(0.35, this.humG));
      // your own breathing inside the helmet
      this.breathG = G(0, this.master); loop(white, F('bandpass', 1500, this.breathG, 1.1));
      // vehicles, felt through the seat and the suit
      this.engG = G(0, this.suit); this.eng = osc('sawtooth', 45, F('lowpass', 320, this.engG));
      this.rumbleG = G(0, this.suit); loop(brown, F('lowpass', 190, this.rumbleG));
      // music: four slow voices and a low pulse that comes in with danger
      this.musicG = G(0, this.master); this.musicF = F('lowpass', 700, this.musicG);
      this.voices = CALM[0].map((hz, i) => osc(i < 2 ? 'sine' : 'triangle', hz, G(i < 2 ? 0.34 : 0.2, this.musicF)));
      this.pulseG = G(0, this.master); this.pulse = osc('triangle', 55, F('lowpass', 220, this.pulseG));
    } catch (e) { this.on = false; }
  }
  toggle() { this.on = !this.on; if (this.ctx) this.master.gain.setTargetAtTime(this.on ? 0.22 : 0, this.ctx.currentTime, 0.05); return this.on; }
  setMusic(on) { this.music = !!on; }

  // Called every frame while the game runs. st: { indoors, suit, power 0..1, vehicle, speed, thrust, digging, danger 0..1 }
  update(dt, st) {
    if (!this.ctx) return; this.st = st; const c = this.ctx, t = c.currentTime, to = (p, v, k = 0.25) => p.setTargetAtTime(v, t, k);
    to(this.master.gain, this.on ? 0.22 : 0, 0.05);
    to(this.suit.frequency, st.suit ? 620 : 16000, 0.2);                                               // helmet on: only the low part of a sound gets through
    const pw = st.indoors ? st.power : 0;                                                              // the station's hum winds down in a power cut
    to(this.ventG.gain, st.indoors ? 0.07 + 0.33 * pw : 0, 0.6); to(this.ventF.frequency, 260 + 320 * pw, 0.8);
    to(this.humG.gain, 0.09 * pw, 0.8); to(this.hum.frequency, 55 * (0.62 + 0.38 * pw), 1.2); to(this.hum2.frequency, 110 * (0.62 + 0.38 * pw), 1.2);
    this.breath += dt * (1.25 + 0.22 * Math.min(6, st.speed || 0)); to(this.breathG.gain, st.suit ? 0.06 + 0.11 * Math.max(0, Math.sin(this.breath)) : 0, 0.12);   // faster when you run
    const v = st.vehicle, sp = Math.abs(st.speed || 0), th = st.thrust || 0;
    to(this.engG.gain, v === 'car' ? 0.05 + Math.min(0.2, sp * 0.014) : v === 'dig' ? (st.digging ? 0.2 : 0.06 + Math.min(0.1, sp * 0.05)) : v === 'ship' ? 0.1 * th : 0, 0.15);
    to(this.eng.frequency, v === 'car' ? 42 + sp * 6.5 : v === 'dig' ? (st.digging ? 62 : 34 + sp * 9) : 38 + th * 26, 0.12);
    to(this.rumbleG.gain, v === 'ship' ? 0.55 * th : v === 'car' ? Math.min(0.12, sp * 0.008) : 0, 0.15);
    // music: calm chords drift slowly; danger pulls them into close, uneasy ones and brings in a low pulse
    this.mood += ((st.danger || 0) - this.mood) * Math.min(1, dt * 0.6); const tense = this.mood > 0.3;
    this.chordT -= dt; if (this.chordT <= 0 || tense !== this.wasTense) { this.chordT = tense ? 5 : 9; const set = tense ? TENSE : CALM; this.chordI = (this.chordI + 1) % set.length; set[this.chordI].forEach((hz, i) => to(this.voices[i].frequency, hz, 0.9)); }
    if (this.wasTense && !tense && this.on && this.music) [392, 523.25, 659.25, 783.99].forEach((hz, i) => this.tone(hz, 0.9, 'triangle', 0.16, null, i * 0.22, this.master));   // the danger has passed
    this.wasTense = tense;
    to(this.musicG.gain, this.music ? 0.2 + 0.1 * this.mood : 0, 0.8); to(this.musicF.frequency, 620 + 900 * this.mood, 0.8);
    to(this.pulseG.gain, this.music ? this.mood * 0.2 * (0.5 + 0.5 * Math.sin(t * 9.4)) : 0, 0.05);
  }

  tone(f, dur, type = 'sine', vol = 1, slideTo = null, delay = 0, dest = this.suit) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.5, lp = 1200, delay = 0, dest = this.suit) {
    const c = this.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.buffer = b; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(dest); s.start(t);
  }
  play(name) {
    if (!this.on || !this.ctx) return; if (this.ctx.state === 'suspended') this.ctx.resume();
    const d = INTERFACE[name] ? this.master : this.suit, T = (f, dur, type, vol, slide, delay) => this.tone(f, dur, type, vol, slide, delay, d), N = (dur, vol, lp, delay) => this.noise(dur, vol, lp, delay, d);
    switch (name) {
      case 'click': T(620, 0.05, 'square', 0.25); break;
      case 'blip': T(880, 0.07, 'sine', 0.4); break;
      case 'ok': T(660, 0.09, 'sine', 0.5); T(990, 0.14, 'sine', 0.5, null, 0.08); break;
      case 'bad': T(190, 0.25, 'sawtooth', 0.35, 120); break;
      case 'alarm': for (let i = 0; i < 3; i++) T(540, 0.14, 'square', 0.3, null, i * 0.2); break;
      case 'chirp': T(900, 0.07, 'sine', 0.4, 1500); T(1500, 0.08, 'sine', 0.4, 1100, 0.07); T(1250, 0.06, 'sine', 0.35, 1700, 0.16); break;
      case 'radio': N(0.18, 0.25, 3000); T(1000, 0.08, 'sine', 0.25, null, 0.16); break;
      case 'call': T(2525, 0.22, 'sine', 0.22); N(0.5, 0.12, 2600, 0.24); T(2475, 0.22, 'sine', 0.2, null, 0.78); break;   // a transmission: a tone, a breath of static, a second tone
      case 'static': N(0.9, 0.22, 3200); N(0.5, 0.14, 1400, 0.3); break;                                                          // nobody on the other end
      case 'boom': T(70, 0.9, 'sine', 1, 28); N(0.7, 0.6, 260); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.22, 'triangle', 0.5, null, i * 0.11)); break;
      case 'geiger': N(0.012, 0.5, 6000); break;
      case 'step': if (this.st.suit) T(72, 0.09, 'sine', 0.34, 46); else { N(0.05, 0.2, 1500); T(115, 0.05, 'sine', 0.16, 80); } break;   // a dull thump through the boot, or a shoe on the deck
      case 'thud': T(58, 0.24, 'sine', 0.6, 34); N(0.14, 0.3, 300); break;                                                                // the hopper's feet coming down
      case 'hiss': N(1.25, 0.2, 5200); N(0.5, 0.12, 1800, 0.1); break;   // air leaving or entering the airlock
      case 'door': T(96, 0.4, 'sawtooth', 0.1, 62); N(0.12, 0.14, 700, 0.36); break;   // an airlock door sliding
      case 'lift': T(120, 1.0, 'sawtooth', 0.12, 60); break;
    }
  }
}
