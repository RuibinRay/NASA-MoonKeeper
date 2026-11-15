// MOONKEEPER — Mars: the 3D world. The ground, the sky, the dust, the real skyline, and the first outpost.
// Built once, the first time Mars is opened, and shown in place of the Moon's surface. It uses the same renderer,
// camera, Sun light and rover as the Moon, so everything that moves works the same way on both worlds.
import * as THREE from '../../lib/three.module.min.js';
import { SKYLINE } from './mola.js';
import { MARS, marsSun, earthElongation } from './sim.js';
import * as T from './terrain.js';

const V3 = THREE.Vector3, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const lin = (r, g, b) => [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];   // colours are written as seen on screen, stored as light
const std = (o) => new THREE.MeshStandardMaterial(o);

const NOISE = `
float mhash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
vec2 mhash2(vec2 p){ return vec2(mhash(p), mhash(p+17.17)); }
float mnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mhash(i),mhash(i+vec2(1.0,0.0)),f.x), mix(mhash(i+vec2(0.0,1.0)),mhash(i+vec2(1.0,1.0)),f.x), f.y); }`;
// Ground detail drawn by the graphics card: grain, pebbles, the cracked "polygon" pattern of ice-rich ground, and
// layers of rock showing on steep faces. None of it changes where you can walk.
const GROUND_COLOR = `
{ float dC = length(vWp - cameraPosition), nearK = 1.0 - smoothstep(40.0, 220.0, dC), fineK = 1.0 - smoothstep(7.0, 42.0, dC);
  // soft patches where dust has drifted, and gritty grain close up
  float g2 = mnoise(vWp.xz*0.21+7.0), g3 = mnoise(vWp.xz*1.3);
  diffuseColor.rgb *= 1.0 + (g2-0.5)*0.11 + (g3-0.5)*0.09*nearK;
  // dust-devil tracks: dark, winding lines where a whirlwind has lifted the pale dust off the darker soil beneath
  { float trk = 0.0; for (int k=0;k<3;k++) { float fk = float(k), a = 0.7 + fk*1.9; vec2 n = vec2(cos(a), sin(a)), td = vec2(-n.y, n.x); float u = dot(vWp.xz, td), v = dot(vWp.xz, n) + 26.0*sin(u*0.011 + fk*2.1) + 9.0*sin(u*0.037 + fk), cw = 310.0 + 90.0*fk, lane = floor((v + cw*0.5)/cw), d = abs(v - lane*cw), wd = 1.6 + 1.8*mnoise(vec2(u*0.02, fk*7.0));
      trk = max(trk, (1.0 - smoothstep(wd, wd + 1.8, d)) * step(0.38, mnoise(vec2(lane*3.7 + fk*11.0, u*0.0025)))); }
    diffuseColor.rgb *= 1.0 - 0.2*trk*smoothstep(0.2, 0.5, vPoly); }
  float grain = mnoise(vWp.xz*9.0)*0.5 + mnoise(vWp.xz*27.0)*0.3 + mnoise(vWp.xz*71.0)*0.2;
  diffuseColor.rgb *= 1.0 + (grain-0.5)*0.36*fineK;
  // pebbles: small round stones lying in the soil
  if (fineK > 0.01) { vec2 pp = vWp.xz/0.42, pi = floor(pp), pf = fract(pp); float peb = 0.0;
    for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++) { vec2 o = vec2(float(i),float(j)); vec2 hh = mhash2(pi+o); float rad = (0.05 + 0.11*hh.x*hh.x) * step(0.5, mhash(pi+o+3.7));
      vec2 r = o + 0.2 + 0.6*mhash2(pi+o+9.1) - pf; peb = max(peb, 1.0 - smoothstep(rad*0.75, rad, length(r))); }
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.74,0.74,0.77), peb*fineK); }
  // cracked "polygon" ground: troughs a few metres apart, where ice just under the soil has shrunk and swelled
  vec2 pc = vWp.xz/6.0, ip = floor(pc), fp = fract(pc); float d1 = 8.0, d2 = 8.0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++) { vec2 o = vec2(float(i),float(j)); vec2 r = o + mhash2(ip+o) - fp; float d = dot(r,r); if (d<d1) { d2=d1; d1=d; } else if (d<d2) { d2=d; } }
  float edge = sqrt(d2)-sqrt(d1), pk = (1.0 - smoothstep(70.0,300.0,dC)) * vPoly;
  float trough = 1.0 - smoothstep(0.03,0.2,edge), shoulder = smoothstep(0.2,0.3,edge)*(1.0 - smoothstep(0.3,0.55,edge));
  diffuseColor.rgb *= 1.0 - 0.5*trough*pk + 0.1*shoulder*pk;
  // layers of rock showing on steep faces
  float steep = 1.0 - smoothstep(0.90,0.985,vWn.y), band = step(0.5, fract(vWp.y*0.85 + 0.6*mnoise(vWp.xz*0.06)));
  diffuseColor.rgb *= mix(1.0, mix(0.66,1.14,band), steep); }`;
const GROUND_NORMAL = `
{ float dN = length(vWp - cameraPosition), fN = 1.0 - smoothstep(50.0, 200.0, dN);
  if (fN > 0.001) { vec2 q = vWp.xz*1.9; float e = 0.6, n0 = mnoise(q), nx = mnoise(q+vec2(e,0.0)), nz = mnoise(q+vec2(0.0,e));
    vec2 q2 = vWp.xz*7.0; float m0 = mnoise(q2), mx = mnoise(q2+vec2(e,0.0)), mz = mnoise(q2+vec2(0.0,e));
    vec3 gw = vec3((n0-nx)*0.6 + (m0-mx)*0.45, 0.0, (n0-nz)*0.6 + (m0-mz)*0.45) * fN;
    normal = normalize(normal + (viewMatrix * vec4(gw, 0.0)).xyz); } }`;

export class MarsWorld {
  constructor(world) {
    this.w = world; this.group = new THREE.Group(); this.group.name = 'mars'; this.t = 0; this.sunDir = new V3(0.3, 0.8, 0.2); this.colliders = T.colliders();
    this.lamps = {}; this.spin = []; this.windows = []; this.panels = []; this.night = 0;
    T.buildGrid(); this._mats(); this._ground(); this._rocks(); this._sky(); this._skyline(); this._dust(); this._station(); this._marks(); this._places(); this._moons(); this._interior();
  }
  heightAt(x, z) { return this.inside ? T.ROOM.y : T.heightAt(x, z); }   // indoors, the floor of the room is the ground
  // Corner points of the yellow guide line: round the buildings, with more room when you are in the rover.
  // Indoors it goes round the table and the consoles instead.
  route(px, pz, tx, tz) { const R = this._route, key = `${Math.round(px / 1.5)},${Math.round(pz / 1.5)},${Math.round(tx)},${Math.round(tz)},${this.carOn ? 1 : 0},${this.inside ? 1 : 0}`; if (R && R.key === key) { R.pts[0] = [px, pz]; return R.pts; } const pts = T.routeAround(this.inside ? this.roomColliders : this.colliders, px, pz, tx, tz, this.carOn ? 2.4 : this.inside ? 0.6 : 1.1); this._route = { key, pts }; return pts; }

