// MOONKEEPER 2 — the 3D world: a wide lunar surface (base, solar field, other stations) and the red-walled station inside the lava tube.
import * as THREE from '../lib/three.module.min.js';
import { K, STATIONS, SITES, PIT, TUBE, HALL, AIRLOCK, BASE, MINE, ROOMS, ROOM_H, MOUNTS, CAR_PAD, SHIP_PAD, BENCH, FAB, FAB_OUT, roomRect, roomSpot, doorSpot } from './config.js';

const V3 = THREE.Vector3;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= 0.5; f *= 2.03; } return s; }
function seeded(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t; }
const std = (o) => new THREE.MeshStandardMaterial(o);
const glow = (color, intensity = 1.5) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity });
const PANEL_W = 5, PANEL_D = 2.8;

// Earth in the lunar sky for 8.3355°N 33.222°E with a typical libration tilt: azimuth 248°, elevation 57°. It stays there.
export const EARTH_DIR = new V3(-0.5017, 0.8409, 0.2027).normalize();

export class World {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.25, 7000);
    this.top = new THREE.Group(); this.deep = new THREE.Group(); this.deep.position.y = TUBE.y; this.scene.add(this.top, this.deep);
    this.colliders = { top: [], deep: [] }; this.walk = []; this.t = 0; this.zone = 'top'; this.sunDir = new V3(0, 1, 0); this.lamps = [];
    this._mats(); this._lights(); this._sky(); this._terrain(); this._topside(); this._base(); this._sites(); this._mine(); this._vehicles(); this._tube(); this._station(); this._markers(); this._fx(); this._guide();
    this.setZone('top'); this.resize(); window.addEventListener('resize', () => this.resize());
  }
  resize() { const w = window.innerWidth, h = window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  _mats() {
    const rnd = seeded(7), L = new THREE.TextureLoader();
    // Tries each url in turn, so new art can be dropped in without breaking the game when a file is missing.
    const swap = (mat, urls, rep, onOk) => { const list = [].concat(urls), go = (i) => { if (i >= list.length) return; L.load(list[i], (t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = 8; mat.map = t; mat.needsUpdate = true; onOk?.(t, i); }, undefined, () => go(i + 1)); }; go(0); };
    this.texRego = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8b8985'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 105 + rnd() * 70 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 5},${0.25 + rnd() * 0.4})`; const s = rnd() * 2.2 + 0.4; g.fillRect(rnd() * w, rnd() * h, s, s); } }, 150);
    this.texPanel = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#0c1a3c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `rgb(${14 + (i + j) % 2 * 6},${34 + rnd() * 14 | 0},${92 + rnd() * 30 | 0})`; g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); } g.strokeStyle = 'rgba(200,220,255,0.4)'; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); } });
    this.texPanelB = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#1a1d24'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `rgb(${30 + rnd() * 20 | 0},${34 + rnd() * 16 | 0},${48 + rnd() * 26 | 0})`; g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); } g.strokeStyle = '#d8dde6'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); } });
    this.texRock = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6b6762'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 60 + rnd() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v + 2},0.5)`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 5, 1 + rnd() * 2); } for (let j = 0; j < 9; j++) { g.strokeStyle = 'rgba(15,15,15,0.5)'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + j) * 5 + rnd() * 3); g.stroke(); } }, 6);
    const wallTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e9e4dc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#c4281c'; g.beginPath(); g.roundRect(i * 128 + 6, j * 128 + 6, 116, 116, 12); g.fill(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.roundRect(i * 128 + 12, j * 128 + 12, 104, 40, 10); g.fill(); g.fillStyle = '#d9d9d9'; for (const [a, b] of [[14, 14], [114, 14], [14, 114], [114, 114]]) { g.beginPath(); g.arc(i * 128 + a, j * 128 + b, 3, 0, 7); g.fill(); } } });
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    const floorTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5c6268'; g.lineWidth = 3; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 300; i++) g.fillRect(rnd() * w, rnd() * h, 6, 2); });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    this.texScreen = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#04121c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#49e6ff'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < w; x += 4) g.lineTo(x, 70 + Math.sin(x * 0.07) * 18 + Math.sin(x * 0.21) * 7); g.stroke(); g.fillStyle = '#49e6ff'; for (let i = 0; i < 6; i++) g.fillRect(14 + i * 40, 104 - i % 3 * 8, 26, 12 + i % 3 * 8); g.fillStyle = '#ffb347'; g.fillRect(12, 12, 90, 8); });
    this.M = {
      rego: std({ color: 0xb4b3b1, map: this.texRego, roughness: 1, vertexColors: true }), rock: std({ color: 0x77736e, roughness: 1 }),
      basalt: std({ color: 0xc9c2b8, map: this.texRock, roughness: 1, side: THREE.DoubleSide }),
      white: std({ color: 0xe8e8e3, roughness: 0.75 }), grey: std({ color: 0x7c8088, roughness: 0.7, metalness: 0.3 }), dark: std({ color: 0x23262b, roughness: 0.6, metalness: 0.4 }),
      metal: std({ color: 0xb9bec6, roughness: 0.35, metalness: 0.85 }), orange: std({ color: 0xff7a1a, roughness: 0.6 }), foil: std({ color: 0xd9a531, roughness: 0.45, metalness: 0.8 }),
      teal: std({ color: 0x1fb5a8, roughness: 0.6 }), yellow: std({ color: 0xf2c21a, roughness: 0.6 }), blue: std({ color: 0x3a78d8, roughness: 0.5 }), green: std({ color: 0x3f9b46, roughness: 0.8 }), greenD: std({ color: 0x2b6e34, roughness: 0.85 }),
      red: std({ color: 0xd43a2a, roughness: 0.7 }), soil: std({ color: 0x5a4332, roughness: 1 }), straw: std({ color: 0xd9b45a, roughness: 1 }), hen: std({ color: 0xa5602c, roughness: 0.9 }),
      panel: std({ color: 0xffffff, map: this.texPanel, roughness: 0.3, metalness: 0.4, emissive: 0x0a1a44, emissiveIntensity: 0.25 }),
      panelB: std({ color: 0xffffff, map: this.texPanelB, roughness: 0.8 }),
      wall: std({ color: 0xffffff, map: wallTex, roughness: 0.85 }), floor: std({ color: 0xffffff, map: floorTex, roughness: 0.7, metalness: 0.15 }), ceil: std({ color: 0xd9dadc, roughness: 0.9 }),
      screen: new THREE.MeshBasicMaterial({ map: this.texScreen }), glass: std({ color: 0xbfe6ff, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
      water: std({ color: 0x2f8fd8, roughness: 0.1, transparent: true, opacity: 0.6 }), tankW: std({ color: 0x5aa6d8, roughness: 0.35, metalness: 0.4 }), tankO2: std({ color: 0xe6f2ea, roughness: 0.4, metalness: 0.3 }),
      tomato: std({ color: 0xe5362b, roughness: 0.5 }), fish: std({ color: 0xff8a2a, roughness: 0.5 }),
      warm: glow(0xffc27a, 2.2), cyan: glow(0x49e6ff, 2.2), amber: glow(0xffa424, 2.5), redG: glow(0xff3b30, 2.5), greenG: glow(0x4dff88, 2.2), pink: glow(0xff4fd8, 1.6), whiteG: glow(0xffffff, 1.6),
    };
    this.M.door = std({ color: 0xff7a1a, roughness: 0.6 }); this.wallTint = new THREE.Color(0xffffff);
    swap(this.M.wall, ['assets/tex/wall3.jpg', 'assets/tex/wall.jpg'], 0, (t, i) => { if (i) return; this.wallTint.set(0xd4463a); this.M.wall.color.copy(this.wallTint); for (const R of Object.values(this.rooms || {})) { R.wall.map = t; R.wall.needsUpdate = true; } });
    swap(this.M.floor, ['assets/tex/floor3.jpg', 'assets/tex/floor.jpg']); swap(this.M.ceil, 'assets/tex/ceil3.jpg', 0, () => this.M.ceil.color.set(0xffffff));
    swap(this.M.door, 'assets/tex/door3.jpg', 0, (t) => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; this.M.door.color.set(0xffffff); this.M.door.roughness = 0.5; this.M.door.metalness = 0.25; }); swap(this.M.rego, 'assets/tex/rego.jpg', 170);
    this.panelClean = new THREE.Color(0xffffff); this.panelDusty = new THREE.Color(0x9a9690);
  }
  _lights() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 3.2); const s = this.sunLight.shadow; s.mapSize.set(2048, 2048); s.camera.near = 1; s.camera.far = 700; Object.assign(s.camera, { left: -95, right: 95, top: 95, bottom: -95 }); s.bias = -0.0006; s.normalBias = 0.6; this.sunLight.castShadow = true;
    this.earthLight = new THREE.DirectionalLight(0x9dbcf7, 0.2); this.hemi = new THREE.HemisphereLight(0x10141c, 0xaeacaa, 0.6);
    this.scene.add(this.sunLight, this.sunLight.target, this.earthLight, this.earthLight.target, this.hemi);
  }
  lamp(group, x, y, z, color, intensity, dist = 55) { const l = new THREE.PointLight(color, intensity, dist, 1.2); l.position.set(x, y, z); group.add(l); this.lamps.push({ l, base: intensity, top: group === this.top }); return l; }
  _sky() {
    const sky = this.sky = new THREE.Group(); this.scene.add(sky);
    const rnd = seeded(99), n = 2200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 3600; pos.set([Math.cos(a) * s * R, u * R, Math.sin(a) * s * R], i * 3); const b = 0.45 + rnd() * 0.55, tint = rnd(); col.set([b * (0.85 + tint * 0.15), b * 0.92, b * (1 - tint * 0.15)], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starMat = new THREE.PointsMaterial({ size: 2.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, depthTest: false });
    const stars = new THREE.Points(sg, this.starMat); stars.renderOrder = -20; stars.frustumCulled = false; sky.add(stars);
    const D = 2600, ang = (K.EARTH_ANGULAR_DEG * K.EARTH_DRAW_SCALE * Math.PI) / 180;
    const tex = new THREE.TextureLoader().load('assets/tex/earth.jpg'); tex.colorSpace = THREE.SRGBColorSpace;
    this.earthMat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, sunDir: { value: new V3(1, 0, 0) } },
      vertexShader: 'varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 wp=modelMatrix*vec4(position,1.0); vP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }',
      fragmentShader: `uniform sampler2D map; uniform vec3 sunDir; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
        void main(){ vec3 n=normalize(vN); float d=dot(n,sunDir); float day=smoothstep(-0.06,0.22,d); vec3 c=texture2D(map,vUv).rgb; vec3 v=normalize(cameraPosition-vP); float rim=pow(1.0-max(dot(n,v),0.0),2.5);
          vec3 col=c*day*1.5+vec3(0.25,0.5,1.0)*rim*(0.15+day*0.9)+vec3(0.004,0.006,0.012); gl_FragColor=vec4(col,1.0);
          #include <colorspace_fragment>
        }`, depthTest: false, depthWrite: false });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(D * Math.tan(ang / 2), 48, 32), this.earthMat); this.earth.position.copy(EARTH_DIR).multiplyScalar(D); this.earth.renderOrder = -10; this.earth.frustumCulled = false; sky.add(this.earth);
    const lat = (K.LAT * Math.PI) / 180, moonAxis = new V3(0, Math.sin(lat), -Math.cos(lat));
    const yAx = moonAxis.addScaledVector(EARTH_DIR, -moonAxis.dot(EARTH_DIR)).normalize().applyAxisAngle(EARTH_DIR, 0.3), zAx = EARTH_DIR.clone().negate(), xAx = new V3().crossVectors(yAx, zAx).normalize();
    this.earthBase = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx)); this.earthSpin = new THREE.Quaternion(); this.yUp = new V3(0, 1, 0);
    const gl = canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, 'rgba(255,252,235,1)'); gr.addColorStop(0.16, 'rgba(255,236,190,0.35)'); gr.addColorStop(0.5, 'rgba(255,220,160,0.06)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.sunSprite.scale.set(620, 620, 1); this.sunSprite.renderOrder = -9; sky.add(this.sunSprite);
  }

  // ---------- terrain ----------
  heightAt(x, z) {
    let far = smooth(105, 190, Math.hypot(x - 10, z + 10));
    for (const s of SITES) far = Math.min(far, smooth(34, 80, Math.hypot(x - s.pos[0], z - s.pos[1])));
    far = Math.min(far, smooth(MINE.r * 1.05, MINE.r * 1.8, Math.hypot(x - MINE.x, z - MINE.z)));
    let h = (fbm(x * 0.006 + 3, z * 0.006 + 7) - 0.5) * 22 * far + (fbm(x * 0.05, z * 0.05) - 0.5) * (0.35 + 1.4 * far);
    for (const c of this.craters) { const q = Math.hypot(x - c.x, z - c.z) / c.r; if (q < 2) h += (q < 1 ? -c.d * (1 - q * q) : 0) + c.d * 0.35 * Math.exp(-Math.pow((q - 1) / 0.28, 2)); }
    const dp = Math.hypot(x - PIT.x, z - PIT.z); if (dp < PIT.r + 22) h -= 5 * smooth(PIT.r + 22, PIT.r, dp);
    return h;
  }
  _terrain() {
    const rnd = seeded(2049); this.craters = [{ x: MINE.x, z: MINE.z, r: MINE.r, d: MINE.depth }];
    for (let i = 0; i < 420; i++) {
      const x = (rnd() - 0.5) * 1600, z = (rnd() - 0.5) * 1600, dBase = Math.hypot(x - 10, z + 10), r = dBase < 150 ? 1.5 + rnd() * 4 : 4 + rnd() * rnd() * 30;
      if (Math.hypot(x - PIT.x, z - PIT.z) < PIT.r + 26 + r) continue;
      if (STATIONS.some((s) => s.zone === 'top' && Math.hypot(x - s.pos[0], z - s.pos[1]) < 20 + r)) continue;
      if (SITES.some((s) => Math.hypot(x - s.pos[0], z - s.pos[1]) < 44 + r)) continue;
      if (Math.hypot(x - MINE.x, z - MINE.z) < MINE.r * 1.5 + r) continue;
      if (Math.abs(x) < 56 && z < -44 && z > -112) continue;   // keep the solar field level
      if (x < -8 && x > -66 && z > 26 && z < 60) continue;      // and the parking pads
      this.craters.push({ x, z, r, d: r * (0.16 + rnd() * 0.1) });
    }
    const size = 1700, seg = 330, g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, step = size / seg, colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i), y = this.heightAt(x, z); const dp = Math.hypot(x - PIT.x, z - PIT.z);
      if (dp < PIT.r) { if (dp > PIT.r - step * 1.6) { const k = (PIT.r - 0.3) / Math.max(dp, 0.01); x = PIT.x + (x - PIT.x) * k; z = PIT.z + (z - PIT.z) * k; p.setX(i, x); p.setZ(i, z); } y = -105; }
      p.setY(i, y); const tone = (0.78 + fbm(x * 0.02 + 40, z * 0.02) * 0.4 - (dp < PIT.r ? 0.55 : 0)) * (0.2 + 0.8 * smooth(MINE.r * 0.82, MINE.r * 1.02, Math.hypot(x - MINE.x, z - MINE.z)));   // the mine's floor never sees the Sun colors.set([tone, tone * 0.985, tone * 0.96], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, this.M.rego); mesh.receiveShadow = true; this.top.add(mesh);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(PIT.r - 0.5, PIT.r - 6, 104, 48, 1, true), this.M.basalt.clone()); wall.material.side = THREE.BackSide; wall.position.set(PIT.x, -57, PIT.z); this.top.add(wall);
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5 + rnd(), 6, 5), i % 3 === 0 ? this.M.redG : this.M.warm); const a = rnd() * 7, rr = rnd() * 30; m.position.set(PIT.x + Math.cos(a) * rr, -104, PIT.z + Math.sin(a) * rr); this.top.add(m); }
    const rg = new THREE.DodecahedronGeometry(1, 0), n = 420, im = new THREE.InstancedMesh(rg, this.M.rock, n), o = new THREE.Object3D();
    for (let i = 0, placed = 0; placed < n && i < 6000; i++) {
      const x = (rnd() - 0.5) * 1500, z = (rnd() - 0.5) * 1500;
      if (Math.hypot(x - PIT.x, z - PIT.z) < PIT.r + 6 || STATIONS.some((s) => s.zone === 'top' && Math.hypot(x - s.pos[0], z - s.pos[1]) < 22) || (Math.abs(x) < 60 && z < -40 && z > -116) || (x < -6 && x > -70 && z > 24 && z < 62) || Math.hypot(x - MINE.x, z - MINE.z) < MINE.r) continue;
      const s = 0.25 + rnd() * rnd() * 2.2; o.position.set(x, this.heightAt(x, z) + s * 0.25, z); o.scale.set(s, s * (0.5 + rnd() * 0.5), s * (0.7 + rnd() * 0.6)); o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); o.updateMatrix(); im.setMatrixAt(placed++, o.matrix);
    }
    im.castShadow = true; im.receiveShadow = true; this.top.add(im);
  }

  // ---------- small mesh helpers ----------
  box(w, h, d, m) { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; x.receiveShadow = true; return x; }
  cyl(rt, rb, h, m, seg = 16) { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); x.castShadow = true; x.receiveShadow = true; return x; }
  sph(r, m, ws = 16, hs = 10) { const x = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); x.castShadow = true; return x; }
  put(parent, mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; }
  group(parent, x, z, ground = true) { const g = new THREE.Group(); g.position.set(x, ground ? this.heightAt(x, z) : 0, z); parent.add(g); return g; }
  solid(zone, x, z, r) { const c = { x, z, r }; this.colliders[zone].push(c); return c; }

  // Things the player can carry. Returned meshes are added to the scene by the game.
  makeItem(type) {
    const g = new THREE.Group(), M = this.M;
    if (type === 'panel' || type === 'panelB') { this.put(g, this.box(PANEL_W, 0.12, PANEL_D, type === 'panel' ? M.panel : M.panelB), 0, 0.1, 0); this.put(g, this.box(PANEL_W + 0.2, 0.08, PANEL_D + 0.2, M.grey), 0, 0.02, 0); if (type === 'panelB') g.children[0].rotation.z = 0.05; }
    else if (type === 'battery') { this.put(g, this.box(1.3, 1.0, 0.9, M.dark), 0, 0.5, 0); this.put(g, this.box(1.0, 0.12, 0.05, M.greenG), 0, 0.7, 0.46); this.put(g, this.box(1.34, 0.1, 0.94, M.orange), 0, 1.02, 0); }
    else if (type === 'ice') { this.put(g, this.cyl(0.42, 0.42, 1.0, M.white, 14), 0, 0.5, 0); this.put(g, this.cyl(0.44, 0.44, 0.22, M.cyan, 14), 0, 0.5, 0); this.put(g, this.cyl(0.3, 0.44, 0.12, M.grey, 14), 0, 1.06, 0); }
    else if (type === 'water') { this.put(g, this.cyl(0.5, 0.5, 1.1, M.tankW, 14), 0, 0.55, 0); this.put(g, this.cyl(0.52, 0.52, 0.1, M.white, 14), 0, 1.1, 0); }
    else { this.put(g, this.box(1.1, 0.9, 1.1, type === 'cans' ? M.green : M.orange), 0, 0.45, 0); this.put(g, this.box(1.14, 0.12, 1.14, M.white), 0, 0.5, 0); this.put(g, this.box(0.5, 0.3, 0.04, type === 'cans' ? M.warm : M.cyan), 0, 0.55, 0.56); }
    return g;
  }

  _topside() {
    const M = this.M, T = this.top;
    // --- Solar field: 24 mounts. Each can be empty, working, or broken.
    this.mounts = MOUNTS.map(([x, z], i) => {
      const g = this.group(T, x, z); this.put(g, this.cyl(0.2, 0.3, 2.4, M.grey), 0, 1.2, 0); this.put(g, this.cyl(0.5, 0.6, 0.2, M.dark, 12), 0, 0.1, 0);
      const head = new THREE.Group(); head.position.y = 2.5; g.add(head); const tilt = new THREE.Group(); head.add(tilt);
      const mat = M.panel.clone(), ok = this.put(tilt, this.box(PANEL_W, 0.12, PANEL_D, mat), 0, 0, 0); this.put(tilt, this.box(PANEL_W + 0.2, 0.08, PANEL_D + 0.2, M.grey), 0, -0.1, 0);
      const bad = this.put(g, this.box(PANEL_W, 0.12, PANEL_D, M.panelB), 0.4, 1.5, 0.3, 0.5 + hash(i, 1) * 0.5, hash(i, 2), 0.3);
      const cap = this.put(g, this.sph(0.22, M.amber), 0, 2.5, 0); this.solid('top', x, z, 0.8);
      return { g, head, tilt, mat, ok, bad, cap, seed: hash(i, 3), state: -1 };
    });
    const sIn = this.group(T, 0, -46); this.put(sIn, this.box(2.2, 1.5, 0.9, M.dark), 0, 0.75, 0); this.put(sIn, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), M.screen), 0, 1.0, 0.46); this.solid('top', 0, -46, 1.4);
    this.lamp(T, 0, 7, -46, 0xcfe4ff, 26);
    // --- Earth link dish
    const d = this.group(T, -64, -10); this.put(d, this.cyl(0.5, 0.9, 9, M.white), 0, 4.5, 0); this.put(d, this.box(3, 1.2, 3, M.grey), 0, 0.6, 0);
    this.dishHead = new THREE.Group(); this.dishHead.position.y = 9.4; d.add(this.dishHead);
    const pts = []; for (let i = 0; i <= 12; i++) { const rr = (i / 12) * 5; pts.push(new THREE.Vector2(rr, rr * rr * 0.075)); }
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), std({ color: 0xf0f0ec, roughness: 0.6, side: THREE.DoubleSide })); bowl.castShadow = true; this.dishHead.add(bowl);
    this.put(this.dishHead, this.cyl(0.07, 0.07, 3.4, M.grey, 8), 0, 1.9, 0); this.put(this.dishHead, this.sph(0.35, M.dark), 0, 3.6, 0);
    this.dishLight = this.put(d, this.sph(0.28, M.greenG.clone()), 0, 9.2, 0.9);
    this.dishAim = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), EARTH_DIR); this.dishOff = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), new V3(0.75, 0.5, -0.4).normalize()); this.dishHead.quaternion.copy(this.dishAim);
    this.solid('top', -64, -10, 2.4); this.lamp(T, -58, 5, -4, 0xcfe4ff, 18);
    // --- Landing pad + lander
    const pad = this.group(T, 80, 42); this.put(pad, this.cyl(15, 15.5, 0.3, std({ color: 0x55534f, roughness: 1 }), 40), 0, 0.15, 0);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; this.put(pad, this.sph(0.28, M.cyan), Math.cos(a) * 14, 0.45, Math.sin(a) * 14); }
    const L = new THREE.Group(); L.position.y = 0.3; pad.add(L);
    this.put(L, this.cyl(3.4, 3.8, 3.2, M.foil, 8), 0, 4.2, 0); this.put(L, this.cyl(2.2, 3.2, 2.6, M.white, 8), 0, 7.1, 0); this.put(L, this.sph(1.5, M.white), 0, 8.6, 0); this.put(L, this.cyl(0.6, 1.5, 1.8, M.dark, 14), 0, 1.9, 0);
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785; this.put(L, this.cyl(0.14, 0.14, 6, M.metal, 8), Math.cos(a) * 4.3, 2.6, Math.sin(a) * 4.3, Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55); this.put(L, this.cyl(0.9, 0.9, 0.2, M.foil, 12), Math.cos(a) * 5.9, 0.12, Math.sin(a) * 5.9); }
    this.solid('top', 80, 42, 6.5); this.lamp(T, 72, 8, 36, 0xbfe9ff, 22);
    // --- Pit elevator gantry, airlock dome, cargo depot
    const gz = PIT.z - PIT.r, e = this.group(T, 0, gz - 4);
    for (const [px, pz] of [[-3, -3], [3, -3], [-3, 5], [3, 5]]) this.put(e, this.box(0.5, 16, 0.5, M.grey), px, 8, pz);
    this.put(e, this.box(7, 0.6, 9, M.grey), 0, 16, 1); this.put(e, this.box(1.2, 1.2, 14, M.orange), 0, 15.2, 6); this.put(e, this.cyl(0.06, 0.06, 120, M.dark, 6), 0, -44, 9);
    this.put(e, this.box(4.5, 0.3, 4.5, M.metal), 0, 0.5, 1.5); for (let i = 0; i < 3; i++) this.put(e, this.sph(0.25, M.amber), -3 + i * 3, 16.5, 5.5);
    const dome = this.group(T, -16, gz - 12); const dm = new THREE.Mesh(new THREE.SphereGeometry(7, 28, 14, 0, 6.283, 0, 1.5708), std({ color: 0x8e8b86, map: this.texRego, roughness: 1 })); dm.castShadow = true; dome.add(dm);
    this.put(dome, this.box(3, 3, 1.2, M.white), 0, 1.5, 6.6); this.put(dome, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), M.warm), 0, 1.4, 7.22); this.solid('top', -16, gz - 12, 7.6); this.lamp(T, 0, 9, gz - 6, 0xffd9a8, 34);
    const dp = this.group(T, 20, 48); this.put(dp, this.box(9, 0.25, 7, std({ color: 0x4f4d4a, roughness: 1 })), 0, 0.12, 0); this.put(dp, this.box(0.3, 3.4, 0.3, M.orange), -4, 1.7, -3); this.put(dp, this.box(2.2, 1, 0.1, M.cyan), -4, 3.2, -3); for (let i = 0; i < 3; i++) this.put(dp, this.box(1.1, 0.9, 1.1, i % 2 ? M.orange : M.white), 2.6 + (i % 2) * 1.2, 0.6 + (i > 1 ? 0.9 : 0), -2.2);
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 6), M.orange, 48), tip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), M.amber, 48), o = new THREE.Object3D();
    for (let i = 0; i < 48; i++) { const a = (i / 48) * 6.283, x = PIT.x + Math.cos(a) * (PIT.r + 9), z = PIT.z + Math.sin(a) * (PIT.r + 9), y = this.heightAt(x, z); o.position.set(x, y + 0.65, z); o.updateMatrix(); post.setMatrixAt(i, o.matrix); o.position.y = y + 1.4; o.updateMatrix(); tip.setMatrixAt(i, o.matrix); }
    T.add(post, tip);
    // --- Charging pads for the rover and the hopper
    this.pads = [];
    for (const [k, [x, z], r] of [['car', CAR_PAD, 5], ['ship', SHIP_PAD, 6.5]]) {
      const g = this.group(T, x, z); this.put(g, this.cyl(r, r + 0.3, 0.2, std({ color: 0x4a4a4c, roughness: 1 }), 30), 0, 0.1, 0);
      const ring = this.put(g, new THREE.Mesh(new THREE.TorusGeometry(r - 0.5, 0.12, 6, 40), M.cyan.clone()), 0, 0.24, 0, Math.PI / 2); this.put(g, this.box(0.5, 2.6, 0.5, M.yellow), r - 0.2, 1.3, -r + 0.6); const led = this.put(g, this.sph(0.25, M.greenG.clone()), r - 0.2, 2.8, -r + 0.6);
      this.pads.push({ k, ring, led });
    }
    this.lamp(T, -36, 8, 42, 0xbfe9ff, 26);
    // --- Moon-dust oxygen plant
    const is = this.group(T, 64, -38); this.put(is, this.cyl(2.6, 3, 6, M.grey, 20), 0, 3, 0); this.isruGlow = this.put(is, new THREE.Mesh(new THREE.CylinderGeometry(2.66, 2.66, 0.9, 20, 1, true), glow(0xff6a1a, 0.1)), 0, 2.2, 0);
    this.put(is, this.sph(2.3, M.tankO2), 6, 2.6, 1); this.put(is, this.sph(2.3, M.tankO2), 6, 2.6, -4.5); this.put(is, this.box(3, 2.4, 3, M.dark), -5, 3.4, 0); this.put(is, this.box(1.2, 0.4, 8, M.orange), -5, 1.6, 4.5, 0.32, 0, 0);
    this.solid('top', 64, -38, 4); this.solid('top', 70, -39.5, 4.6); this.solid('top', 59, -38, 2.4); this.lamp(T, 57, 6, -31, 0xffc9a0, 18);
    // --- Reactor behind its berm, heater hub
    const re = this.group(T, 128, -98); this.put(re, this.cyl(1.6, 2, 5, M.metal, 16), 0, 2.5, 0); for (let i = 0; i < 4; i++) this.put(re, this.box(0.15, 7, 5.5, std({ color: 0xd8dade, roughness: 0.5, metalness: 0.5 })), Math.cos(i * 1.5708) * 4.4, 6, Math.sin(i * 1.5708) * 4.4, 0, -i * 1.5708, 0);
    this.reactorBeacon = this.put(re, this.sph(0.4, M.amber.clone()), 0, 10, 0); this.solid('top', 128, -98, 6);
    const y = this.group(T, -86, -56); this.put(y, this.box(7, 3.4, 5, M.white), 0, 1.7, 0); this.put(y, this.box(7.4, 0.3, 5.4, M.orange), 0, 3.5, 0); this.heaterGlow = this.put(y, this.box(2.6, 1.4, 0.2, glow(0xff5a1a, 0.4)), 0, 1.6, 2.62); this.solid('top', -86, -56, 4.6); this.lamp(T, -78, 6, -48, 0xffd9a8, 18);
  }

  // ---------- the surface base: a hub-and-spoke town of glass domes and white modules joined by tube corridors ----------
  _base() {
    const M = this.M, T = this.top, B = BASE, UP = new V3(0, 1, 0); this.baseGlow = [];
    const lit = (color, k) => { const m = glow(color, k); this.baseGlow.push({ m, k }); return m; };
    const winW = lit(0xffd9a0, 2), winC = lit(0x7fd8ff, 1.9), grow = lit(0xff6ad8, 1.3), cell = lit(0x3aa0ff, 2.3), frame = new THREE.LineBasicMaterial({ color: 0xdfe5ec });
    const glassM = (tint) => { const m = new THREE.MeshStandardMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.24, roughness: 0.08, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false, emissive: tint, emissiveIntensity: 0.4 }); this.baseGlow.push({ m, k: 0.4 }); return m; };
    const pile = std({ color: 0x9a9793, map: this.texRego, roughness: 1 });
    const hard = (x, z, w, d) => { const lo = Math.min(w, d), hi = Math.max(w, d), n = Math.max(1, Math.ceil(hi / lo)), r = lo / 2 + 0.5; for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (hi - lo); this.solid('top', x + (w >= d ? t : 0), z + (w >= d ? 0 : t), r); } };
    const module = (x, z, w, h, d, win = winW) => { const g = this.group(T, x, z); this.put(g, this.box(w, h, d, M.white), 0, h / 2, 0); this.put(g, this.box(w + 0.3, 0.3, d + 0.3, M.grey), 0, h + 0.12, 0); this.put(g, this.box(w + 0.25, 0.5, d + 0.25, M.grey), 0, 0.25, 0);
      for (const s of [-1, 1]) { this.put(g, this.box(w * 0.72, h * 0.26, 0.08, win), 0, h * 0.6, s * (d / 2 + 0.03)); this.put(g, this.box(0.08, h * 0.26, d * 0.6, win), s * (w / 2 + 0.03), h * 0.6, 0); }
      hard(x, z, w, d); return g; };
    const dome = (x, z, r, tint) => { const g = this.group(T, x, z); this.put(g, this.cyl(r + 0.5, r + 0.9, 1.8, M.white, 40), 0, 0.9, 0); this.put(g, this.cyl(r + 0.7, r + 0.7, 0.3, M.grey, 40), 0, 1.85, 0); this.put(g, this.cyl(r - 0.2, r - 0.2, 0.1, M.grey, 40), 0, 2.02, 0);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 12, 0, 6.2832, 0, 1.5708), glassM(tint)); sh.position.y = 1.95; sh.renderOrder = 3; g.add(sh);
      const fr = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(r + 0.05, 18, 6, 0, 6.2832, 0, 1.5708)), frame); fr.position.y = 1.95; g.add(fr);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.2832; this.put(g, this.box(1.3, 0.5, 0.1, winW), Math.sin(a) * (r + 0.72), 1.05, Math.cos(a) * (r + 0.72), 0, a, 0); }
      this.solid('top', x, z, r + 1.3); return g; };
    // a pressurised corridor on the ground between two buildings
    const tube = (x0, z0, x1, z1) => { const a = this.at('top', x0, z0, 1.45), b = this.at('top', x1, z1, 1.45), d = b.clone().sub(a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()), mid = a.clone().add(b).multiplyScalar(0.5);
      const m = this.cyl(1.3, 1.3, L, M.white, 14); m.position.copy(mid); m.quaternion.copy(q); T.add(m);
      for (let t = 1.2; t < L - 0.6; t += 3) { const p = a.clone().addScaledVector(d, t / L), rib = this.cyl(1.42, 1.42, 0.35, M.grey, 14); rib.position.copy(p); rib.quaternion.copy(q); T.add(rib); if (Math.round(t / 3) % 2) { const w = this.sph(0.3, winW, 8, 6); w.position.set(p.x, p.y + 1.25, p.z); T.add(w); } this.solid('top', p.x, p.z, 1.6); } };

    // --- Habitat Dome: the hub. A garden under glass round a central core.
    const [hx, hz, hr] = B.hub, hub = dome(hx, hz, hr, 0xffc27a); this.put(hub, this.cyl(1.8, 2.2, 7, M.white, 16), 0, 5.4, 0); this.put(hub, this.cyl(2.6, 2.6, 0.5, winW, 16), 0, 7.2, 0); this.put(hub, this.cyl(2.3, 1.8, 0.8, M.grey, 16), 0, 9.3, 0);
    for (const [rr, hh] of [[4.6, 0.9], [7.6, 0.6]]) { this.put(hub, new THREE.Mesh(new THREE.TorusGeometry(rr, 0.55, 6, 36), M.soil), 0, 2.1 + hh * 0.3, 0, Math.PI / 2); this.put(hub, new THREE.Mesh(new THREE.TorusGeometry(rr, 0.5, 6, 36), M.green), 0, 2.5 + hh * 0.4, 0, Math.PI / 2); }
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.4; this.put(hub, this.sph(0.9, M.greenD, 8, 6), Math.cos(a) * 6.1, 3.2, Math.sin(a) * 6.1); this.put(hub, this.cyl(0.12, 0.16, 1.4, M.soil, 6), Math.cos(a) * 6.1, 2.6, Math.sin(a) * 6.1); }
    this.lamp(T, hx, 9, hz, 0xffd9a8, 30, 60);
    // --- Command Tower
    const [tx, tz] = B.tower, tw = module(tx, tz, 9, 4, 9, winC); this.put(tw, this.cyl(2, 2.5, 10, M.white, 18), 0, 9, 0); this.put(tw, this.cyl(5.4, 4.2, 1.3, M.white, 28), 0, 14.6, 0); this.put(tw, new THREE.Mesh(new THREE.CylinderGeometry(5.45, 5.45, 1.5, 28, 1, true), winC), 0, 16, 0); this.put(tw, this.cyl(4.4, 5.5, 1, M.grey, 28), 0, 17.2, 0);
    this.put(tw, this.cyl(0.12, 0.16, 7, M.grey, 6), 0, 21.2, 0); this.put(tw, this.cyl(0.9, 0.9, 0.15, M.white, 14), 1.8, 18.2, 0.6, 0.9, 0, 0.4); this.towerBeacon = this.put(tw, this.sph(0.32, M.redG.clone()), 0, 24.9, 0);
    // --- Battery Bank
    const [bx, bz] = B.batt, bb = module(bx, bz, 10, 4.6, 7, cell); for (let i = 0; i < 4; i++) { this.put(bb, this.box(1.6, 3, 1.4, M.dark), -4.2 + i * 2.8, 1.5, 5.2); this.put(bb, this.box(1.1, 0.25, 0.06, cell), -4.2 + i * 2.8, 2.3, 5.93); this.put(bb, this.box(1.1, 0.25, 0.06, cell), -4.2 + i * 2.8, 1.5, 5.93); } hard(bx, bz + 5.2, 10, 1.6);
    // --- Rover Garage: open to the south, facing the charging pads
    const [gx, gz] = B.garage, ga = this.group(T, gx, gz); this.put(ga, this.box(15, 0.5, 9.5, M.white), 0, 5.2, 0); this.put(ga, this.box(15, 5, 0.5, M.white), 0, 2.5, -4.5); for (const s of [-1, 1]) this.put(ga, this.box(0.5, 5, 9.5, M.white), s * 7.25, 2.5, 0);
    for (const px of [-2.4, 2.4]) this.put(ga, this.box(0.4, 5, 0.4, M.grey), px, 2.5, 4.4); this.put(ga, this.box(15.2, 0.7, 0.3, M.orange), 0, 5.1, 4.75); for (const lx of [-4.8, 0, 4.8]) this.put(ga, this.box(2.6, 0.12, 0.6, winW), lx, 4.88, 0);
    const cart = new THREE.Group(); cart.position.set(-4.8, 0, -0.6); ga.add(cart); this.put(cart, this.box(2.2, 0.9, 3.4, M.yellow), 0, 1.0, 0); this.put(cart, this.box(1.8, 0.9, 1.3, M.dark), 0, 1.85, 0.7); for (const wx2 of [-1.15, 1.15]) for (const wz2 of [-1.1, 1.1]) this.put(cart, this.cyl(0.5, 0.5, 0.4, M.dark, 12), wx2, 0.5, wz2, 0, 0, Math.PI / 2);
    this.put(ga, this.box(2.4, 1.1, 1, M.grey), 4.8, 0.55, -3.4); this.put(ga, this.box(1, 1.6, 0.8, M.orange), 6.2, 0.8, -3.4);
    hard(gx, gz - 4.5, 15, 1); hard(gx - 7.25, gz, 1, 9.5); hard(gx + 7.25, gz, 1, 9.5); this.solid('top', gx - 4.8, gz - 0.6, 2.2); this.lamp(T, gx, 4, gz + 1, 0xffe2b8, 16, 40);
    // --- Greenhouse Dome
    const [qx, qz, qr] = B.green, gh = dome(qx, qz, qr, 0xff8ad8); for (let i = -2; i <= 2; i++) { const len = Math.sqrt(qr * qr - i * i * 6.8) * 1.7 - 2; this.put(gh, this.box(len, 0.7, 1.3, M.soil), 0, 2.4, i * 2.6); this.put(gh, this.box(len - 0.3, 0.9, 1.0, i % 2 ? M.green : M.greenD), 0, 3.1, i * 2.6); this.put(gh, this.box(len, 0.08, 0.3, grow), 0, 4.6 - Math.abs(i) * 0.25, i * 2.6); }
    this.lamp(T, qx, 7, qz, 0xff9ad8, 18, 45);
    // --- Research Lab: two joined modules with a small roof dome
    const [lx, lz] = B.lab, lab = module(lx, lz, 12, 4, 7, winC); module(lx, lz + 8, 8, 3.4, 6, winC); this.put(lab, new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 8, 0, 6.2832, 0, 1.5708), M.white), -3, 4.2, 0); this.put(lab, this.cyl(0.07, 0.07, 3.4, M.grey, 6), 4, 5.9, 1.5); this.put(lab, this.box(2.2, 0.9, 1.6, M.grey), 2.5, 4.7, -1.5); tube(lx, lz + 3.6, lx, lz + 4.9);
    // --- Water Plant
    const [wx0, wz0] = B.water, wp = this.group(T, wx0, wz0); for (const s of [-1, 1]) { this.put(wp, this.cyl(2, 2, 5.6, M.tankW, 20), s * 2.4, 3, 0); this.put(wp, new THREE.Mesh(new THREE.SphereGeometry(2, 20, 8, 0, 6.2832, 0, 1.5708), M.tankW), s * 2.4, 5.8, 0); this.put(wp, new THREE.Mesh(new THREE.CylinderGeometry(2.04, 2.04, 0.4, 20, 1, true), cell), s * 2.4, 1.4, 0); this.solid('top', wx0 + s * 2.4, wz0, 2.4); }
    // ice-extraction line: cold store -> sealed chamber -> glass vapour pipe -> cold trap -> tanks, plus a Sun mirror
    const X = this.wxv = {}; X.status = this.put(wp, this.sph(0.3, M.greenG.clone()), 4.2, 4.2, 0);
    this.put(wp, this.box(4.4, 1.5, 3, M.white), 8.5, 0.75, -7); this.put(wp, this.box(4.6, 0.2, 3.2, M.cyan), 8.5, 1.6, -7); this.solid('top', wx0 + 8.5, wz0 - 7, 2.6);            // cold store
    X.cans = []; for (let i = 0; i < 6; i++) { const cnt = new THREE.Group(); cnt.position.set(6.2 + (i % 3) * 1.0, 0, -4.2 - Math.floor(i / 3) * 0.95); wp.add(cnt); this.put(cnt, this.cyl(0.38, 0.38, 0.95, M.white, 12), 0, 0.48, 0); this.put(cnt, this.cyl(0.4, 0.4, 0.2, M.cyan, 12), 0, 0.48, 0); X.cans.push(cnt); }
    const ch = new THREE.Group(); ch.position.set(8.5, 0, 0); wp.add(ch); this.put(ch, this.cyl(1.5, 1.5, 5, M.white, 20), 0, 1.9, 0, Math.PI / 2); for (const e of [-2.6, 2.6]) this.put(ch, this.cyl(1.6, 1.6, 0.3, M.grey, 20), 0, 1.9, e, Math.PI / 2);
    for (const e of [-1.6, 1.6]) this.put(ch, this.box(2.4, 0.9, 0.5, M.dark), 0, 0.45, e); this.put(ch, this.box(1.4, 1.2, 1.4, M.orange), 0, 3.8, -1.2); this.put(ch, this.cyl(0.5, 0.5, 0.7, M.grey, 12), 0, 3.3, -1.2);
    X.glowM = glow(0xff7a1a, 0); X.win = this.put(ch, new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), X.glowM), -1.52, 1.9, 0.4, 0, -Math.PI / 2); this.put(ch, new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 20), M.grey), -1.53, 1.9, 0.4, 0, -Math.PI / 2);
    this.put(ch, new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), X.glowM), 1.52, 1.9, 0.4, 0, Math.PI / 2); X.rods = this.put(ch, new THREE.Mesh(new THREE.CylinderGeometry(1.53, 1.53, 3.4, 20, 1, true), X.glowM), 0, 1.9, 0, Math.PI / 2); X.rods.visible = false;
    this.solid('top', wx0 + 8.5, wz0 - 1.4, 2); this.solid('top', wx0 + 8.5, wz0 + 1.4, 2);
    const tr = new THREE.Group(); tr.position.set(8.5, 0, 5.4); wp.add(tr); this.put(tr, this.cyl(0.9, 1.0, 4.6, M.tankW, 16), 0, 2.3, 0); for (let i = 0; i < 6; i++) this.put(tr, this.cyl(1.25, 1.25, 0.08, M.metal, 16), 0, 0.9 + i * 0.62, 0);
    X.frostM = std({ color: 0xffffff, roughness: 0.9, emissive: 0x9fdcff, emissiveIntensity: 0.25 }); X.frost = this.put(tr, this.cyl(1.12, 1.12, 3.6, X.frostM, 16), 0, 2.4, 0); X.frost.scale.set(1, 0.02, 1); this.solid('top', wx0 + 8.5, wz0 + 5.4, 1.7);
    this.put(wp, new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.4, 12, 1, true), M.glass), 8.5, 3.9, 2.9, Math.PI / 2); for (const pz of [1.2, 4.6]) this.put(wp, this.cyl(0.3, 0.3, 0.9, M.grey, 10), 8.5, 3.5, pz);                  // see-through vapour pipe
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36 * 3), 3)); X.vapor = new THREE.Points(vg, new THREE.PointsMaterial({ color: 0xdff4ff, size: 0.16, transparent: true, opacity: 0, depthWrite: false })); X.vapor.frustumCulled = false; wp.add(X.vapor); X.vph = Array.from({ length: 36 }, (_, i) => i / 36);
    this.put(wp, this.cyl(0.14, 0.14, 6.4, M.tankW, 8), 5.4, 0.6, 5.4, 0, 0, Math.PI / 2); this.put(wp, this.cyl(0.14, 0.14, 5.4, M.tankW, 8), 2.4, 0.6, 2.7, Math.PI / 2);                                                                         // meltwater line to the tanks
    const mr = new THREE.Group(); mr.position.set(13.5, 0, -1.5); wp.add(mr); this.put(mr, this.cyl(0.18, 0.26, 4, M.grey, 8), 0, 2, 0); X.mirror = new THREE.Group(); X.mirror.position.y = 4.2; mr.add(X.mirror);
    const mpts = []; for (let i = 0; i <= 10; i++) { const rr = (i / 10) * 2.6; mpts.push(new THREE.Vector2(rr, rr * rr * 0.09)); } const dishM = std({ color: 0xdfe8f0, roughness: 0.12, metalness: 0.95, side: THREE.DoubleSide }); X.mirror.add(new THREE.Mesh(new THREE.LatheGeometry(mpts, 28), dishM)); this.solid('top', wx0 + 13.5, wz0 - 1.5, 1.2);
    X.spot = this.put(ch, new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), glow(0xfff4c0, 0)), 1.56, 2.6, -0.9, 0, Math.PI / 2);                                                                                                                  // where the mirror's light lands (no beam: there is no air)
    this.put(wp, this.box(3, 1.8, 2.2, M.grey), 0, 0.9, 3.2); this.put(wp, this.cyl(0.18, 0.18, 4.8, M.metal, 8), 0, 2.2, 2.2, 0, 0, Math.PI / 2); this.solid('top', wx0, wz0 + 3.2, 1.9);
    // --- Moon-Dust Mine: soil piles, a digger, and a conveyor to the Oxygen Plant
    const [mx, mz] = B.mine, mi = this.group(T, mx, mz); for (const [px, pz, pr] of [[0, 0, 5], [7, -7, 4], [-2, -9, 3.4]]) { this.put(mi, new THREE.Mesh(new THREE.ConeGeometry(pr, pr * 0.72, 14), pile), px, pr * 0.36, pz); this.solid('top', mx + px, mz + pz, pr * 0.8); }
    const dg = this.digger = new THREE.Group(); dg.position.set(7, 0, 3); dg.rotation.y = -0.7; mi.add(dg); this.put(dg, this.box(2.6, 1.3, 3.6, M.yellow), 0, 1.5, 0); this.put(dg, this.box(2.9, 0.8, 4, M.dark), 0, 0.5, 0); this.put(dg, this.box(1.5, 1.2, 1.5, M.dark), 0.3, 2.7, -0.6); this.put(dg, this.box(0.4, 0.4, 4, M.yellow), 0, 3, 2.4, -0.5, 0, 0); this.put(dg, this.box(0.35, 0.35, 2.6, M.yellow), 0, 3.3, 4.6, 0.9, 0, 0); this.put(dg, this.box(1.2, 0.9, 0.9, M.grey), 0, 2, 5.4); this.solid('top', mx + 7, mz + 3, 2.6);
    { const a = this.at('top', mx - 5, mz - 2, 2.2), b = this.at('top', 69, -37, 5.4), d = b.clone().sub(a), cv = this.box(1.1, 0.3, d.length(), M.grey); cv.position.copy(a).add(b).multiplyScalar(0.5); cv.lookAt(b); T.add(cv); for (const t of [0.25, 0.7]) { const p = a.clone().addScaledVector(d, t); this.put(T, this.box(0.25, p.y - this.heightAt(p.x, p.z), 0.25, M.grey), p.x, (p.y + this.heightAt(p.x, p.z)) / 2, p.z); } }
    // --- Comms mast beside the big dish, cargo containers by the depot
    const [cx, cz] = B.comm, cm = this.group(T, cx, cz); const lat = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.35, 2.2, 22, 4, 6, true)), frame); lat.position.y = 11; cm.add(lat);
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785; this.put(cm, this.cyl(0.07, 0.1, 22.2, M.grey, 5), Math.cos(a) * 1.27, 11, Math.sin(a) * 1.27, -Math.sin(a) * 0.084, 0, Math.cos(a) * 0.084); }
    for (const [dy, rz] of [[15, 0.5], [18, -0.6]]) this.put(cm, this.cyl(1.1, 1.1, 0.14, M.white, 14), rz > 0 ? 1.2 : -1.1, dy, 0, 0, 0, rz + 1.5708); this.commBeacon = this.put(cm, this.sph(0.3, M.redG.clone()), 0, 22.4, 0); this.solid('top', cx, cz, 2.6);
    const cg = this.group(T, 31, 49); [[0, 0, 0, M.grey], [0, 2.5, 0, M.yellow], [2.8, 0, 0.3, M.orange], [5.6, 0, 0, M.grey], [5.6, 2.5, 0.2, M.white], [2.8, 0, -5.6, M.yellow]].forEach(([px, py, pz, m]) => this.put(cg, this.box(2.5, 2.4, 5.2, m), px, py + 1.2, pz)); hard(33.8, 49, 8.4, 5.4); this.solid('top', 33.8, 43.4, 2.6);
    // --- tube corridors (the spokes), a pipe bridge over the road, road lights
    tube(hx, hz - hr - 1, tx, tz + 4.7); tube(hx - 9.2, hz - 7.7, bx + 5, bz + 3.8); tube(hx - 3, hz + hr + 0.6, gx + 1, gz - 4.9); tube(qx + 0.7, qz + qr + 1, lx - 0.4, lz - 3.7); tube(qx + qr + 1, qz - 0.9, wx0 - 4.6, wz0);
    for (const px of [hx + hr + 2.5, qx - qr - 2.5]) { this.put(T, this.box(0.5, 7, 0.5, M.grey), px, this.heightAt(px, -9) + 3.5, -9); this.solid('top', px, -9, 0.6); }
    for (const dz of [-0.35, 0.35]) this.put(T, this.cyl(0.22, 0.22, qx - qr - hx - hr - 5, dz < 0 ? M.metal : M.tankW, 8), (hx + hr + qx - qr) / 2, 6.9, -9 + dz, 0, 0, Math.PI / 2);
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), M.grey, 8), tip = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), M.warm, 8), o = new THREE.Object3D();
    for (let i = 0; i < 8; i++) { const x = 9, z = -38 + i * 12.5, y = this.heightAt(x, z); o.position.set(x, y + 2, z); o.updateMatrix(); post.setMatrixAt(i, o.matrix); o.position.y = y + 4.1; o.updateMatrix(); tip.setMatrixAt(i, o.matrix); } T.add(post, tip);
    // --- what the meteor shower did: holes in the glass, wreckage on the ground (shown once the base has been hit)
    const dm = this.baseDamage = new THREE.Group(); dm.visible = false; T.add(dm); const black = new THREE.MeshBasicMaterial({ color: 0x05070a, side: THREE.DoubleSide }), rd = seeded(404);
    for (const [x, z, r, n] of [[hx, hz, hr, 4], [qx, qz, qr, 3]]) for (let i = 0; i < n; i++) { const a = rd() * 6.28, e = 0.35 + rd() * 0.7, nrm = new V3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), c = new THREE.Mesh(new THREE.CircleGeometry(0.9 + rd() * 1.3, 7), black); c.position.copy(this.at('top', x, z, 1.95)).addScaledVector(nrm, r + 0.08); c.lookAt(c.position.clone().add(nrm)); c.renderOrder = 4; dm.add(c);
      for (let k = 0; k < 5; k++) { const bx2 = x + Math.cos(a) * (r + 2 + rd() * 5), bz2 = z + Math.sin(a) * (r + 2 + rd() * 5), b = this.box(0.4 + rd() * 1.2, 0.15 + rd() * 0.4, 0.4 + rd() * 1.1, k % 2 ? M.grey : M.white); b.position.set(bx2, this.heightAt(bx2, bz2) + 0.15, bz2); b.rotation.set(rd(), rd() * 3, rd()); dm.add(b); } }
  }

  // ---------- the Polar Ice Mine: floodlights in a crater that is always dark, icy patches, a canister filler, and the digger ----------
  _mine() {
    const M = this.M, T = this.top, cx = MINE.x, cz = MINE.z, at = (dx, dz, y = 0) => this.at('top', cx + dx, cz + dz, y);
    const ice = this.iceM = glow(0x9fdcff, 0.9), frost = std({ color: 0xe8f6ff, roughness: 0.35, emissive: 0x6fb8e8, emissiveIntensity: 0.5 });
    // a pale blue beacon so the mine can be found from far away
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 170, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.copy(at(0, 0, 85)); T.add(beam); this.mineBeam = beam;
    // floodlight masts: the only light this floor ever gets
    this.mineLights = [];
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.6, dx = Math.cos(a) * 46, dz = Math.sin(a) * 46, p = at(dx, dz); const g = new THREE.Group(); g.position.copy(p); T.add(g);
      this.put(g, this.cyl(0.14, 0.22, 9, M.grey, 8), 0, 4.5, 0); this.put(g, this.box(1.6, 0.5, 0.5, M.dark), 0, 9.1, 0, 0, Math.atan2(-dx, -dz)); this.put(g, this.box(1.4, 0.34, 0.1, M.whiteG), -Math.sin(Math.atan2(dx, dz)) * 0.28, 9.1, -Math.cos(Math.atan2(dx, dz)) * 0.28, 0, Math.atan2(-dx, -dz));
      this.solid('top', cx + dx, cz + dz, 0.6); if (i % 2 === 0) { const l = new THREE.PointLight(0xdff0ff, 0, 150, 1.1); l.position.set(p.x, p.y + 9, p.z); T.add(l); this.mineLights.push(l); } }
    // icy patches: frost-bright ground that the bucket can bite into
    this.minePatches = MINE.patches.map(([dx, dz]) => { const p = at(dx, dz, 0.07), g = new THREE.Group(); g.position.copy(p); T.add(g); const d = new THREE.Mesh(new THREE.CircleGeometry(3.4, 18), ice); d.rotation.x = -Math.PI / 2; g.add(d);
      const rr = seeded(Math.round(dx * 7 + dz * 13 + 500)); for (let k = 0; k < 9; k++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + rr() * 0.3, 0), frost); c.position.set((rr() - 0.5) * 5.4, 0.1, (rr() - 0.5) * 5.4); c.rotation.set(rr() * 3, rr() * 3, 0); g.add(c); } return g; });
    // the canister filler: tip the bucket into the hopper, sealed canisters come out on the rack
    const f = new THREE.Group(); f.position.copy(at(0, 0)); T.add(f); this.put(f, this.box(3.2, 1.6, 3.2, M.orange), 0, 3.1, 0); this.put(f, this.box(3.5, 0.2, 3.5, M.grey), 0, 3.95, 0); for (const [lx, lz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) this.put(f, this.box(0.22, 2.4, 0.22, M.grey), lx, 1.2, lz);
    this.put(f, this.cyl(0.5, 0.9, 1.1, M.dark, 12), 0, 1.9, 0); this.put(f, this.cyl(0.28, 0.28, 4.6, M.tankW, 10), 3.4, 1.2, 1.4, 0, 0, Math.PI / 2 - 0.25); this.put(f, this.box(5, 0.25, 2.2, M.grey), MINE.out[0] + 1, 0.13, MINE.out[1]); this.mineLed = this.put(f, this.sph(0.26, M.greenG.clone()), 1.9, 4.3, 1.9);
    this.mineFill = this.put(f, this.box(2.6, 0.5, 2.6, frost), 0, 3.6, 0); this.mineFill.visible = false; this.solid('top', cx, cz, 2.6);
    // a heated shelter and the power mast the digger's cable hangs from
    const sh = new THREE.Group(); sh.position.copy(at(-13, -9)); T.add(sh); this.put(sh, this.box(5, 2.8, 3.6, M.white), 0, 1.4, 0); this.put(sh, this.box(5.2, 0.25, 3.8, M.orange), 0, 2.9, 0); this.put(sh, new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), M.warm), 0, 1.7, 1.82); this.solid('top', cx - 13, cz - 9, 3.2);
    const pm = new THREE.Group(); pm.position.copy(at(-5, -4)); T.add(pm); this.put(pm, this.cyl(0.16, 0.24, 7, M.grey, 8), 0, 3.5, 0); this.put(pm, this.sph(0.3, M.amber), 0, 7.2, 0); this.solid('top', cx - 5, cz - 4, 0.6); this.mineMast = at(-5, -4, 7);
    const cab = new THREE.BufferGeometry(); cab.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); this.mineCable = new THREE.Line(cab, new THREE.LineBasicMaterial({ color: 0x2a2c30 })); this.mineCable.frustumCulled = false; T.add(this.mineCable);
    // the digger: tracked base, cab, and a boom, stick and bucket that really move
    const d = this.dig = new THREE.Group(); this.scene.add(d);
    for (const sx of [-1.15, 1.15]) { this.put(d, this.box(0.7, 0.75, 4.2, M.dark), sx, 0.38, 0); for (let i = 0; i < 5; i++) this.put(d, this.cyl(0.3, 0.3, 0.74, M.grey, 10), sx, 0.38, -1.7 + i * 0.85, 0, 0, Math.PI / 2); }
    this.put(d, this.box(2.4, 0.5, 3.2, M.grey), 0, 0.95, -0.1); this.put(d, this.box(2.2, 1.3, 2.2, M.yellow), 0, 1.85, -0.5); this.put(d, this.box(1.3, 1.25, 1.3, M.dark), -0.35, 3.1, -0.2); this.put(d, new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), M.cyan), -0.35, 3.2, 0.46); this.put(d, this.sph(0.16, M.amber), 0.7, 2.7, -1.3);
    const boom = this.digBoom = new THREE.Group(); boom.position.set(0.55, 2.3, 0.6); d.add(boom); this.put(boom, this.box(0.36, 0.36, 3.4, M.yellow), 0, 0, 1.7);
    const stick = this.digStick = new THREE.Group(); stick.position.set(0, 0, 3.4); boom.add(stick); this.put(stick, this.box(0.28, 0.28, 2.3, M.yellow), 0, 0, 1.15); this.put(stick, this.cyl(0.07, 0.07, 1.6, M.metal, 6), 0, 0.3, 0.2, Math.PI / 2);
    const bk = this.digBucket = new THREE.Group(); bk.position.set(0, 0, 2.3); stick.add(bk); this.put(bk, this.box(1.3, 0.14, 1.0, M.grey), 0, -0.45, 0.2); this.put(bk, this.box(1.3, 0.9, 0.14, M.grey), 0, -0.05, -0.3); for (const sx of [-0.65, 0.65]) this.put(bk, this.box(0.1, 0.9, 1.0, M.grey), sx, -0.05, 0.2); for (let i = -2; i <= 2; i++) this.put(bk, this.box(0.14, 0.1, 0.3, M.metal), i * 0.28, -0.45, 0.8);
    this.digLoad = this.put(bk, this.box(1.1, 0.5, 0.8, frost), 0, -0.1, 0.2); this.digLoad.visible = false;
    this.digLamp = new THREE.SpotLight(0xfff2dc, 0, 60, 0.6, 0.6, 1); this.digLamp.position.set(0, 3.3, 1); this.digLamp.target.position.set(0, 0, 9); d.add(this.digLamp, this.digLamp.target);
  }

  // Other countries' stations: a cracked dome, a leaning mast with a coloured beacon you can see from far away.
  _sites() {
    const M = this.M; this.sites = {};
    for (const s of SITES) {
      const g = this.group(this.top, s.pos[0], s.pos[1]), col = glow(s.color, 2.4);
      const dm = new THREE.Mesh(new THREE.SphereGeometry(10, 26, 14, 0.5, 5.2, 0, 1.5708), std({ color: 0xd8d8d2, roughness: 0.7, side: THREE.DoubleSide })); dm.castShadow = true; g.add(dm);
      this.put(g, this.box(4, 3.4, 2, M.white), 0, 1.7, 9.4); this.put(g, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), col), 0, 1.5, 10.42);
      this.put(g, this.cyl(0.25, 0.4, 16, M.grey, 8), -15, 7.5, -4, 0, 0, 0.32); const b = this.put(g, this.sph(0.7, col), -17.5, 15.4, -4);
      for (let i = 0; i < 4; i++) this.put(g, this.box(PANEL_W, 0.12, PANEL_D, M.panelB), 14 + i * 3.5, 0.5 + hash(i, 5), -8 + i * 4, hash(i, 6), hash(i, 7) * 3, 0.4);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 150, 14, 1, true), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(0, 75, 0); g.add(beam);
      this.solid('top', s.pos[0], s.pos[1], 10.6); const l = this.lamp(this.top, s.pos[0], this.heightAt(s.pos[0], s.pos[1]) + 6, s.pos[1] + 12, s.color, 30, 70);
      this.sites[s.id] = { g, beam, b };
    }
  }

  // The rover car and the hopper ship. The game moves them; this only builds them.
  _vehicles() {
    const M = this.M;
    // The rover. `car` sits on the ground plane; `body` rides on springs above it; every wheel has its own suspension and the
    // front and rear pairs steer. (The middle pair only rolls.)
    const car = this.car = new THREE.Group(); this.scene.add(car); const body = this.carBody = new THREE.Group(); car.add(body);
    this.put(body, this.box(2.5, 0.7, 4.8, M.white), 0, 1.0, 0); this.put(body, this.box(2.6, 0.18, 4.9, M.orange), 0, 0.62, 0); this.put(body, this.box(2.3, 0.14, 2.3, M.grey), 0, 1.43, -1.15);
    for (const [px, pz] of [[-1.1, 0.4], [1.1, 0.4], [-1.1, 2.1], [1.1, 2.1]]) this.put(body, this.cyl(0.06, 0.06, 1.5, M.grey, 6), px, 2.1, pz);
    this.put(body, this.box(2.4, 0.1, 1.9, M.orange), 0, 2.88, 1.25); this.put(body, this.box(1.6, 0.5, 0.5, M.dark), 0, 1.5, 1.2);
    for (const hx of [-0.85, 0.85]) this.put(body, this.cyl(0.2, 0.2, 0.08, M.warm, 12), hx, 1.05, 2.42, Math.PI / 2);                                                   // headlights
    const ant = this.carAnt = new THREE.Group(); ant.position.set(-1, 2.9, 0.4); body.add(ant); this.put(ant, this.cyl(0.02, 0.035, 2, M.grey, 5), 0, 1, 0); this.put(ant, this.sph(0.09, M.amber), 0, 2.05, 0);   // whips about on its base
    this.carWheels = []; const lug = new THREE.BoxGeometry(0.17, 0.52, 0.09), spoke = new THREE.BoxGeometry(1.0, 0.56, 0.1);
    for (const [wx, wz] of [[-1.5, 1.8], [1.5, 1.8], [-1.5, 0], [1.5, 0], [-1.5, -1.8], [1.5, -1.8]]) {
      const sus = new THREE.Group(); sus.position.set(wx, 0.62, wz); car.add(sus); const steer = new THREE.Group(); sus.add(steer);
      const tire = this.cyl(0.62, 0.62, 0.5, M.dark, 18); tire.rotation.z = Math.PI / 2; steer.add(tire);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.2832, l = new THREE.Mesh(lug, M.grey); l.position.set(Math.cos(a) * 0.63, 0, Math.sin(a) * 0.63); l.rotation.y = -a; tire.add(l); }                 // tread blocks: you can see the wheel turn
      for (const a of [0, Math.PI / 2]) { const sp = new THREE.Mesh(spoke, M.metal); sp.rotation.y = a; tire.add(sp); }
      const arm = this.box(0.75, 0.1, 0.16, M.grey); arm.position.set(-Math.sign(wx) * 0.55, 0.3, 0); arm.castShadow = false; sus.add(arm);                                                                    // suspension arm
      this.carWheels.push({ sus, steer, tire, x: wx, z: wz, y: 0 }); }
    this.carLed = this.put(body, this.box(0.9, 0.12, 0.05, M.greenG.clone()), 0, 1.25, 2.43);
    this.carLamp = new THREE.SpotLight(0xfff2dc, 0, 90, 0.5, 0.6, 1); this.carLamp.position.set(0, 1.6, 2.5); this.carLamp.target.position.set(0, 0, 22); body.add(this.carLamp, this.carLamp.target);
    this.carCargo = new THREE.Group(); this.carCargo.position.set(0, 1.5, -1.15); body.add(this.carCargo);
    const ship = this.ship = new THREE.Group(); this.scene.add(ship);
    this.put(ship, this.box(3.2, 2.0, 4.6, M.white), 0, 1.9, 0); this.put(ship, this.box(3.26, 0.35, 4.66, M.teal), 0, 1.5, 0); this.put(ship, this.sph(1.25, M.glass.clone(), 18, 12), 0, 2.3, 2.0); this.put(ship, this.box(2.6, 0.12, 2.2, M.grey), 0, 2.98, -1.0);
    this.shipJets = []; for (const [px, pz] of [[-1.9, 1.7], [1.9, 1.7], [-1.9, -1.7], [1.9, -1.7]]) { this.put(ship, this.cyl(0.07, 0.07, 1.5, M.metal, 6), px * 1.05, 0.7, pz * 1.05, 0, 0, px > 0 ? -0.3 : 0.3); this.put(ship, this.cyl(0.5, 0.5, 0.12, M.foil, 10), px * 1.2, 0.06, pz * 1.05); this.put(ship, this.cyl(0.32, 0.42, 0.6, M.dark, 10), px, 1.0, pz); const f = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.6, 10), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); f.rotation.x = Math.PI; f.position.set(px, 0.0, pz); ship.add(f); this.shipJets.push(f); }
    this.shipLed = this.put(ship, this.box(1.1, 0.14, 0.05, M.greenG.clone()), 0, 1.95, -2.33);
    this.shipLamp = new THREE.SpotLight(0xdff2ff, 0, 120, 0.55, 0.6, 1); this.shipLamp.position.set(0, 1.5, 2.6); this.shipLamp.target.position.set(0, -6, 20); ship.add(this.shipLamp, this.shipLamp.target);
    this.shipCargo = new THREE.Group(); this.shipCargo.position.set(0, 3.05, -1.0); ship.add(this.shipCargo);
  }

  // ---------- the lava tube (now the shell around the station) ----------
  _tube() {
    const M = this.M, D = this.deep, { halfLen: HL, halfWidth: HW, height: HT, skyX, skyR } = TUBE;
    const nx = 52, na = 22, pos = [], idx = [], uv = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= na; j++) { const x = -HL - 8 + (i / nx) * (2 * HL + 16), th = (j / na) * Math.PI, rip = (fbm(x * 0.045, j * 0.5, 3) - 0.5) * 7 + Math.sin(x * 0.21 + j) * 0.7; pos.push(x, Math.pow(Math.sin(th), 0.72) * (HT + rip) - 0.4, -Math.cos(th) * (HW + 4 + rip * 0.6)); uv.push(i / nx * 9, j / na * 3); }
    for (let i = 0; i < nx; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + na + 1, cx = (pos[a * 3] + pos[b * 3]) / 2, cz = (pos[a * 3 + 2] + pos[(a + 1) * 3 + 2]) / 2, cy = pos[a * 3 + 1]; if (Math.hypot(cx - skyX, cz) < skyR && cy > HT * 0.7) continue; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals(); D.add(new THREE.Mesh(tg, M.basalt));
    const fg = new THREE.PlaneGeometry(2 * HL + 40, 2 * HW + 30, 60, 24); fg.rotateX(-Math.PI / 2); const fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setY(i, (fbm(fp.getX(i) * 0.08, fp.getZ(i) * 0.08) - 0.5) * 0.1 - 0.06 + smooth(HW - 6, HW + 6, Math.abs(fp.getZ(i))) * 5);
    fg.computeVertexNormals(); D.add(new THREE.Mesh(fg, std({ color: 0x6f6b66, map: this.texRego, roughness: 1 })));
    const rnd = seeded(31); for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(9 + rnd() * 9, 1), M.basalt); b.position.set(sx * (HL + 4 + rnd() * 10), rnd() * HT * 0.9, (rnd() - 0.5) * 2 * HW); b.rotation.set(rnd() * 3, rnd() * 3, 0); D.add(b); }
    // Both ends of the tube are closed by a solid rockfall, so the black sky never shows between the loose boulders.
    for (const sx of [-1, 1]) { const plug = new THREE.Mesh(new THREE.DodecahedronGeometry(HW + HT * 0.6, 2), M.basalt); plug.scale.set(0.36, 1, 1.15); plug.position.set(sx * (HL + 1 + (HW + HT * 0.6) * 0.36), HT * 0.35, 0); plug.rotation.x = sx * 0.4; D.add(plug); }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(skyR, skyR + 2, 70, 28, 1, true), M.basalt); shaft.position.set(skyX, HT + 30, 0); D.add(shaft);
    // Sunlight through the skylight. The cave has no air, so nothing scatters the light: there is no glowing beam, only a hard bright patch on the floor.
    this.beam = new THREE.Mesh(new THREE.CircleGeometry(skyR * 0.78, 40), new THREE.MeshBasicMaterial({ color: 0xfff3d8, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); this.beam.rotation.x = -Math.PI / 2; this.beam.position.set(skyX + 3, 0.14, -2); D.add(this.beam);
    for (const dx of [-1.6, 1.6]) this.put(D, this.cyl(0.07, 0.07, HT + 60, M.dark, 6), skyX + dx, (HT + 60) / 2, 0);
    // The elevator lands on the open cave floor. The station is a building further down the cave.
    const el = new THREE.Group(); el.position.set(skyX, 0, 0); D.add(el); this.put(el, this.cyl(4.2, 4.5, 0.12, M.metal, 28), 0, 0.06, 0); this.put(el, new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.1, 6, 30), M.orange), 0, 5, 0, Math.PI / 2);
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785, px = Math.cos(a) * 3.7, pz = Math.sin(a) * 3.7; this.put(el, this.box(0.25, 5, 0.25, M.orange), px, 2.5, pz); this.put(el, this.sph(0.22, M.amber), px, 5.25, pz); this.solid('deep', skyX + px, pz, 0.3); }
    // a lit path across the cave to the airlock, boulders, lamp posts, the power cable from the surface
    for (let x = skyX + 7; x < AIRLOCK.x0 - 2; x += 4) for (const z of [-2.4, 2.4]) this.put(D, this.box(1.2, 0.08, 0.25, M.cyan), x, 0.05, z);
    const rc = seeded(77);
    for (let i = 0; i < 46; i++) { const x = -119 + rc() * 238, z = (rc() - 0.5) * 66, r = 0.7 + rc() * rc() * 2.6; if ((Math.abs(z) < 5.5 + r && x < AIRLOCK.x0 + 2) || (x > AIRLOCK.x0 - 4 - r && x < 82 + r && Math.abs(z) < 28.5 + r)) continue; const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M.basalt); b.position.set(x, r * 0.35, z); b.scale.y = 0.7; b.rotation.set(rc() * 3, rc() * 3, 0); b.castShadow = true; D.add(b); this.solid('deep', x, z, r * 0.9); }
    for (let i = 0; i < 12; i++) { const x = -112 + i * 20, z = 32 * (i % 2 ? 1 : -1); this.put(D, this.cyl(0.08, 0.08, 6, M.grey, 6), x, 3, z); this.put(D, this.sph(0.35, M.warm), x, 6.1, z); this.solid('deep', x, z, 0.4); }
    this.put(D, this.box(AIRLOCK.x0 - skyX - 6, 0.08, 0.18, M.dark), (skyX + AIRLOCK.x0) / 2, 0.04, 3.6);
    this.lamp(D, skyX + 2, 8, 5, 0xffe2b8, 30, 70); this.lamp(D, AIRLOCK.x0 - 14, 7, 0, 0xcfe8ff, 26, 55); this.lamp(D, 100, 8, 0, 0xffd7a6, 18, 70);
    this.deepHemi = new THREE.HemisphereLight(0xfff4ec, 0x8a7f78, 1.5); D.add(this.deepHemi); this.skyBounce = new THREE.PointLight(0xfff0d8, 0, 110, 1.3); this.skyBounce.position.set(skyX + 3, 7, -2); D.add(this.skyBounce);
  }

  // ---------- the station: red-walled rooms joined to one hall by bulkhead doors ----------
  _station() {
    const D = this.deep, M = this.M, DH = 4.2; this.rooms = {};
    // Walls are drawn on the inside only, so the camera can sit outside a room and still see in.
    const P = (w, h, mat, tile = 4) => { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile); return new THREE.Mesh(g, mat); };
    const floor = (g, x0, x1, z0, z1) => { const m = P(x1 - x0, z1 - z0, M.floor); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); m.receiveShadow = true; g.add(m); };
    const ceil = (g, x0, x1, z0, z1, h) => { const m = P(x1 - x0, z1 - z0, M.ceil, 8); m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, h, (z0 + z1) / 2); g.add(m); };
    const wx = (g, xa, xb, z, nz, y0, y1, mat) => { if (xb - xa < 0.05) return; const m = P(xb - xa, y1 - y0, mat); m.position.set((xa + xb) / 2, (y0 + y1) / 2, z); if (nz < 0) m.rotation.y = Math.PI; g.add(m); };
    const wz = (g, za, zb, x, nx, y0, y1, mat) => { if (zb - za < 0.05) return; const m = P(zb - za, y1 - y0, mat); m.position.set(x, (y0 + y1) / 2, (za + zb) / 2); m.rotation.y = nx > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(m); };
    const strip = (g, x, y, z, w, d, mat) => this.put(g, new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat), x, y, z);
    // hall
    const hall = new THREE.Group(); D.add(hall); floor(hall, HALL.x0, HALL.x1, HALL.z0, HALL.z1); ceil(hall, HALL.x0, HALL.x1, HALL.z0, HALL.z1, HALL.h);
    for (const side of [-1, 1]) { let x = HALL.x0; const z = side * HALL.z1; for (const r of ROOMS.filter((q) => q.side === side).sort((a, b) => a.door - b.door)) { wx(hall, x, r.door - 2, z, -side, 0, HALL.h, M.wall); wx(hall, r.door - 2, r.door + 2, z, -side, DH, HALL.h, M.wall); x = r.door + 2; } wx(hall, x, HALL.x1, z, -side, 0, HALL.h, M.wall); }
    wz(hall, HALL.z0, HALL.z1, HALL.x1, -1, 0, HALL.h, M.wall);
    this.hallLights = []; for (let x = HALL.x0 + 6; x < HALL.x1; x += 12) this.hallLights.push(strip(hall, x, HALL.h - 0.05, 0, 5, 0.6, M.whiteG.clone()));
    // structure you can read: a rib every 6 m (never across a doorway), a portal frame round every door, services overhead, status light at the floor
    const nearDoor = (x, side) => ROOMS.some((q) => q.side === side && Math.abs(x - q.door) < 2.9), fix = (m) => { m.castShadow = false; return m; };
    for (let x = HALL.x0 + 3; x < HALL.x1; x += 6) { for (const side of [-1, 1]) if (!nearDoor(x, side)) this.put(hall, fix(this.box(0.22, HALL.h, 0.16, M.metal)), x, HALL.h / 2, side * (HALL.z1 - 0.08)); this.put(hall, fix(this.box(0.22, 0.14, HALL.z1 * 2, M.metal)), x, HALL.h - 0.07, 0); }
    for (const q of ROOMS) { const z = q.side * (HALL.z1 - 0.07); for (const dx of [-2.12, 2.12]) this.put(hall, fix(this.box(0.24, DH, 0.2, M.orange)), q.door + dx, DH / 2, z); this.put(hall, fix(this.box(4.48, 0.24, 0.2, M.orange)), q.door, DH + 0.12, z); this.put(hall, fix(this.box(1.5, 0.1, 0.06, M.cyan)), q.door, DH + 0.12, q.side * (HALL.z1 - 0.19)); }
    const run = HALL.x1 - HALL.x0, mid = (HALL.x0 + HALL.x1) / 2;
    for (const [z, r, mat] of [[-1.9, 0.09, M.metal], [-1.62, 0.06, M.tankW], [1.85, 0.11, M.white]]) this.put(hall, fix(this.cyl(r, r, run, mat, 8)), mid, HALL.h - 0.32, z, 0, 0, Math.PI / 2);
    this.put(hall, fix(this.box(run, 0.05, 0.42, M.dark)), mid, HALL.h - 0.5, 1.2);
    for (const side of [-1, 1]) this.put(hall, fix(this.box(run, 0.05, 0.05, M.cyan)), mid, 0.12, side * (HALL.z1 - 0.05));
    this.walk.push({ x0: HALL.x0 - 1, x1: HALL.x1 - 0.6, z0: HALL.z0 + 0.5, z1: HALL.z1 - 0.5 });
    // airlock: the station's front door, with the suit lockers
    const A = AIRLOCK, ab = new THREE.Group(); D.add(ab); floor(ab, A.x0, A.x1, A.z0, A.z1); ceil(ab, A.x0, A.x1, A.z0, A.z1, A.h);
    wx(ab, A.x0, A.x1, A.z0, 1, 0, A.h, M.wall); wx(ab, A.x0, A.x1, A.z1, -1, 0, A.h, M.wall);
    wz(ab, A.z0, -2, A.x0, 1, 0, A.h, M.wall); wz(ab, 2, A.z1, A.x0, 1, 0, A.h, M.wall); wz(ab, -2, 2, A.x0, 1, DH, A.h, M.wall);
    wz(ab, A.z0, HALL.z0, A.x1, -1, 0, A.h, M.wall); wz(ab, HALL.z1, A.z1, A.x1, -1, 0, A.h, M.wall); wz(ab, HALL.z0, HALL.z1, A.x1, -1, HALL.h, A.h, M.wall);
    strip(ab, (A.x0 + A.x1) / 2, A.h - 0.05, 0, 5, 1, M.whiteG);
    for (let i = 0; i < 3; i++) { const lx = A.x0 + 2.2 + i * 2.6; this.put(ab, fix(this.box(1.9, 3.1, 0.7, M.grey)), lx, 1.55, A.z0 + 0.4); this.put(ab, fix(this.box(1.6, 0.22, 0.05, M.orange)), lx, 2.8, A.z0 + 0.78); this.put(ab, fix(this.box(0.08, 0.5, 0.05, M.cyan)), lx + 0.7, 1.5, A.z0 + 0.78); }
    this.suitHook = new THREE.Group(); this.suitHook.position.set(A.x0 + 4.8, 0, A.z0 + 1.15); ab.add(this.suitHook);   // your empty suit stands here while you are indoors
    this.put(this.suitHook, fix(this.cyl(0.34, 0.3, 0.95, M.white, 12)), 0, 1.3, 0); this.put(this.suitHook, fix(this.sph(0.27, M.white, 14, 10)), 0, 2.02, 0); this.put(this.suitHook, fix(this.sph(0.21, M.foil, 12, 8)), 0, 2.02, 0.1); this.put(this.suitHook, fix(this.box(0.5, 0.7, 0.26, M.white)), 0, 1.36, -0.3);
    for (const sx of [-0.16, 0.16]) this.put(this.suitHook, fix(this.cyl(0.12, 0.12, 0.85, M.white, 8)), sx, 0.45, 0); for (const sx of [-0.44, 0.44]) this.put(this.suitHook, fix(this.cyl(0.1, 0.1, 0.75, M.white, 8)), sx, 1.25, 0);
    this.put(ab, fix(this.box(3.6, 0.45, 0.8, M.orange)), A.x0 + 4.8, 0.25, A.z1 - 0.55);
    for (const dz of [-2.12, 2.12]) this.put(ab, fix(this.box(0.2, DH, 0.24, M.orange)), A.x0 + 0.07, DH / 2, dz); this.put(ab, fix(this.box(0.2, 0.24, 4.48, M.orange)), A.x0 + 0.07, DH + 0.12, 0);
    this.outerDoor = this.put(ab, this.box(0.3, DH - 0.1, 3.9, M.orange), A.x0, DH / 2, 0); this.put(this.outerDoor, new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), M.cyan), -0.16, 0.5, 0, 0, -Math.PI / 2); this.put(this.outerDoor, new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), M.cyan), 0.16, 0.5, 0, 0, Math.PI / 2);
    this.walk.push({ x0: A.x0 + 0.6, x1: A.x1 + 1, z0: A.z0 + 1.1, z1: A.z1 - 1.2 }, { x0: A.x0 - 1.2, x1: A.x0 + 1, z0: -1.6, z1: 1.6 });
    this.lamp(D, -65, 4, 0, 0xfff0e0, 16, 30); for (const x of [-30, 10, 50]) this.lamp(D, x, 4, 0, 0xfff0e0, 14, 46);
    // rooms
    for (const def of ROOMS) {
      const g = new THREE.Group(); D.add(g); const { x0, x1, z0, z1 } = roomRect(def), s = def.side, zd = s < 0 ? z1 : z0, zf = s < 0 ? z0 : z1, wall = M.wall.clone(), light = M.whiteG.clone();
      floor(g, x0, x1, z0, z1); ceil(g, x0, x1, z0, z1, ROOM_H);
      wx(g, x0, def.door - 2, zd, s, 0, ROOM_H, wall); wx(g, def.door + 2, x1, zd, s, 0, ROOM_H, wall); wx(g, def.door - 2, def.door + 2, zd, s, DH, ROOM_H, wall); wx(g, x0, x1, zf, -s, 0, ROOM_H, wall);
      wz(g, z0, z1, x0, 1, 0, ROOM_H, wall); wz(g, z0, z1, x1, -1, 0, ROOM_H, wall);
      const ta = s < 0 ? z1 : HALL.z1, tb = s < 0 ? HALL.z0 : z0; floor(g, def.door - 2, def.door + 2, ta, tb); ceil(g, def.door - 2, def.door + 2, ta, tb, DH); wz(g, ta, tb, def.door - 2, 1, 0, DH, wall); wz(g, ta, tb, def.door + 2, -1, 0, DH, wall);
      for (let k = 0; k < 2; k++) strip(g, x0 + (x1 - x0) * (0.3 + k * 0.4), ROOM_H - 0.05, (z0 + z1) / 2, 1, (z1 - z0) * 0.6, light);
      const door = this.put(g, this.box(3.9, DH - 0.1, 0.3, M.door), def.door, DH / 2, s * 4.5); this.put(door, new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), M.cyan), 0, 0.5, 0.16); this.put(door, new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), M.cyan), 0, 0.5, -0.16, 0, Math.PI);
      const [sx, sz] = doorSpot(def), sw = this.put(g, this.box(0.3, 1.4, 0.5, M.dark), def.door + 1.86, 1.2, sz), swLed = this.put(g, this.box(0.06, 0.5, 0.3, M.greenG.clone()), def.door + 1.68, 1.4, sz);
      const [cx, cz] = roomSpot(def), con = new THREE.Group(); con.position.set(cx + 2.6, 0, cz - s * 1.2); g.add(con); this.put(con, this.box(1.2, 1.1, 0.7, M.dark), 0, 0.55, 0); this.put(con, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M.screen), 0, 1.45, 0, -0.3, s < 0 ? 0 : Math.PI);
      const props = new THREE.Group(); g.add(props); const debris = new THREE.Group(); g.add(debris); const rnd = seeded(def.door * 7 + 91);
      for (let i = 0; i < 12; i++) { const b = this.box(0.4 + rnd() * 1.6, 0.2 + rnd() * 0.7, 0.4 + rnd() * 1.4, i % 3 ? M.grey : M.red); b.position.set(x0 + 2 + rnd() * (x1 - x0 - 4), 0.3, z0 + 2 + rnd() * (z1 - z0 - 4)); b.rotation.set(rnd(), rnd() * 3, rnd()); debris.add(b); }
      const hx = x0 + (x1 - x0) * 0.72, hole = new THREE.Group(); hole.position.set(hx, ROOM_H - 0.06, zf - s * 3); g.add(hole);
      this.put(hole, new THREE.Mesh(new THREE.CircleGeometry(0.9, 9), new THREE.MeshBasicMaterial({ color: 0x000000 })), 0, 0, 0, Math.PI / 2); const jet = this.put(hole, new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), 0, -2.2, 0);
      this.rooms[def.id] = { def, g, wall, light, door, swLed, props, debris, hole, jet, holePos: new V3(hx, 0, zf - s * 3), open: 1 };
      this.walk.push({ x0: x0 + 0.7, x1: x1 - 0.7, z0: z0 + 0.7, z1: z1 - 0.7, room: def.id }, { x0: def.door - 1.5, x1: def.door + 1.5, z0: s < 0 ? z1 - 1 : HALL.z1 + 0.6, z1: s < 0 ? HALL.z0 - 0.6 : z0 + 1, room: def.id }, { x0: def.door - 1.5, x1: def.door + 1.5, z0: Math.min(ta, tb) - 1, z1: Math.max(ta, tb) + 1 });
    }
    // The outside of the building, seen from the cave. Hidden while you are indoors so the camera can look in.
    const sh = this.shell = new THREE.Group(); D.add(sh);
    const hullTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e6e7e9'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a9aeb5'; g.lineWidth = 3; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); } g.fillStyle = '#c3c7cd'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (const [a, b] of [[10, 10], [118, 10], [10, 118], [118, 118]]) { g.beginPath(); g.arc(i * 128 + a, j * 128 + b, 3, 0, 7); g.fill(); } });
    hullTex.wrapS = hullTex.wrapT = THREE.RepeatWrapping;
    const hull = std({ color: 0xffffff, map: hullTex, roughness: 0.6, metalness: 0.2 }), roofM = std({ color: 0xb4b9c0, map: hullTex, roughness: 0.7, metalness: 0.2 });
    const roof = (x0, x1, z0, z1, h) => { const m = P(x1 - x0, z1 - z0, roofM); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, h + 0.02, (z0 + z1) / 2); sh.add(m); };
    const boxOut = (x0, x1, z0, z1, h, west = true) => { wx(sh, x0, x1, z0, -1, 0, h, hull); wx(sh, x0, x1, z1, 1, 0, h, hull); if (west) wz(sh, z0, z1, x0, -1, 0, h, hull); wz(sh, z0, z1, x1, 1, 0, h, hull); roof(x0, x1, z0, z1, h); };
    boxOut(HALL.x0, HALL.x1, HALL.z0, HALL.z1, HALL.h, false); boxOut(A.x0, A.x1, A.z0, A.z1, A.h, false);
    wz(sh, A.z0, -2, A.x0, -1, 0, A.h, hull); wz(sh, 2, A.z1, A.x0, -1, 0, A.h, hull); wz(sh, -2, 2, A.x0, -1, DH, A.h, hull);
    for (const def of ROOMS) { const q = roomRect(def), s = def.side, zf = s < 0 ? q.z0 : q.z1; boxOut(q.x0, q.x1, q.z0, q.z1, ROOM_H); boxOut(def.door - 2, def.door + 2, s < 0 ? q.z1 : HALL.z1, s < 0 ? HALL.z0 : q.z0, DH);
      const farm = def.id === 'potato' || def.id === 'tomato', pm = farm ? M.pink : M.warm, zc = (q.z0 + q.z1) / 2;   // small round portholes, never big windows: farms glow pink from their LED grow lights
      for (let k = 0; k < 2; k++) { const px = q.x0 + (q.x1 - q.x0) * (0.3 + 0.4 * k); this.put(sh, new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), pm), px, 3.5, zf + s * 0.07, 0, s < 0 ? Math.PI : 0); this.put(sh, new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 18), M.grey), px, 3.5, zf + s * 0.08, 0, s < 0 ? Math.PI : 0); }
      for (const e of [-1, 1]) { const ex = e < 0 ? q.x0 : q.x1; this.put(sh, new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), pm), ex + e * 0.07, 3.5, zc, 0, e * Math.PI / 2); }
      this.put(sh, fix(this.box(4.5, DH + 0.3, 0.7, M.orange)), def.door, DH / 2 + 0.05, s * 4.5);
      this.put(sh, fix(this.box(q.x1 - q.x0 + 0.3, 0.5, 0.3, M.orange)), (q.x0 + q.x1) / 2, 0.25, zf + s * 0.12); }
    const signTex = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#10161f'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb347'; g.font = '700 54px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TRANQUILITY DEEP', w / 2, h / 2 + 3); });
    this.put(sh, fix(this.box(0.2, 2, 8.9, M.dark)), A.x0 + 0.05, A.h + 1.1, 0); this.put(sh, new THREE.Mesh(new THREE.PlaneGeometry(8.5, 1.6), new THREE.MeshBasicMaterial({ map: signTex })), A.x0 - 0.07, A.h + 1.1, 0, 0, -Math.PI / 2);
    for (const z of [-2.7, 2.7]) this.put(sh, this.sph(0.26, M.cyan), A.x0 - 0.2, 4.6, z);
    [[-73.5, 7.2, 0, M.white], [-73.5, 7.2, 1.3, M.orange], [-75.6, 8.4, 0, M.orange], [-73.2, 9.6, 0, M.white]].forEach(([cx, cz, cy, m]) => { this.put(sh, this.box(1.8, 1.3, 1.8, m), cx, cy + 0.65, cz); if (!cy) this.solid('deep', cx, cz, 1.3); });   // cargo waiting by the airlock
    this._props();
  }
  // One little plant of each crop. Leaves share the rack's own leaf material (so sick racks can turn brown); "fruits" appear late.
  _plant(kind, leaf, fruit, rnd) {
    const g = new THREE.Group(), fr = [], put = (m, x, y, z, sx = 1, sy = 1, sz = 1) => { m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = false; g.add(m); return m; };
    const G = this._pg || (this._pg = { blob: new THREE.SphereGeometry(0.5, 7, 5), small: new THREE.SphereGeometry(0.14, 6, 5), stalk: new THREE.CylinderGeometry(0.03, 0.035, 1, 5), cone: new THREE.ConeGeometry(0.18, 0.6, 6), disc: new THREE.CylinderGeometry(0.3, 0.3, 0.05, 9), ear: new THREE.BoxGeometry(0.07, 0.3, 0.07) });
    const mk = (geo, mat) => new THREE.Mesh(geo, mat), j = () => (rnd() - 0.5);
    if (kind === 'potato') put(mk(G.blob, leaf), 0, 0.3, 0, 1.1, 0.8, 1.1);
    else if (kind === 'wheat') for (let i = 0; i < 6; i++) { const x = j() * 0.7, z = j() * 0.9, h = 1.3 + rnd() * 0.5; put(mk(G.stalk, leaf), x, h / 2, z, 1, h, 1); fr.push(put(mk(G.ear, fruit), x, h + 0.12, z)); }
    else if (kind === 'soybean') { put(mk(G.blob, leaf), 0, 0.35, 0, 0.9, 0.85, 0.9); for (let i = 0; i < 4; i++) fr.push(put(mk(G.small, fruit), j() * 0.6, 0.25 + rnd() * 0.3, j() * 0.6, 0.6, 1.5, 0.6)); }
    else if (kind === 'peas') { put(mk(G.stalk, leaf), 0, 0.9, 0, 1, 1.8, 1); for (let i = 0; i < 4; i++) put(mk(G.blob, leaf), j() * 0.3, 0.3 + i * 0.42, j() * 0.3, 0.42, 0.3, 0.42); for (let i = 0; i < 3; i++) fr.push(put(mk(G.small, fruit), j() * 0.4, 0.5 + i * 0.4, j() * 0.4, 0.5, 1.6, 0.5)); }
    else if (kind === 'tomato') { put(mk(G.stalk, leaf), 0, 1.0, 0, 1.3, 2.0, 1.3); put(mk(G.blob, leaf), 0, 1.25, 0, 0.9, 1.5, 0.9); for (let i = 0; i < 3; i++) fr.push(put(mk(G.small, fruit), j() * 0.7, 0.6 + i * 0.5, j() * 0.7, 1.4, 1.4, 1.4)); }
    else if (kind === 'lettuce') put(mk(G.blob, leaf), 0, 0.2, 0, 0.9, 0.5, 0.9);
    else if (kind === 'spinach') for (let i = 0; i < 3; i++) put(mk(G.blob, leaf), j() * 0.4, 0.16, j() * 0.4, 0.45, 0.32, 0.6);
    else if (kind === 'radish') { fr.push(put(mk(G.small, fruit), 0, 0.06, 0, 1.2, 1.2, 1.2)); for (let i = 0; i < 3; i++) put(mk(G.blob, leaf), j() * 0.25, 0.3, j() * 0.25, 0.22, 0.5, 0.12); }
    else if (kind === 'herbs') for (let i = 0; i < 3; i++) put(mk(G.cone, leaf), j() * 0.5, 0.3, j() * 0.5, 1, 0.8 + rnd() * 0.6, 1);
    else { put(mk(G.disc, leaf), 0, 0.03, 0, 0.8, 1, 0.8); put(mk(G.stalk, leaf), 0, 0.25, 0, 0.5, 0.5, 0.5); fr.push(put(mk(G.small, fruit), 0, 0.52, 0, 0.4, 0.4, 0.4)); }
    g.userData.fr = fr; return g;
  }
  _replant(v, kind) {
    v.kind = kind; v.cur = 0; v.list = []; while (v.plants.children.length) v.plants.remove(v.plants.children[0]);
    if (!kind) return; const LEAF = { potato: 0x3f9b46, wheat: 0x9fbf4a, soybean: 0x5fae4f, peas: 0x5fbe5f, tomato: 0x3f9b46, lettuce: 0x8fe06a, spinach: 0x2f7f3a, radish: 0x4faa4f, herbs: 0x4fbf8a, arabidopsis: 0x9fd0a0 }, FRUIT = { wheat: 0xe0c060, soybean: 0xb9d070, peas: 0x9fe07a, tomato: 0xe5362b, radish: 0xe0527a, arabidopsis: 0xffffff };
    v.base = new THREE.Color(LEAF[kind] || 0x3f9b46); v.leaf = std({ color: v.base.getHex(), roughness: 0.85 }); v.fruit = std({ color: FRUIT[kind] || 0xffffff, roughness: 0.5 });
    const gap = { wheat: 1.0, lettuce: 1.2, spinach: 1.2, radish: 0.9, herbs: 1.0, arabidopsis: 0.9 }[kind] || 1.75, n = Math.max(3, Math.floor((v.L - 1.6) / gap)), rnd = seeded(v.b * 31 + kind.length * 7 + (v.room === 'potato' ? 1 : 5));
    for (let k = 0; k < n; k++) { const p = this._plant(kind, v.leaf, v.fruit, rnd); p.position.set(-v.L / 2 + 0.8 + (k + 0.5) * ((v.L - 1.6) / n), 0, (rnd() - 0.5) * 0.7); p.rotation.y = rnd() * 6.28; v.plants.add(p); v.list.push({ p, ph: rnd() * 6.28, s: 0.85 + rnd() * 0.3 }); }
  }
  // Furniture and machines. Anything added to a room's `props` group is hidden while the room is wrecked and comes back step by step as it is rebuilt.
  _props() {
    const M = this.M, R = this.rooms, add = (id, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => this.put(R[id].props, mesh, x, y, z, rx, ry, rz), hard = (x, z, r) => this.solid('deep', x, z, r);
    const rc = (id) => { const d = R[id].def, q = roomRect(d); return { ...q, cx: (q.x0 + q.x1) / 2, cz: (q.z0 + q.z1) / 2, s: d.side }; };
    // Workshop: Fix-It bench with two slots, robot arm, builder line
    { add('workshop', this.box(7, 0.9, 3.4, M.grey), BENCH[0], 0.45, BENCH[1] - 2.6); add('workshop', this.box(7.2, 0.15, 3.6, M.orange), BENCH[0], 0.95, BENCH[1] - 2.6); hard(BENCH[0], BENCH[1] - 2.6, 2.6);
      this.benchSlots = [0, 1].map((i) => { const g = new THREE.Group(); g.position.set(BENCH[0] - 1.7 + i * 3.4, 1.08, BENCH[1] - 2.6); g.scale.setScalar(0.62); const a = this.box(PANEL_W, 0.12, PANEL_D, M.panelB), b = this.box(PANEL_W, 0.12, PANEL_D, M.panel); g.add(a, b); g.rotation.y = Math.PI / 2; R.workshop.props.add(g); return { g, a, b }; });
      const arm = this.arm = new THREE.Group(); arm.position.set(BENCH[0] + 5.2, 0, BENCH[1] - 3); R.workshop.props.add(arm); this.put(arm, this.cyl(0.7, 0.9, 0.6, M.yellow, 14), 0, 0.3, 0);
      const a1 = this.armA = new THREE.Group(); a1.position.y = 0.6; arm.add(a1); this.put(a1, this.box(0.4, 2.4, 0.4, M.yellow), 0, 1.2, 0); const a2 = this.armB = new THREE.Group(); a2.position.y = 2.4; a1.add(a2); this.put(a2, this.box(0.32, 2.0, 0.32, M.white), 0, 1.0, 0); this.put(a2, this.box(0.5, 0.3, 0.5, M.dark), 0, 2.05, 0); this.armTip = this.put(a2, this.sph(0.14, M.cyan.clone()), 0, 2.3, 0);
      add('workshop', this.box(9, 0.8, 2.2, M.dark), FAB[0], 0.4, FAB[1] - 2.9); add('workshop', this.box(9, 0.1, 1.8, M.metal), FAB[0], 0.86, FAB[1] - 2.9); for (const dx of [-4, 4]) add('workshop', this.box(0.25, 3.2, 0.25, M.yellow), FAB[0] + dx, 1.6, FAB[1] - 2.9); add('workshop', this.box(8.4, 0.25, 0.25, M.yellow), FAB[0], 3.2, FAB[1] - 2.9);
      this.fabHead = add('workshop', this.box(0.6, 0.7, 0.6, M.orange), FAB[0], 2.75, FAB[1] - 2.9); this.fabPart = add('workshop', this.box(PANEL_W * 0.55, 0.1, PANEL_D * 0.55, M.panel), FAB[0], 0.98, FAB[1] - 2.9); hard(FAB[0] - 2.5, FAB[1] - 2.9, 1.8); hard(FAB[0] + 2.5, FAB[1] - 2.9, 1.8);
      add('workshop', this.box(2.6, 0.2, 2.6, M.yellow), FAB_OUT[0], 0.1, FAB_OUT[1]); for (let i = 0; i < 4; i++) add('workshop', this.box(1.2, 1.1, 1.2, i % 2 ? M.orange : M.white), -34.5, 0.55 + (i > 1 ? 1.1 : 0), -9 - (i % 2) * 1.4); }
    // Control Center: the big map wall + desks
    { const c = rc('control'); this.ccCanvas = document.createElement('canvas'); this.ccCanvas.width = 1024; this.ccCanvas.height = 512; this.ccTex = new THREE.CanvasTexture(this.ccCanvas); this.ccTex.colorSpace = THREE.SRGBColorSpace;
      add('control', new THREE.Mesh(new THREE.PlaneGeometry(15, 5), new THREE.MeshBasicMaterial({ map: this.ccTex })), c.cx, 3.2, c.z0 + 0.12); add('control', this.box(15.6, 5.5, 0.1, M.dark), c.cx, 3.2, c.z0 + 0.05);
      for (let i = 0; i < 3; i++) { add('control', this.box(3.2, 0.9, 1.3, M.dark), c.x0 + 4.5 + i * 6.4, 0.45, c.cz - 2); add('control', new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), M.screen), c.x0 + 4.5 + i * 6.4, 1.55, c.cz - 2.3, -0.25); hard(c.x0 + 4.5 + i * 6.4, c.cz - 2, 1.5); } }
    // Kitchen
    { const c = rc('kitchen'); add('kitchen', this.box(10, 1, 1.4, M.white), c.cx, 0.5, c.z0 + 1.1); add('kitchen', this.box(10.2, 0.1, 1.5, M.grey), c.cx, 1.05, c.z0 + 1.1); this.stove = add('kitchen', this.cyl(0.45, 0.45, 0.06, glow(0xff5a1a, 0.2), 18), c.cx - 2, 1.13, c.z0 + 1.1); add('kitchen', this.cyl(0.5, 0.4, 0.5, M.metal, 14), c.cx - 2, 1.4, c.z0 + 1.1);
      add('kitchen', this.box(1.6, 3, 1.3, M.metal), c.x1 - 1.6, 1.5, c.z0 + 1.2); add('kitchen', this.cyl(1.5, 1.5, 0.12, M.white, 20), c.cx, 0.95, c.cz + 2); add('kitchen', this.cyl(0.15, 0.3, 0.9, M.grey, 8), c.cx, 0.45, c.cz + 2); hard(c.cx, c.cz + 2, 1.7);
      this.canStacks = []; for (let i = 0; i < 8; i++) this.canStacks.push(add('kitchen', this.cyl(0.22, 0.22, 0.5, i % 2 ? M.green : M.orange, 10), c.x0 + 1.2 + (i % 4) * 0.55, 1.35 + Math.floor(i / 4) * 0.52, c.z0 + 1.1)); }
    // Oxygen Room
    { const c = rc('oxygen'); this.o2Tanks = []; for (let i = 0; i < 3; i++) { this.o2Tanks.push(add('oxygen', this.sph(1.7, M.tankO2.clone(), 18, 12), c.x0 + 3 + i * 4.2, 2.0, c.z0 + 2.4)); add('oxygen', this.cyl(0.5, 0.8, 0.6, M.grey, 10), c.x0 + 3 + i * 4.2, 0.3, c.z0 + 2.4); hard(c.x0 + 3 + i * 4.2, c.z0 + 2.4, 1.9); }
      add('oxygen', this.box(5, 2.6, 1.4, M.grey), c.cx, 1.3, c.cz + 2.5); this.o2Glow = add('oxygen', this.box(4.2, 0.35, 0.1, M.cyan.clone()), c.cx, 2.0, c.cz + 3.22); add('oxygen', this.cyl(0.18, 0.18, 5, M.metal, 8), c.cx, 2.9, c.cz + 2.5, 0, 0, 1.5708); hard(c.cx - 1.4, c.cz + 2.5, 1.5); hard(c.cx + 1.4, c.cz + 2.5, 1.5); }
    // Potato farm: soil beds with bushy plants
    // --- the two farms: three hydroponic racks each, plus one bed of treated moon soil once that is researched.
    // Each rack is one group; its plants are rebuilt when it is replanted and grow, sway and fruit with the simulation.
    this.rackViews = []; this.expViews = {};
    for (const id of ['potato', 'tomato']) { const c = rc(id), len = c.x1 - c.x0 - 5;
      for (let b = 0; b < 4; b++) { const soil = b === 3, L = soil ? 9 : len, x = soil ? (c.s < 0 ? c.x0 + 5.5 : c.x1 - 6) : c.cx, z = soil ? c.z1 - 1.8 : c.z0 + 3 + b * 5, g = new THREE.Group(); g.position.set(x, 0, z); R[id].props.add(g);
        const lamp = M.pink.clone(), led = M.greenG.clone(); this.put(g, this.box(L, 0.7, soil ? 1.6 : 2.2, soil ? M.grey : M.white), 0, 0.35, 0);
        if (soil) this.put(g, this.box(L - 0.3, 0.2, 1.3, M.soil), 0, 0.72, 0); else { this.put(g, this.box(L - 0.4, 0.06, 1.7, M.dark), 0, 0.72, 0); this.put(g, this.box(L - 0.6, 0.05, 0.35, M.water), 0, 0.76, 0); this.put(g, this.cyl(0.07, 0.07, L, M.tankW, 8), 0, 0.5, 1.16, 0, 0, Math.PI / 2); }
        this.put(g, this.box(L, 0.1, 0.5, lamp), 0, ROOM_H - 1.2, 0); for (const e of [-1, 1]) this.put(g, this.box(0.1, ROOM_H - 1.9, 0.1, M.metal), e * (L / 2 - 0.1), (ROOM_H - 0.5) / 2, 0);
        this.put(g, this.box(0.5, 0.35, 0.08, M.dark), -L / 2 + 0.6, 0.45, 1.13); this.put(g, this.sph(0.09, led, 8, 6), -L / 2 + 0.6, 0.45, 1.19);
        const plants = new THREE.Group(); plants.position.y = 0.78; g.add(plants);
        for (let k = -1; k <= 1; k++) hard(x + k * (L / 2 - 1.2), z, soil ? 1.0 : 1.3);
        this.rackViews.push({ room: id, b, soil, L, g, plants, lamp, led, kind: undefined, cur: 0, list: [], leaf: null, fruit: null }); }
      // the moon-soil experiment: three pots of thale cress on a bench by the wall
      const ex = new THREE.Group(); ex.position.set(c.x0 + 1.6, 0, c.cz); R[id].props.add(ex); this.put(ex, this.box(1.4, 0.9, 4.6, M.white), 0, 0.45, 0); this.put(ex, this.box(1.2, 0.06, 0.4, M.pink), 0, 2.4, 0, 0, Math.PI / 2); for (const e of [-2, 2]) this.put(ex, this.box(0.08, 1.5, 0.08, M.metal), 0, 1.65, e);
      const pots = [[M.tankW, 0x58c26a], [M.soil, 0x7fae4f], [M.grey, 0x8a4a52]].map(([pm, col], i) => { const p = new THREE.Group(); p.position.set(0, 0.9, (i - 1) * 1.4); ex.add(p); this.put(p, this.cyl(0.36, 0.28, 0.4, pm, 12), 0, 0.2, 0); const lm = std({ color: col, roughness: 0.8 }), pl = new THREE.Group(); pl.position.y = 0.4; p.add(pl); this.put(pl, this.cyl(0.26, 0.26, 0.04, lm, 9), 0, 0.03, 0); this.put(pl, this.cyl(0.015, 0.015, 0.5, lm, 5), 0, 0.28, 0); this.put(pl, this.sph(0.05, lm, 6, 5), 0, 0.54, 0); return pl; });
      hard(c.x0 + 1.6, c.cz, 1.5); this.expViews[id] = { g: ex, pots }; }

    // Battery Store
    { const c = rc('storage'); this.battBars = []; for (let i = 0; i < 4; i++) { const x = c.x0 + 2.6 + i * 3.6; add('storage', this.box(3, 3.4, 1.6, M.dark), x, 1.7, c.z1 - 1.5); this.battBars.push(add('storage', this.box(0.35, 2.6, 0.08, M.greenG.clone()), x, 1.7, c.z1 - 2.34)); add('storage', this.box(3.1, 0.2, 1.7, M.orange), x, 3.5, c.z1 - 1.5); hard(x, c.z1 - 1.5, 1.7); }
      this.modSlots = []; for (let i = 0; i < 6; i++) { const m = add('storage', this.box(1.3, 1.0, 0.9, M.dark), c.x0 + 1.6 + (i % 3) * 1.7, 0.5 + Math.floor(i / 3) * 1.05, c.z0 + 6); this.modSlots.push(m); } }
    // Bunk Room
    { const c = rc('quarters'); for (let i = 0; i < 3; i++) { const x = c.x0 + 3.5 + i * 6; for (const y of [0.5, 2.3]) { add('quarters', this.box(2.2, 0.35, 4.2, M.white), x, y, c.z1 - 2.8); add('quarters', this.box(2.0, 0.2, 2.8, [M.orange, M.teal, M.blue][i]), x, y + 0.26, c.z1 - 2.2); add('quarters', this.box(1.4, 0.25, 0.8, M.white), x, y + 0.3, c.z1 - 4.4); } for (const dx of [-1.05, 1.05]) add('quarters', this.box(0.12, 3.2, 0.12, M.grey), x + dx, 1.6, c.z1 - 0.8); hard(x, c.z1 - 2.8, 1.8); }
      add('quarters', this.box(1.2, 2.6, 0.8, M.grey), c.x0 + 1, 1.3, c.z0 + 1.2); }
    // Bathroom
    { const c = rc('bathroom'); add('bathroom', this.cyl(1.2, 1.2, 3.4, M.glass.clone(), 16), c.x0 + 2.4, 1.7, c.z1 - 2.4); add('bathroom', this.cyl(1.25, 1.25, 0.15, M.white, 16), c.x0 + 2.4, 0.08, c.z1 - 2.4); add('bathroom', this.cyl(0.5, 0.4, 0.8, M.white, 14), c.x1 - 2.2, 0.4, c.z1 - 2); add('bathroom', this.box(0.9, 1.0, 0.3, M.white), c.x1 - 2.2, 1.0, c.z1 - 1.3); add('bathroom', this.box(1.6, 0.25, 0.9, M.white), c.cx + 0.5, 1.0, c.z0 + 4.2); add('bathroom', new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), M.cyan), c.cx + 0.5, 2.2, c.z1 - 0.2, 0, Math.PI); hard(c.x0 + 2.4, c.z1 - 2.4, 1.4); }
    // Water Room
    { const c = rc('water'); this.waterTanks = []; for (let i = 0; i < 2; i++) { this.waterTanks.push(add('water', this.cyl(2, 2, 4.8, M.tankW.clone(), 20), c.x0 + 3.4 + i * 5.2, 2.4, c.z1 - 3)); hard(c.x0 + 3.4 + i * 5.2, c.z1 - 3, 2.2); } add('water', this.box(4.4, 2.2, 1.1, M.white), c.cx + 2, 1.1, c.cz - 1); this.waterGlow = add('water', this.box(3.6, 0.3, 0.1, M.cyan.clone()), c.cx + 2, 1.7, c.cz - 1.57); add('water', this.cyl(0.18, 0.18, 6, M.metal, 8), c.cx + 1, 3, c.cz + 1, 0, 0, 1.5708); hard(c.cx + 2, c.cz - 1, 2); }
    // Animal Bay: hen coop, feed sacks, fish tank
    { const c = rc('animal'), px = c.x0 + 5, pz = c.cz + 2.5; add('animal', this.cyl(3.6, 3.6, 0.12, M.straw, 24), px, 0.1, pz); for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283; add('animal', this.cyl(0.05, 0.05, 1, M.white, 5), px + Math.cos(a) * 3.6, 0.5, pz + Math.sin(a) * 3.6); } add('animal', new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.04, 5, 36), M.white), px, 1.0, pz, Math.PI / 2); add('animal', this.box(2.2, 1.3, 1.4, M.red), px, 0.65, pz + 2.2);
      this.hens = []; for (let i = 0; i < 6; i++) { const h = new THREE.Group(); const b = this.sph(0.34, M.hen, 10, 8); b.scale.set(1, 0.9, 1.25); h.add(b); this.put(h, this.sph(0.17, M.hen, 8, 6), 0, 0.34, 0.3); this.put(h, new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), M.orange), 0, 0.32, 0.5, Math.PI / 2); this.put(h, this.box(0.05, 0.12, 0.12, M.red), 0, 0.52, 0.3); h.position.set(px, 0.42, pz); R.animal.props.add(h); this.hens.push({ g: h, a: i * 1.05, r: 0.8 + (i % 3) * 0.8, sp: 0.25 + hash(i, 4) * 0.3 }); }
      this.henPod = add('animal', this.sph(1.1, M.white, 14, 10), px, 0.9, pz); this.henPod.scale.set(1.3, 0.8, 1); this.henPos = new V3(px, 0, pz);
      this.sacks = []; for (let i = 0; i < 5; i++) this.sacks.push(add('animal', this.box(0.9, 0.5, 0.6, M.straw), c.x0 + 1.2 + (i % 2) * 1, 0.25 + Math.floor(i / 2) * 0.5, c.z0 + 6));
      const tx = c.x1 - 3.6, tz = c.z0 + 7; add('animal', this.box(4.6, 0.7, 2.2, M.dark), tx, 0.35, tz); add('animal', this.box(4.4, 1.6, 2.0, M.water), tx, 1.5, tz); add('animal', this.box(4.5, 1.7, 2.1, M.glass.clone()), tx, 1.5, tz); this.fishes = []; for (let i = 0; i < 5; i++) { const f = this.sph(0.16, M.fish, 8, 6); f.scale.set(1.8, 1, 0.6); f.position.set(tx, 1.5, tz); R.animal.props.add(f); this.fishes.push({ m: f, ph: i * 1.3, tx, tz }); } hard(tx, tz, 2.2); hard(px, pz + 2.2, 1.4); }
    this.farmLights = [this.lamp(this.deep, 57, 4.6, -15, 0xff4fd8, 20, 34), this.lamp(this.deep, 60, 4.6, 15, 0xff4fd8, 20, 34)];
    this._decor();
  }

  // Furnishing: the things that make each room read as a real place (ribs, ducts, shelves, pipes, lockers, chairs).
  // Everything is one group per room, added last to that room's props, so it disappears with a wrecked room and returns when it is rebuilt.
  // Nothing here blocks walking: pieces sit within 0.7 m of a wall, above head height, or inside an existing machine's collider. The few that do not get their own small collider.
  _decor() {
    const M = this.M, R = this.rooms, PI2 = Math.PI / 2, hard = (x, z, r) => this.solid('deep', x, z, r);
    const quiet = (m) => { m.castShadow = false; m.receiveShadow = false; return m; };
    for (const id of Object.keys(R)) {
      const d = R[id].def, q = roomRect(d), sd = d.side, g = new THREE.Group();
      const c = { ...q, cx: (q.x0 + q.x1) / 2, cz: (q.z0 + q.z1) / 2, W: q.x1 - q.x0, D: q.z1 - q.z0, door: d.door };
      const zB = (k) => (sd < 0 ? q.z0 : q.z1) - sd * k, zD = (k) => (sd < 0 ? q.z1 : q.z0) + sd * k;   // k metres in from the back wall / from the door wall
      const B = (w, h, dp, m, x, y, z, ry = 0) => this.put(g, quiet(this.box(w, h, dp, m)), x, y, z, 0, ry, 0);
      const C = (r, h, m, x, y, z, rx = 0, rz = 0, seg = 10) => this.put(g, quiet(this.cyl(r, r, h, m, seg)), x, y, z, rx, 0, rz);
      const S = (r, m, x, y, z) => this.put(g, quiet(this.sph(r, m, 10, 8)), x, y, z);
      const T = (r, t, m, x, y, z, rx = 0, ry = 0) => this.put(g, quiet(new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 16), m)), x, y, z, rx, ry, 0);
      // --- the same structure in every room: ribs on the side walls, a duct and a cable tray overhead, a vent, floor lighting, a status screen by the door
      for (const x of [c.x0 + 0.08, c.x1 - 0.08]) for (let k = 1; k <= 3; k++) B(0.16, ROOM_H, 0.2, M.metal, x, ROOM_H / 2, c.z0 + (c.D * k) / 4);
      C(0.2, c.W - 0.5, M.metal, c.cx, ROOM_H - 0.4, zB(0.45), 0, PI2); B(c.W - 0.5, 0.06, 0.45, M.dark, c.cx, ROOM_H - 0.75, zB(1.2));
      B(0.08, 0.7, 1.3, M.dark, c.x1 - 0.05, ROOM_H - 1.3, c.cz + c.D * 0.3);
      for (const x of [c.x0 + 0.06, c.x1 - 0.06]) B(0.05, 0.05, c.D - 0.4, M.cyan, x, 0.1, c.cz);
      B(0.95, 0.65, 0.05, M.dark, c.door - 3.2, 1.7, zD(0.05)); B(0.8, 0.5, 0.02, M.screen, c.door - 3.2, 1.7, zD(0.09));

      if (id === 'workshop') {
        B(0.08, 2.2, 6, M.dark, c.x0 + 0.06, 2.3, -14); for (let i = 0; i < 6; i++) B(0.06, 0.45 + (i % 3) * 0.15, 0.12, i % 2 ? M.orange : M.metal, c.x0 + 0.13, 1.9 + (i % 3) * 0.42, -16.4 + i * 0.95);   // tool wall
        for (const y of [0.5, 1.4, 2.3]) B(7, 0.06, 0.55, M.metal, -51.2, y, zD(0.33)); for (const x of [-54.6, -47.8]) B(0.08, 2.6, 0.55, M.metal, x, 1.3, zD(0.33));                                   // parts shelves
        for (let i = 0; i < 8; i++) B(0.62, 0.4, 0.42, [M.orange, M.blue, M.white, M.yellow][i % 4], -54.1 + i * 0.83, (i % 2 ? 1.4 : 0.5) + 0.23, zD(0.33));
        B(0.25, 0.3, c.D - 1, M.yellow, BENCH[0], ROOM_H - 0.95, c.cz); B(0.6, 0.4, 0.6, M.dark, BENCH[0], ROOM_H - 1.3, BENCH[1] - 2.6); C(0.03, 1.5, M.metal, BENCH[0], ROOM_H - 2.25, BENCH[1] - 2.6); B(0.18, 0.25, 0.1, M.orange, BENCH[0], ROOM_H - 3.1, BENCH[1] - 2.6);   // overhead hoist
        B(0.7, 0.9, 1.4, M.grey, c.x1 - 0.45, 0.45, -15); B(0.04, 0.06, 1.2, M.orange, c.x1 - 0.82, 0.55, -15); B(0.04, 1.4, 2.4, M.screen, c.x1 - 0.05, 2.7, -15);                                   // parts cart, plan screen
      }
      if (id === 'control') {
        for (let i = 0; i < 3; i++) { const x = c.x0 + 4.5 + i * 6.4, z = c.cz - 0.7; C(0.05, 0.5, M.metal, x, 0.27, z); C(0.32, 0.1, M.dark, x, 0.55, z, 0, 0, 14); B(0.6, 0.7, 0.08, M.dark, x, 1.0, z + 0.34); }   // operator chairs
        for (const [x, e] of [[c.x0 + 0.33, 1], [c.x1 - 0.33, -1]]) for (let k = 0; k < 3; k++) { const z = -21 + k * 1.6; B(0.55, 2.7, 1.3, M.dark, x, 1.35, z); B(0.02, 1.7, 0.08, M.greenG, x + e * 0.29, 1.4, z - 0.4); B(0.02, 0.1, 0.5, M.amber, x + e * 0.29, 2.35, z + 0.2); }   // server racks
        const hx = c.x0 + 4.5, hz = zD(4.1); C(0.9, 0.5, M.dark, hx, 0.25, hz, 0, 0, 20); T(0.75, 0.04, M.cyan, hx, 0.56, hz, PI2);                                                                 // hologram table
        this.holoMoon = this.put(g, new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8fe9ff, wireframe: true, transparent: true, opacity: 0.55 })), hx, 1.9, hz);
        T(1.05, 0.015, M.cyan, hx, 1.9, hz, PI2 + 0.35); hard(hx, hz, 1.1);
      }
      if (id === 'kitchen') {
        B(10, 0.8, 0.55, M.white, c.cx, 2.85, zB(0.3)); B(9.6, 0.04, 0.1, M.warm, c.cx, 2.42, zB(0.5));                                                                                                   // wall cabinets + light
        B(1.5, 0.3, 1.2, M.metal, c.cx - 2, 2.25, zB(1.0)); B(1.2, 0.06, 0.8, M.metal, c.cx + 2.5, 1.12, zB(1.1)); C(0.04, 0.45, M.metal, c.cx + 2.5, 1.33, zB(0.55));                                    // hood, sink, tap
        for (let i = 0; i < 4; i++) { const a = i * PI2 + 0.785, x = c.cx + Math.cos(a) * 2.15, z = c.cz + 2 + Math.sin(a) * 2.15; C(0.06, 0.6, M.grey, x, 0.3, z); C(0.32, 0.08, M.orange, x, 0.62, z, 0, 0, 14); }   // stools
        B(0.7, 0.05, 0.5, M.grey, c.cx, 1.04, c.cz + 2); for (let i = 0; i < 3; i++) S(0.1, M.tomato, c.cx - 0.2 + i * 0.2, 1.15, c.cz + 2 + (i % 2) * 0.1);                                              // tray of tomatoes
        B(0.6, 1.1, 0.6, M.white, c.x0 + 0.4, 0.55, zD(5.5)); C(0.3, 1.0, M.tankW, c.x0 + 0.42, 1.6, zD(5.5), 0, 0, 14);                                                                                  // water dispenser
        for (const y of [1.6, 2.25]) { B(0.3, 0.05, 3, M.metal, c.x1 - 0.2, y, zD(7.5)); for (let i = 0; i < 5; i++) C(0.16, 0.36, i % 2 ? M.green : M.orange, c.x1 - 0.22, y + 0.2, zD(6.2 + i * 0.62)); }   // tin racks
      }
      if (id === 'oxygen') {
        const tz = c.z0 + 2.4, xs = [0, 1, 2].map((i) => c.x0 + 3 + i * 4.2), mz = c.cz + 2.5;
        C(0.14, 10.6, M.metal, c.x0 + 7.9, 4.5, tz, 0, PI2); for (const x of xs) { C(0.1, 0.9, M.metal, x, 4.1, tz); T(0.28, 0.05, M.orange, x, 1.5, tz + 1.72); C(0.16, 0.05, M.white, x + 0.55, 2.4, tz + 1.62, PI2, 0, 14); }   // header, risers, valves, gauges
        C(0.12, mz - tz, M.metal, c.cx + 2, 4.5, (tz + mz) / 2, PI2); C(0.12, 1.9, M.metal, c.cx + 2, 3.55, mz);                                                                                          // feed pipe to the Oxygen Maker
        for (const dx of [-1, 1]) { C(0.22, 1.1, M.glass, c.cx + dx, 3.15, mz, 0, 0, 14); C(0.17, 0.75, M.water, c.cx + dx, 3.0, mz, 0, 0, 12); }                                                          // bubbling tubes
        for (let i = 0; i < 4; i++) C(0.24, 1.5, M.tankO2, c.x1 - 0.4, 0.75, -19 + i * 0.6, 0, 0, 12); B(0.06, 0.06, 2.4, M.orange, c.x1 - 0.68, 1.1, -18.1); B(6.2, 0.03, 3, M.dark, c.cx, 0.05, mz);       // spare bottles, floor grating
      }
      if (id === 'storage') {
        const rz = c.z1 - 1.5; B(15, 0.08, 0.6, M.dark, c.x0 + 8, 4.3, rz); for (let i = 0; i < 4; i++) C(0.07, 0.75, M.orange, c.x0 + 2.6 + i * 3.6, 3.95, rz);                                          // cable tray and drops
        B(0.2, 1.6, 1.2, M.grey, c.x1 - 0.12, 1.8, 15); B(0.04, 0.5, 0.12, M.orange, c.x1 - 0.25, 1.9, 15); B(0.02, 0.08, 0.8, M.greenG, c.x1 - 0.23, 2.45, 15);                                           // breaker panel
        B(5.6, 0.05, 1.3, M.yellow, c.x0 + 3.3, 0.045, c.z0 + 6); B(15, 0.03, 0.25, M.yellow, c.x0 + 8, 0.05, c.z1 - 2.8);                                                                               // floor markings
        C(0.14, 0.6, M.red, c.door + 3, 0.9, zD(0.25)); B(0.04, 1.2, 2, M.screen, c.x0 + 0.05, 2.4, 17);                                                                                                  // extinguisher, energy screen
      }
      if (id === 'quarters') {
        for (let i = 0; i < 3; i++) { const x = c.x0 + 3.5 + i * 6, z = c.z1 - 5.05; for (const e of [-0.3, 0.3]) B(0.06, 3.0, 0.06, M.metal, x + e, 1.5, z); for (let k = 0; k < 4; k++) B(0.6, 0.05, 0.05, M.metal, x, 0.55 + k * 0.6, z); B(0.04, 1.3, 2.0, [M.orange, M.teal, M.blue][i], x + 1.12, 3.25, c.z1 - 1.9); }   // ladders, privacy curtains
        for (let i = 0; i < 4; i++) { B(0.6, 2.4, 1.1, M.grey, c.x0 + 0.35, 1.2, 10 + i * 1.2); B(0.03, 0.4, 0.06, M.orange, c.x0 + 0.67, 1.3, 10.35 + i * 1.2); }                                         // lockers
        B(0.7, 0.08, 2.6, M.white, c.x1 - 0.4, 0.95, 12.5); B(0.04, 0.6, 0.9, M.screen, c.x1 - 0.1, 1.5, 12.5); C(0.3, 0.5, M.orange, c.x1 - 1.25, 0.25, 12.5, 0, 0, 14); C(0.14, 0.2, M.white, c.x1 - 0.4, 1.09, 13.5); S(0.22, M.green, c.x1 - 0.4, 1.4, 13.5);   // desk, stool, plant
        B(6, 0.02, 4, M.teal, c.cx, 0.045, 13.5);                                                                                                                                                         // rug
      }
      if (id === 'bathroom') {
        B(0.4, 0.9, 0.4, M.white, c.cx + 0.5, 0.45, c.z0 + 4.2); B(1.4, 0.2, 0.6, M.white, c.cx + 0.5, 1.0, c.z1 - 0.4); C(0.04, 0.35, M.metal, c.cx + 0.5, 1.28, c.z1 - 0.2); B(1.6, 0.08, 0.1, M.whiteG, c.cx + 0.5, 2.95, c.z1 - 0.15);   // basin under the mirror, light bar
        C(0.04, 0.5, M.metal, c.x0 + 2.4, 3.15, c.z1 - 2.4); C(0.25, 0.05, M.metal, c.x0 + 2.4, 2.9, c.z1 - 2.4, 0, 0, 14); B(1.6, 0.02, 1, M.blue, c.x0 + 2.4, 0.045, c.z1 - 4.4);                          // shower head, mat
        C(0.09, c.W - 1, M.tankW, c.cx, 0.35, c.z1 - 0.25, 0, PI2); C(0.09, ROOM_H - 0.4, M.tankW, c.x1 - 0.25, ROOM_H / 2, c.z1 - 0.25);                                                                  // used-water pipes to the recycler
        B(0.04, 0.04, 2.2, M.metal, c.x0 + 0.2, 1.5, 14); B(0.06, 0.8, 0.6, M.white, c.x0 + 0.22, 1.1, 13.4); B(0.06, 0.8, 0.6, M.orange, c.x0 + 0.22, 1.1, 14.6); B(0.4, 1.0, 1.4, M.white, c.x1 - 0.25, 1.9, 14);   // towels, cabinet
      }
      if (id === 'water') {
        const tz = c.z1 - 3, ux = c.cx + 2, uz = c.cz - 1;
        for (let i = 0; i < 2; i++) { const x = c.x0 + 3.4 + i * 5.2; B(0.12, 3.4, 0.06, M.cyan, x, 2.5, tz - 2.02); T(0.26, 0.05, M.orange, x + 0.9, 1.2, tz - 1.85); }                                   // sight glasses, valves
        C(0.12, 9, M.metal, c.x0 + 7.1, 5.1, tz, 0, PI2); C(0.12, tz - uz, M.metal, ux + 1.6, 5.1, (tz + uz) / 2, PI2); C(0.12, 2.9, M.metal, ux + 1.6, 3.65, uz);                                         // header and feed to the recycler
        for (let i = 0; i < 4; i++) { C(0.2, 0.8, M.glass, ux - 1.4 + i * 0.75, 2.6, uz, 0, 0, 12); C(0.15, 0.6, [M.water, M.tankW, M.straw, M.white][i], ux - 1.4 + i * 0.75, 2.52, uz); }                // filter cartridges
        B(0.9, 0.6, 0.6, M.dark, c.x0 + 0.5, 0.3, 12); C(0.25, 0.8, M.metal, c.x0 + 0.5, 0.75, 12, 0, PI2, 12); C(0.25, 0.4, M.yellow, c.cx - 1, 0.2, c.cz + 1, 0, 0, 12);                                   // pump, drip bucket
      }
      if (id === 'animal') {
        const px = c.x0 + 5, pz = c.cz + 2.5, tx = c.x1 - 3.6, tz = c.z0 + 7;
        B(5, 0.9, 0.6, M.white, c.x1 - 3.5, 0.45, c.z1 - 0.4); B(5.1, 0.06, 0.65, M.grey, c.x1 - 3.5, 0.93, c.z1 - 0.4); B(0.25, 0.08, 0.3, M.dark, c.x1 - 4.5, 1.0, c.z1 - 0.4); C(0.06, 0.45, M.dark, c.x1 - 4.5, 1.25, c.z1 - 0.35);   // lab bench, microscope
        for (let i = 0; i < 3; i++) C(0.1, 0.25, M.glass, c.x1 - 3 + i * 0.35, 1.09, c.z1 - 0.4); B(1.2, 0.7, 0.04, M.screen, c.x1 - 1.8, 1.75, c.z1 - 0.1);                                               // sample jars, health screen
        C(0.02, 2.6, M.dark, px, ROOM_H - 1.3, pz); C(0.45, 0.2, M.metal, px, ROOM_H - 2.7, pz, 0, 0, 14); C(0.3, 0.04, M.warm, px, ROOM_H - 2.82, pz, 0, 0, 14);                                           // heat lamp over the pen
        C(0.3, 0.3, M.metal, px - 1.6, 0.25, pz - 1.5, 0, 0, 12); C(0.18, 0.5, M.tankW, px + 1.8, 0.35, pz - 1.7);                                                                                        // feeder, water
        B(4.4, 0.2, 1.4, M.white, tx, 3.0, tz); for (const ex of [-2.1, 2.1]) for (const ez of [-0.9, 0.9]) B(0.07, 3, 0.07, M.metal, tx + ex, 1.5, tz + ez); for (let i = 0; i < 5; i++) S(0.3, i % 2 ? M.green : M.greenD, tx - 1.7 + i * 0.85, 3.3, tz);   // plants fed by the fish water
      }
      if (id === 'potato' || id === 'tomato') {
        const fz = c.cz; B(0.06, 1.7, 1.7, M.dark, c.x1 - 0.04, 4.2, fz); T(0.72, 0.07, M.metal, c.x1 - 0.12, 4.2, fz, 0, PI2); B(0.04, 1.3, 0.14, M.metal, c.x1 - 0.13, 4.2, fz); B(0.04, 0.14, 1.3, M.metal, c.x1 - 0.13, 4.2, fz);   // ventilation fan
        const nx = c.x1 - 0.95, nz = zD(0.95); C(0.6, 1.6, M.tankW, nx, 0.8, nz, 0, 0, 16); C(0.63, 0.1, M.white, nx, 1.65, nz, 0, 0, 16); C(0.05, 1.4, M.tankW, nx - 0.4, 2.4, nz); hard(nx, nz, 0.85);                                  // nutrient tank
      }
      R[id].props.add(g);
    }
  }

  _markers() {
    this.rings = {};
    const all = [...STATIONS, ...SITES.map((s) => ({ id: s.id, zone: 'top', pos: [s.pos[0] + 2, s.pos[1] + 16] }))];
    for (const s of all) {
      const parent = s.zone === 'top' ? this.top : this.deep, y = s.zone === 'top' ? this.heightAt(s.pos[0], s.pos[1]) + 0.14 : 0.08;
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.6, 36), new THREE.MeshBasicMaterial({ color: 0x49e6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(s.pos[0], y, s.pos[1]); parent.add(ring); this.rings[s.id] = ring;
    }
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); this.beacon.visible = false; this.scene.add(this.beacon);
    this.target = null;
  }
  _fx() {
    this.flash = new THREE.PointLight(0xfff0d0, 0, 300, 1.2); this.top.add(this.flash);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3)); this.debris = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xd8d4cc, size: 0.5, transparent: true, opacity: 0 })); this.debris.frustumCulled = false; this.top.add(this.debris); this.debrisV = [];
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)); this.sparkPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffd27a, size: 0.14, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); this.sparkPts.frustumCulled = false; this.scene.add(this.sparkPts);
    const sgeo = new THREE.CircleGeometry(0.3, 8); sgeo.rotateX(-Math.PI / 2); this.scuffs = new THREE.InstancedMesh(sgeo, new THREE.MeshBasicMaterial({ color: 0x4f4c49, transparent: true, opacity: 0.28, depthWrite: false }), 240); this.scuffs.frustumCulled = false; this.scuffI = 0;
    const far = new THREE.Matrix4().makeTranslation(0, -9999, 0); for (let i = 0; i < 240; i++) this.scuffs.setMatrixAt(i, far); this.top.add(this.scuffs);
    const trTex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(40,38,36,0.95)'; g.lineWidth = 7; g.lineCap = 'round'; for (const y of [10, 32, 54]) { g.beginPath(); g.moveTo(8, y + 9); g.lineTo(32, y - 9); g.lineTo(56, y + 9); g.stroke(); } });
    const tgeo = new THREE.PlaneGeometry(0.52, 0.62); tgeo.rotateX(-Math.PI / 2); this.tracks = new THREE.InstancedMesh(tgeo, new THREE.MeshBasicMaterial({ map: trTex, transparent: true, opacity: 0.5, depthWrite: false }), 900); this.tracks.frustumCulled = false; this.trackI = 0;
    const tfar = new THREE.Matrix4().makeTranslation(0, -9999, 0); for (let i = 0; i < 900; i++) this.tracks.setMatrixAt(i, tfar); this.top.add(this.tracks);
    const dn = 220, dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dn * 3).fill(-9999), 3)); this.dustPts = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xc9c5bd, size: 0.2, transparent: true, opacity: 0.85, depthWrite: false })); this.dustPts.frustumCulled = false; this.top.add(this.dustPts);
    this.dustV = Array.from({ length: dn }, () => [0, 0, 0, 0]); this.dustI = 0;
    this.sparkV = Array.from({ length: 60 }, () => [0, 0, 0, 0]); this.sparkAt = null; this.sparkLight = new THREE.PointLight(0xffc27a, 0, 14, 1.5); this.scene.add(this.sparkLight);
  }
  // world position (THREE.Vector3) of a point given in a zone's own coordinates
  at(zone, x, z, y = 0) { return new V3(x, (zone === 'top' ? this.heightAt(x, z) : TUBE.y) + y, z); }
  stationPos(id) { const s = STATIONS.find((q) => q.id === id) || (() => { const t = SITES.find((q) => q.id === id); return { zone: 'top', pos: [t.pos[0] + 2, t.pos[1] + 16] }; })(); return this.at(s.zone, s.pos[0], s.pos[1]); }
  // Where the orange guide beam stands: { zone, x, z, id }
  setTarget(t) { this.target = t; if (!t) { this.beacon.visible = false; return; } const p = this.at(t.zone, t.x, t.z); this.beacon.position.set(p.x, p.y + 30, p.z); }
  setZone(z) { this.zone = z; this.top.visible = z === 'top'; this.deep.visible = z === 'deep'; this.earth.visible = this.sunSprite.visible = z === 'top'; }
  // Press one tyre print into the dust at (x, z), pointing along yaw.
  track(x, z, yaw) { const m = (this._tm || (this._tm = new THREE.Matrix4())).makeRotationY(yaw); m.setPosition(x, this.heightAt(x, z) + 0.045, z); this.tracks.setMatrixAt(this.trackI++ % 900, m); this.tracks.instanceMatrix.needsUpdate = true; }
  // Kick up n grains of dust at (x, z). dx, dz = which way it is thrown; they fly as far as their speed takes them and drop straight back.
  puff(x, z, n = 6, dx = 0, dz = 0, up = 1.6, spread = 1.2) { const p = this.dustPts.geometry.attributes.position, y = this.heightAt(x, z) + 0.05;
    for (let k = 0; k < n; k++) { const i = this.dustI++ % this.dustV.length, v = this.dustV[i]; p.setXYZ(i, x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3); v[0] = dx + (Math.random() - 0.5) * spread; v[1] = up * (0.5 + Math.random()); v[2] = dz + (Math.random() - 0.5) * spread; v[3] = 1; } p.needsUpdate = true; }
  // drag marks in the dust (the Moon keeps every track: there is no wind to blow them away)
  scuff(x, z, yaw) { const m = new THREE.Matrix4().makeRotationY(yaw); m.scale(new V3(1.5, 1, 4.4)); m.setPosition(x, this.heightAt(x, z) + 0.06, z); this.scuffs.setMatrixAt(this.scuffI++ % 240, m); this.scuffs.instanceMatrix.needsUpdate = true; }
  // The deep zone has two kinds of floor: the open cave, and the station building that stands in it.
  indoors(x, z) { return x > AIRLOCK.x0 - 0.2 && x < HALL.x1 + 1 && Math.abs(z) < 25; }
  inCave(x, z) { return Math.abs(z) < 34 && x > -120 && x < 120 && !(x > AIRLOCK.x0 - 0.9 && x < HALL.x1 + 1.8 && Math.abs(z) < 25.8); }
  roomAt(x, z) { for (const r of this.walk) if (r.room && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.room; return null; }
  walkable(x, z) { for (const r of this.walk) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true; return this.inCave(x, z); }
  sparks(pos) { this.sparkAt = pos; if (!pos) { this.sparkPts.material.opacity = 0; this.sparkLight.intensity = 0; } }
  impactAt(x, z) {
    const y = this.heightAt(x, z); this.flash.position.set(x, y + 6, z); this.flash.intensity = 9000;
    const p = this.debris.geometry.attributes.position; this.debrisV = [];
    for (let i = 0; i < 240; i++) { p.setXYZ(i, x, y + 0.3, z); const a = Math.random() * 6.283, up = 4 + Math.random() * 16, out = 3 + Math.random() * 14; this.debrisV.push([Math.cos(a) * out, up, Math.sin(a) * out]); }
    p.needsUpdate = true; this.debris.material.opacity = 1; this.debrisT = 0;
  }

  // Called every frame. S = sim state (may be null). ctx = { player:{x,z}, zone, carOn, shipOn, shipFly }
  // ---------- guide mode: a yellow arrow line on the ground from the player to the next place ----------
  _guide() {
    const tex = canvasTex(64, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.lineCap = 'round'; g.lineJoin = 'round'; for (const y of [32, 96]) { g.strokeStyle = 'rgba(120,70,0,.55)'; g.lineWidth = 20; g.beginPath(); g.moveTo(10, y + 16); g.lineTo(32, y - 14); g.lineTo(54, y + 16); g.stroke(); g.strokeStyle = '#ffd21f'; g.lineWidth = 12; g.stroke(); } });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; this.guideTex = tex;
    const N = this.guideN = 220, geo = new THREE.BufferGeometry(), idx = [];
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(N * 2 * 2), 2));
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } geo.setIndex(idx); geo.setDrawRange(0, 0);
    this.guideLine = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.guideLine.frustumCulled = false; this.guideLine.renderOrder = 4; this.guideLine.visible = false; this.scene.add(this.guideLine); this.guideOn = true; this._guideT = 0;
  }
  // Corner points of the walk from (px,pz) to (tx,tz). Underground it leaves a room by its door, follows the hall, and enters the target room by its door.
  _guideRoute(px, pz, tx, tz) {
    const pts = [[px, pz]]; if (this.zone !== 'deep') return [...pts, [tx, tz]];
    const roomAt = (x, z) => ROOMS.find((r) => { const q = roomRect(r); return x > q.x0 - 0.4 && x < q.x1 + 0.4 && z > q.z0 - 0.4 && z < q.z1 + 0.4; });
    const ra = roomAt(px, pz), rb = roomAt(tx, tz), caveA = !this.indoors(px, pz), caveB = !this.indoors(tx, tz), gate = [AIRLOCK.x0 - 1.6, 0];
    if (!(ra && ra === rb) && !(caveA && caveB)) {
      if (ra) pts.push([ra.door, ra.side * 5.6], [ra.door, 0]); else if (caveA) pts.push(gate, [AIRLOCK.x0 + 1.5, 0]);
      if (rb) pts.push([rb.door, 0], [rb.door, rb.side * 5.6]); else if (caveB) pts.push([AIRLOCK.x0 + 1.5, 0], gate);
    }
    pts.push([tx, tz]); return pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.3);
  }
  _guideUpdate(dt, p) {
    const L = this.guideLine, T = this.target; if (!L) return;
    if (!(this.guideOn || this.guideForce) || !T || !p || T.zone !== this.zone) { L.visible = false; return; }
    this.guideTex.offset.y -= dt * 0.9; this._guideT -= dt; if (this._guideT > 0) return; this._guideT = 0.12;
    const top = this.zone === 'top', route = this._guideRoute(p.x, p.z, T.x, T.z), step = top ? 1.6 : 1.0, N = this.guideN, S = [];
    let skip = 1.4, budget = top ? 150 : 400;                         // start a little ahead of the feet; topside only draw the first 150 m
    for (let i = 0; i < route.length - 1 && S.length < N && budget > 0; i++) {
      const [ax, az] = route[i], [bx, bz] = route[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 1e-3) continue;
      let d = skip; if (d > len) { skip -= len; continue; } skip = 0;
      for (; d <= len && S.length < N && budget > 0; d += step, budget -= step) S.push([ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len]);
      if (S.length < N && budget > 0 && i === route.length - 2) S.push([bx, bz]);
    }
    if (S.length < 2) { L.visible = false; return; }
    const pos = L.geometry.attributes.position, uv = L.geometry.attributes.uv, hw = top ? 0.55 : 0.34; let run = 0;
    for (let i = 0; i < S.length; i++) {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) run += Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]);
      for (const s of [-1, 1]) { const x = S[i][0] + nx * hw * s, z = S[i][1] + nz * hw * s, y = top ? this.heightAt(x, z) + 0.16 : TUBE.y + (this.indoors(x, z) ? 0.07 : 0.2), k = i * 2 + (s > 0 ? 1 : 0); pos.setXYZ(k, x, y, z); uv.setXY(k, s > 0 ? 1 : 0, run / (top ? 2.6 : 1.7)); }
    }
    pos.needsUpdate = true; uv.needsUpdate = true; L.geometry.setDrawRange(0, (S.length - 1) * 6); L.visible = true;
  }
  update(dt, S, focus, ctx = {}) {
    this._guideUpdate(dt, ctx.player || focus);
    this.t += dt; const t = this.t, M = this.M;
    const sn = S ? S.flow.sun : { e: -0.5, u: 0.6, n: -0.1, factor: 1, up: true, elev: 37 };
    this.sunDir.set(sn.e, sn.u, -sn.n).normalize(); const topZ = this.zone === 'top', night = !sn.up;
    this.sky.position.copy(this.camera.position); this.earthMat.uniforms.sunDir.value.copy(this.sunDir);
    this.earth.quaternion.copy(this.earthBase).multiply(this.earthSpin.setFromAxisAngle(this.yUp, (S ? S.t / 24 : t / 60) * 6.283));
    this.sunSprite.position.copy(this.sunDir).multiplyScalar(2500); this.sunSprite.visible = topZ && sn.u > -0.03;
    const earthLit = (1 - this.sunDir.dot(EARTH_DIR)) / 2; this.earthLit = earthLit;
    this.sunLight.intensity = topZ ? 3.4 * sn.factor : 0; const f = focus || this.camera.position;
    this.sunLight.target.position.set(Math.round(f.x / 4) * 4, topZ ? f.y : 0, Math.round(f.z / 4) * 4);
    this.sunLight.position.copy(this.sunLight.target.position).addScaledVector(this.sunDir.clone().setY(Math.max(this.sunDir.y, 0.06)).normalize(), 300); this.sunLight.castShadow = topZ && sn.factor > 0.02;
    this.earthLight.intensity = topZ ? (night ? 0.25 + 1.25 * earthLit : 0.1) : 0; this.earthLight.target.position.copy(f); this.earthLight.position.copy(f).addScaledVector(EARTH_DIR, 200);
    this.hemi.intensity = topZ ? 0.3 + 0.6 * sn.factor : 0; this.starMat.color.setScalar(topZ ? (night ? 1 : 0.5) : 0.8);
    const dim = S && S.flow.eff < 1 ? 0.35 : 1;
    for (const L of this.lamps) L.l.intensity = L.top ? (topZ ? L.base * (night ? 1.5 : 0.25) : 0) : (topZ ? 0 : L.base * dim);
    const inside = !!ctx.inside; this.shell.visible = !topZ && !inside; this.deepHemi.intensity = topZ ? 0 : (inside ? 1.5 : 1.05) * (0.45 + 0.55 * dim); this.skyBounce.intensity = topZ ? 0 : 140 * sn.factor;
    if (!topZ) { const near = ctx.player && Math.hypot(ctx.player.x - AIRLOCK.x0, ctx.player.z) < 6; this.odOpen = (this.odOpen || 0) + ((near ? 1 : 0) - (this.odOpen || 0)) * Math.min(1, dt * 6); this.outerDoor.scale.y = Math.max(0.03, 1 - this.odOpen); this.outerDoor.position.y = 4.15 - 2.05 * this.outerDoor.scale.y; this.suitHook.visible = !!S && !S.suitOn; }
    // solar mounts
    const az = Math.atan2(this.sunDir.x, this.sunDir.z), el = Math.asin(clamp(this.sunDir.y, 0, 1)), dust = S ? S.dust : 0.1;
    this.mounts.forEach((m, i) => {
      const st = S ? S.mounts[i] : i < 8 ? 1 : 0; if (st !== m.state) { m.state = st; m.head.visible = st === 1; m.bad.visible = st === 2; m.cap.visible = st === 0; }
      if (st === 1) { if (!night) m.head.rotation.y = az; m.tilt.rotation.x = night ? 0 : Math.PI / 2 - el; m.mat.color.lerpColors(this.panelClean, this.panelDusty, clamp(dust * 1.25, 0, 1)); m.mat.emissiveIntensity = 0.25 * (1 - dust); }
    });
    const down = S && S.f.commsDown; this.dishHead.quaternion.slerp(down ? this.dishOff : this.dishAim, 0.04);
    this.dishLight.material.emissive.setHex(down ? 0xff3b30 : S && S.lv.comms === 0 ? 0x555555 : 0x4dff88); this.dishLight.material.emissiveIntensity = down ? 1.5 + Math.sin(t * 8) : 2;
    this.isruGlow.material.emissiveIntensity = S && S.flow.use.isru > 0 ? 2.4 + Math.sin(t * 5) * 0.5 : 0.05;
    this.heaterGlow.material.emissiveIntensity = S ? 0.3 + S.lv.heat * 0.9 * (S.f.heater ? 0.3 + 0.3 * Math.sin(t * 12) : 1) : 0.4;
    this.reactorBeacon.material.emissiveIntensity = 1.5 + Math.sin(t * 2.2) * 1.2; this.towerBeacon.material.emissiveIntensity = this.commBeacon.material.emissiveIntensity = Math.sin(t * 2.6) > 0.3 ? 3 : 0.3;
    if (S && S.wx && topZ) {   // the Water Plant at work
      const X = this.wxv, w = S.wx, b = w.batch, hot = b ? clamp((b.T + 150) / (b.mode === 'ilm' ? 1050 : 190), 0, 1) : 0, sub = b && b.mode === 'ice' && b.rate > 0.05;
      X.cans.forEach((c, i) => (c.visible = i < w.ice)); X.glowM.emissive.setHex(!b ? 0x331a08 : b.mode === 'ilm' ? 0xff3a10 : b.method === 'mw' ? 0xb070ff : b.method === 'solar' ? 0xfff0b0 : 0xff7a1a); X.glowM.emissiveIntensity = b ? 0.4 + 2.4 * hot + (sub ? 0.4 * Math.sin(t * 9) : 0) : 0.05;
      X.rods.visible = !!b && b.mode === 'ilm' && hot > 0.6; X.status.material.emissive.setHex(w.cond < 0.5 || w.seal < 0.9 ? 0xff3b30 : b ? 0xffa424 : 0x4dff88); X.status.material.emissiveIntensity = b ? 1.6 + Math.sin(t * 6) : 1.6;
      const fr = b ? clamp(b.got / Math.max(0.1, b.max), 0.02, 1) : 0.02; X.frost.scale.y += (fr - X.frost.scale.y) * Math.min(1, dt * 2); X.frost.position.y = 0.6 + 1.8 * X.frost.scale.y; X.frostM.emissiveIntensity = 0.2 + (sub ? 0.5 + 0.3 * Math.sin(t * 4) : 0);
      const vp = X.vapor.geometry.attributes.position; X.vapor.material.opacity += ((sub ? 0.85 : 0) - X.vapor.material.opacity) * Math.min(1, dt * 3);
      if (X.vapor.material.opacity > 0.02) { for (let i = 0; i < 36; i++) { const u = (X.vph[i] + t * 0.22) % 1; vp.setXYZ(i, 8.5 + Math.sin(i * 7.3 + t * 3) * 0.14, 3.9 + Math.cos(i * 5.1 + t * 2.3) * 0.14, 1.3 + u * 3.3); } vp.needsUpdate = true; }
      const sunOn = !!b && b.method === 'solar' && b.mode === 'ice'; if (sunOn || !X.aimed) { X.aimed = true; this.wxDir = (this.wxDir || new V3()).copy(this.sunDir).setY(Math.max(0.15, this.sunDir.y)).normalize(); X.mirror.quaternion.slerp((this.wxQ || (this.wxQ = new THREE.Quaternion())).setFromUnitVectors(this.yUp, this.wxDir), sunOn ? Math.min(1, dt * 1.5) : 1); }
      X.spot.material.emissiveIntensity = sunOn ? 2.5 * sn.factor : 0;
      const digging = (b && b.mode === 'ilm') || (S.flow.use.isru > 0); this.digT = (this.digT || 0) + (digging ? dt : 0); this.digger.rotation.y = -0.7 + Math.sin(this.digT * 0.6) * 0.7; this.digger.position.y = Math.abs(Math.sin(this.digT * 1.2)) * 0.05;
    }
    if (S && S.mine && topZ) {   // the mine: floodlights always on (this floor has no day), patches fade as they are dug out, canisters fill
      const near = ctx.player && Math.hypot(ctx.player.x - MINE.x, ctx.player.z - MINE.z) < MINE.r * 2.2; for (const l of this.mineLights) l.intensity = near ? 260 : 0;
      this.iceM.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2.2); S.mine.patches.forEach((p, i) => { const g = this.minePatches[i]; g.visible = p.left > 0; if (g.visible) g.scale.setScalar(0.55 + 0.45 * Math.min(1, p.left / 6)); });
      this.mineFill.visible = S.mine.hopper > 0; this.mineLed.material.emissive.setHex(S.mine.hopper > 0 ? 0xffa424 : 0x4dff88); this.mineBeam.material.opacity = 0.11 + 0.05 * Math.sin(t * 2);
      this.digLamp.intensity = ctx.digOn ? 60 : 0;
      const cp = this.mineCable.geometry.attributes.position; cp.setXYZ(0, this.mineMast.x, this.mineMast.y, this.mineMast.z); cp.setXYZ(1, this.dig.position.x, this.dig.position.y + 2.6, this.dig.position.z); cp.needsUpdate = true;
    }
    this.dig.visible = topZ;
    const hitK = this.baseHit ? 0.1 : 1; if (hitK !== this._hitK) { this._hitK = hitK; for (const b of this.baseGlow) b.m.emissiveIntensity = b.k * hitK; this.baseDamage.visible = !!this.baseHit; }
    if (S) {
      for (const p of this.pads) { const v = S[p.k], on = v.charging; p.ring.material.emissive.setHex(on ? 0x49e6ff : 0x2a5560); p.ring.material.emissiveIntensity = on ? 2 + Math.sin(t * 6) : 1; p.led.material.emissive.setHex(v.charge > 0.5 ? 0x4dff88 : v.charge > 0.2 ? 0xffa424 : 0xff3b30); }
      this.carLed.material.emissive.setHex(S.car.charge > 0.5 ? 0x4dff88 : S.car.charge > 0.2 ? 0xffa424 : 0xff3b30); this.shipLed.material.emissive.setHex(S.ship.charge > 0.5 ? 0x4dff88 : S.ship.charge > 0.2 ? 0xffa424 : 0xff3b30);
    }
    this.car.visible = this.ship.visible = topZ; this.carLamp.intensity = ctx.carOn && night ? 40 : 0; this.shipLamp.intensity = ctx.shipOn && night ? 50 : 0;
    for (const j of this.shipJets) { j.material.opacity = ctx.shipFly ? 0.55 + Math.random() * 0.3 : 0; j.scale.y = 0.8 + Math.random() * 0.5; }
    for (const s of SITES) { const o = this.sites[s.id], done = S && S.rescued.includes(s.id); o.beam.material.opacity = (done ? 0.05 : 0.14) + 0.05 * Math.sin(t * 2); o.b.material.emissiveIntensity = 1.5 + Math.sin(t * 4) * 1.2; }
    // ---- the station
    if (S && !topZ) {
      const px = ctx.player ? ctx.player.x : 0, pz = ctx.player ? ctx.player.z : 0;
      for (const id in this.rooms) {
        const R = this.rooms[id], r = S.rooms[id], d = R.def, wreck = r.built < 1, near = Math.hypot(px - d.door, pz - d.side * 4.5) < 4.6;
        R.wall.color.copy(this.wallTint).lerp(this.iceTint || (this.iceTint = new THREE.Color(0x7f9fc4)), r.frozen ? 0.65 : clamp(1 - r.p / K.AIR_KPA, 0, 1) * 0.35);
        R.light.emissive.setHex(r.hole > 0 ? 0xff3b30 : 0xffffff); R.light.emissiveIntensity = (r.hole > 0 ? 1.2 + Math.sin(t * 9) : wreck ? 0.12 : 1.6) * (0.4 + 0.6 * dim);
        const n = R.props.children.length, show = wreck ? Math.floor(n * clamp((r.built - 0.3) / 0.7, 0, 1) * 0.85) : n; for (let i = 0; i < n; i++) R.props.children[i].visible = i < show;
        R.debris.visible = wreck; R.debris.scale.setScalar(wreck ? clamp(1.3 - r.built, 0.3, 1) : 1); R.hole.visible = r.hole > 0; R.jet.visible = r.hole > 0 && r.p > 4; R.jet.material.opacity = 0.12 + 0.3 * (r.p / K.AIR_KPA) * (0.6 + 0.4 * Math.sin(t * 30));
        R.open += ((r.door || near ? 1 : 0) - R.open) * Math.min(1, dt * 6); R.door.scale.y = Math.max(0.03, 1 - R.open); R.door.position.y = 4.15 - 2.05 * R.door.scale.y; R.swLed.material.emissive.setHex(r.door ? 0x4dff88 : 0xff3b30);
      }
      const b = S.battery / S.flow.cap; this.battBars.forEach((bar, i) => { bar.scale.y = b > i / 4 - 0.02 ? clamp((b - i / 4) * 4, 0.12, 1) : 0.08; bar.material.emissive.setHex(b < 0.15 ? 0xff3b30 : b < 0.35 ? 0xffa424 : 0x4dff88); });
      this.modSlots.forEach((m, i) => { if (m.visible) m.visible = i < S.mods; });
      const o = S.o2 / S.o2Cap; this.o2Tanks.forEach((tk, i) => tk.material.emissive.setRGB(0, 0.3 * clamp(o * 3 - i, 0, 1), 0.12 * clamp(o * 3 - i, 0, 1))); this.o2Glow.material.emissive.setHex(S.flow.o2Elec > 0 ? 0x49e6ff : 0x333333);
      const w = S.water / S.waterCap; this.waterTanks.forEach((tk) => tk.material.emissive.setRGB(0, 0.1 * w, 0.35 * w)); this.waterGlow.material.emissive.setHex(S.f.leakWater ? 0xff3b30 : 0x49e6ff);
      const lit = S.lv.farm * S.flow.eff; M.pink.emissiveIntensity = 0.25 + 0.6 * lit; this.farmLights[0].intensity = S.rooms.potato.built >= 1 ? 6 + 6 * lit : 0; this.farmLights[1].intensity = S.rooms.tomato.built >= 1 ? 6 + 6 * lit : 0;
      for (const v of this.rackViews) {
        const rs = S.racks.filter((q) => q.room === v.room), r = v.soil ? rs.find((q) => q.soil) : rs.filter((q) => !q.soil)[v.b]; v.g.visible = v.g.visible && !!r; if (!r) continue;
        if ((r.kind || null) !== v.kind) this._replant(v, r.kind || null);
        v.lamp.emissiveIntensity = r.kind ? 0.25 + 0.6 * lit : 0.04; v.led.emissive.setHex(r.ripe ? 0x4dff88 : r.hp < 0.5 ? 0xff3b30 : 0x224433); v.led.emissiveIntensity = r.ripe ? 1.5 + Math.sin(t * 5) : 1;
        if (!r.kind) continue;
        const e = 1 - Math.pow(1 - clamp(r.g, 0, 1), 2), want = 0.14 + 0.86 * e; v.cur += (want - v.cur) * Math.min(1, dt * (want < v.cur ? 6 : 1.5));            // grows smoothly; drops fast when picked
        v.leaf.color.copy(v.base).lerp(this._brown || (this._brown = new THREE.Color(0x8a7438)), clamp(1 - r.hp, 0, 1) * 0.85); if (v.kind === 'wheat') v.leaf.color.lerp(this._gold || (this._gold = new THREE.Color(0xd9b84a)), clamp((r.g - 0.6) * 2.2, 0, 1) * r.hp);
        const fk = clamp((r.g - 0.55) / 0.45, 0, 1), droop = clamp((0.6 - r.hp) * 0.8, 0, 0.4);
        for (const q of v.list) { const sw = Math.sin(t * 0.9 + q.ph); q.p.scale.setScalar(v.cur * q.s * (1 + 0.025 * Math.sin(t * 1.7 + q.ph * 2))); q.p.rotation.z = sw * 0.045 + droop; q.p.rotation.x = Math.cos(t * 0.7 + q.ph) * 0.03;
          for (const f of q.p.userData.fr) { f.visible = fk > 0.02; if (f.visible) { const b0 = f.userData.s0 || (f.userData.s0 = f.scale.clone()); f.scale.copy(b0).multiplyScalar(0.25 + 0.75 * fk); } } }
      }
      for (const id in this.expViews) { const x = S.exp, v = this.expViews[id], on = !!x && x.room === id; v.g.visible = v.g.visible && on; if (on) v.pots.forEach((p, i) => p.scale.setScalar(0.08 + x.g * [1, 0.7, 0.38][i] * 1.25)); }
      const ok = S.rooms.animal.built >= 1 && !S.rooms.animal.frozen && S.rooms.animal.p > 55; this.henPod.visible = this.henPod.visible && !ok;
      this.hens.forEach((h, i) => { if (!h.g.visible) return; h.g.visible = ok && i < S.hens; h.a += dt * h.sp * (S.feed > 0 ? 1 : 0.3); h.g.position.set(this.henPos.x + Math.cos(h.a) * h.r, 0.42 + Math.abs(Math.sin(t * 5 + i)) * 0.06, this.henPos.z + Math.sin(h.a) * h.r * 0.8); h.g.rotation.y = -h.a; h.g.rotation.x = Math.sin(t * 3 + i * 2) > 0.8 ? 0.6 : 0; });
      this.sacks.forEach((s, i) => { if (s.visible) s.visible = S.feed > i * 1.1; }); this.fishes.forEach((fi) => { if (fi.m.visible) { fi.m.visible = S.fish; fi.m.position.set(fi.tx + Math.sin(t * 0.6 + fi.ph) * 1.7, 1.5 + Math.sin(t * 0.9 + fi.ph * 2) * 0.45, fi.tz + Math.cos(t * 0.5 + fi.ph) * 0.6); fi.m.rotation.y = Math.cos(t * 0.6 + fi.ph) > 0 ? 0 : Math.PI; } });
      this.canStacks.forEach((c, i) => { if (c.visible) c.visible = S.cans > i * 2; }); this.stove.material.emissiveIntensity = ctx.cooking ? 2.5 : 0.15;
      const busy = S.bench.some((b2) => b2 && b2.left > 0) || !!S.fab;
      this.benchSlots.forEach((sl, i) => { const b2 = S.bench[i]; sl.g.visible = sl.g.visible && !!b2; sl.a.visible = !!b2 && b2.left > 0; sl.b.visible = !!b2 && b2.left <= 0; });
      if (busy) { this.armA.rotation.z = Math.sin(t * 1.7) * 0.5; this.armA.rotation.y = Math.sin(t * 0.8) * 1.2; this.armB.rotation.z = -0.9 + Math.sin(t * 2.3) * 0.5; this.armTip.material.emissiveIntensity = 2 + Math.sin(t * 20) * 2; } else this.armTip.material.emissiveIntensity = 0.6;
      this.fabPart.visible = this.fabPart.visible && !!S.fab; if (S.fab) { this.fabHead.position.x = FAB[0] + Math.sin(t * 2.4) * 3.6; const k = 1 - S.fab.left / S.fab.total; this.fabPart.scale.set(0.2 + 0.8 * k, 1, 1); }
    }
    this.beam.material.opacity = 0.6 * sn.factor;   // no sun, no patch: the lunar night lasts two weeks
    // markers
    const pulse = 0.4 + 0.25 * Math.sin(t * 3), tid = this.target && this.target.id;
    for (const id in this.rings) { const r = this.rings[id]; r.material.opacity = id === tid ? 0.95 : pulse; r.material.color.setHex(id === tid ? 0xffb347 : 0x49e6ff); r.scale.setScalar(id === tid ? 1.5 + 0.2 * Math.sin(t * 5) : 1); }
    if (this.target) { this.beacon.visible = this.target.zone === this.zone; this.beacon.material.opacity = 0.09 + 0.04 * Math.sin(t * 3); }
    // effects
    if (this.flash.intensity > 1) this.flash.intensity *= Math.pow(0.02, dt);
    if (this.debris.material.opacity > 0.01) { this.debrisT += dt; const p = this.debris.geometry.attributes.position; for (let i = 0; i < this.debrisV.length; i++) { const v = this.debrisV[i]; v[1] -= K.GRAVITY * dt; p.setXYZ(i, p.getX(i) + v[0] * dt, Math.max(p.getY(i) + v[1] * dt, -200), p.getZ(i) + v[2] * dt); } p.needsUpdate = true; this.debris.material.opacity = clamp(1 - this.debrisT / 14, 0, 1); }
    if (this.zone === 'top') { const p = this.dustPts.geometry.attributes.position; let any = false;
      for (let i = 0; i < this.dustV.length; i++) { const v = this.dustV[i]; if (!v[3]) continue; any = true; v[1] -= K.GRAVITY * dt; const x = p.getX(i) + v[0] * dt, y = p.getY(i) + v[1] * dt, z = p.getZ(i) + v[2] * dt; if (v[1] < 0 && y <= this.heightAt(x, z) + 0.03) { v[3] = 0; p.setXYZ(i, 0, -9999, 0); } else p.setXYZ(i, x, y, z); }
      if (any) p.needsUpdate = true; }
    if (this.sparkAt) {
      const p = this.sparkPts.geometry.attributes.position, a = this.sparkAt;
      for (let i = 0; i < 60; i++) { const v = this.sparkV[i]; v[3] -= dt; if (v[3] <= 0) { p.setXYZ(i, a.x + (Math.random() - 0.5) * 0.6, a.y + 0.8 + Math.random() * 0.8, a.z + (Math.random() - 0.5) * 0.6); v[0] = (Math.random() - 0.5) * 3; v[1] = 1 + Math.random() * 3; v[2] = (Math.random() - 0.5) * 3; v[3] = 0.25 + Math.random() * 0.5; } else { v[1] -= 4 * dt; p.setXYZ(i, p.getX(i) + v[0] * dt, p.getY(i) + v[1] * dt, p.getZ(i) + v[2] * dt); } }
      p.needsUpdate = true; this.sparkPts.material.opacity = 0.95; this.sparkLight.position.set(a.x, a.y + 1.2, a.z); this.sparkLight.intensity = 3 + Math.random() * 5;
    }
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
