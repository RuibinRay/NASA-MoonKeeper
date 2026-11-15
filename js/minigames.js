// MOONKEEPER — eight small repair games. Each one is tied to a real piece of space science (see `why`).
import { K } from './config.js';

const W = 900, H = 480, TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

const GAMES = {
  // 1. Brush sticky moon dust off a solar panel
  wipe: {
    title: 'Brush the dust off', how: 'Hold and drag to brush the grey dust off the panel. Clean it all before time runs out!', time: 26,
    why: 'Moon dust is sticky, sharp and charged with static electricity, so it clings to everything.', src: 'moondust',
    init(s) { s.nx = 45; s.ny = 24; s.d = new Float32Array(s.nx * s.ny).fill(1); s.clean = 0; },
    update(s, dt) {
      if (s.ptr.down) for (let j = 0; j < s.ny; j++) for (let i = 0; i < s.nx; i++) { const cx = i * 20 + 10, cy = j * 20 + 10; if (Math.hypot(cx - s.ptr.x, cy - s.ptr.y) < 52) s.d[j * s.nx + i] = Math.max(0, s.d[j * s.nx + i] - dt * 7); }
      let n = 0; for (const v of s.d) if (v < 0.25) n++; s.clean = n / s.d.length;
      if (s.clean >= 0.93) return { win: true, score: 1 };
      if (s.left <= 0) return { win: s.clean > 0.7, score: s.clean };
    },
    draw(s, c) {
      for (let j = 0; j < 6; j++) for (let i = 0; i < 9; i++) { c.fillStyle = (i + j) % 2 ? '#12306e' : '#0f2a62'; c.fillRect(i * 100 + 2, j * 80 + 2, 96, 76); }
      for (let j = 0; j < s.ny; j++) for (let i = 0; i < s.nx; i++) { const v = s.d[j * s.nx + i]; if (v > 0.02) { c.fillStyle = `rgba(${150 + (i * 7 + j * 13) % 22},146,138,${v * 0.95})`; c.fillRect(i * 20, j * 20, 20, 20); } }
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(s.ptr.x, s.ptr.y, 52, 0, TAU); c.stroke();
      label(c, `Clean: ${Math.round(s.clean * 100)}%`);
    },
  },
  // 2. Swap cracked solar cells
  cells: {
    title: 'Swap the cracked cells', how: 'Click every CRACKED cell to swap in a new one. Clicking a good cell wastes 2 seconds.', time: 16,
    why: 'Meteoroids hit the Moon at 20 to 72 km every second. With no air to slow them, even a pebble can smash a panel.', src: 'meo',
    init(s, rnd) { s.cells = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) s.cells.push({ x: 30 + i * 142, y: 22 + j * 110, bad: false, fx: 0, seed: rnd() }); let n = 0; while (n < 8) { const k = s.cells[(rnd() * 24) | 0]; if (!k.bad) { k.bad = true; n++; } } },
    down(s, x, y) { const k = s.cells.find((q) => x > q.x && x < q.x + 130 && y > q.y && y < q.y + 98); if (!k) return; if (k.bad) { k.bad = false; k.fx = 1; s.sfx('ok'); } else { s.left -= 2; k.fx = -1; s.sfx('bad'); } },
    update(s, dt) { for (const k of s.cells) k.fx *= Math.pow(0.02, dt); const bad = s.cells.filter((k) => k.bad).length; if (!bad) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: 1 - bad / 8 }; s.bad = bad; },
    draw(s, c) {
      for (const k of s.cells) {
        c.fillStyle = k.bad ? '#232a3a' : '#123273'; rr(c, k.x, k.y, 130, 98, 8); c.fill();
        if (k.fx > 0.05) { c.fillStyle = `rgba(120,255,170,${k.fx})`; c.fill(); } if (k.fx < -0.05) { c.fillStyle = `rgba(255,80,80,${-k.fx})`; c.fill(); }
        c.strokeStyle = 'rgba(190,215,255,.35)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(k.x + i * 32.5, k.y); c.lineTo(k.x + i * 32.5, k.y + 98); c.stroke(); }
        if (k.bad) { c.strokeStyle = '#d7dce6'; c.lineWidth = 2.5; c.beginPath(); let x = k.x + 20 + k.seed * 40, y = k.y + 6; c.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (((k.seed * 97 * (i + 1)) % 1) - 0.4) * 46; y += 15; c.lineTo(clamp(x, k.x + 4, k.x + 126), y); } c.stroke(); c.beginPath(); c.moveTo(k.x + 65, k.y + 50); c.lineTo(k.x + 112, k.y + 30 + k.seed * 40); c.stroke(); }
      }
      label(c, `Cracked cells left: ${s.bad ?? 8}`);
    },
  },
  // 3. Reconnect wires
  wires: {
    title: 'Reconnect the wires', how: 'Drag each plug on the left to the socket of the SAME colour on the right.', time: 22,
    why: 'Radiation can scramble computers and slowly wear out electronics. Engineers build spare circuits so a broken one can be bypassed.', src: 'hardware',
    init(s, rnd) { const cols = ['#ff5252', '#ffd257', '#58e08a', '#49e6ff', '#ff6fdc']; const order = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5); s.L = cols.map((col, i) => ({ col, x: 130, y: 70 + i * 85, to: null })); s.R = order.map((ci, i) => ({ col: cols[ci], x: 770, y: 70 + i * 85, used: false })); s.drag = null; s.spark = 0; },
    down(s, x, y) { const p = s.L.find((q) => !q.to && Math.hypot(q.x - x, q.y - y) < 46); if (p) s.drag = p; },
    up(s, x, y) { if (!s.drag) return; const r = s.R.find((q) => !q.used && Math.hypot(q.x - x, q.y - y) < 50); if (r) { if (r.col === s.drag.col) { s.drag.to = r; r.used = true; s.sfx('ok'); } else { s.left -= 2; s.spark = 1; s.sfx('bad'); } } s.drag = null; },
    update(s, dt) { s.spark *= Math.pow(0.01, dt); const n = s.L.filter((q) => q.to).length; if (n === 5) return { win: true, score: clamp(s.left / s.time + 0.4, 0, 1) }; if (s.left <= 0) return { win: false, score: n / 5 }; },
    draw(s, c) {
      c.fillStyle = '#0c1724'; rr(c, 40, 20, 180, 440, 14); c.fill(); rr(c, 680, 20, 180, 440, 14); c.fill();
      c.lineWidth = 10; c.lineCap = 'round';
      for (const p of s.L) { const tx = p.to ? p.to.x : s.drag === p ? s.ptr.x : null, ty = p.to ? p.to.y : s.drag === p ? s.ptr.y : null; if (tx !== null) { c.strokeStyle = p.col; c.beginPath(); c.moveTo(p.x, p.y); c.bezierCurveTo(p.x + 200, p.y, tx - 200, ty, tx, ty); c.stroke(); } }
      for (const p of s.L) { c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 26, 0, TAU); c.fill(); c.fillStyle = '#0008'; c.beginPath(); c.arc(p.x, p.y, 10, 0, TAU); c.fill(); }
      for (const r of s.R) { c.strokeStyle = r.col; c.lineWidth = 8; c.beginPath(); c.arc(r.x, r.y, 26, 0, TAU); c.stroke(); c.fillStyle = r.used ? r.col : '#05090f'; c.beginPath(); c.arc(r.x, r.y, 20, 0, TAU); c.fill(); }
      if (s.spark > 0.05) { c.fillStyle = `rgba(255,240,150,${s.spark})`; c.fillRect(0, 0, W, H); }
    },
  },
  // 4. Seal leaks
  leaks: {
    title: 'Seal the leaks', how: 'Hold your pointer on each spraying leak until the ring closes. Be quick: the tank is emptying!', time: 30,
    why: 'Shallow moonquakes can reach magnitude 5.5 and shake for more than 10 minutes — long enough to crack pipes and seals.', src: 'quakes',
    init(s, rnd) { s.j = []; for (let i = 0; i < 9; i++) s.j.push({ x: 110 + (i % 3) * 340 + (rnd() - 0.5) * 60, y: 90 + ((i / 3) | 0) * 150 + (rnd() - 0.5) * 30, on: false, seal: 0, done: false }); s.todo = s.total || 7; s.sealed = 0; s.next = 0.3; s.lost = 0; },
    update(s, dt) {
      s.next -= dt; const act = s.j.filter((q) => q.on);
      if (s.next <= 0 && s.todo > 0 && act.length < 3) { const free = s.j.filter((q) => !q.on && !q.done); if (free.length) { const q = free[(Math.random() * free.length) | 0]; q.on = true; q.seal = 0; s.todo--; s.next = 1.25; s.sfx('blip'); } }
      for (const q of act) { if (s.ptr.down && Math.hypot(q.x - s.ptr.x, q.y - s.ptr.y) < 50) { q.seal += dt / 0.55; if (q.seal >= 1) { q.on = false; q.done = true; s.sealed++; s.sfx('ok'); } } else q.seal = Math.max(0, q.seal - dt); }
      s.lost += act.length * dt * 0.022;
      if (s.todo === 0 && !s.j.some((q) => q.on)) return { win: true, score: clamp(1 - s.lost, 0, 1) };
      if (s.lost >= 1 || s.left <= 0) return { win: false, score: 0 };
    },
    draw(s, c) {
      c.strokeStyle = '#7f8a97'; c.lineWidth = 22; c.lineJoin = 'round'; c.beginPath(); s.j.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); c.strokeStyle = '#aab4c0'; c.lineWidth = 6; c.stroke();
      for (const q of s.j) {
        c.fillStyle = q.done ? '#58e08a' : '#5d6773'; c.beginPath(); c.arc(q.x, q.y, 20, 0, TAU); c.fill();
        if (q.on) { c.strokeStyle = 'rgba(200,235,255,.8)'; c.lineWidth = 2; for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.3, l = 30 + Math.random() * 70; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + Math.cos(a) * l, q.y + Math.sin(a) * l); c.stroke(); } c.strokeStyle = '#ffb347'; c.lineWidth = 6; c.beginPath(); c.arc(q.x, q.y, 34, -Math.PI / 2, -Math.PI / 2 + TAU * q.seal); c.stroke(); }
      }
      c.fillStyle = '#0c1724'; rr(c, 250, 446, 400, 22, 8); c.fill(); c.fillStyle = '#49e6ff'; rr(c, 252, 448, 396 * clamp(1 - s.lost, 0, 1), 18, 7); c.fill();
      label(c, `Tank saved: ${Math.round(clamp(1 - s.lost, 0, 1) * 100)}%  ·  sealed ${s.sealed}`);
    },
  },
  // 5. Point the dish at Earth — with real light delay
  align: {
    title: 'Aim the dish at Earth', how: 'Move the crosshair (arrow keys, buttons, or hold the pointer) to find the strongest signal. Careful: the signal bar shows what happened 2.6 seconds ago!', time: 75, arrows: true,
    why: `Radio travels at light speed, but Earth is ${K.EARTH_MOON_KM.toLocaleString()} km away: 1.3 s there + 1.3 s back. You are always steering with old news. On Mars the wait is 4 to 24 minutes each way.`, src: 'delay',
    init(s, rnd) { const a = rnd() * TAU, d = 60 + rnd() * 70; s.tx = W / 2 + Math.cos(a) * d; s.ty = 215 + Math.sin(a) * d; s.x = W / 2 + (rnd() - 0.5) * 380; s.y = 215 + (rnd() - 0.5) * 220; s.q = []; s.sig = 0; s.lock = 0; },
    update(s, dt) {
      let dx = (s.keys.ArrowRight || s.keys.d ? 1 : 0) - (s.keys.ArrowLeft || s.keys.a ? 1 : 0), dy = (s.keys.ArrowDown || s.keys.s ? 1 : 0) - (s.keys.ArrowUp || s.keys.w ? 1 : 0);
      if (s.ptr.down && s.ptr.y < 430) { const vx = s.ptr.x - s.x, vy = s.ptr.y - s.y, l = Math.hypot(vx, vy); if (l > 6) { dx = vx / l; dy = vy / l; } }
      s.x = clamp(s.x + dx * 105 * dt, 30, W - 30); s.y = clamp(s.y + dy * 105 * dt, 30, 400);
      s.q.push([s.t, clamp(1 - Math.hypot(s.x - s.tx, s.y - s.ty) / 330, 0, 1)]);
      while (s.q.length > 1 && s.q[1][0] <= s.t - 2 * K.LIGHT_DELAY_S) s.q.shift();
      s.sig = s.t > 2 * K.LIGHT_DELAY_S ? s.q[0][1] : 0;
      s.lock = s.sig > 0.93 ? s.lock + dt : 0;
      if (s.lock > 1.1) return { win: true, score: clamp(s.left / s.time + 0.3, 0, 1) };
      if (s.left <= 0) return { win: false, score: s.sig };
    },
    draw(s, c) {
      c.fillStyle = '#02050a'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; for (let i = 0; i < 90; i++) c.fillRect((i * 173.3) % W, (i * 97.7) % 420, 1.5, 1.5);
      const g = c.createRadialGradient(W / 2 - 40, 180, 10, W / 2, 215, 150); g.addColorStop(0, '#7fc4ff'); g.addColorStop(0.6, '#1f5fae'); g.addColorStop(1, '#0a2247'); c.fillStyle = g; c.beginPath(); c.arc(W / 2, 215, 150, 0, TAU); c.fill();
      c.fillStyle = 'rgba(90,190,120,.55)'; for (const [x, y, r] of [[-50, -40, 46], [40, 30, 38], [-10, 70, 30], [70, -60, 24]]) { c.beginPath(); c.ellipse(W / 2 + x, 215 + y, r, r * 0.7, 0.5, 0, TAU); c.fill(); }
      c.strokeStyle = s.lock > 0 ? '#58e08a' : '#ffb347'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 22, 0, TAU); c.moveTo(s.x - 34, s.y); c.lineTo(s.x + 34, s.y); c.moveTo(s.x, s.y - 34); c.lineTo(s.x, s.y + 34); c.stroke();
      c.fillStyle = '#0c1724'; rr(c, 150, 438, 600, 30, 10); c.fill(); c.fillStyle = s.sig > 0.93 ? '#58e08a' : s.sig > 0.6 ? '#ffd257' : '#ff5252'; rr(c, 153, 441, 594 * s.sig, 24, 8); c.fill();
      c.fillStyle = '#fff'; c.font = '600 17px Inter,sans-serif'; c.textAlign = 'center'; c.fillText(s.t < 2.6 ? 'waiting for the first echo…' : `Signal ${Math.round(s.sig * 100)}%  (echo from 2.6 s ago)${s.lock > 0 ? '  — HOLD STILL!' : ''}`, W / 2, 459);
      const ph = (s.t % 2.6) / 2.6; c.fillStyle = '#49e6ff'; c.font = '13px Inter,sans-serif'; c.fillText('Moon', 30, 462); c.fillText('Earth', 130, 462); c.beginPath(); c.arc(50 + (ph < 0.5 ? ph * 2 : 2 - ph * 2) * 60, 448, 4, 0, TAU); c.fill();
    },
  },
  // 6. Apollo 13 air filter: remember the steps Mission Control reads out
  sequence: {
    title: 'Build the air filter', how: 'Mission Control reads out the steps. Watch the order, then click the parts in the SAME order.', time: 60,
    why: 'Apollo 13 really did this in 1970: the crew fitted a square air filter into a round hole using a hose, plastic bags, a cue card and duct tape — following steps radioed from Earth.', src: 'apollo13',
    init(s, rnd) { s.items = [['1', 'Canister'], ['2', 'Bag'], ['3', 'Cue card'], ['4', 'Duct tape'], ['5', 'Sock'], ['6', 'Hose']].map((it, i) => ({ ico: it[0], name: it[1], x: 75 + (i % 3) * 260, y: 60 + ((i / 3) | 0) * 190, fx: 0 })); s.rounds = s.easy ? [3, 4] : [3, 4, 5]; s.r = 0; s.rnd = rnd; this.newRound(s); },
    newRound(s) { s.seq = Array.from({ length: s.rounds[s.r] }, () => (s.rnd() * 6) | 0); s.phase = 'show'; s.i = 0; s.pt = 0.6; s.in = 0; },
    down(s, x, y) { if (s.phase !== 'input') return; const k = s.items.findIndex((q) => x > q.x && x < q.x + 230 && y > q.y && y < q.y + 160); if (k < 0) return; if (k === s.seq[s.in]) { s.items[k].fx = 1; s.in++; s.sfx('ok'); if (s.in >= s.seq.length) { s.r++; if (s.r < s.rounds.length) this.newRound(s); else s.won = true; } } else { s.items[k].fx = -1; s.left -= 3; s.sfx('bad'); s.phase = 'show'; s.i = 0; s.pt = 0.8; s.in = 0; } },
    update(s, dt) {
      for (const it of s.items) it.fx *= Math.pow(0.03, dt);
      if (s.phase === 'show') { s.left += dt; s.pt -= dt; if (s.pt <= 0) { if (s.i >= s.seq.length) s.phase = 'input'; else { s.items[s.seq[s.i]].fx = 1; s.sfx('blip'); s.i++; s.pt = 0.75; } } }
      if (s.won) return { win: true, score: clamp(s.left / s.time + 0.3, 0, 1) }; if (s.left <= 0) return { win: false, score: s.r / s.rounds.length };
    },
    draw(s, c) {
      for (const it of s.items) { c.fillStyle = '#0f1c2c'; rr(c, it.x, it.y, 230, 160, 16); c.fill(); if (it.fx > 0.04) { c.fillStyle = `rgba(73,230,255,${it.fx * 0.75})`; c.fill(); } if (it.fx < -0.04) { c.fillStyle = `rgba(255,82,82,${-it.fx * 0.75})`; c.fill(); } c.strokeStyle = 'rgba(120,205,255,.3)'; c.lineWidth = 2; c.stroke(); c.font = '64px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(it.ico, it.x + 115, it.y + 88); c.font = '600 19px Inter,sans-serif'; c.fillText(it.name, it.x + 115, it.y + 135); }
      label(c, s.phase === 'show' ? `Mission Control is reading step ${Math.min(s.i + 1, s.seq.length)} of ${s.seq.length}… watch!` : `Your turn: step ${s.in + 1} of ${s.seq.length}  ·  round ${s.r + 1}/${s.rounds.length}`);
    },
  },
  // 7. Fight a fire
  fire: {
    title: 'Put out the fire', how: 'Hold the pointer on the BASE of each flame to spray it. Your extinguisher is small — do not waste it!', time: 28,
    why: 'Scientists lit real fires inside empty cargo ships to learn how flames behave in space: slower, rounder, and able to spread in surprising directions.', src: 'saffire',
    init(s, rnd) { s.fl = []; for (let i = 0; i < 3; i++) s.fl.push({ x: 140 + rnd() * 620, y: 150 + rnd() * 230, s: 0.35 + rnd() * 0.2 }); s.tank = 1; s.spawn = 3.2; s.rnd = rnd; },
    update(s, dt) {
      s.spawn -= dt; if (s.spawn <= 0 && s.t < 13 && s.fl.length < 6) { s.fl.push({ x: 120 + s.rnd() * 660, y: 140 + s.rnd() * 250, s: 0.25 }); s.spawn = 3.4; }
      const spray = s.ptr.down && s.tank > 0; if (spray) s.tank -= dt / 11;
      for (const f of s.fl) { f.s += dt * 0.075; if (spray && Math.hypot(f.x - s.ptr.x, f.y + 20 - s.ptr.y) < 75) f.s -= dt * 1.0; }
      s.fl = s.fl.filter((f) => f.s > 0.05);
      if (!s.fl.length && (s.t >= 13 || s.spawn > 1)) return { win: true, score: clamp(s.tank + 0.2, 0, 1) };
      if (s.fl.some((f) => f.s > 1.35) || (s.tank <= 0 && s.fl.length) || s.left <= 0) return { win: false, score: 0 };
    },
    draw(s, c) {
      c.fillStyle = '#10161f'; c.fillRect(0, 0, W, H); c.fillStyle = '#1b2531'; for (let i = 0; i < 6; i++) { rr(c, 40 + i * 140, 60, 120, 380, 8); c.fill(); } c.fillStyle = '#2b3948'; for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) c.fillRect(54 + i * 140, 80 + j * 72, 92, 12);
      for (const f of s.fl) { const r = 26 + f.s * 62, fl = 1 + Math.sin(s.t * 14 + f.x) * 0.07; const g = c.createRadialGradient(f.x, f.y, 2, f.x, f.y, r * fl); g.addColorStop(0, 'rgba(255,255,220,.95)'); g.addColorStop(0.35, 'rgba(255,170,40,.9)'); g.addColorStop(0.75, 'rgba(255,70,20,.55)'); g.addColorStop(1, 'rgba(80,120,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r * fl, 0, TAU); c.fill(); }
      if (s.ptr.down && s.tank > 0) { c.fillStyle = 'rgba(230,245,255,.35)'; c.beginPath(); c.moveTo(W / 2, H); c.lineTo(s.ptr.x - 60, s.ptr.y); c.lineTo(s.ptr.x + 60, s.ptr.y); c.fill(); c.beginPath(); c.arc(s.ptr.x, s.ptr.y, 60, 0, TAU); c.fill(); }
      c.fillStyle = '#0c1724'; rr(c, 20, 446, 300, 22, 8); c.fill(); c.fillStyle = s.tank > 0.3 ? '#58e08a' : '#ff5252'; rr(c, 22, 448, 296 * clamp(s.tank, 0, 1), 18, 7); c.fill();
      label(c, `Extinguisher ${Math.round(clamp(s.tank, 0, 1) * 100)}%   ·   flames: ${s.fl.length}`);
    },
  },
  // 8. Harvest
  harvest: {
    title: 'Harvest time', how: 'Pick each plant while it GLOWS (ripe). Too early wastes it; too late and it wilts.', time: 17,
    why: "Red romaine lettuce took 33 days to grow on the Space Station in 2015. It was the first space-grown crop astronauts ate there. Radishes took 27 days.", src: 'veggie',
    init(s, rnd) { s.p = []; for (let i = 0; i < 10; i++) s.p.push({ x: 110 + (i % 5) * 170, y: 150 + ((i / 5) | 0) * 190, g: rnd() * 0.6, sp: 0.35 + rnd() * 0.35, fx: 0 }); s.picks = 0; s.rnd = rnd; },
    down(s, x, y) { const p = s.p.find((q) => Math.hypot(q.x - x, q.y - y) < 70); if (!p) return; if (p.g >= 1 && p.g < 1.55) { s.picks++; p.fx = 1; s.sfx('ok'); } else { p.fx = -1; s.sfx('bad'); } p.g = 0; p.sp = 0.35 + s.rnd() * 0.4; },
    update(s, dt) { for (const p of s.p) { p.g += dt * p.sp; p.fx *= Math.pow(0.03, dt); if (p.g > 2) { p.g = 0; p.sp = 0.35 + s.rnd() * 0.4; } } if (s.left <= 0) return { win: true, score: clamp(s.picks / 8, 0, 1) }; },
    draw(s, c) {
      c.fillStyle = '#170a1c'; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,79,216,.12)'; c.fillRect(0, 0, W, H);
      for (const p of s.p) {
        const ripe = p.g >= 1 && p.g < 1.55, old = p.g >= 1.55, sz = 18 + clamp(p.g, 0, 1) * 42;
        c.fillStyle = '#e8e8e3'; rr(c, p.x - 70, p.y + 40, 140, 26, 8); c.fill();
        if (ripe) { c.fillStyle = 'rgba(255,255,160,.35)'; c.beginPath(); c.arc(p.x, p.y, sz + 22 + Math.sin(s.t * 12) * 4, 0, TAU); c.fill(); }
        c.fillStyle = old ? '#7a6a3a' : ripe ? '#57d968' : '#2f8a3e'; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; c.beginPath(); c.ellipse(p.x + Math.cos(a) * sz * 0.45, p.y + 12 + Math.sin(a) * sz * 0.3 - sz * 0.2, sz * 0.5, sz * 0.32, a, 0, TAU); c.fill(); }
        if (p.fx > 0.05) { c.fillStyle = `rgba(120,255,170,${p.fx})`; c.font = '700 26px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('+1', p.x, p.y - 50 - (1 - p.fx) * 20); } if (p.fx < -0.05) { c.fillStyle = `rgba(255,120,120,${-p.fx})`; c.font = '700 20px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('not ripe', p.x, p.y - 50); }
      }
      label(c, `Picked: ${s.picks}  (8 fills the basket)`);
    },
  },
};
function label(c, text) { c.font = '600 18px Inter,sans-serif'; c.textAlign = 'center'; const w = c.measureText(text).width + 30; c.fillStyle = 'rgba(4,10,16,.82)'; rr(c, W / 2 - w / 2, 6, w, 30, 10); c.fill(); c.fillStyle = '#fff'; c.fillText(text, W / 2, 27); }