  _mats() {
    const M = (this.M = {});
    M.ground = std({ vertexColors: true, roughness: 0.96, metalness: 0 });
    M.ground.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPoly; varying vec3 vWp; varying vec3 vWn; varying float vPoly;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = position; vWn = normal; vPoly = aPoly;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn; varying float vPoly;' + NOISE).replace('#include <color_fragment>', '#include <color_fragment>' + GROUND_COLOR).replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + GROUND_NORMAL);
    };
    const c = (r, g, b) => new THREE.Color().setRGB(...lin(r, g, b));
    M.white = std({ color: c(0.86, 0.82, 0.76), roughness: 0.78 }); M.cream = std({ color: c(0.78, 0.7, 0.6), roughness: 0.85 }); M.grey = std({ color: c(0.5, 0.49, 0.48), roughness: 0.6, metalness: 0.45 });
    M.dark = std({ color: c(0.17, 0.16, 0.16), roughness: 0.7, metalness: 0.3 }); M.orange = std({ color: c(0.86, 0.42, 0.16), roughness: 0.6 }); M.foil = std({ color: c(0.83, 0.62, 0.22), roughness: 0.3, metalness: 0.9 });
    M.steel = std({ color: c(0.72, 0.72, 0.74), roughness: 0.32, metalness: 0.85 }); M.soil = std({ color: c(0.52, 0.3, 0.19), roughness: 1 }); M.red = std({ color: c(0.72, 0.2, 0.14), roughness: 0.6 }); M.blue = std({ color: c(0.2, 0.42, 0.7), roughness: 0.6 });
    M.tank = std({ color: c(0.8, 0.86, 0.9), roughness: 0.4, metalness: 0.5 }); M.pad = std({ color: c(0.2, 0.19, 0.185), roughness: 0.95 }); M.green = std({ color: c(0.24, 0.55, 0.22), roughness: 0.9 });
    M.back = std({ color: c(0.8, 0.76, 0.7), roughness: 0.7, emissive: c(0.3, 0.2, 0.14), emissiveIntensity: 0.35 }); M.solar = std({ color: c(0.07, 0.11, 0.26), roughness: 0.32, metalness: 0.55 }); this.solarClean = M.solar.color.clone(); this.solarDusty = c(0.5, 0.33, 0.24);
    M.film = std({ color: c(0.86, 0.93, 0.88), roughness: 0.25, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    M.window = std({ color: 0x0c0c0c, emissive: c(1, 0.82, 0.5), emissiveIntensity: 0.25, roughness: 0.3 }); this.windows.push(M.window);
    M.grow = std({ color: 0x110811, emissive: c(1, 0.36, 0.8), emissiveIntensity: 1.4 }); M.hot = std({ color: 0x100804, emissive: c(1, 0.42, 0.1), emissiveIntensity: 1.6 }); M.ice = std({ color: c(0.84, 0.9, 0.96), roughness: 0.35 });
    M.cross = std({ color: 0x06140a, emissive: c(0.2, 1, 0.45), emissiveIntensity: 1.2 });
  }
  box(w, h, d, m) { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.castShadow = k.receiveShadow = true; return k; }
  cyl(rt, rb, h, m, seg = 16, open = false) { const k = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m); k.castShadow = k.receiveShadow = true; return k; }
  sph(r, m, ws = 16, hs = 12) { const k = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m); k.castShadow = true; return k; }
  put(parent, mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; }
  at(x, z) { const g = new THREE.Group(); g.position.set(x, T.heightAt(x, z), z); this.group.add(g); return g; }

  // ---------- the ground: a fine mesh where you play, a coarse one out to the haze ----------
  _colour(x, z, h, slope) {
    const n1 = 0.5 + 0.5 * T.fbm(x / 90, z / 90, 3), n2 = clamp((T.fbm(x / 40 + 9, z / 40, 3) - 0.15) / 0.45, 0, 1) * 0.4;
    let r = lerp(0.56, 0.69, n1), g = lerp(0.41, 0.54, n1), b = lerp(0.3, 0.41, n1); r = lerp(r, 0.4, n2); g = lerp(g, 0.28, n2); b = lerp(b, 0.21, n2);
    const dm = T.duneMask(x, z) * 0.75; r = lerp(r, 0.34, dm); g = lerp(g, 0.215, dm); b = lerp(b, 0.175, dm);
    for (const c of T.CRATERS) { const q = Math.hypot(x - c.x, z - c.z) / c.r; if (q > 2.3) continue;
      if (c === T.ICE_CRATER && q < 0.62) { const k = clamp((0.62 - q) / 0.2, 0, 1) * (0.7 + 0.3 * T.fbm(x / 3, z / 3, 2)); r = lerp(r, 0.86, k); g = lerp(g, 0.91, k); b = lerp(b, 0.96, k); }
      else if (q > 0.9) { const k = Math.exp(-(q - 1) * 2.4) * 0.16; r += k; g += k * 0.8; b += k * 0.6; } else { r *= 0.86; g *= 0.86; b *= 0.86; } }
    const dp = Math.hypot(x - T.PAD.x, z - T.PAD.z); if (dp < T.PAD.r + 3) { const k = clamp((T.PAD.r + 3 - dp) / 3, 0, 1) * 0.8; r = lerp(r, 0.2, k); g = lerp(g, 0.19, k); b = lerp(b, 0.185, k); }
    { const sk = T.streak(x, z) * 0.1; r += sk; g += sk * 0.9; b += sk * 0.75; }   // pale dust in the lee of young craters
    const st = 1 - clamp((Math.hypot(x - 8, z - 4) - 80) / 30, 0, 1); r *= 1 - 0.08 * st; g *= 1 - 0.07 * st; b *= 1 - 0.05 * st;   // ground packed down by work around the base
    void h; void slope; return lin(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
  }
  _mesh(n, size, heightFn, drop) {
    const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3), poly = new Float32Array(n * n), idx = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i / (n - 1) - 0.5) * size, z = (j / (n - 1) - 0.5) * size, h = heightFn(x, z) - drop(x, z), k = j * n + i;
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; const c = this._colour(x, z, h, 0); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
      poly[k] = (1 - T.duneMask(x, z)) * (0.55 + 0.45 * clamp(0.5 + T.fbm(x / 120 + 3, z / 120, 2), 0, 1)) * (Math.hypot(x - T.PAD.x, z - T.PAD.z) < T.PAD.r ? 0 : 1) * (0.15 + 0.85 * Math.min(clamp((Math.hypot(x - 8, z - 4) - 92) / 40, 0, 1), clamp((Math.hypot(x - 10, z - 104) - 58) / 30, 0, 1))); }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aPoly', new THREE.BufferAttribute(poly, 1)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, this.M.ground); m.receiveShadow = true; return m;
  }
  _ground() {
    const near = this._mesh(T.GRID.n, T.GRID.size, (x, z) => T.heightAt(x, z), () => 0); near.castShadow = false; this.group.add(near);
    // out to the haze: the same recipe at one height every 90 m, sunk a little where the fine mesh covers it
    const far = this._mesh(121, 10800, (x, z) => T.rawHeight(x, z), (x, z) => 3.2 * (1 - clamp((Math.max(Math.abs(x), Math.abs(z)) - 700) / 190, 0, 1))); far.position.y = -0.05; this.group.add(far);
    // a short wall under the fine mesh's edge, so no sky shows through the step down to the coarse one
    const e = T.GRID.size / 2, wall = new THREE.Mesh(new THREE.BoxGeometry(T.GRID.size, 8, T.GRID.size), std({ color: new THREE.Color().setRGB(...lin(0.5, 0.3, 0.2)), roughness: 1, side: THREE.BackSide })); wall.position.y = -9.5; wall.scale.set(1.0005, 1, 1.0005); void e; this.group.add(wall);
    // tyre prints and kicked-up dust
    this.tracks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...lin(0.3, 0.17, 0.12)), transparent: true, opacity: 0.55, depthWrite: false }), 900);
    this.tracks.count = 900; const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 900; i++) this.tracks.setMatrixAt(i, zero); this.tracks.frustumCulled = false; this.trackI = 0; this.group.add(this.tracks);
    const N = 320, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-999), 3));
    this.puffs = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color().setRGB(...lin(0.78, 0.52, 0.36)), size: 0.5, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true })); this.puffs.frustumCulled = false; this.puffV = Array.from({ length: N }, () => [0, 0, 0, 0]); this.puffI = 0; this.group.add(this.puffs);
  }
  track(x, z, yaw) { const m = (this._tm || (this._tm = new THREE.Matrix4())).makeRotationY(yaw); m.setPosition(x, T.heightAt(x, z) + 0.05, z); this.tracks.setMatrixAt(this.trackI++ % 900, m); this.tracks.instanceMatrix.needsUpdate = true; }
  puff(x, z, n = 6, dx = 0, dz = 0, up = 1.6, spread = 1.2) { const p = this.puffs.geometry.attributes.position, y = T.heightAt(x, z) + 0.1;
    for (let k = 0; k < n; k++) { const i = this.puffI++ % this.puffV.length; p.setXYZ(i, x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6); const v = this.puffV[i]; v[0] = dx + (Math.random() - 0.5) * spread; v[1] = up * (0.4 + Math.random() * 0.6); v[2] = dz + (Math.random() - 0.5) * spread; v[3] = 1.2 + Math.random() * 1.2; } p.needsUpdate = true; }

  _rocks() {
    const field = T.rockField(), geos = [0, 1, 2].map((k) => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const s = 0.74 + 0.46 * Math.abs((Math.sin(p.getX(i) * 12.9898 + p.getY(i) * 78.233 + p.getZ(i) * 37.719 + k * 5.1) * 43758.5453) % 1); p.setXYZ(i, p.getX(i) * s * (k === 1 ? 1.35 : 1), p.getY(i) * s * (k === 2 ? 0.55 : 0.8), p.getZ(i) * s); } g.computeVertexNormals(); return g; });
    const mat = std({ color: 0xffffff, roughness: 0.95, flatShading: true }), m4 = new THREE.Matrix4(),
      dustTop = '#include <normal_fragment_maps>\n{ vec3 wn = inverseTransformDirection(normal, viewMatrix); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.37, 0.215, 0.13), 0.72 * smoothstep(0.35, 0.85, wn.y)); }', q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', dustTop); };
    for (const big of [true, false]) for (let k = 0; k < 3; k++) { const list = field.filter((r) => r.kind === k && r.s > 0.45 === big); if (!list.length) continue; const im = new THREE.InstancedMesh(geos[k], mat, list.length); im.castShadow = big; im.receiveShadow = true;
      list.forEach((r, i) => { e.set(r.tip, r.rot, r.tip * 0.6); q.setFromEuler(e); m4.compose(new V3(r.x, T.heightAt(r.x, r.z) + r.s * 0.18, r.z), q, new V3(r.s, r.s, r.s)); im.setMatrixAt(i, m4); const t = 0.5 + 0.5 * Math.sin(r.rot * 7); col.setRGB(...lin(lerp(0.3, 0.5, t), lerp(0.25, 0.39, t), lerp(0.22, 0.32, t))); im.setColorAt(i, col); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; this.group.add(im); }
  }

  // ---------- the sky: butterscotch by day, blue around the setting Sun, stars at night ----------
  _sky() {
    this.skyU = { uSun: { value: new V3(0, 1, 0) }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uWide: { value: 0.2 }, uTight: { value: 1 }, uCloud: { value: 0 }, uCloudCol: { value: new THREE.Color(1, 1, 1) }, uDrift: { value: new THREE.Vector2() } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; }',
      fragmentShader: NOISE + `varying vec3 vDir; uniform vec3 uSun, uZen, uHor, uGlow, uCloudCol; uniform float uWide, uTight, uCloud; uniform vec2 uDrift;
        void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 col = mix(uHor, uZen, pow(h, 0.42));
          float c = max(dot(d, uSun), 0.0); float glow = pow(c, 6.0)*uWide + pow(c, 60.0)*uTight*0.6 + pow(c, 900.0)*uTight*2.0;
          col = mix(col, uGlow, clamp(glow, 0.0, 1.0));
          if (uCloud > 0.01 && d.y > 0.03) { vec2 p = d.xz / (d.y + 0.22) * 1.25 + uDrift; float w = mnoise(p*vec2(0.55, 1.5))*0.55 + mnoise(p*vec2(1.7, 4.2) + 3.1)*0.3 + mnoise(p*6.0)*0.15; col = mix(col, uCloudCol, uCloud * smoothstep(0.52, 0.8, w) * smoothstep(0.03, 0.26, d.y) * 0.55); }   // thin, streaky ice clouds, high up
          col = mix(col, vec3(1.0, 0.97, 0.9), smoothstep(0.99996, 0.99998, c) * uTight);   // the Sun's disc: about two-thirds the size it looks from Earth
          col = mix(col, uHor, smoothstep(0.0, -0.06, d.y));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }` });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(6400, 40, 20), mat); this.sky.renderOrder = -30; this.sky.frustumCulled = false; this.group.add(this.sky);
    const n = 900, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); sp[i * 3] = Math.cos(a) * r * 6000; sp[i * 3 + 1] = Math.abs(u) * 6000 + 60; sp[i * 3 + 2] = Math.sin(a) * r * 6000; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat); this.stars.renderOrder = -29; this.stars.frustumCulled = false; this.group.add(this.stars);
  }
  // The hills on the horizon are the real ones: their outline comes from NASA's MOLA elevation data, as seen from here.
  _skyline() {
    const n = SKYLINE.n, R = 5600, pos = new Float32Array((n + 1) * 2 * 3), haze = new Float32Array((n + 1) * 2), idx = [];
    for (let i = 0; i <= n; i++) { const a = ((i % n) / n) * 2 * Math.PI, deg = SKYLINE.deg100[i % n] / 100, km = SKYLINE.km[i % n], x = Math.sin(a) * R, z = -Math.cos(a) * R, top = Math.tan((Math.max(deg, -0.2) * Math.PI) / 180) * R;
      pos.set([x, -120, z, x, top, z], i * 6); const hz = clamp(0.3 + km / 110, 0, 0.92); haze[i * 2] = Math.min(1, hz + 0.25); haze[i * 2 + 1] = hz; if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aHaze', new THREE.BufferAttribute(haze, 1)); g.setIndex(idx);
    this.lineU = { uRock: { value: new THREE.Color() }, uSky: { value: new THREE.Color() } };
    this.skyline = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.lineU, side: THREE.DoubleSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: 'attribute float aHaze; varying float vH; void main(){ vH = aHaze; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying float vH; uniform vec3 uRock, uSky; void main(){ gl_FragColor = vec4(mix(uRock, uSky, vH), 1.0);\n#include <colorspace_fragment>\n }' }));
    this.skyline.renderOrder = -28; this.skyline.frustumCulled = false; this.group.add(this.skyline);
  }
  // ---------- dust in the air, and a dust devil out on the plain ----------
  _dust() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
    const dot = (this.dot = new THREE.CanvasTexture(cv)); this.puffs.material.map = dot; this.puffs.material.size = 0.9; this.puffs.material.needsUpdate = true;
    const n = 700, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 70; p[i * 3 + 1] = Math.random() * 14; p[i * 3 + 2] = (Math.random() - 0.5) * 70; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); this.airMat = new THREE.PointsMaterial({ color: new THREE.Color().setRGB(...lin(0.85, 0.62, 0.44)), size: 0.07, map: dot, transparent: true, opacity: 0.25, depthWrite: false, sizeAttenuation: true });
    this.air = new THREE.Points(g, this.airMat); this.air.frustumCulled = false; this.group.add(this.air);
    const m = 260, dp = new Float32Array(m * 3); const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.devil = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color().setRGB(...lin(0.8, 0.56, 0.4)), size: 3.2, map: dot, transparent: true, opacity: 0.3, depthWrite: false, sizeAttenuation: true })); this.devil.frustumCulled = false; this.devilSeed = Array.from({ length: m }, (_, i) => [Math.random(), Math.random() * 6.283, 0.6 + Math.random() * 0.8, i]); this.devilAt = { x: 260, z: -80, on: 0, t: 0 }; this.group.add(this.devil);
  }

  // ---------- the outpost ----------
  lamp(g, id, x, y, z) { const m = std({ color: 0x101010, emissive: 0x4dff88, emissiveIntensity: 2.2 }); this.put(g, this.cyl(0.07, 0.07, y, this.M.dark, 6), x, y / 2, z); this.put(g, this.sph(0.22, m, 10, 8), x, y + 0.15, z); this.lamps[id] = m; }
  _station() {
    const M = this.M, B = T.B, PI = Math.PI;
    // Command Habitat: two storeys, a dome, a bank of soil round its foot
    { const g = this.at(B.cmd.x, B.cmd.z); this.put(g, this.cyl(9.2, 11, 1.5, M.soil, 24), 0, 0.6, 0); this.put(g, this.cyl(7, 7, 6.6, M.white, 28), 0, 3.6, 0); this.put(g, this.cyl(7.06, 7.06, 0.9, M.window, 28, true), 0, 4.7, 0); this.put(g, this.cyl(7.1, 7.1, 0.35, M.orange, 28, true), 0, 6.4, 0);
      this.put(g, this.cyl(5.2, 6.2, 2.6, M.cream, 24), 0, 8.2, 0); this.put(g, this.cyl(5.26, 5.26, 0.7, M.window, 24, true), 0, 8.4, 0); const d = this.sph(5.2, M.white, 24, 12); d.scale.y = 0.45; this.put(g, d, 0, 9.5, 0);
      this.put(g, this.cyl(0.09, 0.09, 5, M.steel, 6), 2.2, 13.4, -1); this.put(g, this.sph(0.25, M.orange, 8, 6), 2.2, 16, -1); this.lamp(g, 'cmd', B.cmd.door[0] - B.cmd.x, 2.2, B.cmd.door[1] - B.cmd.z); }
    // Airlock: a porch, a round hatch, two suit ports
    { const g = this.at(B.airlock.x, B.airlock.z); this.put(g, this.box(5.6, 3.6, 5.6, M.white), 0, 2.2, 0); this.put(g, this.box(5.8, 0.3, 5.8, M.orange), 0, 4.15, 0); this.put(g, this.cyl(1.35, 1.35, 0.3, M.orange, 20), 0, 2.1, 2.9, PI / 2); this.put(g, this.cyl(0.6, 0.6, 0.34, M.window, 16), 0, 2.4, 2.92, PI / 2);
      this.put(g, this.box(4.4, 0.25, 2.4, M.grey), 0, 0.5, 4.1); for (let i = 0; i < 2; i++) this.put(g, this.box(2.2, 0.2, 0.5, M.grey), 0, 0.33 - i * 0.2, 5.5 + i * 0.5); for (const s of [-1, 1]) this.put(g, this.cyl(0.55, 0.55, 0.2, M.dark, 14), 2.86, 2, s * 1.2, 0, 0, PI / 2);
      this.put(g, this.box(0.5, 0.5, 0.5, M.orange), -2.6, 0.75, 3.6); this.lamp(g, 'airlock', 2.4, 2, 4.6); }
    // Living Quarters: a long module under a mound of soil, to keep radiation out
    { const g = this.at(B.living.x, B.living.z), c = this.cyl(4.2, 4.2, 19, M.white, 20); this.put(g, c, 0, 3.4, 0, 0, 0, PI / 2); for (const s of [-1, 1]) { const e = this.sph(4.2, M.cream, 18, 12); e.scale.x = 0.5; this.put(g, e, s * 9.5, 3.4, 0); this.put(g, this.cyl(1, 1, 0.3, M.window, 14), s * 11.5, 3.6, 0, 0, 0, PI / 2); }
      const mound = this.sph(1, M.soil, 22, 14); mound.scale.set(8.6, 6.4, 7.4); mound.castShadow = false; this.put(g, mound, 0, 1.2, 0); this.put(g, this.box(2.4, 2.6, 1.6, M.white), 0, 1.6, 6.2); this.put(g, this.box(1.2, 1.9, 0.2, M.orange), 0, 1.4, 7.05); this.lamp(g, 'living', 2, 2, 8); }
    // Medical Bay
    { const g = this.at(B.medical.x, B.medical.z); this.put(g, this.cyl(4.2, 4.2, 3.8, M.white, 20), 0, 2.3, 0); this.put(g, this.cyl(4.4, 4.4, 0.3, M.grey, 20), 0, 4.35, 0); this.put(g, this.box(0.25, 1.5, 0.5, M.cross), 4.25, 2.6, 0); this.put(g, this.box(0.25, 0.5, 1.5, M.cross), 4.25, 2.6, 0);
      this.put(g, this.box(1.6, 2.2, 1.2, M.cream), 4.6, 1.3, 2.6); this.put(g, this.cyl(4.26, 4.26, 0.6, M.window, 20, true), 0, 3.2, 0); this.lamp(g, 'medical', 6.2, 2, 0.8); }
    // Life Support Module: oxygen tanks, air scrubbers, a fan that turns
    { const g = this.at(B.lifesupport.x, B.lifesupport.z); this.put(g, this.cyl(3, 3, 13, M.white, 18), 0, 3.3, 0, 0, 0, PI / 2); for (const s of [-1, 1]) { const e = this.sph(3, M.cream, 16, 10); e.scale.x = 0.45; this.put(g, e, s * 6.5, 3.3, 0); }
      for (let i = 0; i < 3; i++) { this.put(g, this.sph(1.35, M.tank, 16, 12), -4 + i * 3.2, 1.9, -4.4); this.put(g, this.cyl(0.12, 0.12, 1.3, M.steel, 6), -4 + i * 3.2, 0.6, -4.4); } this.put(g, this.box(11, 0.25, 3.2, M.grey), -0.8, 0.25, -4.4);
      this.put(g, this.box(2.2, 2.6, 1.8, M.grey), 4.6, 1.6, 4); const fan = new THREE.Group(); for (let i = 0; i < 4; i++) this.put(fan, this.box(1.5, 0.08, 0.34, M.dark), 0, 0, 0, 0, (i * PI) / 2 + 0.3, 0.25); this.put(g, fan, 4.6, 3.05, 4); this.spin.push({ o: fan, axis: 'y', sp: 5, id: 'lifesupport' });
      this.put(g, this.cyl(1.1, 1.1, 0.24, M.dark, 14, true), 4.6, 3, 4); this.put(g, this.box(0.15, 3.2, 5, M.white), -5.5, 4.6, 3.6, 0, 0.3, 0); this.lamp(g, 'lifesupport', 0, 2, 5.4); }
    // Greenhouse: a clear tunnel with pink grow lamps
    { const g = this.at(B.greenhouse.x, B.greenhouse.z), L = 27, half = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, L, 22, 1, true, 0, PI), M.film); this.put(g, half, 0, 0.5, 0, PI / 2, 0, PI / 2);
      for (let i = 0; i <= 8; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(4.62, 0.11, 6, 18, PI), M.white); rib.castShadow = true; this.put(g, rib, 0, 0.5, -L / 2 + (i * L) / 8); }
      this.put(g, this.box(9.4, 0.5, L + 0.4, M.grey), 0, 0.25, 0); for (const s of [-1, 1]) { this.put(g, this.box(9, 4.6, 0.3, M.white), 0, 2.6, s * (L / 2 + 0.1)); for (const sx of [-1, 1]) { this.put(g, this.box(1.7, 0.7, L - 3, M.dark), sx * 2.4, 0.9, 0); this.put(g, this.box(1.5, 0.7, L - 3.4, M.green), sx * 2.4, 1.55, 0); this.put(g, this.box(1.3, 0.08, L - 3.4, M.grow), sx * 2.4, 3.3, 0); } }
      this.put(g, this.box(0.3, 2.2, 1.4, M.orange), -4.7, 1.4, 0); this.lamp(g, 'greenhouse', -6.2, 2, 1.6); }
    // Research Laboratory: on legs, with a glove box, a sample table and a weather mast
    { const g = this.at(B.lab.x, B.lab.z); for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.put(g, this.cyl(0.18, 0.18, 1.2, M.steel, 8), sx * 4, 0.6, sz * 3); this.put(g, this.box(9.4, 3.8, 7.2, M.white), 0, 3.1, 0); this.put(g, this.box(9.5, 0.7, 0.2, M.window), 0, 3.6, 3.62); this.put(g, this.box(9.6, 0.3, 7.4, M.orange), 0, 5.1, 0);
      this.put(g, this.box(3, 1.4, 1.5, M.grey), 2.4, 2.4, 4.3); this.put(g, this.box(2.6, 0.7, 0.1, M.window), 2.4, 2.7, 5.06); this.put(g, this.box(3, 0.12, 1.4, M.steel), -2.6, 1, 5); for (let i = 0; i < 4; i++) this.put(g, this.sph(0.2 + (i % 2) * 0.08, M.soil, 6, 5), -3.6 + i * 0.65, 1.22, 5);
      this.put(g, this.cyl(0.07, 0.07, 8, M.steel, 6), 6.2, 4, -2.5); const vane = new THREE.Group(); this.put(vane, this.box(1.4, 0.06, 0.06, M.dark), 0, 0, 0); this.put(vane, this.box(0.06, 0.06, 1.4, M.dark), 0, 0, 0); this.put(g, vane, 6.2, 8.1, -2.5); this.spin.push({ o: vane, axis: 'y', sp: 2.5, wind: true });
      this.put(g, this.box(1.6, 0.2, 2.4, M.grey), 0, 0.9, 5.2); this.lamp(g, 'lab', -5.4, 2, 4.6); }
    // Thermal Control: a heat pump and two radiator wings that shed waste heat to the sky
    { const g = this.at(B.thermal.x, B.thermal.z); this.put(g, this.box(5.4, 3, 4.2, M.grey), 0, 1.7, 0); this.put(g, this.box(5.6, 0.25, 4.4, M.orange), 0, 3.3, 0); for (const s of [-1, 1]) { this.put(g, this.box(0.14, 5.4, 8.4, M.white), s * 4.6, 3.6, -1); this.put(g, this.cyl(0.14, 0.14, 4, M.red, 8), s * 3.6, 0.8, -1, 0, 0, PI / 2); }
      const pm = std({ color: 0x100606, emissive: 0xff5a2a, emissiveIntensity: 1 }); this.pump = pm; for (let i = 0; i < 3; i++) this.put(g, this.box(0.5, 0.5, 0.1, pm), -1.4 + i * 1.4, 2, 2.12); this.lamp(g, 'thermal', 2, 2, 3.4); }
    // Water Processing Plant, and the rig over its ice well
    { const g = this.at(B.water.x, B.water.z); this.put(g, this.box(7.4, 4, 6.2, M.white), 0, 2.2, 0); this.put(g, this.box(7.6, 0.3, 6.4, M.blue), 0, 4.35, 0); for (let i = 0; i < 2; i++) { this.put(g, this.cyl(1.6, 1.6, 5.2, M.tank, 18), 5.6, 2.8, -1.8 + i * 3.6); const cap = this.sph(1.6, M.tank, 16, 8); cap.scale.y = 0.4; this.put(g, cap, 5.6, 5.4, -1.8 + i * 3.6); }
      this.put(g, this.box(0.3, 2.2, 1.4, M.orange), -3.75, 1.4, 0); this.lamp(g, 'water', -5, 2, 1.6);
      const d = this.at(T.DRILL.x, T.DRILL.z); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const leg = this.box(0.18, 9.4, 0.18, M.steel); this.put(d, leg, sx * 1.1, 4.6, sz * 1.1, sz * 0.2, 0, -sx * 0.2); } this.put(d, this.box(1.6, 0.5, 1.6, M.orange), 0, 9, 0); this.put(d, this.cyl(1.5, 1.5, 0.4, M.grey, 14), 0, 0.2, 0);
      const str = this.cyl(0.14, 0.14, 8.6, M.dark, 8); this.put(d, str, 0, 4.6, 0); this.spin.push({ o: str, axis: 'y', sp: 3, id: 'water' }); this.put(d, this.box(0.5, 0.5, 0.5, M.hot), 0.5, 0.7, 0.5);
      this.pipe(B.water.x - 2, B.water.z + 3.4, T.DRILL.x - 1, T.DRILL.z - 1, M.blue, 0.5); }
    // ISRU Facility: makes oxygen from the carbon-dioxide air (a grown-up MOXIE)
    { const g = this.at(B.isru.x, B.isru.z); this.put(g, this.box(4.4, 3.6, 4, M.grey), -4, 2, 0); for (let i = 0; i < 5; i++) this.put(g, this.box(4.5, 0.12, 0.5, M.dark), -4, 0.9 + i * 0.6, 2.05, 0.5); this.put(g, this.cyl(1.5, 1.5, 4.6, M.steel, 16), 0.6, 2.5, -0.4); this.put(g, this.cyl(0.5, 0.5, 2.2, M.dark, 10), 0.6, 5.6, -0.4);
      this.put(g, this.box(3.4, 3, 3, M.white), 4.6, 1.7, -0.6); this.put(g, this.box(2.6, 0.5, 0.1, M.hot), 4.6, 1.8, 0.95); this.put(g, this.box(3.5, 0.25, 3.1, M.orange), 4.6, 3.3, -0.6);
      for (let i = 0; i < 2; i++) { this.put(g, this.cyl(1.4, 1.4, 6.4, M.white, 16), 1, 1.8, -5.4 - i * 3.2, 0, 0, PI / 2); for (const s of [-1, 1]) { const e = this.sph(1.4, M.white, 12, 8); e.scale.x = 0.5; this.put(g, e, 1 + s * 3.2, 1.8, -5.4 - i * 3.2); } }
      const fan = new THREE.Group(); for (let i = 0; i < 3; i++) this.put(fan, this.box(1.3, 0.3, 0.08, M.dark), 0, 0, 0, 0, 0, (i * PI * 2) / 3); this.put(g, fan, -4, 3, -2.1); this.spin.push({ o: fan, axis: 'z', sp: 7, id: 'isru' }); this.lamp(g, 'isru', 0, 2, 5.6); }
    // Storage Depot: cargo boxes under a roof
    { const g = this.at(B.storage.x, B.storage.z), cols = [M.white, M.orange, M.grey, M.cream]; let k = 0; for (const [x, z, ry] of [[-3.4, -3.4, 0], [3.4, -3.4, 0], [-5.2, 1.4, PI / 2], [5.2, 1.4, PI / 2]]) for (let l = 0; l < 2; l++) { if (l && k % 3 === 2) { k++; continue; } this.put(g, this.box(6, 2.5, 2.4, cols[k++ % 4]), x, 1.4 + l * 2.55, z, 0, ry, 0); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.put(g, this.cyl(0.14, 0.14, 7, M.steel, 6), sx * 7, 3.5, sz * 5); this.put(g, this.box(15, 0.2, 11, M.cream), 0, 7.05, 0); this.put(g, this.sph(1.2, M.tank, 14, 10), 0, 1.4, 2.6); this.lamp(g, 'storage', 8, 2, 0); }
    // Rover Garage: open at both ends, so you can drive straight through
    { const g = this.at(B.garage.x, B.garage.z); for (const s of [-1, 1]) this.put(g, this.box(0.5, 5, 11, M.white), s * 8.2, 2.6, 0); this.put(g, this.box(17.4, 0.4, 11.6, M.cream), 0, 5.3, 0); this.put(g, this.box(17.6, 0.6, 0.3, M.orange), 0, 5.1, 5.8); this.put(g, this.box(17.6, 0.6, 0.3, M.orange), 0, 5.1, -5.8);
      this.put(g, this.box(1, 1.8, 3, M.grey), 7.3, 1, -2); this.put(g, this.box(0.8, 1.2, 1.6, M.orange), 7.4, 0.7, 2.4); this.lamp(g, 'garage', -9.4, 2, -5.6);
      const p = this.at(T.ROVER_PAD.x, T.ROVER_PAD.z); this.put(p, this.cyl(5, 5.3, 0.2, M.pad, 28), 0, 0.1, 0); this.padRing = std({ color: 0x06141a, emissive: 0x49e6ff, emissiveIntensity: 1.2 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.1, 6, 40), this.padRing); this.put(p, ring, 0, 0.24, 0, PI / 2); this.put(p, this.box(0.5, 2.6, 0.5, M.orange), 4.6, 1.3, -4); }
    // Communications Tower: a mast, and a dish that follows the Earth
    { const g = this.at(B.comms.x, B.comms.z); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) this.put(g, this.box(0.16, 17, 0.16, M.steel), sx * 0.9, 8.4, sz * 0.9, sz * 0.06, 0, -sx * 0.06); for (let i = 1; i < 6; i++) this.put(g, this.box(1.9 - i * 0.2, 0.1, 1.9 - i * 0.2, M.steel), 0, i * 2.8, 0);
      const mount = new THREE.Group(), dish = new THREE.Mesh(new THREE.SphereGeometry(2.6, 22, 10, 0, PI * 2, 0, 0.75), M.white); dish.castShadow = true; this.put(mount, dish, 0, 0, -2.2, PI / 2); this.put(mount, this.cyl(0.05, 0.05, 2.2, M.steel, 6), 0, 0, 0.9, PI / 2); this.put(mount, this.sph(0.2, M.orange, 8, 6), 0, 0, 2); this.put(g, mount, 0, 17.6, 0); this.dish = mount;
      this.put(g, this.box(3, 2.4, 2.6, M.white), 3, 1.4, 1.5); this.put(g, this.cyl(0.05, 0.05, 3, M.steel, 6), 3.8, 4, 1.5); this.lamp(g, 'comms', 0, 2, 4.6); }
    // Power Station: batteries and switchgear; the solar field; a small fission unit behind a bank of soil
    { const g = this.at(B.power.x, B.power.z); this.put(g, this.box(5, 3, 4, M.white), 0, 1.7, 0); this.put(g, this.box(5.2, 0.25, 4.2, M.orange), 0, 3.3, 0); for (let i = 0; i < 4; i++) { this.put(g, this.box(2.4, 2.6, 6, M.grey), -9.6 + i * 2.8 + (i > 1 ? 9.6 : 0), 1.5, 0.4); for (let f = 0; f < 5; f++) this.put(g, this.box(2.5, 0.08, 0.08, M.dark), -9.6 + i * 2.8 + (i > 1 ? 9.6 : 0), 0.7 + f * 0.45, 3.42); } this.lamp(g, 'power', 0, 2, -3);
      for (let r = 0; r < T.SOLAR.rows; r++) for (let k = 0; k < T.SOLAR.cols; k++) { const [x, z] = T.panelAt(r, k), pg = this.at(x, z), tilt = new THREE.Group(); this.put(pg, this.cyl(0.12, 0.16, 2.2, M.steel, 8), -3, 1.1, 0); this.put(pg, this.cyl(0.12, 0.16, 2.2, M.steel, 8), 3, 1.1, 0); this.put(tilt, this.box(8.4, 0.08, 4.2, M.solar), 0, 0.05, 0); this.put(tilt, this.box(8.5, 0.08, 4.3, M.back), 0, -0.03, 0); for (const bx of [-2.8, 0, 2.8]) this.put(tilt, this.box(0.12, 0.2, 4.2, M.steel), bx, -0.16, 0); this.put(tilt, this.box(8.5, 0.16, 0.1, M.steel), 0, -0.02, 2.12); this.put(tilt, this.box(8.5, 0.16, 0.1, M.steel), 0, -0.02, -2.12); this.put(pg, tilt, 0, 2.3, 0); this.panels.push(tilt); }
      const rc = this.at(T.REACTOR.x, T.REACTOR.z); this.put(rc, this.cyl(1.2, 1.4, 2.4, M.grey, 16), 0, 0.9, 0); this.put(rc, this.cyl(0.12, 0.12, 4.4, M.steel, 8), 0, 3.6, 0); const um = this.cyl(3.4, 0.3, 0.9, M.white, 20, true); um.material = std({ color: M.white.color, roughness: 0.6, side: THREE.DoubleSide }); this.put(rc, um, 0, 5.6, 0);
      for (let i = 0; i < 7; i++) { const a = PI + (i - 3) * 0.24, m = this.sph(1, M.soil, 12, 8); m.scale.set(4.2, 2.6, 3); m.castShadow = false; this.put(rc, m, Math.cos(a) * 15, 0.2, Math.sin(a) * 15, 0, -a, 0); }
      this.cable(B.power.x + 4, B.power.z, T.REACTOR.x - 2, T.REACTOR.z); }
    // the lander on its pad, and what it brought
    { const g = this.at(T.PAD.x, T.PAD.z); this.put(g, this.cyl(3.4, 3.8, 6.4, M.white, 22), 0, 6.2, 0); this.put(g, this.cyl(0.2, 3.4, 3.6, M.cream, 22), 0, 11.2, 0); this.put(g, this.cyl(3.45, 3.45, 0.5, M.orange, 22, true), 0, 8.2, 0); this.put(g, this.cyl(3.46, 3.46, 0.8, M.window, 22, true), 0, 6.6, 0);
      for (let i = 0; i < 4; i++) { const a = (i * PI) / 2 + PI / 4; this.put(g, this.box(0.3, 5.2, 0.3, M.steel), Math.cos(a) * 4.6, 2.3, Math.sin(a) * 4.6, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); this.put(g, this.cyl(0.9, 0.9, 0.2, M.grey, 12), Math.cos(a) * 5.8, 0.1, Math.sin(a) * 5.8); this.put(g, this.cyl(0.5, 0.95, 1.5, M.dark, 12, true), Math.cos(a) * 1.5, 2.3, Math.sin(a) * 1.5); }
      this.put(g, this.box(0.4, 0.3, 4.6, M.grey), 3.6, 1.6, 2.4, 0.6); for (let i = 0; i < 3; i++) this.put(g, this.box(2.4, 2.2, 2.4, [M.orange, M.white, M.grey][i]), 11 + (i % 2) * 2.7, 1.1, -4 + i * 2.2, 0, i * 0.4, 0); }
    // tunnels you could walk through in shirt sleeves
    for (const [x0, z0, x1, z1] of T.TUNNELS) { const len = Math.hypot(x1 - x0, z1 - z0), g = this.at((x0 + x1) / 2, (z0 + z1) / 2), t = this.cyl(1.45, 1.45, len, M.cream, 14); g.rotation.y = Math.atan2(x1 - x0, z1 - z0); this.put(g, t, 0, 1.9, 0, PI / 2); for (let s = 1; s < len / 2.2; s++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 6, 16), M.grey); this.put(g, rb, 0, 1.9, -len / 2 + s * 2.2); } this.put(g, this.box(1.2, 0.5, len, M.grey), 0, 0.25, 0); }
    // pipes: water (blue), oxygen (white), heat (red)
    this.pipe(B.water.x - 3.8, B.water.z - 2, B.lifesupport.x + 6, B.lifesupport.z + 3, M.blue, 0.6); this.pipe(B.isru.x - 6, B.isru.z - 3, B.lifesupport.x + 7.2, B.lifesupport.z - 2, M.white, 0.9); this.pipe(B.thermal.x - 3, B.thermal.z + 1, B.lifesupport.x + 7, B.lifesupport.z + 1, M.red, 0.6); this.pipe(B.thermal.x - 2, B.thermal.z - 3, B.greenhouse.x + 5, B.greenhouse.z + 12, M.red, 0.6);
    // power cables
    for (const id of ['cmd', 'isru', 'water', 'comms', 'garage', 'thermal', 'storage']) this.cable(B.power.x, B.power.z - 2.4, B[id].door[0] + 1.5, B[id].door[1] + 1.5);
    this.cable(B.power.x, B.power.z + 2.4, (T.SOLAR.x0 + T.SOLAR.x1) / 2, T.SOLAR.z0 + 2);
    // the young crater's ice, and a marker beside it
    { const g = this.at(T.ICE_CRATER.x, T.ICE_CRATER.z); for (let i = 0; i < 9; i++) { const a = i * 2.4, d = 1 + (i % 4) * 1.6, m = this.sph(0.5 + (i % 3) * 0.3, M.ice, 7, 5); m.scale.y = 0.35; this.put(g, m, Math.cos(a) * d, 0.1 + T.heightAt(T.ICE_CRATER.x + Math.cos(a) * d, T.ICE_CRATER.z + Math.sin(a) * d) - T.heightAt(T.ICE_CRATER.x, T.ICE_CRATER.z), Math.sin(a) * d); }
      const f = this.at(T.ICE_CRATER.x - T.ICE_CRATER.r - 3, T.ICE_CRATER.z); this.put(f, this.cyl(0.05, 0.05, 2.4, M.steel, 6), 0, 1.2, 0); this.put(f, this.box(0.9, 0.5, 0.04, M.orange), 0.45, 2.1, 0); }
    // night lights: always there, dark by day (a fixed number, so the shaders never have to be rebuilt)
    this.lights = [[B.cmd.x + 9, 6, B.cmd.z + 9], [B.garage.x, 4.6, B.garage.z], [B.power.x, 5, B.power.z - 6], [B.water.x - 6, 5, B.water.z]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffe2b8, 0, 60, 1.4); l.position.set(x, T.heightAt(x, z) + y, z); this.group.add(l); return l; });
  }
  pipe(x0, z0, x1, z1, m, y = 0.6) { const len = Math.hypot(x1 - x0, z1 - z0), g = this.at((x0 + x1) / 2, (z0 + z1) / 2); g.rotation.y = Math.atan2(x1 - x0, z1 - z0); const p = this.cyl(0.16, 0.16, len, m, 8); p.castShadow = false; this.put(g, p, 0, y, 0, Math.PI / 2); for (let s = 0; s <= len; s += 6) this.put(g, this.box(0.3, y, 0.3, this.M.grey), 0, y / 2, -len / 2 + s); }
  cable(x0, z0, x1, z1) { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 8)); for (let i = 0; i < n; i++) { const ax = lerp(x0, x1, i / n), az = lerp(z0, z1, i / n), bx = lerp(x0, x1, (i + 1) / n), bz = lerp(z0, z1, (i + 1) / n), len = Math.hypot(bx - ax, bz - az), c = this.box(0.14, 0.1, len + 0.1, this.M.dark); c.castShadow = false;
      const g = this.at((ax + bx) / 2, (az + bz) / 2); g.rotation.y = Math.atan2(bx - ax, bz - az); g.rotation.x = -Math.atan2(T.heightAt(bx, bz) - T.heightAt(ax, az), len); this.put(g, c, 0, 0.06, 0); } }
  // ---------- things to find out on the plain ----------
  _places() {
    const M = this.M, PI = Math.PI, c = (r, g, b) => new THREE.Color().setRGB(...lin(r, g, b));
    // the heat shield, lying where it fell: a charred dish on scorched ground
    { const g = this.at(T.SHIELD.x, T.SHIELD.z), char = std({ color: c(0.2, 0.15, 0.12), roughness: 0.9 }), lining = std({ color: c(0.62, 0.5, 0.36), roughness: 0.8, side: THREE.BackSide }), tip = new THREE.Group(), dishG = new THREE.CylinderGeometry(2.4, 0.5, 0.8, 28, 1, true), dish = new THREE.Mesh(dishG, char), inner = new THREE.Mesh(dishG, lining), rim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.07, 6, 28), M.grey); dish.castShadow = true;
      tip.add(dish, inner); this.put(tip, rim, 0, 0.4, 0, PI / 2); this.put(tip, new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), std({ color: c(0.5, 0.4, 0.3), roughness: 0.8, side: THREE.DoubleSide })), 0, -0.38, 0, -PI / 2); this.put(g, tip, 0, 1.25, 0, 0.75, 0.5, 0); for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4, p = this.box(0.5 + (i % 2) * 0.3, 0.05, 0.4, char); this.put(g, p, Math.cos(a) * (3.2 + i * 0.5), 0.05, Math.sin(a) * (3 + i * 0.4), 0.2, a, 0.1); }
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(4.6, 28), new THREE.MeshBasicMaterial({ color: c(0.1, 0.07, 0.06), transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); this.put(g, scorch, 0, 0.06, 0, -PI / 2); }
    // the backshell on its side, and the parachute still tied to it, spread out downwind
    { const bx = T.SHIELD.x + 13, bz = T.SHIELD.z - 9, g = this.at(bx, bz), shell = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 2.1, 1.9, 24, 1, true), std({ color: c(0.86, 0.84, 0.8), roughness: 0.6, side: THREE.DoubleSide })); shell.castShadow = true; this.put(g, shell, 0, 1.25, 0, 0, 0.6, 1.25);
      const n = 15, m = 9, W = 15, D = 9.5, ox = bx + T.WIND[0] * 12, oz = bz + T.WIND[1] * 12, ya = Math.atan2(T.WIND[1], T.WIND[0]), pos = new Float32Array(n * m * 3), col = new Float32Array(n * m * 3), idx = [], ca = Math.cos(ya), sa = Math.sin(ya);
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * W, v = (j / (m - 1) - 0.5) * D * (1 - 0.35 * Math.abs(i / (n - 1) - 0.5)), x = ox + u * ca - v * sa, z = oz + u * sa + v * ca, k = j * n + i, fold = 0.1 + 0.22 * Math.abs(Math.sin(i * 1.7 + j * 0.9)) + 0.16 * Math.abs(Math.sin(j * 2.3));
        pos.set([x, T.heightAt(x, z) + fold, z], k * 3); const stripe = Math.floor(j / 1.5) % 2 === 0, cc = stripe ? lin(0.88, 0.4, 0.14) : lin(0.9, 0.88, 0.84), dusty = 0.75 + 0.25 * Math.sin(i * 0.8 + j); col.set([cc[0] * dusty, cc[1] * dusty, cc[2] * dusty], k * 3); }
      for (let j = 0; j < m - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const chute = new THREE.Mesh(geo, std({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide })); chute.castShadow = chute.receiveShadow = true; this.group.add(chute);
      for (const s of [-1, 0, 1]) { const ex = ox - ca * W * 0.5 - sa * s * 2.6, ez = oz - sa * W * 0.5 + ca * s * 2.6, len = Math.hypot(ex - bx, ez - bz), line = this.box(0.03, 0.03, len, M.dark), lg = this.at((bx + ex) / 2, (bz + ez) / 2); line.castShadow = false; lg.rotation.y = Math.atan2(ex - bx, ez - bz); this.put(lg, line, 0, 0.12, 0); } }
    // the seismometer under its dome, with a ribbon cable to its box and a small solar panel
    { const g = this.at(T.SEIS.x, T.SEIS.z), dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 22, 12, 0, PI * 2, 0, PI / 2), std({ color: c(0.88, 0.84, 0.74), roughness: 0.45, metalness: 0.2 })); dome.castShadow = true; this.put(g, dome, 0, 0.1, 0); this.put(g, this.cyl(1.08, 1.16, 0.14, M.foil, 24), 0, 0.07, 0);
      const bx = T.SEIS.x + 4.5, bz = T.SEIS.z + 2, len = Math.hypot(4.5, 2) - 1.4, rg = this.at((T.SEIS.x + bx) / 2, (T.SEIS.z + bz) / 2), rib = this.box(0.14, 0.02, len, M.foil); rib.castShadow = false; rg.rotation.y = Math.atan2(4.5, 2); this.put(rg, rib, 0, 0.05, 0);
      const b = this.at(bx, bz); this.put(b, this.box(0.9, 0.7, 0.65, M.white), 0, 0.45, 0); this.put(b, this.box(1.5, 0.05, 1.0, M.solar), 0, 1.0, 0.1, -0.5, 0, 0); this.put(b, this.cyl(0.03, 0.03, 1.5, M.steel, 6), 0.35, 1.2, -0.2); this.seisLamp = std({ color: 0x06140a, emissive: 0x4dff88, emissiveIntensity: 1.6 }); this.put(b, this.sph(0.07, this.seisLamp, 8, 6), 0.35, 1.98, -0.2); }
  }
  // ---------- Earth and Phobos in the sky ----------
  _moons() {
    const mk = (col, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: col, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); s.renderOrder = -28.5; s.frustumCulled = false; this.group.add(s); return s; };
    this.earth = mk(0x9fc8ff, 190); this.phobos = mk(0xe6d8c4, 120); this.earthUp = false; this.phobosUp = false;
  }
  _sky2(S, sn, night, day, dusty, cam) {
    const t = S ? S.t : 0, U = this.skyU, low = clamp(1 - Math.abs(sn.elev - 1) / 12, 0, 1), sol = Math.floor(t / MARS.SOL_H), wisp = 0.35 + 0.65 * Math.abs(Math.sin(sol * 12.9898 + 4.1) * 43758.5453 % 1);
    // thin ice clouds: faint by day, bright around sunrise and sunset when the Sun lights them from below; none in a dust storm
    U.uCloud.value = wisp * clamp(0.3 * day + 0.9 * low, 0, 1) * clamp(1 - dusty * 3, 0, 1); U.uCloudCol.value.setRGB(...lin(lerp(1, 0.86, low), lerp(0.95, 0.9, low), lerp(0.88, 1, low))); U.uDrift.value.set(t * 0.012, t * 0.004);
    // Earth: a blue-white star that never strays far from the Sun; it is where the Sun will be (or was) a couple of hours away
    const el = S ? earthElongation(S) : 25, se = S ? marsSun(S, t + (el / 360) * MARS.SOL_H) : sn, clear = clamp(1 - dusty * 2, 0, 1), dark = clamp((-sn.elev - 1) / 5, 0, 1);
    this.earth.position.set(cam.x + se.e * 5800, cam.y + se.u * 5800, cam.z - se.n * 5800); this.earth.material.opacity = se.u > 0.03 ? dark * clear * 0.95 : 0; this.earthUp = this.earth.material.opacity > 0.5 && se.elev > 4; this.earthMorning = el > 0;
    // Phobos: rises in the west and sets in the east, about every 11 hours; from this far north it stays low in the south
    const u = ((t / 11.1) % 1) / 0.38, up = u < 1, az = ((270 - 180 * u) * Math.PI) / 180, pe = (33 * Math.PI) / 180 * Math.sin(Math.PI * clamp(u, 0, 1)), ch = Math.cos(pe);
    this.phobos.position.set(cam.x + Math.sin(az) * ch * 5800, cam.y + Math.sin(pe) * 5800, cam.z - Math.cos(az) * ch * 5800); this.phobos.material.opacity = up && pe > 0.05 ? clamp(night * 1.2, 0, 1) * clear * 0.9 : 0; this.phobosUp = this.phobos.material.opacity > 0.5 && pe > 0.14;
    if (this.seisLamp) this.seisLamp.emissiveIntensity = 0.5 + 1.4 * (Math.sin(this.t * 2.2) > 0.6 ? 1 : 0);
  }
  _marks() { this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); this.beacon.visible = false; this.group.add(this.beacon); }
  setTarget(t) { if (!t) { this.beacon.visible = false; return; } this.beacon.visible = true; this.beacon.position.set(t.x, T.heightAt(t.x, t.z) + 30, t.z); }

  // ---------- inside the Command Habitat ----------
  // One round room: consoles along the north wall, a table with a model of the plain, lockers, a ladder to the floor
  // above, and the hatch to the airlock on the south side. The wall and ceiling are drawn on their inner faces only,
  // so the camera can stand outside them and still see in. A dark shell all round hides the world outside.
  _interior() {
    const R = T.ROOM, PI = Math.PI, g = (this.room = new THREE.Group()); g.position.set(R.x, R.y, R.z); g.visible = false; this.group.add(g); this.inside = false; this.roomColliders = T.roomColliders();
    const c = (r, gg, b) => new THREE.Color().setRGB(...lin(r, gg, b)), mk = (o) => std({ fog: false, ...o }), rw = R.r + 0.3;
    const wall = mk({ color: c(0.88, 0.86, 0.82), roughness: 0.82, side: THREE.BackSide }), band = mk({ color: c(0.86, 0.42, 0.16), roughness: 0.6, side: THREE.BackSide }), skirt = mk({ color: c(0.3, 0.3, 0.31), roughness: 0.8, side: THREE.BackSide });
    const floor = mk({ color: c(0.2, 0.2, 0.215), roughness: 0.92 }), ceil = mk({ color: c(0.8, 0.78, 0.74), roughness: 0.9 }), white = mk({ color: c(0.86, 0.84, 0.8), roughness: 0.75 }), cream = mk({ color: c(0.78, 0.72, 0.64), roughness: 0.8 });
    const trim = mk({ color: c(0.86, 0.42, 0.16), roughness: 0.6 }), metal = mk({ color: c(0.62, 0.63, 0.66), roughness: 0.35, metalness: 0.8 }), dark = mk({ color: c(0.15, 0.15, 0.16), roughness: 0.7 }), soil = mk({ color: c(0.56, 0.32, 0.2), roughness: 1 }), leaf = mk({ color: c(0.22, 0.56, 0.24), roughness: 0.9 });
    this.roomScreen = mk({ color: 0x06090c, emissive: c(1, 0.7, 0.34), emissiveIntensity: 0.9 }); this.roomGlow = mk({ color: 0x1a1612, emissive: c(1, 0.9, 0.74), emissiveIntensity: 1.6 });
    this.roomLamp = mk({ color: 0x101010, emissive: 0x4dff88, emissiveIntensity: 2.2 }); this.portMat = mk({ color: 0x050505, emissive: c(0.86, 0.7, 0.54), emissiveIntensity: 1.2 });
    const add = (m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, to = g) => { m.castShadow = m.receiveShadow = false; return this.put(to, m, x, y, z, rx, ry, rz); };
    const at = (deg, rad) => [Math.cos((deg * PI) / 180) * rad, Math.sin((deg * PI) / 180) * rad], inward = (deg) => Math.atan2(-Math.cos((deg * PI) / 180), -Math.sin((deg * PI) / 180));   // the turn that makes a thing on the wall look at the middle
    const flat = (geo, m, up) => { const k = new THREE.Mesh(geo, m); k.rotation.x = up ? -PI / 2 : PI / 2; return k; };
    add(new THREE.Mesh(new THREE.SphereGeometry(30, 20, 12), new THREE.MeshBasicMaterial({ color: 0x0b0806, side: THREE.BackSide, fog: false })), 0, 4, 0);
    // floor, wall, ceiling
    g.add(Object.assign(flat(new THREE.CircleGeometry(rw, 48), floor, true), { receiveShadow: false })); { const k = flat(new THREE.RingGeometry(3.05, 3.17, 56), new THREE.MeshBasicMaterial({ color: 0xffb347, fog: false }), true); k.position.y = 0.012; g.add(k); }
    { const k = flat(new THREE.CircleGeometry(rw, 48), ceil, false); k.position.y = 3.6; g.add(k); }
    add(this.cyl(rw, rw, 3.6, wall, 48, true), 0, 1.8, 0); add(this.cyl(rw - 0.03, rw - 0.03, 0.24, band, 48, true), 0, 3.1, 0); add(this.cyl(rw - 0.03, rw - 0.03, 0.32, skirt, 48, true), 0, 0.16, 0);
    for (let i = 0; i < 8; i++) { const [x, z] = at(22.5 + i * 45, rw - 0.12); add(this.box(0.32, 3.6, 0.2, metal), x, 1.8, z, 0, inward(22.5 + i * 45)); }
    add(new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.07, 8, 56), this.roomGlow), 0, 3.5, 0, PI / 2); add(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 32), this.roomGlow), 0, 3.5, 0, PI / 2);
    // round windows: they show the colour of the sky outside
    for (const deg of [0, 180, 255, 285]) { const [x, z] = at(deg, rw - 0.06), [fx, fz] = at(deg, rw - 0.1); add(new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), this.portMat), x, 2.15, z, 0, inward(deg)); add(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 8, 24), trim), fx, 2.15, fz, 0, inward(deg)); }
    // the table in the middle, with a model of the plain and the outpost on it
    add(this.cyl(0.55, 0.75, 0.86, metal, 20), 0, 0.43, 0); add(this.cyl(1.55, 1.55, 0.1, white, 32), 0, 0.91, 0); add(this.cyl(1.32, 1.32, 0.05, soil, 32), 0, 0.985, 0);
    { const m = new THREE.Group(); m.position.y = 1.01; g.add(m); const s = this.sph(0.15, white, 12, 8); s.scale.y = 0.7; add(s, 0, 0.03, 0, 0, 0, 0, m); add(this.box(0.34, 0.07, 0.12, white), -0.42, 0.035, -0.05, 0, 0, 0, m); add(this.box(0.3, 0.06, 0.1, mk({ color: 0x110811, emissive: c(1, 0.36, 0.8), emissiveIntensity: 1.1 })), 0.45, 0.03, -0.6, 0, 0.2, 0, m);
      add(this.box(0.5, 0.015, 0.34, mk({ color: c(0.07, 0.11, 0.26), roughness: 0.3, metalness: 0.5 })), 0.12, 0.012, 0.82, 0, 0, 0, m); add(this.box(0.1, 0.07, 0.1, white), 0, 0.035, 0.3, 0, 0, 0, m); add(this.cyl(0.012, 0.012, 0.3, metal, 6), -0.95, 0.15, -0.55, 0, 0, 0, m); }
    this.roomHolo = new THREE.Group(); this.roomHolo.position.y = 1.07; g.add(this.roomHolo); add(new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.018, 6, 48), this.roomScreen), 0, 0, 0, PI / 2, 0, 0, this.roomHolo); for (let i = 0; i < 3; i++) { const [x, z] = at(i * 120, 1.43); add(this.sph(0.045, this.roomScreen, 8, 6), x, 0, z, 0, 0, 0, this.roomHolo); }
    for (let i = 0; i < 4; i++) { const [x, z] = at(45 + i * 90, 2.5); add(this.cyl(0.07, 0.2, 0.5, metal, 10), x, 0.25, z); add(this.cyl(0.3, 0.3, 0.07, trim, 16), x, 0.53, z); }
    // consoles along the north wall
    for (const k of T.ROOM_CONSOLES) { const q = new THREE.Group(); q.position.set(k.at[0] - R.x, 0, k.at[1] - R.z); q.rotation.y = inward(k.deg); g.add(q);
      add(this.box(1.95, 0.86, 0.78, white), 0, 0.43, 0, 0, 0, 0, q); add(this.box(1.95, 0.05, 0.84, cream), 0, 0.885, 0.02, 0, 0, 0, q); add(this.box(1.5, 0.03, 0.3, dark), 0, 0.925, 0.2, 0, 0, 0, q);
      add(this.box(1.7, 0.72, 0.06, dark), 0, 1.33, -0.24, -0.3, 0, 0, q); add(this.box(1.56, 0.6, 0.02, this.roomScreen), 0, 1.335, -0.2, -0.3, 0, 0, q); }
    for (const deg of [240, 300]) { const [x, z] = at(deg, 4.9); add(this.cyl(0.07, 0.22, 0.48, metal, 10), x, 0.24, z); add(this.cyl(0.28, 0.28, 0.07, dark, 16), x, 0.51, z); }
    // the hatch to the airlock (south), with a lamp that is green while the outpost has power
    add(this.box(2.1, 2.7, 0.22, trim), 0, 1.35, rw - 0.02); add(this.box(1.6, 2.3, 0.14, cream), 0, 1.2, rw - 0.16); add(new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), this.portMat), 0, 1.65, rw - 0.235, 0, PI); add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 20), metal), 0, 1.05, rw - 0.24);
    add(this.sph(0.13, this.roomLamp, 10, 8), 0, 2.86, rw - 0.2);
    // a ladder to the floor above, lockers, and something green
    { const [x, z] = at(180, 6.75); for (const s of [-1, 1]) add(this.cyl(0.04, 0.04, 3.6, metal, 6), x, 1.8, z + s * 0.26); for (let i = 0; i < 9; i++) add(this.box(0.05, 0.05, 0.52, metal), x, 0.35 + i * 0.38, z); const h = flat(new THREE.CircleGeometry(0.62, 20), dark, false); h.position.set(x + 0.45, 3.59, z); g.add(h); }
    for (const p of T.ROOM_SPOTS.lockers) { const deg = (Math.atan2(p[1] - R.z, p[0] - R.x) * 180) / PI, q = new THREE.Group(); q.position.set(p[0] - R.x, 0, p[1] - R.z); q.rotation.y = inward(deg); g.add(q); add(this.box(1.3, 2.1, 0.6, cream), 0, 1.05, 0, 0, 0, 0, q); add(this.box(0.04, 1.9, 0.02, dark), 0, 1.05, 0.31, 0, 0, 0, q); for (const s of [-1, 1]) add(this.box(0.06, 0.3, 0.05, trim), s * 0.12, 1.15, 0.33, 0, 0, 0, q); }
    { const p = T.ROOM_SPOTS.plant, x = p[0] - R.x, z = p[1] - R.z; add(this.cyl(0.3, 0.22, 0.45, trim, 14), x, 0.225, z); const l = this.sph(0.42, leaf, 10, 8); l.scale.y = 1.25; add(l, x, 0.9, z); add(this.sph(0.26, leaf, 8, 6), x + 0.22, 1.25, z - 0.1); }
    this.roomLights = [[3.4, 3.3, 2.2], [-3.4, 3.3, -2.2]].map(([x, y, z]) => { const l = new THREE.PointLight(0xffe6c8, 0, 22, 1.5); l.position.set(x, y, z); g.add(l); return l; });
    // everything that stands against the wall, and which way from the middle it is: see update()
    this.roomWall = g.children.filter((o) => Math.hypot(o.position.x, o.position.z) > 5.4).map((o) => { const d = Math.hypot(o.position.x, o.position.z); return { o, x: o.position.x / d, z: o.position.z / d }; });
  }
  // Going indoors and coming out again: which floor you stand on, and what you bump into.
  setInside(on) { this.inside = !!on; this.room.visible = this.inside; this.w.colliders.top = this.inside ? this.roomColliders : this.colliders; }

  // ---------- every frame ----------
  update(dt, S, focus, ctx = {}) {
    this.carOn = !!ctx.carOn; this.t += dt; const t = this.t, w = this.w, F = S ? S.flow : null, sn = F ? F.sun : { e: 0.3, u: 0.8, n: -0.3, elev: 50, hour: 12 }, tau = F ? F.tau : 0.45, cam = w.camera.position;
    this.sunDir.set(sn.e, sn.u, -sn.n).normalize();
    const day = Math.pow(clamp((sn.elev + 8) / 16, 0, 1), 1.5), low = clamp(1 - Math.abs(sn.elev - 2) / 14, 0, 1), dusty = clamp((tau - 0.4) / 3.5, 0, 1), night = 1 - clamp((sn.elev + 6) / 8, 0, 1); this.night = night;
    // sky colours
    const U = this.skyU, k = day * (1 - 0.22 * dusty), hor = lin(lerp(0.035, lerp(0.86, 0.68, dusty), k), lerp(0.03, lerp(0.7, 0.48, dusty), k), lerp(0.03, lerp(0.54, 0.31, dusty), k)), zen = lin(lerp(0.012, lerp(0.6, 0.56, dusty), k), lerp(0.012, lerp(0.46, 0.39, dusty), k), lerp(0.016, lerp(0.35, 0.25, dusty), k));
    U.uHor.value.setRGB(...hor); U.uZen.value.setRGB(...zen); U.uSun.value.copy(this.sunDir);
    U.uGlow.value.setRGB(...lin(lerp(1, 0.6, low), lerp(0.93, 0.74, low), lerp(0.82, 0.98, low))); U.uWide.value = (0.1 + 0.75 * low) * (1 - 0.6 * dusty) * clamp((sn.elev + 9) / 9, 0, 1); U.uTight.value = clamp((sn.elev + 1.2) / 2.4, 0, 1) * (1 - 0.8 * dusty);
    this._sky2(S, sn, night, day, dusty, cam);
    this.sky.position.copy(cam); this.stars.position.copy(cam); this.starMat.opacity = night * clamp(1 - tau / 2.5, 0, 1) * 0.9; this.skyline.position.set(cam.x, T.heightAt(cam.x, cam.z), cam.z);
    const light = clamp(0.06 + 0.94 * day * (0.45 + 0.55 * (F ? F.direct : 0.6)), 0, 1); this.lineU.uRock.value.setRGB(...lin(0.42 * light, 0.26 * light, 0.19 * light)); this.lineU.uSky.value.setRGB(...hor);
    // haze
    const fog = w.scene.fog || (w.scene.fog = new THREE.Fog(0xc9a27a, 400, 5200)); fog.color.setRGB(...hor); fog.near = lerp(700, 30, dusty); fog.far = lerp(5200, 800, Math.pow(dusty, 0.7)); w.scene.background = fog.color;
    // light
    const direct = F ? F.direct : 0.6, sl = w.sunLight; sl.color.setRGB(...lin(1, lerp(0.9, 0.62, Math.max(low, dusty)), lerp(0.78, 0.4, Math.max(low, dusty)))); sl.intensity = 3.8 * clamp(sn.elev / 9, 0, 1) * (0.2 + 0.8 * direct) * (1 - 0.5 * dusty);
    if (w.Q && w.Q.every > 1) { this._sf = (this._sf || 0) + 1; if (this._sf % w.Q.every === 0) sl.shadow.needsUpdate = true; }   // lighter settings redraw the shadow map every other frame
    sl.target.position.set(focus.x, focus.y, focus.z); sl.position.copy(sl.target.position).addScaledVector(TMP.copy(this.sunDir).setY(Math.max(this.sunDir.y, 0.07)).normalize(), 300); sl.castShadow = sn.elev > 1.5 && direct > 0.08 && (!w.Q || w.Q.shadow > 0);
    w.hemi.color.setRGB(...hor); w.hemi.groundColor.setRGB(...lin(0.4, 0.24, 0.16)); w.hemi.intensity = 0.1 + day * (0.7 + 0.7 * dusty);   // in a dust storm most of the light comes from the whole sky, not the Sun's disc w.earthLight.intensity = 0;
    for (const m of this.windows) m.emissiveIntensity = 0.25 + 1.9 * night; for (const l of this.lights) l.intensity = 260 * night;
    // the rover is the only vehicle here
    w.car.visible = true; w.ship.visible = false; if (w.dig) w.dig.visible = false; if (w.carLamp) w.carLamp.intensity = ctx.carOn && night > 0.3 ? 40 : 0; if (w.shipLamp) w.shipLamp.intensity = 0; if (w.digLamp) w.digLamp.intensity = 0;
    // machines
    const on = (id) => !S || !id || S.on[id];
    for (const s of this.spin) if (on(s.id)) s.o.rotation[s.axis] += dt * s.sp * (s.wind && S ? 0.3 + S.wind / 5 : 1);
    const H = clamp(Math.atan2(this.sunDir.x, Math.max(this.sunDir.y, 0.05)), -0.9, 0.9), tilt = sn.elev > 0 ? -H : 0; for (const p of this.panels) p.rotation.z += (tilt - p.rotation.z) * Math.min(1, dt * 0.8);   // the panels turn from east to west with the Sun
    if (S) this.M.solar.color.lerpColors(this.solarClean, this.solarDusty, clamp(S.panelDust * 2.2, 0, 1));
    if (this.dish) { const e = TMP.copy(this.sunDir); e.y = Math.max(e.y, 0.25); e.normalize(); const yaw = Math.atan2(e.x, e.z), pit = -Math.asin(e.y); this.dish.rotation.y += (yaw - this.dish.rotation.y) * Math.min(1, dt * 0.5); this.dish.rotation.x += (pit - this.dish.rotation.x) * Math.min(1, dt * 0.5); }   // Earth is never far from the Sun in Mars's sky
    this.pump.emissiveIntensity = on('thermal') ? 0.8 + 0.8 * Math.sin(t * 4) : 0.05; this.M.hot.emissiveIntensity = on('isru') ? 1.3 + 0.5 * Math.sin(t * 7) : 0.1; this.M.grow.emissiveIntensity = on('greenhouse') ? 1.4 : 0.1; this.padRing.emissiveIntensity = S && S.car.charging ? 1.2 + Math.sin(t * 5) : 0.6;
    if (S) for (const id in this.lamps) this.lamps[id].emissive.setHex(!S.on[id] || (S.fault && (S.fault[id] || (id === 'power' && (S.fault.battery || S.fault.solar)))) ? 0xff3b30 : F.eff < 1 ? 0xffa424 : 0x4dff88);
    // dust in the air drifts with the wind
    { const p = this.air.geometry.attributes.position, wd = S ? S.windDir : 4, ws = S ? S.wind : 4, vx = Math.cos(wd) * ws, vz = Math.sin(wd) * ws; this.air.position.set(cam.x, T.heightAt(cam.x, cam.z), cam.z); this.airMat.opacity = clamp(0.1 + 0.16 * tau, 0, 0.75) * (0.3 + 0.7 * day); this.airMat.size = 0.09 + 0.02 * Math.min(tau, 4);
      for (let i = 0; i < p.count; i++) { let x = p.getX(i) + vx * dt, y = p.getY(i) + Math.sin(t * 0.7 + i) * 0.2 * dt, z = p.getZ(i) + vz * dt; if (x > 35) x -= 70; else if (x < -35) x += 70; if (z > 35) z -= 70; else if (z < -35) z += 70; p.setXYZ(i, x, clamp(y, 0, 14), z); } p.needsUpdate = true; }
    // kicked-up dust falls back in Mars's gravity
    { const p = this.puffs.geometry.attributes.position; let any = false; for (let i = 0; i < this.puffV.length; i++) { const v = this.puffV[i]; if (v[3] <= 0) continue; any = true; v[3] -= dt; v[1] -= 3.73 * dt * 0.35; p.setXYZ(i, p.getX(i) + v[0] * dt, Math.max(p.getY(i) + v[1] * dt, -999), p.getZ(i) + v[2] * dt); if (v[3] <= 0) p.setY(i, -999); } if (any) p.needsUpdate = true; }
    // a dust devil: warm ground on a clear afternoon spins up a whirl of dust that wanders with the wind
    { const D = this.devilAt, warm = sn.hour > 10.5 && sn.hour < 16.5 && tau < 1.5; D.t -= dt; if (D.t <= 0) { D.t = 30 + Math.random() * 40; if (warm && D.on <= 0) { const a = Math.random() * 6.283; D.x = cam.x + Math.cos(a) * 320; D.z = cam.z + Math.sin(a) * 320; D.on = 26; } }
      const p = this.devil.geometry.attributes.position; if (D.on > 0) { D.on -= dt; const wd = S ? S.windDir : 4; D.x += Math.cos(wd) * 4 * dt; D.z += Math.sin(wd) * 4 * dt; const y0 = T.heightAt(D.x, D.z), fade = clamp(Math.min(D.on, 26 - D.on) / 4, 0, 1); this.devil.material.opacity = 0.34 * fade;
        for (const [hf, a0, rr, i] of this.devilSeed) { const h = ((hf + t * 0.12 * rr) % 1), r = (1.2 + h * 5.5) * rr, a = a0 + t * (3.2 - h * 1.6); p.setXYZ(i, D.x + Math.cos(a) * r + Math.sin(h * 5 + t) * 1.2, y0 + h * 42, D.z + Math.sin(a) * r); } p.needsUpdate = true; this.devil.visible = true; } else this.devil.visible = false; }
    if (this.beacon.visible) this.beacon.material.opacity = 0.1 + 0.06 * Math.sin(t * 3);
    // indoors: the room's own lamps, and none of the weather. With the power out, the lamps go dim and orange.
    this.air.visible = !this.inside;
    if (this.inside) { const ok = !F || F.eff >= 1; sl.intensity = 0; sl.castShadow = false; w.hemi.color.setRGB(...lin(1, 0.95, 0.88)); w.hemi.groundColor.setRGB(...lin(0.42, 0.4, 0.38)); w.hemi.intensity = ok ? 1.25 : 0.22;
      fog.near = 5000; fog.far = 9000; this.devil.visible = false; this.beacon.visible = false; w.car.visible = false; for (const l of this.lights) l.intensity = 0;
      for (const l of this.roomLights) { l.intensity = ok ? 24 : 9; l.color.setHex(ok ? 0xffe6c8 : 0xff7a3c); }
      this.roomGlow.emissiveIntensity = ok ? 1.6 : 0.2; this.roomLamp.emissive.setHex(ok ? 0x4dff88 : 0xffa424); this.roomScreen.emissiveIntensity = ok ? 0.9 + 0.12 * Math.sin(t * 2.3) : 0.1; this.roomHolo.rotation.y += dt * 0.4;
      this.portMat.emissive.setRGB(...hor); this.portMat.emissiveIntensity = 0.6 + 1.1 * day;
      // the camera may stand outside the wall and look in: whatever is fixed to the wall on its side would be in the way
      const cx = cam.x - T.ROOM.x, cz = cam.z - T.ROOM.z, cd = Math.hypot(cx, cz), out = cd > T.ROOM.r - 0.25; for (const q of this.roomWall) q.o.visible = !(out && (q.x * cx + q.z * cz) / cd > 0.42); }
  }
}
const TMP = new V3();
