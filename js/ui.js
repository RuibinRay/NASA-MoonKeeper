// MOONKEEPER 2 — interface: HUD, comic pages, dialogue, cards, Power Board, Control Center, maps, end screens.
import { K, SYS, MODES, STATIONS, SITES, GLOSSARY, PIT, TUBE, HALL, AIRLOCK, CAVE_C, INDOOR_C, BASE, MINE, ROOMS, ROLES, MOUNTS, CAR_PAD, SHIP_PAD, roomRect, fmt } from './config.js';
import { computeFlows, score, roomOk, machineOk, hasWork, sun as sunAt } from './sim.js';
import { IC } from './icons.js';
import { realMoonSvg, realFacts, roundTo, ROVER_KMH } from './moonmap.js';
import { tt, LANG, LANGS } from './i18n.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Explain hard words on the spot: first use of each glossary word gets a dotted underline + pop-up.
export function gloss(html) {
  const used = new Set();
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) return part;
    for (const term of Object.keys(GLOSSARY)) { if (used.has(term)) continue; const re = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?)\\b`, 'i'); if (re.test(part)) { used.add(term); part = part.replace(re, `\u0001${term}\u0002$1\u0003`); } }
    return part;
  }).join('').replace(/\u0001([^\u0002]+)\u0002([^\u0003]+)\u0003/g, (m, t, w) => `<span class="term" data-tip="${GLOSSARY[t].replace(/"/g, '&quot;')}">${w}</span>`);
}
export const WHO = {
  rego: { name: tt('REGO · your robot friend'), img: 'c_rego' }, vasquez: { name: tt('Commander Elena Vasquez'), img: 'c_vasquez' }, okoro: { name: tt('Engineer Tobi Okoro'), img: 'c_okoro' },
  flight: { name: tt('Mission Control · Flight Director Raman'), img: 'c_flight', delay: true }, you: { name: tt('You · the rookie'), img: 'c_rookie' },
  ingrid: { name: tt('Ingrid Solberg · pilot, Aurora Station'), img: 'c_ingrid' }, kenji: { name: tt('Kenji Mori · engineer, Sakura Outpost'), img: 'c_kenji' }, anika: { name: tt('Dr. Anika Rao · botanist, Chandra Base'), img: 'c_anika' }, bolt: { name: tt('BOLT · helper robot'), img: 'c_bot' },
};
const GAUGES = [
  { id: 'power', ico: 'bolt', name: tt('Power'), tip: tt('Energy stored in the battery. Solar panels only make power while the Sun is up. Keep the electricity going!') },
  { id: 'air', ico: 'air', name: tt('Air'), tip: tt('Air pressure in the station hall, in kPa. 101 is like a beach on Earth. A hole lets it rush out into space.') },
  { id: 'o2', ico: 'o2', name: tt('Oxygen'), tip: tt('Air to breathe, in the tanks. Leaks are topped up from here, so a hole drains this fast.') },
  { id: 'water', ico: 'water', name: tt('Water'), tip: tt('Drinking water. Also used up when the Oxygen Maker splits it.') },
  { id: 'food', ico: 'food', name: tt('Food'), tip: tt('Cooked meals and tins you can eat now. Raw potatoes, tomatoes and eggs are worth more once cooked.') },
  { id: 'rad', ico: 'rad', name: tt('Radiation'), tip: tt('Your total radiation dose. It only goes up. Underground you are safe; topside in a solar storm you are not.') },
  { id: 'mat', ico: 'box', name: tt('Materials'), tip: tt('Metal and parts for fixing and building. Find more at the other stations.') },
];

// ---------- map painters (also used for the big screen in the Control Center) ----------
export function roomState(S, id) { const r = S.rooms[id]; if (r.hole > 0 && r.door) return 'leak'; if (r.hole > 0) return 'sealed'; if (r.built < 1) return 'wreck'; if (r.p < 60) return 'low'; return 'ok'; }
const RCOL = { ok: '#3b9b7b', leak: '#ab2b2b', sealed: '#1f3451', wreck: '#7b3fa6', low: '#aa8909' };
const RTXT = { ok: tt('OK'), leak: tt('LEAK!'), sealed: tt('SEALED · NO AIR'), wreck: tt('BROKEN'), low: tt('LOW AIR') };
// Words that stay inside a room's box on the station map. First the letters shrink a little; if that is not enough the words
// break into two lines at the space or dot nearest the middle; then they shrink again. Returns the lines and the letter size.
function fitText(c, text, maxW, px, weight) {
  const font = (s) => { c.font = `${weight} ${s}px Inter,sans-serif`; }, wide = (t) => c.measureText(t).width, min = Math.max(7, Math.round(px * 0.6));
  for (let s = px; s >= Math.round(px * 0.85); s--) { font(s); if (wide(text) <= maxW) return { lines: [text], size: s }; }
  const cuts = []; text.replace(/ · | /g, (m, i) => { cuts.push([i, i + m.length]); return m; });
  if (!cuts.length) { for (let s = px; s > min; s--) { font(s); if (wide(text) <= maxW) return { lines: [text], size: s }; } return { lines: [text], size: min }; }
  const mid = text.length / 2, [a, b] = cuts.sort((p, q) => Math.abs((p[0] + p[1]) / 2 - mid) - Math.abs((q[0] + q[1]) / 2 - mid))[0], lines = [text.slice(0, a), text.slice(b)];
  for (let s = px; s > min; s--) { font(s); if (Math.max(wide(lines[0]), wide(lines[1])) <= maxW) return { lines, size: s }; }
  return { lines, size: min };
}
export function drawStation(c, S, w, h, o = {}) {
  const fsc = o.focus ? w / o.span : 0, X = o.focus ? (x) => w / 2 + (x - o.focus.x) * fsc : (x) => ((x + 114) / 196) * w, Z = o.focus ? (z) => h / 2 + (z - o.focus.z) * fsc : (z) => ((z + 28) / 56) * h, t = performance.now() / 1000, big = o.big;
  c.fillStyle = '#071018'; c.fillRect(0, 0, w, h);
  // the cave: rock, the lit path from the elevator, then the building
  c.strokeStyle = 'rgba(73,230,255,.35)'; c.lineWidth = big ? 3 : 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(X(TUBE.skyX + 5), Z(0)); c.lineTo(X(AIRLOCK.x0), Z(0)); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.beginPath(); c.arc(X(TUBE.skyX), Z(0), Math.abs(X(4.4) - X(0)), 0, 7); c.stroke();
  c.fillStyle = '#22313f'; c.fillRect(X(AIRLOCK.x0), Z(AIRLOCK.z0), X(AIRLOCK.x1) - X(AIRLOCK.x0), Z(AIRLOCK.z1) - Z(AIRLOCK.z0)); c.fillRect(X(HALL.x0), Z(HALL.z0), X(HALL.x1) - X(HALL.x0), Z(HALL.z1) - Z(HALL.z0));
  c.fillStyle = '#ff7a1a'; c.fillRect(X(AIRLOCK.x0) - 2, Z(-2), 4, Z(2) - Z(-2));
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#cfe3f3'; c.font = `600 ${big ? 15 : 11}px Inter,sans-serif`; c.fillText(tt('LIFT'), X(TUBE.skyX), Z(0) - (big ? 26 : 16)); c.fillText(tt`HALL  ${S.P.toFixed(0)} kPa`, X(10), Z(0));
  c.font = `600 ${big ? 12 : 9}px Inter,sans-serif`; c.fillStyle = '#8fa6b8'; c.fillText(tt`CAVE · NO AIR · ${CAVE_C}°C`, X((TUBE.skyX + AIRLOCK.x0) / 2), Z(0) + (big ? 20 : 13)); c.fillText(tt('AIRLOCK'), X((AIRLOCK.x0 + AIRLOCK.x1) / 2), Z(AIRLOCK.z0) - (big ? 9 : 6));
  for (const d of ROOMS) {
    const q = roomRect(d), st = roomState(S, d.id), x = X(q.x0), y = Z(q.z0), ww = X(q.x1) - x, hh = Z(q.z1) - y, r = S.rooms[d.id];
    c.fillStyle = RCOL[st]; if (st === 'leak' && Math.sin(t * 8) > 0) c.fillStyle = '#ff5a4a'; c.fillRect(x, y, ww, hh); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.strokeRect(x, y, ww, hh);
    c.fillStyle = '#22313f'; c.fillRect(X(d.door - 2), d.side < 0 ? Z(q.z1) : Z(HALL.z1), X(d.door + 2) - X(d.door - 2), Z(6.4) - Z(2.6));
    c.fillStyle = r.door ? '#58e08a' : '#ff5252'; c.fillRect(X(d.door - 2.4), Z(d.side * 4.5) - 2.5, X(d.door + 2.4) - X(d.door - 2.4), 5);
    if (!r.door) { c.fillStyle = '#fff'; c.fillRect(X(d.door) - 1.5, Z(d.side * 4.5) - 5.5, 3, 11); }   // lockMark
    // the room's name and its state, each made to fit the box (a narrow room gets smaller letters or two lines, never words that run into the next room)
    const maxW = Math.max(10, Math.abs(ww) - (big ? 8 : 6)), nm = fitText(c, d.name, maxW, big ? 17 : 11, 700), sx = fitText(c, st === 'ok' ? `${r.p.toFixed(0)} kPa` : RTXT[st], maxW, big ? 14 : 10, 600);
    const lhN = nm.size * 1.12, lhS = sx.size * 1.15, gapY = big ? 5 : 3; let ty = y + hh / 2 - (nm.lines.length * lhN + gapY + sx.lines.length * lhS) / 2;
    c.fillStyle = '#fff'; c.font = `700 ${nm.size}px Inter,sans-serif`; for (const ln of nm.lines) { c.fillText(ln, x + ww / 2, ty + lhN / 2, maxW); ty += lhN; }
    ty += gapY; c.font = `600 ${sx.size}px Inter,sans-serif`; c.fillStyle = st === 'ok' ? '#bfeed2' : '#fff'; for (const ln of sx.lines) { c.fillText(ln, x + ww / 2, ty + lhS / 2, maxW); ty += lhS; }
  }
  if (o.player) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X(o.player.x), Z(o.player.z), big ? 7 : 5, 0, 7); c.fill(); c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.stroke(); }
  if (o.target) { c.strokeStyle = '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(X(o.target.x), Z(o.target.z), 9 + Math.sin(t * 5) * 2, 0, 7); c.stroke(); }
}
// A shaded picture of the ground for the big map: sunlight from the north-west, so craters show as dimples. It is slow to
// work out (one height for every dot), so each view is drawn once and kept.
const reliefs = new Map();
function relief(world, range, cx, cz) {
  const key = range + ',' + cx + ',' + cz; let cv = reliefs.get(key); if (cv) return cv;
  const n = 220, st = (2 * range) / n, H = new Float32Array((n + 1) * (n + 1)), img = new ImageData(n, n), d = img.data;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) H[j * (n + 1) + i] = world.heightAt(cx - range + i * st, cz - range + j * st);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = H[j * (n + 1) + i], dx = (H[j * (n + 1) + i + 1] - a) / st, dz = (H[(j + 1) * (n + 1) + i] - a) / st, v = 30 + clamp(0.5 + (dx + dz) * 2.2, 0, 1) * 62, k = (j * n + i) * 4; d[k] = v * 0.9; d[k + 1] = v * 0.96; d[k + 2] = v * 1.08; d[k + 3] = 255; }
  cv = document.createElement('canvas'); cv.width = cv.height = n; cv.getContext('2d').putImageData(img, 0, 0); reliefs.set(key, cv); return cv;
}
// A small picture for each of the other stations, in its own colour: a barrel vault, three roofs, a dome on a hall.
function siteIcon(c, id, x, z, col) {
  c.save(); c.translate(x, z); c.fillStyle = 'rgba(8,12,18,.88)'; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill(); c.stroke(); c.fillStyle = col;
  if (id === 'aurora') { c.beginPath(); c.arc(0, 5, 8, Math.PI, 0); c.closePath(); c.fill(); }
  else if (id === 'sakura') { for (const [y, r] of [[-7, 4], [-2, 7], [3, 10]]) { c.beginPath(); c.moveTo(-r, y + 4); c.lineTo(0, y - 1); c.lineTo(r, y + 4); c.closePath(); c.fill(); } }
  else { c.fillRect(-8, 1, 16, 5); c.beginPath(); c.arc(0, 1, 6, Math.PI, 0); c.fill(); }
  c.restore();
}
// `big` = the Map window: it adds the shaded ground, distance rings, station pictures with distances, and a scale bar.
export function drawSurface(c, G, w, h, range = 170, cx = 0, cz = 0, big = false) {
  const S = G.S, sc = w / (2 * range), X = (x) => w / 2 + (x - cx) * sc, Z = (z) => h / 2 + (z - cz) * sc, far = range > 300;
  c.fillStyle = '#0b0e12'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle';
  const gate = STATIONS.find((q) => q.id === 'gate').pos, me = G.player.zone === 'top' ? [G.player.pos.x, G.player.pos.z] : gate;   // distances are from you, or from the elevator when you are underground
  if (big) { c.imageSmoothingEnabled = true; c.drawImage(relief(G.world, range, cx, cz), 0, 0, w, h);
    if (far) { c.strokeStyle = 'rgba(255,255,255,.1)'; c.fillStyle = 'rgba(219,231,242,.5)'; c.font = '600 10px Inter,sans-serif'; c.lineWidth = 1; for (const r of [200, 400, 600]) { c.beginPath(); c.arc(X(gate[0]), Z(gate[1]), r * sc, 0, 7); c.stroke(); c.fillText(r + ' m', X(gate[0]), Z(gate[1]) - r * sc - 7); }
      c.fillStyle = '#ffb347'; c.font = '700 11px Inter,sans-serif'; c.fillText(tt('TRANQUILITY DEEP'), X(0), Z(-104)); } }
  c.fillStyle = '#05070a'; c.beginPath(); c.arc(X(PIT.x), Z(PIT.z), PIT.r * sc, 0, 7); c.fill(); c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.stroke();
  MOUNTS.forEach(([x, z], i) => { const st = S.mounts[i]; c.fillStyle = st === 1 ? '#3a78d8' : st === 2 ? '#ff5252' : '#3a3f47'; const bx = X(x) - Math.max(2, 2.4 * sc), by = Z(z) - Math.max(1.5, 1.4 * sc), bw = Math.max(4, 4.8 * sc), bh = Math.max(3, 2.8 * sc); c.fillRect(bx, by, bw, bh); if (st === 2) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw, by + bh); c.stroke(); } });   // brokenMark
  c.strokeStyle = '#6f7f8f'; c.fillStyle = 'rgba(120,140,160,.22)'; c.lineWidth = 1.5; for (const k of ['hub', 'green']) { const [x, z, r] = BASE[k]; c.beginPath(); c.arc(X(x), Z(z), r * sc, 0, 7); c.fill(); c.stroke(); }
  for (const [k, w2, d2] of [['tower', 9, 9], ['batt', 10, 7], ['garage', 15, 9.5], ['lab', 12, 7], ['water', 9, 4]]) { const [x, z] = BASE[k]; c.fillRect(X(x - w2 / 2), Z(z - d2 / 2), w2 * sc, d2 * sc); c.strokeRect(X(x - w2 / 2), Z(z - d2 / 2), w2 * sc, d2 * sc); }
  const dot = (x, z, col, label, r = 5) => { c.fillStyle = col; c.beginPath(); c.arc(X(x), Z(z), r, 0, 7); c.fill(); if (label) { c.fillStyle = '#dbe7f2'; c.font = '600 11px Inter,sans-serif'; c.fillText(label, X(x), Z(z) - r - 7); } };
  { let x = X(MINE.x), z = Z(MINE.z); const off = x < 12 || x > w - 12 || z < 12 || z > h - 12; if (!off) { c.fillStyle = 'rgba(8,12,18,.75)'; c.strokeStyle = '#9fdcff88'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, z, MINE.r * sc, 0, 7); c.fill(); c.stroke(); for (const p of S.mine.patches) if (p.left > 0) { c.fillStyle = '#9fdcff'; c.beginPath(); c.arc(X(p.x), Z(p.z), Math.max(2, 3.4 * sc), 0, 7); c.fill(); } c.fillStyle = '#ffd21f'; c.fillRect(X(G.dig.x) - 3, Z(G.dig.z) - 3, 6, 6); }
    x = clamp(x, 12, w - 12); z = clamp(z, 12, h - 12); if (off) { c.fillStyle = '#9fdcff'; c.beginPath(); c.moveTo(x, z - 8); c.lineTo(x + 7, z); c.lineTo(x, z + 8); c.lineTo(x - 7, z); c.closePath(); c.fill(); c.fillStyle = '#dbe7f2'; c.font = '600 10px Inter,sans-serif'; c.fillText(tt('ICE MINE'), clamp(x, 34, w - 34), clamp(z + (z > h / 2 ? -14 : 16), 10, h - 10)); } }
  for (const s of STATIONS) if (s.zone === 'top') dot(s.pos[0], s.pos[1], '#49e6ff', far ? '' : s.name, far ? 2.5 : 4);
  for (const [k, p] of [['car', CAR_PAD], ['ship', SHIP_PAD]]) { c.strokeStyle = S[k].charging ? '#49e6ff' : '#55616d'; c.lineWidth = 2; c.beginPath(); c.arc(X(p[0]), Z(p[1]), Math.max(4, 5 * sc), 0, 7); c.stroke(); }
  for (const s of SITES) { const col = '#' + s.color.toString(16).padStart(6, '0'), done = S.rescued.includes(s.id); let x = X(s.pos[0]), z = Z(s.pos[1]); const off = x < 12 || x > w - 12 || z < 12 || z > h - 12; x = clamp(x, 12, w - 12); z = clamp(z, 12, h - 12); c.fillStyle = col; c.beginPath(); if (off) { c.moveTo(x, z - 8); c.lineTo(x + 8, z + 6); c.lineTo(x - 8, z + 6); c.fill(); } else if (big) siteIcon(c, s.id, x, z, col); else { c.arc(x, z, 8, 0, 7); c.fill(); }
    if (!off || far) { c.fillStyle = '#fff'; c.font = '600 11px Inter,sans-serif'; c.fillText(s.name + (done ? ' ✓' : ''), x, z + (big ? 23 : 18)); if (big) { c.fillStyle = '#9bb0c3'; c.font = '600 10px Inter,sans-serif'; c.fillText(Math.round(Math.hypot(s.pos[0] - me[0], s.pos[1] - me[1]) / 10) * 10 + tt(' m away'), x, z + 36); } } }
  for (const it of G.items) if (it.zone === 'top' && it.where === 'ground') { c.fillStyle = it.type.startsWith('panel') ? '#7fb0ff' : '#ffb347'; c.fillRect(X(it.x) - 2.5, Z(it.z) - 2.5, 5, 5); }
  const veh = (v, col, label) => { c.save(); c.translate(X(v.x), Z(v.z)); c.rotate(-v.yaw + Math.PI); c.fillStyle = col; c.fillRect(-4, -7, 8, 14); c.restore(); if (!far) { c.fillStyle = col; c.font = '700 10px Inter,sans-serif'; c.fillText(label, X(v.x), Z(v.z) + 15); } };
  veh(G.car, '#ff9a3d', tt('ROVER')); veh(G.ship, '#2ad0c0', tt('HOPPER'));
  const tg = G.world.target; if (tg && tg.zone === 'top') { c.strokeStyle = '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(clamp(X(tg.x), 10, w - 10), clamp(Z(tg.z), 10, h - 10), 10, 0, 7); c.stroke(); }
  const p = G.player; if (big && tg && tg.zone === 'top' && p.zone === 'top') { c.strokeStyle = 'rgba(255,179,71,.7)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(X(p.pos.x), Z(p.pos.z)); c.lineTo(X(tg.x), Z(tg.z)); c.stroke(); c.setLineDash([]); }   // the way to where the guide beam points
  c.save(); c.translate(X(p.pos.x), Z(p.pos.z)); c.rotate(-G.cam.yaw); c.fillStyle = '#fff'; c.strokeStyle = '#0b0e12'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 9); c.lineTo(0, 4); c.lineTo(-8, 9); c.closePath(); c.fill(); c.stroke(); c.restore();
  if (big) { const L = far ? 200 : 50, px = L * sc, y = h - 16; c.strokeStyle = '#dbe7f2'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, y - 5); c.lineTo(16, y); c.lineTo(16 + px, y); c.lineTo(16 + px, y - 5); c.stroke(); c.fillStyle = '#dbe7f2'; c.font = '600 11px Inter,sans-serif'; c.fillText(L + ' m', 16 + px / 2, y - 10); }
  c.fillStyle = '#9bb0c3'; c.font = '600 12px Inter,sans-serif'; c.fillText('N', w / 2, 10);
}

