// MOONKEEPER 2 — characters: astronauts (player, mentors, rescued crew), REGO the companion robot, and BOLT helper robots.
import * as THREE from '../lib/three.module.min.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const mesh = (g, m, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(g, m); k.position.set(x, y, z); k.castShadow = true; return k; };

export class Astronaut {
  constructor(accent = 0xff7a1a) {
    const g = this.group = new THREE.Group();
    const white = std({ color: 0xecece7, roughness: 0.85 }), grey = std({ color: 0x8b8f96, roughness: 0.9 }), dark = std({ color: 0x2a2c30, roughness: 0.6 });
    const acc = std({ color: accent, roughness: 0.65 }), gold = std({ color: 0xffb62e, metalness: 0.95, roughness: 0.16, emissive: 0x4a3200, emissiveIntensity: 0.9 });
    this.body = new THREE.Group(); g.add(this.body);
    const torso = mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 14), white, 0, 1.24, 0); torso.scale.set(1.1, 1, 0.86); this.body.add(torso);
    this.body.add(mesh(new THREE.BoxGeometry(0.32, 0.22, 0.1), grey, 0, 1.3, 0.27));
    this.body.add(mesh(new THREE.BoxGeometry(0.54, 0.74, 0.27), white, 0, 1.34, -0.31));
    this.body.add(mesh(new THREE.BoxGeometry(0.07, 0.2, 0.02), std({ color: 0x111111, emissive: 0x49e6ff, emissiveIntensity: 2.4 }), 0, 1.5, -0.455));
    this.body.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20), grey, 0, 1.63, 0).rotateX(Math.PI / 2));
    this.head = new THREE.Group(); this.head.position.y = 1.86; this.body.add(this.head);
    this.head.add(mesh(new THREE.SphereGeometry(0.275, 22, 16), white));
    const visor = mesh(new THREE.SphereGeometry(0.245, 22, 16), gold, 0, 0.0, 0.06); visor.scale.set(1, 0.92, 1); this.head.add(visor);
    const limb = (len, r) => new THREE.CapsuleGeometry(r, len, 5, 10);
    this.legs = []; this.arms = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(0.17 * s, 0.94, 0); g.add(leg);
      leg.add(mesh(limb(0.56, 0.135), white, 0, -0.42, 0)); leg.add(mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.09, 12), acc, 0, -0.42, 0)); leg.add(mesh(new THREE.BoxGeometry(0.22, 0.15, 0.36), grey, 0, -0.86, 0.05)); this.legs.push(leg);
      const arm = new THREE.Group(); arm.position.set(0.44 * s, 1.52, 0); arm.rotation.z = 0.12 * s; this.body.add(arm);
      arm.add(mesh(limb(0.46, 0.105), white, 0, -0.3, 0)); arm.add(mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.1, 12), acc, 0, -0.14, 0)); arm.add(mesh(new THREE.SphereGeometry(0.115, 10, 8), dark, 0, -0.64, 0)); this.arms.push(arm);
    }
    this.lamp = new THREE.SpotLight(0xfff2dc, 0, 60, 0.5, 0.7, 1); this.lamp.position.set(0, 1.9, 0.3); this.lamp.target.position.set(0, 0.4, 14); g.add(this.lamp, this.lamp.target);
    this.phase = 0;
  }
  // pose: 'walk' (default), 'wave', 'work' (hammering), 'carry' (box held in front), 'drag' (pulling something behind), 'sit'
  update(dt, speed = 0, air = false, pose = 'walk') {
    this.phase += dt * (2.2 + speed * 0.75);
    const k = Math.min(1, speed / 5), sw = Math.sin(this.phase) * 0.62 * k, [L, R] = this.arms;
    this.legs[0].rotation.x = pose === 'sit' ? -1.4 : air ? -0.35 : sw; this.legs[1].rotation.x = pose === 'sit' ? -1.4 : air ? 0.25 : -sw;
    if (pose === 'work') { L.rotation.x = -1.2 + Math.sin(this.phase * 4.5) * 0.55; R.rotation.x = -1.2 + Math.sin(this.phase * 4.5 + 1.6) * 0.55; }
    else if (pose === 'carry') { L.rotation.x = R.rotation.x = -1.25; }
    else if (pose === 'drag') { L.rotation.x = R.rotation.x = 0.95; }
    else if (pose === 'sit') { L.rotation.x = R.rotation.x = -1.0; }
    else { L.rotation.x = air ? -0.9 : -sw * 0.8; R.rotation.x = pose === 'wave' ? -2.6 + Math.sin(this.phase * 3) * 0.3 : air ? -0.9 : sw * 0.8; }
    this.body.position.y = pose === 'sit' ? -0.35 : air ? 0 : Math.abs(Math.sin(this.phase)) * 0.07 * k + Math.sin(this.phase * 0.35) * 0.012;
    this.body.rotation.x = pose === 'work' ? 0.3 + Math.sin(this.phase * 4.5) * 0.06 : pose === 'drag' ? 0.28 : k * 0.12;
  }
}

function eyeCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export class Rego {
  constructor() {
    const g = this.group = new THREE.Group();
    const white = std({ color: 0xeeeee8, roughness: 0.55 }), orange = std({ color: 0xff7a1a, roughness: 0.55 }), dark = std({ color: 0x24262a, roughness: 0.7, metalness: 0.3 });
    for (const s of [-1, 1]) { const tr = mesh(new THREE.CapsuleGeometry(0.17, 0.44, 5, 12), dark, 0.33 * s, 0.17, 0); tr.rotation.x = Math.PI / 2; tr.scale.x = 0.75; g.add(tr); for (const z of [-0.2, 0.2]) { const w = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 10), std({ color: 0x9aa0a8, metalness: 0.7, roughness: 0.4 }), 0.33 * s, 0.17, z); w.rotation.z = Math.PI / 2; g.add(w); } }
    this.body = new THREE.Group(); this.body.position.y = 0.55; g.add(this.body);
    const b = mesh(new THREE.CapsuleGeometry(0.25, 0.2, 6, 16), white); b.scale.set(1.08, 1, 0.92); this.body.add(b);
    const band = mesh(new THREE.TorusGeometry(0.262, 0.03, 8, 24), orange, 0, -0.1, 0); band.rotation.x = Math.PI / 2; band.scale.set(1.08, 0.92, 1); this.body.add(band);
    const cl = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), std({ color: 0x222222, emissive: 0xffd9a0, emissiveIntensity: 2.5 }), 0, 0.04, 0.235); cl.rotation.x = Math.PI / 2; this.body.add(cl);
    const pt = eyeCanvas(64, 64, (c) => { c.fillStyle = '#0c1a3c'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#7fa0e0'; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, 64); c.moveTo(0, i * 16); c.lineTo(64, i * 16); c.stroke(); } });
    const sp = mesh(new THREE.BoxGeometry(0.36, 0.32, 0.03), std({ map: pt, roughness: 0.3, metalness: 0.4 }), 0, 0.08, -0.27); sp.rotation.x = 0.3; this.body.add(sp);
    this.arms = []; for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(0.3 * s, 0.08, 0.02); this.body.add(a); a.add(mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), white, 0, -0.13, 0)); a.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), dark, 0, -0.28, 0)); a.rotation.z = 0.25 * s; this.arms.push(a); }
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10), dark, 0, 0.9, 0));
    this.head = new THREE.Group(); this.head.position.y = 1.08; g.add(this.head);
    const h = mesh(new THREE.SphereGeometry(0.25, 24, 16), white); h.scale.set(1.3, 0.86, 0.98); this.head.add(h);
    for (const s of [-1, 1]) { const e = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), orange, 0.325 * s, 0, 0); e.rotation.z = Math.PI / 2; this.head.add(e); }
    this.eyeCanvas = document.createElement('canvas'); this.eyeCanvas.width = 256; this.eyeCanvas.height = 128; this.eyeTex = new THREE.CanvasTexture(this.eyeCanvas); this.eyeTex.colorSpace = THREE.SRGBColorSpace;
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.254, 24, 12, Math.PI / 2 - 0.86, 1.72, Math.PI / 2 - 0.5, 1.0), new THREE.MeshBasicMaterial({ map: this.eyeTex })); vis.scale.set(1.3, 0.86, 0.98); this.head.add(vis);
    this.head.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), dark, 0.1, 0.3, 0));
    this.tipMat = std({ color: 0x221100, emissive: 0xffa424, emissiveIntensity: 2 }); this.head.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), this.tipMat, 0.1, 0.41, 0));
    this.lamp = new THREE.SpotLight(0xffe6c0, 0, 30, 0.6, 0.7, 1); this.lamp.position.set(0, 0.6, 0.25); this.lamp.target.position.set(0, 0, 7); g.add(this.lamp, this.lamp.target);
    this.mood = 'happy'; this.t = 0; this.blinkAt = 2; this.wave = 0; this.work = false; this.drawEyes('happy');
  }
  setMood(m) { if (m !== this.mood) { this.mood = m; this.drawEyes(m); } }
  drawEyes(m) {
    const c = this.eyeCanvas.getContext('2d'), W = 256, H = 128; c.fillStyle = '#05090d'; c.fillRect(0, 0, W, H);
    const col = m === 'alert' ? '#ffb02e' : m === 'sad' ? '#6fb6d9' : '#49e6ff'; c.fillStyle = col; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 16; c.lineWidth = 11; c.lineCap = 'round';
    for (const x of [82, 174]) {
      const s = x < 128 ? -1 : 1;
      if (m === 'blink') { c.beginPath(); c.moveTo(x - 20, 66); c.lineTo(x + 20, 66); c.stroke(); }
      else if (m === 'joy') { c.beginPath(); c.arc(x, 78, 22, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      else if (m === 'sad') { c.beginPath(); c.ellipse(x, 72, 17, 21, 0, 0, 7); c.fill(); c.fillStyle = '#05090d'; c.shadowBlur = 0; c.beginPath(); c.moveTo(x - 30 * s, 40); c.lineTo(x + 30 * s, 62); c.lineTo(x + 30 * s, 30); c.fill(); c.fillStyle = col; c.shadowBlur = 16; }
      else if (m === 'worried') { c.beginPath(); c.ellipse(x, 70, 15, 20, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 22 * s, 30); c.lineTo(x + 16 * s, 40); c.stroke(); }
      else if (m === 'alert') { c.beginPath(); c.ellipse(x, 66, 21, 27, 0, 0, 7); c.fill(); c.fillStyle = '#05090d'; c.beginPath(); c.arc(x, 66, 8, 0, 7); c.fill(); c.fillStyle = col; }
      else if (m === 'think') { c.beginPath(); c.ellipse(x, 62 + (x < 128 ? 0 : 8), 17, x < 128 ? 22 : 13, 0, 0, 7); c.fill(); }
      else { c.beginPath(); c.ellipse(x, 66, 18, 24, 0, 0, 7); c.fill(); }
    }
    this.eyeTex.needsUpdate = true;
  }
  update(dt, speed = 0, lookYaw = 0) {
    this.t += dt;
    if (this.t > this.blinkAt) { this.drawEyes('blink'); this.blinkAt = this.t + 2.5 + Math.random() * 3; setTimeout(() => this.drawEyes(this.mood), 130); }
    this.body.position.y = 0.55 + Math.sin(this.t * 2.4) * 0.012 + Math.min(speed, 6) * 0.004 * Math.sin(this.t * 22) + (this.work ? Math.abs(Math.sin(this.t * 9)) * 0.05 : 0);
    this.head.rotation.y += (lookYaw - this.head.rotation.y) * Math.min(1, dt * 5); this.head.rotation.z = Math.sin(this.t * 0.9) * 0.05;
    this.tipMat.emissiveIntensity = this.mood === 'alert' || this.mood === 'worried' ? 2 + Math.sin(this.t * 14) * 2 : 1.2 + Math.sin(this.t * 2) * 0.8;
    if (this.work) { this.arms[0].rotation.x = -1.3 + Math.sin(this.t * 11) * 0.5; this.arms[1].rotation.x = -1.3 + Math.sin(this.t * 11 + 2) * 0.5; this.arms[0].rotation.z = -0.25; this.arms[1].rotation.z = 0.25; }
    else if (this.wave > 0) { this.wave -= dt; this.arms[1].rotation.z = 2.4 + Math.sin(this.t * 14) * 0.35; this.arms[0].rotation.z = this.mood === 'joy' ? -2.4 - Math.sin(this.t * 14) * 0.35 : -0.25; }
    else { this.arms[1].rotation.z += (0.25 - this.arms[1].rotation.z) * 0.15; this.arms[0].rotation.z += (-0.25 - this.arms[0].rotation.z) * 0.15; this.arms[0].rotation.x = this.arms[1].rotation.x = Math.sin(this.t * 3) * 0.1 * Math.min(1, speed); }
  }
}

// BOLT: the yellow service robots that live in the station. One round eye, two wheels, one tool arm.
export class Bolt {
  constructor() {
    const g = this.group = new THREE.Group();
    const yel = std({ color: 0xf2c21a, roughness: 0.55 }), dark = std({ color: 0x1f2126, roughness: 0.7 }), eye = std({ color: 0x0a1a2a, emissive: 0x2aa8ff, emissiveIntensity: 2.2 });
    this.body = new THREE.Group(); g.add(this.body);
    const b = mesh(new THREE.BoxGeometry(0.62, 0.72, 0.52), yel, 0, 0.62, 0); this.body.add(b);
    this.body.add(mesh(new THREE.BoxGeometry(0.64, 0.1, 0.54), dark, 0, 0.4, 0)); this.body.add(mesh(new THREE.BoxGeometry(0.64, 0.1, 0.54), dark, 0, 0.84, 0));
    const e = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 18), eye, 0, 0.68, 0.27); e.rotation.x = Math.PI / 2; this.body.add(e); this.eye = eye;
    for (const s of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14), dark, 0.36 * s, 0.2, 0); w.rotation.z = Math.PI / 2; g.add(w); }
    this.arm = new THREE.Group(); this.arm.position.set(0.34, 0.9, 0); this.body.add(this.arm); this.arm.add(mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), yel, 0, 0.25, 0)); this.arm.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), dark, 0, 0.52, 0));
    this.t = Math.random() * 9;
  }
  update(dt, speed = 0, busy = false) { this.t += dt; this.body.position.y = Math.sin(this.t * 3) * 0.015; this.arm.rotation.x = busy ? -0.6 + Math.sin(this.t * 8) * 0.7 : Math.sin(this.t * 1.5) * 0.15; this.eye.emissiveIntensity = busy ? 2.4 + Math.sin(this.t * 10) : 1.4; }
}
