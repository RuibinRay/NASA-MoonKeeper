// MOONKEEPER — sixteen hands-on games. Each one is tied to a real piece of space science (see `why`) and is drawn over a photo backdrop (see `bg`).
import { K } from './config.js';

const W = 900, H = 480, TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

const GAMES = {
  // 1. Brush sticky moon dust off a solar panel: the power meter climbs as the glass clears
  wipe: {
    title: 'Brush the dust off', how: 'Hold and drag the brush across the panel. Watch the power climb as the glass clears.', time: 26, bg: 'bolts',
    why: 'Moon dust is sticky, sharp and charged with static electricity, so it clings to everything. Dust on a panel blocks sunlight, and blocked sunlight is lost power.', src: 'moondust',
    init(s) { s.nx = 45; s.ny = 24; s.d = new Float32Array(s.nx * s.ny).fill(1); s.clean = 0; s.rad = [60, 52, 45][s.tier]; s.goal = [0.9, 0.93, 0.95][s.tier]; s.fl = []; s.ang = 0; s.px = s.ptr.x; s.py = s.ptr.y; },
    update(s, dt) {
      const mx = s.ptr.x - s.px, my = s.ptr.y - s.py; if (Math.hypot(mx, my) > 2) s.ang = Math.atan2(my, mx); s.px = s.ptr.x; s.py = s.ptr.y;
      if (s.ptr.down) for (let j = 0; j < s.ny; j++) for (let i = 0; i < s.nx; i++) { const cx = i * 20 + 10, cy = j * 20 + 10, k = j * s.nx + i; if (s.d[k] > 0 && Math.hypot(cx - s.ptr.x, cy - s.ptr.y) < s.rad) { const b = s.d[k]; s.d[k] = Math.max(0, b - dt * 7); if (b > 0.25 && s.d[k] <= 0.25 && s.fl.length < 80 && Math.random() < 0.35) s.fl.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 180 + mx * 4, vy: -Math.random() * 140, l: 0.7 }); } }
      for (const q of s.fl) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 60 * dt; q.l -= dt; } s.fl = s.fl.filter((q) => q.l > 0);
      let n = 0; for (const v of s.d) if (v < 0.25) n++; s.clean = n / s.d.length;
      if (s.clean >= s.goal) return { win: true, score: clamp(s.left / s.time + 0.45, 0, 1) }; if (s.left <= 0) return { win: s.clean > 0.7, score: s.clean };
    },
    draw(s, c) {
      for (let j = 0; j < 6; j++) for (let i = 0; i < 9; i++) { const g = c.createLinearGradient(i * 100, j * 80, i * 100 + 100, j * 80 + 80); g.addColorStop(0, '#163a86'); g.addColorStop(1, '#0d2458'); c.fillStyle = g; c.fillRect(i * 100 + 2, j * 80 + 2, 96, 76); }
      c.strokeStyle = 'rgba(200,220,255,.18)'; c.lineWidth = 1; for (let i = 0; i < 36; i++) { c.beginPath(); c.moveTo(i * 25, 0); c.lineTo(i * 25, H); c.stroke(); }
      for (let j = 0; j < s.ny; j++) for (let i = 0; i < s.nx; i++) { const v = s.d[j * s.nx + i]; if (v > 0.02) { c.fillStyle = 'rgba(' + (150 + (i * 7 + j * 13) % 22) + ',146,138,' + v * 0.95 + ')'; c.fillRect(i * 20, j * 20, 20, 20); } }
      c.fillStyle = 'rgba(190,184,174,.8)'; for (const q of s.fl) c.fillRect(q.x, q.y, 4, 4);
      c.save(); c.translate(s.ptr.x, s.ptr.y); c.rotate(s.ang + Math.PI / 2); c.fillStyle = '#d9b45a'; rr(c, -9, 14, 18, 120, 8); c.fill(); c.fillStyle = '#e8edf2'; rr(c, -s.rad, -16, s.rad * 2, 32, 8); c.fill(); c.strokeStyle = '#9aa7b4'; c.lineWidth = 2; for (let k = -s.rad + 6; k < s.rad; k += 9) { c.beginPath(); c.moveTo(k, -16); c.lineTo(k, -30 - (s.ptr.down ? 3 : 0)); c.stroke(); } c.restore();
      const kw = 3.2 * s.clean; c.fillStyle = 'rgba(4,10,16,.86)'; rr(c, 716, 48, 170, 92, 12); c.fill(); c.textAlign = 'center'; c.fillStyle = '#9bb0c3'; c.font = '600 13px Inter,sans-serif'; c.fillText('PANEL OUTPUT', 801, 70); c.fillStyle = s.clean >= s.goal ? '#58e08a' : '#ffd257'; c.font = '700 32px "Chakra Petch",sans-serif'; c.fillText(kw.toFixed(1) + ' kW', 801, 106); c.fillStyle = '#1b2430'; rr(c, 732, 118, 138, 10, 5); c.fill(); c.fillStyle = '#ffd257'; rr(c, 732, 118, Math.max(10, 138 * s.clean), 10, 5); c.fill();
      label(c, 'Glass clear: ' + Math.round(s.clean * 100) + '%   ·   needs ' + Math.round(s.goal * 100) + '%');
    },
  },
  // 2. Swap cracked solar cells: a broken cell drags the whole panel's output down
  cells: {
    title: 'Swap the cracked cells', how: 'Click every CRACKED cell to swap in a new one. Clicking a good cell wastes 2 seconds.', time: 16, bg: 'bolts',
    why: 'Meteoroids hit the Moon at 20 to 72 km every second. With no air to slow them, even a pebble can smash a panel. Cells are wired in rows, so one dead cell weakens its whole row.', src: 'meo',
    init(s, rnd) { s.cells = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) s.cells.push({ x: 30 + i * 142, y: 22 + j * 110, bad: false, fx: 0, seed: rnd() }); s.tot = [6, 8, 10][s.tier]; let n = 0; while (n < s.tot) { const k = s.cells[(rnd() * 24) | 0]; if (!k.bad) { k.bad = true; n++; } } s.bad = s.tot; },
    down(s, x, y) { const k = s.cells.find((q) => x > q.x && x < q.x + 130 && y > q.y && y < q.y + 98); if (!k) return; if (k.bad) { k.bad = false; k.fx = 1; s.sfx('ok'); } else { s.left -= 2; k.fx = -1; s.sfx('bad'); } },
    update(s, dt) { for (const k of s.cells) k.fx *= Math.pow(0.02, dt); const bad = s.cells.filter((k) => k.bad).length; s.bad = bad; if (!bad) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: 1 - bad / s.tot }; },
    draw(s, c) {
      const faint = s.tier === 2 ? 0.55 : 1;   // Commander: hairline cracks are harder to spot
      for (const k of s.cells) {
        const g = c.createLinearGradient(k.x, k.y, k.x + 130, k.y + 98); g.addColorStop(0, k.bad ? '#2b3344' : '#17408f'); g.addColorStop(1, k.bad ? '#1c2230' : '#0f2a62'); c.fillStyle = g; rr(c, k.x, k.y + (k.fx > 0 ? -k.fx * 14 : 0), 130, 98, 8); c.fill();
        if (k.fx > 0.05) { c.fillStyle = 'rgba(120,255,170,' + k.fx + ')'; c.fill(); } if (k.fx < -0.05) { c.fillStyle = 'rgba(255,80,80,' + -k.fx + ')'; c.fill(); }
        c.strokeStyle = 'rgba(190,215,255,.35)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(k.x + i * 32.5, k.y); c.lineTo(k.x + i * 32.5, k.y + 98); c.stroke(); }
        if (k.bad) { c.strokeStyle = 'rgba(215,220,230,' + faint + ')'; c.lineWidth = 2.5 * faint; c.beginPath(); let x = k.x + 20 + k.seed * 40, y = k.y + 6; c.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (((k.seed * 97 * (i + 1)) % 1) - 0.4) * 46; y += 15; c.lineTo(clamp(x, k.x + 4, k.x + 126), y); } c.stroke(); c.beginPath(); c.moveTo(k.x + 65, k.y + 50); c.lineTo(k.x + 112, k.y + 30 + k.seed * 40); c.stroke(); }
        else { c.fillStyle = 'rgba(88,224,138,.9)'; c.beginPath(); c.arc(k.x + 118, k.y + 12, 4, 0, TAU); c.fill(); }
      }
      const out = 1 - s.bad / 24 * 2.4; c.fillStyle = 'rgba(4,10,16,.88)'; rr(c, 330, 452, 240, 22, 8); c.fill(); c.fillStyle = s.bad ? '#ffd257' : '#58e08a'; rr(c, 332, 454, Math.max(8, 236 * clamp(out, 0, 1)), 18, 7); c.fill();
      label(c, 'Cracked cells left: ' + s.bad + '   ·   panel output ' + Math.round(clamp(out, 0, 1) * 100) + '%');
    },
  },
  // 3. Reconnect wires: every good connection lights its lamp and current starts to flow
  wires: {
    title: 'Reconnect the wires', how: 'Drag each plug on the left to the socket of the SAME colour on the right.', time: 22, bg: 'safe',
    why: 'Radiation can scramble computers and slowly wear out electronics. Engineers build spare circuits so a broken one can be bypassed. Current only flows when the loop is complete.', src: 'hardware',
    init(s, rnd) { const cols = ['#ff5252', '#ffd257', '#58e08a', '#49e6ff', '#ff6fdc'].slice(0, s.tier === 0 ? 4 : 5), n = cols.length, gap = 340 / (n - 1); const order = cols.map((q, i) => i).sort(() => rnd() - 0.5); s.L = cols.map((col, i) => ({ col, x: 130, y: 70 + i * gap, to: null })); s.R = order.map((ci, i) => ({ col: cols[ci], x: 770, y: 70 + i * gap, used: false })); s.drag = null; s.spark = 0; s.N = n; s.pen = [2, 2, 3][s.tier]; },
    down(s, x, y) { const p = s.L.find((q) => !q.to && Math.hypot(q.x - x, q.y - y) < 46); if (p) s.drag = p; },
    up(s, x, y) { if (!s.drag) return; const r = s.R.find((q) => !q.used && Math.hypot(q.x - x, q.y - y) < 50); if (r) { if (r.col === s.drag.col) { s.drag.to = r; r.used = true; s.sfx('ok'); } else { s.left -= s.pen; s.spark = 1; s.sfx('bad'); } } s.drag = null; },
    update(s, dt) { s.spark *= Math.pow(0.01, dt); const n = s.L.filter((q) => q.to).length; s.n = n; if (n === s.N) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: n / s.N }; },
    draw(s, c) {
      c.fillStyle = 'rgba(12,23,36,.9)'; rr(c, 40, 20, 180, 440, 14); c.fill(); rr(c, 680, 20, 180, 440, 14); c.fill();
      c.lineCap = 'round';
      for (const p of s.L) { const tx = p.to ? p.to.x : s.drag === p ? s.ptr.x : null, ty = p.to ? p.to.y : s.drag === p ? s.ptr.y : null; if (tx === null) continue; const path = () => { c.beginPath(); c.moveTo(p.x, p.y); c.bezierCurveTo(p.x + 200, p.y + 60, tx - 200, ty + 60, tx, ty); }; c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 16; path(); c.stroke(); c.strokeStyle = p.col; c.lineWidth = 10; path(); c.stroke(); if (p.to) { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.setLineDash([10, 22]); c.lineDashOffset = -s.t * 90; path(); c.stroke(); c.setLineDash([]); } }
      for (const p of s.L) { c.fillStyle = '#c9d1da'; rr(c, p.x - 46, p.y - 16, 30, 32, 6); c.fill(); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 26, 0, TAU); c.fill(); c.fillStyle = '#0008'; c.beginPath(); c.arc(p.x, p.y, 10, 0, TAU); c.fill(); }
      for (const r of s.R) { c.strokeStyle = r.col; c.lineWidth = 8; c.beginPath(); c.arc(r.x, r.y, 26, 0, TAU); c.stroke(); c.fillStyle = r.used ? r.col : '#05090f'; c.beginPath(); c.arc(r.x, r.y, 20, 0, TAU); c.fill(); c.fillStyle = r.used ? '#58e08a' : '#2a323c'; c.beginPath(); c.arc(r.x + 56, r.y, 9, 0, TAU); c.fill(); if (r.used) { c.fillStyle = 'rgba(88,224,138,.35)'; c.beginPath(); c.arc(r.x + 56, r.y, 16, 0, TAU); c.fill(); } }
      if (s.spark > 0.05) { c.fillStyle = 'rgba(255,240,150,' + s.spark + ')'; c.fillRect(0, 0, W, H); }
      label(c, 'Circuits live: ' + (s.n || 0) + ' of ' + s.N);
    },
  },
  // 4. Seal leaks: clamp each spraying joint before the tank empties
  leaks: {
    title: 'Seal the leaks', how: 'Hold the clamp on each spraying leak until the ring closes. Be quick: the tank is emptying!', time: 30, bg: 'gauge',
    why: 'Shallow moonquakes can reach magnitude 5.5 and shake for more than 10 minutes — long enough to crack pipes and seals.', src: 'quakes',
    init(s, rnd) { s.j = []; for (let i = 0; i < 9; i++) s.j.push({ x: 110 + (i % 3) * 340 + (rnd() - 0.5) * 60, y: 90 + ((i / 3) | 0) * 150 + (rnd() - 0.5) * 30, on: false, seal: 0, done: false }); s.todo = s.total || 7; s.sealed = 0; s.next = 0.3; s.lost = 0; s.need = [0.45, 0.55, 0.7][s.tier]; s.max = [2, 3, 4][s.tier]; s.dr = []; },
    update(s, dt) {
      s.next -= dt; const act = s.j.filter((q) => q.on);
      if (s.next <= 0 && s.todo > 0 && act.length < s.max) { const free = s.j.filter((q) => !q.on && !q.done); if (free.length) { const q = free[(Math.random() * free.length) | 0]; q.on = true; q.seal = 0; s.todo--; s.next = 1.25; s.sfx('blip'); } }
      for (const q of act) { if (s.ptr.down && Math.hypot(q.x - s.ptr.x, q.y - s.ptr.y) < 50) { q.seal += dt / s.need; if (q.seal >= 1) { q.on = false; q.done = true; s.sealed++; s.sfx('ok'); } } else q.seal = Math.max(0, q.seal - dt); if (s.dr.length < 90) s.dr.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 220, vy: -120 - Math.random() * 200, l: 0.8 }); }
      for (const d of s.dr) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 520 * dt; d.l -= dt; } s.dr = s.dr.filter((d) => d.l > 0);
      s.lost += act.length * dt * 0.022;
      if (s.todo === 0 && !s.j.some((q) => q.on)) return { win: true, score: clamp(1 - s.lost, 0, 1) };
      if (s.lost >= 1 || s.left <= 0) return { win: false, score: 0 };
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#121a24'; c.fillRect(0, 0, W, H); }
      const path = () => { c.beginPath(); s.j.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); };
      c.lineJoin = 'round'; c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 30; path(); c.stroke(); c.strokeStyle = '#7f8a97'; c.lineWidth = 22; path(); c.stroke(); c.strokeStyle = '#aab4c0'; c.lineWidth = 6; path(); c.stroke();
      c.strokeStyle = 'rgba(73,230,255,.55)'; c.lineWidth = 3; c.setLineDash([14, 20]); c.lineDashOffset = -s.t * 70; path(); c.stroke(); c.setLineDash([]);
      for (const q of s.j) {
        c.fillStyle = '#4a545f'; c.beginPath(); c.arc(q.x, q.y, 26, 0, TAU); c.fill(); c.fillStyle = q.done ? '#58e08a' : '#8793a0'; c.beginPath(); c.arc(q.x, q.y, 19, 0, TAU); c.fill(); for (let k = 0; k < 6; k++) { c.fillStyle = '#2a323c'; c.beginPath(); c.arc(q.x + Math.cos(k * TAU / 6) * 22, q.y + Math.sin(k * TAU / 6) * 22, 3, 0, TAU); c.fill(); }
        if (q.on) { c.strokeStyle = '#ffb347'; c.lineWidth = 6; c.beginPath(); c.arc(q.x, q.y, 36, -Math.PI / 2, -Math.PI / 2 + TAU * q.seal); c.stroke(); }
      }
      c.fillStyle = 'rgba(190,232,255,.85)'; for (const d of s.dr) c.fillRect(d.x, d.y, 4, 7);
      if (s.ptr.down) { c.strokeStyle = '#ff7a1a'; c.lineWidth = 10; c.beginPath(); c.arc(s.ptr.x, s.ptr.y, 30, 0.6, TAU - 0.6); c.stroke(); c.fillStyle = '#c9d1da'; rr(c, s.ptr.x + 22, s.ptr.y - 9, 46, 18, 6); c.fill(); }
      const left = clamp(1 - s.lost, 0, 1); c.fillStyle = 'rgba(4,10,16,.88)'; rr(c, 250, 446, 400, 22, 8); c.fill(); c.fillStyle = left > 0.4 ? '#49e6ff' : '#ff5252'; rr(c, 252, 448, Math.max(8, 396 * left), 18, 7); c.fill();
      label(c, 'Tank saved: ' + Math.round(left * 100) + '%   ·   sealed ' + s.sealed);
    },
  },
  // 5. Point the dish at Earth — with real light delay, drawn as an echo trace
  align: {
    title: 'Aim the dish at Earth', how: 'Move the crosshair (arrow keys, buttons, or hold the pointer) to find the strongest signal. Careful: the signal bar shows what happened 2.6 seconds ago!', time: 75, arrows: true,
    why: 'Radio travels at light speed, but Earth is ' + K.EARTH_MOON_KM.toLocaleString() + ' km away: 1.3 s there + 1.3 s back. You are always steering with old news. On Mars the wait is 4 to 24 minutes each way.', src: 'delay',
    init(s, rnd) { const a = rnd() * TAU, d = 60 + rnd() * 70; s.tx = W / 2 + Math.cos(a) * d; s.ty = 215 + Math.sin(a) * d; s.x = W / 2 + (rnd() - 0.5) * 380; s.y = 215 + (rnd() - 0.5) * 220; s.q = []; s.sig = 0; s.lock = 0; s.thr = [0.9, 0.93, 0.95][s.tier]; s.hist = []; },
    update(s, dt) {
      let dx = (s.keys.ArrowRight || s.keys.d ? 1 : 0) - (s.keys.ArrowLeft || s.keys.a ? 1 : 0), dy = (s.keys.ArrowDown || s.keys.s ? 1 : 0) - (s.keys.ArrowUp || s.keys.w ? 1 : 0);
      if (s.ptr.down && s.ptr.y < 400) { const vx = s.ptr.x - s.x, vy = s.ptr.y - s.y, l = Math.hypot(vx, vy); if (l > 6) { dx = vx / l; dy = vy / l; } }
      s.x = clamp(s.x + dx * 105 * dt, 30, W - 30); s.y = clamp(s.y + dy * 105 * dt, 30, 380);
      s.q.push([s.t, clamp(1 - Math.hypot(s.x - s.tx, s.y - s.ty) / 330, 0, 1)]);
      while (s.q.length > 1 && s.q[1][0] <= s.t - 2 * K.LIGHT_DELAY_S) s.q.shift();
      s.sig = s.t > 2 * K.LIGHT_DELAY_S ? s.q[0][1] : 0; s.hist.push(s.sig); if (s.hist.length > 150) s.hist.shift();
      s.lock = s.sig > s.thr ? s.lock + dt : 0;
      if (s.lock > 1.1) return { win: true, score: clamp(s.left / s.time + 0.3, 0, 1) };
      if (s.left <= 0) return { win: false, score: s.sig };
    },
    draw(s, c) {
      c.fillStyle = '#02050a'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) c.fillRect((i * 173.3) % W, (i * 97.7) % 400, 1.5, 1.5);
      const g = c.createRadialGradient(W / 2 - 40, 180, 10, W / 2, 215, 150); g.addColorStop(0, '#7fc4ff'); g.addColorStop(0.6, '#1f5fae'); g.addColorStop(1, '#0a2247'); c.fillStyle = g; c.beginPath(); c.arc(W / 2, 215, 150, 0, TAU); c.fill();
      c.fillStyle = 'rgba(90,190,120,.55)'; for (const [x, y, r] of [[-50, -40, 46], [40, 30, 38], [-10, 70, 30], [70, -60, 24]]) { c.beginPath(); c.ellipse(W / 2 + x, 215 + y, r, r * 0.7, 0.5, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(73,230,255,.22)'; c.lineWidth = 2; c.setLineDash([6, 10]); c.lineDashOffset = -s.t * 60; c.beginPath(); c.moveTo(W / 2, 400); c.lineTo(s.x, s.y); c.stroke(); c.setLineDash([]);
      c.strokeStyle = s.lock > 0 ? '#58e08a' : '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 22, 0, TAU); c.moveTo(s.x - 34, s.y); c.lineTo(s.x + 34, s.y); c.moveTo(s.x, s.y - 34); c.lineTo(s.x, s.y + 34); c.stroke();
      c.fillStyle = 'rgba(4,10,16,.9)'; rr(c, 20, 404, 860, 70, 12); c.fill();
      c.strokeStyle = 'rgba(88,224,138,.5)'; c.lineWidth = 1; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(40, 468 - s.thr * 56); c.lineTo(330, 468 - s.thr * 56); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#49e6ff'; c.lineWidth = 2; c.beginPath(); s.hist.forEach((v, i) => { const x = 40 + (i / 150) * 290, y = 468 - v * 56; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      c.fillStyle = '#1b2430'; rr(c, 350, 420, 510, 22, 8); c.fill(); c.fillStyle = s.sig > s.thr ? '#58e08a' : s.sig > 0.6 ? '#ffd257' : '#ff5252'; rr(c, 352, 422, Math.max(8, 506 * s.sig), 18, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '600 15px Inter,sans-serif'; c.textAlign = 'center'; c.fillText(s.t < 2.6 ? 'waiting for the first echo…' : 'Signal ' + Math.round(s.sig * 100) + '%  (echo from 2.6 s ago)' + (s.lock > 0 ? '  — HOLD STILL!' : ''), 605, 462);
    },
  },
  // 6. Apollo 13 air filter: remember the steps Mission Control reads out
  sequence: {
    title: 'Build the air filter', how: 'Mission Control reads out the steps. Watch the order, then click the parts in the SAME order.', time: 60, bg: 'stack',
    why: 'Apollo 13 really did this in 1970: the crew fitted a square air filter into a round hole using a hose, plastic bags, a cue card and duct tape — following steps radioed from Earth.', src: 'apollo13',
    init(s, rnd) { s.items = ['Canister', 'Bag', 'Cue card', 'Duct tape', 'Sock', 'Hose'].map((name, i) => ({ k: i, name, x: 75 + (i % 3) * 260, y: 60 + ((i / 3) | 0) * 190, fx: 0 })); s.rounds = [[3, 4], [3, 4, 5], [4, 5, 6]][s.tier]; s.r = 0; s.rnd = rnd; this.newRound(s); },
    newRound(s) { s.seq = Array.from({ length: s.rounds[s.r] }, () => (s.rnd() * 6) | 0); s.phase = 'show'; s.i = 0; s.pt = 0.6; s.in = 0; },
    down(s, x, y) { if (s.phase !== 'input') return; const k = s.items.findIndex((q) => x > q.x && x < q.x + 230 && y > q.y && y < q.y + 160); if (k < 0) return; if (k === s.seq[s.in]) { s.items[k].fx = 1; s.in++; s.sfx('ok'); if (s.in >= s.seq.length) { s.r++; if (s.r < s.rounds.length) this.newRound(s); else s.won = true; } } else { s.items[k].fx = -1; s.left -= 3; s.sfx('bad'); s.phase = 'show'; s.i = 0; s.pt = 0.8; s.in = 0; } },
    update(s, dt) {
      for (const it of s.items) it.fx *= Math.pow(0.03, dt);
      if (s.phase === 'show') { s.left += dt; s.pt -= dt; if (s.pt <= 0) { if (s.i >= s.seq.length) s.phase = 'input'; else { s.items[s.seq[s.i]].fx = 1; s.sfx('blip'); s.i++; s.pt = 0.75; } } }
      if (s.won) return { win: true, score: clamp(s.left / s.time + 0.3, 0, 1) }; if (s.left <= 0) return { win: false, score: s.r / s.rounds.length };
    },
    part(c, k, x, y) {   // small drawings of the six parts
      c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
      if (k === 0) { c.fillStyle = '#c9d1da'; rr(c, x - 38, y - 34, 76, 68, 8); c.fill(); c.strokeStyle = '#5c6670'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x - 28, y + i * 12); c.lineTo(x + 28, y + i * 12); c.stroke(); } }
      if (k === 1) { c.fillStyle = 'rgba(200,235,255,.5)'; c.beginPath(); c.moveTo(x - 34, y - 30); c.lineTo(x + 34, y - 30); c.lineTo(x + 40, y + 34); c.lineTo(x - 40, y + 34); c.closePath(); c.fill(); c.strokeStyle = '#cfe9ff'; c.stroke(); }
      if (k === 2) { c.fillStyle = '#f3ecd6'; rr(c, x - 40, y - 28, 80, 56, 5); c.fill(); c.strokeStyle = '#8a8370'; c.lineWidth = 3; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x - 28, y + i * 13); c.lineTo(x + 28, y + i * 13); c.stroke(); } }
      if (k === 3) { c.strokeStyle = '#9aa0a8'; c.lineWidth = 20; c.beginPath(); c.arc(x, y, 27, 0, TAU); c.stroke(); c.strokeStyle = '#d5dae0'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 37, 0, TAU); c.stroke(); }
      if (k === 4) { c.strokeStyle = '#f0f0ea'; c.lineWidth = 26; c.beginPath(); c.moveTo(x - 14, y - 32); c.lineTo(x - 14, y + 14); c.lineTo(x + 26, y + 22); c.stroke(); c.strokeStyle = '#ff7a1a'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 27, y - 30); c.lineTo(x - 1, y - 30); c.stroke(); }
      if (k === 5) { c.strokeStyle = '#7fa8c8'; c.lineWidth = 14; c.beginPath(); c.moveTo(x - 42, y + 20); c.bezierCurveTo(x - 20, y - 50, x + 20, y + 50, x + 42, y - 20); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.setLineDash([3, 7]); c.stroke(); c.setLineDash([]); }
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#0a111a'; c.fillRect(0, 0, W, H); }
      for (const it of s.items) { c.fillStyle = 'rgba(15,28,44,.93)'; rr(c, it.x, it.y, 230, 160, 16); c.fill(); if (it.fx > 0.04) { c.fillStyle = 'rgba(73,230,255,' + it.fx * 0.75 + ')'; c.fill(); } if (it.fx < -0.04) { c.fillStyle = 'rgba(255,82,82,' + -it.fx * 0.75 + ')'; c.fill(); } c.strokeStyle = 'rgba(120,205,255,.3)'; c.lineWidth = 2; rr(c, it.x, it.y, 230, 160, 16); c.stroke(); this.part(c, it.k, it.x + 115, it.y + 66); c.font = '600 19px Inter,sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(it.name, it.x + 115, it.y + 140); }
      for (let i = 0; i < s.seq.length; i++) { c.fillStyle = i < s.in ? '#58e08a' : s.phase === 'show' && i < s.i ? '#49e6ff' : '#27384a'; c.beginPath(); c.arc(W / 2 - (s.seq.length - 1) * 13 + i * 26, 452, 8, 0, TAU); c.fill(); }
      label(c, s.phase === 'show' ? 'Mission Control is reading step ' + Math.min(s.i + 1, s.seq.length) + ' of ' + s.seq.length + '… watch!' : 'Your turn: step ' + (s.in + 1) + ' of ' + s.seq.length + '  ·  round ' + (s.r + 1) + '/' + s.rounds.length);
    },
  },
  // 7. Fight a fire: aim at the base of each flame, and watch the extinguisher gauge
  fire: {
    title: 'Put out the fire', how: 'Hold the pointer on the BASE of each flame to spray it. Your extinguisher is small — do not waste it!', time: 28, bg: 'stir',
    why: 'Scientists lit real fires inside empty cargo ships to learn how flames behave in space: slower, rounder, and able to spread in surprising directions.', src: 'saffire',
    init(s, rnd) { s.fl = []; for (let i = 0; i < 3; i++) s.fl.push({ x: 140 + rnd() * 620, y: 150 + rnd() * 230, s: 0.35 + rnd() * 0.2 }); s.tank = 1; s.spawn = 3.2; s.rnd = rnd; s.grow = [0.06, 0.075, 0.09][s.tier]; s.sm = []; s.sp = []; },
    update(s, dt) {
      s.spawn -= dt; if (s.spawn <= 0 && s.t < 13 && s.fl.length < 6) { s.fl.push({ x: 120 + s.rnd() * 660, y: 140 + s.rnd() * 250, s: 0.25 }); s.spawn = 3.4; }
      const spray = s.ptr.down && s.tank > 0; if (spray) { s.tank -= dt / 11; if (s.sp.length < 70) s.sp.push({ x: s.ptr.x + (Math.random() - 0.5) * 90, y: s.ptr.y + (Math.random() - 0.5) * 60, l: 0.35 }); }
      for (const f of s.fl) { f.s += dt * s.grow; if (spray && Math.hypot(f.x - s.ptr.x, f.y + 20 - s.ptr.y) < 75) f.s -= dt * 1.0; if (s.sm.length < 60 && Math.random() < dt * 6) s.sm.push({ x: f.x + (Math.random() - 0.5) * 30, y: f.y - 20, r: 14, l: 1.6 }); }
      for (const q of s.sm) { q.y -= 46 * dt; q.r += 26 * dt; q.l -= dt; } s.sm = s.sm.filter((q) => q.l > 0); for (const q of s.sp) q.l -= dt; s.sp = s.sp.filter((q) => q.l > 0);
      s.fl = s.fl.filter((f) => f.s > 0.05);
      if (!s.fl.length && (s.t >= 13 || s.spawn > 1)) return { win: true, score: clamp(s.tank + 0.2, 0, 1) };
      if (s.fl.some((f) => f.s > 1.35) || (s.tank <= 0 && s.fl.length) || s.left <= 0) return { win: false, score: 0 };
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#10161f'; c.fillRect(0, 0, W, H); c.fillStyle = '#1b2531'; for (let i = 0; i < 6; i++) { rr(c, 40 + i * 140, 60, 120, 380, 8); c.fill(); } }
      for (const q of s.sm) { c.fillStyle = 'rgba(40,44,52,' + q.l * 0.28 + ')'; c.beginPath(); c.arc(q.x, q.y, q.r, 0, TAU); c.fill(); }
      for (const f of s.fl) { const r = 26 + f.s * 62, fl = 1 + Math.sin(s.t * 14 + f.x) * 0.07; const g = c.createRadialGradient(f.x, f.y, 2, f.x, f.y, r * fl); g.addColorStop(0, 'rgba(255,255,220,.95)'); g.addColorStop(0.35, 'rgba(255,170,40,.9)'); g.addColorStop(0.75, 'rgba(255,70,20,.55)'); g.addColorStop(1, 'rgba(80,120,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r * fl, 0, TAU); c.fill(); if (f.s > 1.05) { c.strokeStyle = '#ff5252'; c.lineWidth = 4; c.beginPath(); c.arc(f.x, f.y, r + 12 + Math.sin(s.t * 12) * 4, 0, TAU); c.stroke(); } }
      if (s.ptr.down && s.tank > 0) { c.fillStyle = 'rgba(230,245,255,.28)'; c.beginPath(); c.moveTo(W / 2, H); c.lineTo(s.ptr.x - 60, s.ptr.y); c.lineTo(s.ptr.x + 60, s.ptr.y); c.fill(); } c.fillStyle = 'rgba(240,250,255,.8)'; for (const q of s.sp) { c.beginPath(); c.arc(q.x, q.y, 5 + (0.35 - q.l) * 30, 0, TAU); c.fill(); }
      c.fillStyle = '#d43a2a'; rr(c, W / 2 - 22, H - 46, 44, 60, 10); c.fill(); c.fillStyle = '#1b2430'; rr(c, W / 2 - 8, H - 62, 16, 20, 4); c.fill();
      c.fillStyle = 'rgba(4,10,16,.88)'; rr(c, 20, 446, 300, 22, 8); c.fill(); c.fillStyle = s.tank > 0.3 ? '#58e08a' : '#ff5252'; rr(c, 22, 448, Math.max(8, 296 * clamp(s.tank, 0, 1)), 18, 7); c.fill();
      label(c, 'Extinguisher ' + Math.round(clamp(s.tank, 0, 1) * 100) + '%   ·   flames: ' + s.fl.length);
    },
  },
  // 8. Harvest: pick each plant in its ripe window
  harvest: {
    title: 'Harvest time', how: 'Pick each plant while it GLOWS (ripe). Too early wastes it; too late and it wilts.', time: 17, bg: 'plant',
    why: 'Red romaine lettuce took 33 days to grow on the Space Station in 2015. It was the first space-grown crop astronauts ate there. Radishes took 27 days.', src: 'veggie',
    init(s, rnd) { s.p = []; for (let i = 0; i < 10; i++) s.p.push({ x: 110 + (i % 5) * 170, y: 150 + ((i / 5) | 0) * 190, g: rnd() * 0.6, sp: 0.35 + rnd() * 0.35, fx: 0 }); s.picks = 0; s.rnd = rnd; s.win = [0.7, 0.55, 0.42][s.tier]; },
    down(s, x, y) { const p = s.p.find((q) => Math.hypot(q.x - x, q.y - y) < 70); if (!p) return; if (p.g >= 1 && p.g < 1 + s.win) { s.picks++; p.fx = 1; s.sfx('ok'); } else { p.fx = -1; s.sfx('bad'); } p.g = 0; p.sp = 0.35 + s.rnd() * 0.4; },
    update(s, dt) { if (s.picks >= 8) return { win: true, score: 1 }; for (const p of s.p) { p.g += dt * p.sp; p.fx *= Math.pow(0.03, dt); if (p.g > 1 + s.win + 0.45) { p.g = 0; p.sp = 0.35 + s.rnd() * 0.4; } } if (s.left <= 0) return { win: true, score: clamp(s.picks / 8, 0, 1) }; },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#170a1c'; c.fillRect(0, 0, W, H); } c.fillStyle = 'rgba(255,79,216,.12)'; c.fillRect(0, 0, W, H);
      for (let r = 0; r < 2; r++) { c.fillStyle = '#e8e8e3'; rr(c, 30, 188 + r * 190, 840, 30, 10); c.fill(); c.fillStyle = '#2f8fd8'; c.fillRect(40 + ((s.t * 50) % 36), 198 + r * 190, 790, 7); }
      for (const p of s.p) {
        const ripe = p.g >= 1 && p.g < 1 + s.win, old = p.g >= 1 + s.win, sz = 18 + clamp(p.g, 0, 1) * 42;
        if (ripe) { c.fillStyle = 'rgba(255,255,160,.35)'; c.beginPath(); c.arc(p.x, p.y, sz + 22 + Math.sin(s.t * 12) * 4, 0, TAU); c.fill(); c.strokeStyle = '#ffd21f'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, sz + 26, -TAU / 4, -TAU / 4 + (1 - (p.g - 1) / s.win) * TAU); c.stroke(); }
        c.fillStyle = old ? '#7a6a3a' : ripe ? '#57d968' : '#2f8a3e'; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.sin(s.t * 2 + p.x) * 0.08; c.beginPath(); c.ellipse(p.x + Math.cos(a) * sz * 0.45, p.y + 12 + Math.sin(a) * sz * 0.3, sz * 0.5, sz * 0.26, a, 0, TAU); c.fill(); }
        if (p.fx > 0.05) { c.fillStyle = 'rgba(120,255,170,' + p.fx + ')'; c.font = '700 26px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('+1', p.x, p.y - 50 - (1 - p.fx) * 20); } if (p.fx < -0.05) { c.fillStyle = 'rgba(255,90,90,' + -p.fx + ')'; c.font = '700 22px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('wasted', p.x, p.y - 50); }
      }
      c.fillStyle = 'rgba(4,10,16,.88)'; rr(c, 330, 452, 240, 22, 8); c.fill(); c.fillStyle = '#57d968'; rr(c, 332, 454, Math.max(8, 236 * clamp(s.picks / 8, 0, 1)), 18, 7); c.fill();
      label(c, 'Picked: ' + s.picks + '  (8 fills the basket)');
    },
  },
  // 9. Turn the bolts (taking a panel off, putting one on, servicing machines)
  bolts: {
    title: 'Turn the bolts', how: 'Hold the wrench on each bolt until it has turned all the way, then let go. Do all six.', time: 18,
    why: 'Space tools are built for thick gloves: big handles, and bolts that stay attached so they cannot float or roll away. Each bolt is tightened to a set force, called torque. Too loose and it shakes free; too tight and the thread strips.', src: 'tools',
    init(s) { s.b = []; for (let i = 0; i < 6; i++) s.b.push({ x: 150 + (i % 3) * 300, y: 135 + ((i / 3) | 0) * 215, p: 0, over: 0, done: false, fx: 0 }); s.lim = [9, 0.55, 0.36][s.tier]; },
    update(s, dt) {
      const b = s.ptr.down ? s.b.find((q) => !q.done && Math.hypot(q.x - s.ptr.x, q.y - s.ptr.y) < 62) : null;
      for (const q of s.b) { q.fx *= Math.pow(0.02, dt); if (q !== b && q.p >= 1 && !q.done) { q.done = true; s.sfx('ok'); } }
      if (b) { if (b.p < 1) b.p = Math.min(1, b.p + dt * (s.easy ? 1.7 : 1.25)); else if (s.tier === 0) { b.done = true; s.sfx('ok'); } else { b.over += dt; if (b.over > s.lim) { b.p = 0.4; b.over = 0; b.fx = 1; s.left -= 1.5; s.sfx('bad'); } } }
      s.hold = b; const n = s.b.filter((q) => q.done).length; s.n = n; if (n === 6) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: n / 6 };
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#0c1420'; c.fillRect(0, 0, W, H); }
      c.fillStyle = 'rgba(15,42,98,.9)'; rr(c, 60, 50, 780, 380, 16); c.fill(); c.strokeStyle = '#9aa7b4'; c.lineWidth = 14; rr(c, 60, 50, 780, 380, 16); c.stroke();
      c.strokeStyle = 'rgba(190,215,255,.25)'; c.lineWidth = 1; for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(60 + i * 97.5, 50); c.lineTo(60 + i * 97.5, 430); c.stroke(); }
      for (const b of s.b) {
        const ready = b.p >= 1 && !b.done;
        c.save(); c.translate(b.x, b.y); c.fillStyle = '#1b2430'; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill();
        c.rotate(b.p * TAU * 2.5); c.fillStyle = b.done ? '#58e08a' : ready ? '#ffd21f' : '#c9d1da'; c.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; c.lineTo(Math.cos(a) * 36, Math.sin(a) * 36); } c.closePath(); c.fill();
        c.fillStyle = '#1b2430'; c.fillRect(-26, -5, 52, 10); c.restore();
        c.strokeStyle = b.done ? '#58e08a' : '#ffd21f'; c.lineWidth = 6; c.beginPath(); c.arc(b.x, b.y, 58, -TAU / 4, -TAU / 4 + b.p * TAU); c.stroke();
        if (ready && s.tier > 0) { c.strokeStyle = 'rgba(255,82,82,.9)'; c.lineWidth = 6; c.beginPath(); c.arc(b.x, b.y, 66, -TAU / 4, -TAU / 4 + (b.over / s.lim) * TAU); c.stroke(); c.fillStyle = '#ffd21f'; c.font = '700 17px "Chakra Petch",sans-serif'; c.textAlign = 'center'; c.fillText('LET GO!', b.x, b.y - 74); }
        if (b.fx > 0.05) { c.fillStyle = 'rgba(255,80,80,' + b.fx * 0.6 + ')'; c.beginPath(); c.arc(b.x, b.y, 62, 0, TAU); c.fill(); }
      }
      if (s.hold) { c.save(); c.translate(s.hold.x, s.hold.y); c.rotate(s.hold.p * TAU * 2.5 + 0.5); c.fillStyle = '#e8edf2'; rr(c, 20, -11, 150, 22, 9); c.fill(); c.fillStyle = '#ff7a1a'; rr(c, 110, -13, 62, 26, 9); c.fill(); c.restore(); }
      label(c, 'Bolts done: ' + (s.n || 0) + ' of 6' + (s.tier > 0 ? '   ·   let go when a bolt turns yellow' : ''));
    },
  },
  // 10. Weld the seam (patching a hole, rebuilding a room, repairing a machine)
  weld: {
    title: 'Weld the seam', how: 'Hold and drag the torch all the way round the patch. Every part of the seam must glow.', time: 22,
    why: 'A hole in a habitat lets the air rush out into the vacuum. The patch has to be sealed all the way round: one gap is still a leak.', src: 'patch',
    init(s) { s.pts = []; const n = 64; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = 1 / Math.max(Math.abs(Math.cos(a)) / 300, Math.abs(Math.sin(a)) / 160); s.pts.push({ x: W / 2 + Math.cos(a) * Math.min(k, 330), y: H / 2 + Math.sin(a) * Math.min(k, 185), w: 0 }); } s.done = 0; s.sp = []; s.rad = [46, 38, 31][s.tier]; },
    update(s, dt) {
      if (s.ptr.down) { for (const p of s.pts) if (p.w < 1 && Math.hypot(p.x - s.ptr.x, p.y - s.ptr.y) < s.rad) p.w = Math.min(1, p.w + dt * 5); if (s.sp.length < 40) s.sp.push({ x: s.ptr.x, y: s.ptr.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 260, l: 0.4 }); }
      for (const q of s.sp) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; q.l -= dt; } s.sp = s.sp.filter((q) => q.l > 0);
      s.done = s.pts.filter((p) => p.w >= 1).length / s.pts.length; if (s.done >= 0.97) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: s.done > 0.8, score: s.done };
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#2a323c'; c.fillRect(0, 0, W, H); }
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(W / 2, H / 2, 150, 90, 0.3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(196,203,212,.9)'; rr(c, W / 2 - 300, H / 2 - 160, 600, 320, 26); c.fill();
      const leak = 1 - s.done; if (leak > 0.03) { c.strokeStyle = 'rgba(220,244,255,' + leak * 0.5 + ')'; c.lineWidth = 3; for (const p of s.pts) if (p.w < 1 && ((p.x * 7 + s.t * 60) | 0) % 9 === 0) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + (p.x - W / 2) * 0.12, p.y + (p.y - H / 2) * 0.12); c.stroke(); } }
      for (const p of s.pts) { c.fillStyle = p.w >= 1 ? '#ffb347' : 'rgba(40,48,58,' + (1 - p.w * 0.5) + ')'; c.beginPath(); c.arc(p.x, p.y, p.w >= 1 ? 11 : 8, 0, TAU); c.fill(); if (p.w >= 1) { c.fillStyle = 'rgba(255,240,180,.8)'; c.beginPath(); c.arc(p.x, p.y, 4, 0, TAU); c.fill(); } }
      c.fillStyle = '#ffe9a8'; for (const q of s.sp) c.fillRect(q.x, q.y, 4, 4);
      c.strokeStyle = '#c9d1da'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(s.ptr.x + 16, s.ptr.y - 16); c.lineTo(s.ptr.x + 110, s.ptr.y - 110); c.stroke();
      c.fillStyle = s.ptr.down ? 'rgba(160,230,255,.95)' : 'rgba(120,140,160,.8)'; c.beginPath(); c.arc(s.ptr.x, s.ptr.y, s.ptr.down ? 13 : 8, 0, TAU); c.fill();
      label(c, 'Sealed: ' + Math.round(s.done * 100) + '%   ·   air still escaping: ' + Math.round(leak * 100) + '%');
    },
  },
  // 11. Stir (cooking, mixing the waste digester)
  stir: {
    title: 'Stir the pot', how: 'Hold and drag in circles inside the pot. Keep going until the bar is full.', time: 18,
    why: 'Without stirring, food on the bottom burns while the top stays cold. In low gravity hot liquid rises more slowly, so stirring matters even more.', src: 'food',
    init(s) { s.turns = 0; s.a = null; s.spin = 0; s.need = s.easy ? 4 : 5; s.speed = 0; s.splash = 0; },
    update(s, dt) {
      const dx = s.ptr.x - W / 2 + 90, dy = s.ptr.y - H / 2, r = Math.hypot(dx, dy); let d = 0;
      if (s.ptr.down && r > 40 && r < 215) { const a = Math.atan2(dy, dx); if (s.a !== null) { d = a - s.a; d = Math.atan2(Math.sin(d), Math.cos(d)); s.spin += d; } s.a = a; } else s.a = null;
      s.speed += (Math.abs(d) / TAU / Math.max(dt, 0.001) - s.speed) * Math.min(1, dt * 6); s.splash *= Math.pow(0.02, dt);
      const ok = s.tier === 0 || (s.speed > 0.45 && s.speed < 1.6); if (ok) s.turns += Math.abs(d) / TAU; else if (s.speed >= 1.6 && s.splash < 0.2) { s.splash = 1; s.left -= 1; s.sfx('bad'); }
      if (s.turns >= s.need) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: s.turns > s.need * 0.7, score: s.turns / s.need };
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#1a2230'; c.fillRect(0, 0, W, H); }
      const cx = W / 2 - 90, cy = H / 2; c.fillStyle = '#8f98a3'; c.beginPath(); c.arc(cx, cy, 228, 0, TAU); c.fill(); c.fillStyle = s.col || '#c9772e'; c.beginPath(); c.arc(cx, cy, 205, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,235,190,.5)'; c.lineWidth = 9; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(cx, cy, 70 + k * 50, s.spin + k * 2.1, s.spin + k * 2.1 + 1.6); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 7; k++) { const a = s.spin * 0.6 + k * 0.9; c.beginPath(); c.arc(cx + Math.cos(a) * (60 + k * 19), cy + Math.sin(a) * (60 + k * 19), 9, 0, TAU); c.fill(); }
      if (s.splash > 0.05) { c.fillStyle = 'rgba(255,200,120,' + s.splash + ')'; for (let k = 0; k < 10; k++) { const a = k * 0.63; c.beginPath(); c.arc(cx + Math.cos(a) * (215 + (1 - s.splash) * 60), cy + Math.sin(a) * (215 + (1 - s.splash) * 60), 8, 0, TAU); c.fill(); } }
      if (s.ptr.down) { c.strokeStyle = '#d9b45a'; c.lineWidth = 14; c.beginPath(); c.moveTo(s.ptr.x, s.ptr.y); c.lineTo(s.ptr.x + 90, s.ptr.y - 150); c.stroke(); }
      const gx = 760; c.fillStyle = 'rgba(8,14,22,.85)'; rr(c, gx - 46, 56, 150, 380, 14); c.fill(); c.fillStyle = '#9bb0c3'; c.font = '600 14px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('STIR SPEED', gx + 29, 82);
      c.fillStyle = '#1b2430'; rr(c, gx, 100, 58, 300, 10); c.fill(); if (s.tier > 0) { c.fillStyle = 'rgba(88,224,138,.55)'; c.fillRect(gx, 400 - (1.6 / 2.2) * 300, 58, ((1.6 - 0.45) / 2.2) * 300); }
      const sy = 400 - clamp(s.speed / 2.2, 0, 1) * 300; c.fillStyle = s.speed >= 1.6 && s.tier > 0 ? '#ff5252' : '#ffd21f'; c.fillRect(gx - 8, sy - 4, 74, 8);
      c.fillStyle = '#9bb0c3'; c.font = '600 13px Inter,sans-serif'; c.fillText(s.tier > 0 ? (s.speed >= 1.6 ? 'Too fast!' : s.speed <= 0.45 ? 'Faster' : 'Just right') : 'Any speed', gx + 29, 424);
      c.fillStyle = '#0e1826'; rr(c, 40, 444, 620, 20, 10); c.fill(); c.fillStyle = '#ffd21f'; rr(c, 40, 444, Math.max(20, 620 * clamp(s.turns / s.need, 0, 1)), 20, 10); c.fill();
      label(c, 'Stirred: ' + Math.round(clamp(s.turns / s.need, 0, 1) * 100) + '%');
    },
  },
  // 12. Stack the crates (unloading the rover or hopper)
  stack: {
    title: 'Stack the crates', how: 'Drag each crate onto the shelf space of the SAME colour.', time: 18,
    why: 'On a Moon base every crate has its own place. In an emergency nobody has time to search for the spare air filter.', src: 'cargo',
    init(s, rnd) { const cols = ['#ff7a1a', '#58e08a', '#49e6ff', '#ffd257', '#e9f2f9']; const order = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5); s.L = cols.map((col, i) => ({ col, x: 120 + (i % 2) * 150, y: 90 + i * 78, hx: 120 + (i % 2) * 150, hy: 90 + i * 78, to: null })); s.R = order.map((ci, i) => ({ col: cols[ci], x: 560 + (i % 2) * 190, y: 95 + ((i / 2) | 0) * 140, used: false })); s.drag = null; s.bad = 0; },
    down(s, x, y) { const p = s.L.find((q) => !q.to && Math.abs(q.x - x) < 55 && Math.abs(q.y - y) < 45); if (p) s.drag = p; },
    up(s, x, y) { const p = s.drag; if (!p) return; s.drag = null; const r = s.R.find((q) => !q.used && Math.abs(q.x - x) < 75 && Math.abs(q.y - y) < 60); if (r && r.col === p.col) { p.to = r; r.used = true; p.x = r.x; p.y = r.y; s.sfx('ok'); } else { if (r) { s.left -= 2; s.bad = 1; s.sfx('bad'); } p.x = p.hx; p.y = p.hy; } },
    update(s, dt) { s.bad *= Math.pow(0.01, dt); if (s.drag) { s.drag.x = s.ptr.x; s.drag.y = s.ptr.y; } const n = s.L.filter((q) => q.to).length; s.n = n; if (n === 5) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: n / 5 }; },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#0a111a'; c.fillRect(0, 0, W, H); }
      c.fillStyle = 'rgba(12,23,36,.85)'; rr(c, 30, 20, 330, 440, 14); c.fill(); c.fillStyle = 'rgba(18,29,43,.85)'; rr(c, 450, 20, 420, 440, 14); c.fill(); c.fillStyle = '#9aa7b4'; for (let k = 0; k < 3; k++) c.fillRect(450, 160 + k * 140, 420, 8);
      for (const r of s.R) { c.setLineDash([10, 8]); c.strokeStyle = r.col; c.lineWidth = 4; rr(c, r.x - 62, r.y - 48, 124, 96, 10); c.stroke(); c.setLineDash([]); }
      for (const p of [...s.L].sort((a, b) => (a === s.drag) - (b === s.drag))) { if (p === s.drag) { c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, p.x - 49, p.y - 30, 110, 84, 10); c.fill(); } c.fillStyle = p.col; rr(c, p.x - 55, p.y - 42, 110, 84, 10); c.fill(); c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(p.x - 55, p.y - 6, 110, 12); c.fillRect(p.x - 6, p.y - 42, 12, 84); }
      if (s.bad > 0.05) { c.fillStyle = 'rgba(255,80,80,' + s.bad * 0.35 + ')'; c.fillRect(0, 0, W, H); }
      label(c, 'Stacked: ' + (s.n || 0) + ' of 5');
    },
  },
  // 13. Plant the rack (replanting or clearing a hydroponic rack)
  plant: {
    title: 'Set the seeds', how: 'Click every empty cup once to set a seed. Clicking a cup twice wastes a second.', time: 13,
    why: 'Hydroponic plants grow in cups with their roots in flowing water instead of soil. Each seed sits in a little sponge so it does not wash away.', src: 'veggie',
    init(s) { s.c = []; for (let i = 0; i < 10; i++) s.c.push({ x: 110 + (i % 5) * 170, y: 170 + ((i / 5) | 0) * 180, on: false, g: 0, fx: 0 }); },
    down(s, x, y) { const k = s.c.find((q) => Math.hypot(q.x - x, q.y + 40 - y) < 62); if (!k) return; if (!k.on) { k.on = true; s.sfx('ok'); } else { s.left -= 1; k.fx = 1; s.sfx('bad'); } },
    update(s, dt) { for (const k of s.c) { if (k.on) k.g = Math.min(1, k.g + dt * 2.5); k.fx *= Math.pow(0.02, dt); } const n = s.c.filter((k) => k.on).length; s.n = n; if (n === 10 && s.c.every((k) => k.g >= 1)) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: n >= 8, score: n / 10 }; },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#170a1c'; c.fillRect(0, 0, W, H); } c.fillStyle = 'rgba(255,79,216,.1)'; c.fillRect(0, 0, W, H);
      for (let r = 0; r < 2; r++) { c.fillStyle = '#e8e8e3'; rr(c, 30, 200 + r * 180, 840, 38, 12); c.fill(); c.fillStyle = '#2f8fd8'; c.fillRect(40 + ((s.t * 60) % 40), 214 + r * 180, 780, 8); }
      for (const k of s.c) {
        c.fillStyle = '#1b2430'; c.beginPath(); c.arc(k.x, k.y + 40, 40, 0, TAU); c.fill(); c.fillStyle = k.on ? '#6b4a2c' : '#0a0f16'; c.beginPath(); c.arc(k.x, k.y + 40, 28, 0, TAU); c.fill();
        if (!k.on) { c.strokeStyle = '#ffd21f'; c.lineWidth = 4; c.beginPath(); c.arc(k.x, k.y + 40, 46 + Math.sin(s.t * 6) * 3, 0, TAU); c.stroke(); }
        if (k.g > 0) { c.strokeStyle = '#57d968'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(k.x, k.y + 40); c.lineTo(k.x, k.y + 40 - 50 * k.g); c.stroke(); c.fillStyle = '#57d968'; c.beginPath(); c.ellipse(k.x - 14 * k.g, k.y - 8 * k.g, 16 * k.g, 8 * k.g, -0.5, 0, TAU); c.ellipse(k.x + 14 * k.g, k.y - 8 * k.g, 16 * k.g, 8 * k.g, 0.5, 0, TAU); c.fill(); }
        if (k.fx > 0.05) { c.fillStyle = 'rgba(255,80,80,' + k.fx * 0.5 + ')'; c.beginPath(); c.arc(k.x, k.y + 40, 44, 0, TAU); c.fill(); }
      }
      label(c, (s.o.noun || 'Seeds set') + ': ' + (s.n || 0) + ' of 10');
    },
  },
  // 14. Spacesuit seals (suiting up and taking the suit off)
  suit: {
    title: 'Check the suit seals', how: 'Click the five seals in order: helmet ring, left glove, right glove, air hose, boots.', time: 13,
    why: 'A spacesuit is a one-person spacecraft. Astronauts check every seal in the same order every time, so that none is ever forgotten.', src: 'suit',
    init(s) { s.p = [{ x: 450, y: 92, n: 'Helmet ring' }, { x: 300, y: 250, n: 'Left glove' }, { x: 600, y: 250, n: 'Right glove' }, { x: 450, y: 215, n: 'Air hose' }, { x: 450, y: 425, n: 'Boots' }].map((q, i) => ({ ...q, i, ok: false, fx: 0 })); s.next = 0; },
    down(s, x, y) { const k = s.p.find((q) => Math.hypot(q.x - x, q.y - y) < 46); if (!k || k.ok) return; if (k.i === s.next) { k.ok = true; s.next++; s.sfx('ok'); } else { k.fx = 1; s.left -= 1; s.sfx('bad'); } },
    update(s, dt) { for (const k of s.p) k.fx *= Math.pow(0.02, dt); if (s.next >= 5) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: s.next / 5 }; },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#101a26'; c.fillRect(0, 0, W, H); }
      c.fillStyle = '#e8e8e3'; c.beginPath(); c.arc(450, 92, 62, 0, TAU); c.fill(); rr(c, 370, 150, 160, 190, 30); c.fill(); rr(c, 290, 160, 76, 120, 26); c.fill(); rr(c, 534, 160, 76, 120, 26); c.fill(); rr(c, 380, 330, 64, 120, 20); c.fill(); rr(c, 456, 330, 64, 120, 20); c.fill();
      c.fillStyle = '#d9a531'; c.beginPath(); c.ellipse(450, 92, 44, 34, 0, 0, TAU); c.fill(); c.fillStyle = '#ff7a1a'; c.fillRect(290, 196, 76, 12); c.fillRect(534, 196, 76, 12); c.fillRect(380, 372, 64, 12); c.fillRect(456, 372, 64, 12);
      const showN = s.tier < 2 || s.t < 2.5;   // Commander: the numbers fade, so you have to know the order
      for (const k of s.p) {
        const cur = k.i === s.next && s.tier === 0; c.fillStyle = k.ok ? '#58e08a' : cur ? '#ffd21f' : '#27384a'; c.beginPath(); c.arc(k.x, k.y, 30 + (cur ? Math.sin(s.t * 7) * 3 : 0), 0, TAU); c.fill();
        if (!k.ok && !cur) { c.strokeStyle = '#ffd21f'; c.lineWidth = 3; c.beginPath(); c.arc(k.x, k.y, 30, 0, TAU); c.stroke(); }
        if (k.fx > 0.05) { c.fillStyle = 'rgba(255,80,80,' + k.fx + ')'; c.beginPath(); c.arc(k.x, k.y, 34, 0, TAU); c.fill(); }
        c.fillStyle = k.ok || cur ? '#06101a' : '#cfe3f3'; c.font = '700 26px "Chakra Petch",sans-serif'; c.textAlign = 'center'; c.fillText(k.ok ? '✓' : showN ? String(k.i + 1) : '?', k.x, k.y + 9);
        c.fillStyle = '#cfe3f3'; c.font = '600 15px Inter,sans-serif'; const side = k.x < 400 ? -1 : 1, lx = k.x === 450 ? 690 : k.x + side * 42; c.textAlign = k.x === 450 ? 'left' : side < 0 ? 'right' : 'left'; c.fillText(k.n, lx, k.y + (k.i === 3 ? -22 : 5));
      }
      label(c, 'Seals checked: ' + s.next + ' of 5');
    },
  },
  // 15. Make it safe: open the breakers before touching anything electrical
  safe: {
    title: 'Make it safe', how: 'Drag each breaker lever all the way DOWN to OFF. Work from left to right.', time: 13,
    why: 'Before touching any wiring, engineers switch the power off and lock it off, so nobody can turn it back on by mistake. Solar panels are tricky: in sunlight they are always making electricity.', src: 'lockout',
    init(s) { s.b = ['LOAD', 'STRING', 'MAIN'].map((n, i) => ({ n, x: 200 + i * 190, y0: 130, y1: 350, v: 0, off: false })); s.drag = null; s.spark = 0; s.volts = 120; },
    down(s, x, y) { const b = s.b.find((q) => !q.off && Math.abs(q.x - x) < 60 && Math.abs(q.y0 + q.v * (q.y1 - q.y0) - y) < 60); if (!b) return; const next = s.b.find((q) => !q.off); if (s.tier > 0 && b !== next) { s.spark = 1; s.left -= 2; s.sfx('bad'); return; } s.drag = b; },
    up(s) { const b = s.drag; if (!b) return; s.drag = null; if (b.v > 0.88) { b.v = 1; b.off = true; s.sfx('ok'); } else b.v = 0; },
    update(s, dt) { s.spark *= Math.pow(0.01, dt); if (s.drag) s.drag.v = clamp((s.ptr.y - s.drag.y0) / (s.drag.y1 - s.drag.y0), 0, 1); const on = s.b.filter((q) => !q.off).length; s.volts += (on * 40 - s.volts) * Math.min(1, dt * 5); if (!on && s.volts < 2) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: 1 - on / 3 }; },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#121a24'; c.fillRect(0, 0, W, H); }
      c.fillStyle = 'rgba(40,48,58,.92)'; rr(c, 90, 50, 600, 390, 18); c.fill(); c.strokeStyle = '#9aa7b4'; c.lineWidth = 5; rr(c, 90, 50, 600, 390, 18); c.stroke();
      for (const b of s.b) {
        c.fillStyle = '#0a0f16'; rr(c, b.x - 26, b.y0 - 30, 52, b.y1 - b.y0 + 60, 26); c.fill(); const hy = b.y0 + b.v * (b.y1 - b.y0);
        c.fillStyle = b.off ? '#2a323c' : '#58e08a'; c.beginPath(); c.arc(b.x, 88, 11, 0, TAU); c.fill(); if (!b.off) { c.fillStyle = 'rgba(88,224,138,.35)'; c.beginPath(); c.arc(b.x, 88, 19, 0, TAU); c.fill(); }
        c.fillStyle = b.off ? '#6b7682' : '#ff7a1a'; rr(c, b.x - 44, hy - 24, 88, 48, 12); c.fill(); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(b.x - 30, hy - 4, 60, 8);
        c.fillStyle = '#cfe3f3'; c.font = '700 16px "Chakra Petch",sans-serif'; c.textAlign = 'center'; c.fillText(b.n, b.x, 420); c.font = '600 12px Inter,sans-serif'; c.fillStyle = '#9bb0c3'; c.fillText('ON', b.x + 62, b.y0 + 4); c.fillText('OFF', b.x + 64, b.y1 + 4);
        if (!b.off && b === s.b.find((q) => !q.off) && !s.drag && s.tier < 2) { c.fillStyle = '#ffd21f'; c.font = '700 26px Inter,sans-serif'; c.fillText('▼', b.x, hy + 62 + Math.sin(s.t * 6) * 5); }
      }
      c.fillStyle = 'rgba(8,14,22,.9)'; rr(c, 716, 110, 150, 250, 14); c.fill(); c.fillStyle = '#9bb0c3'; c.font = '600 14px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('LINE VOLTAGE', 791, 140);
      c.fillStyle = s.volts > 2 ? '#ff5252' : '#58e08a'; c.font = '700 46px "Chakra Petch",sans-serif'; c.fillText(Math.round(s.volts) + ' V', 791, 220); c.font = '700 17px "Chakra Petch",sans-serif'; c.fillText(s.volts > 2 ? 'LIVE' : 'SAFE TO TOUCH', 791, 262);
      c.fillStyle = '#1b2430'; rr(c, 746, 290, 90, 14, 7); c.fill(); c.fillStyle = s.volts > 2 ? '#ff5252' : '#58e08a'; rr(c, 746, 290, Math.max(14, 90 * clamp(s.volts / 120, 0, 1)), 14, 7); c.fill();
      if (s.spark > 0.05) { c.fillStyle = 'rgba(255,240,150,' + s.spark * 0.8 + ')'; c.fillRect(0, 0, W, H); }
      label(c, s.tier > 0 ? 'Open the breakers in order: LOAD, then STRING, then MAIN' : 'Pull every lever down to OFF');
    },
  },
  // 16. Verify: turn the valve until the needle sits in the green band, and hold it there
  gauge: {
    title: 'Check the pressure', how: 'Drag the valve wheel round to move the needle. Hold the needle inside the GREEN band until the ring closes.', time: 20,
    why: 'A repair is not finished until it is tested. Crews watch a gauge for a while after every fix: if the needle drifts, there is still a leak or a bad connection.', src: 'leakcheck',
    init(s, rnd) { s.valve = 0.08; s.n = 0.05; s.a = null; s.hold = 0; s.c = 0.45 + rnd() * 0.3; s.w = [0.2, 0.14, 0.1][s.tier]; s.H = [1.5, 2.1, 2.8][s.tier]; s.max = s.o.max || 101; s.unit = s.o.unit || 'kPa'; },
    update(s, dt) {
      const dx = s.ptr.x - 230, dy = s.ptr.y - 255, r = Math.hypot(dx, dy);
      if (s.ptr.down && r > 30 && r < 190) { const a = Math.atan2(dy, dx); if (s.a !== null) { let d = a - s.a; d = Math.atan2(Math.sin(d), Math.cos(d)); s.valve = clamp(s.valve + d / (TAU * 1.1), 0, 1); } s.a = a; } else s.a = null;
      s.n += (s.valve + Math.sin(s.t * 3.1) * 0.012 * (s.tier + 1) - s.n) * Math.min(1, dt * 2.4);
      const inBand = Math.abs(s.n - s.c) < s.w / 2; s.inBand = inBand; s.hold = inBand ? s.hold + dt : Math.max(0, s.hold - dt * 2);
      if (s.hold >= s.H) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: clamp(s.hold / s.H, 0, 0.6) };
    },
    draw(s, c) {
      if (!s.hasBg) { c.fillStyle = '#121a24'; c.fillRect(0, 0, W, H); }
      c.strokeStyle = '#7c8894'; c.lineWidth = 34; c.lineCap = 'butt'; c.beginPath(); c.moveTo(0, 255); c.lineTo(W, 255); c.stroke(); c.strokeStyle = 'rgba(73,230,255,' + (0.15 + s.n * 0.6) + ')'; c.lineWidth = 12; c.setLineDash([26, 22]); c.lineDashOffset = -s.t * 120 * s.n; c.beginPath(); c.moveTo(0, 255); c.lineTo(W, 255); c.stroke(); c.setLineDash([]);
      c.save(); c.translate(230, 255); c.rotate(s.valve * TAU * 1.1); c.strokeStyle = '#ff7a1a'; c.lineWidth = 26; c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.stroke(); c.lineWidth = 18; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(k * TAU / 4) * 150, Math.sin(k * TAU / 4) * 150); c.stroke(); } c.fillStyle = '#c9d1da'; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(150, 0, 12, 0, TAU); c.fill(); c.restore();
      const gx = 640, gy = 255, R = 165, a0 = Math.PI * 0.75, span = Math.PI * 1.5, ang = (v) => a0 + clamp(v, 0, 1) * span;
      c.fillStyle = 'rgba(8,14,22,.94)'; c.beginPath(); c.arc(gx, gy, R + 22, 0, TAU); c.fill(); c.strokeStyle = '#9aa7b4'; c.lineWidth = 6; c.beginPath(); c.arc(gx, gy, R + 22, 0, TAU); c.stroke();
      c.strokeStyle = '#27384a'; c.lineWidth = 22; c.beginPath(); c.arc(gx, gy, R - 14, a0, a0 + span); c.stroke(); c.strokeStyle = '#58e08a'; c.beginPath(); c.arc(gx, gy, R - 14, ang(s.c - s.w / 2), ang(s.c + s.w / 2)); c.stroke();
      c.strokeStyle = '#cfe3f3'; c.lineWidth = 2; for (let k = 0; k <= 10; k++) { const a = ang(k / 10); c.beginPath(); c.moveTo(gx + Math.cos(a) * (R - 30), gy + Math.sin(a) * (R - 30)); c.lineTo(gx + Math.cos(a) * (R - 46), gy + Math.sin(a) * (R - 46)); c.stroke(); }
      const na = ang(s.n); c.strokeStyle = s.inBand ? '#58e08a' : '#ff5252'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(na) * (R - 24), gy + Math.sin(na) * (R - 24)); c.stroke(); c.fillStyle = '#c9d1da'; c.beginPath(); c.arc(gx, gy, 14, 0, TAU); c.fill();
      c.fillStyle = s.inBand ? '#58e08a' : '#cfe3f3'; c.font = '700 34px "Chakra Petch",sans-serif'; c.textAlign = 'center'; c.fillText(Math.round(s.n * s.max) + ' ' + s.unit, gx, gy + 86);
      if (s.hold > 0) { c.strokeStyle = '#ffd21f'; c.lineWidth = 8; c.beginPath(); c.arc(gx, gy, R + 34, -TAU / 4, -TAU / 4 + (s.hold / s.H) * TAU); c.stroke(); }
      label(c, s.inBand ? 'Hold it there…' : s.n < s.c ? 'Open the valve: turn the wheel clockwise' : 'Too high: turn the wheel back');
    },
  },
};
// What the player did and why it mattered, shown on the result card after each game.
const DEBRIEF = {
  wipe: ['You brushed the clinging dust off the glass.', 'A dusty panel makes less electricity. Clean glass means more power for air, water and light.'],
  cells: ['You swapped every cracked cell for a new one.', 'One broken cell can drag down a whole row. Now the panel can make full power again.'],
  wires: ['You matched every plug to its socket.', 'Power and signals only flow through a complete circuit. One wrong wire and nothing works, or something burns.'],
  leaks: ['You pressed a seal on every spraying leak.', 'Every drop that escapes is a drop you cannot drink, grow food with, or turn into oxygen.'],
  align: ['You pointed the dish at Earth using a signal that was 2.6 seconds old.', 'Radio takes 1.3 seconds each way. With the link back, Mission Control can warn you about solar storms.'],
  sequence: ['You built the filter in the order Mission Control read out.', 'The filter soaks up the CO₂ you breathe out. Too much CO₂ causes headaches, then worse.'],
  fire: ['You sprayed the base of each flame.', 'Fire eats oxygen and makes smoke in a sealed station, so it must be out in seconds.'],
  harvest: ['You picked each plant when it was ripe.', 'Ripe crops are food on the table, and an empty rack is free to grow the next crop.'],
  bolts: ['You turned every bolt to the right tightness.', 'A loose bolt shakes free in a moonquake; an over-tight one strips its thread. Either way the part fails.'],
  weld: ['You sealed the patch all the way round.', 'Air pushes out through any gap. A complete seam is what keeps the room’s air inside.'],
  stir: ['You kept it moving at a steady speed.', 'Even heat means nothing burns and nothing stays cold, so no food or energy is wasted.'],
  stack: ['You put every crate in its own place.', 'When something breaks, you need the right spare in seconds, not after a search.'],
  plant: ['You filled every cup in the rack.', 'An empty cup is wasted light and water. A full rack makes the most food from the same power.'],
  suit: ['You checked every seal in the standard order.', 'Outside there is no air at all. One open seal would empty the suit in moments.'],
  safe: ['You switched the power off in the safe order before touching anything.', 'Electricity you cannot see can still hurt you. Engineers always make it safe first.'],
  gauge: ['You brought the reading into the safe band and watched it hold steady.', 'A steady needle proves the repair worked. A drifting one means the job is not finished.'],
};
const BG = {};   // backdrop pictures, loaded on first use: assets/img/mg_<kind>.jpg (the game still works without them)
function backdrop(kind) { if (BG[kind] === undefined) { const im = new Image(); im.onerror = () => { BG[kind] = null; }; im.src = 'assets/img/mg_' + kind + '.jpg'; BG[kind] = im; } const im = BG[kind]; return im && im.complete && im.naturalWidth ? im : null; }
function wrap(c, text, x, y, maxW, lh) { let line = ''; for (const w of text.split(' ')) { if (c.measureText(line + w).width > maxW && line) { c.fillText(line.trim(), x, y); y += lh; line = ''; } line += w + ' '; } c.fillText(line.trim(), x, y); return y + lh; }
function label(c, text) { c.font = '600 18px Inter,sans-serif'; c.textAlign = 'center'; const w = c.measureText(text).width + 30; c.fillStyle = 'rgba(4,10,16,.82)'; rr(c, W / 2 - w / 2, 6, w, 30, 10); c.fill(); c.fillStyle = '#fff'; c.fillText(text, W / 2, 27); }

