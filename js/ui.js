// MOONKEEPER 2 — interface: HUD, comic pages, dialogue, cards, Power Board, Control Center, maps, end screens.
import { K, SYS, MODES, STATIONS, SITES, GLOSSARY, PIT, TUBE, HALL, AIRLOCK, CAVE_C, INDOOR_C, BASE, MINE, ROOMS, ROLES, MOUNTS, CAR_PAD, SHIP_PAD, roomRect, fmt } from './config.js';
import { computeFlows, score, roomOk, sun as sunAt } from './sim.js';
import { IC } from './icons.js';

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
  rego: { name: 'REGO · your robot friend', img: 'c_rego' }, vasquez: { name: 'Commander Elena Vasquez', img: 'c_vasquez' }, okoro: { name: 'Engineer Tobi Okoro', img: 'c_okoro' },
  flight: { name: 'Mission Control · Flight Director Raman', img: 'c_flight', delay: true }, you: { name: 'You · the rookie', img: 'c_rookie' },
  ingrid: { name: 'Ingrid Solberg · pilot, Aurora Station', img: 'c_ingrid' }, kenji: { name: 'Kenji Mori · engineer, Sakura Outpost', img: 'c_kenji' }, anika: { name: 'Dr. Anika Rao · botanist, Chandra Base', img: 'c_anika' }, bolt: { name: 'BOLT · helper robot', img: 'c_bot' },
};
const GAUGES = [
  { id: 'power', ico: 'bolt', name: 'Power', tip: 'Energy stored in the battery. Solar panels only make power while the Sun is up. Keep the electricity going!' },
  { id: 'air', ico: 'air', name: 'Air', tip: 'Air pressure in the station hall, in kPa. 101 is like a beach on Earth. A hole lets it rush out into space.' },
  { id: 'o2', ico: 'o2', name: 'Oxygen', tip: 'Air to breathe, in the tanks. Leaks are topped up from here, so a hole drains this fast.' },
  { id: 'water', ico: 'water', name: 'Water', tip: 'Drinking water. Also used up when the Oxygen Maker splits it.' },
  { id: 'food', ico: 'food', name: 'Food', tip: 'Cooked meals and tins you can eat now. Raw potatoes, tomatoes and eggs are worth more once cooked.' },
  { id: 'rad', ico: 'rad', name: 'Radiation', tip: 'Your total radiation dose. It only goes up. Underground you are safe; topside in a solar storm you are not.' },
  { id: 'mat', ico: 'box', name: 'Materials', tip: 'Metal and parts for fixing and building. Find more at the other stations.' },
];