export class UI {
  constructor(G) {
    this.G = G; this.modalStack = 0; this.dialogOpen = false; this.t = 0; this.labels = {};
    const gz = $('#gauges');
    for (const g of GAUGES) { const d = el('div', 'gauge', `<div class="g-top">${IC[g.ico]}<span>${g.name}</span><b id="g-${g.id}-v"></b></div><div class="bar"><i id="g-${g.id}-b"></i></div><div class="g-sub" id="g-${g.id}-s"></div>`); d.id = 'g-' + g.id; d.dataset.tip = g.tip; d.style.pointerEvents = 'auto'; gz.appendChild(d); }
    for (const s of [...STATIONS, ...SITES.map((q) => ({ id: q.id }))]) { const l = el('div', 'label hidden'); $('#labels').appendChild(l); this.labels[s.id] = l; }
    const tip = $('#tip');
    document.addEventListener('pointerover', (e) => { const t = e.target.closest?.('[data-tip]'); if (!t) { tip.style.opacity = 0; return; } tip.textContent = t.dataset.tip; tip.style.opacity = 1; const r = t.getBoundingClientRect(); tip.style.left = clamp(r.left, 8, innerWidth - 310) + 'px'; tip.style.top = (r.bottom + 8 > innerHeight - 90 ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + 'px'; });
    $('#rego').onclick = () => $('#rego').classList.add('hidden'); $('#dialog').onclick = () => this._dlgNext?.(); addEventListener('click', (e) => { if (this.dialogOpen && !this.modalStack && !e.target.closest('#dialog, #modal, #comic, button')) this._dlgNext?.(); });
    this.mm = $('#minimap').getContext('2d');
    { const hm = el('div', 'hidden'); hm.id = 'home'; $('#you').insertAdjacentElement('afterend', hm); }   // one line under the health bar: the charge the rover or hopper needs to get home
  }
  get busy() { return this.modalStack > 0 || this.dialogOpen || this.comicOpen; }
  showHud(on) { const h = $('#hud'); if (on && h.classList.contains('hidden')) { h.classList.add('enter'); clearTimeout(this._hudT); this._hudT = setTimeout(() => h.classList.remove('enter'), 900); } h.classList.toggle('hidden', !on); }
  fade(on) { $('#fade').classList.toggle('on', on); return new Promise((r) => setTimeout(r, 470)); }
  toast(text, kind = '') { const radio = kind === 'radio' || kind === 'radio off', t = el('div', 'toast ' + kind, `<i class="t-ic">${kind === 'bad' ? IC.alert : kind === 'good' ? IC.ok : radio ? IC.dish : IC.bot}</i><span>${gloss(text)}</span>`); $('#toasts').appendChild(t); this.G.audio?.play(kind === 'bad' ? 'bad' : kind === 'good' ? 'ok' : kind === 'radio' ? 'call' : kind === 'radio off' ? 'static' : 'blip'); setTimeout(() => t.remove(), radio ? 10000 : 6500); while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove(); }
  bubble(html, mood = 'happy', secs = 10) { $('#rego-text').innerHTML = gloss(html); this.G.voice?.say(html); $('#rego').classList.remove('hidden'); this.G.rego?.setMood(mood); if (this.G.rego) this.G.rego.wave = 1.2; this.G.audio?.play('chirp'); clearTimeout(this._bt); this._bt = setTimeout(() => { $('#rego').classList.add('hidden'); this.G.rego?.setMood('happy'); }, secs * 1000); }
  banner(text, info = false) { const b = $('#banner'); if (!text) { b.classList.add('hidden'); return; } if (b.dataset.t !== text) { b.dataset.t = text; b.innerHTML = text; } b.classList.remove('hidden'); b.classList.toggle('info', info); }
  objective(html) { const o = $('#objective'); o.classList.toggle('hidden', !html); if (html && o.dataset.h !== html) { o.dataset.h = html; o.innerHTML = html; const k = (o.querySelector('b')?.textContent || o.textContent).replace(/[\d.]+/g, ''); if (k !== o.dataset.k) { o.dataset.k = k; o.classList.remove('changed'); void o.offsetWidth; o.classList.add('changed'); } } }
  prompt(html) { const p = $('#prompt'); p.classList.toggle('hidden', !html); if (html && p.dataset.h !== html) { p.dataset.h = html; p.innerHTML = html; } this.unstack(); }
  // Keep REGO's hint, the E/Q prompt and the button bar from covering each other at any window size: the hint goes above
  // the buttons if they meet, and the prompt above the hint. Checked five times a second, not every frame.
  unstack() {
    const now = performance.now(); if (now - (this._unT || 0) < 200) return; this._unT = now;
    const rego = $('#rego'), pr = $('#prompt'), bt = $('#btns'); if (!rego || !pr || !bt) return;
    const hit = (a, b) => a.width > 0 && b.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    rego.style.bottom = ''; pr.style.bottom = ''; pr.style.top = '';
    if (rego.classList.contains('hidden')) return;
    let R = rego.getBoundingClientRect(); const B = bt.getBoundingClientRect();
    if (hit(R, B)) { rego.style.bottom = Math.round(innerHeight - B.top + 8) + 'px'; R = rego.getBoundingClientRect(); }
    if (!pr.classList.contains('hidden') && hit(R, pr.getBoundingClientRect())) { pr.style.top = 'auto'; pr.style.bottom = Math.round(innerHeight - R.top + 8) + 'px'; }
  }
  // progress bar shown while a build / fix scene plays by itself
  job(title, k, step, left) { const j = $('#job'); j.classList.toggle('hidden', title === null); if (title === null) return; $('#job-title').textContent = title; $('#job-step').textContent = step; $('#job-bar').style.width = clamp(k * 100, 0, 100) + '%'; $('#job-left').textContent = left; }

  // ---------- comic pages: panels appear one click at a time ----------
  comic(pages) {
    return new Promise((done) => {
      const root = $('#comic'); this.comicOpen = true; root.classList.remove('hidden'); document.exitPointerLock?.(); let pi = 0, shown = 0;
      const page = () => {
        const pg = pages[pi]; shown = 0;
        root.innerHTML = `<div class="comic-page"><div class="comic-h"><span>${pg.title}</span><small>${pages.length > 1 ? tt`Page ${pi + 1} of ${pages.length}` : ''}</small></div><div class="comic-grid">${pg.panels.map((p, i) => `<figure class="panel ${p.wide ? 'wide' : ''}" data-i="${i}"><img src="assets/img/${p.img}.jpg" alt="">${p.cap ? `<figcaption>${p.cap}</figcaption>` : ''}${(p.say || []).map((b, k) => `<div class="bub b${b.at || k}"><b>${b.who}</b>${b.text}</div>`).join('')}</figure>`).join('')}</div><div class="comic-f"><button class="ghost" id="cm-skip">${tt`Skip story`}</button><div class="cm-dots">${pg.panels.map(() => '<i></i>').join('')}</div><span id="cm-next">${tt`${this.G.touch ? tt('Tap') : tt('Click')} anywhere ▸`}</span></div></div>`;
        const next = () => { const ps = root.querySelectorAll('.panel'), dots = root.querySelectorAll('.cm-dots i'); if (shown < ps.length) { ps.forEach((p, k) => p.classList.toggle('cur', k === shown)); ps[shown].classList.add('on'); dots.forEach((d, k) => d.classList.toggle('on', k <= shown)); shown++; this.G.audio?.play('blip'); const tap = this.G.touch ? tt('Tap') : tt('Click'); $('#cm-next').textContent = shown < ps.length ? tt`${tap} anywhere ▸` : pi < pages.length - 1 ? tt`${tap} to turn the page ▸` : `${tap}: ${(pg.btn || tt('Start ▸'))}`; return; } if (++pi < pages.length) page(); else finish(); };
        const finish = () => { root.classList.add('hidden'); root.innerHTML = ''; this.comicOpen = false; this._comicNext = null; done(); };
        root.onclick = next; $('#cm-skip').onclick = (e) => { e.stopPropagation(); root.onclick = null; finish(); }; this._comicNext = next; next();
      };
      page();
    });
  }

  // ---------- dialogue ----------
  // In first-person view the speaker can be behind you. Turn the camera to them so you always see who is talking.
  _faceSpeaker(who) {
    const G = this.G, P = G.player, cam = G.cam; clearInterval(this._faceT); if (!cam?.fp || !P?.pos || P.in) return;
    let x, z; const key = WHO[who] ? who : 'rego';
    if (key === 'rego' && G.regoPos) { x = G.regoPos.x; z = G.regoPos.z; }
    else { const n = (G.npcs || []).find((q) => q.who === key && q.zone === P.zone); if (n) { x = n.x; z = n.z; } }
    if (x === undefined || Math.hypot(x - P.pos.x, z - P.pos.z) < 0.4) return;
    const want = Math.atan2(P.pos.x - x, P.pos.z - z); let k = 0;
    this._faceT = setInterval(() => { let d = want - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * 0.3; cam.pitch += (0.08 - cam.pitch) * 0.3; if (++k > 18 || Math.abs(d) < 0.01) clearInterval(this._faceT); }, 16);
  }
  say(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    return new Promise((done) => {
      this.dialogOpen = true; let i = -1, typing = null, full = ''; const box = $('#dialog'), text = $('#dlg-text'), delay = $('#dlg-delay'); box.classList.remove('hidden'); document.exitPointerLock?.();
      const show = () => {
        const L = lines[i], w = WHO[L.who] || WHO.rego; $('#dlg-img').src = `assets/img/${w.img}.jpg`; $('#dlg-name').textContent = w.name; full = gloss(L.text); text.innerHTML = ''; box.dataset.who = WHO[L.who] ? L.who : 'rego'; this._faceSpeaker(L.who);
        if (L.who === 'rego') { this.G.rego?.setMood(L.mood || 'happy'); this.G.audio?.play('chirp'); this.G.voice?.say(L.text); } else this.G.voice?.stop();
        const type = () => { const cuts = []; for (let i = 0, tag = false; i < full.length; i++) { if (full[i] === '<') tag = true; if (!tag) cuts.push(i + 1); if (full[i] === '>') tag = false; }   // count letters you can see, so the line never seems to stall on a hidden tag
          let n = 0; typing = setInterval(() => { n += 3; if (n >= cuts.length) { clearInterval(typing); typing = null; text.innerHTML = full; } else text.innerHTML = full.slice(0, cuts[n]); }, 16); };
        if (w.delay) { delay.classList.remove('hidden'); const bar = delay.querySelector('i'); bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(() => { bar.style.transition = `width ${K.LIGHT_DELAY_S}s linear`; bar.style.width = '100%'; }); typing = 1; setTimeout(() => { delay.classList.add('hidden'); this.G.audio?.play('radio'); type(); }, K.LIGHT_DELAY_S * 1000); }
        else { delay.classList.add('hidden'); type(); }
      };
      const next = () => { if (typing && typing !== 1) { clearInterval(typing); typing = null; text.innerHTML = full; return; } if (typing === 1) return; if (++i >= lines.length) { box.classList.add('hidden'); this.dialogOpen = false; this._dlgNext = null; this._dlgAt = performance.now(); this.G.rego?.setMood('happy'); this.G.voice?.stop(); done(); return; } show(); };
      this._dlgNext = next; next();
    });
  }
  key(e) {
    if (this.comicOpen) { if (['Enter', ' ', 'ArrowRight'].includes(e.key)) this._comicNext?.(); return true; }
    if (this.dialogOpen && ['Enter', ' ', 'e', 'E'].includes(e.key)) { this._dlgNext?.(); return true; }
    if (this.modalStack > 0 && e.key === 'Escape' && this._closable) { this.close(); return true; }
    return this.busy;
  }

  // ---------- modal windows ----------
  // img: a picture name in assets/img. "first|second" shows the second if the first file is not there yet.
  window({ title, html, wide = false, closable = true, img = null, onMount }) {
    return new Promise((resolve) => {
      const m = $('#modal'); this.modalStack++; this._closable = closable; document.exitPointerLock?.(); m.classList.toggle('in', m.classList.contains('hidden') && performance.now() - (this._closedAt || 0) > 300); m.classList.remove('hidden');
      m.innerHTML = `<div class="win ${wide ? 'wide' : ''}">${img ? `<img class="card-img" src="assets/img/${img.split('|')[0]}.jpg" data-fb="${img.split('|')[1] || ''}" alt="" onerror="if (this.dataset.fb) { this.src = 'assets/img/' + this.dataset.fb + '.jpg'; this.dataset.fb = ''; } else this.remove()">` : ''}<div class="win-h"><h2>${title}</h2>${closable ? ('<button class="x">' + tt('Close ✕') + '</button>') : ''}</div><div class="win-b">${html}</div></div>`;
      this._resolve = (v) => { clearInterval(this._tick); this._closedAt = performance.now(); m.classList.add('hidden'); m.innerHTML = ''; this.modalStack = Math.max(0, this.modalStack - 1); this._resolve = null; resolve(v); };
      if (closable) m.querySelector('.x').onclick = () => this.close(); onMount?.(m.querySelector('.win'));
    });
  }
  close(v) { this._resolve?.(v); }
  // Guide mode: which button REGO would press. Housekeeping buttons (door locks, opening another board) are never the suggestion.
  recIndex(list) { if (!this.G.guide) return -1; return list.findIndex((c) => !c.disabled && !c.norec && !/^(Lock|Unlock) the door|^Open the |^See the /.test(c.label)); }
  // ---------- day and night ----------
  // where a temperature sits on a graph that runs from 130°C at the top to -180°C at the bottom
  tempY(c, h) { return (1 - (clamp(c, -180, 130) + 180) / 310) * h; }
  // the surface temperature from t0 over span hours, as two SVG paths: the sunlit parts and the dark parts
  tempCurve(S, t0, span, n, w, h, x0 = 0, y0 = 0) {
    let day = '', night = '', was = null, px = 0, py = 0;
    for (let i = 0; i <= n; i++) { const s = sunAt(S, t0 + (span * i) / n), x = x0 + (w * i) / n, y = y0 + this.tempY(s.tempC, h), pt = x.toFixed(1) + ' ' + y.toFixed(1);
      if (s.up !== was) { const join = was === null ? '' : 'M' + px.toFixed(1) + ' ' + py.toFixed(1) + 'L' + pt; if (s.up) day += join || 'M' + pt; else night += join || 'M' + pt; was = s.up; }
      else if (s.up) day += 'L' + pt; else night += 'L' + pt;
      px = x; py = y; }
    return { day, night, y: (c) => y0 + this.tempY(c, h) };
  }
  dayNight() {
    const G = this.G, S = G.S, sun = S.flow.sun, span = K.LUNAR_DAY * 24, W = 640, H = 250, L = 64, Rm = 16, T = 26, B = 34, gw = W - L - Rm, gh = H - T - B;
    const cv = this.tempCurve(S, S.t0, span, 240, gw, gh, L, T), X = (t) => L + clamp((t - S.t0) / span, 0, 1) * gw, yc = (c) => T + this.tempY(c, gh);
    const tSet = S.t0 + S.m.sunsetDay * 24, tRise = tSet + span / 2, tNow = S.t, tRes = S.hours === Infinity ? null : S.t0 + S.hours, inSpan = (t) => t !== null && t - S.t0 <= span;
    const ticks = []; for (let d = 0; d <= 29; d += 5) ticks.push(d);
    const svg = `<svg class="dn-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tt`Surface temperature through one Moon day`}">
      <rect x="${X(tSet).toFixed(1)}" y="${T}" width="${(X(tRise) - X(tSet)).toFixed(1)}" height="${gh}" fill="rgba(60,110,200,.14)"/>
      ${[127, 0, -173].map((c) => `<line x1="${L}" x2="${W - Rm}" y1="${yc(c).toFixed(1)}" y2="${yc(c).toFixed(1)}" stroke="rgba(255,255,255,.12)"/><text x="${L - 8}" y="${(yc(c) + 4).toFixed(1)}" text-anchor="end">${c}°C</text>`).join('')}
      ${ticks.map((d) => `<text x="${X(S.t0 + d * 24).toFixed(1)}" y="${H - 12}" text-anchor="middle">${tt`Day ${d + 1}`}</text>`).join('')}
      <path class="th-cave" d="M${L} ${yc(CAVE_C).toFixed(1)}H${W - Rm}"/><text x="${((X(tSet) + X(tRise)) / 2).toFixed(1)}" y="${(yc(CAVE_C) - 6).toFixed(1)}" text-anchor="middle" style="fill:#5fe3a1">${tt`In the cave: ${CAVE_C}°C all the time`}</text>
      <path class="th-night" d="${cv.night}"/><path class="th-day" d="${cv.day}"/>
      <text class="dn-big" x="${((X(S.t0) + X(tSet)) / 2).toFixed(1)}" y="${T - 9}" text-anchor="middle" style="fill:#ffb347">${tt`Sun up`}</text>
      <text class="dn-big" x="${((X(tSet) + X(tRise)) / 2).toFixed(1)}" y="${T - 9}" text-anchor="middle" style="fill:#6fb1ff">${tt`Night: about two weeks`}</text>
      ${W - Rm - X(tRise) > 70 ? `<text class="dn-big" x="${((X(tRise) + W - Rm) / 2).toFixed(1)}" y="${T - 9}" text-anchor="middle" style="fill:#ffb347">${tt`Sun up again`}</text>` : ''}
      ${inSpan(tRes) ? `<line x1="${X(tRes).toFixed(1)}" x2="${X(tRes).toFixed(1)}" y1="${T}" y2="${T + gh}" stroke="#5fe3a1" stroke-dasharray="4 4"/><text x="${(X(tRes) + 6).toFixed(1)}" y="${T + gh - 8}" style="fill:#5fe3a1">${tt`Rescue`}</text>` : ''}
      <line x1="${X(tNow).toFixed(1)}" x2="${X(tNow).toFixed(1)}" y1="${T}" y2="${T + gh}" stroke="#fff" stroke-width="1.5"/><circle cx="${X(tNow).toFixed(1)}" cy="${yc(sun.tempC).toFixed(1)}" r="5" fill="#fff"/><text class="dn-big" x="${(X(tNow) + (X(tNow) > W - 110 ? -8 : 8)).toFixed(1)}" y="${T + 16}" text-anchor="${X(tNow) > W - 110 ? 'end' : 'start'}">${tt`Now`}</text>
    </svg>`;
    const when = sun.up ? tt`The Sun sets in <b>${fmt.days(sun.toSunset / 24)}</b>.` : tt`The Sun rises in <b>${fmt.days(sun.toSunrise / 24)}</b>.`;
    return this.window({ title: tt('Day and night on the Moon'), wide: true, html: `<p>${tt`The line shows how hot the ground outside is. Orange is daylight, blue is night. The white dot is now. ${when}`}</p>${svg}
      <div class="dn-cards"><div class="datacard"><h4>${tt`Outside, right now`}</h4><div class="big" style="color:${sun.tempC > 0 ? '#ffb347' : '#6fb1ff'}">${Math.round(sun.tempC)}°C</div><small>${sun.up ? tt('In sunlight') : tt('In the dark')}</small></div>
      <div class="datacard"><h4>${tt`In the cave`}</h4><div class="big" style="color:#5fe3a1">${CAVE_C}°C</div><small>${tt`Day and night`}</small></div>
      <div class="datacard"><h4>${tt`Inside the station`}</h4><div class="big">${INDOOR_C}°C</div><small>${tt`Heated rooms`}</small></div></div>
      <p>${tt`<b>A Moon day is very long.</b> From one sunrise to the next takes ${K.LUNAR_DAY.toFixed(1)} Earth days. The Sun is up for about two weeks, then down for about two weeks.`}</p>
      <p>${tt`<b>Why so hot, and why so cold?</b> The Moon has no air. On Earth, air carries warmth around and holds it in at night. Without air, ground in sunlight bakes at about ${K.SURF_DAY_C}°C, and ground in the dark drops to about ${K.SURF_NIGHT_C}°C.`}</p>
      <p>${tt`<b>Why the cave stays the same.</b> Rock is a thick blanket. Under it the temperature stays near ${CAVE_C}°C all the time. That is why the station is down here.`}</p>
      <p>${tt`<b>What it means for you.</b> Solar panels only make power on the orange part of the line. Fill the battery before the line turns blue.`}</p>
      <div class="learn">${tt`The hottest and coldest numbers, and the cave temperature, were measured by spacecraft circling the Moon. The shape of the line between them is a simple model.`}</div>` });
  }
  settings() {
    const G = this.G, row = (id, on, title, sub) => `<label class="set-row"><div><b>${title}</b><span>${sub}</span></div><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i class="sw"></i></label>`;
    const lang = `<div class="set-row q-row"><div><b>🌐 ${tt('Language')}${LANG === 'en' ? '' : ' · Language'}</b><span>${tt('The game starts again in the new language. A mission in progress is saved: press Continue.')}</span></div><select id="set-lang" class="lang-sel">${LANGS.map(([k, n]) => `<option value="${k}" ${k === LANG ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    return this.window({ title: tt('Settings'), html: lang + row('set-guide', G.guide, tt('Guide mode'), tt('A yellow line on the ground shows where to go, and REGO marks the button to press in every panel.')) + row('set-minis', G.minis, tt('Job games'), tt('Play a short hands-on game before each big job (an hour or more). Off: jobs go straight to the animation.')) + row('set-minis-all', G.minisAll, tt('Games before quick jobs too'), tt('Also play one before short jobs like suiting up, unloading crates and replanting.')) + row('set-quiz', G.quiz, tt('Questions'), tt('One short question after each kind of emergency. A right answer earns a research point; a wrong one costs nothing.')) + (G.voice?.ok ? row('set-voice', G.voice.on, tt('REGO reads aloud'), tt('REGO speaks its hints, its lines and the emergency cards, using the voice built into this device. On by itself in Cadet missions until you choose.')) : '') + row('set-sound', G.audio?.on, tt('Sound'), tt('The hum of the station, your breathing in the suit, engines, alarms and radio.')) + row('set-music', G.audio?.music, tt('Music'), tt('Quiet music that darkens when the station is in danger.')) + `<div class="set-row q-row"><div><b>${tt`Graphics`}</b><span>${tt`Auto lowers the detail by itself if the game runs slowly. Low turns shadows off.`}</span></div><div class="q-btns">${['auto', 'high', 'medium', 'low'].map((q) => `<button data-q="${q}" class="${G.quality === q ? 'on' : ''}">${{ auto: tt('Auto'), high: tt('High'), medium: tt('Medium'), low: tt('Low') }[q]}</button>`).join('')}</div></div>` + `<div class="set-row q-row"><div><b>${tt`Text size`}</b><span>${tt`Makes the words bigger: cards, panels, REGO, hints and alerts.`}</span></div><div class="q-btns t-btns">${[['normal', tt('Normal')], ['large', tt('Large')], ['larger', tt('Larger')]].map(([k, n]) => `<button data-t="${k}" class="${G.textSize === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>` + row('set-fps', G.showFps, tt('Show frame rate'), tt('A small counter in the corner: frames per second and the detail in use.')) + ('<button class="ghost" id="set-practice" style="margin-top:4px">' + tt('Try the job games ▸') + '</button>'),
      onMount: (w) => { w.querySelector('#set-lang').onchange = (e) => G.setLanguage(e.target.value); w.querySelector('#set-guide').onchange = (e) => { G.setGuide(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-minis').onchange = (e) => { G.setMinis(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-minis-all').onchange = (e) => { G.setMinisAll(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-practice').onclick = () => { G.audio?.play('click'); this.close(); this.guide('games'); }; w.querySelector('#set-quiz').onchange = (e) => { G.setQuiz(e.target.checked); G.audio?.play('click'); }; const sv = w.querySelector('#set-voice'); if (sv) sv.onchange = (e) => { G.setVoice(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-sound').onchange = (e) => { G.setSound(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-music').onchange = (e) => { G.setMusic(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-fps').onchange = (e) => { G.setShowFps(e.target.checked); G.audio?.play('click'); }; w.querySelectorAll('.t-btns button').forEach((b) => (b.onclick = () => { G.setTextSize(b.dataset.t); w.querySelectorAll('.t-btns button').forEach((x) => x.classList.toggle('on', x === b)); G.audio?.play('click'); })); w.querySelectorAll('.q-btns:not(.t-btns) button').forEach((b) => (b.onclick = () => { G.setQuality(b.dataset.q); w.querySelectorAll('.q-btns:not(.t-btns) button').forEach((x) => x.classList.toggle('on', x === b)); G.audio?.play('click'); })); } });
  }
  choices(list, rec = -1) { return `<div class="choices">${list.map((c, i) => `<button class="choice ${i === rec ? 'guide-rec' : ''}" data-i="${i}" ${c.disabled ? 'disabled' : ''}>${i === rec ? ('<span class="rec-tag"><img src="assets/img/c_rego.jpg" alt="">' + tt('REGO: press this') + '</span>') : ''}<b>${c.label}</b>${c.sub ? gloss(c.sub) : ''}<div>${(c.costs || []).map((x) => `<span class="cost">${x}</span>`).join('')}${(c.gains || []).map((x) => `<span class="cost gain">${x}</span>`).join('')}</div></button>`).join('')}</div>`; }
  // Guide mode: REGO marks a window's Close button, the way it marks the button to press, when closing is what to do next
  // (a training step has just been done in it). on = false takes the mark off again.
  recClose(w, on = true) {
    const x = w && w.querySelector('.win-h .x'); if (!x) return; on = on && this.G.guide; if (x.classList.contains('guide-rec') === on) return;
    x.classList.toggle('guide-rec', on); if (on) x.insertAdjacentHTML('beforebegin', '<span class="rec-tag x-tag"><img src="assets/img/c_rego.jpg" alt="">' + tt('REGO: press this') + '</span>'); else w.querySelector('.win-h .x-tag')?.remove();
  }
  // A panel with facts and actions. Returns after the chosen action has run. closeRec: the thing to do now is to close it
  // (a training step is done), so REGO marks Close instead of an action.
  async panel(title, { stats = [], actions = [], note, img, closeRec = false }) {
    const html = `${stats.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}${this.choices(actions, closeRec ? -1 : this.recIndex(actions))}${note ? `<div class="learn">${gloss(note)}</div>` : ''}`;
    const i = await this.window({ title, html, img, onMount: (w) => { w.querySelectorAll('.choice').forEach((b) => (b.onclick = () => { this.G.audio?.play('click'); this.close(Number(b.dataset.i)); })); if (closeRec) this.recClose(w); } });
    if (i !== undefined) await actions[i].run();
  }
  // Event card. cfg: { art, title, real, body, learn, choices, advice (index), adviceText }
  card(cfg) {
    const S = this.G.S, canCall = S && S.flow.commsOn && cfg.advice !== undefined;
    const html = `${cfg.real ? `<div class="real">${tt`<b class="tag">THIS REALLY HAPPENED</b>${cfg.real}`}</div>` : ''}<div class="body">${gloss(cfg.body)}</div>${cfg.learn ? `<div class="learn">${gloss(cfg.learn)}</div>` : ''}${this.choices(cfg.choices, this.G.guide && cfg.advice !== undefined && !cfg.choices[cfg.advice]?.disabled ? cfg.advice : -1)}${cfg.advice !== undefined ? `<div class="row"><button class="ghost" id="call" ${canCall ? '' : 'disabled'}>${tt`${IC.dish} Ask Mission Control ${canCall ? tt('(answer takes 2.6 s)') : tt('(Earth Link is down)')}`}</button><span id="call-out"></span></div>` : ''}`;
    this.G.audio?.play(cfg.good ? 'ok' : 'alarm'); this.G.voice?.say(cfg.title + '. ' + cfg.body);
    return this.window({ title: cfg.title, html, img: cfg.art, closable: false, onMount: (w) => {
      w.querySelectorAll('.choice').forEach((b) => (b.onclick = () => { this.G.audio?.play('click'); this.G.voice?.stop(); this.close(Number(b.dataset.i)); }));
      const call = w.querySelector('#call'); if (call) call.onclick = () => { call.disabled = true; const out = w.querySelector('#call-out'); out.textContent = tt('Your question is flying to Earth… 1.3 s'); setTimeout(() => (out.textContent = tt('…and the answer is flying back… 1.3 s')), 1300); setTimeout(() => { out.textContent = tt('Mission Control: “') + (cfg.adviceText || tt('We suggest the glowing choice.')) + '”'; w.querySelectorAll('.choice')[cfg.advice]?.classList.add('rec'); this.G.audio?.play('radio'); }, 2600); };
    } });
  }

  // ---------- Power Board ----------
  // Guide mode on the Power Board: the one switch REGO would press now, and why. Returns { k, i, why } or null.
  powerHint(S, F) {
    const lv = S.lv, cost = (k, i) => SYS[k].kw[i] - SYS[k].kw[lv[k]], canPay = (k, i) => F.eff >= 1 && (F.net - cost(k, i) >= -0.5 || S.battery > F.cap * 0.25);
    const up = (k, why) => (lv[k] < SYS[k].kw.length - 1 && canPay(k, lv[k] + 1) ? { k, i: lv[k] + 1, why } : null), set = (k, i, why) => ({ k, i, why });
    const u = F.use, daysLeft = S.hours === Infinity ? Infinity : (S.hours - (S.t - S.t0)) / 24;
    // in a brownout every machine runs weak, heaters too: the level that really keeps topside warm is higher than the one on paper
    const heatTarget = Math.min(3, Math.ceil(F.heatNeed / Math.max(F.eff, 0.05) - 0.01));
    // the battery has to last until the panels can refill it (the next sunrise; a lunar night is about 354 h), or until the rescue ship
    const horizon = Math.min(F.sun.up ? F.sun.toSunset + 354 : F.sun.toSunrise, daysLeft * 24), short = F.net < 0 && (F.battHours < 10 || F.battHours < horizon);
    // What to turn down, smallest loss first. Each one must really save power: a broken dish already draws nothing.
    const shed = (lead, keepHeat, freeOnly) => {   // freeOnly: just the cuts that cost nothing (by day, while the battery still lasts until sunset)
      const r = (k, i, why) => set(k, i, lead + ' ' + why);
      if (!keepHeat && lv.heat > heatTarget) return r('heat', heatTarget, tt('The heaters are higher than the machines topside need.'));
      if (lv.comms > 1 && u.comms > 0) return r('comms', 1, tt('Level 1 still gives storm warnings.'));
      if (lv.isru && F.o2Days > 2) return r('isru', 0, tt('The Moon-Dust Oxygen Plant is the hungriest machine.'));
      if (freeOnly) return null;
      if (lv.farm > 1) return r('farm', lv.farm - 1, tt('Dimmer grow lights only slow the crops.'));
      if (lv.recycler > 1 && F.waterDays > 2) return r('recycler', lv.recycler - 1, tt('You get a little less water back.'));
      if (lv.farm === 1 && u.farm > 0 && F.foodDays > Math.min(daysLeft, 4) + 0.5) return r('farm', 0, tt`Food lasts ${fmt.days(F.foodDays)}, so the plants can wait in the dark for a while.`);
      if (u.bots > 0) return { k: null, why: lead + tt` The helper robots use <b>${u.bots.toFixed(0)} kW</b>: set them to Rest in the Control Center.` };
      if (lv.comms > 0 && u.comms > 0) return r('comms', 0, tt('You lose storm warnings, so stay close to the elevator.'));
      return null;
    };
    const stuck = (lead) => ({ k: null, why: lead + tt(' Nothing left on this board can be turned down without hurting life support. ') + (F.sun.up ? tt('Get more solar panels working.') : daysLeft * 24 < F.sun.toSunrise ? (F.eff < 1 ? tt`The rescue ship lands in ${fmt.days(daysLeft)}, before the Sun comes up. Keep what power there is for air and water until then.` : tt`The rescue ship lands in ${fmt.days(daysLeft)}, before the Sun comes up. When the battery runs out, turn the Topside Heaters down first: frozen machines can be mended later, and air and water cannot wait.`) : tt('Solar panels make nothing until sunrise: rebuild the Battery Store and fix panels by day, so the next night is easier.')) });
    if (F.eff < 1) { const h = shed(tt('<b>Brownout:</b> the battery is empty, so turn something down.')); if (h) return h;
      // still short and the air is running out: breathing comes before warm machines
      if (lv.heat > 0 && (S.o2 < 1 || F.o2Days < 2)) return set('heat', lv.heat - 1, tt('<b>Brownout, and oxygen is low.</b> Breathing comes first: the heaters take power the Oxygen Maker needs. Topside machines may freeze, but they can be fixed later.'));
      // still short, at night, and nothing else can go: weak machines freeze topside anyway, so the heaters' power is better spent on air and water
      if (!F.sun.up && lv.heat > 0) return set('heat', lv.heat - 1, tt('<b>Brownout</b>, and nothing else on this board can go. The heaters take power that air and water need. Topside machines may freeze, but they can be mended later.'));
      return stuck(tt('<b>Brownout:</b> the battery is empty.')); }
    if (lv.heat < F.heatNeed) { const after = F.net - cost('heat', F.heatNeed);   // heating up when the battery cannot pay for it only swaps frozen machines for a blackout
      if (after < 0 && S.battery / -after < 6) { const h = shed(tt`Topside machines need heater level <b>${F.heatNeed}</b>, but the battery cannot pay for that for long. Turn this down first, then the heaters up.`, true); if (h) return h; }
      return set('heat', F.heatNeed, tt`Topside machines need heater level <b>${F.heatNeed}</b> right now, or something will break.`); }
    if (S.f.commsDown && lv.comms > 0 && F.use.comms > 0) return set('comms', 0, tt('The dish is knocked over, so the Earth Link is burning power for nothing. Switch it off until the dish is fixed.'));
    if (S.o2 < 0.8 || (F.o2Net < 0 && F.o2Days < 2)) { const h = machineOk(S, 'oxygen') && S.water > 3 ? up('o2gen', tt('<b>Oxygen is running low.</b> Turn the Oxygen Maker up. It costs power and water.')) : null; if (h) return h; if (!S.f.isruDown && !lv.isru && canPay('isru', 1)) return set('isru', 1, tt('<b>Oxygen is running low.</b> The Moon-Dust Oxygen Plant makes oxygen without using water.'));
      if (machineOk(S, 'oxygen') && lv.o2gen < 3 && S.water > 3) { const s2 = shed(tt('<b>Oxygen is running low</b> and the battery cannot pay for more yet. Turn this down first, then the Oxygen Maker up.')); if (s2) return s2; } }
    if (short) { const lead = tt`The battery will be empty in <b>${fmt.hrs(F.battHours < 1 ? Math.max(0.1, Math.round(F.battHours * 10) / 10) : Math.floor(F.battHours))}</b>${F.sun.up ? (F.battHours < F.sun.toSunset ? tt(', even before sunset') : tt(', and the panels stop at sunset')) : tt(', long before sunrise')}.`, dayOk = F.sun.up && F.battHours > F.sun.toSunset, broken = S.mounts.filter((m) => m === 2).length;
      return shed(lead, false, dayOk) || (dayOk ? { k: null, why: lead + tt` ${broken ? tt`Fix the broken solar panels before sunset, in ${fmt.hrs(Math.floor(F.sun.toSunset))}` : tt`Build more panels or a bigger battery before sunset, in ${fmt.hrs(Math.floor(F.sun.toSunset))}`}: after that only the reactor is left. If the night still looks short, turn the farm lights and the robots down then.` } : stuck(lead)); }
    if (F.wNet < 0 && F.waterDays < 3 && machineOk(S, 'water')) { const h = up('recycler', tt('<b>Water is dropping.</b> Turn the Water Recycler up to get more of it back.')); if (h) return h; }
    if (!short && F.farms > 0 && lv.farm === 0 && canPay('farm', 1)) return set('farm', 1, tt('The grow lights are off, so the plants are wilting. Level 1 keeps them alive.'));
    if (F.farms > 0 && F.foodDays < 2) { const h = up('farm', tt('<b>Food is short.</b> Brighter grow lights make the crops ripen faster.')); if (h) return h; }
    if (!short && !S.f.commsDown && lv.comms === 0 && canPay('comms', 1)) return set('comms', 1, tt('The Earth Link is off, so storms arrive with no warning. Level 1 gives about 4 hours.'));
    { const np = this.G && this.G.nightPlan && this.G.S === S ? this.G.nightPlan() : null;
      if (np) return { k: null, why: tt`<b>Tonight the power will run short.</b> After sunset, in ${fmt.hrs(Math.max(1, Math.round(np.toSunset)))}, only the reactor makes power: ${np.reactor} kW, and the base needs about ${np.need.toFixed(1)} kW.` + ' ' + (np.say || np.tip + '.') + ' ' + tt`At sunset, turn the Topside Heaters up to level ${np.heat}, and the farm lights and the robots down.` }; }
    if (S.battery >= F.cap - 1 && F.net > 3) { const h = (F.farms > 0 && up('farm', tt('The battery is full and power is being wasted. Spend it on faster crops.'))) || (machineOk(S, 'oxygen') && S.water > 6 && S.o2 < S.o2Cap - 0.5 && up('o2gen', tt('The battery is full and power is being wasted. Spend it on spare oxygen.'))); if (h) return h; }
    return null;
  }
  powerBoard(opts = {}) {
    const G = this.G, S = G.S;
    const render = (w) => {
      const F = computeFlows(S), u = F.use, total = Math.max(F.supply, F.demand, 1), sun = F.sun, hint = !G.guide ? null : opts.goal ? (opts.goal.rec && !opts.goal.done(S) ? { ...opts.goal.rec, why: '' } : null) : this.powerHint(S, F);
      const seg = (v, color, label) => (v > 0.05 ? `<span style="width:${(v / total) * 100}%;background:${color}" title="${label} ${v.toFixed(1)} kW">${v / total > 0.1 ? label + ' ' + v.toFixed(0) : ''}</span>` : '');
      const lvl = (k) => `<div class="lv">${SYS[k].kw.map((kw, i) => `<button data-k="${k}" data-i="${i}" class="${S.lv[k] === i ? 'on' : ''} ${hint && hint.k === k && hint.i === i ? 'guide-rec' : ''}">${SYS[k].kw.length === 2 ? [tt('OFF'), tt('ON')][i] : i === 0 ? tt('OFF') : i}<small>${kw} kW</small></button>`).join('')}</div>`;
      const eff = {
        o2gen: !machineOk(S, 'oxygen') ? ('<span class="down">' + tt('The Oxygen Room is broken. Fix the room first.') + '</span>') : S.water <= 0 ? ('<span class="down">' + tt('No water to split!') + '</span>') : tt`Makes <b>${SYS.o2gen.out[S.lv.o2gen]} kg</b> of oxygen a day and drinks <b>${(SYS.o2gen.out[S.lv.o2gen] * K.H2O_PER_KG_O2).toFixed(1)} L</b> of water a day.`,
        isru: S.f.isruDown ? ('<span class="down">' + tt('Broken by the meteor shower. Repair it topside.') + '</span>') : S.lv.isru ? tt('Makes <b>2.2 kg</b> of oxygen a day from moon soil. Uses no water.') : tt('Off.'),
        recycler: !machineOk(S, 'water') ? ('<span class="down">' + tt('The Water Room is broken. Fix the room first.') + '</span>') : tt`<b>${Math.round(F.rate * 100)}%</b> of used water comes back${roomOk(S, 'bathroom') ? '' : tt(' (less while the Bathroom is broken)')}. You lose ${(F.wUsed * (1 - F.rate)).toFixed(1)} L a day.`,
        farm: F.farms === 0 ? ('<span class="down">' + tt('Both farm rooms are broken.') + '</span>') : S.lv.farm === 0 ? ('<span class="down">' + tt('Lights off: plants slowly wilt.') + '</span>') : tt`${F.farms} of 2 farms lit. Growth ×${F.grow.toFixed(2)}. Plants add ${F.o2Farm.toFixed(2)} kg of oxygen a day.`,
        heat: tt`Topside is <b>${fmt.temp(sun.tempC)}</b>. Machines up there need level <b>${F.heatNeed}</b> right now. ${S.lv.heat >= F.heatNeed ? ('<span class="up">' + tt('OK') + '</span>') : ('<span class="down">' + tt('Too low — something will break!') + '</span>')}`,
        comms: S.f.commsDown ? ('<span class="down">' + tt('The dish is down — fix it topside.') + '</span>') : [tt('No link: storms arrive with no warning.'), tt('Storm warnings about 4 hours ahead.'), tt('Storm warnings about 8 hours ahead.')][S.lv.comms],
      };
      const rows = Object.keys(SYS).map((k) => `<div class="sys"><div class="ico">${IC[SYS[k].ico]}</div><div><h4>${SYS[k].name}</h4><p>${gloss(SYS[k].blurb)}</p></div>${lvl(k)}<div class="eff">${eff[k]}</div></div>`).join('');
      const sgn = (x, d = 1) => `<b class="${x >= 0 ? 'up' : 'down'}">${x >= 0 ? '+' : ''}${x.toFixed(d)}</b>`;
      const netTxt = F.net >= 0 ? (S.battery >= F.cap - 1 ? tt`Battery full — extra power is wasted. Use it, or make room for it: ${S.rooms.storage.built < 1 ? tt('rebuild the Battery Store') : S.mods < 6 ? tt('add a battery module') : tt('the Battery Store is at its largest')}.` : tt`Full in ${fmt.hrs(Math.ceil((F.cap - S.battery) / Math.max(F.net, 0.01)))}`) : tt`Empty in <b class="down">${fmt.hrs(Math.floor(F.battHours))}</b>`;
      const chg = S.car.charging || S.ship.charging || S.chargeOff ? `<div class="stat"><span>${tt`Chargers (rover, hopper)${S.chargeOff ? (' <small>' + tt('switched off: they do not charge') + '</small>') : ''}`}</span><span>${u.chargers.toFixed(1)} kW <button class="mini-b ${S.chargeOff ? 'off' : ''}" id="pb-chg">${S.chargeOff ? tt('Switch on') : tt('Switch off')}</button></span></div>` : '';
      const auto = chg + [[tt('Fix-It bench & builder'), u.tools], [tt('Helper robots'), u.bots], [tt('Fish tank pump'), u.pump], [tt('Extra'), F.extra]].filter((x) => x[1] > 0).map(([a, b]) => `<div class="stat"><span>${a}</span><span>${b.toFixed(1)} kW</span></div>`).join('');
      w.querySelector('.win-b').innerHTML = `
        <div class="note">${tt`<b>No choice is free.</b> Every machine eats power. Turn one up, and something else gets less — or the battery drains faster.`}</div>
        ${G.guide && !opts.goal ? `<div class="rec-banner ${hint ? '' : 'calm'}"><img src="assets/img/c_rego.jpg" alt=""><div>${tt`<b>REGO${hint && hint.k ? tt(': press the glowing switch') : ''}</b>${hint ? `${hint.k ? `${SYS[hint.k].name} → ${SYS[hint.k].kw.length === 2 ? [tt('OFF'), tt('ON')][hint.i] : hint.i === 0 ? tt('OFF') : tt`level ${hint.i}`}. ` : ''}${hint.why}` : tt('Nothing needs changing right now. The switches are set well for what we have.')}`}</div></div>` : ''}
        <div class="grid2" style="margin-top:12px"><div>${rows}</div><div>
          <h4 class="h4">${tt`Power right now`}</h4><div class="mini">${(F.nOk === 1 ? tt`Coming in: ${F.supply.toFixed(1)} kW · ${F.nOk} solar panel working` : tt`Coming in: ${F.supply.toFixed(1)} kW · ${F.nOk} solar panels working`)}</div>
          <div class="flowbar">${seg(F.solar, '#ffd257', tt('Solar'))}${seg(F.reactor, '#8fe9a8', tt('Reactor'))}</div><div class="mini">${tt`Going out: ${F.demand.toFixed(1)} kW`}</div>
          <div class="flowbar">${seg(u.base, '#9aa7b4', tt('Base'))}${seg(u.o2gen, '#49e6ff', 'O₂')}${seg(u.isru, '#ff9a3d', tt('Dust O₂'))}${seg(u.recycler, '#5aa6d8', tt('Water'))}${seg(u.farm, '#ff6fdc', tt('Farm'))}${seg(u.heat, '#ff6a4a', tt('Heat'))}${seg(u.comms, '#c9b8ff', tt('Link'))}${seg(u.chargers + u.tools + u.bots + u.pump + F.extra, '#ffffff', tt('Other'))}</div>
          <div class="stat"><span>${tt`Left over`}</span><span>${sgn(F.net)} kW</span></div><div class="stat"><span>${tt`Battery ${Math.round(S.battery)} / ${Math.round(F.cap)} kWh`}</span><span>${netTxt}</span></div>${auto}
          ${F.eff < 1 ? `<div class="note bad">${tt`<b>Brownout!</b> The battery is empty, so every machine runs at ${Math.round(F.eff * 100)}%.`}</div>` : ''}
          <h4 class="h4" style="margin-top:14px">${tt`If nothing changes…`}</h4>
          <div class="stat"><span>${tt`Oxygen ${S.o2.toFixed(1)} kg`}</span><span>${tt`${sgn(F.o2Net, 2)} kg/day${F.o2Net < 0 ? tt(' · lasts ') + fmt.days(F.o2Days) : ''}`}</span></div>
          <div class="stat"><span>${tt`Water ${S.water.toFixed(0)} L`}</span><span>${tt`${sgn(F.wNet)} L/day${F.wNet < 0 ? tt(' · lasts ') + fmt.days(F.waterDays) : ''}`}</span></div>
          <div class="stat"><span>${(F.people === 1 ? tt`Food for ${F.people} person` : tt`Food for ${F.people} people`)}</span><span>${tt`lasts ${fmt.days(F.foodDays)}`}</span></div>
          <div class="stat"><span>${sun.up ? tt('Sunset in') : tt('Sunrise in')}</span><span><b>${fmt.days((sun.up ? sun.toSunset : sun.toSunrise) / 24)}</b></span></div>
          ${S.hours === Infinity ? '' : `<div class="stat"><span>${tt`Rescue in`}</span><span><b>${fmt.days((S.hours - (S.t - S.t0)) / 24)}</b></span></div>`}
          <div class="learn" style="margin-top:12px">${G.advise ? G.advise(true) : ''}</div>${opts.goal ? `<div class="note" id="goal">${opts.goal.text}</div>` : ''}</div></div>`;
      { const cb = w.querySelector('#pb-chg'); if (cb) cb.onclick = () => { S.chargeOff = !S.chargeOff; if (S.chargeOff) S.car.charging = S.ship.charging = false; G.audio?.play('click'); render(w); }; }
      w.querySelectorAll('.lv button').forEach((b) => (b.onclick = () => {
        const k = b.dataset.k, i = Number(b.dataset.i), before = computeFlows(S), old = S.lv[k]; S.lv[k] = i; const after = computeFlows(S); G.audio?.play('click'); render(w);
        if (old !== i) { const dKw = after.demand - before.demand, bits = []; if (Math.abs(after.o2Net - before.o2Net) > 0.01) bits.push(tt`oxygen ${after.o2Net > before.o2Net ? '+' : ''}${(after.o2Net - before.o2Net).toFixed(2)} kg/day`); if (Math.abs(after.wNet - before.wNet) > 0.05) bits.push(tt`water ${after.wNet > before.wNet ? '+' : ''}${(after.wNet - before.wNet).toFixed(1)} L/day`); if (Math.abs(after.grow - before.grow) > 0.01) bits.push(tt`farm growth ×${after.grow.toFixed(1)}`);
          w.querySelector('.note').innerHTML = tt`<b>${SYS[k].name} → ${i === 0 ? tt('OFF') : SYS[k].kw.length === 2 ? tt('ON') : tt`level ${i}`}:</b> power use ${dKw >= 0 ? '+' : ''}${dKw.toFixed(1)} kW${bits.length ? ', ' + bits.join(', ') : ''}. ${dKw > 0 ? (after.net < 0 ? tt`The battery now drains in ${fmt.hrs(Math.floor(after.battHours))}.` : tt('You still have power to spare.')) : tt('That power can go somewhere else now.')}`; }
        if (opts.goal && opts.goal.done(S)) { const x = w.querySelector('.x'); if (x) x.disabled = false; const g = w.querySelector('#goal'); if (g) g.innerHTML = opts.goal.ok; }
        if (opts.goal) this.recClose(w, opts.goal.done(S));   // done: REGO now points at Close, so you know to shut the board and carry on
      }));
    };
    return this.window({ title: tt('Power Board — who gets the electricity?'), html: '', wide: true, onMount: (w) => { render(w); if (opts.goal) { const ok = opts.goal.done(S); w.querySelector('.x').disabled = !ok; this.recClose(w, ok); } } });
  }

  // Guide mode in the Control Center: the one crew job REGO would change now, and why. Returns { h, r, why } or null.
  // Short of power, a working robot rests (it is 1 kW saved at once). Otherwise a helper with nothing to do gets the job nobody is
  // doing: Farm duty, then Cook when raw food is waiting, then Panel cleaner when the panels are dusty; a person can also build.
  // A robot is only put to work when there is power to spare.
  crewHint(S, F) {
    const H = S.helpers, has = (role) => H.some((q) => q.role === role), short = F.eff < 1 || (F.net < 0 && F.battHours < 10);
    if (short) { const b = H.find((q) => q.kind === 'bot' && q.role !== 'idle' && hasWork(S, q.role)); if (b) return { h: b.id, r: 'idle', why: tt('The battery is running out, and a working robot uses 1 kW. Let it rest until there is power to spare.') }; }
    const ripe = S.racks.some((q) => q.ripe && roomOk(S, q.room));
    const jobFor = (q) => {
      if (q.kind === 'bot' && (short || F.net <= 2)) return null;
      if (!has('farm') && hasWork(S, 'farm')) return ['farm', ripe ? tt('Crops are ripe and nobody is picking them.') : tt('Nobody is looking after the crops and the hens.')];
      if (!has('cook') && hasWork(S, 'cook') && S.raw >= 2) return ['cook', tt('Raw food is waiting, and cooked food is worth twice as much.')];
      if (!has('clean') && F.sun.up && S.dust > 0.25) return ['clean', tt('Dust is building up on the solar panels.')];
      if (q.kind !== 'bot' && !has('build')) return ['build', tt('A builder makes every fix and repair faster, and a person uses no electricity.')];
      return null;
    };
    const free = [...H.filter((q) => q.role !== 'idle' && !hasWork(S, q.role)), ...H.filter((q) => q.role === 'idle' && q.kind !== 'bot'), ...H.filter((q) => q.role === 'idle' && q.kind === 'bot')];
    for (const q of free) { const j = jobFor(q); if (j) return { h: q.id, r: j[0], why: j[1] }; }
    return null;
  }
  // ---------- Control Center: where is the error? + door locks + crew jobs ----------
  control() {
    const G = this.G, S = G.S, here = roomOk(S, 'control');
    const render = (w) => {
      const al = G.alerts(), F = computeFlows(S), hint = G.guide ? this.crewHint(S, F) : null, hintWho = hint && S.helpers.find((q) => q.id === hint.h);
      const doors = ROOMS.map((d) => { const r = S.rooms[d.id], st = roomState(S, d.id); return `<div class="stat"><span><i class="dotc" style="background:${RCOL[st]}"></i>${d.name} <small>${st === 'ok' ? r.p.toFixed(0) + ' kPa' : RTXT[st]}</small></span><button class="mini-b ${r.door ? '' : 'off'}" data-door="${d.id}" ${here ? '' : 'disabled'}>${r.door ? IC.door + tt(' Open') : IC.lock + tt(' Locked')}</button></div>`; }).join('');
      const crew = S.helpers.map((hp) => `<div class="crew"><img src="assets/img/${hp.img}.jpg" alt=""><div><b>${hp.name}</b><small>${hp.kind === 'bot' ? tt('Robot · uses 1 kW while working') : tt('Astronaut · eats 3 meals a day, no electricity')}</small>${hp.role !== 'idle' && !hasWork(S, hp.role) ? `<small style="color:#ffb347">${tt`Nothing to do: ${hp.role === 'farm' ? tt('no farm and no Animal Bay is working') : tt('the Kitchen is not working')}.${hp.kind === 'bot' ? tt(' It is standing still and uses no power.') : ''}`}</small>` : ''}<div class="roles">${Object.entries(ROLES).map(([k, r]) => `<button data-h="${hp.id}" data-r="${k}" class="${hp.role === k ? 'on' : ''}${hint && hint.h === hp.id && hint.r === k ? ' guide-rec' : ''}" data-tip="${r.tip}">${r.name}</button>`).join('')}</div></div></div>`).join('');
      const crewRec = hint ? `<div class="rec-banner"><img src="assets/img/c_rego.jpg" alt=""><div><b>${tt('REGO: press the glowing job')}</b>${hintWho.name} → ${ROLES[hint.r].name}. ${hint.why}</div></div>` : '';
      w.querySelector('.win-b').innerHTML = `<div class="grid2"><div><canvas id="cc-map" width="900" height="300"></canvas>
          <div class="legend">${Object.entries(RTXT).map(([k, v]) => `<span><i style="background:${RCOL[k]}"></i>${v}</span>`).join('')}</div>
          <h4 class="h4">${tt`Where is the error?`}</h4>${al.length ? al.map((a) => `<div class="alert ${a.kind || ''}" data-go="${a.go || ''}">${IC.alert} ${a.text}<small>${a.sub || ''}</small></div>`).join('') : ('<div class="learn">' + tt('No errors. Everything is running.') + '</div>')}
          <h4 class="h4">${tt`Topside`}</h4><div class="stat"><span>${tt`Solar panels`}</span><b>${tt`${F.nOk} working · ${S.mounts.filter((x) => x === 2).length} broken · ${S.mounts.filter((x) => x === 0).length} empty mounts`}</b></div>
          <div class="stat"><span>${tt`Rover / Hopper charge`}</span><b>${Math.round(S.car.charge * 100)}% / ${Math.round(S.ship.charge * 100)}%</b></div>
          <div class="stat"><span>${tt`Other stations`}</span><b>${SITES.map((s) => s.short + (S.rescued.includes(s.id) ? ' ✓' : ' ?')).join(' · ')}</b></div>
          <div class="row"><button class="ghost" id="cc-power">${tt`${IC.bolt} Power Board`}</button><button class="ghost" id="cc-map2">${tt`${IC.map} World map`}</button></div></div>
        <div><h4 class="h4">${tt`Bulkhead doors`}</h4>${here ? ('<div class="mini">' + tt('Lock a door to stop a leak spreading. The room behind it loses its air and freezes.') + '</div>') : ('<div class="note bad">' + tt('The Control Center is damaged. Use the switch beside each door.') + '</div>')}${doors}
          <h4 class="h4" style="margin-top:12px">${tt`Crew jobs`}</h4><div class="mini">${tt`Robots cost electricity. Rescued astronauts cost food. Nobody works for free.`}</div>${crewRec}${crew}</div></div>`;
      const cv = w.querySelector('#cc-map'), paint = () => drawStation(cv.getContext('2d'), S, 900, 300, { big: true, player: G.player.zone === 'deep' ? { x: G.player.pos.x, z: G.player.pos.z } : null }); paint(); clearInterval(this._tick); this._tick = setInterval(paint, 250);
      w.querySelectorAll('[data-door]').forEach((b) => (b.onclick = () => { G.toggleDoor(b.dataset.door); render(w); }));
      w.querySelectorAll('.roles button').forEach((b) => (b.onclick = () => { S.helpers.find((x) => x.id === b.dataset.h).role = b.dataset.r; G.audio?.play('click'); render(w); }));
      w.querySelectorAll('.alert[data-go]').forEach((a) => (a.onclick = () => { if (a.dataset.go) { G.pointTo(a.dataset.go); this.close(); } }));
      w.querySelector('#cc-power').onclick = () => { this.close(); setTimeout(() => this.powerBoard(), 30); }; w.querySelector('#cc-map2').onclick = () => { this.close(); setTimeout(() => this.bigMap(), 30); };
    };
    return this.window({ title: tt('Control Center'), html: '', wide: true, img: 'rm_control', onMount: render });
  }
  // ---------- world map (M) ----------
  bigMap(start) {
    const G = this.G, TABS = [['base', tt('The base')], ['world', tt('The whole area')], ['deep', tt('Inside the station')], ['real', tt('The real Moon')]]; let view = start || (G.player.zone === 'deep' ? 'deep' : 'base');
    const places = [['gate', tt('Pit Elevator')], ['solar', tt('Solar Field')], ['depot', tt('Cargo Depot')], ['park', tt('Charging Pads')], ['dish', tt('Dish')], ['isru', tt('Oxygen Plant')], ['car', tt('My Rover')], ['ship', tt('My Hopper')], ...SITES.map((s) => [s.id, s.name])];
    const render = (w) => {
      if (view === 'real') { clearInterval(this._tick); w.querySelector('.win-b').innerHTML = `<div class="tabs">${TABS.map(([k, v]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${v}</button>`).join('')}</div>${this.realMoon()}`; w.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { view = b.dataset.v; render(w); })); return; }
      w.querySelector('.win-b').innerHTML = `<div class="tabs">${TABS.map(([k, v]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${v}</button>`).join('')}</div>
        <div class="grid2"><canvas id="bm" width="${view === 'deep' ? 1000 : 720}" height="${view === 'deep' ? 340 : 720}" style="width:100%;border-radius:12px;border:1px solid var(--line)"></canvas>
        <div><h4 class="h4">${tt`Point the guide beam at…`}</h4><div class="places">${places.map(([id, n]) => `<button class="mini-b" data-go="${id}">${n}</button>`).join('')}</div><div class="learn">${tt`The orange beam shows the way. On the map: blue = working panel, red = broken, grey = empty mount. The coloured pictures are the other stations, with how far each one is from you. The faint rings are 200 m apart.`}</div></div></div>`;
      const cv = w.querySelector('#bm'), c = cv.getContext('2d'), paint = () => (view === 'deep' ? drawStation(c, G.S, 1000, 340, { big: true, player: G.player.zone === 'deep' ? { x: G.player.pos.x, z: G.player.pos.z } : null, target: G.world.target && G.world.target.zone === 'deep' ? G.world.target : null }) : drawSurface(c, G, 720, 720, view === 'base' ? 190 : 700, 0, view === 'base' ? 0 : 20, true));
      paint(); clearInterval(this._tick); this._tick = setInterval(paint, 300);
      w.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { view = b.dataset.v; render(w); })); w.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { G.pointTo(b.dataset.go); this.close(); }));
    };
    return this.window({ title: tt('Map'), html: '', wide: true, onMount: render });
  }
  // The real Moon, to scale: how far the ice really is from the base. Every number comes from js/moonmap.js.
  realMoon() {
    const gate = STATIONS.find((q) => q.id === 'gate').pos, F = realFacts(Math.hypot(MINE.x - gate[0], MINE.z - gate[1])), n = (v, step) => roundTo(v, step).toLocaleString('en-US');
    return `<div class="grid2 rm"><div>${realMoonSvg(460)}<div class="learn">${tt`The dark patches are the Moon's seas of old lava, drawn as simple round shapes in their real places. The distances are worked out from the real positions of the pit, the poles and the probe's crater. The whole Moon is ${n(F.widthKm, 5)} km wide: at this size your whole game map would be smaller than one dot on the screen.`}</div></div>
      <div><p>${tt`This is the side of the Moon you can see from Earth. The <b style="color:#ffb347">orange dot</b> is your base. The <b style="color:#9fd4ff">blue bands</b> at the top and bottom are where ice has been found.`}</p>
      <div class="rm-cards"><div class="datacard"><h4>${tt`In the game`}</h4><div class="big">${n(F.gameM, 10)} m</div><small>${tt`Pit Elevator to the ice mine`}</small></div><div class="datacard"><h4>${tt`On the real Moon`}</h4><div class="big" style="color:#ffb347">${n(F.poleKm, 100)} km</div><small>${tt`Base to the nearest pole`}</small></div><div class="datacard"><h4>${tt`The real trip is`}</h4><div class="big" style="color:#fff">${tt`${n(F.times, 500)} times`}</div><small>${tt`as far as the game draws it`}</small></div></div>
      <p>${tt`<b>Where you are.</b> Your base is at a real place: a pit in the Sea of Tranquility, a little north of the Moon's middle line.`}</p>
      <p>${tt`<b>Where the ice is.</b> Ice lasts only where the Sun never shines: on the floors of dark craters near the two poles. The nearest pole is about ${n(F.poleKm, 100)} km from your base. The crater where a probe found water in the soil is near the other pole, about ${n(F.probeKm, 100)} km away.`}</p>
      <p>${tt`<b>How long is that drive?</b> The rovers that astronauts drove on the Moon went about ${ROVER_KMH} km/h on flat ground. At that speed the trip to the pole is about ${n(F.hours, 10)} hours of driving: ${Math.round(F.days)} days and nights without a stop. Earth is ${F.earthKm.toLocaleString('en-US')} km away: more than ${Math.floor(F.earthTimes / 50) * 50} times as far again.`}</p>
      <p>${tt`<b>So why is the mine close by in the game?</b> That part is our story. The safe cave is real and the ice is real, but they are far apart. The game draws them a short trip apart so you can use both in one mission. Most real plans for a Moon base choose a place near the south pole, close to the ice.`}</p></div></div>`;
  }
  guide(tab = 'how') {
    const tabs = { how: tt('How to play'), truth: tt('Real or made up?'), tube: tt('Why live in a lava tube?'), tour: tt('Station tour'), games: tt('Try the job games'), words: tt('Space words') };
    const pages = {
      how: () => `<div class="body grid2"><div><p>${tt`<b>Your job:</b> keep the electricity on and the air in until rescue arrives.`}</p><p>${tt`<b>Move:</b> W A S D or arrows · <b>Look:</b> drag the mouse (or click the game to lock it) · <b>Hop:</b> Space · <b>Run:</b> Shift`}</p><p>${tt`<b>Zoom:</b> mouse wheel, pinch, or the <b>+</b> and <b>−</b> keys. Zoom all the way in to see through your own eyes. <b>Camera lock:</b> click the game and the camera follows the mouse; <b>Esc</b> frees the mouse. The lock button at the bottom shows which it is.`}</p><p>${tt`<b>Do things:</b> walk up to something and press <b>E</b>. The bar at the bottom always tells you what E will do.`}</p><p>${tt`<b>Spacesuit:</b> the cave and the surface have no air, so you wear your suit there. Inside the station you can take it off at the <b>Suit Lockers</b> in the airlock: indoor jobs go faster, and you can cook and sleep. Put it back on before you leave!`}</p><p>${tt`<b>Carry:</b> pick up a panel or a crate with E, walk it to the rover, press E to load it. Press <b>Q</b> at the rover to take things out.`}</p><p>${tt`<b>Drive / fly:</b> E at the rover or hopper. W S A D to steer. In the hopper, Space goes up and C goes down. Park on a round pad to recharge.`}</p><p>${tt`<b>Tab</b> Power Board · <b>M</b> Map · <b>H</b> ask REGO · <b>V</b> change view · <b>P</b> pause`}</p></div>
        <div><p>${tt`<b>Power</b> comes from solar panels. Fix the broken ones, then build more.`}</p><p>${tt`<b>Air</b> must stay in. If a room gets a hole, lock its door before the whole station empties.`}</p><p>${tt`<b>Oxygen</b> is made from water in the Oxygen Room.`}</p><p>${tt`<b>Food:</b> tins run out. Each farm has three racks: choose what they grow. Every crop wants different light, water, warmth and plant food, and grows only as fast as whatever it has least of. Keep the hens fed, and cook.`}</p><p>${tt`<b>Water:</b> carry canisters of icy soil to the <b>Water Plant</b> topside and extract the ice. Press <b>L</b> to see where every litre and every breath goes.`}</p><p>${tt`<b>Day and night:</b> the white line in the clock's day bar is the temperature outside, and the green line is the cave. Click the clock, or press <b>T</b>, to see the whole Moon day.`}</p><p>${tt`<b>Materials</b> fix and build everything. Other stations have more — and people who need rescuing.`}</p><p>${tt`<b>Helpers:</b> robots cost power, people cost food. Give them jobs in the Control Center.`}</p></div></div>`,
      truth: () => `<p class="body">${tt`Most of this game is real science. Here is what is real and what we made simpler so you can finish a mission in one sitting. The full list of sources is in the project's docs folder.`}</p><table class="t"><tr><th>${tt`In the game`}</th><th></th><th>${tt`The truth`}</th></tr>${[
        [tt('A person breathes 0.84 kg of oxygen a day'), 1, tt('Measured for astronauts.')], [tt('About 3.8 L of water a day; up to 98% recycled'), 1, tt('Reached on the International Space Station.')], [tt('1.125 L of water makes 1 kg of oxygen'), 1, tt('Plain chemistry: 2 H₂O → 2 H₂ + O₂.')], [tt('Air pressure of 101 kPa'), 1, tt('The same as at sea level on Earth. In space it is zero, so any hole empties a room.')],
        [tt('Radiation topside: 0.057 mSv an hour'), 1, tt('Measured on the Moon. Under the rock roof it is almost zero.')], [tt('Shaded pits stay near 17°C'), 1, tt('Measured from orbit. The surface swings from 127°C to −173°C.')], [tt('No suit needed indoors'), 1, tt('Inside a sealed, heated station astronauts wear ordinary clothes. Suits are only for going outside.')], [tt('Plants sprouted in real Moon soil'), 1, tt('In 2022, in soil from Apollo 11, 12 and 17. They grew, but slowly, small and stressed.')], [tt('Ice in dark craters near the lunar poles'), 1, tt('A probe that crashed into one found about 5.6% water in the soil. There is none near the equator, where our base is.')], [tt('Ice turns straight to vapour in a vacuum'), 1, tt('Below 611 pascals of pressure, ice cannot melt. That is how the Water Plant works.')], [tt('Water from rock with hydrogen'), 1, tt('It works on real Moon soil in the lab, at about 1,000°C. It costs far more power than melting ice.')], [tt('A working ice plant on the Moon'), 0, tt('Nobody has built one yet. Microwaves pulling ice out of frozen soil has only been done in the lab.')], [tt('The Polar Ice Mine is a short trip away'), 0, tt('Our story. Real dark craters are at the poles, about 2,500 km from this base. A real base might be built there instead.')], [tt('Crater floors that never see the Sun, near −230°C'), 1, tt('Measured from orbit. Some are colder than Pluto, and that cold has kept their ice frozen for billions of years.')], [tt('Farming on the open surface'), 0, tt('Impossible: no air, no liquid water, and 300 degrees between day and night. Every crop grows indoors.')], [tt('Two weeks of light, two weeks of night'), 1, tt('One lunar day-night cycle is 29.5 Earth days.')], [tt('Earth stays in one spot in the sky'), 1, tt`True from any one place on the Moon, apart from a small, slow wobble. It is drawn ${K.EARTH_DRAW_SCALE}× bigger here so you can see its phase.`],
        [tt('Radio delay of 1.3 s each way'), 1, tt('Light-speed over 384,400 km.')], [tt('Low-gravity hops'), 1, tt('Gravity is 1.62 m/s², one-sixth of Earth.')], [tt('Storm, moonquake and impact dates'), 1, tt('Every one is a real recorded event.')], [tt('Plants, hens and fish in space'), 1, tt('Lettuce, radishes and more have been grown in orbit. Quail eggs have hatched in space, and fish have lived on space stations. Nobody has kept hens on the Moon yet!')],
        [tt('Hens eat feed people cannot'), 1, tt('Dried grass, seeds and plant scraps are fine for hens but not for us.')], [tt('A meteor shower wrecking every station at once'), 0, tt('Very unlikely. Small impacts are real, but a storm this big is our story.')], [tt('Building a solar panel in 3 hours'), 0, tt('Real factories are far slower. One game hour passes in a few seconds.')], [tt('The ice mine a short trip from the base'), 0, tt("Dark craters with ice are near the Moon's poles, about 2,500 km from this base. Open the Map and choose The real Moon.")], [tt('Cold stops the chargers and drains the rover and hopper'), 1, tt('Real batteries of this kind lose power in deep cold and must not be charged while frozen, so real rovers keep theirs warm. How fast ours drain is a game number.')], [tt('Machine power sizes'), 0, tt('Chosen so your choices matter.')], [tt('Crops ripen in about a day'), 0, tt('Real space lettuce took 33 days.')], [tt('The station tops up leaks with oxygen only'), 0, tt('Real air is mostly nitrogen plus oxygen. We keep one tank to keep it simple.')],
      ].map(([a, real, b]) => `<tr><td>${a}</td><td><span class="pill ${real ? 'real' : 'game'}">${real ? tt('REAL') : tt('STORY')}</span></td><td>${b}</td></tr>`).join('')}</table>`,
      tube: () => `<img src="assets/img/codex_lavatube.jpg" style="width:100%;border-radius:12px" alt=""><div class="body"><p>${tt`<b>What is it?</b> Billions of years ago, rivers of lava flowed across the Moon. The top cooled into a hard crust while lava kept flowing underneath. When it drained away, it left a hollow tunnel: a lava tube. Where the roof fell in, we see a pit.`}</p><p>${tt`<b>Our station is at a real place:</b> a pit in the Sea of Tranquility, about 100 m wide and 105 m deep. Radar has found a cave leading away from its floor.`}</p><p>${tt`<b>How big can tubes get?</b> Nobody knows yet. Radar hints at one about 50 km long, and computer models say tubes hundreds of metres wide could stand in the Moon's weak gravity. You would be the first to walk inside one.`}</p><p>${tt`<b>Why live there?</b> Steady temperature near 17°C. Metres of rock overhead that block radiation and meteoroids.`}</p><p>${tt`<b>What does it cost?</b> No sunlight. Every plant needs electric light, and all power has to come down from the surface. No choice is free.`}</p></div>`,
      tour: () => `<p class="body">${tt`Tranquility Deep, room by room. One hall joins every room, and every room is its own bubble of air behind a bulkhead door.`}</p><div class="tour">${[['section', tt('Cutaway'), tt('Sunlight, solar panels, the radio dish and the holed surface base are up top. The station sits 105 m down, where rock stops radiation and meteoroids. No sunlight reaches it, so the farms grow under LED lights.')], ['surface', tt('Surface Base'), tt('Domes, labs and a command tower joined by tube corridors, with the solar field, landing pad and rover garage around them. The meteor shower left it without air.')], ['cave', tt('The Cave'), tt('A lava tube 105 m under the surface. The elevator lands here, under the skylight of the pit. No air, but a steady 17°C.')], ['airlock', tt('Airlock'), tt('The front door of the station. Suits come off and go on here.')], ['hall', tt('Main Hall'), tt('Every room opens onto this one corridor.')], ...ROOMS.map((r) => [r.id, r.name, tt`Holds ${r.what}.`])].map(([id, n, t]) => `<figure><img src="assets/img/rm_${id}_s.jpg" alt="" loading="lazy" onerror="if (this.dataset.full) this.remove(); else { this.dataset.full = 1; this.src = 'assets/img/rm_${id}.jpg'; }"><figcaption><b>${n}</b>${t}</figcaption></figure>`).join('')}</div>`,
      words: () => `<table class="t">${Object.entries(GLOSSARY).map(([k, v]) => `<tr><th style="white-space:nowrap">${k}</th><td>${v}</td></tr>`).join('')}</table>`,
    };
    // Practice: every hands-on game, at any difficulty. Nothing done here changes the mission.
    const PRACTICE = [['wipe', tt('Brush the dust'), tt('Solar panels')], ['cells', tt('Swap cracked cells'), tt('Solar panels')], ['bolts', tt('Turn the bolts'), tt('Panels and machines')], ['wires', tt('Reconnect the wires'), tt('Batteries and circuits')], ['safe', tt('Make it safe'), tt('Before electrical work')], ['gauge', tt('Check the pressure'), tt('After every repair')], ['weld', tt('Weld the seam'), tt('Holes and rebuilding')], ['leaks', tt('Seal the leaks'), tt('Water pipes')], ['stir', tt('Stir the pot'), tt('Cooking')], ['harvest', tt('Harvest time'), tt('Picking crops')], ['plant', tt('Set the seeds'), tt('Replanting')], ['stack', tt('Stack the crates'), tt('Unloading')], ['suit', tt('Check the suit seals'), tt('Suiting up')], ['align', tt('Aim the dish at Earth'), tt('Earth Link')], ['sequence', tt('Build the air filter'), tt('Air cleaner')], ['fire', tt('Put out the fire'), tt('Emergencies')]];
    let ptier = { cadet: 0, pilot: 1, commander: 2, unlimited: 2 }[this.G.S?.mode] ?? 1;
    pages.games = () => `<p class="body">${tt`Every job starts with one of these. Try any of them here, at any difficulty. Nothing you do here changes your mission.`}</p><div class="tabs" id="pg-tier">${[tt('Cadet · guided'), tt('Pilot'), tt('Commander · hardest')].map((n, i) => `<button data-pt="${i}" class="${i === ptier ? 'on' : ''}">${n}</button>`).join('')}</div><div class="pgrid">${PRACTICE.map(([k, n, d]) => `<button class="choice" data-g="${k}"><b>${n}</b>${d}</button>`).join('')}</div>`;
    const render = (w, t) => { w.querySelector('.win-b').innerHTML = `<div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button data-t="${k}" class="${k === t ? 'on' : ''}">${v}</button>`).join('')}</div>${pages[t]()}`; w.querySelectorAll('.tabs button[data-t]').forEach((b) => (b.onclick = () => render(w, b.dataset.t)));
      w.querySelectorAll('#pg-tier button').forEach((b) => (b.onclick = () => { ptier = Number(b.dataset.pt); render(w, 'games'); }));
      w.querySelectorAll('.pgrid .choice').forEach((b) => (b.onclick = async () => { this.G.audio?.init?.(); this.close(); await this.G.playMini(b.dataset.g, { tier: ptier, ease: [1.35, 1, 0.85][ptier] / (this.G.S?.m.mgEase || 1) }); this.guide('games'); })); };
    return this.window({ title: tt('Space Guide'), html: '', wide: true, onMount: (w) => render(w, tab) });
  }

  // ---------- HUD update ----------
  hud(dt) {
    const G = this.G, S = G.S; if (!S) return; this.t += dt; this._labels();
    if (this.t < 0.2) return; this.t = 0;
    // The small line under a gauge: what comes after " · " goes in its own span, so a narrow tile can show the first half whole
    // and leave the second half out (see .g-x in the style sheet) in place of a line cut off in mid-word.
    const F = S.flow, sun = F.sun, set = (id, v, bar, sub, state) => { const gv = this._gv || (this._gv = {}), q = gv[id] || (gv[id] = {}), mm = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(v), gEl = $('#g-' + id);
      if (mm) { const tgt = Number(mm[1]), dec = (mm[1].split('.')[1] || '').length, step = Math.pow(10, -dec); if (q.n === undefined || q.tail !== mm[2] || Math.abs(tgt - q.n) <= step * 1.5) q.n = tgt; else q.n += (tgt - q.n) * 0.42; q.tail = mm[2]; v = q.n.toFixed(dec) + mm[2]; } else q.n = undefined;
      if (q.bar !== undefined && Math.abs(bar - q.bar) > 0.035) { gEl.classList.remove('up', 'down'); void gEl.offsetWidth; gEl.classList.add(bar > q.bar ? 'up' : 'down'); } q.bar = bar;
      $(`#g-${id}-v`).textContent = v; $(`#g-${id}-b`).style.width = clamp(bar * 100, 0, 100) + '%'; const s = $(`#g-${id}-s`); if (s.dataset.h !== sub) { s.dataset.h = sub; const cut = sub.indexOf(' · '); s.innerHTML = cut > 0 ? `${sub.slice(0, cut)}<span class="g-x">${sub.slice(cut)}</span>` : sub; } const g = $('#g-' + id); g.classList.toggle('warn', state === 1); g.classList.toggle('crit', state === 2); };
    const bp = S.battery / F.cap, rn = (id) => ROOMS.find((r) => r.id === id).name;
    set('power', Math.round(bp * 100) + '%', bp, F.net >= 0 ? tt`+${F.net.toFixed(1)} kW · ${F.nOk} panels` : tt`${F.net.toFixed(1)} kW · ${fmt.hrs(Math.floor(Math.min(F.battHours, 99)))} left`, F.eff < 1 ? 2 : F.net < 0 && bp < 0.12 ? 2 : F.net < 0 && bp < 0.3 ? 1 : 0);
    const sealed = ROOMS.filter((r) => S.rooms[r.id].hole > 0 && !S.rooms[r.id].door).length;
    set('air', S.P.toFixed(0) + ' kPa', S.P / K.AIR_KPA, F.leaks.length ? tt`LEAK: ${rn(F.leaks[0])}!` : sealed ? (sealed > 1 ? tt`${sealed} rooms sealed off` : tt`${sealed} room sealed off`) : tt('no leaks'), F.leaks.length || S.P < 70 ? 2 : sealed ? 1 : 0);
    set('o2', S.o2.toFixed(1) + ' kg', S.o2 / S.o2Cap, `${F.o2Net >= 0 ? '+' : ''}${F.o2Net.toFixed(2)}/day${F.o2Net < 0 ? ' · ' + fmt.days(F.o2Days) : ''}`, S.o2 < 0.4 || F.o2Days < 0.4 ? 2 : F.o2Days < 1.5 ? 1 : 0);
    set('water', S.water.toFixed(0) + ' L', S.water / S.waterCap, tt`${F.wNet.toFixed(1)} L/day · ${fmt.days(F.waterDays)}`, S.water < 2 || F.waterDays < 0.6 ? 2 : F.waterDays < 2 ? 1 : 0);
    set('food', tt`${Math.floor(S.meals + S.cans)} meals`, Math.min(1, F.foodTotal / 30), tt`${Math.floor(S.raw)} raw · ${fmt.days(F.foodDays)}`, F.foodTotal < 1.5 ? 2 : F.foodDays < 1.5 ? 1 : 0);
    const dr = F.doseRate || 0; set('rad', S.dose.toFixed(1) + ' mSv', S.dose / K.DOSE_LIMIT, tt`now ${dr < 0.01 ? '0.00' : dr.toFixed(2)} mSv/h`, S.dose > K.DOSE_LIMIT * 0.85 || dr > 1 ? 2 : S.dose > K.DOSE_LIMIT * 0.6 || dr > 0.2 ? 1 : 0);
    set('mat', fmt.mat(S.mat), S.mat === Infinity ? 1 : Math.min(1, S.mat / 20), tt('to fix and build'), S.mat < 1 ? 2 : S.mat < 3 ? 1 : 0);
    const dd = (S.t - S.t0) / 24; $('#c-day').textContent = S.hours === Infinity ? fmt.day(S.t) : S.t >= S.m.days * 24 ? tt('Rescue day') : tt`${fmt.day(S.t)} of ${S.m.days}`; $('#c-time').textContent = fmt.clock(S.t); const hereR = S.here && S.rooms[S.here]; $('#c-zone').textContent = G.player.zone === 'top' ? (G.inCrater ? tt`DARK CRATER ${MINE.coldC}°C` : tt`TOPSIDE ${Math.round(sun.tempC)}°C`) : !G.inside ? tt`CAVE ${CAVE_C}°C` : hereR && hereR.frozen ? tt('FROZEN ROOM') : tt`STATION ${INDOOR_C}°C`;
    const su = $('#suit'), sk = S.suitOn ? 'on' : 'off'; if (su.dataset.k !== sk) { su.dataset.k = sk; su.className = 'glass ' + sk; su.textContent = S.suitOn ? tt('SUIT ON') : tt('SUIT OFF · INDOORS'); }
    $('#c-sun').innerHTML = (sun.up ? IC.sun + tt` sunset in ${fmt.days(sun.toSunset / 24)}` : IC.moon + tt` sunrise in ${fmt.days(sun.toSunrise / 24)}`); $('#c-rescue').innerHTML = S.hours === Infinity ? tt('no time limit') : IC.rocket + tt` rescue in ${fmt.days((S.hours - (S.t - S.t0)) / 24)}`;
    const tlKey = S.mode + ':' + S.seed; if (this._tlKey !== tlKey) { this._tlKey = tlKey; const span = S.hours === Infinity ? 30 * 24 : S.hours, ss = clamp((S.m.sunsetDay * 24) / span, 0, 1) * 100; $('#tl-fill').style.background = `linear-gradient(90deg,#ffd257 0%,#ff9a3d ${ss}%,#182a52 ${Math.min(ss + 1.5, 100)}%,#0b1630 100%)`; this._tl = span; const cv = this.tempCurve(S, S.t0, span, 96, 100, 24, 0, 3); $('#th-svg').innerHTML = `<path class="th-cave" d="M0 ${cv.y(CAVE_C).toFixed(1)}H100"/><path class="th-night" d="${cv.night}"/><path class="th-day" d="${cv.day}"/>`; }
    const nowX = clamp(((S.t - S.t0) / this._tl) * 100, 0, 100); $('#tl-now').style.left = nowX + '%';
    const tn = $('#th-now'); tn.style.left = nowX + '%'; tn.style.top = ((3 + this.tempY(sun.tempC, 24)) / 30) * 100 + '%'; $('#clock').title = tt`Outside: ${Math.round(sun.tempC)}°C. In the cave: ${CAVE_C}°C. Click for day and night.`;
    const st = S.storm, ts = $('#tl-storm'); ts.style.display = st ? 'block' : 'none'; if (st) { ts.style.left = clamp(((st.start - S.t0) / this._tl) * 100, 0, 100) + '%'; ts.style.width = Math.max(((st.end - st.start) / this._tl) * 100, 1.2) + '%'; }
    $('#hp').style.width = S.health + '%'; $('#hp').style.background = S.health > 60 ? 'var(--green)' : S.health > 30 ? 'var(--amber)' : 'var(--red)';
    const v = G.player.in, cc = G.player.carry; $('#carry').innerHTML = v === 'dig' ? tt`${IC.box} Digger ${G.dig.load}/${MINE.bucket}` : v ? `${IC[v]} ${v === 'car' ? tt('Rover') : tt('Hopper')} ${Math.round(S[v].charge * 100)}%` : cc ? `${IC.box} ${cc.type.startsWith('panel') ? 'panel' : cc.type}` : `${IC.crew} ${F.people}`;
    // The charge it takes to get the rover or the hopper back to its pad, while you ride it or stand beside it. Near the pad, with the guide
    // pointing somewhere far away, it is the charge for that whole trip, there and back. Amber when it is only just enough, red when it is not.
    { const hm = $('#home'), p = G.player, pc = (x) => Math.max(0, Math.round(x * 100)) + '%'; let k = v === 'car' || v === 'ship' ? v : null, txt = '', cls = '';
      if (!k && !v && p.zone === 'top' && G.planet !== 'mars') { const dc = Math.hypot(p.pos.x - G.car.x, p.pos.z - G.car.z), ds = Math.hypot(p.pos.x - G.ship.x, p.pos.z - G.ship.z); if (Math.min(dc, ds) < 9) k = dc <= ds ? 'car' : 'ship'; }
      if (k && G.homeNeed) { const ch = S[k].charge, o = G[k], hn = G.homeNeed(S, k, o), T = G.world.target, there = T && T.zone === 'top' ? Math.hypot(T.x - o.x, T.z - o.z) : 0, name = k === 'car' ? tt('Rover') : tt('Hopper'); let need = 0, bit = '';
        if (hn.home > 20) { need = hn.need; bit = tt`${pc(need)} gets you home`; } else if (there > 150) { need = G.homeNeed(S, k, { x: T.x, z: T.z }, there).need; bit = tt`${pc(need)} for the trip there and back`; }
        txt = v ? bit : bit ? `${name} ${pc(ch)} · ${bit}` : `${name} ${pc(ch)}`; cls = !bit ? '' : ch < need ? 'bad' : ch < need * 1.25 + 0.04 ? 'low' : ''; }
      if (hm && hm.dataset.h !== cls + txt) { hm.dataset.h = cls + txt; hm.textContent = txt; hm.className = txt ? cls : 'hidden'; } }
    const rank = (a) => (a.key ? 0 : a.kind ? 2 : 1);   // emergencies first, then other serious alerts, warnings last: only five fit on screen
    const al = (G.alerts ? G.alerts() : []).sort((a, b) => rank(a) - rank(b)), key = al.map((a) => a.text + a.sub).join('|');
    if (key !== this._alKey) { this._alKey = key; const box = $('#alerts'); box.innerHTML = ''; const seen = this._alSeen || new Set(), nowSeen = new Set(); al.slice(0, 5).forEach((a) => { const id = a.key || a.text.replace(/[\d.]+/g, '#'); nowSeen.add(id); const d = el('div', 'alert ' + (a.kind || '') + (this._alSeen && !seen.has(id) ? ' new' : ''), `${a.text}<small>${a.sub || ''}</small>`); d.onclick = () => a.go && G.pointTo(a.go); box.appendChild(d); }); this._alSeen = nowSeen; }
    this._minimap();
  }
  _labels() {
    const G = this.G, cam = G.world.camera, v = this._v || (this._v = G.world.stationPos('solar').clone()), w = innerWidth, h = innerHeight, bad = G.badPlaces ? G.badPlaces() : {}, tid = G.world.target && G.world.target.id, now = performance.now(), list = [];
    if (!this._hudR || now - this._hudAt > 400) { this._hudAt = now; this._hudR = ['#clock', '#gauges', '#side', '#alerts'].map((q) => $(q).getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0); }   // where the HUD is, looked up a few times a second
    const each = (s, name) => {
      const l = this.labels[s.id]; if (s.zone !== G.player.zone) { l.classList.add('hidden'); return; }
      v.copy(G.world.stationPos(s.id)); const dist = Math.hypot(v.x - G.player.pos.x, v.z - G.player.pos.z); v.y += s.zone === 'top' ? 5 : 3.2; v.project(cam);
      const goal = tid === s.id, hid = s.zone === 'deep' && !goal && G.inside === (s.id === 'lift'), show = !hid && v.z < 1 && Math.abs(v.x) < 1.1 && (goal || bad[s.id] || (s.site ? dist < 900 : dist < (s.zone === 'top' ? 85 : 22)));
      if (!show) { l.classList.add('hidden'); return; }
      list.push({ l, name, dist, goal, bad: !!bad[s.id] && !goal, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h });
    };
    for (const s of STATIONS) each(s, s.name); for (const s of SITES) each({ id: s.id, zone: 'top', site: true }, s.name);
    // The place the guide points at goes first and is always shown. Every other label is left out when it would lie under the top of
    // the HUD or the alert list, or on top of the label of a nearer place.
    list.sort((a, b) => (b.goal - a.goal) || a.dist - b.dist);
    const taken = [], over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    for (const q of list) { const l = q.l, lw = l._w || 64 + q.name.length * 7, lh = l._h || 24, box = { left: q.x - lw / 2 - 3, right: q.x + lw / 2 + 3, top: q.y - lh - 2, bottom: q.y + 2 };
      if (!q.goal && (this._hudR.some((r) => over(box, r)) || taken.some((r) => over(box, r)))) { l.classList.add('hidden'); continue; }
      taken.push(box); l.classList.remove('hidden');
      l.style.transform = `translate(${q.x}px,${q.y}px) translate(-50%,-100%)`; const txt = `${q.name}<small>${q.dist.toFixed(0)} m</small>`; if (l.dataset.t !== txt) { l.dataset.t = txt; l.innerHTML = txt; if (l._n !== txt.length) { l._n = txt.length; l._w = 0; } }
      l.classList.toggle('goal', q.goal); l.classList.toggle('bad', q.bad);
      if (!l._w) { l._w = l.offsetWidth; l._h = l.offsetHeight; }   // measured once for each length of text, not every frame
    }
  }
  _minimap() {
    const G = this.G, c = this.mm, W = 340, p = G.player;
    if (p.zone === 'top') drawSurface(c, G, W, W, 150, p.pos.x, p.pos.z); else drawStation(c, G.S, W, W, { big: true, focus: { x: p.pos.x, z: p.pos.z }, span: 64, player: { x: p.pos.x, z: p.pos.z }, target: G.world.target && G.world.target.zone === 'deep' ? G.world.target : null });
  }

  // ---------- end screen ----------
  end(res) {
    const S = this.G.S, sc = score(S), e = $('#end'); e.classList.remove('hidden'); this.showHud(false); document.exitPointerLock?.();
    const series = [[tt('Power'), '#ffd257', 1], [tt('Oxygen'), '#49e6ff', 2], [tt('Water'), '#5aa6d8', 3], [tt('Food'), '#58e08a', 4], [tt('Radiation'), '#ff5252', 5], [tt('Air pressure'), '#c9b8ff', 7], [tt('Health'), '#ffffff', 6]];
    e.innerHTML = `<div class="end-bg" style="background-image:url(assets/img/${res.img}.jpg)"></div><div class="end-inner">
      <div class="eyebrow">${tt`${MODES[S.mode].name} mission · ${sc.days.toFixed(1)} days · seed ${S.seed}`}</div><h1 class="${res.win ? 'won' : 'lost'}">${res.title}</h1><p class="body">${gloss(res.sub)}</p>
      <div class="badges"><span class="badge">${sc.rank}</span><span class="badge">${tt`${sc.pts.toLocaleString()} points`}</span><span class="badge">${tt`${sc.okPanels} panels working`}</span><span class="badge">${tt`${sc.roomsOk} of 11 rooms working`}</span><span class="badge">${tt`${S.rescued.length} of 3 astronauts rescued`}</span><span class="badge">${tt`${S.dose.toFixed(1)} mSv radiation`}</span><span class="badge">${tt`${S.stats.jobs} jobs done`}</span>${S.stats.asked ? `<span class="badge">${(S.stats.asked > 1 ? tt`${S.stats.right || 0} of ${S.stats.asked} questions right` : tt`${S.stats.right || 0} of ${S.stats.asked} question right`)}</span>` : ''}</div>
      <h3>${res.win ? tt('How you did it') : tt('Here is what happened — and why')}</h3><ol class="chain">${res.why.map((x) => `<li>${gloss(x)}</li>`).join('')}</ol>
      <div class="learn">${tt`<b>The real science:</b> ${gloss(res.science)}`}</div>${res.tip ? `<div class="note">${tt`<b>Next time:</b> ${res.tip}`}</div>` : ''}
      <h3>${tt`Your mission, hour by hour`}</h3><canvas id="chart" width="1800" height="460"></canvas><div class="legend">${series.map((s) => `<span><i style="background:${s[1]}"></i>${s[0]}</span>`).join('')}<span><i style="background:#182a52"></i>${tt('night')}</span></div>
      <h3>${tt`Mission log`}</h3><div class="logbox">${S.log.map((l) => `<div><b>${fmt.day(l.t)} ${fmt.clock(l.t)}</b> — ${l.text}</div>`).join('') || tt('Nothing logged.')}</div>
      <div class="row" style="margin-top:16px"><button class="primary" id="again">${res.win ? tt('Play again') : tt('Try again')}</button><span class="fine" style="margin:0">${tt`Science notes and data sources: see the docs folder of this project.`}</span></div></div>`;
    const cv = $('#chart'), c = cv.getContext('2d'), W = cv.width, H = cv.height, T0 = S.t0, T = Math.max(S.t - T0, 24), X = (t) => 50 + ((t - T0) / T) * (W - 70), Y = (v) => H - 34 - clamp(v, 0, 1) * (H - 60);
    c.fillStyle = '#060b12'; c.fillRect(0, 0, W, H); const ns = S.m.sunsetDay * 24; if (ns < T) { c.fillStyle = '#101d3c'; c.fillRect(X(T0 + ns), 10, X(T0 + T) - X(T0 + ns), H - 44); }
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.fillStyle = '#9bb0c3'; c.font = '20px sans-serif'; const stepD = Math.max(1, Math.ceil(T / 24 / 12));
    for (let d = 0; d <= T / 24; d += stepD) { c.beginPath(); c.moveTo(X(T0 + d * 24), 10); c.lineTo(X(T0 + d * 24), H - 34); c.stroke(); c.fillText(tt`Day ${d + 1}`, X(T0 + d * 24) + 4, H - 10); }
    for (const l of S.log) if (l.kind === 'bad') { c.fillStyle = 'rgba(255,82,82,.45)'; c.fillRect(X(l.t) - 1, 10, 3, H - 44); }
    for (const [, col, k] of series) { c.strokeStyle = col; c.lineWidth = k === 6 ? 4 : 2.5; c.beginPath(); S.hist.forEach((hh, i) => (i ? c.lineTo(X(hh[0]), Y(hh[k])) : c.moveTo(X(hh[0]), Y(hh[k])))); c.stroke(); }
    $('#again').onclick = () => { this.G.clearSave?.(); location.reload(); };
  }
}