// Play a minigame. Returns { win, score 0..1 }. opts: { ease (time multiplier), easy, total }
export function playMini(G, kind, opts = {}) {
  const def = GAMES[kind], ease = (opts.ease || 1) * (G.S?.m.mgEase || 1) * (G.S?.flow.commsOn && G.S.lv.comms === 2 ? 1.2 : 1);
  const html = `<div class="body" style="margin-bottom:6px">${def.how}</div><div class="mg-bar"><i id="mg-time"></i></div><div class="mg-wrap"><canvas id="mg-canvas" width="${W}" height="${H}"></canvas></div>${def.arrows ? '<div class="mg-ctl"><button data-k="ArrowLeft">◀</button><button data-k="ArrowUp">▲</button><button data-k="ArrowDown">▼</button><button data-k="ArrowRight">▶</button></div>' : ''}<div class="learn">${def.why}</div>${ease > 1.15 && G.S?.lv.comms === 2 ? '<div style="font-size:12px;color:var(--green)">Mission Control is helping: +20% time.</div>' : ''}`;
  return new Promise((resolve) => {
    G.ui.window({ title: def.title, html, closable: false, onMount: (w) => {
      const cv = w.querySelector('#mg-canvas'), c = cv.getContext('2d'), bar = w.querySelector('#mg-time');
      const s = { t: 0, time: def.time * ease, left: def.time * ease, ptr: { x: W / 2, y: H / 2, down: false }, keys: {}, sfx: (n) => G.audio?.play(n), easy: opts.easy || G.S?.mode === 'cadet', total: opts.total };
      let seed = (Math.random() * 1e9) | 0; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      def.init(s, rnd);
      const pos = (e) => { const r = cv.getBoundingClientRect(); s.ptr.x = ((e.clientX - r.left) / r.width) * W; s.ptr.y = ((e.clientY - r.top) / r.height) * H; };
      cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); pos(e); s.ptr.down = true; def.down?.(s, s.ptr.x, s.ptr.y); };
      cv.onpointermove = pos; cv.onpointerup = cv.onpointercancel = (e) => { pos(e); s.ptr.down = false; def.up?.(s, s.ptr.x, s.ptr.y); };
      const kd = (e) => { s.keys[e.key] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); }, ku = (e) => { s.keys[e.key] = false; };
      addEventListener('keydown', kd); addEventListener('keyup', ku);
      w.querySelectorAll('.mg-ctl button').forEach((b) => { b.onpointerdown = () => (s.keys[b.dataset.k] = true); b.onpointerup = b.onpointerleave = () => (s.keys[b.dataset.k] = false); });
      let last = performance.now(), result = null, endT = 0;
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!result) {
          s.t += dt; s.left -= dt; result = def.update(s, dt) || (window.__mgSkip ? { win: true, score: 0.8 } : null); // __mgSkip: test hook
          if (result) { endT = 1.25; G.audio?.play(result.win ? 'win' : 'bad'); }
        } else endT -= dt;
        c.clearRect(0, 0, W, H); def.draw(s, c);
        bar.style.width = clamp(s.left / s.time, 0, 1) * 100 + '%';
        if (result) { c.fillStyle = 'rgba(2,6,12,.72)'; c.fillRect(0, 0, W, H); c.textAlign = 'center'; c.font = '700 54px "Chakra Petch",sans-serif'; c.fillStyle = result.win ? '#58e08a' : '#ffb347'; c.fillText(result.win ? (kind === 'harvest' ? 'Harvest done!' : 'Fixed!') : 'Not this time', W / 2, H / 2 + 12); }
        if (result && endT <= 0) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); G.ui.close(); resolve(result); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } });
  });
}
