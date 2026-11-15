// Plays every minigame with a scripted "careful player" and reports whether it can be won and how much of the clock it needs.
//   node tools/mini_test.mjs            (all games, Cadet / Pilot / Commander)
//   node tools/mini_test.mjs bolts weld (only these)
// The player is deliberately human-paced: it takes REACT seconds to start each action, moves the pointer at SPEED px/s,
// and only knows what is on the screen. A game that this player cannot finish with time to spare is too hard.
import { GAMES } from '../js/minigames.js';
import { MODES } from '../js/config.js';

const W = 900, H = 480, TAU = Math.PI * 2, REACT = 0.3, SPEED = 700, DT = 1 / 60;
const click = [['down'], ['wait', 0.06], ['up']];
const bots = {
  *wipe(s) { yield ['down']; let dir = 1; for (let y = s.rad * 0.8; y < H + s.rad; y += s.rad * 1.5) { yield ['move', dir > 0 ? 0 : W, Math.min(y, H - 8), 520]; yield ['move', dir > 0 ? W : 0, Math.min(y, H - 8), 520]; dir = -dir; }
    for (;;) { const k = s.d.findIndex((v) => v >= 0.25); if (k < 0) return; yield ['move', (k % s.nx) * 20 + 10, ((k / s.nx) | 0) * 20 + 10, 520]; yield ['wait', 0.2]; } },
  *cells(s) { for (const k of s.cells.filter((q) => q.bad)) { yield ['wait', REACT + (s.tier === 2 ? 0.25 : 0)]; yield ['move', k.x + 65, k.y + 49]; yield* click; } },
  *wires(s) { for (const p of s.L) { yield ['wait', REACT]; yield ['move', p.x, p.y]; yield ['down']; const r = s.R.find((q) => q.col === p.col); yield ['move', r.x, r.y]; yield ['up']; } },
  *stack(s) { for (const p of s.L) { yield ['wait', REACT]; yield ['move', p.x, p.y]; yield ['down']; const r = s.R.find((q) => q.col === p.col); yield ['move', r.x, r.y]; yield ['up']; } },
  *leaks(s) { for (;;) { const q = s.j.find((j) => j.on); if (!q) { yield ['wait', 0.1]; continue; } yield ['wait', REACT]; yield ['move', q.x, q.y]; yield ['down']; yield ['until', () => !q.on]; yield ['up']; } },
  *align(s, ptr) { yield ['wait', 2.7]; const probe = [s.x + 60, s.y]; yield ['move', ...probe]; yield ['down']; yield ['until', () => Math.hypot(s.x - probe[0], s.y - probe[1]) < 8]; yield ['up']; yield ['wait', 2.7];   // one wasted probe, as a real player has to feel for the signal
    for (;;) { const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy); if (d < 6) { yield ['wait', 0.2]; continue; } const st = Math.min(d, 90), tx = s.x + (dx / d) * st, ty = s.y + (dy / d) * st; yield ['move', tx, ty]; yield ['down']; yield ['until', () => Math.hypot(s.x - tx, s.y - ty) < 7]; yield ['up']; yield ['wait', 2.7]; } },
  *sequence(s) { for (;;) { yield ['until', () => s.phase === 'input']; const seq = s.seq.slice(), r = s.r; for (const k of seq) { if (s.r !== r || s.phase !== 'input') break; yield ['wait', 0.45]; const it = s.items[k]; yield ['move', it.x + 115, it.y + 80]; yield* click; } yield ['wait', 0.2]; } },
  *fire(s) { for (;;) { const f = s.fl.slice().sort((a, b) => b.s - a.s)[0]; if (!f) { yield ['up']; yield ['wait', 0.1]; continue; } yield ['wait', REACT * 0.7]; yield ['move', f.x, f.y + 20]; yield ['down']; yield ['until', () => !s.fl.includes(f)]; yield ['up']; } },
  *harvest(s) { for (;;) { const p = s.p.filter((q) => q.g >= 1 && q.g < 1 + s.win - 0.12 * q.sp * 4).sort((a, b) => b.g - a.g)[0]; if (!p) { yield ['wait', 0.05]; continue; } yield ['wait', REACT * 0.6]; yield ['move', p.x, p.y]; if (p.g >= 1 && p.g < 1 + s.win) yield* click; } },
  *bolts(s) { for (const b of s.b) while (!b.done) { yield ['wait', REACT]; yield ['move', b.x, b.y]; yield ['down']; yield ['until', () => b.p >= 1 || b.done]; if (s.tier > 0) yield ['wait', 0.24]; yield ['up']; yield ['wait', 0.05]; } },
  *weld(s) { const v = (s.rad * 2) / 0.26; yield ['move', s.pts[0].x, s.pts[0].y]; yield ['down']; for (const p of s.pts) yield ['move', p.x, p.y, v]; yield ['move', s.pts[0].x, s.pts[0].y, v]; for (;;) { const p = s.pts.find((q) => q.w < 1); if (!p) return; yield ['move', p.x, p.y, v]; yield ['wait', 0.22]; } },
  *stir(s) { const cx = W / 2 - 90, cy = H / 2, r = 130; yield ['move', cx + r, cy]; yield ['down']; for (let a = 0; ; a += TAU / 24) yield ['move', cx + Math.cos(a) * r, cy + Math.sin(a) * r, TAU * r * 1.0]; },
  *plant(s) { for (const k of s.c) { yield ['wait', 0.25]; yield ['move', k.x, k.y + 40]; yield* click; } yield ['wait', 3]; },
  *suit(s) { for (const k of s.p) { yield ['wait', REACT + (s.tier === 2 ? 0.35 : 0)]; yield ['move', k.x, k.y]; yield* click; } },
  *safe(s) { for (const b of s.b) { yield ['wait', REACT]; yield ['move', b.x, b.y0]; yield ['down']; yield ['move', b.x, b.y1 + 6, 500]; yield ['up']; } yield ['wait', 3]; },
  *gauge(s, ptr) { let a = 0; const cx = 230, cy = 255, r = 110; yield ['move', cx + r, cy]; yield ['down']; yield ['run', (dt) => { const err = s.c - s.n, w = Math.max(-3, Math.min(3, err * 7)); a += (Math.abs(err) < 0.012 ? 0 : w) * dt; ptr.x = cx + Math.cos(a) * r; ptr.y = cy + Math.sin(a) * r; }]; },
};

