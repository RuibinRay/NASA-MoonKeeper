// MOONKEEPER — Mars: the Map. The corner map, and the big Map window with its five pages:
// the outpost and the ground you can walk (zoom, drag, point at things, click to be shown the way),
// the region and the planet from NASA's MOLA elevation data (move the pointer to read the real height), and "Why here?".
import { tt } from '../i18n.js';
import { MARS, LOADS } from './sim.js';
import * as T from './terrain.js';
import { SITE, GLOBAL, REGION, SKYLINE } from './mola.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), TAU = Math.PI * 2;
// ---- what each building is part of: its colour on the map ----
export const SYSTEMS = {
  crew: ['#f4efe8', tt('Where the crew live and work')], air: ['#8fe3ff', tt('Air and oxygen')], water: ['#4da3ff', tt('Water')], food: ['#86dc6f', tt('Food')],
  power: ['#ffd257', tt('Power')], heat: ['#ff8a5c', tt('Heat')], science: ['#c9a6ff', tt('Science')], comms: ['#ff9fd6', tt('Radio to Earth')], rover: ['#ffb347', tt('The rover')],
};
export const SYS_OF = { cmd: 'crew', living: 'crew', medical: 'crew', airlock: 'crew', lifesupport: 'air', isru: 'air', water: 'water', greenhouse: 'food', storage: 'food', power: 'power', thermal: 'heat', lab: 'science', comms: 'comms', garage: 'rover' };
// Pipes and cables between the buildings, as they lie on the ground (the same runs js/mars/world.js builds in 3D).
const B = T.B, RUNS = [
  ['water', B.water.x - 2, B.water.z + 3.4, T.DRILL.x - 1, T.DRILL.z - 1], ['water', B.water.x - 3.8, B.water.z - 2, B.lifesupport.x + 6, B.lifesupport.z + 3],
  ['air', B.isru.x - 6, B.isru.z - 3, B.lifesupport.x + 7.2, B.lifesupport.z - 2], ['heat', B.thermal.x - 3, B.thermal.z + 1, B.lifesupport.x + 7, B.lifesupport.z + 1], ['heat', B.thermal.x - 2, B.thermal.z - 3, B.greenhouse.x + 5, B.greenhouse.z + 12],
  ...['cmd', 'isru', 'water', 'comms', 'garage', 'thermal', 'storage'].map((id) => ['power', B.power.x, B.power.z - 2.4, B[id].door[0] + 1.5, B[id].door[1] + 1.5]),
  ['power', B.power.x, B.power.z + 2.4, (T.SOLAR.x0 + T.SOLAR.x1) / 2, T.SOLAR.z0 + 2], ['power', B.power.x + 4, B.power.z, T.REACTOR.x - 2, T.REACTOR.z],
];
// Colours for heights on the planet map: blue is low, red is high, white is the top of the great volcanoes.
const RAMP = [[-8000, 38, 30, 105], [-5000, 40, 90, 190], [-3000, 60, 160, 172], [-1000, 92, 172, 96], [1000, 204, 192, 84], [3000, 212, 132, 62], [6000, 178, 72, 52], [10000, 150, 112, 104], [21000, 255, 255, 255]];
export const ramp = (m) => { let i = 1; while (i < RAMP.length - 1 && m > RAMP[i][0]) i++; const a = RAMP[i - 1], b = RAMP[i], k = clamp((m - a[0]) / (b[0] - a[0]), 0, 1); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; };
const PLACES = [[SITE.lat, SITE.lon, tt('Our outpost'), 1], [18.65, 226.2, tt('Olympus Mons')], [-14.01, 301.41, tt('Valles Marineris')], [18.41, 77.69, tt('Jezero (Perseverance)')], [-4.5, 137.4, tt('Gale (Curiosity)')], [4.502, 135.623, tt('InSight')], [47.67, 134.28, tt('Viking 2')], [68.22, 234.25, tt('Phoenix')]];
const KM_LAT = (Math.PI * 3389.5) / 180, KM_LON = KM_LAT * Math.cos((SITE.lat * Math.PI) / 180);   // km in one degree at the outpost (Mars's mean radius: 3,389.5 km)
// ---- pure helpers, checked by tools/mars_test.mjs ----
// Height (m) of the real ground at a point of the region map: east and north of the outpost in km. null outside the map.
export function regionHeight(eKm, nKm) { const n = REGION.n, half = REGION.km / 2; if (Math.abs(eKm) > half || Math.abs(nKm) > half) return null;
  const fi = clamp(((eKm + half) / REGION.km) * n - 0.5, 0, n - 1.001), fj = clamp(((half - nKm) / REGION.km) * n - 0.5, 0, n - 1.001), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j, d = REGION.data;
  return (d[j * n + i] * (1 - u) + d[j * n + i + 1] * u) * (1 - v) + (d[(j + 1) * n + i] * (1 - u) + d[(j + 1) * n + i + 1] * u) * v; }