// ---------- map painters (also used for the big screen in the Control Center) ----------
export function roomState(S, id) { const r = S.rooms[id]; if (r.hole > 0 && r.door) return 'leak'; if (r.hole > 0) return 'sealed'; if (r.built < 1) return 'wreck'; if (r.p < 60) return 'low'; return 'ok'; }
const RCOL = { ok: '#1d6b45', leak: '#c8281e', sealed: '#3a4f8a', wreck: '#a8641a', low: '#8a7a1a' };
const RTXT = { ok: 'OK', leak: 'LEAK!', sealed: 'SEALED · NO AIR', wreck: 'BROKEN', low: 'LOW AIR' };
export function drawStation(c, S, w, h, o = {}) {
  const fsc = o.focus ? w / o.span : 0, X = o.focus ? (x) => w / 2 + (x - o.focus.x) * fsc : (x) => ((x + 114) / 196) * w, Z = o.focus ? (z) => h / 2 + (z - o.focus.z) * fsc : (z) => ((z + 28) / 56) * h, t = performance.now() / 1000, big = o.big;
  c.fillStyle = '#071018'; c.fillRect(0, 0, w, h);
  // the cave: rock, the lit path from the elevator, then the building
  c.strokeStyle = 'rgba(73,230,255,.35)'; c.lineWidth = big ? 3 : 2; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(X(TUBE.skyX + 5), Z(0)); c.lineTo(X(AIRLOCK.x0), Z(0)); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.beginPath(); c.arc(X(TUBE.skyX), Z(0), Math.abs(X(4.4) - X(0)), 0, 7); c.stroke();
  c.fillStyle = '#22313f'; c.fillRect(X(AIRLOCK.x0), Z(AIRLOCK.z0), X(AIRLOCK.x1) - X(AIRLOCK.x0), Z(AIRLOCK.z1) - Z(AIRLOCK.z0)); c.fillRect(X(HALL.x0), Z(HALL.z0), X(HALL.x1) - X(HALL.x0), Z(HALL.z1) - Z(HALL.z0));
  c.fillStyle = '#ff7a1a'; c.fillRect(X(AIRLOCK.x0) - 2, Z(-2), 4, Z(2) - Z(-2));
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#cfe3f3'; c.font = `600 ${big ? 15 : 11}px Inter,sans-serif`; c.fillText('LIFT', X(TUBE.skyX), Z(0) - (big ? 26 : 16)); c.fillText(`HALL  ${S.P.toFixed(0)} kPa`, X(10), Z(0));
  c.font = `600 ${big ? 12 : 9}px Inter,sans-serif`; c.fillStyle = '#8fa6b8'; c.fillText(`CAVE · NO AIR · ${CAVE_C}°C`, X((TUBE.skyX + AIRLOCK.x0) / 2), Z(0) + (big ? 20 : 13)); c.fillText('AIRLOCK', X((AIRLOCK.x0 + AIRLOCK.x1) / 2), Z(AIRLOCK.z0) - (big ? 9 : 6));
  for (const d of ROOMS) {
    const q = roomRect(d), st = roomState(S, d.id), x = X(q.x0), y = Z(q.z0), ww = X(q.x1) - x, hh = Z(q.z1) - y, r = S.rooms[d.id];
    c.fillStyle = RCOL[st]; if (st === 'leak' && Math.sin(t * 8) > 0) c.fillStyle = '#ff5a4a'; c.fillRect(x, y, ww, hh); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.strokeRect(x, y, ww, hh);
    c.fillStyle = '#22313f'; c.fillRect(X(d.door - 2), d.side < 0 ? Z(q.z1) : Z(HALL.z1), X(d.door + 2) - X(d.door - 2), Z(6.4) - Z(2.6));
    c.fillStyle = r.door ? '#58e08a' : '#ff5252'; c.fillRect(X(d.door - 2.4), Z(d.side * 4.5) - 2.5, X(d.door + 2.4) - X(d.door - 2.4), 5);
    c.fillStyle = '#fff'; c.font = `700 ${big ? 17 : 11}px Inter,sans-serif`; c.fillText(d.name, x + ww / 2, y + hh / 2 - (big ? 12 : 8));
    c.font = `600 ${big ? 14 : 10}px Inter,sans-serif`; c.fillStyle = st === 'ok' ? '#bfeed2' : '#fff'; c.fillText(st === 'ok' ? `${r.p.toFixed(0)} kPa` : RTXT[st], x + ww / 2, y + hh / 2 + (big ? 12 : 8));
  }
  if (o.player) { c.fillStyle = '#fff'; c.beginPath(); c.arc(X(o.player.x), Z(o.player.z), big ? 7 : 5, 0, 7); c.fill(); c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.stroke(); }
  if (o.target) { c.strokeStyle = '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(X(o.target.x), Z(o.target.z), 9 + Math.sin(t * 5) * 2, 0, 7); c.stroke(); }
}
export function drawSurface(c, G, w, h, range = 170, cx = 0, cz = 0) {
  const S = G.S, sc = w / (2 * range), X = (x) => w / 2 + (x - cx) * sc, Z = (z) => h / 2 + (z - cz) * sc, far = range > 300;
  c.fillStyle = '#0b0e12'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#05070a'; c.beginPath(); c.arc(X(PIT.x), Z(PIT.z), PIT.r * sc, 0, 7); c.fill(); c.strokeStyle = '#ffb347'; c.lineWidth = 2; c.stroke();
  MOUNTS.forEach(([x, z], i) => { const st = S.mounts[i]; c.fillStyle = st === 1 ? '#3a78d8' : st === 2 ? '#ff5252' : '#3a3f47'; c.fillRect(X(x) - Math.max(2, 2.4 * sc), Z(z) - Math.max(1.5, 1.4 * sc), Math.max(4, 4.8 * sc), Math.max(3, 2.8 * sc)); });
  c.strokeStyle = '#6f7f8f'; c.fillStyle = 'rgba(120,140,160,.22)'; c.lineWidth = 1.5; for (const k of ['hub', 'green']) { const [x, z, r] = BASE[k]; c.beginPath(); c.arc(X(x), Z(z), r * sc, 0, 7); c.fill(); c.stroke(); }
  for (const [k, w2, d2] of [['tower', 9, 9], ['batt', 10, 7], ['garage', 15, 9.5], ['lab', 12, 7], ['water', 9, 4]]) { const [x, z] = BASE[k]; c.fillRect(X(x - w2 / 2), Z(z - d2 / 2), w2 * sc, d2 * sc); c.strokeRect(X(x - w2 / 2), Z(z - d2 / 2), w2 * sc, d2 * sc); }
  const dot = (x, z, col, label, r = 5) => { c.fillStyle = col; c.beginPath(); c.arc(X(x), Z(z), r, 0, 7); c.fill(); if (label) { c.fillStyle = '#dbe7f2'; c.font = '600 11px Inter,sans-serif'; c.fillText(label, X(x), Z(z) - r - 7); } };
  { let x = X(MINE.x), z = Z(MINE.z); const off = x < 12 || x > w - 12 || z < 12 || z > h - 12; if (!off) { c.fillStyle = 'rgba(8,12,18,.75)'; c.strokeStyle = '#9fdcff88'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, z, MINE.r * sc, 0, 7); c.fill(); c.stroke(); for (const p of S.mine.patches) if (p.left > 0) { c.fillStyle = '#9fdcff'; c.beginPath(); c.arc(X(p.x), Z(p.z), Math.max(2, 3.4 * sc), 0, 7); c.fill(); } c.fillStyle = '#ffd21f'; c.fillRect(X(G.dig.x) - 3, Z(G.dig.z) - 3, 6, 6); }
    x = clamp(x, 12, w - 12); z = clamp(z, 12, h - 12); if (off) { c.fillStyle = '#9fdcff'; c.beginPath(); c.moveTo(x, z - 8); c.lineTo(x + 7, z); c.lineTo(x, z + 8); c.lineTo(x - 7, z); c.closePath(); c.fill(); c.fillStyle = '#dbe7f2'; c.font = '600 10px Inter,sans-serif'; c.fillText('ICE MINE', clamp(x, 34, w - 34), clamp(z + (z > h / 2 ? -14 : 16), 10, h - 10)); } }
  for (const s of STATIONS) if (s.zone === 'top') dot(s.pos[0], s.pos[1], '#49e6ff', far ? '' : s.name, far ? 2.5 : 4);
  for (const [k, p] of [['car', CAR_PAD], ['ship', SHIP_PAD]]) { c.strokeStyle = S[k].charging ? '#49e6ff' : '#55616d'; c.lineWidth = 2; c.beginPath(); c.arc(X(p[0]), Z(p[1]), Math.max(4, 5 * sc), 0, 7); c.stroke(); }
  for (const s of SITES) { const col = '#' + s.color.toString(16).padStart(6, '0'), done = S.rescued.includes(s.id); let x = X(s.pos[0]), z = Z(s.pos[1]); const off = x < 12 || x > w - 12 || z < 12 || z > h - 12; x = clamp(x, 12, w - 12); z = clamp(z, 12, h - 12); c.fillStyle = col; c.beginPath(); if (off) { c.moveTo(x, z - 8); c.lineTo(x + 8, z + 6); c.lineTo(x - 8, z + 6); } else c.arc(x, z, 8, 0, 7); c.fill(); if (!off || far) { c.fillStyle = '#fff'; c.font = '600 11px Inter,sans-serif'; c.fillText(s.name + (done ? ' ✓' : ''), x, z + 18); } }
  for (const it of G.items) if (it.zone === 'top' && it.where === 'ground') { c.fillStyle = it.type.startsWith('panel') ? '#7fb0ff' : '#ffb347'; c.fillRect(X(it.x) - 2.5, Z(it.z) - 2.5, 5, 5); }
  const veh = (v, col, label) => { c.save(); c.translate(X(v.x), Z(v.z)); c.rotate(-v.yaw + Math.PI); c.fillStyle = col; c.fillRect(-4, -7, 8, 14); c.restore(); if (!far) { c.fillStyle = col; c.font = '700 10px Inter,sans-serif'; c.fillText(label, X(v.x), Z(v.z) + 15); } };
  veh(G.car, '#ff9a3d', 'ROVER'); veh(G.ship, '#2ad0c0', 'HOPPER');
  const tg = G.world.target; if (tg && tg.zone === 'top') { c.strokeStyle = '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(clamp(X(tg.x), 10, w - 10), clamp(Z(tg.z), 10, h - 10), 10, 0, 7); c.stroke(); }
  const p = G.player; c.save(); c.translate(X(p.pos.x), Z(p.pos.z)); c.rotate(-G.cam.yaw); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 9); c.lineTo(0, 4); c.lineTo(-8, 9); c.closePath(); c.fill(); c.restore();
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
  }
  get busy() { return this.modalStack > 0 || this.dialogOpen || this.comicOpen; }
  showHud(on) { $('#hud').classList.toggle('hidden', !on); }
  fade(on) { $('#fade').classList.toggle('on', on); return new Promise((r) => setTimeout(r, 470)); }
  toast(text, kind = '') { const t = el('div', 'toast ' + kind, `<i class="t-ic">${kind === 'bad' ? IC.alert : kind === 'good' ? IC.ok : IC.bot}</i><span>${gloss(text)}</span>`); $('#toasts').appendChild(t); this.G.audio?.play(kind === 'bad' ? 'bad' : kind === 'good' ? 'ok' : 'blip'); setTimeout(() => t.remove(), 6500); while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove(); }
  bubble(html, mood = 'happy', secs = 10) { $('#rego-text').innerHTML = gloss(html); this.G.voice?.say(html); $('#rego').classList.remove('hidden'); this.G.rego?.setMood(mood); if (this.G.rego) this.G.rego.wave = 1.2; this.G.audio?.play('chirp'); clearTimeout(this._bt); this._bt = setTimeout(() => { $('#rego').classList.add('hidden'); this.G.rego?.setMood('happy'); }, secs * 1000); }
  banner(text, info = false) { const b = $('#banner'); if (!text) { b.classList.add('hidden'); return; } if (b.dataset.t !== text) { b.dataset.t = text; b.innerHTML = text; } b.classList.remove('hidden'); b.classList.toggle('info', info); }
  objective(html) { const o = $('#objective'); o.classList.toggle('hidden', !html); if (html && o.dataset.h !== html) { o.dataset.h = html; o.innerHTML = html; } }
  prompt(html) { const p = $('#prompt'); p.classList.toggle('hidden', !html); if (html && p.dataset.h !== html) { p.dataset.h = html; p.innerHTML = html; } }
  // progress bar shown while a build / fix scene plays by itself
  job(title, k, step, left) { const j = $('#job'); j.classList.toggle('hidden', title === null); if (title === null) return; $('#job-title').textContent = title; $('#job-step').textContent = step; $('#job-bar').style.width = clamp(k * 100, 0, 100) + '%'; $('#job-left').textContent = left; }

  // ---------- comic pages: panels appear one click at a time ----------
  comic(pages) {
    return new Promise((done) => {
      const root = $('#comic'); this.comicOpen = true; root.classList.remove('hidden'); document.exitPointerLock?.(); let pi = 0, shown = 0;
      const page = () => {
        const pg = pages[pi]; shown = 0;
        root.innerHTML = `<div class="comic-page"><div class="comic-h"><span>${pg.title}</span><small>${pages.length > 1 ? `Page ${pi + 1} of ${pages.length}` : ''}</small></div><div class="comic-grid">${pg.panels.map((p, i) => `<figure class="panel ${p.wide ? 'wide' : ''}" data-i="${i}"><img src="assets/img/${p.img}.jpg" alt="">${p.cap ? `<figcaption>${p.cap}</figcaption>` : ''}${(p.say || []).map((b, k) => `<div class="bub b${b.at || k}"><b>${b.who}</b>${b.text}</div>`).join('')}</figure>`).join('')}</div><div class="comic-f"><button class="ghost" id="cm-skip">Skip story</button><div class="cm-dots">${pg.panels.map(() => '<i></i>').join('')}</div><span id="cm-next">${this.G.touch ? 'Tap' : 'Click'} anywhere ▸</span></div></div>`;
        const next = () => { const ps = root.querySelectorAll('.panel'), dots = root.querySelectorAll('.cm-dots i'); if (shown < ps.length) { ps.forEach((p, k) => p.classList.toggle('cur', k === shown)); ps[shown].classList.add('on'); dots.forEach((d, k) => d.classList.toggle('on', k <= shown)); shown++; this.G.audio?.play('blip'); const tap = this.G.touch ? 'Tap' : 'Click'; $('#cm-next').textContent = shown < ps.length ? `${tap} anywhere ▸` : pi < pages.length - 1 ? `${tap} to turn the page ▸` : `${tap}: ${(pg.btn || 'Start ▸')}`; return; } if (++pi < pages.length) page(); else finish(); };
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
      const next = () => { if (typing && typing !== 1) { clearInterval(typing); typing = null; text.innerHTML = full; return; } if (typing === 1) return; if (++i >= lines.length) { box.classList.add('hidden'); this.dialogOpen = false; this._dlgNext = null; this.G.rego?.setMood('happy'); this.G.voice?.stop(); done(); return; } show(); };
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
  window({ title, html, wide = false, closable = true, img = null, onMount }) {
    return new Promise((resolve) => {
      const m = $('#modal'); this.modalStack++; this._closable = closable; document.exitPointerLock?.(); m.classList.remove('hidden');
      m.innerHTML = `<div class="win ${wide ? 'wide' : ''}">${img ? `<img class="card-img" src="assets/img/${img}.jpg" alt="" onerror="this.remove()">` : ''}<div class="win-h"><h2>${title}</h2>${closable ? '<button class="x">Close ✕</button>' : ''}</div><div class="win-b">${html}</div></div>`;
      this._resolve = (v) => { clearInterval(this._tick); m.classList.add('hidden'); m.innerHTML = ''; this.modalStack = Math.max(0, this.modalStack - 1); this._resolve = null; resolve(v); };
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
    const svg = `<svg class="dn-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Surface temperature through one Moon day">
      <rect x="${X(tSet).toFixed(1)}" y="${T}" width="${(X(tRise) - X(tSet)).toFixed(1)}" height="${gh}" fill="rgba(60,110,200,.14)"/>
      ${[127, 0, -173].map((c) => `<line x1="${L}" x2="${W - Rm}" y1="${yc(c).toFixed(1)}" y2="${yc(c).toFixed(1)}" stroke="rgba(255,255,255,.12)"/><text x="${L - 8}" y="${(yc(c) + 4).toFixed(1)}" text-anchor="end">${c}°C</text>`).join('')}
      ${ticks.map((d) => `<text x="${X(S.t0 + d * 24).toFixed(1)}" y="${H - 12}" text-anchor="middle">Day ${d + 1}</text>`).join('')}
      <path class="th-cave" d="M${L} ${yc(CAVE_C).toFixed(1)}H${W - Rm}"/><text x="${((X(tSet) + X(tRise)) / 2).toFixed(1)}" y="${(yc(CAVE_C) - 6).toFixed(1)}" text-anchor="middle" style="fill:#5fe3a1">In the cave: ${CAVE_C}°C all the time</text>
      <path class="th-night" d="${cv.night}"/><path class="th-day" d="${cv.day}"/>
      <text class="dn-big" x="${((X(S.t0) + X(tSet)) / 2).toFixed(1)}" y="${T - 9}" text-anchor="middle" style="fill:#ffb347">Sun up</text>
      <text class="dn-big" x="${((X(tSet) + X(tRise)) / 2).toFixed(1)}" y="${T - 9}" text-anchor="middle" style="fill:#6fb1ff">Night: about two weeks</text>
      ${W - Rm - X(tRise) > 70 ? `<text class="dn-big" x="${((X(tRise) + W - Rm) / 2).toFixed(1)}" y="${T - 9}" text-anchor="middle" style="fill:#ffb347">Sun up again</text>` : ''}
      ${inSpan(tRes) ? `<line x1="${X(tRes).toFixed(1)}" x2="${X(tRes).toFixed(1)}" y1="${T}" y2="${T + gh}" stroke="#5fe3a1" stroke-dasharray="4 4"/><text x="${(X(tRes) + 6).toFixed(1)}" y="${T + gh - 8}" style="fill:#5fe3a1">Rescue</text>` : ''}
      <line x1="${X(tNow).toFixed(1)}" x2="${X(tNow).toFixed(1)}" y1="${T}" y2="${T + gh}" stroke="#fff" stroke-width="1.5"/><circle cx="${X(tNow).toFixed(1)}" cy="${yc(sun.tempC).toFixed(1)}" r="5" fill="#fff"/><text class="dn-big" x="${(X(tNow) + (X(tNow) > W - 110 ? -8 : 8)).toFixed(1)}" y="${T + 16}" text-anchor="${X(tNow) > W - 110 ? 'end' : 'start'}">Now</text>
    </svg>`;
    const when = sun.up ? `The Sun sets in <b>${fmt.days(sun.toSunset / 24)}</b>.` : `The Sun rises in <b>${fmt.days(sun.toSunrise / 24)}</b>.`;
    return this.window({ title: 'Day and night on the Moon', wide: true, html: `<p>The line shows how hot the ground outside is. Orange is daylight, blue is night. The white dot is now. ${when}</p>${svg}
      <div class="dn-cards"><div class="datacard"><h4>Outside, right now</h4><div class="big" style="color:${sun.tempC > 0 ? '#ffb347' : '#6fb1ff'}">${Math.round(sun.tempC)}°C</div><small>${sun.up ? 'In sunlight' : 'In the dark'}</small></div>
      <div class="datacard"><h4>In the cave</h4><div class="big" style="color:#5fe3a1">${CAVE_C}°C</div><small>Day and night</small></div>
      <div class="datacard"><h4>Inside the station</h4><div class="big">${INDOOR_C}°C</div><small>Heated rooms</small></div></div>
      <p><b>A Moon day is very long.</b> From one sunrise to the next takes ${K.LUNAR_DAY.toFixed(1)} Earth days. The Sun is up for about two weeks, then down for about two weeks.</p>
      <p><b>Why so hot, and why so cold?</b> The Moon has no air. On Earth, air carries warmth around and holds it in at night. Without air, ground in sunlight bakes at about ${K.SURF_DAY_C}°C, and ground in the dark drops to about ${K.SURF_NIGHT_C}°C.</p>
      <p><b>Why the cave stays the same.</b> Rock is a thick blanket. Under it the temperature stays near ${CAVE_C}°C all the time. That is why the station is down here.</p>
      <p><b>What it means for you.</b> Solar panels only make power on the orange part of the line. Fill the battery before the line turns blue.</p>
      <div class="learn">The hottest and coldest numbers, and the cave temperature, were measured by spacecraft circling the Moon. The shape of the line between them is a simple model.</div>` });
  }
  settings() {
    const G = this.G, row = (id, on, title, sub) => `<label class="set-row"><div><b>${title}</b><span>${sub}</span></div><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i class="sw"></i></label>`;
    return this.window({ title: 'Settings', html: row('set-guide', G.guide, 'Guide mode', 'A yellow line on the ground shows where to go, and REGO marks the button to press in every panel.') + row('set-minis', G.minis, 'Job games', 'Play a short hands-on game before each big job (an hour or more). Off: jobs go straight to the animation.') + row('set-minis-all', G.minisAll, 'Games before quick jobs too', 'Also play one before short jobs like suiting up, unloading crates and replanting.') + row('set-quiz', G.quiz, 'Questions', 'One short question after each kind of emergency. A right answer earns a research point; a wrong one costs nothing.') + (G.voice?.ok ? row('set-voice', G.voice.on, 'REGO reads aloud', 'REGO speaks its hints, its lines and the emergency cards, using the voice built into this device. On by itself in Cadet missions until you choose.') : '') + row('set-sound', G.audio?.on, 'Sound', 'The hum of the station, your breathing in the suit, engines, alarms and radio.') + row('set-music', G.audio?.music, 'Music', 'Quiet music that darkens when the station is in danger.') + `<div class="set-row q-row"><div><b>Graphics</b><span>Auto lowers the detail by itself if the game runs slowly. Low turns shadows off.</span></div><div class="q-btns">${['auto', 'high', 'medium', 'low'].map((q) => `<button data-q="${q}" class="${G.quality === q ? 'on' : ''}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('')}</div></div>` + row('set-fps', G.showFps, 'Show frame rate', 'A small counter in the corner: frames per second and the detail in use.') + '<button class="ghost" id="set-practice" style="margin-top:4px">Try the job games ▸</button>',
      onMount: (w) => { w.querySelector('#set-guide').onchange = (e) => { G.setGuide(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-minis').onchange = (e) => { G.setMinis(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-minis-all').onchange = (e) => { G.setMinisAll(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-practice').onclick = () => { G.audio?.play('click'); this.close(); this.guide('games'); }; w.querySelector('#set-quiz').onchange = (e) => { G.setQuiz(e.target.checked); G.audio?.play('click'); }; const sv = w.querySelector('#set-voice'); if (sv) sv.onchange = (e) => { G.setVoice(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-sound').onchange = (e) => { G.setSound(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-music').onchange = (e) => { G.setMusic(e.target.checked); G.audio?.play('click'); }; w.querySelector('#set-fps').onchange = (e) => { G.setShowFps(e.target.checked); G.audio?.play('click'); }; w.querySelectorAll('.q-btns button').forEach((b) => (b.onclick = () => { G.setQuality(b.dataset.q); w.querySelectorAll('.q-btns button').forEach((x) => x.classList.toggle('on', x === b)); G.audio?.play('click'); })); } });
  }
  choices(list, rec = -1) { return `<div class="choices">${list.map((c, i) => `<button class="choice ${i === rec ? 'guide-rec' : ''}" data-i="${i}" ${c.disabled ? 'disabled' : ''}>${i === rec ? '<span class="rec-tag"><img src="assets/img/c_rego.jpg" alt="">REGO: press this</span>' : ''}<b>${c.label}</b>${c.sub ? gloss(c.sub) : ''}<div>${(c.costs || []).map((x) => `<span class="cost">${x}</span>`).join('')}${(c.gains || []).map((x) => `<span class="cost gain">${x}</span>`).join('')}</div></button>`).join('')}</div>`; }
  // A panel with facts and actions. Returns after the chosen action has run.
  async panel(title, { stats = [], actions = [], note, img }) {
    const html = `${stats.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}${this.choices(actions, this.recIndex(actions))}${note ? `<div class="learn">${gloss(note)}</div>` : ''}`;
    const i = await this.window({ title, html, img, onMount: (w) => w.querySelectorAll('.choice').forEach((b) => (b.onclick = () => { this.G.audio?.play('click'); this.close(Number(b.dataset.i)); })) });
    if (i !== undefined) await actions[i].run();
  }
  // Event card. cfg: { art, title, real, body, learn, choices, advice (index), adviceText }
  card(cfg) {
    const S = this.G.S, canCall = S && S.flow.commsOn && cfg.advice !== undefined;
    const html = `${cfg.real ? `<div class="real"><b class="tag">THIS REALLY HAPPENED</b>${cfg.real}</div>` : ''}<div class="body">${gloss(cfg.body)}</div>${cfg.learn ? `<div class="learn">${gloss(cfg.learn)}</div>` : ''}${this.choices(cfg.choices, this.G.guide && cfg.advice !== undefined && !cfg.choices[cfg.advice]?.disabled ? cfg.advice : -1)}${cfg.advice !== undefined ? `<div class="row"><button class="ghost" id="call" ${canCall ? '' : 'disabled'}>${IC.dish} Ask Mission Control ${canCall ? '(answer takes 2.6 s)' : '(Earth Link is down)'}</button><span id="call-out"></span></div>` : ''}`;
    this.G.audio?.play(cfg.good ? 'ok' : 'alarm'); this.G.voice?.say(cfg.title + '. ' + cfg.body);
    return this.window({ title: cfg.title, html, img: cfg.art, closable: false, onMount: (w) => {
      w.querySelectorAll('.choice').forEach((b) => (b.onclick = () => { this.G.audio?.play('click'); this.G.voice?.stop(); this.close(Number(b.dataset.i)); }));
      const call = w.querySelector('#call'); if (call) call.onclick = () => { call.disabled = true; const out = w.querySelector('#call-out'); out.textContent = 'Your question is flying to Earth… 1.3 s'; setTimeout(() => (out.textContent = '…and the answer is flying back… 1.3 s'), 1300); setTimeout(() => { out.textContent = 'Mission Control: “' + (cfg.adviceText || 'We suggest the glowing choice.') + '”'; w.querySelectorAll('.choice')[cfg.advice]?.classList.add('rec'); this.G.audio?.play('radio'); }, 2600); };
    } });
  }

  // ---------- Power Board ----------
  // Guide mode on the Power Board: the one switch REGO would press now, and why. Returns { k, i, why } or null.
  powerHint(S, F) {
    const lv = S.lv, cost = (k, i) => SYS[k].kw[i] - SYS[k].kw[lv[k]], canPay = (k, i) => F.eff >= 1 && (F.net - cost(k, i) >= -0.5 || S.battery > F.cap * 0.25);
    const up = (k, why) => (lv[k] < SYS[k].kw.length - 1 && canPay(k, lv[k] + 1) ? { k, i: lv[k] + 1, why } : null), set = (k, i, why) => ({ k, i, why });
    const shed = (why) => lv.heat > F.heatNeed ? set('heat', F.heatNeed, why + ' The heaters are higher than the machines topside need.') : lv.comms > 1 ? set('comms', 1, why + ' Level 1 still gives storm warnings.') : lv.isru && F.o2Days > 2 ? set('isru', 0, why + ' The Moon-Dust Oxygen Plant is the hungriest machine.') : lv.farm > 1 ? set('farm', lv.farm - 1, why + ' Dimmer grow lights only slow the crops.') : lv.recycler > 1 ? set('recycler', lv.recycler - 1, why + ' You get a little less water back.') : lv.comms > 0 ? set('comms', 0, why + ' You lose storm warnings, so stay close to the elevator.') : null;
    if (F.eff < 1) return shed('<b>Brownout:</b> the battery is empty, so turn something down.');
    if (lv.heat < F.heatNeed) return set('heat', F.heatNeed, `Topside machines need heater level <b>${F.heatNeed}</b> right now, or something will break.`);
    if (S.f.commsDown && lv.comms > 0 && F.use.comms > 0) return set('comms', 0, 'The dish is knocked over, so the Earth Link is burning power for nothing. Switch it off until the dish is fixed.');
    if (S.o2 < 0.8 || (F.o2Net < 0 && F.o2Days < 2)) { const h = roomOk(S, 'oxygen') && S.water > 3 ? up('o2gen', '<b>Oxygen is running low.</b> Turn the Oxygen Maker up. It costs power and water.') : null; if (h) return h; if (!S.f.isruDown && !lv.isru && canPay('isru', 1)) return set('isru', 1, '<b>Oxygen is running low.</b> The Moon-Dust Oxygen Plant makes oxygen without using water.'); }
    if (F.net < 0 && F.battHours < 10) { const h = shed(`The battery will be empty in <b>${fmt.hrs(Math.floor(F.battHours))}</b>.`); if (h) return h; }
    if (F.wNet < 0 && F.waterDays < 3 && roomOk(S, 'water')) { const h = up('recycler', '<b>Water is dropping.</b> Turn the Water Recycler up to get more of it back.'); if (h) return h; }
    if (F.farms > 0 && lv.farm === 0 && canPay('farm', 1)) return set('farm', 1, 'The grow lights are off, so the plants are wilting. Level 1 keeps them alive.');
    if (F.farms > 0 && F.foodDays < 2) { const h = up('farm', '<b>Food is short.</b> Brighter grow lights make the crops ripen faster.'); if (h) return h; }
    if (!S.f.commsDown && lv.comms === 0 && canPay('comms', 1)) return set('comms', 1, 'The Earth Link is off, so storms arrive with no warning. Level 1 gives about 4 hours.');
    if (S.battery >= F.cap - 1 && F.net > 3) { const h = (F.farms > 0 && up('farm', 'The battery is full and power is being wasted. Spend it on faster crops.')) || (roomOk(S, 'oxygen') && S.water > 6 && S.o2 < S.o2Cap - 0.5 && up('o2gen', 'The battery is full and power is being wasted. Spend it on spare oxygen.')); if (h) return h; }
    return null;
  }
  powerBoard(opts = {}) {
    const G = this.G, S = G.S;
    const render = (w) => {
      const F = computeFlows(S), u = F.use, total = Math.max(F.supply, F.demand, 1), sun = F.sun, hint = G.guide && !opts.goal ? this.powerHint(S, F) : null;
      const seg = (v, color, label) => (v > 0.05 ? `<span style="width:${(v / total) * 100}%;background:${color}" title="${label} ${v.toFixed(1)} kW">${v / total > 0.1 ? label + ' ' + v.toFixed(0) : ''}</span>` : '');
      const lvl = (k) => `<div class="lv">${SYS[k].kw.map((kw, i) => `<button data-k="${k}" data-i="${i}" class="${S.lv[k] === i ? 'on' : ''} ${hint && hint.k === k && hint.i === i ? 'guide-rec' : ''}">${SYS[k].kw.length === 2 ? ['OFF', 'ON'][i] : i === 0 ? 'OFF' : i}<small>${kw} kW</small></button>`).join('')}</div>`;
      const eff = {
        o2gen: !roomOk(S, 'oxygen') ? '<span class="down">The Oxygen Room is broken or has no air. Fix the room first.</span>' : S.water <= 0 ? '<span class="down">No water to split!</span>' : `Makes <b>${SYS.o2gen.out[S.lv.o2gen]} kg</b> of oxygen a day and drinks <b>${(SYS.o2gen.out[S.lv.o2gen] * K.H2O_PER_KG_O2).toFixed(1)} L</b> of water a day.`,
        isru: S.f.isruDown ? '<span class="down">Broken by the meteor shower. Repair it topside.</span>' : S.lv.isru ? 'Makes <b>2.2 kg</b> of oxygen a day from moon soil. Uses no water.' : 'Off.',
        recycler: !roomOk(S, 'water') ? '<span class="down">The Water Room is broken or has no air.</span>' : `<b>${Math.round(F.rate * 100)}%</b> of used water comes back${roomOk(S, 'bathroom') ? '' : ' (less while the Bathroom is broken)'}. You lose ${(F.wUsed * (1 - F.rate)).toFixed(1)} L a day.`,
        farm: F.farms === 0 ? '<span class="down">Both farm rooms are broken.</span>' : S.lv.farm === 0 ? '<span class="down">Lights off: plants slowly wilt.</span>' : `${F.farms} of 2 farms lit. Growth ×${F.grow.toFixed(2)}. Plants add ${F.o2Farm.toFixed(2)} kg of oxygen a day.`,
        heat: `Topside is <b>${fmt.temp(sun.tempC)}</b>. Machines up there need level <b>${F.heatNeed}</b> right now. ${S.lv.heat >= F.heatNeed ? '<span class="up">OK</span>' : '<span class="down">Too low — something will break!</span>'}`,
        comms: S.f.commsDown ? '<span class="down">The dish is down — fix it topside.</span>' : ['No link: storms arrive with no warning.', 'Storm warnings about 4 hours ahead.', 'Storm warnings about 8 hours ahead.'][S.lv.comms],
      };
      const rows = Object.keys(SYS).map((k) => `<div class="sys"><div class="ico">${IC[SYS[k].ico]}</div><div><h4>${SYS[k].name}</h4><p>${gloss(SYS[k].blurb)}</p></div>${lvl(k)}<div class="eff">${eff[k]}</div></div>`).join('');
      const sgn = (x, d = 1) => `<b class="${x >= 0 ? 'up' : 'down'}">${x >= 0 ? '+' : ''}${x.toFixed(d)}</b>`;
      const netTxt = F.net >= 0 ? (S.battery >= F.cap - 1 ? 'Battery full — extra power is wasted. Use it!' : `Full in ${fmt.hrs(Math.ceil((F.cap - S.battery) / Math.max(F.net, 0.01)))}`) : `Empty in <b class="down">${fmt.hrs(Math.floor(F.battHours))}</b>`;
      const auto = [['Chargers (rover, hopper)', u.chargers], ['Fix-It bench & builder', u.tools], ['Helper robots', u.bots], ['Fish tank pump', u.pump], ['Extra', F.extra]].filter((x) => x[1] > 0).map(([a, b]) => `<div class="stat"><span>${a}</span><span>${b.toFixed(1)} kW</span></div>`).join('');
      w.querySelector('.win-b').innerHTML = `
        <div class="note"><b>No choice is free.</b> Every machine eats power. Turn one up, and something else gets less — or the battery drains faster.</div>
        ${G.guide && !opts.goal ? `<div class="rec-banner ${hint ? '' : 'calm'}"><img src="assets/img/c_rego.jpg" alt=""><div><b>REGO${hint ? ': press the glowing switch' : ''}</b>${hint ? `${SYS[hint.k].name} → ${SYS[hint.k].kw.length === 2 ? ['OFF', 'ON'][hint.i] : hint.i === 0 ? 'OFF' : 'level ' + hint.i}. ${hint.why}` : 'Nothing needs changing right now. The switches are set well for what we have.'}</div></div>` : ''}
        <div class="grid2" style="margin-top:12px"><div>${rows}</div><div>
          <h4 class="h4">Power right now</h4><div class="mini">Coming in: ${F.supply.toFixed(1)} kW · ${F.nOk} solar panel${F.nOk === 1 ? '' : 's'} working</div>
          <div class="flowbar">${seg(F.solar, '#ffd257', 'Solar')}${seg(F.reactor, '#8fe9a8', 'Reactor')}</div><div class="mini">Going out: ${F.demand.toFixed(1)} kW</div>
          <div class="flowbar">${seg(u.base, '#9aa7b4', 'Base')}${seg(u.o2gen, '#49e6ff', 'O₂')}${seg(u.isru, '#ff9a3d', 'Dust O₂')}${seg(u.recycler, '#5aa6d8', 'Water')}${seg(u.farm, '#ff6fdc', 'Farm')}${seg(u.heat, '#ff6a4a', 'Heat')}${seg(u.comms, '#c9b8ff', 'Link')}${seg(u.chargers + u.tools + u.bots + u.pump + F.extra, '#ffffff', 'Other')}</div>
          <div class="stat"><span>Left over</span><span>${sgn(F.net)} kW</span></div><div class="stat"><span>Battery ${Math.round(S.battery)} / ${Math.round(F.cap)} kWh</span><span>${netTxt}</span></div>${auto}
          ${F.eff < 1 ? `<div class="note bad"><b>Brownout!</b> The battery is empty, so every machine runs at ${Math.round(F.eff * 100)}%.</div>` : ''}
          <h4 class="h4" style="margin-top:14px">If nothing changes…</h4>
          <div class="stat"><span>Oxygen ${S.o2.toFixed(1)} kg</span><span>${sgn(F.o2Net, 2)} kg/day${F.o2Net < 0 ? ' · lasts ' + fmt.days(F.o2Days) : ''}</span></div>
          <div class="stat"><span>Water ${S.water.toFixed(0)} L</span><span>${sgn(F.wNet)} L/day${F.wNet < 0 ? ' · lasts ' + fmt.days(F.waterDays) : ''}</span></div>
          <div class="stat"><span>Food for ${F.people} ${F.people === 1 ? 'person' : 'people'}</span><span>lasts ${fmt.days(F.foodDays)}</span></div>
          <div class="stat"><span>${sun.up ? 'Sunset in' : 'Sunrise in'}</span><span><b>${fmt.days((sun.up ? sun.toSunset : sun.toSunrise) / 24)}</b></span></div>
          ${S.hours === Infinity ? '' : `<div class="stat"><span>Rescue in</span><span><b>${fmt.days((S.hours - (S.t - S.t0)) / 24)}</b></span></div>`}
          <div class="learn" style="margin-top:12px">${G.advise ? G.advise(true) : ''}</div>${opts.goal ? `<div class="note" id="goal">${opts.goal.text}</div>` : ''}</div></div>`;
      w.querySelectorAll('.lv button').forEach((b) => (b.onclick = () => {
        const k = b.dataset.k, i = Number(b.dataset.i), before = computeFlows(S), old = S.lv[k]; S.lv[k] = i; const after = computeFlows(S); G.audio?.play('click'); render(w);
        if (old !== i) { const dKw = after.demand - before.demand, bits = []; if (Math.abs(after.o2Net - before.o2Net) > 0.01) bits.push(`oxygen ${after.o2Net > before.o2Net ? '+' : ''}${(after.o2Net - before.o2Net).toFixed(2)} kg/day`); if (Math.abs(after.wNet - before.wNet) > 0.05) bits.push(`water ${after.wNet > before.wNet ? '+' : ''}${(after.wNet - before.wNet).toFixed(1)} L/day`); if (Math.abs(after.grow - before.grow) > 0.01) bits.push(`farm growth ×${after.grow.toFixed(1)}`);
          w.querySelector('.note').innerHTML = `<b>${SYS[k].name} → ${i === 0 ? 'OFF' : SYS[k].kw.length === 2 ? 'ON' : 'level ' + i}:</b> power use ${dKw >= 0 ? '+' : ''}${dKw.toFixed(1)} kW${bits.length ? ', ' + bits.join(', ') : ''}. ${dKw > 0 ? (after.net < 0 ? `The battery now drains in ${fmt.hrs(Math.floor(after.battHours))}.` : 'You still have power to spare.') : 'That power can go somewhere else now.'}`; }
        if (opts.goal && opts.goal.done(S)) { const x = w.querySelector('.x'); if (x) x.disabled = false; const g = w.querySelector('#goal'); if (g) g.innerHTML = opts.goal.ok; }
      }));
    };
    return this.window({ title: 'Power Board — who gets the electricity?', html: '', wide: true, onMount: (w) => { render(w); if (opts.goal) w.querySelector('.x').disabled = true; } });
  }

  // ---------- Control Center: where is the error? + door locks + crew jobs ----------
  control() {
    const G = this.G, S = G.S, here = roomOk(S, 'control');
    const render = (w) => {
      const al = G.alerts(), F = computeFlows(S);
      const doors = ROOMS.map((d) => { const r = S.rooms[d.id], st = roomState(S, d.id); return `<div class="stat"><span><i class="dotc" style="background:${RCOL[st]}"></i>${d.name} <small>${st === 'ok' ? r.p.toFixed(0) + ' kPa' : RTXT[st]}</small></span><button class="mini-b ${r.door ? '' : 'off'}" data-door="${d.id}" ${here ? '' : 'disabled'}>${r.door ? IC.door + ' Open' : IC.lock + ' Locked'}</button></div>`; }).join('');
      const crew = S.helpers.map((hp) => `<div class="crew"><img src="assets/img/${hp.img}.jpg" alt=""><div><b>${hp.name}</b><small>${hp.kind === 'bot' ? 'Robot · uses 1 kW while working' : 'Astronaut · eats 3 meals a day, no electricity'}</small><div class="roles">${Object.entries(ROLES).map(([k, r]) => `<button data-h="${hp.id}" data-r="${k}" class="${hp.role === k ? 'on' : ''}" data-tip="${r.tip}">${r.name}</button>`).join('')}</div></div></div>`).join('');
      w.querySelector('.win-b').innerHTML = `<div class="grid2"><div><canvas id="cc-map" width="900" height="300"></canvas>
          <div class="legend">${Object.entries(RTXT).map(([k, v]) => `<span><i style="background:${RCOL[k]}"></i>${v}</span>`).join('')}</div>
          <h4 class="h4">Where is the error?</h4>${al.length ? al.map((a) => `<div class="alert ${a.kind || ''}" data-go="${a.go || ''}">${IC.alert} ${a.text}<small>${a.sub || ''}</small></div>`).join('') : '<div class="learn">No errors. Everything is running.</div>'}
          <h4 class="h4">Topside</h4><div class="stat"><span>Solar panels</span><b>${F.nOk} working · ${S.mounts.filter((x) => x === 2).length} broken · ${S.mounts.filter((x) => x === 0).length} empty mounts</b></div>
          <div class="stat"><span>Rover / Hopper charge</span><b>${Math.round(S.car.charge * 100)}% / ${Math.round(S.ship.charge * 100)}%</b></div>
          <div class="stat"><span>Other stations</span><b>${SITES.map((s) => s.name.split(' ')[0] + (S.rescued.includes(s.id) ? ' ✓' : ' ?')).join(' · ')}</b></div>
          <div class="row"><button class="ghost" id="cc-power">${IC.bolt} Power Board</button><button class="ghost" id="cc-map2">${IC.map} World map</button></div></div>
        <div><h4 class="h4">Bulkhead doors</h4>${here ? '<div class="mini">Lock a door to stop a leak spreading. The room behind it loses its air and freezes.</div>' : '<div class="note bad">The Control Center is damaged. Use the switch beside each door.</div>'}${doors}
          <h4 class="h4" style="margin-top:12px">Crew jobs</h4><div class="mini">Robots cost electricity. Rescued astronauts cost food. Nobody works for free.</div>${crew}</div></div>`;
      const cv = w.querySelector('#cc-map'), paint = () => drawStation(cv.getContext('2d'), S, 900, 300, { big: true, player: G.player.zone === 'deep' ? { x: G.player.pos.x, z: G.player.pos.z } : null }); paint(); clearInterval(this._tick); this._tick = setInterval(paint, 250);
      w.querySelectorAll('[data-door]').forEach((b) => (b.onclick = () => { G.toggleDoor(b.dataset.door); render(w); }));
      w.querySelectorAll('.roles button').forEach((b) => (b.onclick = () => { S.helpers.find((x) => x.id === b.dataset.h).role = b.dataset.r; G.audio?.play('click'); render(w); }));
      w.querySelectorAll('.alert[data-go]').forEach((a) => (a.onclick = () => { if (a.dataset.go) { G.pointTo(a.dataset.go); this.close(); } }));
      w.querySelector('#cc-power').onclick = () => { this.close(); setTimeout(() => this.powerBoard(), 30); }; w.querySelector('#cc-map2').onclick = () => { this.close(); setTimeout(() => this.bigMap(), 30); };
    };
    return this.window({ title: 'Control Center', html: '', wide: true, img: 'rm_control', onMount: render });
  }
  // ---------- world map (M) ----------
  bigMap() {
    const G = this.G; let view = G.player.zone === 'deep' ? 'deep' : 'base';
    const places = [['gate', 'Pit Elevator'], ['solar', 'Solar Field'], ['depot', 'Cargo Depot'], ['park', 'Charging Pads'], ['dish', 'Dish'], ['isru', 'Oxygen Plant'], ['car', 'My Rover'], ['ship', 'My Hopper'], ...SITES.map((s) => [s.id, s.name])];
    const render = (w) => {
      w.querySelector('.win-b').innerHTML = `<div class="tabs">${[['base', 'The base'], ['world', 'The whole area'], ['deep', 'Inside the station']].map(([k, v]) => `<button data-v="${k}" class="${k === view ? 'on' : ''}">${v}</button>`).join('')}</div>
        <div class="grid2"><canvas id="bm" width="${view === 'deep' ? 1000 : 720}" height="${view === 'deep' ? 340 : 720}" style="width:100%;border-radius:12px;border:1px solid var(--line)"></canvas>
        <div><h4 class="h4">Point the guide beam at…</h4><div class="places">${places.map(([id, n]) => `<button class="mini-b" data-go="${id}">${n}</button>`).join('')}</div><div class="learn">The orange beam shows the way. On the map: blue = working panel, red = broken, grey = empty mount. Coloured circles are the other stations.</div></div></div>`;
      const cv = w.querySelector('#bm'), c = cv.getContext('2d'), paint = () => (view === 'deep' ? drawStation(c, G.S, 1000, 340, { big: true, player: G.player.zone === 'deep' ? { x: G.player.pos.x, z: G.player.pos.z } : null, target: G.world.target && G.world.target.zone === 'deep' ? G.world.target : null }) : drawSurface(c, G, 720, 720, view === 'base' ? 190 : 700, view === 'base' ? 0 : 0, view === 'base' ? 0 : 20));
      paint(); clearInterval(this._tick); this._tick = setInterval(paint, 300);
      w.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { view = b.dataset.v; render(w); })); w.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { G.pointTo(b.dataset.go); this.close(); }));
    };
    return this.window({ title: 'Map', html: '', wide: true, onMount: render });
  }
  guide(tab = 'how') {
    const tabs = { how: 'How to play', truth: 'Real or made up?', tube: 'Why live in a lava tube?', tour: 'Station tour', games: 'Try the job games', words: 'Space words' };
    const pages = {
      how: () => `<div class="body grid2"><div><p><b>Your job:</b> keep the electricity on and the air in until rescue arrives.</p><p><b>Move:</b> W A S D or arrows · <b>Look:</b> drag the mouse (or click the game to lock it) · <b>Hop:</b> Space · <b>Run:</b> Shift</p><p><b>Do things:</b> walk up to something and press <b>E</b>. The bar at the bottom always tells you what E will do.</p><p><b>Spacesuit:</b> the cave and the surface have no air, so you wear your suit there. Inside the station you can take it off at the <b>Suit Lockers</b> in the airlock: indoor jobs go faster, and you can cook and sleep. Put it back on before you leave!</p><p><b>Carry:</b> pick up a panel or a crate with E, walk it to the rover, press E to load it. Press <b>Q</b> at the rover to take things out.</p><p><b>Drive / fly:</b> E at the rover or hopper. W S A D to steer. In the hopper, Space goes up and C goes down. Park on a round pad to recharge.</p><p><b>Tab</b> Power Board · <b>M</b> Map · <b>H</b> ask REGO · <b>V</b> change view · <b>P</b> pause</p></div>
        <div><p><b>Power</b> comes from solar panels. Fix the broken ones, then build more.</p><p><b>Air</b> must stay in. If a room gets a hole, lock its door before the whole station empties.</p><p><b>Oxygen</b> is made from water in the Oxygen Room.</p><p><b>Food:</b> tins run out. Each farm has three racks: choose what they grow. Every crop wants different light, water, warmth and plant food, and grows only as fast as whatever it has least of. Keep the hens fed, and cook.</p><p><b>Water:</b> carry canisters of icy soil to the <b>Water Plant</b> topside and extract the ice. Press <b>L</b> to see where every litre and every breath goes.</p><p><b>Day and night:</b> the white line in the clock's day bar is the temperature outside, and the green line is the cave. Click the clock, or press <b>T</b>, to see the whole Moon day.</p><p><b>Materials</b> fix and build everything. Other stations have more — and people who need rescuing.</p><p><b>Helpers:</b> robots cost power, people cost food. Give them jobs in the Control Center.</p></div></div>`,
      truth: () => `<p class="body">Most of this game is real science. Here is what is real and what we made simpler so you can finish a mission in one sitting. The full list of sources is in the project's docs folder.</p><table class="t"><tr><th>In the game</th><th></th><th>The truth</th></tr>${[
        ['A person breathes 0.84 kg of oxygen a day', 1, 'Measured for astronauts.'], ['About 3.8 L of water a day; up to 98% recycled', 1, 'Reached on the International Space Station.'], ['1.125 L of water makes 1 kg of oxygen', 1, 'Plain chemistry: 2 H₂O → 2 H₂ + O₂.'], ['Air pressure of 101 kPa', 1, 'The same as at sea level on Earth. In space it is zero, so any hole empties a room.'],
        ['Radiation topside: 0.057 mSv an hour', 1, 'Measured on the Moon. Under the rock roof it is almost zero.'], ['Shaded pits stay near 17°C', 1, 'Measured from orbit. The surface swings from 127°C to −173°C.'], ['No suit needed indoors', 1, 'Inside a sealed, heated station astronauts wear ordinary clothes. Suits are only for going outside.'], ['Plants sprouted in real Moon soil', 1, 'In 2022, in soil from Apollo 11, 12 and 17. They grew, but slowly, small and stressed.'], ['Ice in dark craters near the lunar poles', 1, 'A probe that crashed into one found about 5.6% water in the soil. There is none near the equator, where our base is.'], ['Ice turns straight to vapour in a vacuum', 1, 'Below 611 pascals of pressure, ice cannot melt. That is how the Water Plant works.'], ['Water from rock with hydrogen', 1, 'It works on real Moon soil in the lab, at about 1,000°C. It costs far more power than melting ice.'], ['A working ice plant on the Moon', 0, 'Nobody has built one yet. Microwaves pulling ice out of frozen soil has only been done in the lab.'], ['The Polar Ice Mine is a short trip away', 0, 'Our story. Real dark craters are at the poles, about 2,500 km from this base. A real base might be built there instead.'], ['Crater floors that never see the Sun, near −230°C', 1, 'Measured from orbit. Some are colder than Pluto, and that cold has kept their ice frozen for billions of years.'], ['Farming on the open surface', 0, 'Impossible: no air, no liquid water, and 300 degrees between day and night. Every crop grows indoors.'], ['Two weeks of light, two weeks of night', 1, 'One lunar day-night cycle is 29.5 Earth days.'], ['Earth stays in one spot in the sky', 1, `True from any one place on the Moon, apart from a small, slow wobble. It is drawn ${K.EARTH_DRAW_SCALE}× bigger here so you can see its phase.`],
        ['Radio delay of 1.3 s each way', 1, 'Light-speed over 384,400 km.'], ['Low-gravity hops', 1, 'Gravity is 1.62 m/s², one-sixth of Earth.'], ['Storm, moonquake and impact dates', 1, 'Every one is a real recorded event.'], ['Plants, hens and fish in space', 1, 'Lettuce, radishes and more have been grown in orbit. Quail eggs have hatched in space, and fish have lived on space stations. Nobody has kept hens on the Moon yet!'],
        ['Hens eat feed people cannot', 1, 'Dried grass, seeds and plant scraps are fine for hens but not for us.'], ['A meteor shower wrecking every station at once', 0, 'Very unlikely. Small impacts are real, but a storm this big is our story.'], ['Building a solar panel in 3 hours', 0, 'Real factories are far slower. One game hour passes in a few seconds.'], ['Machine power sizes', 0, 'Chosen so your choices matter.'], ['Crops ripen in about a day', 0, 'Real space lettuce took 33 days.'], ['The station tops up leaks with oxygen only', 0, 'Real air is mostly nitrogen plus oxygen. We keep one tank to keep it simple.'],
      ].map(([a, real, b]) => `<tr><td>${a}</td><td><span class="pill ${real ? 'real' : 'game'}">${real ? 'REAL' : 'STORY'}</span></td><td>${b}</td></tr>`).join('')}</table>`,
      tube: () => `<img src="assets/img/codex_lavatube.jpg" style="width:100%;border-radius:12px" alt=""><div class="body"><p><b>What is it?</b> Billions of years ago, rivers of lava flowed across the Moon. The top cooled into a hard crust while lava kept flowing underneath. When it drained away, it left a hollow tunnel: a lava tube. Where the roof fell in, we see a pit.</p><p><b>Our station is at a real place:</b> a pit in the Sea of Tranquility, about 100 m wide and 105 m deep. Radar has found a cave leading away from its floor.</p><p><b>How big can tubes get?</b> Nobody knows yet. Radar hints at one about 50 km long, and computer models say tubes hundreds of metres wide could stand in the Moon's weak gravity. You would be the first to walk inside one.</p><p><b>Why live there?</b> Steady temperature near 17°C. Metres of rock overhead that block radiation and meteoroids.</p><p><b>What does it cost?</b> No sunlight. Every plant needs electric light, and all power has to come down from the surface. No choice is free.</p></div>`,
      tour: () => `<p class="body">Tranquility Deep, room by room. One hall joins every room, and every room is its own bubble of air behind a bulkhead door.</p><div class="tour">${[['section', 'Cutaway', 'Sunlight, solar panels, the radio dish and the holed surface base are up top. The station sits 105 m down, where rock stops radiation and meteoroids. No sunlight reaches it, so the farms grow under LED lights.'], ['surface', 'Surface Base', 'Domes, labs and a command tower joined by tube corridors, with the solar field, landing pad and rover garage around them. The meteor shower left it without air.'], ['cave', 'The Cave', 'A lava tube 105 m under the surface. The elevator lands here, under the skylight of the pit. No air, but a steady 17°C.'], ['airlock', 'Airlock', 'The front door of the station. Suits come off and go on here.'], ['hall', 'Main Hall', 'Every room opens onto this one corridor.'], ...ROOMS.map((r) => [r.id, r.name, `Holds ${r.what}.`])].map(([id, n, t]) => `<figure><img src="assets/img/rm_${id}_s.jpg" alt="" loading="lazy" onerror="if (this.dataset.full) this.remove(); else { this.dataset.full = 1; this.src = 'assets/img/rm_${id}.jpg'; }"><figcaption><b>${n}</b>${t}</figcaption></figure>`).join('')}</div>`,
      words: () => `<table class="t">${Object.entries(GLOSSARY).map(([k, v]) => `<tr><th style="white-space:nowrap">${k}</th><td>${v}</td></tr>`).join('')}</table>`,
    };
    // Practice: every hands-on game, at any difficulty. Nothing done here changes the mission.
    const PRACTICE = [['wipe', 'Brush the dust', 'Solar panels'], ['cells', 'Swap cracked cells', 'Solar panels'], ['bolts', 'Turn the bolts', 'Panels and machines'], ['wires', 'Reconnect the wires', 'Batteries and circuits'], ['safe', 'Make it safe', 'Before electrical work'], ['gauge', 'Check the pressure', 'After every repair'], ['weld', 'Weld the seam', 'Holes and rebuilding'], ['leaks', 'Seal the leaks', 'Water pipes'], ['stir', 'Stir the pot', 'Cooking'], ['harvest', 'Harvest time', 'Picking crops'], ['plant', 'Set the seeds', 'Replanting'], ['stack', 'Stack the crates', 'Unloading'], ['suit', 'Check the suit seals', 'Suiting up'], ['align', 'Aim the dish at Earth', 'Earth Link'], ['sequence', 'Build the air filter', 'Air cleaner'], ['fire', 'Put out the fire', 'Emergencies']];
    let ptier = { cadet: 0, pilot: 1, commander: 2, unlimited: 2 }[this.G.S?.mode] ?? 1;
    pages.games = () => `<p class="body">Every job starts with one of these. Try any of them here, at any difficulty. Nothing you do here changes your mission.</p><div class="tabs" id="pg-tier">${['Cadet · guided', 'Pilot', 'Commander · hardest'].map((n, i) => `<button data-pt="${i}" class="${i === ptier ? 'on' : ''}">${n}</button>`).join('')}</div><div class="pgrid">${PRACTICE.map(([k, n, d]) => `<button class="choice" data-g="${k}"><b>${n}</b>${d}</button>`).join('')}</div>`;
    const render = (w, t) => { w.querySelector('.win-b').innerHTML = `<div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button data-t="${k}" class="${k === t ? 'on' : ''}">${v}</button>`).join('')}</div>${pages[t]()}`; w.querySelectorAll('.tabs button[data-t]').forEach((b) => (b.onclick = () => render(w, b.dataset.t)));
      w.querySelectorAll('#pg-tier button').forEach((b) => (b.onclick = () => { ptier = Number(b.dataset.pt); render(w, 'games'); }));
      w.querySelectorAll('.pgrid .choice').forEach((b) => (b.onclick = async () => { this.G.audio?.init?.(); this.close(); await this.G.playMini(b.dataset.g, { tier: ptier, ease: [1.35, 1, 0.85][ptier] / (this.G.S?.m.mgEase || 1) }); this.guide('games'); })); };
    return this.window({ title: 'Space Guide', html: '', wide: true, onMount: (w) => render(w, tab) });
  }

  // ---------- HUD update ----------
  hud(dt) {
    const G = this.G, S = G.S; if (!S) return; this.t += dt; this._labels();
    if (this.t < 0.2) return; this.t = 0;
    const F = S.flow, sun = F.sun, set = (id, v, bar, sub, state) => { $(`#g-${id}-v`).textContent = v; $(`#g-${id}-b`).style.width = clamp(bar * 100, 0, 100) + '%'; const s = $(`#g-${id}-s`); if (s.dataset.h !== sub) { s.dataset.h = sub; s.innerHTML = sub; } const g = $('#g-' + id); g.classList.toggle('warn', state === 1); g.classList.toggle('crit', state === 2); };
    const bp = S.battery / F.cap, rn = (id) => ROOMS.find((r) => r.id === id).name;
    set('power', Math.round(bp * 100) + '%', bp, F.net >= 0 ? `+${F.net.toFixed(1)} kW · ${F.nOk} panels` : `${F.net.toFixed(1)} kW · ${fmt.hrs(Math.floor(Math.min(F.battHours, 99)))} left`, F.eff < 1 ? 2 : F.net < 0 && bp < 0.12 ? 2 : F.net < 0 && bp < 0.3 ? 1 : 0);
    const sealed = ROOMS.filter((r) => S.rooms[r.id].hole > 0 && !S.rooms[r.id].door).length;
    set('air', S.P.toFixed(0) + ' kPa', S.P / K.AIR_KPA, F.leaks.length ? `LEAK: ${rn(F.leaks[0])}!` : sealed ? `${sealed} room${sealed > 1 ? 's' : ''} sealed off` : 'no leaks', F.leaks.length || S.P < 70 ? 2 : sealed ? 1 : 0);
    set('o2', S.o2.toFixed(1) + ' kg', S.o2 / S.o2Cap, `${F.o2Net >= 0 ? '+' : ''}${F.o2Net.toFixed(2)}/day${F.o2Net < 0 ? ' · ' + fmt.days(F.o2Days) : ''}`, S.o2 < 0.4 || F.o2Days < 0.4 ? 2 : F.o2Days < 1.5 ? 1 : 0);
    set('water', S.water.toFixed(0) + ' L', S.water / S.waterCap, `${F.wNet.toFixed(1)} L/day · ${fmt.days(F.waterDays)}`, S.water < 2 || F.waterDays < 0.6 ? 2 : F.waterDays < 2 ? 1 : 0);
    set('food', Math.floor(S.meals + S.cans) + ' meals', Math.min(1, F.foodTotal / 30), `${Math.floor(S.raw)} raw · ${fmt.days(F.foodDays)}`, F.foodTotal < 1.5 ? 2 : F.foodDays < 1.5 ? 1 : 0);
    const dr = F.doseRate || 0; set('rad', S.dose.toFixed(1) + ' mSv', S.dose / K.DOSE_LIMIT, `now ${dr < 0.01 ? '0.00' : dr.toFixed(2)} mSv/h`, S.dose > K.DOSE_LIMIT * 0.85 || dr > 1 ? 2 : S.dose > K.DOSE_LIMIT * 0.6 || dr > 0.2 ? 1 : 0);
    set('mat', fmt.mat(S.mat), S.mat === Infinity ? 1 : Math.min(1, S.mat / 20), 'to fix and build', S.mat < 1 ? 2 : S.mat < 3 ? 1 : 0);
    const dd = (S.t - S.t0) / 24; $('#c-day').textContent = S.hours === Infinity ? fmt.day(S.t) : `${fmt.day(S.t)} of ${S.m.days}`; $('#c-time').textContent = fmt.clock(S.t); const hereR = S.here && S.rooms[S.here]; $('#c-zone').textContent = G.player.zone === 'top' ? (G.inCrater ? `DARK CRATER ${MINE.coldC}°C` : `TOPSIDE ${Math.round(sun.tempC)}°C`) : !G.inside ? `CAVE ${CAVE_C}°C` : hereR && hereR.frozen ? 'FROZEN ROOM' : `STATION ${INDOOR_C}°C`;
    const su = $('#suit'), sk = S.suitOn ? 'on' : 'off'; if (su.dataset.k !== sk) { su.dataset.k = sk; su.className = 'glass ' + sk; su.textContent = S.suitOn ? 'SUIT ON' : 'SUIT OFF · INDOORS'; }
    $('#c-sun').innerHTML = (sun.up ? IC.sun + ` sunset in ${fmt.days(sun.toSunset / 24)}` : IC.moon + ` sunrise in ${fmt.days(sun.toSunrise / 24)}`); $('#c-rescue').innerHTML = S.hours === Infinity ? 'no time limit' : IC.rocket + ` rescue in ${fmt.days((S.hours - (S.t - S.t0)) / 24)}`;
    const tlKey = S.mode + ':' + S.seed; if (this._tlKey !== tlKey) { this._tlKey = tlKey; const span = S.hours === Infinity ? 30 * 24 : S.hours, ss = clamp((S.m.sunsetDay * 24) / span, 0, 1) * 100; $('#tl-fill').style.background = `linear-gradient(90deg,#ffd257 0%,#ff9a3d ${ss}%,#182a52 ${Math.min(ss + 1.5, 100)}%,#0b1630 100%)`; this._tl = span; const cv = this.tempCurve(S, S.t0, span, 96, 100, 24, 0, 3); $('#th-svg').innerHTML = `<path class="th-cave" d="M0 ${cv.y(CAVE_C).toFixed(1)}H100"/><path class="th-night" d="${cv.night}"/><path class="th-day" d="${cv.day}"/>`; }
    const nowX = clamp(((S.t - S.t0) / this._tl) * 100, 0, 100); $('#tl-now').style.left = nowX + '%';
    const tn = $('#th-now'); tn.style.left = nowX + '%'; tn.style.top = ((3 + this.tempY(sun.tempC, 24)) / 30) * 100 + '%'; $('#clock').title = `Outside: ${Math.round(sun.tempC)}°C. In the cave: ${CAVE_C}°C. Click for day and night.`;
    const st = S.storm, ts = $('#tl-storm'); ts.style.display = st ? 'block' : 'none'; if (st) { ts.style.left = clamp(((st.start - S.t0) / this._tl) * 100, 0, 100) + '%'; ts.style.width = Math.max(((st.end - st.start) / this._tl) * 100, 1.2) + '%'; }
    $('#hp').style.width = S.health + '%'; $('#hp').style.background = S.health > 60 ? 'var(--green)' : S.health > 30 ? 'var(--amber)' : 'var(--red)';
    const v = G.player.in, cc = G.player.carry; $('#carry').innerHTML = v === 'dig' ? `${IC.box} Digger ${G.dig.load}/${MINE.bucket}` : v ? `${IC[v]} ${v === 'car' ? 'Rover' : 'Hopper'} ${Math.round(S[v].charge * 100)}%` : cc ? `${IC.box} ${cc.type.startsWith('panel') ? 'panel' : cc.type}` : `${IC.crew} ${F.people}`;
    const al = G.alerts ? G.alerts() : [], key = al.map((a) => a.text + a.sub).join('|');
    if (key !== this._alKey) { this._alKey = key; const box = $('#alerts'); box.innerHTML = ''; al.slice(0, 5).forEach((a) => { const d = el('div', 'alert ' + (a.kind || ''), `${a.text}<small>${a.sub || ''}</small>`); d.onclick = () => a.go && G.pointTo(a.go); box.appendChild(d); }); }
    this._minimap();
  }
  _labels() {
    const G = this.G, cam = G.world.camera, v = this._v || (this._v = G.world.stationPos('solar').clone()), w = innerWidth, h = innerHeight, bad = G.badPlaces ? G.badPlaces() : {}, tid = G.world.target && G.world.target.id;
    const each = (s, name) => {
      const l = this.labels[s.id]; if (s.zone !== G.player.zone) { l.classList.add('hidden'); return; }
      v.copy(G.world.stationPos(s.id)); const dist = Math.hypot(v.x - G.player.pos.x, v.z - G.player.pos.z); v.y += s.zone === 'top' ? 5 : 3.2; v.project(cam);
      const goal = tid === s.id, hid = s.zone === 'deep' && !goal && G.inside === (s.id === 'lift'), show = !hid && v.z < 1 && Math.abs(v.x) < 1.1 && (goal || bad[s.id] || (s.site ? dist < 900 : dist < (s.zone === 'top' ? 85 : 22)));
      l.classList.toggle('hidden', !show); if (!show) return;
      l.style.transform = `translate(${((v.x + 1) / 2) * w}px,${((1 - v.y) / 2) * h}px) translate(-50%,-100%)`; const txt = `${name}<small>${dist.toFixed(0)} m</small>`; if (l.dataset.t !== txt) { l.dataset.t = txt; l.innerHTML = txt; }
      l.classList.toggle('goal', goal); l.classList.toggle('bad', !!bad[s.id] && !goal);
    };
    for (const s of STATIONS) each(s, s.name); for (const s of SITES) each({ id: s.id, zone: 'top', site: true }, s.name);
  }
  _minimap() {
    const G = this.G, c = this.mm, W = 340, p = G.player;
    if (p.zone === 'top') drawSurface(c, G, W, W, 150, p.pos.x, p.pos.z); else drawStation(c, G.S, W, W, { big: true, focus: { x: p.pos.x, z: p.pos.z }, span: 64, player: { x: p.pos.x, z: p.pos.z }, target: G.world.target && G.world.target.zone === 'deep' ? G.world.target : null });
  }

  // ---------- end screen ----------
  end(res) {
    const S = this.G.S, sc = score(S), e = $('#end'); e.classList.remove('hidden'); this.showHud(false); document.exitPointerLock?.();
    const series = [['Power', '#ffd257', 1], ['Oxygen', '#49e6ff', 2], ['Water', '#5aa6d8', 3], ['Food', '#58e08a', 4], ['Radiation', '#ff5252', 5], ['Air pressure', '#c9b8ff', 7], ['Health', '#ffffff', 6]];
    e.innerHTML = `<div class="end-bg" style="background-image:url(assets/img/${res.img}.jpg)"></div><div class="end-inner">
      <div class="eyebrow">${MODES[S.mode].name} mission · ${sc.days.toFixed(1)} days · seed ${S.seed}</div><h1 class="${res.win ? 'won' : 'lost'}">${res.title}</h1><p class="body">${gloss(res.sub)}</p>
      <div class="badges"><span class="badge">${sc.rank}</span><span class="badge">${sc.pts.toLocaleString()} points</span><span class="badge">${sc.okPanels} panels working</span><span class="badge">${sc.roomsOk} of 11 rooms working</span><span class="badge">${S.rescued.length} of 3 astronauts rescued</span><span class="badge">${S.dose.toFixed(1)} mSv radiation</span><span class="badge">${S.stats.jobs} jobs done</span>${S.stats.asked ? `<span class="badge">${S.stats.right || 0} of ${S.stats.asked} question${S.stats.asked > 1 ? 's' : ''} right</span>` : ''}</div>
      <h3>${res.win ? 'How you did it' : 'Here is what happened — and why'}</h3><ol class="chain">${res.why.map((x) => `<li>${gloss(x)}</li>`).join('')}</ol>
      <div class="learn"><b>The real science:</b> ${gloss(res.science)}</div>${res.tip ? `<div class="note"><b>Next time:</b> ${res.tip}</div>` : ''}
      <h3>Your mission, hour by hour</h3><canvas id="chart" width="1800" height="460"></canvas><div class="legend">${series.map((s) => `<span><i style="background:${s[1]}"></i>${s[0]}</span>`).join('')}<span><i style="background:#182a52"></i>night</span></div>
      <h3>Mission log</h3><div class="logbox">${S.log.map((l) => `<div><b>${fmt.day(l.t)} ${fmt.clock(l.t)}</b> — ${l.text}</div>`).join('') || 'Nothing logged.'}</div>
      <div class="row" style="margin-top:16px"><button class="primary" id="again">${res.win ? 'Play again' : 'Try again'}</button><span class="fine" style="margin:0">Science notes and data sources: see the docs folder of this project.</span></div></div>`;
    const cv = $('#chart'), c = cv.getContext('2d'), W = cv.width, H = cv.height, T0 = S.t0, T = Math.max(S.t - T0, 24), X = (t) => 50 + ((t - T0) / T) * (W - 70), Y = (v) => H - 34 - clamp(v, 0, 1) * (H - 60);
    c.fillStyle = '#060b12'; c.fillRect(0, 0, W, H); const ns = S.m.sunsetDay * 24; if (ns < T) { c.fillStyle = '#101d3c'; c.fillRect(X(T0 + ns), 10, X(T0 + T) - X(T0 + ns), H - 44); }
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.fillStyle = '#9bb0c3'; c.font = '20px sans-serif'; const stepD = Math.max(1, Math.ceil(T / 24 / 12));
    for (let d = 0; d <= T / 24; d += stepD) { c.beginPath(); c.moveTo(X(T0 + d * 24), 10); c.lineTo(X(T0 + d * 24), H - 34); c.stroke(); c.fillText('Day ' + (d + 1), X(T0 + d * 24) + 4, H - 10); }
    for (const l of S.log) if (l.kind === 'bad') { c.fillStyle = 'rgba(255,82,82,.45)'; c.fillRect(X(l.t) - 1, 10, 3, H - 44); }
    for (const [, col, k] of series) { c.strokeStyle = col; c.lineWidth = k === 6 ? 4 : 2.5; c.beginPath(); S.hist.forEach((hh, i) => (i ? c.lineTo(X(hh[0]), Y(hh[k])) : c.moveTo(X(hh[0]), Y(hh[k])))); c.stroke(); }
    $('#again').onclick = () => { this.G.clearSave?.(); location.reload(); };
  }
}