function play(kind, modeKey, seed) {
  const def = GAMES[kind], tier = { cadet: 0, pilot: 1, commander: 2 }[modeKey], time = def.time * MODES[modeKey].mgEase;
  let sd = seed; const rnd = () => { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296; };
  const s = { t: 0, time, left: time, ptr: { x: W / 2, y: H / 2, down: false }, keys: {}, sfx() {}, easy: tier === 0, tier, o: {} };
  const R0 = Math.random; Math.random = rnd; def.init(s, rnd);
  const bot = bots[kind](s, s.ptr); let cmd = null, wait = 0, res = null;
  for (let n = 0; n < 60 * 200 && !res; n++) {
    let budget = DT;   // one frame of the player's hands
    while (budget > 0) {
      if (!cmd) { const nx = bot.next(); if (nx.done) break; cmd = nx.value; if (cmd[0] === 'wait') wait = cmd[1]; }
      if (cmd[0] === 'down') { if (!s.ptr.down) { s.ptr.down = true; def.down?.(s, s.ptr.x, s.ptr.y); } cmd = null; }
      else if (cmd[0] === 'up') { if (s.ptr.down) { s.ptr.down = false; def.up?.(s, s.ptr.x, s.ptr.y); } cmd = null; }
      else if (cmd[0] === 'wait') { const d = Math.min(wait, budget); wait -= d; budget -= d; if (wait <= 1e-9) cmd = null; else break; }
      else if (cmd[0] === 'until') { if (cmd[1]()) cmd = null; else break; }
      else if (cmd[0] === 'run') { cmd[1](budget); break; }
      else if (cmd[0] === 'move') { const dx = cmd[1] - s.ptr.x, dy = cmd[2] - s.ptr.y, d = Math.hypot(dx, dy), v = cmd[3] || SPEED, step = v * budget; if (d <= step) { s.ptr.x = cmd[1]; s.ptr.y = cmd[2]; budget -= d / v; cmd = null; } else { s.ptr.x += (dx / d) * step; s.ptr.y += (dy / d) * step; break; } }
    }
    s.t += DT; s.left -= DT; res = def.update(s, DT) || null;
  }
  Math.random = R0;
  return res ? { win: res.win, used: 1 - Math.max(0, s.left) / time, stars: res.win ? (res.score > 0.8 ? 3 : res.score > 0.55 ? 2 : 1) : 0 } : { win: false, used: 9, stars: 0 };
}

const only = process.argv.slice(2), kinds = Object.keys(GAMES).filter((k) => !only.length || only.includes(k)), SEEDS = [11, 222, 3333, 44444, 555555];
let bad = 0;
console.log('game       ' + ['cadet', 'pilot', 'commander'].map((m) => m.padEnd(26)).join(''));
for (const k of kinds) {
  let line = k.padEnd(11);
  for (const m of ['cadet', 'pilot', 'commander']) {
    const rs = SEEDS.map((sd) => play(k, m, sd)), wins = rs.filter((r) => r.win).length, used = rs.reduce((a, r) => a + Math.min(r.used, 1), 0) / rs.length, stars = rs.reduce((a, r) => a + r.stars, 0) / rs.length;
    const flag = wins < SEEDS.length ? ' FAIL' : used > 0.65 ? ' TIGHT' : ''; if (flag) bad++;
    line += (`${wins}/${SEEDS.length} won  ${Math.round(used * 100)}% clock  ${stars.toFixed(1)}★${flag}`).padEnd(26);
  }
  console.log(line);
}
console.log(bad ? `${bad} game/mission pairs need a look` : 'every game can be won with time to spare');