// Height (m) on the planet map at a latitude and east longitude.
export const planetHeight = (lat, lon) => GLOBAL.min + GLOBAL.step * GLOBAL.data[clamp(Math.floor(90 - lat), 0, GLOBAL.h - 1) * GLOBAL.w + (((Math.floor(lon) % 360) + 360) % 360)];
// Where a place on Mars lies on the region map (km east and north of the outpost).
export const fromLatLon = (lat, lon) => [(lon - SITE.lon) * KM_LON, (lat - SITE.lat) * KM_LAT];
// The highest point of the skyline as seen from the outpost: which way, how far, how high above level.
export function skylinePeak() { let k = 0; for (let i = 1; i < SKYLINE.n; i++) if (SKYLINE.deg100[i] > SKYLINE.deg100[k]) k = i; const bearing = (k / SKYLINE.n) * 360, km = SKYLINE.km[k], a = (bearing * Math.PI) / 180; return { bearing, km, deg: SKYLINE.deg100[k] / 100, e: Math.sin(a) * km, n: Math.cos(a) * km }; }
export const compass = (deg) => [tt('north'), tt('north-east'), tt('east'), tt('south-east'), tt('south'), tt('south-west'), tt('west'), tt('north-west')][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
// the same eight directions as whole phrases ("8 km to the north"), so each language picks its own preposition
export const toward = (deg) => [tt('to the north'), tt('to the north-east'), tt('to the east'), tt('to the south-east'), tt('to the south'), tt('to the south-west'), tt('to the west'), tt('to the north-west')][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
// The view after zooming by k (k < 1 zooms in) while the point under the pointer (fx, fy: 0…1 across the picture) stays put.
export function zoomAt(view, k, fx, fy) { const span = clamp(view.span * k, 40, 830), wx = view.cx + (fx * 2 - 1) * view.span, wz = view.cz + (fy * 2 - 1) * view.span; return clampView({ span, cx: wx - (fx * 2 - 1) * span, cz: wz - (fy * 2 - 1) * span }); }
export function clampView(v) { const lim = Math.max(0, 830 - v.span * 0.5); return { span: v.span, cx: clamp(v.cx, -lim, lim), cz: clamp(v.cz, -lim, lim) }; }

export function makeMarsMap(env) {
  const { G, ui, pill, INFO, SHORT, POI, TOUR } = env, P = G.player, cam = G.cam; let relief = null, regionCv = null, planetCv = null; const trail = []; let hits = [];
  const S = () => env.state(), status = (id) => { const s = S(); return !s ? 'ok' : s.fault && (s.fault[id] || (id === 'power' && (s.fault.battery || s.fault.solar))) ? 'bad' : LOADS[id] && !s.on[id] ? 'off' : LOADS[id] && s.flow.eff < 1 ? 'low' : 'ok'; };
  const text = (c, s, x, y, col = '#fff', font = '600 11px Inter,sans-serif', align = 'center') => { c.save(); c.setLineDash([]); c.font = font; c.textAlign = align; c.textBaseline = 'middle'; c.lineWidth = 3; c.lineJoin = 'round'; c.strokeStyle = 'rgba(20,8,4,.88)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y); c.restore(); };
  const metres = (m) => (m < 0 ? '−' : '') + Math.abs(Math.round(m)).toLocaleString() + ' m';

  // ---------- the ground, drawn once: colour by height, shaded from the north-west, a line every 2 m ----------
  const FAR = { x0: -800, z0: -800, size: 1600, n: 1000 }, NEAR = { x0: -210, z0: -190, size: 440, n: 880 }; let reliefNear = null;
  function buildRelief({ x0, z0, size, n: N }) {
    const MPP = size / N, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), im = c.createImageData(N, N), d = im.data, h = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) h[j * (N + 1) + i] = T.heightAt(i * MPP + x0, j * MPP + z0);
    const ic = T.ICE_CRATER;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k0 = j * (N + 1) + i, a = h[k0], r1 = h[k0 + 1], b1 = h[k0 + N + 1], x = (i + 0.5) * MPP + x0, z = (j + 0.5) * MPP + z0, t = clamp((a + 10) / 26, 0, 1);
      let r = 146 + 78 * t, g = 84 + 80 * t, b = 54 + 62 * t; const dm = T.duneMask(x, z); if (dm > 0) { r *= 1 - 0.34 * dm; g *= 1 - 0.36 * dm; b *= 1 - 0.26 * dm; }
      const qi = Math.hypot(x - ic.x, z - ic.z) / ic.r; if (qi < 0.62) { const w = clamp((0.62 - qi) / 0.2, 0, 1) * 0.85; r += (222 - r) * w; g += (238 - g) * w; b += (250 - b) * w; }
      let sh = clamp(0.84 + (((a - r1) + (a - b1)) / MPP) * 0.67, 0.42, 1.28); const grad = Math.hypot(r1 - a, b1 - a);   // rise across one dot
      if (grad > 0.004) { const line = (step, wide) => clamp(1 - Math.abs(a - Math.round(a / step) * step) / (grad * wide), 0, 1); sh *= 1 - Math.max(0.42 * line(10, 1.05), 0.2 * line(2, 0.75)); }
      const k = (j * N + i) * 4; d[k] = clamp(r * sh, 0, 255); d[k + 1] = clamp(g * sh, 0, 255); d[k + 2] = clamp(b * sh, 0, 255); d[k + 3] = 255; }
    c.putImageData(im, 0, 0); return cv;
  }
  const shape = (c, b, x, z, sc, grow = 0) => { const r = Math.max(3, (b.r || 6) * sc) + grow; c.beginPath();
    if (b.long) { const lx = Math.abs(b.long[0]) * sc + r, lz = Math.abs(b.long[1]) * sc + r; c.roundRect(x - lx, z - lz, lx * 2, lz * 2, Math.min(lx, lz)); }
    else if (b.id === 'garage') c.roundRect(x - Math.max(5, 8.5 * sc) - grow, z - Math.max(3.5, 5.5 * sc) - grow, Math.max(10, 17 * sc) + grow * 2, Math.max(7, 11 * sc) + grow * 2, 2);
    else c.arc(x, z, r, 0, TAU); };

  // ---------- the outpost and the ground you can walk. view = { cx, cz, span } in metres; opt.big = the Map window ----------
  function paintLocal(c, W, H, view, opt = {}) {
    const big = !!opt.big, s = S(), sc = W / (2 * view.span), X = (x) => (x - view.cx) * sc + W / 2, Z = (z) => (z - view.cz) * sc + H / 2, near = sc > 1.15; relief = relief || buildRelief(FAR); hits = big ? [] : hits;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#4a2a1c'; c.fillRect(0, 0, W, H); c.imageSmoothingEnabled = true;
    const ground = (cv, R) => { const k = R.n / R.size, x1 = Math.max(view.cx - view.span, R.x0), z1 = Math.max(view.cz - view.span, R.z0), x2 = Math.min(view.cx + view.span, R.x0 + R.size), z2 = Math.min(view.cz + view.span, R.z0 + R.size); if (x2 > x1 && z2 > z1) c.drawImage(cv, (x1 - R.x0) * k, (z1 - R.z0) * k, (x2 - x1) * k, (z2 - z1) * k, X(x1), Z(z1), (x2 - x1) * sc, (z2 - z1) * sc); };
    ground(relief, FAR); if (big && sc > 0.9) { reliefNear = reliefNear || buildRelief(NEAR); ground(reliefNear, NEAR); }
    // a faint grid: 100 m squares, 25 m when you are close
    if (big) { const g = near ? 25 : 100; c.lineWidth = 1; for (let x = Math.ceil((view.cx - view.span) / g) * g; x <= view.cx + view.span; x += g) { c.strokeStyle = x % 100 === 0 ? 'rgba(255,235,215,.13)' : 'rgba(255,235,215,.06)'; c.beginPath(); c.moveTo(X(x), 0); c.lineTo(X(x), H); c.stroke(); }
      for (let z = Math.ceil((view.cz - view.span) / g) * g; z <= view.cz + view.span; z += g) { c.strokeStyle = z % 100 === 0 ? 'rgba(255,235,215,.13)' : 'rgba(255,235,215,.06)'; c.beginPath(); c.moveTo(0, Z(z)); c.lineTo(W, Z(z)); c.stroke(); } }
    c.strokeStyle = 'rgba(255,220,190,.45)'; c.lineWidth = 1.5; c.setLineDash([6, 6]); c.beginPath(); c.arc(X(0), Z(0), T.PLAY_R * sc, 0, TAU); c.stroke(); c.setLineDash([]);
    // the landing pad, the solar field, the pipes and cables
    c.fillStyle = '#2b2a29'; c.beginPath(); c.arc(X(T.PAD.x), Z(T.PAD.z), T.PAD.r * sc, 0, TAU); c.fill(); c.strokeStyle = '#ffd257'; c.lineWidth = 1; c.setLineDash([3, 3]); c.beginPath(); c.arc(X(T.PAD.x), Z(T.PAD.z), T.PAD.r * sc * 0.82, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#f2ede6'; c.beginPath(); c.arc(X(T.PAD.x), Z(T.PAD.z), Math.max(2.5, 3.6 * sc), 0, TAU); c.fill();
    if (sc > 0.5) { c.lineCap = 'round'; for (const [sys, x0, z0, x1, z1] of RUNS) { const pw = sys === 'power'; c.strokeStyle = pw ? 'rgba(20,14,10,.42)' : SYSTEMS[sys][0]; c.globalAlpha = pw ? 1 : 0.85; c.lineWidth = pw ? Math.max(1, 0.5 * sc) : Math.max(1.4, 0.8 * sc); c.beginPath(); c.moveTo(X(x0), Z(z0)); c.lineTo(X(x1), Z(z1)); c.stroke(); } c.globalAlpha = 1; }
    { const dust = s ? clamp(s.panelDust * 2.2, 0, 1) : 0; c.fillStyle = `rgb(${Math.round(28 + 100 * dust)},${Math.round(52 + 34 * dust)},${Math.round(128 - 66 * dust)})`; c.strokeStyle = 'rgba(190,215,255,.55)'; c.lineWidth = 1;
      for (let r = 0; r < T.SOLAR.rows; r++) for (let k = 0; k < T.SOLAR.cols; k++) { const [x, z] = T.panelAt(r, k), w = Math.max(2, 8.4 * sc), h = Math.max(1.2, 4.2 * sc); c.fillRect(X(x) - w / 2, Z(z) - h / 2, w, h); if (near) c.strokeRect(X(x) - w / 2, Z(z) - h / 2, w, h); } }
    c.lineCap = 'butt'; for (const [a, b, d, e] of T.TUNNELS) { c.strokeStyle = '#3a2418'; c.lineWidth = Math.max(2, 3.4 * sc); c.beginPath(); c.moveTo(X(a), Z(b)); c.lineTo(X(d), Z(e)); c.stroke(); c.strokeStyle = '#e4d6c2'; c.lineWidth = Math.max(1, 2.4 * sc); c.stroke(); }
    // the fission unit and the ice well
    { const x = X(T.REACTOR.x), z = Z(T.REACTOR.z), r = Math.max(3.5, 2.6 * sc); c.fillStyle = '#ffd257'; c.strokeStyle = '#2a160e'; c.lineWidth = 1; c.beginPath(); c.arc(x, z, r, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#2a160e'; c.beginPath(); c.arc(x, z, r * 0.35, 0, TAU); c.fill(); if (big) hits.push({ x, y: z, r: r + 6, id: 'reactor', kind: 'poi' }); }
    { const x = X(T.DRILL.x), z = Z(T.DRILL.z), r = Math.max(3, 1.8 * sc); c.fillStyle = '#4da3ff'; c.strokeStyle = '#2a160e'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, z - r); c.lineTo(x + r, z); c.lineTo(x, z + r); c.lineTo(x - r, z); c.closePath(); c.fill(); c.stroke(); if (big) hits.push({ x, y: z, r: r + 6, id: 'drill', kind: 'poi' }); }
    // the 14 buildings: coloured by what they are part of; red and crossed when switched off, amber when short of power
    for (const b of T.BUILDINGS) { const x = X(b.x), z = Z(b.z), st = status(b.id) === 'bad' ? 'off' : status(b.id), col = SYSTEMS[SYS_OF[b.id]][0];
      if (G.goal && G.goal.id === b.id) { shape(c, b, x, z, sc, 4); c.fillStyle = 'rgba(255,210,31,.35)'; c.fill(); }
      shape(c, b, x, z, sc); c.fillStyle = st === 'off' ? '#3a1c16' : col; c.fill(); c.strokeStyle = st === 'off' ? '#ff5a4a' : st === 'low' ? '#ffb347' : '#2a160e'; c.lineWidth = st === 'ok' ? 1 : 2; c.stroke();
      if (st === 'off') { const r = Math.max(3, (b.r || 5) * sc * 0.5); c.strokeStyle = '#ff5a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - r, z - r); c.lineTo(x + r, z + r); c.moveTo(x + r, z - r); c.lineTo(x - r, z + r); c.stroke(); }
      if (near && big) { c.fillStyle = '#2a160e'; c.beginPath(); c.arc(X(b.door[0]), Z(b.door[1]), Math.max(1.5, 0.7 * sc), 0, TAU); c.fill(); }
      if (big) hits.push({ x, y: z, r: Math.max(9, ((b.r || 6) + (b.long ? Math.max(Math.abs(b.long[0]), Math.abs(b.long[1])) : 0)) * sc + 3), id: b.id, kind: 'building' }); }
    if (big && near) for (const b of T.BUILDINGS) { const x = X(b.x), z = Z(b.z), r = Math.max(3, (b.r || 6) * sc), up = ['lifesupport', 'medical', 'lab', 'thermal', 'greenhouse'].includes(b.id); if (G.goal && G.goal.id === b.id) continue; text(c, SHORT[b.id], x, z + (up ? -1 : 1) * ((b.long ? Math.abs(b.long[1]) * sc : b.id === 'garage' ? 5.5 * sc - r : 0) + r + 9), status(b.id) === 'off' ? '#ffb1a8' : '#fff'); }
    else if (big) text(c, tt('The outpost'), X(8), Z(-52), '#fff', '700 12px Inter,sans-serif');
    // places: named once you have found them, a question mark until then
    if (big) for (const p of POI) { if (p.id === 'reactor' || p.id === 'drill' || p.id === 'solar') { if (s && s.seen[p.id] && near) text(c, p.name, X(p.x), Z(p.z) + (p.id === 'solar' ? 34 * sc : -12), '#ffe2b5'); continue; }
      const x = X(p.x), z = Z(p.z), found = s && s.seen[p.id]; c.lineWidth = 1.5; c.strokeStyle = found ? '#ffe2b5' : 'rgba(255,226,181,.75)'; c.fillStyle = found ? 'rgba(255,226,181,.25)' : 'rgba(30,14,8,.55)'; c.beginPath(); c.arc(x, z, 8, 0, TAU); c.fill(); c.stroke();
      text(c, found ? '◆' : '?', x, z + 0.5, '#ffe2b5', '700 11px Inter,sans-serif'); if (found) text(c, p.name, x, z - 16, '#ffe2b5'); hits.push({ x, y: z, r: 13, id: p.id, kind: 'poi' }); }
    // the way you have come
    if (trail.length > 1) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = big ? 2 : 1.5; c.lineJoin = 'round'; c.setLineDash([2, 5]); c.beginPath(); trail.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)))); c.lineTo(X(P.pos.x), Z(P.pos.z)); c.stroke(); c.setLineDash([]); }
    // the crew who are outdoors, and the rover
    for (const n of env.crew()) { if (n.inside) continue; const x = X(n.x), z = Z(n.z); c.fillStyle = '#' + n.color.toString(16).padStart(6, '0'); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, z, big ? 5 : 4, 0, TAU); c.fill(); c.stroke(); if (big) { if (near) text(c, n.short, x + 9, z, '#fff', '600 11px Inter,sans-serif', 'left'); hits.push({ x, y: z, r: 11, id: n.id, kind: 'crew', name: n.short }); } }
    { const x = X(G.car.x), z = Z(G.car.z); c.save(); c.translate(x, z); c.rotate(-G.car.yaw); c.fillStyle = '#49e6ff'; c.strokeStyle = '#06222b'; c.lineWidth = 1.2; c.beginPath(); c.roundRect(-4, -6, 8, 12, 2); c.fill(); c.stroke(); c.fillStyle = '#06222b'; c.fillRect(-3, 2, 6, 2); c.restore(); if (big) hits.push({ x, y: z, r: 11, id: 'car', kind: 'rover' }); }
    // the yellow line: the same way the guide on the ground takes, round the buildings
    if (G.goal && !env.inRoom()) { const g = G.goal, pts = T.routeAround(G.world.colliders.top, P.pos.x, P.pos.z, g.x, g.z, P.in === 'car' ? 2.4 : 1.1); c.lineJoin = 'round'; c.lineCap = 'round';
      for (const [col, w, dash] of [['rgba(60,35,0,.7)', big ? 6 : 4.5, []], ['#ffd21f', big ? 3 : 2.5, [7, 6]]]) { c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.beginPath(); pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z)))); c.stroke(); } c.setLineDash([]); c.lineCap = 'butt';
      c.strokeStyle = '#ffd21f'; c.lineWidth = 2; c.beginPath(); c.arc(X(g.x), Z(g.z), 7, 0, TAU); c.stroke(); if (big) text(c, `${g.name} · ${Math.round(Math.hypot(g.x - P.pos.x, g.z - P.pos.z))} m`, X(g.x), Z(g.z) + 17, '#ffe98a'); }
    // you: an arrow, and the part of the ground you are looking at
    { const x = X(P.pos.x), z = Z(P.pos.z); c.save(); c.translate(x, z); c.rotate(-cam.yaw); if (!env.inRoom()) { const gr = c.createRadialGradient(0, 0, 4, 0, 0, big ? 70 : 46); gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, big ? 70 : 46, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); c.closePath(); c.fill(); }
      c.fillStyle = '#fff'; c.strokeStyle = '#0b0e12'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 9); c.lineTo(0, 4); c.lineTo(-8, 9); c.closePath(); c.fill(); c.stroke(); c.restore(); if (env.inRoom() && big) text(c, tt('You are indoors'), x, z - 18, '#fff'); }
    // round the edge: where the Sun is, which way the wind blows, north, and a scale
    if (s) { const sn = s.flow.sun, m = big ? 20 : 12; if (sn.elev > -1) { const a = Math.atan2(sn.e, sn.n), x = W / 2 + Math.sin(a) * (W / 2 - m), y = H / 2 - Math.cos(a) * (H / 2 - m); c.fillStyle = '#ffe07a'; c.strokeStyle = 'rgba(60,35,0,.8)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, big ? 7 : 5, 0, TAU); c.fill(); c.stroke(); if (big) { for (let i = 0; i < 8; i++) { const q = (i * TAU) / 8; c.beginPath(); c.moveTo(x + Math.cos(q) * 9.5, y + Math.sin(q) * 9.5); c.lineTo(x + Math.cos(q) * 13, y + Math.sin(q) * 13); c.strokeStyle = '#ffe07a'; c.stroke(); } hits.push({ x, y, r: 14, id: 'sun', kind: 'info', name: tt`The Sun: ${Math.round(sn.elev)}° above the horizon, ${toward((Math.atan2(sn.e, sn.n) * 180) / Math.PI)}` }); } }
      if (big) { const x = W - 44, y = 58, a = s.windDir; c.save(); c.translate(x, y); text(c, tt('wind'), 0, 26, '#ffe9d6', '600 10px Inter,sans-serif'); text(c, `${s.wind.toFixed(0)} m/s`, 0, 38, '#ffe9d6', '600 10px Inter,sans-serif'); c.rotate(Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2); c.strokeStyle = '#ffe9d6'; c.fillStyle = '#ffe9d6'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -8); c.stroke(); c.beginPath(); c.moveTo(0, -14); c.lineTo(5, -6); c.lineTo(-5, -6); c.closePath(); c.fill(); c.restore(); } }
    if (big) { const L = [1000, 500, 200, 100, 50, 20, 10].find((q) => q * sc < W * 0.3) || 10, px = L * sc, y = H - 18; c.strokeStyle = 'rgba(20,8,4,.85)'; c.lineWidth = 5; c.beginPath(); c.moveTo(18, y - 6); c.lineTo(18, y); c.lineTo(18 + px, y); c.lineTo(18 + px, y - 6); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); text(c, L + ' m', 18 + px / 2, y - 12);
      c.fillStyle = '#fff'; c.strokeStyle = 'rgba(20,8,4,.85)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(34, 20); c.lineTo(41, 42); c.lineTo(34, 37); c.lineTo(27, 42); c.closePath(); c.fill(); c.stroke(); text(c, 'N', 34, 52, '#fff', '700 12px Inter,sans-serif'); }
    else text(c, 'N', W / 2, 11, '#ffe9d6', '600 12px Inter,sans-serif');
  }

  // ---------- the region, from NASA's MOLA: 192 km across ----------
  const RW = 640;
  function buildRegion() {
    const cv = document.createElement('canvas'); cv.width = cv.height = RW; const c = cv.getContext('2d'), im = c.createImageData(RW, RW), d = im.data, kmpp = REGION.km / RW, half = REGION.km / 2, at = (i, j) => regionHeight(clamp((i + 0.5) * kmpp - half, -half, half), clamp(half - (j + 0.5) * kmpp, -half, half));
    const h = new Float32Array((RW + 1) * (RW + 1)); for (let j = 0; j <= RW; j++) for (let i = 0; i <= RW; i++) h[j * (RW + 1) + i] = at(i, j);
    for (let j = 0; j < RW; j++) for (let i = 0; i < RW; i++) { const k0 = j * (RW + 1) + i, a = h[k0], r1 = h[k0 + 1], b1 = h[k0 + RW + 1], t = clamp((a - REGION.min) / (REGION.max - REGION.min), 0, 1), tt2 = Math.pow(t, 0.7);
      let sh = clamp(0.86 + ((a - r1) + (a - b1)) * 0.012, 0.35, 1.4); if (Math.floor(a / 100) !== Math.floor(r1 / 100) || Math.floor(a / 100) !== Math.floor(b1 / 100)) sh *= Math.floor(a / 500) !== Math.floor(r1 / 500) || Math.floor(a / 500) !== Math.floor(b1 / 500) ? 0.6 : 0.84;
      const k = (j * RW + i) * 4; d[k] = clamp((112 + 126 * tt2) * sh, 0, 255); d[k + 1] = clamp((66 + 118 * tt2) * sh, 0, 255); d[k + 2] = clamp((46 + 100 * tt2) * sh, 0, 255); d[k + 3] = 255; }
    c.putImageData(im, 0, 0); return cv;
  }
  function paintRegion(c, W, mark) {
    regionCv = regionCv || buildRegion(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(regionCv, 0, 0, W, W); const px = W / REGION.km, half = REGION.km / 2, X = (e) => (e + half) * px, Y = (n) => (half - n) * px;
    // lines of latitude and longitude, every half degree
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,240,225,.2)';
    for (let lat = Math.ceil((SITE.lat - half / KM_LAT) * 2) / 2; lat <= SITE.lat + half / KM_LAT; lat += 0.5) { const y = Y((lat - SITE.lat) * KM_LAT); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); text(c, lat.toFixed(1) + '°N', W - 6, y - 8, 'rgba(255,240,225,.85)', '600 10px Inter,sans-serif', 'right'); }
    for (let lon = Math.ceil((SITE.lon - half / KM_LON) * 2) / 2; lon <= SITE.lon + half / KM_LON; lon += 0.5) { const x = X((lon - SITE.lon) * KM_LON); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, W); c.stroke(); text(c, lon.toFixed(1) + '°E', x + 4, W - 34, 'rgba(255,240,225,.85)', '600 10px Inter,sans-serif', 'left'); }
    c.setLineDash([4, 5]); c.strokeStyle = 'rgba(73,230,255,.5)'; for (const r of [25, 50, 75]) { c.beginPath(); c.arc(W / 2, W / 2, r * px, 0, TAU); c.stroke(); text(c, r + ' km', W / 2 + r * px * 0.707 + 4, W / 2 - r * px * 0.707 - 4, 'rgba(160,240,255,.9)', '600 10px Inter,sans-serif', 'left'); } c.setLineDash([]);
    // the hill that stands highest on the skyline, and the site a published study looked at
    { const pk = skylinePeak(); c.strokeStyle = '#ffd21f'; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(W / 2, W / 2); c.lineTo(X(pk.e), Y(pk.n)); c.stroke(); c.setLineDash([]); c.fillStyle = '#ffd21f'; c.beginPath(); c.moveTo(X(pk.e), Y(pk.n) - 7); c.lineTo(X(pk.e) + 6, Y(pk.n) + 5); c.lineTo(X(pk.e) - 6, Y(pk.n) + 5); c.closePath(); c.fill(); text(c, tt('The highest hill on our skyline'), X(pk.e), Y(pk.n) - 16, '#ffe98a'); }
    { const [e, n] = fromLatLon(39.89, 192.03); c.strokeStyle = '#d7a6ff'; c.lineWidth = 2; c.beginPath(); c.rect(X(e) - 5, Y(n) - 5, 10, 10); c.stroke(); text(c, tt('EM-16: a studied landing site'), X(e) + 10, Y(n), '#e6c8ff', '600 11px Inter,sans-serif', 'left'); }
    c.strokeStyle = '#49e6ff'; c.lineWidth = 2; c.beginPath(); c.arc(W / 2, W / 2, 8, 0, TAU); c.stroke(); c.fillStyle = '#49e6ff'; c.beginPath(); c.arc(W / 2, W / 2, 2.5, 0, TAU); c.fill(); text(c, tt('Our outpost'), W / 2 + 13, W / 2 + 12, '#fff', '700 12px Inter,sans-serif', 'left');
    if (mark) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(mark.x - 9, mark.y); c.lineTo(mark.x + 9, mark.y); c.moveTo(mark.x, mark.y - 9); c.lineTo(mark.x, mark.y + 9); c.stroke(); }
    const y = W - 16, L = 50 * px; c.strokeStyle = 'rgba(20,8,4,.85)'; c.lineWidth = 5; c.beginPath(); c.moveTo(16, y - 5); c.lineTo(16, y); c.lineTo(16 + L, y); c.lineTo(16 + L, y - 5); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); text(c, '50 km', 16 + L / 2, y - 11); text(c, 'N', W / 2, 11, '#fff', '700 12px Inter,sans-serif');
  }
  // ---------- the whole planet, from MOLA ----------
  function paintPlanet(c, W, H, mark) {
    if (!planetCv) { planetCv = document.createElement('canvas'); planetCv.width = GLOBAL.w; planetCv.height = GLOBAL.h; const cc = planetCv.getContext('2d'), im = cc.createImageData(GLOBAL.w, GLOBAL.h), d = im.data;
      for (let j = 0; j < GLOBAL.h; j++) for (let i = 0; i < GLOBAL.w; i++) { const k = j * GLOBAL.w + i, m = GLOBAL.min + GLOBAL.step * GLOBAL.data[k], e = GLOBAL.data[j * GLOBAL.w + ((i + 1) % GLOBAL.w)], so = GLOBAL.data[Math.min(GLOBAL.h - 1, j + 1) * GLOBAL.w + i], sh = clamp(1 + ((GLOBAL.data[k] - e) + (GLOBAL.data[k] - so)) * 0.03, 0.62, 1.3), [r, g, b] = ramp(m); d[k * 4] = clamp(r * sh, 0, 255); d[k * 4 + 1] = clamp(g * sh, 0, 255); d[k * 4 + 2] = clamp(b * sh, 0, 255); d[k * 4 + 3] = 255; }
      cc.putImageData(im, 0, 0); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(planetCv, 0, 0, W, H); const X = (lon) => (lon / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
    c.strokeStyle = 'rgba(10,10,20,.28)'; c.lineWidth = 1; for (let lat = -60; lat <= 60; lat += 30) { c.beginPath(); c.moveTo(0, Y(lat)); c.lineTo(W, Y(lat)); c.stroke(); text(c, lat === 0 ? tt('equator') : Math.abs(lat) + (lat > 0 ? '°N' : '°S'), 5, Y(lat) - 8, 'rgba(255,255,255,.85)', '600 10px Inter,sans-serif', 'left'); }
    for (let lon = 60; lon < 360; lon += 60) { c.beginPath(); c.moveTo(X(lon), 0); c.lineTo(X(lon), H); c.stroke(); text(c, lon + '°E', X(lon) + 4, H - 9, 'rgba(255,255,255,.85)', '600 10px Inter,sans-serif', 'left'); }
    for (const [lat, lon, name, us] of PLACES) { const x = X(lon), y = Y(lat); c.fillStyle = us ? '#49e6ff' : '#fff'; c.strokeStyle = '#0b0e12'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, us ? 6 : 3.5, 0, TAU); c.fill(); c.stroke(); const right = x > W - 150; text(c, name, x + (right ? -9 : 9), y, us ? '#bff6ff' : '#fff', us ? '700 12px Inter,sans-serif' : '600 11px Inter,sans-serif', right ? 'right' : 'left'); }
    if (mark) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(mark.x - 9, mark.y); c.lineTo(mark.x + 9, mark.y); c.moveTo(mark.x, mark.y - 9); c.lineTo(mark.x, mark.y + 9); c.stroke(); }
  }
  const heightBar = `<div class="hbar"><i style="background:linear-gradient(90deg,${RAMP.map(([m, r, g, b]) => `rgb(${r},${g},${b}) ${(((m + 8000) / 29000) * 100).toFixed(0)}%`).join(',')})"></i><span>−8 km</span><span>0</span><span>+10 km</span><span>+21 km</span></div>`;
  const WHY = () => `<p>${tt`The outpost stands at <b>${SITE.lat}°N, ${SITE.lon}°E</b>, on a flat bay of <b>Arcadia Planitia</b> among the small hills of the <b>Erebus Montes</b>. Four things decided it:`}</p>
    <div class="stat"><span>${tt`<b>Ice to drink and breathe.</b> Radar and fresh craters show sheets of water ice under Arcadia Planitia, in places only centimetres down.`}</span><b>${pill('obs')}</b></div>
    <div class="stat"><span>${tt`<b>Thick air to land in.</b> The ground here is ${Math.abs(SITE.elev).toLocaleString()} m below Mars's reference level (measured by NASA's MOLA laser), so there is more air above to slow a lander.`}</span><b>${pill('obs')}</b></div>
    <div class="stat"><span>${tt('<b>Flat, with few big rocks.</b> The plain tilts less than 1 m in every 100 m. The hills on the skyline are 16 km away.')}</span><b>${pill('obs')}</b></div>
    <div class="stat"><span>${tt('<b>Sun and warmth.</b> Far enough from the pole for solar panels to work all year. A published study of landing sites for large ships shortlisted places beside this one for the same reasons.')}</span><b>${pill('prop')}</b></div>
    <div class="learn">${tt('What is real and what is made up? The planet map, the region map, the tilt of the ground and the outline of the hills on the horizon are NASA elevation data. NASA\'s best whole-planet map has one height every 463 m, so the rocks, ripples and small craters you walk among are made for the game, modelled on what orbiters and landers see on plains like this. Every number and its source is in docs/MARS_SCIENCE.md.')}</div>`;

  // ---------- the Map window ----------
  const BASE = { cx: 10, cz: 36, span: 125 }, AREA = { cx: 0, cz: 0, span: 830 };
  const describe = (h) => { const s = S(), d = (x, z) => `${Math.round(Math.hypot(x - P.pos.x, z - P.pos.z))} m`;
    if (h.kind === 'building') { const b = T.B[h.id], st = status(h.id); return `<b>${INFO[h.id].name}</b> · ${d(b.door[0], b.door[1])}<br>${SYSTEMS[SYS_OF[h.id]][1]} · ${st === 'bad' ? tt('broken: mend it at its door') : st === 'off' ? tt('switched off') : st === 'low' ? tt('short of power') : LOADS[h.id] ? tt`running, ${s.flow.use[h.id].toFixed(1)} kW` : tt('working')}<br><i>${tt('Click to be shown the way')}</i>`; }
    if (h.kind === 'poi') { const p = POI.find((q) => q.id === h.id), found = s && s.seen[h.id]; return found ? `<b>${p.name}</b> · ${d(p.x, p.z)}<br><i>${tt('Click to be shown the way')}</i>` : `<b>${tt('Something to find')}</b> · ${d(p.x, p.z)}<br><i>${tt('Click to be shown the way')}</i>`; }
    if (h.kind === 'rover') return `<b>${tt('My Rover')}</b> · ${Math.round(s.car.charge * 100)}%${s.car.charging ? ' · ' + tt('charging') : ''}<br><i>${tt('Click to be shown the way')}</i>`;
    if (h.kind === 'crew') return `<b>${h.name}</b> · ${tt('outdoors')}`; return h.name || ''; };
  function open(start) {
    const TABS = [['base', tt('The outpost')], ['region', tt('The region (NASA data)')], ['planet', tt('The planet (NASA data)')], ['why', tt('Why here?')]]; let tab = start === 'area' ? 'base' : start || 'base', view = start === 'area' ? { ...AREA } : { ...BASE };
    const render = (w) => { clearInterval(ui._tick); const tabs = `<div class="tabs">${TABS.map(([k, v]) => `<button data-v="${k}" class="${k === tab ? 'on' : ''}">${v}</button>`).join('')}</div>`, body = w.querySelector('.win-b'), s = S();
      const canvas = (W, H) => `<div class="mapbox"><canvas id="bm" width="${W}" height="${H}"></canvas><div class="maptip hidden"></div></div>`, at = (cv, e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height, r]; };
      if (tab === 'why') body.innerHTML = tabs + WHY();
      else if (tab === 'planet') {
        body.innerHTML = `${tabs}${canvas(1000, 500)}<div class="mapread" id="rd">${tt('Move the pointer over the map to read the real height of the ground.')}</div>${heightBar}<div class="learn">${tt`Mars, flattened into a map. The colours are heights measured by the MOLA laser on NASA's Mars Global Surveyor: blue is low, red is high, white is the top of the great volcanoes. The north is low and smooth; the south is high and cratered. Nobody knows for certain why.`} ${pill('obs')}</div>`;
        const cv = body.querySelector('#bm'), c = cv.getContext('2d'), rd = body.querySelector('#rd'); paintPlanet(c, 1000, 500);
        cv.onpointermove = cv.onpointerdown = (e) => { const [x, y] = at(cv, e), lon = clamp((x / 1000) * 360, 0, 359.99), lat = clamp(90 - (y / 500) * 180, -89.99, 90), m = planetHeight(lat, lon), nearP = PLACES.find(([la, lo]) => Math.hypot(la - lat, (lo - lon) * Math.cos((lat * Math.PI) / 180)) < 4); paintPlanet(c, 1000, 500, { x, y });
          rd.innerHTML = tt`<b>${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'}, ${lon.toFixed(0)}°E</b> · height <b>${m >= 0 ? '+' : ''}${metres(m)}</b>${nearP ? ' · ' + nearP[2] : ''}`; }; }
      else if (tab === 'region') { const pk = skylinePeak();
        body.innerHTML = `${tabs}<div class="grid2">${canvas(RW, RW)}<div><div class="mapread" id="rd">${tt('Move the pointer over the map to read the real height of the ground.')}</div><div class="stat"><span>${tt('Across')}</span><b>${REGION.km} km</b></div><div class="stat"><span>${tt('Lowest · highest')}</span><b>${metres(REGION.min)} · ${metres(REGION.max)}</b></div><div class="stat"><span>${tt('Our outpost')}</span><b>${metres(SITE.elev)}</b></div><div class="stat"><span>${tt('The highest hill on our skyline')}</span><b>${tt`${pk.km} km ${toward(pk.bearing)}, ${pk.deg.toFixed(1)}° above level`}</b></div><div class="stat"><span>${tt('The map you can walk')}</span><b>${tt('1.6 km: smaller than the blue dot')}</b></div><div class="stat"><span>${tt('EM-16')}</span><b>${tt('a landing site a published study looked at')} ${pill('prop')}</b></div><div class="learn">${tt('Real ground, from the MOLA laser: one height every 463 m, with a line every 100 m of height. The smooth plain is Arcadia Planitia. The knobs and ridges are the Erebus Montes: old highland hills that the plains lavas flowed around. Their outline is the skyline you see from the base.')} ${pill('obs')}</div></div></div>`;
        const cv = body.querySelector('#bm'), c = cv.getContext('2d'), rd = body.querySelector('#rd'); paintRegion(c, RW);
        cv.onpointermove = cv.onpointerdown = (e) => { const [x, y] = at(cv, e), eKm = (x / RW - 0.5) * REGION.km, nKm = (0.5 - y / RW) * REGION.km, m = regionHeight(eKm, nKm); if (m === null) return; paintRegion(c, RW, { x, y }); const dist = Math.hypot(eKm, nKm), brg = (Math.atan2(eKm, nKm) * 180) / Math.PI;
          rd.innerHTML = tt`<b>${(SITE.lat + nKm / KM_LAT).toFixed(2)}°N, ${(SITE.lon + eKm / KM_LON).toFixed(2)}°E</b><br>height <b>${metres(m)}</b> · <b>${Math.round(m - SITE.elev) >= 0 ? '+' : ''}${metres(m - SITE.elev)}</b> from the outpost<br>${dist.toFixed(0)} km ${toward(brg)}`; }; }
      else { const dist = (x, z) => Math.round(Math.hypot(x - P.pos.x, z - P.pos.z)), dot = (id) => `<u class="st ${status(id)}" style="background:${SYSTEMS[SYS_OF[id]][0]}"></u>`, found = POI.filter((p) => s.seen[p.id]), crew = env.crew();
        body.innerHTML = `${tabs}<div class="grid2"><div>${canvas(720, 720)}<div class="mapbtns"><button data-z="in">＋</button><button data-z="out">－</button><button data-z="me">${tt('Me')}</button><button data-z="base">${tt('The base')}</button><button data-z="all">${tt('The whole area')}</button></div></div>
          <div class="mapside"><h4 class="h4">${tt('Show me the way to…')}</h4><div class="maplist">${TOUR.map((id) => `<button class="maprow" data-go="${id}">${dot(id)}<span>${INFO[id].name}</span><em>${dist(T.B[id].door[0], T.B[id].door[1])} m</em></button>`).join('')}<button class="maprow" data-go="car"><u class="st ok" style="background:#49e6ff"></u><span>${tt('My Rover')}</span><em>${dist(G.car.x, G.car.z)} m</em></button>${found.map((p) => `<button class="maprow" data-go="${p.id}"><u class="st ok" style="background:#ffe2b5"></u><span>${p.name}</span><em>${dist(p.x, p.z)} m</em></button>`).join('')}</div>
          <div class="stat"><span>${tt('Places found')}</span><b>${found.length} / ${POI.length}</b></div>${crew.length ? `<div class="stat"><span>${tt('Crew')}</span><b>${crew.map((n) => `${n.short}: ${n.inside ? tt('indoors') : tt('outdoors')}`).join(' · ')}</b></div>` : ''}
          <div class="maplegend">${Object.values(SYSTEMS).map(([col, name]) => `<span><u style="background:${col}"></u>${name}</span>`).join('')}<span><u class="x"></u>${tt('switched off')}</span><span><u class="line"></u>${tt('the way to go')}</span><span><u class="q">?</u>${tt('something to find')}</span></div>
          <div class="learn">${tt('Scroll to zoom, drag to move, click a building or a place to be shown the way, or click bare ground to mark a spot. Thin lines join ground of the same height, 2 m apart. The yellow dot on the edge is where the Sun is.')}</div></div></div>`;
        const cv = body.querySelector('#bm'), c = cv.getContext('2d'), tip = body.querySelector('.maptip'), paint = () => paintLocal(c, 720, 720, view, { big: true }); paint(); ui._tick = setInterval(paint, 400);
        const hit = (x, y) => hits.filter((h) => Math.hypot(h.x - x, h.y - y) < h.r).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]; let drag = null;
        cv.onwheel = (e) => { e.preventDefault(); const [x, y] = at(cv, e); view = zoomAt(view, e.deltaY > 0 ? 1.25 : 0.8, x / 720, y / 720); paint(); };
        cv.onpointerdown = (e) => { const [x, y] = at(cv, e); drag = { x, y, cx: view.cx, cz: view.cz, moved: false }; cv.setPointerCapture?.(e.pointerId); };
        cv.onpointermove = (e) => { const [x, y, r] = at(cv, e); if (drag) { const k = (2 * view.span) / 720; if (Math.hypot(x - drag.x, y - drag.y) > 5) drag.moved = true; if (drag.moved) { view = clampView({ span: view.span, cx: drag.cx - (x - drag.x) * k, cz: drag.cz - (y - drag.y) * k }); paint(); tip.classList.add('hidden'); } return; }
          const h = hit(x, y); cv.style.cursor = h && h.kind !== 'info' && h.kind !== 'crew' ? 'pointer' : 'grab'; if (!h) { tip.classList.add('hidden'); return; } tip.innerHTML = describe(h); tip.classList.remove('hidden'); tip.style.left = clamp(((x / 720) * r.width) + 14, 4, r.width - 190) + 'px'; tip.style.top = clamp(((y / 720) * r.height) + 14, 4, r.height - 70) + 'px'; };
        cv.onpointerleave = () => tip.classList.add('hidden');
        cv.onpointerup = (e) => { const d = drag; drag = null; if (!d || d.moved) return; const [x, y] = at(cv, e), h = hit(x, y);
          if (h && (h.kind === 'building' || h.kind === 'poi' || h.kind === 'rover')) { G.pointTo(h.id); if (h.kind === 'poi' && !s.seen[h.id]) G.goal.name = tt('Something to find'); G.audio?.play('click'); ui.close(); return; }
          if (h) return; const wx = view.cx + ((x / 720) * 2 - 1) * view.span, wz = view.cz + ((y / 720) * 2 - 1) * view.span; if (Math.hypot(wx, wz) > T.PLAY_R - 10) return;
          G.goal = { id: 'spot', x: wx, z: wz, zone: 'top', name: tt('Marked spot'), text: null }; G.audio?.play('click'); paint(); };
        body.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { const z = b.dataset.z; view = z === 'in' ? zoomAt(view, 0.7, 0.5, 0.5) : z === 'out' ? zoomAt(view, 1.4, 0.5, 0.5) : z === 'me' ? clampView({ span: Math.min(view.span, 160), cx: P.pos.x, cz: P.pos.z }) : z === 'base' ? { ...BASE } : { ...AREA }; paint(); }));
        body.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { G.pointTo(b.dataset.go); ui.close(); })); }
      body.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.v; render(w); })); };
    return ui.window({ title: tt('Map of Mars'), html: '', wide: true, onMount: render });
  }
  // The corner map: follows you, north up, and looks further ahead when you are in the rover.
  let miniSpan = 150; const mini = (c, W, H) => { miniSpan += ((P.in === 'car' ? 260 : 150) - miniSpan) * 0.15; paintLocal(c, W, H, { cx: P.pos.x, cz: P.pos.z, span: miniSpan }); };
  // Remember the way you have come: a point every 4 m, the last 1.4 km.
  const tick = () => { if (env.inRoom()) return; const l = trail[trail.length - 1]; if (!l || Math.hypot(P.pos.x - l[0], P.pos.z - l[1]) > 4) { trail.push([P.pos.x, P.pos.z]); if (trail.length > 350) trail.shift(); } };
  return { open, mini, tick, paintLocal, paintRegion, paintPlanet, get hits() { return hits; }, trail };
}