// Play a minigame. Returns { win, score 0..1 }. opts: { ease (time multiplier), easy, total }
export function playMini(G, kind, opts = {}) {
  const tier = opts.tier ?? ({ cadet: 0, pilot: 1, commander: 2, unlimited: 2 }[G.S?.mode] ?? 1);   // 0 guided · 1 on your own · 2 tight tolerances
  const def = GAMES[kind], ease = (opts.ease || 1) * (G.S?.m.mgEase || 1) * (G.S?.flow.commsOn && G.S.lv.comms === 2 ? 1.2 : 1);
  const html = `<div class="mg-rego"><img src="assets/img/c_rego.jpg" alt=""><div><b>REGO${opts.step ? ' · ' + opts.step : ''}</b>${opts.how || def.how}</div></div><div class="mg-bar"><i id="mg-time"></i></div><div class="mg-wrap"><canvas id="mg-canvas" width="${W}" height="${H}"></canvas></div>${def.arrows ? '<div class="mg-ctl"><button data-k="ArrowLeft">◀</button><button data-k="ArrowUp">▲</button><button data-k="ArrowDown">▼</button><button data-k="ArrowRight">▶</button></div>' : ''}<div class="learn">${def.why}</div>${ease > 1.15 && G.S?.lv.comms === 2 ? '<div style="font-size:12px;color:var(--green)">Mission Control is helping: +20% time.</div>' : ''}`;
  return new Promise((resolve) => {
    G.ui.window({ title: opts.title || def.title, html, closable: false, onMount: (w) => {
      const cv = w.querySelector('#mg-canvas'), c = cv.getContext('2d'), bar = w.querySelector('#mg-time');
      const s = { t: 0, time: def.time * ease, left: def.time * ease, ptr: { x: W / 2, y: H / 2, down: false }, keys: {}, sfx: (n) => G.audio?.play(n), easy: opts.easy || tier === 0, tier, o: opts, total: opts.total, col: opts.col };
      let seed = (Math.random() * 1e9) | 0; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      def.init(s, rnd);
      const pos = (e) => { const r = cv.getBoundingClientRect(); s.ptr.x = ((e.clientX - r.left) / r.width) * W; s.ptr.y = ((e.clientY - r.top) / r.height) * H; };
      cv.onpointerdown = (e) => { try { cv.setPointerCapture(e.pointerId); } catch (err) {} pos(e); if (result) { endT = 0; return; } s.ptr.down = true; def.down?.(s, s.ptr.x, s.ptr.y); };   // a click on the result card moves on
      cv.onpointermove = pos; cv.onpointerup = cv.onpointercancel = (e) => { pos(e); s.ptr.down = false; def.up?.(s, s.ptr.x, s.ptr.y); };
      const kd = (e) => { s.keys[e.key] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); }, ku = (e) => { s.keys[e.key] = false; };
      addEventListener('keydown', kd); addEventListener('keyup', ku);
      w.querySelectorAll('.mg-ctl button').forEach((b) => { b.onpointerdown = () => (s.keys[b.dataset.k] = true); b.onpointerup = b.onpointerleave = () => (s.keys[b.dataset.k] = false); });
      let last = performance.now(), result = null, endT = 0;
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!result) {
          s.t += dt; s.left -= dt; result = def.update(s, dt) || (window.__mgSkip ? { win: true, score: 0.8 } : null); // __mgSkip: test hook
          if (result) { result.stars = result.win ? (result.score > 0.75 ? 3 : result.score > 0.5 ? 2 : 1) : 0; endT = 3.2; s.ptr.down = false; G.audio?.play(result.win ? 'win' : 'bad'); }
        } else endT -= dt;
        c.clearRect(0, 0, W, H); const bg = backdrop(def.bg || kind); s.hasBg = !!bg; if (bg) { const k = Math.max(W / bg.naturalWidth, H / bg.naturalHeight), bw = bg.naturalWidth * k, bh = bg.naturalHeight * k; c.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh); c.fillStyle = 'rgba(4,9,15,.58)'; c.fillRect(0, 0, W, H); } def.draw(s, c);
        bar.style.width = clamp(s.left / s.time, 0, 1) * 100 + '%';
        if (result) {   // the result card: stars, what you did, why it mattered
          const d = DEBRIEF[kind] || ['', '']; c.fillStyle = 'rgba(2,6,12,.84)'; c.fillRect(0, 0, W, H); c.textAlign = 'center';
          c.font = '700 50px "Chakra Petch",sans-serif'; c.fillStyle = result.win ? '#58e08a' : '#ffb347'; c.fillText(result.win ? (opts.winText || (kind === 'harvest' ? 'Harvest done!' : 'Fixed!')) : (opts.loseText || 'Not this time'), W / 2, 112);
          c.font = '46px Inter,sans-serif'; for (let k = 0; k < 3; k++) { c.fillStyle = k < result.stars ? '#ffd21f' : '#27384a'; c.fillText('★', W / 2 - 62 + k * 62, 176); }
          c.textAlign = 'left'; c.font = '700 15px "Chakra Petch",sans-serif'; c.fillStyle = '#49e6ff'; c.fillText('WHAT YOU DID', 150, 232); c.font = '500 20px Inter,sans-serif'; c.fillStyle = '#e9f2f9'; let y = wrap(c, result.win ? (opts.did || d[0]) : 'Time ran out before the job was finished, so it had to be done the slow way.', 150, 262, 600, 27);
          c.font = '700 15px "Chakra Petch",sans-serif'; c.fillStyle = '#ffb347'; c.fillText('WHY IT MATTERS', 150, y + 18); c.font = '500 20px Inter,sans-serif'; c.fillStyle = '#e9f2f9'; wrap(c, opts.matter || d[1], 150, y + 48, 600, 27);
          c.textAlign = 'center'; c.font = '600 14px Inter,sans-serif'; c.fillStyle = '#9bb0c3'; c.fillText('Click to carry on', W / 2, H - 20);
        }
        if (result && endT <= 0) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); G.ui.close(); resolve(result); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } });
  });
}

// A procedure: several games in a row (make it safe → do the work → test it). Returns one combined result.
export async function playProcedure(G, stages) {
  const out = []; for (let i = 0; i < stages.length; i++) { const [kind, opt] = stages[i]; out.push(await playMini(G, kind, { ...opt, step: stages.length > 1 ? `Step ${i + 1} of ${stages.length}` : '' })); }
  const score = out.reduce((a, r) => a + r.score, 0) / out.length, win = out.every((r) => r.win);
  return { win, score, stars: win ? Math.round(out.reduce((a, r) => a + r.stars, 0) / out.length) : 0, stages: out };
}
