// MOONKEEPER 2 — main loop: input, player, carrying, rover and hopper, crew actors, build scenes, saving, and glue.
import * as THREE from '../lib/three.module.min.js';
import { World } from './world.js';
import { Astronaut, Rego, Bolt } from './actors.js';
import { Follower } from './follow.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import { Voice } from './voice.js';
import { radioLine } from './radio.js';
import { IC } from './icons.js';
import { playProcedure, playMini } from './minigames.js';
import { jobEffect } from './jobfx.js';
import { K, MODES, STATIONS, SITES, PIT, TUBE, AIRLOCK, BASE, MINE, SPAWN, ROOMS, CAR_PAD, SHIP_PAD, ITEMS, roomRect, roomSpot, fmt } from './config.js';
import { createSim, step, computeFlows, applyDisaster, jobHours, addHelper, serialize, deserialize } from './sim.js';
import { installActions } from './actions.js';
import { patchAt, scoop } from './life.js';
import { installEvents } from './events.js';
import { comicIntro, tutorial, disaster, ending } from './story.js';

const V3 = THREE.Vector3, $ = (s) => document.querySelector(s), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), UP = new V3(0, 1, 0), TMP = new V3();
const canvas = $('#view'), params = new URLSearchParams(location.search);
const G = (window.G = {
  state: 'title', keys: {}, S: null, simOn: false, speedMul: 1, sleepLeft: 0, shake: 0, paused: false, npcs: [], goal: null, nagT: 0, stepT: 0, saveT: 0,
  player: { pos: new V3(SPAWN.x, 0, SPAWN.z), vel: new V3(), vy: 0, face: -1.6, zone: 'top', ground: true, carry: null, in: null },
  cam: { yaw: Math.PI / 2 + 0.25, pitch: 0.22, dist: 7.5, fp: false }, stick: { x: 0, y: 0 }, regoPos: new V3(SPAWN.x + 2, 0, SPAWN.z + 1.5),
  car: { x: CAR_PAD[0], z: CAR_PAD[1], yaw: 1.2, v: 0, cargo: [], max: 4 }, ship: { x: SHIP_PAD[0], z: SHIP_PAD[1], y: 0, yaw: 1.2, vx: 0, vz: 0, vy: 0, alt: 0, cargo: [], max: 2 },
  items: [], followers: [], crew: {}, siteNpc: {}, itemSeq: 1,
});
G.audio = new Sound(); G.voice = new Voice(() => G.audio.on); G.world = new World(canvas); G.ui = new UI(G);
G.astro = new Astronaut(0xff7a1a); G.rego = new Rego(); G.regoFollow = new Follower(); G.astro.lamp.visible = true; G.world.scene.add(G.astro.group, G.rego.group);
G.lampMounts = [G.astro, G.rego].map((a) => { const m = new THREE.Group(); m.add(a.lamp, a.lamp.target); G.world.scene.add(m); return [m, a.group]; });   // lamps outside the bodies: hiding a body must not change the light count
const P = G.player, cam = G.cam, world = G.world, ui = G.ui;
world.onPart = () => G.audio.play('step');
world.onLock = (kind) => { G.audio.play(kind); if (kind === 'hiss' && !G._lockTip && G.state === 'play' && P.zone === 'deep' && Math.abs(P.pos.x - (AIRLOCK.x0 + AIRLOCK.x1) / 2) < 12 && Math.abs(P.pos.z) < 8) { G._lockTip = 1; ui.toast('Airlock: the door behind you shuts, the air is pumped back into the tanks, and only then does the next door open. The two doors are never open together.'); } };   // a part dropping into place during a build
G.dig = { x: MINE.x - 10, z: MINE.z + 9, yaw: 2.3, v: 0, load: 0, prog: 0, boom: 0, dig: 0, dry: 0 };   // the digger at the Polar Ice Mine
const groundY = (zone, x, z) => (zone === 'top' ? world.heightAt(x, z) : TUBE.y);
$('#b-power').innerHTML = IC.bolt + '<small>Power<kbd>Tab</kbd></small>'; $('#b-map').innerHTML = IC.map + '<small>Map<kbd>M</kbd></small>'; $('#b-ask').innerHTML = IC.bot + '<small>Ask REGO<kbd>H</kbd></small>'; $('#b-data').innerHTML = IC.book + '<small>Guide<kbd>N</kbd></small>';
$('#b-view').innerHTML = IC.eye + '<small>View<kbd>V</kbd></small>'; $('#b-speed').innerHTML = IC.speed + '<small id="speed-l">×1</small>'; $('#b-pause').innerHTML = IC.pause + '<small>Pause<kbd>P</kbd></small>'; $('#b-sound').innerHTML = IC.sound; $('#hp-ic').innerHTML = IC.heart;

// ---------- things you can carry ----------
G.spawnItem = (type, zone, x, z, where = 'ground') => { const it = { id: G.itemSeq++, type, zone, x, z, where, rot: Math.random() * 3, mesh: world.makeItem(type) }; world.scene.add(it.mesh); G.items.push(it); return it; };
G.removeItem = (it) => { world.scene.remove(it.mesh); G.items.splice(G.items.indexOf(it), 1); if (P.carry === it) P.carry = null; for (const v of [G.car, G.ship]) { const i = v.cargo.indexOf(it); if (i >= 0) v.cargo.splice(i, 1); } };
G.take = (it) => { for (const v of [G.car, G.ship]) { const i = v.cargo.indexOf(it); if (i >= 0) v.cargo.splice(i, 1); } it.where = 'hand'; it.zone = P.zone; P.carry = it; G.audio.play('blip'); };
G.drop = (x = P.pos.x + Math.sin(P.face) * 1.6, z = P.pos.z + Math.cos(P.face) * 1.6) => { const it = P.carry; if (!it) return; it.where = 'ground'; it.zone = P.zone; it.x = x; it.z = z; it.rot = P.face;
  const d = G.dragP; if (ITEMS[it.type].heavy && d && d.id === it.id) { it.x = d.cx; it.z = d.cz; it.rot = d.yaw; }   // a dragged panel stays where it lies
  P.carry = null; G.audio.play('step'); return it; };
G.load = (veh) => { const it = P.carry, v = G[veh]; if (!it || v.cargo.length >= v.max) return false; it.where = veh; it.zone = 'top'; v.cargo.push(it); P.carry = null; G.audio.play('ok'); return true; };
function placeItems() {
  const heavy = (it) => ITEMS[it.type].heavy;
  for (const it of G.items) {
    const m = it.mesh; m.scale.setScalar(1);
    if (it.where === 'ground') { m.visible = it.zone === P.zone; if (m.visible) { m.position.set(it.x, groundY(it.zone, it.x, it.z) + 0.05, it.z); m.rotation.set(0, it.rot, 0); } }
    else if (it.where === 'hand') { m.visible = true; const fx = Math.sin(P.face), fz = Math.cos(P.face);
      if (heavy(it)) {   // dragged like a sled: you hold the near edge at hip height, the far edge scrapes along the ground and swings round behind you
        const d = G.dragP || (G.dragP = {}), L = 4.85, hx = P.pos.x - fx * 0.45, hz = P.pos.z - fz * 0.45;
        if (d.id !== it.id || d.zone !== P.zone || Math.hypot(d.tx - hx, d.tz - hz) > 9) { d.id = it.id; d.zone = P.zone; d.tx = hx - fx * L; d.tz = hz - fz * L; d.run = 0; }
        let bx = d.tx - hx, bz = d.tz - hz; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl; const ntx = hx + bx * L, ntz = hz + bz * L; d.run += Math.hypot(ntx - d.tx, ntz - d.tz); d.tx = ntx; d.tz = ntz;
        const hy = P.pos.y + 0.95, ty = groundY(P.zone, d.tx, d.tz) + 0.1, sp = Math.hypot(P.vel.x, P.vel.z); d.cx = (hx + d.tx) / 2; d.cz = (hz + d.tz) / 2; d.yaw = Math.atan2(-bz, bx);
        m.position.set(d.cx, (hy + ty) / 2 - 0.1, d.cz); m.rotation.set(Math.sin(performance.now() * 0.012) * 0.04 * Math.min(1, sp / 3), d.yaw, -Math.asin(clamp((hy - ty) / 5, -0.6, 0.6)), 'YXZ');
        if (P.zone === 'top' && d.run > 0.55) { d.run = 0; world.scuff(d.tx, d.tz, d.yaw); world.puff(d.tx, d.tz, 3, -P.vel.x * 0.15, -P.vel.z * 0.15, 0.8, 1.4); }
      }
      else { m.position.set(P.pos.x + fx * 0.75, P.pos.y + 0.75, P.pos.z + fz * 0.75); m.rotation.set(0, P.face, 0); m.scale.setScalar(0.7); } }
    else { const v = G[it.where], i = v.cargo.indexOf(it), s = Math.sin(v.yaw), c = Math.cos(v.yaw), by = (it.where === 'car' ? 1.55 + (v.bob || 0) : 3.1) + (it.where === 'ship' ? v.y : world.heightAt(v.x, v.z)); m.visible = P.zone === 'top';
      const back = it.where === 'car' ? -1.15 : -1.0; let ox = 0, oz = back, oy = 0;
      if (heavy(it)) { oy = v.cargo.filter((q, k) => k < i && heavy(q)).length * 0.16; m.scale.setScalar(0.5); } else { const k = v.cargo.filter((q, kk) => kk < i && !heavy(q)).length; ox = (k % 2 ? 0.55 : -0.55); oz = back + (k > 1 ? 0.55 : -0.45); oy = v.cargo.some(heavy) ? 0.35 : 0; m.scale.setScalar(0.7); }
      m.position.set(v.x + s * oz + c * ox, by + oy, v.z + c * oz - s * ox); m.rotation.set(0, v.yaw + (heavy(it) ? Math.PI / 2 : 0), 0); }
  }
}

// ---------- NPCs: mentors (training), survivors at other stations, followers, crew in the station ----------
G.addNpc = (who, color, x, z, zone = 'top') => { const a = new Astronaut(color), n = { a, who, x, z, zone }; world.scene.add(a.group); G.npcs.push(n); return n; };
G.moveNpc = (n, x, z, zone) => { n.x = x; n.z = z; if (zone) n.zone = zone; };
G.clearNpcs = () => { for (const n of G.npcs) world.scene.remove(n.a.group); G.npcs = []; };
const SITE_COL = { ingrid: 0x1fb5a8, kenji: 0x9a5cff, anika: 0x3fbf5a, vasquez: 0xd8322a, okoro: 0x2a62d8 };
G.spawnSurvivors = () => { for (const s of SITES) if (!G.S.rescued.includes(s.id) && !G.siteNpc[s.id] && !G.followers.some((f) => f.site.id === s.id)) { const a = new Astronaut(SITE_COL[s.who]); world.scene.add(a.group); G.siteNpc[s.id] = { a, x: s.pos[0] + 5, z: s.pos[1] + 14 }; } };
G.follow = (site) => { const n = G.siteNpc[site.id]; if (!n) return; delete G.siteNpc[site.id]; G.followers.push({ site, a: n.a, x: n.x, z: n.z }); };
function updateActors(dt) {
  for (const n of G.npcs) { const a = n.a.group; a.visible = n.zone === P.zone; a.position.set(n.x, groundY(n.zone, n.x, n.z), n.z); a.rotation.y = Math.atan2(P.pos.x - n.x, P.pos.z - n.z); n.a.setSuit(!(n.zone === 'deep' && world.indoors(n.x, n.z))); n.a.update(dt, 0, false, Math.hypot(P.pos.x - n.x, P.pos.z - n.z) < 14 && G.goal ? 'wave' : 'walk'); }
  for (const id in G.siteNpc) { const n = G.siteNpc[id], a = n.a.group; a.visible = P.zone === 'top'; a.position.set(n.x, world.heightAt(n.x, n.z), n.z); a.rotation.y = Math.atan2(P.pos.x - n.x, P.pos.z - n.z); n.a.update(dt, 0, false, Math.hypot(P.pos.x - n.x, P.pos.z - n.z) < 40 ? 'wave' : 'walk'); }
  G.followers.forEach((f, i) => { const a = f.a.group; a.visible = P.zone === 'top' && !P.in; const lead = i ? G.followers[i - 1] : { x: P.pos.x, z: P.pos.z }, tx = lead.x - Math.sin(P.face + 0.6) * 2.6, tz = lead.z - Math.cos(P.face + 0.6) * 2.6; let sp = 0; f.fol = f.fol || new Follower();
    if (P.in || P.zone !== 'top') { f.x = tx; f.z = tz; f.fol.reset(); } else { const m = f.fol.update(dt, f, { x: lead.x, z: lead.z, face: P.face }, topFree); sp = Math.min(m.speed, 9); if (sp > 0.5) a.rotation.y = Math.atan2(m.dx, m.dz); } a.position.set(f.x, world.heightAt(f.x, f.z), f.z); f.a.update(dt, sp); });
  // crew inside the station walk around the room that matches their job
  const S = G.S; if (!S) return; const roomOf = { idle: 'quarters', farm: 'potato', cook: 'kitchen', clean: null, build: 'workshop' };
  // Each crew member walks through the doors to a real spot in the room for their job, works there for a while, then moves to
  // another, sometimes carrying a crate. At mealtimes the people sit down at the kitchen table. Looks only: the sim does not change.
  const hr = S.t % 24, win = hr >= 7 && hr < 9 ? 0 : hr >= 12 && hr < 14 ? 1 : hr >= 18 && hr < 20 ? 2 : -1, mealId = win < 0 ? null : Math.floor(S.t / 24) * 3 + win, usable = (id) => { const r = S.rooms[id]; return r && r.built >= 1 && !r.frozen && r.p > 60; };
  const spotsOf = (def) => { const q = roomRect(def), sd = def.side, cx = (q.x0 + q.x1) / 2, [kx, kz] = roomSpot(def), back = sd * 21.6;
    return [{ x: kx + 1.4, z: kz - sd * 0.9, lx: kx, lz: kz }, { x: q.x0 + 2.6, z: sd * 13, lx: q.x0, lz: sd * 13 }, { x: q.x1 - 2.6, z: sd * 13, lx: q.x1, lz: sd * 13 }, { x: cx - 3.2, z: back, lx: cx - 3.2, lz: sd * 24 }, { x: cx + 3.2, z: back, lx: cx + 3.2, lz: sd * 24 }]; };
  let seat = 0;
  for (const h of S.helpers) {
    let c = G.crew[h.id]; if (!c) { const actor = h.kind === 'bot' ? new Bolt() : new Astronaut(SITE_COL[h.id] || 0x888888); actor.setSuit?.(false); world.scene.add(actor.group); c = G.crew[h.id] = { actor, x: -58 + Math.random() * 6, z: -1.5 + Math.random() * 3, path: [], t: 0, key: null, at: null, stuck: 0 };
      if (h.kind !== 'bot') { c.crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.4), new THREE.MeshStandardMaterial({ color: 0xc9772e, roughness: 0.8 })); c.crate.position.set(0, 1.1, 0.44); c.crate.visible = false; actor.group.add(c.crate); } }
    const g = c.actor.group; g.visible = P.zone === 'deep'; if (!g.visible) continue;
    const human = h.kind !== 'bot', eat = human && ((mealId !== null && c.ate !== mealId) || c.mealGo != null) && usable('kitchen') && S.meals + S.cans >= 1, want = eat ? 'kitchen' : h.kind === 'bot' && h.role === 'idle' ? null : roomOf[h.role], rid = want && usable(want) ? want : null, def = rid && ROOMS.find((r) => r.id === rid);
    if (eat && c.mealGo == null) c.mealGo = mealId; if (!eat) c.mealGo = null;   // once on the way to a meal, finish it even if the hour runs out
    const key = (rid || 'hall') + (eat ? ':eat' : ''), mySeat = eat ? seat++ : 0;
    const pick = () => {   // where to go next
      if (eat) { const q = roomRect(def), tx = (q.x0 + q.x1) / 2, tz = (q.z0 + q.z1) / 2 + 2, a = (mySeat % 4) * Math.PI / 2 + 0.785; return { x: tx + Math.cos(a) * 2.15, z: tz + Math.sin(a) * 2.15, lx: tx, lz: tz, sit: true }; }
      if (!def) return { x: -58 + Math.random() * 22, z: -1.5 + Math.random() * 3 };
      const all = spotsOf(def).filter((s) => s !== c.at && !(c.at && Math.hypot(s.x - c.at.x, s.z - c.at.z) < 1)); return all[Math.floor(Math.random() * all.length)]; };
    const go = (s, carry) => { c.at = s; c.carry = !!carry; c.stuck = 0; const inDoor = Math.abs(c.z) > 2 && Math.abs(c.z) < 7.6, r = world._guideRoute(c.x, inDoor ? 0 : c.z, s.x, s.z).slice(1), out = inDoor ? [[c.x, 0]] : [];   // caught in a doorway: step out into the hall first
      r.forEach((p, i) => { const door = Math.abs(Math.abs(p[1]) - 5.6) < 0.01, sd = Math.sign(p[1]), leaving = door && r[i + 1] && r[i + 1][1] === 0; if (door && leaving) out.push([p[0], sd * 8.4]); out.push(p); if (door && !leaving) out.push([p[0], sd * 8.4]); }); c.path = out; };   // straight through each doorway, never across its corner
    if (c.key !== key) { c.key = key; go(pick(), false); }
    let sp = 0;
    if (c.path.length) { const [wx, wz] = c.path[0], dx = wx - c.x, dz = wz - c.z, d = Math.hypot(dx, dz); c.stuck += dt;
      if (d < 0.3 || c.stuck > d / 3 + 5) { c.path.shift(); c.stuck = 0; if (!c.path.length) c.t = eat ? 1e9 : 5 + Math.random() * 6; }
      else { c.stuck -= dt * 0.999 * (d > 4 ? 1 : 0); sp = c.carry ? 2.6 : 3.6; c.x += (dx / d) * sp * dt; c.z += (dz / d) * sp * dt; if (c.path.length === 1) pushOut(c, 'deep', 0.35); g.rotation.y = Math.atan2(dx, dz); } }
    else { c.t -= dt; if (c.at && c.at.lx !== undefined) { const want2 = Math.atan2(c.at.lx - c.x, c.at.lz - c.z); let dy = want2 - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 6); }
      if (c.t <= 0) go(pick(), human && h.role !== 'idle' && Math.random() < 0.35); }   // sometimes the next trip is a delivery
    g.position.set(c.x, TUBE.y, c.z); const arrived = !c.path.length, busy = arrived && h.role !== 'idle' && !eat && !!def, sitting = arrived && eat;
    if (sitting) { c.sat = (c.sat || 0) + dt; if (c.sat > 14) { c.ate = c.mealGo; c.mealGo = null; c.sat = 0; } }   // a meal takes a little while, then back to work
    if (c.crate) c.crate.visible = !!c.carry && !arrived;
    if (!human) c.actor.update(dt, sp, busy); else c.actor.update(dt, sp, false, sitting ? 'sit' : busy ? 'work' : c.carry && !arrived ? 'carry' : 'walk', busy ? { tool: { farm: 'pick', cook: 'stir', clean: 'brush', build: 'wrench' }[h.role], aim: -0.45 } : null);
  }
}

// ---------- guide beam / goals ----------
// A target can be a station id, 'car', 'ship', or { zone, x, z, name }.
G.resolve = (t) => { if (!t) return null; if (typeof t !== 'string') return t; if (t === 'car' || t === 'ship') return { zone: 'top', x: G[t].x, z: G[t].z, name: t === 'car' ? 'Rover' : 'Hopper', id: t }; const s = STATIONS.find((q) => q.id === t); if (s) return { zone: s.zone, x: s.pos[0], z: s.pos[1], name: s.name, id: s.id, r: s.r }; const site = SITES.find((q) => q.id === t); if (site) return { zone: 'top', x: site.pos[0] + 2, z: site.pos[1] + 16, name: site.name, id: site.id, r: 9 }; const room = ROOMS.find((q) => q.id === t); return room ? { zone: 'deep', x: room.door, z: room.side * 9.5, name: room.name, id: t, r: 4 } : null; };
G.pointTo = (t, text) => { const r = G.resolve(t); if (!r) return; G.goal = { ...r, text: text || null, cb: null, cond: null }; };
G.goTo = (t, text) => new Promise((res) => { const r = G.resolve(t); G.goal = { ...r, text, cb: res, cond: null }; });
G.waitFor = (cond, text, t) => new Promise((res) => { const r = G.resolve(t) || {}; G.goal = { ...r, text, cb: res, cond }; });
function updateGoal() {
  const g = G.goal; $('#goal-x').classList.toggle('hidden', !(g && g.sticky && G.state === 'play')); world.guideForce = !!(g && g.sticky);   // advice you asked for always draws its line, even with guide mode off
  if (!g) { if (world.target) world.setTarget(null); ui.objective(null); return; }
  if (g.id === 'car' || g.id === 'ship') { g.x = G[g.id].x; g.z = G[g.id].z; }
  if (!g.cb && ((g.id === 'gate' && P.zone === 'deep') || (g.id === 'lift' && P.zone === 'top'))) { G.goal = null; world.setTarget(null); ui.objective(null); return; }
  const has = g.zone !== undefined, same = has && g.zone === P.zone;
  // No suit, and the goal is outside the station? Then the first stop is the Suit Lockers.
  const suitFirst = has && P.zone === 'deep' && G.S && !G.S.suitOn && (!same || !world.indoors(g.x, g.z));
  const tgt = !has ? null : suitFirst ? G.resolve('suit') : same ? g : G.resolve(P.zone === 'top' ? 'gate' : 'lift');
  if (tgt) world.setTarget({ zone: tgt.zone, x: tgt.x, z: tgt.z, id: tgt.id }); else world.setTarget(null);
  // A small strip at the top: an arrow that turns toward the place, what to do, how far.
  let arr = '<i class="dot"></i>', tail = '';
  if (tgt) { const dx = tgt.x - P.pos.x, dz = tgt.z - P.pos.z, d = Math.hypot(dx, dz), sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw), a = Math.round((Math.atan2(dx * cy - dz * sy, -dx * sy - dz * cy) * 57.3) / 15) * 15;
    arr = `<i class="arr" style="transform:rotate(${a}deg)">▲</i>`; tail = `<small>${d < 30 ? Math.round(d) : Math.round(d / 5) * 5} m${suitFirst ? ' · suit up at the airlock first' : !same ? ' · take the elevator' : ''}</small>`; }
  ui.objective(`${arr}<span>${g.text || 'Go to: ' + g.name}</span>${tail}`);
  const near = same && Math.hypot(g.x - P.pos.x, g.z - P.pos.z) < (g.r || 5) + 1;
  if (g.cond ? g.cond() : near && !g.sticky) { G.goal = null; world.setTarget(null); ui.objective(null); g.cb?.(); }
}
// REGO says something, but not the same thing over and over
G.warn = (key, html, mood = 'worried', gap = 5000) => { const now = performance.now(), w = G._warn || (G._warn = {}); if (w[key] && now - w[key] < gap) return; w[key] = now; ui.bubble(html, mood, 7); G.audio.play('bad'); };
G.ride = async (to) => {
  if (P.in) return; G.riding = true; G.audio.play('lift'); await ui.fade(true);
  P.zone = to; if (G.S) G.S.zone = to; world.setZone(to); P.vel.set(0, 0, 0); P.vy = 0;
  if (to === 'deep') { P.pos.set(TUBE.skyX + 6, TUBE.y, 1.5); cam.yaw = -Math.PI / 2; P.face = Math.PI / 2; } else { P.pos.set(0, world.heightAt(0, 54), 54); cam.yaw = 0.2; P.face = Math.PI; }
  G.regoPos.set(P.pos.x + 1.5, P.pos.y, P.pos.z + 1.5); if (P.carry) P.carry.zone = to; G.dragP = null;
  if (to === 'deep' && G.followers.length && G.S) { for (const f of G.followers) { world.scene.remove(f.a.group); addHelper(G.S, f.site); const thanks = { ingrid: 'Walls and air you do not carry on your back. Thank you! Give me a job in the Control Center. And while I am here, the rover and hopper go further.', kenji: 'Real walls again! Thank you. Put me on Builder in the Control Center and every repair goes faster.', anika: 'Oh, you have farms! Thank you. Put me on Farm duty in the Control Center and the crops will grow faster.' }[f.site.who] || `Thank you! ${f.site.perk}`;
      setTimeout(() => { ui.toast(`${f.site.whoName} is safe inside the station and joins your crew! ${f.site.perk}`, 'good'); if (!ui.busy) ui.say([{ who: f.site.who, text: thanks }, { who: 'rego', mood: 'joy', text: 'Welcome to Tranquility Deep! One more person means more food, water and air every day, so keep an eye on the gauges.' }]); }, 900); } G.followers = []; }
  if (G.simOn) G.simAdvance(0.2);
  await ui.fade(false); G.riding = false;
  if (G.state === 'play') ui.toast(to === 'deep' ? '105 m down, inside the lava tube. Under the rock roof it is a steady 17°C with almost no radiation — but there is no air. The station is straight ahead: follow the blue lights.' : `Topside. It is ${Math.round(G.S.flow.sun.tempC)}°C out here, and every hour adds a little radiation.`);
};

// ---------- time ----------
G.simAdvance = (h) => { const S = G.S; while (h > 1e-6 && !S.over) { const d = Math.min(h, 0.05); step(S, d); h -= d; } };
// A build / fix scene that plays by itself: the camera circles, you and REGO work, the clock races, parts appear step by step.
// Which tool fits this job? (Callers can also pass `tool` themselves.)
const toolFor = (title, tag) => tag === 'cook' ? 'stir' : /spacesuit/i.test(title) ? 'suit' : /Picking|Replanting|Clearing the rack|digester/i.test(title) ? 'pick' : /Brushing/i.test(title) ? 'brush' : /Patching|Rebuilding|Sealing|Repairing/i.test(title) ? 'weld' : 'wrench';
// Every job starts with a short hands-on game that matches the work; then the animation shows the character doing it.
// A job can pass `mini: false` to skip it or `mini: 'name'` to choose one. Settings can switch all of them off.
// Each job is a list of steps taken from how the real work is done: make it safe, do the work, then test it.
// [core, steps]: Cadet plays only the core step, Pilot the core step and one more, Commander and Unlimited the whole procedure.
const SAFE = (what) => ['safe', { title: 'Make it safe', how: `Before touching ${what}, drag each breaker lever all the way DOWN to OFF. Work from left to right.`, winText: 'Power is off!' }];
const TEST = (title, unit, max, how, winText) => ['gauge', { title, unit, max, how, winText }];
const procFor = (title, tag, tool) => {
  const T = (re) => re.test(title);
  if (T(/spacesuit/i)) return [0, [['suit', T(/Taking off/i) ? { title: 'Unlock the suit seals', winText: 'Suit off!' } : { title: 'Check the suit seals', winText: 'Suit sealed!' }], ...(T(/Putting on/i) ? [TEST('Suit leak check', 'kPa', 60, 'Drag the valve wheel to fill the suit with air. Hold the needle in the GREEN band: if it stays steady, the suit has no leaks.', 'No leaks!')] : [])]];
  if (T(/Brushing/i)) return [0, [['wipe', { winText: 'Spotless!' }], TEST('Test the panel output', 'V', 120, 'Drag the wheel to connect the load. Hold the needle in the GREEN band to prove the clean panels are making full power.', 'Full power!')]];
  if (T(/Pulling the broken panel/i)) return [1, [SAFE('the broken panel'), ['bolts', { title: 'Loosen the bolts', winText: 'Panel free!' }]]];
  if (T(/Installing the solar panel/i)) return [0, [['bolts', { title: 'Tighten the bolts', winText: 'Panel on!' }], ['wires', { title: 'Plug in the power cables', winText: 'Connected!' }], TEST('Test the panel output', 'V', 120, 'Drag the wheel to connect the load. Hold the needle in the GREEN band to prove the new panel works.', 'Making power!')]];
  if (T(/battery module/i)) return [1, [SAFE('the battery rack'), ['wires', { title: 'Connect the battery cables', winText: 'Connected!' }], TEST('Check the charge voltage', 'V', 60, 'Drag the wheel to bring the charger up. Hold the needle in the GREEN band: too high would damage the new module.', 'Charging!')]];
  if (T(/heater circuit/i)) return [1, [SAFE('the heater circuit'), ['wires', { title: 'Rewire the heater circuit', winText: 'Rewired!' }], TEST('Set the heater current', 'A', 30, 'Drag the wheel to bring the heater up. Hold the needle in the GREEN band.', 'Warming up!')]];
  if (T(/Sealing/i)) return [0, [['leaks', { winText: 'Sealed!' }], TEST('Bring the pressure back', 'kPa', 300, 'Drag the valve wheel to open the water line again. Hold the needle in the GREEN band: a steady needle means the joint is tight.', 'Holding pressure!')]];
  if (T(/Patching/i)) return [0, [['weld', { title: 'Weld the patch', winText: 'Airtight!' }], TEST('Refill the room with air', 'kPa', 101, 'Drag the valve wheel to let air back in. Hold the needle in the GREEN band: if it stays steady, the patch is airtight.', 'Pressure is holding!')]];
  if (T(/Rebuilding/i)) return [0, [['bolts', { title: 'Bolt the machines back', how: 'Hold the wrench on each bolt until it has turned all the way, then let go. Do all six.', winText: 'All bolted down!' }], ['wires', { title: 'Wire the lights and machines', winText: 'Power on!' }], TEST('Refill the room with air', 'kPa', 101, 'Drag the valve wheel to let air back in. Hold the needle in the GREEN band to prove the room is airtight.', 'Room is airtight!')]];
  if (T(/Repairing/i)) return [1, [SAFE('the oxygen plant'), ['weld', { title: 'Weld the cracked casing', winText: 'Repaired!' }], TEST('Bring the furnace up to heat', '°C', 1600, 'Drag the wheel to feed power to the furnace. Hold the needle in the GREEN band: hot enough to free the oxygen, not so hot it cracks again.', 'Making oxygen!')]];
  if (tag === 'cook' || T(/Cooking/i)) return [0, [['stir', { winText: 'Smells good!' }]]];
  if (T(/digester/i)) return [0, [['stir', { title: 'Mix the digester', how: 'Hold and drag in circles to mix the waste tank. Keep going until the bar is full.', col: '#5d7a3a', winText: 'Well mixed!' }], TEST('Vent the digester gas', 'kPa', 200, 'Drag the valve wheel to let gas out of the tank. Hold the needle in the GREEN band.', 'Pressure is safe!')]];
  if (T(/Picking/i)) return [0, [['harvest', {}]]];
  if (T(/Replanting/i)) return [0, [['plant', { winText: 'Planted!' }], TEST('Set the nutrient flow', 'L/h', 40, 'Drag the valve wheel to send plant food to the roots. Hold the needle in the GREEN band: too little starves them, too much burns them.', 'Roots are fed!')]];
  if (T(/Clearing the rack/i)) return [0, [['plant', { title: 'Rinse the cups', how: 'Click every cup once to rinse it out. Clicking a cup twice wastes a second.', noun: 'Cups rinsed', winText: 'Rack clean!' }]]];
  if (T(/Unloading/i)) return [0, [['stack', { winText: 'Stacked!' }]]];
  if (T(/Servicing/i)) return [1, [SAFE('the Water Plant'), ['bolts', { title: 'Open the service hatch', winText: 'Hatch open!' }], TEST('Set the chamber pressure', 'Pa', 900, 'Drag the valve wheel to pump the chamber down. Hold the needle in the GREEN band: in a near-vacuum, ice turns straight into vapour.', 'Ready to extract!')]];
  return [0, [[{ weld: 'weld', pick: 'plant', brush: 'wipe', stir: 'stir', suit: 'suit' }[tool] || 'bolts', {}]]];
};
const stagesFor = (o) => {
  if (typeof o.mini === 'string') return [[o.mini, {}]];
  const [core, all] = procFor(o.title, o.tag, o.tool || toolFor(o.title, o.tag)), tier = { cadet: 0, pilot: 1, commander: 2, unlimited: 2 }[G.S?.mode] ?? 1;
  if (tier >= 2 || all.length === 1) return all; if (tier === 0) return [all[core]];
  const other = core > 0 ? core - 1 : 1; return all.filter((q, i) => i === core || i === other);
};
G.playMini = (kind, opts) => playMini(G, kind, opts);   // the Space Guide's practice page uses this
G.minis = (() => { try { return localStorage.getItem('mk-minis') !== '0'; } catch (e) { return true; } })();
G.setMinis = (on) => { G.minis = !!on; try { localStorage.setItem('mk-minis', G.minis ? '1' : '0'); } catch (e) {} };
G.minisAll = (() => { try { return localStorage.getItem('mk-minis-all') === '1'; } catch (e) { return false; } })();
G.setMinisAll = (on) => { G.minisAll = !!on; try { localStorage.setItem('mk-minis-all', G.minisAll ? '1' : '0'); } catch (e) {} };
G.job = async (o) => { G.inJob = (G.inJob || 0) + 1; try { return await doJob(o); } finally { G.inJob--; } };
const doJob = async (o) => {
  let fx = null;
  if (G.minis && o.mini !== false && (G.minisAll || o.hours >= 1 || typeof o.mini === 'string')) {   // quick jobs (suit, unloading, replanting) skip the game unless "every job" is switched on
    ui.prompt(null); const r = await playProcedure(G, stagesFor(o).map(([k, opt]) => [k, { loseText: 'Done the slow way', ...opt }]));
    const q = !r.win || (/Picking/i.test(o.title) && r.stars <= 1) ? 'poor' : r.stars >= 3 ? 'great' : 'ok';   // harvest never fails on time, so one star counts as a poor harvest
    fx = G.S ? jobEffect(o.title, o.tag, q) : null;
    if (q === 'poor') { o = { ...o, hours: o.hours * 1.3 }; ui.toast('That was fiddly, so the job takes 30% longer.'); }
    else if (q === 'great') { o = { ...o, hours: o.hours * 0.85 }; ui.toast('Clean work! The job goes 15% faster.', 'good'); }
    if (fx) fx.push(q);
  }
  const out = await runJob(o);
  if (fx && G.S) setTimeout(() => { fx[0](G.S); ui.toast(fx[1], fx[2] === 'great' ? 'good' : 'bad'); }, 0);   // after the caller has applied the job's own result
  return out;
};
// Job camera. Instead of circling (which put the camera inside panels and behind racks), pick spots with a clear
// view of both the worker and the work: over a shoulder first, then from the side. Returns the best two, well apart.
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const jobShots = (sp) => {
  const zone = P.zone, deep = zone === 'deep', room = deep ? world.roomAt(P.pos.x, P.pos.z) : null, inD = deep && world.indoors(P.pos.x, P.pos.z), cols = deep ? world.colliders[zone] : world.colliders[zone].concat([G.car, G.ship, G.dig].map((v) => ({ x: v.x, z: v.z, r: 3.4 })));   // a parked rover or hopper blocks the view too
  const d0 = Math.hypot(sp.x - P.pos.x, sp.z - P.pos.z), f = d0 > 0.01 ? Math.min(0.45, 1.2 / d0) : 0, cx = P.pos.x + (sp.x - P.pos.x) * f, cz = P.pos.z + (sp.z - P.pos.z) * f;   // look between the worker and the work
  const free = (x, z, pad) => (!deep || (world.walkable(x, z) && world.roomAt(x, z) === room && world.indoors(x, z) === inD)) && !cols.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + pad);
  const back = P.face + Math.PI, out = [];
  for (const d of deep ? [5.2, 4.1, 3.2] : [7, 5.5, 4.2]) for (const a of [0.85, -0.85, 1.45, -1.45, 0.35, -0.35, 2.2, -2.2]) {
    const yaw = back + a, x = cx + Math.sin(yaw) * d, z = cz + Math.cos(yaw) * d;
    if (free(x, z, 0.5) && free(cx + (x - cx) * 0.5, cz + (z - cz) * 0.5, 0.1) && free(cx + (x - cx) * 0.78, cz + (z - cz) * 0.78, 0.2)) out.push({ yaw, d }); }
  // the camera swings from the first angle to the second, so the whole arc between them has to be clear too (not through a parked rover)
  const sweep = (p, q) => { const dy = wrapA(q.yaw - p.yaw); for (let t = 0.2; t < 1; t += 0.2) { const yaw = p.yaw + dy * t, d = p.d + (q.d - p.d) * t; if (!free(cx + Math.sin(yaw) * d, cz + Math.cos(yaw) * d, 0.3)) return false; } return true; };
  const A = out[0] || { yaw: back + 0.85, d: 3 }, B = out.find((s) => Math.abs(wrapA(s.yaw - A.yaw)) > 0.9 && sweep(A, s)) || out.find((s) => s !== A && Math.abs(wrapA(s.yaw - A.yaw)) > 0.3 && sweep(A, s)) || { yaw: A.yaw, d: A.d * 0.85 };
  return { A, B, f };
};
const runJob = ({ title, hours, steps = ['Working…'], site, onStep, pose = 'work', tag, sparks = true, tool }) => new Promise((res) => {
  const S = G.S, real = clamp(3.5 + hours * 1.5, 4.5, 13), hrs = G.simOn ? jobHours(S, hours) * (G.inside && !S.suitOn ? 0.75 : 1) : 0;   // no big gloves indoors: a quarter faster
  let t = 0; tool = tool || toolFor(title, tag); const J = (G.jobbing = { pose, tag, tool, aim: -0.25, site: null }); ui.prompt(null);
  const sp = site ? world.at(P.zone, site.x, site.z, site.y || 0) : P.pos.clone(), workY = sp.y + (site && site.y ? 0.6 : tool === 'pick' ? 0.95 : 1.15);   // the height the hands go to
  // Walk up to the job first: stop 1.5 m short of it. Never through a wall, and never into a room without air unless suited.
  let walk = null;
  if (site) { const dx = sp.x - P.pos.x, dz = sp.z - P.pos.z, d = Math.hypot(dx, dz); P.face = Math.atan2(dx, dz); J.site = sp;
    const stand = site.r || 1.5; if (d > stand + 0.7 && d < 16) { let go = d - stand; if (P.zone === 'deep') { let ok = 0; for (let q = 0.4; q <= go + 1e-6; q += 0.4) { const x = P.pos.x + (dx / d) * q, z = P.pos.z + (dz / d) * q, rid = world.roomAt(x, z); if (!world.walkable(x, z) || (rid && S && !S.suitOn && S.rooms[rid].p < 60)) break; ok = q; } go = ok; }
      if (go > 0.6) walk = { x0: P.pos.x, z0: P.pos.z, x1: P.pos.x + (dx / d) * go, z1: P.pos.z + (dz / d) * go, t: clamp(go / 5.5, 0.5, 2.2) }; } }
  const lit = pose === 'work' && sparks && tool === 'weld'; G.rego.work = true; const pitch0 = cam.pitch, dist0 = cam.dist; cam.fp = false; if (!walk) world.sparks(lit ? sp : null);
  G.jobTick = (dt) => {
    t += dt; const tw = walk ? walk.t : 0, k = Math.min(1, Math.max(0, t - tw) / real); if (hrs && t > tw) G.simAdvance((hrs * dt) / real);
    if (walk && t < tw) { const u = t / tw, e = u * u * (3 - 2 * u); P.pos.x = walk.x0 + (walk.x1 - walk.x0) * e; P.pos.z = walk.z0 + (walk.z1 - walk.z0) * e; P.vel.set(0, 0, 0); J.pose = 'walk'; J.speed = 5.5 * Math.sin(u * Math.PI) + 1; G.stepT += dt * J.speed; if (G.stepT > 4.2) { G.stepT = 0; G.audio.play('step'); if (P.zone === 'top') world.puff(P.pos.x, P.pos.z, 4, 0, 0, 0.9, 0.8); } }
    else { if (walk) { walk = null; world.sparks(lit ? sp : null); } J.pose = pose; J.speed = 0; const d = Math.hypot(sp.x - P.pos.x, sp.z - P.pos.z); P.face = d > 0.3 ? Math.atan2(sp.x - P.pos.x, sp.z - P.pos.z) : P.face; J.aim = Math.atan2(workY - (P.pos.y + 1.5), Math.max(0.7, d)); G.rego.workAim = Math.atan2(workY - (G.regoPos.y + 0.65), Math.max(0.6, Math.hypot(sp.x - G.regoPos.x, sp.z - G.regoPos.z))); }
    if (t < tw) { cam.pitch += (0.34 - cam.pitch) * dt * 2; cam.dist += (7 - cam.dist) * dt * 2; }   // walking over: just settle
    else { const sh = J.shots || (J.shots = jobShots(sp)), s = k < 0.55 ? sh.A : sh.B, deepZ = P.zone === 'deep', ez = Math.min(1, dt * (k < 0.55 ? 2.2 : 1.5));   // second angle for the second half
      cam.yaw += wrapA(s.yaw + Math.sin(t * 0.33) * 0.1 - cam.yaw) * ez; cam.pitch += ((J.high ? 0.03 : deepZ ? 0.3 : 0.36) - cam.pitch) * dt * 2; cam.dist += (s.d * (1 - 0.1 * k) - cam.dist) * ez;   // a slow drift and push-in, never a spin
      J.fk = Math.min(1, (J.fk || 0) + dt * 1.6); J.focus = J.fk * sh.f; J.high = workY - P.pos.y > 3; J.lift = J.high ? (workY - P.pos.y - 1.75) * 0.3 * J.fk : -0.3 * J.fk; }   // work overhead: look up at it from low down
      if (Math.random() < dt * (tool === 'weld' ? 9 : 3) && pose === 'work' && t > tw) G.audio.play('step');
    ui.job(title, k, t < tw ? 'Walking over…' : steps[Math.min(steps.length - 1, Math.floor(k * steps.length))], hrs ? `${fmt.hrs(Math.max(0, hrs * (1 - k)))} to go` : ''); onStep?.(k);
    if (k >= 1) { G.jobTick = null; G.jobbing = null; world.sparks(null); G.rego.work = false; G.rego.workAim = undefined; ui.job(null); cam.pitch = pitch0; cam.dist = dist0; S.stats.jobs++; G.audio.play('ok'); res(); }
  };
});

// ---------- input ----------
addEventListener('keydown', (e) => {
  if (e.key === 'Tab') e.preventDefault(); if (G.state === 'title') return; if (ui.key(e)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; G.keys[k] = true; if (k === ' ') e.preventDefault();
  if (G.state !== 'play' && G.state !== 'tutorial') return; if (G.jobTick || G.riding) return;
  if (k === 'e' || k === 'Enter') G.doAction('e'); else if (k === 'q') G.doAction('q');
  else if (k === 'Tab') { if (G.state === 'play') ui.powerBoard(); } else if (k === 'm') ui.bigMap(); else if (k === 'h') { if (G.state === 'play') G.advise(); }
  else if (k === 'n') ui.guide(); else if (k === 'l') { if (G.state === 'play') G.loopScreen(); } else if (k === 't') { if (G.state === 'play' && G.S) ui.dayNight(); } else if (k === 'v') toggleView(); else if (k === 'p') togglePause();
});
addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; G.keys[k] = false; });
addEventListener('blur', () => (G.keys = {}));
canvas.addEventListener('click', () => { if ((G.state === 'play' || G.state === 'tutorial') && !ui.busy && !G.touch) { try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch (e) { /* embedded pages may forbid mouse lock: dragging still looks around */ } } });
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; if (e.pointerType === 'touch') G.touch = true; });
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', (e) => { if (ui.busy || G.jobTick) return; let dx = 0, dy = 0; if (document.pointerLockElement === canvas) { dx = e.movementX; dy = e.movementY; } else if (drag && e.pointerId === drag.id) { dx = (e.clientX - drag.x) * 1.6; dy = (e.clientY - drag.y) * 1.6; drag.x = e.clientX; drag.y = e.clientY; } if (dx || dy) G.camT = performance.now(); cam.yaw -= dx * 0.0026; cam.pitch = clamp(cam.pitch + dy * 0.0026, cam.fp ? -1.35 : -0.95, cam.fp ? 1.2 : 1.25); });
canvas.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + Math.sign(e.deltaY) * 0.8, 3.5, 22); }, { passive: true });
function toggleView() { cam.fp = !cam.fp; cam.pitch = clamp(cam.pitch, -0.9, 1.1); ui.toast(cam.fp ? 'First-person view. Look up to find Earth!' : 'Third-person view.'); }
function togglePause() { if (G.state !== 'play') return; G.paused = !G.paused; ui.banner(G.paused ? 'PAUSED — press P to continue' : null, true); }
$('#b-power').onclick = () => G.state === 'play' && !ui.busy && ui.powerBoard(); $('#b-map').onclick = () => !ui.busy && G.S && ui.bigMap(); $('#b-ask').onclick = () => G.state === 'play' && !ui.busy && G.advise(); $('#b-data').onclick = () => !ui.busy && ui.guide(); $('#clock').onclick = () => G.S && G.state === 'play' && !ui.busy && ui.dayNight();
$('#b-view').onclick = toggleView; $('#b-pause').onclick = togglePause;
G.setSpeed = (v) => { G.speedMul = v; $('#speed-l').textContent = '×' + v; };
$('#b-speed').onclick = () => G.setSpeed(G.speedMul === 1 ? 2 : G.speedMul === 2 ? 4 : 1);
$('#b-sound').onclick = () => { $('#b-sound').innerHTML = G.audio.toggle() ? IC.sound : IC.mute; };
// Guide mode: a yellow line on the ground to the next place, and REGO marks the button to press in panels. On by default; Settings turns it off.
G.guide = (() => { try { return localStorage.getItem('mk-guide') !== '0'; } catch (e) { return true; } })(); world.guideOn = G.guide;
// ---------- graphics quality: auto, high, medium or low ----------
const stored = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }, store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
G.quality = stored('mk-quality', 'auto'); G._autoQ = stored('mk-quality-auto', 'high'); G.qLevel = () => (G.quality === 'auto' ? G._autoQ : G.quality);
G.setQuality = (q) => { G.quality = q; store('mk-quality', q); world.setQuality(G.qLevel()); fpsN = fpsT = fpsLow = 0; fpsTry = null; };
// Text size: Normal, Large (about a fifth bigger) or Larger (about a third). It scales the words you read: cards, panels, REGO, hints and alerts.
G.textSize = stored('mk-text', 'normal'); G.setTextSize = (v) => { G.textSize = ['normal', 'large', 'larger'].includes(v) ? v : 'normal'; store('mk-text', G.textSize); document.body.dataset.text = G.textSize; }; G.setTextSize(G.textSize);
G.showFps = stored('mk-fps', '0') === '1'; G.setShowFps = (on) => { G.showFps = !!on; store('mk-fps', on ? '1' : '0'); $('#fps').classList.toggle('hidden', !on); };
let fpsLast = 0, fpsN = 0, fpsT = 0, fpsLow = 0, fpsTry = null, fpsStop = false;
// Counts real frames during steady play. On Auto, two slow readings in a row lower the detail one step.
// If a step down does not help (a screen or power setting is capping the rate), it is undone and Auto leaves the detail alone.
function fpsTick(now) {
  const d = now - fpsLast; fpsLast = now;
  if (d <= 0 || d > 250 || document.hidden || G.state !== 'play' || G.paused || ui.busy || G.riding) { fpsN = fpsT = 0; return; }
  fpsN++; fpsT += d; if (fpsT < 2000) return;
  const fps = (fpsN * 1000) / fpsT; fpsN = fpsT = 0; G.fps = fps; if (G.showFps) $('#fps').textContent = Math.round(fps) + ' fps · ' + G.qLevel();
  if (G.quality !== 'auto' || fpsStop) return;
  if (fpsTry) { if (++fpsTry.n < 2) return; const helped = fps >= 40 || fps >= fpsTry.before * 1.12;
    if (!helped && G._autoQ !== 'low') { G._autoQ = 'low'; fpsTry.n = 0; world.setQuality('low'); return; }   // medium did not help: try low once
    if (!helped) { G._autoQ = fpsTry.from; fpsStop = true; world.setQuality(G._autoQ); }                      // nothing helps: something else caps the rate, so put the detail back
    store('mk-quality-auto', G._autoQ); fpsTry = null; fpsLow = 0; return; }
  fpsLow = fps < 40 ? fpsLow + 1 : 0;
  if (fpsLow >= 2 && G._autoQ !== 'low') { fpsTry = { from: G._autoQ, before: fps, n: 0 }; G._autoQ = G._autoQ === 'high' ? 'medium' : 'low'; fpsLow = 0; world.setQuality(G._autoQ); ui.toast('Graphics detail lowered to keep the game smooth. You can change this in Settings.'); }
}
world.setQuality(G.qLevel()); G._fpsTick = fpsTick;   // test hook
G.setGuide = (on) => { G.guide = !!on; world.guideOn = G.guide; try { localStorage.setItem('mk-guide', G.guide ? '1' : '0'); } catch (e) {} };
G.voicePref = stored('mk-voice', ''); G.applyVoice = () => { G.voice.on = G.voicePref ? G.voicePref === '1' : !!G.S && G.S.mode === 'cadet'; if (!G.voice.on) G.voice.stop(); };
G.setVoice = (on) => { G.voicePref = on ? '1' : '0'; store('mk-voice', G.voicePref); G.applyVoice(); if (on) G.voice.say('Hello! I am REGO. I will read my lines aloud for you.'); };
G.quiz = stored('mk-quiz', '1') === '1'; G.setQuiz = (on) => { G.quiz = !!on; store('mk-quiz', on ? '1' : '0'); };
G.audio.music = stored('mk-music', '1') === '1'; G.setMusic = (on) => { G.audio.setMusic(on); store('mk-music', on ? '1' : '0'); };
G.setSound = (on) => { if (G.audio.on !== !!on) G.audio.toggle(); $('#b-sound').innerHTML = G.audio.on ? IC.sound : IC.mute; };
$('#goal-x').onclick = () => { G.goal = null; world.setTarget(null); ui.objective(null); $('#goal-x').classList.add('hidden'); G.audio?.play('click'); };
$('#b-set').innerHTML = IC.gear; $('#b-set').onclick = () => !ui.busy && ui.settings(); $('#btn-settings').onclick = () => ui.settings();
const stickEl = $('#stick'), knob = stickEl.querySelector('i');
const stickMove = (e) => { const r = stickEl.getBoundingClientRect(), x = (e.clientX - r.left - 59) / 59, y = (e.clientY - r.top - 59) / 59, l = Math.max(1, Math.hypot(x, y)); G.stick.x = x / l; G.stick.y = -y / l; knob.style.transform = `translate(${(x / l) * 34}px,${(y / l) * 34}px)`; };
stickEl.onpointerdown = (e) => { stickEl.setPointerCapture(e.pointerId); stickMove(e); G.touch = true; }; stickEl.onpointermove = (e) => e.buttons && stickMove(e); stickEl.onpointerup = stickEl.onpointercancel = () => { G.stick.x = G.stick.y = 0; knob.style.transform = ''; };
$('#t-use').onclick = () => G.doAction('e'); $('#t-alt').onclick = () => G.doAction('q'); const hold = (b, key) => { b.onpointerdown = () => (G.keys[key] = true); b.onpointerup = b.onpointerleave = () => (G.keys[key] = false); }; hold($('#t-jump'), ' '); hold($('#t-down'), 'c');
if ('ontouchstart' in window) { $('#touch').classList.remove('hidden'); G.touch = true; $('#dlg-next').textContent = 'Tap anywhere ▸'; }

// ---------- per-frame updates ----------
const tmp = new V3();
function pushOut(pos, zone, pad) { for (const c of world.colliders[zone]) { if (!c.r) continue; const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + pad; if (d < m && d > 0.001) { pos.x = c.x + (dx / d) * m; pos.z = c.z + (dz / d) * m; } } }
function topBounds(pos, pad) { const dx = pos.x - PIT.x, dz = pos.z - PIT.z, d = Math.hypot(dx, dz), m = PIT.r + pad; if (d < m) { pos.x = PIT.x + (dx / d) * m; pos.z = PIT.z + (dz / d) * m; } const bd = Math.hypot(pos.x, pos.z); if (bd > 790) { pos.x *= 790 / bd; pos.z *= 790 / bd; return true; } return false; }
function updatePlayer(dt) {
  const k = G.keys, free = !ui.busy && !G.riding && G.sleepLeft <= 0 && !G.paused && !G.jobTick;
  if (P.in) return updateVehicle(dt, free);
  let f = 0, r = 0; if (free) { f = (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0) + G.stick.y; r = (k.d ? 1 : 0) - (k.a ? 1 : 0) + G.stick.x; if (k.ArrowLeft) cam.yaw += 1.9 * dt; if (k.ArrowRight) cam.yaw -= 1.9 * dt; }
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw); tmp.set(-sy * f + cy * r, 0, -cy * f - sy * r); const l = tmp.length(); if (l > 1) tmp.multiplyScalar(1 / l);
  const heavy = P.carry && ITEMS[P.carry.type].heavy, load = heavy ? 0.6 : P.carry ? 0.85 : 1, weak = G.S && G.S.health < 35 ? 0.7 : 1, maxV = (k.Shift && !heavy ? 10.5 : 6.4) * weak * load;
  tmp.multiplyScalar(maxV); const acc = P.ground ? 7 : 1.2; P.vel.x += (tmp.x - P.vel.x) * Math.min(1, acc * dt); P.vel.z += (tmp.z - P.vel.z) * Math.min(1, acc * dt);
  const ox = P.pos.x, oz = P.pos.z; P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt; pushOut(P.pos, P.zone, 0.5);
  if (P.zone === 'top') { if (topBounds(P.pos, 7.5) && (!G._edgeT || performance.now() - G._edgeT > 9000)) { G._edgeT = performance.now(); ui.bubble('That is the edge of the map. Nothing but craters beyond here!', 'worried', 6); } }
  else {
    if (!world.walkable(P.pos.x, P.pos.z)) { if (world.walkable(P.pos.x, oz)) P.pos.z = oz; else if (world.walkable(ox, P.pos.z)) P.pos.x = ox; else { P.pos.x = ox; P.pos.z = oz; } }
    const S = G.S;
    if (S && !S.suitOn) {   // without a suit you stay where the air is
      if (P.pos.x < AIRLOCK.x0 + 0.8) { P.pos.x = Math.max(ox, AIRLOCK.x0 + 0.8); P.vel.x = 0; G.warn('suitOut', 'Stop! There is <b>no air</b> out in the cave. Put your suit on at the <b>Suit Lockers</b> first.'); }
      const rid = world.roomAt(P.pos.x, P.pos.z); if (rid && S.rooms[rid].p < 40 && world.roomAt(ox, oz) !== rid) { P.pos.x = ox; P.pos.z = oz; P.vel.set(0, 0, 0); G.warn('suitRoom', `There is almost <b>no air</b> in the ${ROOMS.find((r) => r.id === rid).name}. Put your suit on before you go in.`); }
    }
  }
  const gy = groundY(P.zone, P.pos.x, P.pos.z);
  if (free && k[' '] && P.ground && !heavy) { P.vy = 3.4; P.ground = false; G.audio.play('step'); }   // real lunar gravity
  if (!P.ground) { P.vy -= K.GRAVITY * dt; P.pos.y += P.vy * dt; if (P.pos.y <= gy) { P.pos.y = gy; P.vy = 0; P.ground = true; G.audio.play('step'); if (P.zone === 'top') world.puff(P.pos.x, P.pos.z, 14, P.vel.x * 0.2, P.vel.z * 0.2, 1.5, 2.6); } } else P.pos.y = gy;
  const sp = Math.hypot(P.vel.x, P.vel.z); if (sp > 0.4 && !G.jobTick) { let d = Math.atan2(P.vel.x, P.vel.z) - P.face; d = Math.atan2(Math.sin(d), Math.cos(d)); P.face += d * Math.min(1, dt * 9); }
  const g = G.astro.group; g.position.copy(P.pos); g.rotation.set(0, P.face, 0); g.visible = !cam.fp;
  const hop = G.xfer && G.xfer.kind === 'out' ? G.xfer : null; if (hop) { hop.u = Math.min(1, hop.u + dt / 0.42); const e = hop.u * hop.u * (3 - 2 * hop.u); g.position.lerpVectors(hop.from, P.pos, e); g.position.y += Math.sin(Math.PI * hop.u) * 0.7; if (hop.u >= 1) G.xfer = null; }
  G.astro.update(dt, G.jobbing && G.jobbing.speed ? G.jobbing.speed : sp, !P.ground || !!hop, G.jobbing ? G.jobbing.pose : heavy ? 'drag' : P.carry ? 'carry' : 'walk', G.jobbing);
  if (sp > 1.5 && P.ground && G.astro.footfall) { G.audio.play('step'); if (P.zone === 'top') world.puff(P.pos.x - Math.sin(P.face) * 0.3, P.pos.z - Math.cos(P.face) * 0.3, 4, -P.vel.x * 0.12, -P.vel.z * 0.12, 0.9, 0.8); }
}
function updateVehicle(dt, free) {
  const S = G.S, k = G.keys, thr = free ? (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0) + G.stick.y : 0, st = free ? (k.a || k.ArrowLeft ? 1 : 0) - (k.d || k.ArrowRight ? 1 : 0) - G.stick.x : 0, perk = S.perks.pilot ? 0.7 : 1;
  if (P.in === 'dig') {   // the digger: slow, turns on the spot, and stays on its power cable
    const d = G.dig; d.v += (thr * 5 - d.v) * Math.min(1, dt * 2.2); if (Math.abs(thr) < 0.05) d.v *= 1 - Math.min(1, dt * 3);
    d.yaw += st * dt * 1.15; const p = { x: d.x + Math.sin(d.yaw) * d.v * dt, z: d.z + Math.cos(d.yaw) * d.v * dt }; pushOut(p, 'top', 2.3);
    const ox = p.x - MINE.x, oz = p.z - MINE.z, od = Math.hypot(ox, oz); if (od > MINE.tether) { p.x = MINE.x + (ox / od) * MINE.tether; p.z = MINE.z + (oz / od) * MINE.tether; d.v *= 0.5; G.warn('cable', 'The digger runs on a power cable from the mast. It cannot leave the crater floor.', 'think', 12000); }
    d.x = p.x; d.z = p.z; d.dig = free && k[' '] ? 1 : 0;
    if (d.dig && d.boom > 0.8) { const bx = d.x + Math.sin(d.yaw) * 5.6, bz = d.z + Math.cos(d.yaw) * 5.6, i = patchAt(S, bx, bz);   // the bucket bites 5.6 m ahead
      if (d.load >= MINE.bucket) G.warn('full', 'The bucket is full. Drive to the orange filler in the middle and press <b>Q</b> to tip it in.', 'happy', 9000);
      else if (i >= 0) { d.prog += dt / MINE.digSec; if (Math.random() < dt * 14) world.puff(bx, bz, 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 1.6, 1.4);
        if (d.prog >= 1) { d.prog = 0; scoop(S, i); d.load++; G.audio.play('ok'); ui.toast(d.load >= MINE.bucket ? 'Bucket full! Tip it into the orange filler (Q).' : `One scoop of icy soil. The bucket holds ${MINE.bucket}.`, 'good'); } }
      else { d.prog = 0; d.dry += dt; if (d.dry > 1.4) { d.dry = -8; ui.toast('Only dry soil here. Put the bucket over a pale blue patch.'); } } }
    else d.prog = Math.max(0, d.prog - dt * 2);
    P.pos.set(d.x, world.heightAt(d.x, d.z), d.z); P.face = d.yaw;
  } else if (P.in === 'car') {
    const c = G.car, max = S.car.charge > 0 ? 15 : 2.2; c.v += (thr * max - c.v) * Math.min(1, dt * 1.5); if (Math.abs(thr) < 0.05) c.v *= 1 - Math.min(1, dt * 1.2);
    c.st = st; c.yaw += st * dt * 1.6 * clamp(c.v / 5, -1, 1); const p = { x: c.x + Math.sin(c.yaw) * c.v * dt, z: c.z + Math.cos(c.yaw) * c.v * dt }, bx = p.x, bz = p.z; pushOut(p, 'top', 2.2); topBounds(p, 12); if (p.x !== bx || p.z !== bz) c.v *= 0.6;
    const moved = Math.hypot(p.x - c.x, p.z - c.z); c.x = p.x; c.z = p.z;
    if (Math.abs(c.v) > 3 && Math.random() < dt * 22) { const sx = Math.sin(c.yaw), cz = Math.cos(c.yaw), side = Math.random() < 0.5 ? -1.3 : 1.3, back = c.v > 0 ? -2.1 : 2.1; world.puff(c.x + sx * back + cz * side, c.z + cz * back - sx * side, 2, -sx * c.v * 0.28, -cz * c.v * 0.28, 1.2 + Math.abs(c.v) * 0.12, 0.9); }   // rooster tails behind the wheels
    S.car.charge = Math.max(0, S.car.charge - (moved / 2600) * perk); S.stats.km += moved / 1000;
    P.pos.set(c.x, world.heightAt(c.x, c.z), c.z); P.face = c.yaw;
  } else {
    const s = G.ship, dead = S.ship.charge <= 0, up = free && !dead ? (k[' '] ? 1 : 0) - (k.c || k.Control ? 1 : 0) : dead ? -0.6 : 0, fly = s.alt > 0.25;
    s.yaw += st * dt * 1.7; const a = dead || !fly ? 0 : thr * 16; s.vx += Math.sin(s.yaw) * a * dt; s.vz += Math.cos(s.yaw) * a * dt; const drag = fly ? 0.55 : 6; s.vx *= 1 - Math.min(1, drag * dt); s.vz *= 1 - Math.min(1, drag * dt);
    const sp = Math.hypot(s.vx, s.vz); if (sp > 30) { s.vx *= 30 / sp; s.vz *= 30 / sp; } const vy0 = s.vy, alt0 = s.alt; s.vy += ((up < 0 ? -Math.min(8, 0.7 + s.alt * 0.55) : up * 8) - s.vy) * Math.min(1, dt * (up < 0 && s.alt < 12 ? 5 : 2.5));   // coming down, the hopper slows by itself in the last metres
    const p = { x: s.x + s.vx * dt, z: s.z + s.vz * dt }; if (topBounds(p, -999)) { s.vx = s.vz = 0; } s.x = p.x; s.z = p.z;
    const inPit = Math.hypot(s.x - PIT.x, s.z - PIT.z) < PIT.r + 4, gnd = inPit ? 6 : world.heightAt(s.x, s.z); s.y = clamp(s.y + s.vy * dt, gnd, gnd + 80); if (s.y <= gnd + 0.001 && s.vy < 0) s.vy = 0; s.alt = s.y - gnd; if (alt0 > 0.05 && s.alt <= 0.05) s.hit = clamp(-vy0 * 0.9, 0.5, 2.6);
    s.thr = dead ? 0 : fly || up > 0 ? clamp(0.4 + Math.max(0, up) * 0.6 + Math.abs(thr) * 0.25 - (up < 0 ? 0.2 : 0), 0, 1.25) : 0; s.steer = st; s.gnd = gnd; s.inPit = inPit;
    S.ship.charge = Math.max(0, S.ship.charge - ((sp * dt) / 4200 + (fly ? dt / 420 : 0)) * perk); S.stats.km += (sp * dt) / 1000;
    P.pos.set(s.x, s.y, s.z); P.face = s.yaw;
  }
  { const hop = G.xfer && G.xfer.kind === 'in' ? G.xfer : null, g = G.astro.group; g.visible = !!hop && !cam.fp;
    if (hop) { hop.u = Math.min(1, hop.u + dt / 0.42); const v = G[P.in], e = hop.u * hop.u * (3 - 2 * hop.u), seat = TMP.set(v.x, (P.in === 'ship' ? v.y : world.heightAt(v.x, v.z)) + 1.1, v.z); g.position.lerpVectors(hop.from, seat, e); g.position.y += Math.sin(Math.PI * hop.u) * 0.8; g.rotation.set(0, Math.atan2(v.x - hop.from.x, v.z - hop.from.z), 0); if (hop.u >= 1) G.xfer = null; }
    G.astro.update(dt, 0, !!hop, hop ? 'walk' : 'sit'); }
  if ((thr || st) && (!G.camT || performance.now() - G.camT > 1500)) { let d = P.face + Math.PI - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 2.2); }
}
// Range. What it takes to get a vehicle back to its pad: the rover uses a full charge in 2.6 km; the hopper in 4.2 km, plus a little
// for every second in the air and for the climb. In the night cold a parked vehicle keeps losing charge, so allow for a couple of hours of that.
function homeNeed(S, k, v, extra = 0) {
  const pad = k === 'car' ? CAR_PAD : SHIP_PAD, home = Math.hypot(v.x - pad[0], v.z - pad[1]) + extra, frost = S.flow ? S.flow.frost : 0;
  return { home, need: (k === 'car' ? home / 2600 : home / 4200 + home / 25 / 420 + 0.02) + K.FROST_DRAIN * frost * 2 };
}
const pct = (x) => Math.max(0, Math.round(x * 100)) + '%';
function rangeCheck(S, car, ship) {
  const last = G._rng || (G._rng = { car: S.car.charge, ship: S.ship.charge, in: null });
  for (const [k, v] of [['car', car], ['ship', ship]]) {
    const ch = S[k].charge, name = k === 'car' ? 'rover' : 'hopper', { home, need } = homeNeed(S, k, v), away = home > 20, near = P.in === k || Math.hypot(P.pos.x - v.x, P.pos.z - v.z) < 30, atMine = Math.hypot(v.x - MINE.x, v.z - MINE.z) < MINE.r * 0.9;
    if (last[k] > 0 && ch <= 0 && away) { if (near) G.pointTo('gate'); G.warn('dead-' + k, `<b>The ${name}'s battery is empty</b>, ${Math.round(home)} m from its pad. ${k === 'ship' ? 'A hopper only charges on its own pad, so it has to stay here.' : 'A rover only charges on its pad.'} Walk home: follow the line to the elevator.`, 'alert', 60000); }
    else if (away && near && !atMine && ch > 0 && P.zone === 'top') {   // the crater has its own warning
      if (ch < need) G.warn('range-' + k, `<b>The ${name} cannot get home on ${pct(ch)}.</b> The ${Math.round(home)} m back to its pad needs about ${pct(need)}${S.flow.frost > 0 ? ', and the cold keeps draining it' : ''}. ${k === 'ship' ? 'Fly as far as it goes, then walk the rest.' : 'Drive as far as it goes, then walk the rest.'}`, 'alert', 45000);
      else if (ch < need * 1.25 + 0.04) G.warn('range-' + k, `<b>Time to go home!</b> The ${name} is at <b>${pct(ch)}</b> and needs about ${pct(need)} to get back to its pad${S.flow.frost > 0 ? '. The night cold drains it even while it stands still' : ''}.`, 'worried', 45000);
    }
    last[k] = ch;
  }
  // climbing in near the pad: is there enough for the trip to where you are heading, and back?
  if (P.in !== last.in && (P.in === 'car' || P.in === 'ship')) {
    const k = P.in, v = k === 'car' ? car : ship, T = G.world.target, name = k === 'car' ? 'rover' : 'hopper', there = T && T.zone === 'top' ? Math.hypot(T.x - v.x, T.z - v.z) : 0;
    if (there > 150) { const trip = homeNeed(S, k, { x: T.x, z: T.z }, there); if (S[k].charge < trip.need) G.warn('trip-' + k, `<b>Check the charge first!</b> The ${name} has <b>${pct(S[k].charge)}</b>. Getting there and back needs about <b>${pct(trip.need)}</b>${S.flow.frost > 0 ? ' in this cold' : ''}. Charge it on its pad first${k === 'ship' ? ', or take the rover' : ''}.`, 'worried', 20000); }
  }
  last.in = P.in;
}
function placeVehicles(dt) {
  const S = G.S, c = G.car, s = G.ship, cg = world.car, sg = world.ship;
  const h = world.heightAt(c.x, c.z), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), hf = world.heightAt(c.x + fx * 2.3, c.z + fz * 2.3), hb = world.heightAt(c.x - fx * 2.3, c.z - fz * 2.3), hl = world.heightAt(c.x + fz * 1.4, c.z - fx * 1.4), hr = world.heightAt(c.x - fz * 1.4, c.z + fx * 1.4);
  cg.position.set(c.x, h, c.z); cg.rotation.set(-Math.atan2(hf - hb, 4.6), c.yaw, Math.atan2(hr - hl, 2.8), 'YXZ');
  // --- how the rover moves on its springs. Everything here is for the eye only: it never changes where the rover goes.
  const D = c.dyn || (c.dyn = { steer: 0, bob: 0, bobV: 0, roll: 0, rollV: 0, pitch: 0, pitchV: 0, ax: 0, axV: 0, az: 0, azV: 0, pv: c.v, pyaw: c.yaw, trk: 0, px: c.x, pz: c.z });
  const k1 = Math.max(dt, 1e-3), driving = P.in === 'car', sp = Math.abs(c.v), acc = clamp((c.v - D.pv) / k1, -14, 14); let dyaw = c.yaw - D.pyaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); const lat = clamp((dyaw / k1) * c.v, -14, 14); D.pv = c.v; D.pyaw = c.yaw;
  D.steer += ((driving ? c.st || 0 : 0) - D.steer) * Math.min(1, dt * 7);
  let front = 0, rear = 0, all = 0;
  for (const w of world.carWheels) {
    const wx = c.x + fz * w.x + fx * w.z, wz = c.z - fx * w.x + fz * w.z, plane = h + ((hf - hb) / 4.6) * w.z + ((hl - hr) / 2.8) * w.x;
    const rough = Math.sin(wx * 2.1 + wz * 1.3) * Math.sin(wx * 0.9 - wz * 2.7) * 0.075 * Math.min(1, sp / 4);                 // small stones and ruts under each tyre
    const want = clamp(world.heightAt(wx, wz) - plane + rough, -0.26, 0.3); w.y += (want - w.y) * Math.min(1, dt * 16); w.sus.position.y = 0.62 + w.y;
    w.steer.rotation.y = w.z > 0.5 ? D.steer * 0.5 : w.z < -0.5 ? -D.steer * 0.28 : 0; w.tire.rotation.x += (c.v * dt) / 0.62;
    all += w.y / 6; if (w.z > 0.5) front += w.y / 2; else if (w.z < -0.5) rear += w.y / 2;
  }
  // soft, slow springs: in one-sixth gravity a rover wallows and floats where an Earth car would thump
  const spring = (pos, vel, target, kk, damp) => { const v = vel + ((target - pos) * kk - vel * damp) * dt; return [pos + v * dt, v]; };
  [D.bob, D.bobV] = spring(D.bob, D.bobV, all * 0.9, 42, 4.2); [D.pitch, D.pitchV] = spring(D.pitch, D.pitchV, clamp(-acc * 0.011, -0.075, 0.075) + (rear - front) * 0.16, 30, 4);
  [D.roll, D.rollV] = spring(D.roll, D.rollV, clamp(lat * 0.011, -0.11, 0.11), 30, 4);
  [D.ax, D.axV] = spring(D.ax, D.axV, clamp(-acc * 0.03, -0.5, 0.5) - D.bobV * 0.5, 55, 2.2); [D.az, D.azV] = spring(D.az, D.azV, clamp(lat * 0.03, -0.5, 0.5), 55, 2.2);
  world.carBody.position.y = clamp(D.bob, -0.2, 0.25); world.carBody.rotation.set(clamp(D.pitch, -0.1, 0.1), 0, clamp(D.roll, -0.13, 0.13)); world.carAnt.rotation.set(clamp(D.ax, -0.7, 0.7), 0, clamp(-D.az, -0.7, 0.7)); c.bob = world.carBody.position.y;
  // tyre prints, one pair every half metre, from the outer wheels at both ends
  D.trk += Math.hypot(c.x - D.px, c.z - D.pz); D.px = c.x; D.pz = c.z;
  if (D.trk > 0.55 && P.zone === 'top') { D.trk = 0; for (const sx of [-1.5, 1.5]) world.track(c.x + fz * sx - fx * 1.8 * Math.sign(c.v || 1), c.z - fx * sx - fz * 1.8 * Math.sign(c.v || 1), c.yaw); }
  if (!(P.in === 'ship')) { const gnd = world.heightAt(s.x, s.z); if (s.y < gnd || s.alt < 0.3) s.y = gnd; }
  // the digger: it sits on the crater slope; boom, stick and bucket follow what you are doing
  { const dg = G.dig, dx2 = Math.sin(dg.yaw), dz2 = Math.cos(dg.yaw), m = world.dig; if (P.in !== 'dig') dg.dig = 0;
    m.position.set(dg.x, world.heightAt(dg.x, dg.z), dg.z); m.rotation.set(-Math.atan2(world.heightAt(dg.x + dx2 * 2, dg.z + dz2 * 2) - world.heightAt(dg.x - dx2 * 2, dg.z - dz2 * 2), 4), dg.yaw, 0, 'YXZ');
    dg.boom += ((dg.dig ? 1 : 0) - dg.boom) * Math.min(1, dt * 3.5); const bite = dg.prog > 0 ? Math.sin(performance.now() * 0.014) * 0.05 : 0;
    world.digBoom.rotation.x = -0.6 + dg.boom * 0.85 + bite; world.digStick.rotation.x = 1.3 - dg.boom * 1.02 + dg.prog * 0.45; world.digBucket.rotation.x = 0.6 - dg.boom * 0.8 + dg.prog * 0.9;
    world.digLoad.visible = dg.load > 0; if (dg.load > 0) world.digLoad.scale.set(1, 0.5 + (0.5 * dg.load) / MINE.bucket, 1); }
  // deep cold steals battery charge from anything parked on the crater floor
  if (S) { const th = S.t, dh = Math.max(0, th - (G._mT ?? th)); G._mT = th; if (dh > 0 && dh < 5) for (const [k2, v] of [['car', c], ['ship', s]]) if (Math.hypot(v.x - MINE.x, v.z - MINE.z) < MINE.r * 0.9) { S[k2].charge = Math.max(0, S[k2].charge - MINE.drain * dh);
      // what it takes to reach its pad: the rover uses a full charge in 2.6 km, the hopper in 4.2 km plus a little for every second in the air
      const pad = k2 === 'car' ? CAR_PAD : SHIP_PAD, home = Math.hypot(v.x - pad[0], v.z - pad[1]), need = k2 === 'car' ? home / 2600 : home / 4200 + home / 25 / 420, name = k2 === 'car' ? 'rover' : 'hopper';
      if (G.state === 'play' && S[k2].charge > 0 && S[k2].charge < need * 1.25 + 0.04) G.warn('cold-' + k2, `<b>Time to go!</b> The cold has drained the ${name} to <b>${Math.round(S[k2].charge * 100)}%</b>. That is only just enough to get home. Take what you have and leave now.`, 'alert', 45000); } }
  if (S && G.state === 'play') rangeCheck(S, c, s);
  // --- the hopper on its legs. Like the rover's springs, this is for the eye only: it never changes where the hopper goes.
  const H = s.dyn || (s.dyn = { dy: 0, dv: 0, roll: 0, thr: 0, dust: 0, hud: 0 }), flying = P.in === 'ship'; if (!flying) { s.thr = 0; s.steer = 0; }
  if (s.hit) { H.dv -= s.hit; if (P.zone === 'top') for (const [ex, ez] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) world.puff(s.x + ex * 2.3, s.z + ez * 1.8, 5, ex * 2.4, ez * 2.4, 0.7, 0.8); G.audio.play('thud'); s.hit = 0; }   // feet down: the body dips and dust jumps from each pad
  H.dv += ((0 - H.dy) * 45 - H.dv * 5.5) * dt; H.dy = clamp(H.dy + H.dv * dt, -0.32, 0.12);   // soft and slow, as things settle in one-sixth gravity
  H.thr += ((s.thr || 0) - H.thr) * Math.min(1, dt * 6); H.roll += ((flying && s.alt > 0.3 ? -(s.steer || 0) * 0.16 : 0) - H.roll) * Math.min(1, dt * 3);
  sg.position.set(s.x, s.y, s.z); sg.rotation.set(clamp(-Math.hypot(s.vx, s.vz) * 0.01, -0.3, 0), s.yaw, H.roll, 'YXZ');
  const ext = Math.min(s.alt, 0.35); world.shipBody.position.y = H.dy;   // in the air the legs hang 35 cm lower; as the feet touch they take the weight
  for (const L of world.shipLegs) { const hx = L.hip.x, hy = L.hip.y + H.dy, hz = L.hip.z, fx2 = L.foot.x, fy = L.foot.y - ext, fz2 = L.foot.z, dx = fx2 - hx, dy = fy - hy, dz = fz2 - hz, len = Math.hypot(dx, dy, dz);
    L.pad.position.y = 0.06 - ext; L.leg.position.set((hx + fx2) / 2, (hy + fy) / 2, (hz + fz2) / 2); L.leg.scale.y = len; L.leg.quaternion.setFromUnitVectors(UP, TMP.set(dx / len, dy / len, dz / len)); }
  // dust blown flat and outward by the jets when the hopper is low (no air on the Moon, so it does not billow)
  if (P.zone === 'top' && H.thr > 0.2 && s.alt < 7) { H.dust += dt * (1 - s.alt / 7) * H.thr * 24; while (H.dust > 1) { H.dust -= 1; const a = Math.random() * 6.283, r = 1.2 + Math.random() * 1.4; world.puff(s.x + Math.cos(a) * r, s.z + Math.sin(a) * r, 2, Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0.45, 0.6); } }
  // landing ring on the ground below, and the flight readout
  { const show = flying && P.zone === 'top' && s.alt > 0.6, ret = world.shipRet; ret.visible = show; const el = $('#flight');
    if (show || flying) { const g0 = world.heightAt(s.x, s.z), hs = [[-2.2, 1.8], [2.2, 1.8], [-2.2, -1.8], [2.2, -1.8]].map(([ax, az]) => world.heightAt(s.x + ax, s.z + az)), rough = Math.max(...hs) - Math.min(...hs) > 0.7, state = s.inPit ? 2 : rough ? 1 : 0;
      ret.position.set(s.x, g0 + 0.07, s.z); ret.rotation.y = s.yaw; ret.scale.setScalar(1 + Math.min(s.alt, 40) * 0.035); world.shipRetM.color.setHex([0x5fe3a1, 0xffb347, 0xff5a4a][state]); world.shipRetM.opacity = 0.55 + 0.3 * Math.sin(performance.now() * 0.006);
      H.hud -= dt; if (H.hud <= 0) { H.hud = 0.12; const vs = s.vy, sp = Math.hypot(s.vx, s.vz); el.classList.remove('hidden');
        el.innerHTML = `<span>ALT <b>${s.alt.toFixed(s.alt < 10 ? 1 : 0)} m</b></span><span>${vs < -0.05 ? '▼' : vs > 0.05 ? '▲' : '•'} <b>${Math.abs(vs).toFixed(1)} m/s</b></span><span>SPEED <b>${sp.toFixed(0)} m/s</b></span><span class="${['ok', 'warn', 'bad'][state]}">${s.alt < 0.6 ? 'On the ground' : ['Clear to land', 'Bumpy ground below', 'Over the pit'][state]}</span>`; } }
    else if (!el.classList.contains('hidden')) el.classList.add('hidden'); }
  if (S) { const park = (v, pad, r, slow) => Math.hypot(v.x - pad[0], v.z - pad[1]) < r && slow; const warm = !(S.flow && S.flow.frost > 0) && !S.chargeOff; S.car.charging = warm && park(c, CAR_PAD, 4.5, Math.abs(c.v) < 0.6) && S.car.charge < 1; S.ship.charging = warm && park(s, SHIP_PAD, 5.5, s.alt < 0.4) && S.ship.charge < 1; }
}
// may someone stand here on the surface? Clear of buildings and machines, and back from the pit's edge
const topFree = (x, z) => Math.hypot(x - PIT.x, z - PIT.z) >= PIT.r + 7.5 && !world.colliders.top.some((c) => c.r && Math.hypot(c.x - x, c.z - z) < c.r + 0.45);
function updateRego(dt) {
  const R = G.regoPos, fx = Math.sin(P.face), fz = Math.cos(P.face), g = G.rego.group; g.visible = !P.in;
  const js = G.jobbing && G.jobbing.site && G.jobbing.pose === 'work' ? G.jobbing.site : null;
  const zone = P.zone, cols = world.colliders[zone], pit = PIT.r + 7.5;   // REGO may stand where the floor is, clear of machines and buildings, and back from the pit's edge
  const free = (x, z) => (zone === 'top' ? Math.hypot(x - PIT.x, z - PIT.z) >= pit : world.walkable(x, z)) && !cols.some((c) => c.r && Math.hypot(c.x - x, c.z - z) < c.r + 0.45);
  let dx = 0, dz = 0, sp = 0;
  if (P.in || G._regoZone !== zone) { R.x = P.pos.x + fz * 1.9 - fx * 1.3; R.z = P.pos.z - fx * 1.9 - fz * 1.3; if (!free(R.x, R.z)) { R.x = P.pos.x; R.z = P.pos.z; } G.regoFollow.reset(); G._regoZone = zone; }   // riding, or just arrived in a new place: REGO is simply there
  else { const m = G.regoFollow.update(dt, R, { x: P.pos.x, z: P.pos.z, face: P.face }, free, js); dx = m.dx; dz = m.dz; sp = m.speed; }   // behind your shoulder or beside the work, and never into a wall
  R.y = groundY(P.zone, R.x, R.z); g.position.copy(R);
  const want = sp > 0.8 ? Math.atan2(dx, dz) : js ? Math.atan2(js.x - R.x, js.z - R.z) : Math.atan2(P.pos.x - R.x, P.pos.z - R.z); let dy = want - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.y += dy * Math.min(1, dt * 6);
  let look = (js ? Math.atan2(js.x - R.x, js.z - R.z) : Math.atan2(P.pos.x - R.x, P.pos.z - R.z)) - g.rotation.y; look = clamp(Math.atan2(Math.sin(look), Math.cos(look)), -1.1, 1.1); G.rego.update(dt, sp, look);
  const dark = P.zone === 'deep' ? !G.inside || (G.S && G.S.flow.eff < 1) : G.inCrater || (G.S && !G.S.flow.sun.up); for (const [m, g] of G.lampMounts) { m.position.copy(g.position); m.quaternion.copy(g.quaternion); } G.astro.lamp.intensity = dark && !P.in ? 14 : 0; G.rego.lamp.intensity = (dark || js) && !P.in ? (js ? 9 : 5) : 0;   // REGO lights the work
}
function updateCamera(dt) {
  const c = world.camera; G.shake *= Math.pow(0.25, dt); const veh = P.in === 'car' ? 5 : P.in === 'ship' ? 8 : P.in === 'dig' ? 7 : 0;
  if (cam.fp && !P.in) { c.position.set(P.pos.x, P.pos.y + 1.78, P.pos.z); c.rotation.set(-cam.pitch, cam.yaw, 0, 'YXZ'); }
  else {
    const pp = Math.max(cam.pitch, 0.06), cp = Math.cos(pp), dist = cam.dist + veh; tmp.set(P.pos.x, P.pos.y + (P.in ? 2.6 : 1.75), P.pos.z);
    if (G.jobbing && G.jobbing.site && G.jobbing.focus) { const f = G.jobbing.focus, s = G.jobbing.site; tmp.x += (s.x - P.pos.x) * f; tmp.z += (s.z - P.pos.z) * f; tmp.y += G.jobbing.lift || 0; }
    c.position.set(tmp.x + Math.sin(cam.yaw) * cp * dist, tmp.y + Math.sin(pp) * dist, tmp.z + Math.cos(cam.yaw) * cp * dist);
    if (P.zone === 'top') c.position.y = Math.max(c.position.y, world.heightAt(c.position.x, c.position.z) + 0.6);
    else { c.position.z = clamp(c.position.z, -TUBE.halfWidth + 3, TUBE.halfWidth - 3); c.position.x = clamp(c.position.x, -TUBE.halfLen + 2, TUBE.halfLen - 2); c.position.y = clamp(c.position.y, TUBE.y + 0.6, TUBE.y + 26); }
    c.rotation.order = 'XYZ'; c.lookAt(tmp.x, tmp.y + 0.35, tmp.z); if (cam.pitch < 0.06) c.rotateX((0.06 - cam.pitch) * 1.45);
  }
  if (G.shake > 0.02) { c.position.x += (Math.random() - 0.5) * G.shake * 0.35; c.position.y += (Math.random() - 0.5) * G.shake * 0.35; }
}
const radC = $('#rad'), radX = radC.getContext('2d'); radC.width = 480; radC.height = 270;
function updateRad(dt) {
  const S = G.S, r = S && P.zone === 'top' ? S.flow.doseRate || 0 : 0;
  if (r > 0.25) { radC.style.opacity = clamp(r / 7, 0.2, 0.9); radX.clearRect(0, 0, 480, 270); radX.fillStyle = '#fff'; const n = Math.min(260, r * 26); for (let i = 0; i < n; i++) { const s = Math.random() < 0.1 ? 3 : 1; radX.fillRect(Math.random() * 480, Math.random() * 270, s, s); } } else radC.style.opacity = 0;
  if (S && G.simOn && Math.random() < Math.min(0.5, r * dt * 5)) G.audio.play('geiger');
}
async function tickSim(dt) {
  const S = G.S; S.zone = P.zone;
  if (!G.simOn || ui.busy || G.paused || G.riding || G.eventBusy || G.jobTick) { computeFlows(S); return; }
  let h = (dt / S.m.hourLen) * G.speedMul * (G.sleepLeft > 0 ? 22 : 1);
  if (G.sleepLeft > 0) { G.sleepLeft -= h; const al = G.alerts(); if (al.filter((a) => a.kind !== 'warn').length > (G._sleepAlerts ?? 99)) G.sleepLeft = 0;
    const alarm = G._sleepKeys && al.find((a) => a.key && !G._sleepKeys.includes(a.key));   // a new emergency (power out, air/water/food nearly gone) always wakes you, even if a warning was already showing
    if (alarm) { G.sleepLeft = 0; G.audio.play('alarm'); ui.bubble(alarm.wake, 'alert', 12); }
    if (G.sleepLeft <= 0) { G.sleepLeft = 0; S.health = Math.min(100, S.health + 8); if (!alarm) ui.toast('You wake up rested.', 'good'); } }
  G.simAdvance(h);
  const st = S.storm;
  if (st && S.t >= st.start) { if (!st.begun) { st.begun = true; G.sleepLeft = 0; G.audio.play('alarm'); if (P.zone === 'top') { ui.bubble('<b>The storm is here!</b> Elevator. Now. The rock roof will shield you.', 'alert', 12); G.pointTo('gate'); } } ui.banner(P.zone === 'top' ? 'RADIATION STORM — GET UNDERGROUND!' : 'Solar storm raging topside — you are shielded down here', P.zone !== 'top'); }
  else if (st) ui.banner(`Solar storm arrives in ${fmt.hrs(Math.max(0, st.start - S.t))} — be underground`, true);
  else if (S.flow.leaks.length) ui.banner(`AIR LEAK in the ${ROOMS.find((r) => r.id === S.flow.leaks[0]).name} — patch it or lock its door!`);
  else if (!G.paused) ui.banner(null);
  if (S.over) return endGame();
  if (!S.suitOn && G.inside) { const pr = S.here && S.rooms[S.here] ? S.rooms[S.here].p : S.P; if (pr < 60) G.warn('thin', pr < 45 ? '<b>You cannot breathe in here!</b> Get out of this room, or run to the Suit Lockers!' : 'The air is getting thin in here. Leave, or put your suit on.', 'alert', 6000); }
  if (S.fansUntil && S.t >= S.fansUntil) { delete S.extraKw.fans; S.fansUntil = 0; ui.toast('Farm fans back to normal.'); }
  if (S.pending.length) { G.eventBusy = true; await G.processPending(); G.eventBusy = false; }
  if (S.t >= G.nextEventAt && (S.hours === Infinity || S.hours - (S.t - S.t0) > 5) && !P.in) { G.eventBusy = true; await G.fireEvent(); G.eventBusy = false; }
  G.nagT += dt; const F = S.flow, serious = G.alerts().some((a) => a.kind !== 'warn') || F.eff < 1 || F.o2Days < 0.8 || F.waterDays < 1 || F.foodDays < 1 || S.lv.heat < F.heatNeed;
  if (G.nagT > (serious ? (S.mode === 'cadet' ? 22 : 32) : 85) && $('#rego').classList.contains('hidden') && G.sleepLeft <= 0 && !G.goal?.cb) { G.nagT = 0; const keep = G.goal; G.advise(); if (!serious) G.goal = keep; }
  G.saveT += dt; if (G.saveT > 20 && G.state === 'play' && G.save()) G.saveT = 0;   // if now is a bad moment, try again next frame
}
async function endGame() {
  if (G.state === 'over') return; G.state = 'over'; G.simOn = false; ui.banner(null); ui.objective(null); G.audio.play(G.S.over.win ? 'win' : 'bad'); G.clearSave();
  if (G.S.over.win) { G.rego.setMood('joy'); G.rego.wave = 5; } else G.rego.setMood('sad');
  await new Promise((r) => setTimeout(r, G.S.over.win ? 1800 : 900)); await ui.fade(true); ui.end(ending(G)); await ui.fade(false);
}

let last = performance.now(), ccT = 0;
function frame(now, manual) {
  if (!manual) { requestAnimationFrame(frame); fpsTick(now); } const dt = clamp((now - last) / 1000, 0, 0.05); last = now; if (G.state === 'title') return;
  if (G.jobTick) G.jobTick(dt);
  G.inside = P.zone === 'deep' && world.indoors(P.pos.x, P.pos.z); G.inCrater = P.zone === 'top' && Math.hypot(P.pos.x - MINE.x, P.pos.z - MINE.z) < MINE.r * 0.9;
  if (G.inCrater && G.state === 'play' && !G._tipMine) { G._tipMine = 1; ui.bubble('The <b>Polar Ice Mine</b>. This crater floor never sees the Sun, so it stays near −230°C: cold enough to keep ice frozen for billions of years. Get in the <b>digger</b>, hold <b>SPACE</b> over a pale blue patch, then tip the bucket into the orange filler. Do not park here long: the cold drains batteries.', 'think', 16); }
  if (G.S) { const S = G.S; if (!S.suitOn && !G.inside) S.suitOn = true; S.here = G.inside ? world.roomAt(P.pos.x, P.pos.z) : null; G.astro.setSuit(G.suitShow ?? S.suitOn);
    if (G.inside && !G._wasIn && S.suitOn && G.state === 'play' && !G._tipIn) { G._tipIn = 1; ui.bubble('You are indoors, and the air is good. You can take your suit off at the <b>Suit Lockers</b>: indoor jobs go a quarter faster without big gloves, and you need it off to cook or sleep.', 'happy', 11); } G._wasIn = G.inside; }
  updatePlayer(dt); if (G.S) placeVehicles(dt); updateRego(dt); updateActors(dt); if (G.cineTick) G.cineTick(dt); else updateCamera(dt);
  if (G.S) { tickSim(dt); updateRad(dt); if (G.state !== 'over') updateGoal(); }
  placeItems();
  world.update(dt, G.S, P.pos, { player: P.pos, inside: G.inside, carOn: P.in === 'car', shipOn: P.in === 'ship', digOn: P.in === 'dig', shipFly: G.ship.alt > 0.3, cooking: G.jobbing?.tag === 'cook', sleeping: G.sleepLeft > 0, suitK: G.suitK, suitShow: G.suitShow, shipThrust: G.ship.dyn ? G.ship.dyn.thr : 0 });
  ccT += dt; if (ccT > 0.5 && G.S && P.zone === 'deep') { ccT = 0; G.paintCC(); }
  { const S = G.S; G._radioT = (G._radioT ?? 25) - dt;
    if (S && G._radioT <= 0) { const quiet = G.state === 'play' && !ui.busy && !G.eventBusy && !G.inJob && !G.riding && !G.paused && G.sleepLeft <= 0, line = quiet ? radioLine(S) : null;
      if (line) ui.toast(`<b>${line.who}</b>${line.text}`, line.who === 'RADIO' ? 'radio off' : 'radio'); G._radioT = line ? 55 + Math.random() * 35 : 12; } }
  // sound follows where you are: the station hums with its power, the helmet muffles the world, music darkens with danger
  { const S = G.S; G._dgT = (G._dgT || 0) - dt; if (S && G._dgT <= 0) { G._dgT = 0.5; const st = S.storm, urgent = G.state === 'play' ? G.alerts().filter((a) => a.kind !== 'warn').length : 0;
      G._danger = G.state !== 'play' ? 0 : clamp(urgent * 0.45 + (S.flow.eff < 1 ? 0.35 : 0) + (S.health < 50 ? 0.4 : 0) + (st && S.t >= st.start ? 0.5 : 0), 0, 1); }
    G.audio.update(dt, { indoors: !!G.inside, suit: S ? !!S.suitOn : true, power: S ? S.flow.eff : 1, vehicle: P.in, speed: P.in === 'car' ? G.car.v : P.in === 'dig' ? G.dig.v : P.in === 'ship' ? Math.hypot(G.ship.vx, G.ship.vz) : Math.hypot(P.vel.x, P.vel.z), thrust: G.ship.dyn ? G.ship.dyn.thr : 0, digging: !!G.dig.dig, danger: G._danger || 0 }); }
  world.render();
  if (G.S && G.state !== 'over') { ui.hud(dt); const free = !ui.busy && !G.riding && G.sleepLeft <= 0 && !G.jobTick; ui.prompt(free ? G.promptText() : null); $('#sleep').classList.toggle('hidden', G.sleepLeft <= 0); if (G.sleepLeft > 0 && G._sleepAlerts === undefined) { const al = G.alerts(); G._sleepAlerts = al.filter((a) => a.kind !== 'warn').length; G._sleepKeys = al.filter((a) => a.key).map((a) => a.key); } if (G.sleepLeft <= 0) G._sleepAlerts = G._sleepKeys = undefined; }
}
requestAnimationFrame(frame);
setTimeout(() => world.warm(), 400);   // build the shaders while the title screen is up
G.frame = (now) => frame(now, true);   // test hook: step the loop by hand

// ---------- saving ----------
G.save = (force) => { try { const S = G.S; if (!S || S.over) return false; if (G.inJob || G.riding || (G.eventBusy && !force)) return false; const o = { S: serialize(S), items: G.items.map((i) => ({ id: i.id, type: i.type, zone: i.zone, x: i.x, z: i.z, where: i.where, rot: i.rot })), car: { ...G.car, cargo: G.car.cargo.map((i) => i.id) }, dig: { x: G.dig.x, z: G.dig.z, yaw: G.dig.yaw, load: G.dig.load }, ship: { ...G.ship, cargo: G.ship.cargo.map((i) => i.id) }, p: { x: P.pos.x, z: P.pos.z, zone: P.zone, carry: P.carry ? P.carry.id : 0 }, fol: G.followers.map((f) => f.site.id), done: G.done, next: G.nextEventAt, seq: G.itemSeq }; localStorage.setItem('mk2-save', JSON.stringify(o)); return true; } catch (e) { return false; /* storage may be blocked */ } };
G.clearSave = () => { try { localStorage.removeItem('mk2-save'); } catch (e) {} };
G.hasSave = () => { try { return !!localStorage.getItem('mk2-save'); } catch (e) { return false; } };
function loadGame() {
  const o = JSON.parse(localStorage.getItem('mk2-save')); G.S = deserialize(o.S); G.applyVoice(); world.baseHit = true; installActions(G); installEvents(G); G.done = o.done || {}; G.nextEventAt = o.next; G.itemSeq = o.seq;
  const byId = {}; for (const i of o.items) { const it = G.spawnItem(i.type, i.zone, i.x, i.z, i.where); it.id = i.id; it.rot = i.rot; byId[i.id] = it; }
  Object.assign(G.car, o.car, { cargo: o.car.cargo.map((id) => byId[id]).filter(Boolean) }); if (o.dig) Object.assign(G.dig, o.dig, { v: 0, prog: 0, dig: 0 }); Object.assign(G.ship, o.ship, { cargo: o.ship.cargo.map((id) => byId[id]).filter(Boolean), vx: 0, vz: 0, vy: 0, alt: 0 });
  P.zone = o.p.zone; G.S.zone = P.zone; world.setZone(P.zone); P.pos.set(o.p.x, groundY(P.zone, o.p.x, o.p.z), o.p.z); G.regoPos.set(o.p.x + 1.5, P.pos.y, o.p.z + 1.5); P.carry = byId[o.p.carry] || null;
  G.spawnSurvivors(); for (const id of o.fol) G.follow(SITES.find((s) => s.id === id));
  $('#title').classList.add('hidden'); ui.showHud(true); G.state = 'play'; G.simOn = true; ui.bubble('Welcome back! I kept everything just as you left it.', 'joy', 8);
}

// ---------- title screen & mission start ----------
let mode = params.get('go') || (() => { try { return localStorage.getItem('mk-mode'); } catch (e) { return null; } })() || 'pilot'; if (!MODES[mode]) mode = 'pilot';
const modesEl = $('#modes');
// Mission page: one card per mission, and a briefing for the chosen one built from the same numbers the simulation uses.
const HARD = { cadet: 1, pilot: 2, commander: 3, unlimited: 0 }, MODE_IC = { cadet: 'moon', pilot: 'rocket', commander: 'fire', unlimited: 'dome' };
const drawModes = () => {
  modesEl.innerHTML = Object.values(MODES).map((m) => `<button class="mode ${m.key === mode ? 'sel' : ''}" data-m="${m.key}"><i class="mode-ic">${IC[MODE_IC[m.key]] || IC.room}</i><b>${m.name}</b><em>${m.ages}</em><span>${m.tag}</span><div class="pips" title="How hard it is">${HARD[m.key] ? [1, 2, 3].map((n) => `<u class="${n <= HARD[m.key] ? 'on' : ''}"></u>`).join('') : '<small>free build</small>'}</div></button>`).join('');
  modesEl.querySelectorAll('.mode').forEach((b) => (b.onclick = () => { mode = b.dataset.m; try { localStorage.setItem('mk-mode', mode); } catch (e) {} G.audio?.play?.('click'); drawModes(); }));
  const m = MODES[mode], lim = m.days !== Infinity, names = m.wreck.map((id) => ROOMS.find((r) => r.id === id)?.name).filter(Boolean);
  const fact = (ic, label, val) => `<div class="bf"><i>${IC[ic] || ''}</i><span>${label}</span><b>${val}</b></div>`;
  $('#brief').innerHTML = `<div class="brief-h"><b>${m.name} mission</b><span>${lim ? `Hold the station for ${m.days} days until the rescue ship lands.` : 'Nobody is lost in this one: Commander Vasquez and Engineer Okoro stay as your crew. Build a Moon town that can live on its own.'}</span></div>
    <div class="brief-grid">${fact('rocket', 'Rescue', lim ? `in ${m.days} days` : 'never')}${fact('sun', 'Sunset', `day ${Math.floor(m.sunsetDay) + 1}, then two weeks of night`)}${fact('bolt', 'Solar panels', `${m.ok} working · ${m.broken} broken`)}${fact('o2', 'Oxygen', `${m.o2} kg in the tank`)}${fact('water', 'Water', `${m.water} L`)}${fact('food', 'Food', `${m.cans} tins${m.meals ? ` · ${m.meals} hot meals` : ''}`)}${fact('box', 'Materials', m.mat === Infinity ? 'endless' : `${m.mat} crates' worth`)}${fact('wrench', 'Wrecked rooms', names.join(', ') || 'none')}</div>`;
};
drawModes(); $('#btn-codex').onclick = () => ui.guide('how'); $('#btn-how').onclick = () => ui.guide('truth');
const showMission = (on) => { $('#mission').classList.toggle('hidden', !on); $('#title').classList.toggle('hidden', on); };
$('#btn-start').onclick = () => { G.audio.init(); G.audio.play('click'); showMission(true); }; $('#btn-back').onclick = () => showMission(false); $('#btn-tour').onclick = () => ui.guide('tour'); $('#btn-games').onclick = () => { G.audio.init(); ui.guide('games'); };
$('#btn-launch').onclick = () => start(mode, $('#skip-tut').checked);
document.querySelectorAll('.pillar').forEach((p) => p.insertAdjacentHTML('afterbegin', `<i>${IC[p.dataset.ic] || ''}</i>`));
if (G.hasSave()) { const b = $('#btn-continue'); b.classList.remove('hidden'); b.onclick = async () => { if (G._starting) return; G._starting = true; G.audio.init(); if (!world.warmMs) b.textContent = 'Loading…'; await world.warm(); try { loadGame(); } catch (e) { console.error(e); G.clearSave(); location.reload(); } }; }
async function start(modeKey, skip, seed) {
  G.audio.init(); G.audio.play('ok'); G.clearSave();
  G.S = createSim(modeKey, seed || ((Math.random() * 2 ** 31) >>> 0)); G.applyVoice(); installActions(G); installEvents(G);
  P.pos.set(SPAWN.x, world.heightAt(SPAWN.x, SPAWN.z), SPAWN.z); G.regoPos.set(SPAWN.x + 2, P.pos.y, SPAWN.z + 1.5); world.setZone('top'); G.ship.y = world.heightAt(G.ship.x, G.ship.z);
  $('#title').classList.add('hidden'); $('#mission').classList.add('hidden');
  const free = modeKey === 'unlimited';   // Unlimited: no story comic, straight to training, and nobody is lost
  if (!skip) { if (!free) await comicIntro(G); G.state = 'tutorial'; ui.showHud(true); await tutorial(G); ui.showHud(false); }
  G.state = 'tutorial'; await disaster(G, skip);
  applyDisaster(G.S); world.baseHit = true; for (let i = 0; i < (G.S.m.ice || 0); i++) G.spawnItem('ice', 'top', BASE.water[0] + 5.6 + (i % 3) * 1.15, BASE.water[1] - 10.6 - Math.floor(i / 3) * 1.15);   // canisters of icy polar soil by the cold store
  for (const s of SITES) s.loot.forEach((type, i) => G.spawnItem(type, 'top', s.pos[0] + 14 + (i % 3) * 2.2, s.pos[1] + 12 + Math.floor(i / 3) * 2.2)); G.spawnSurvivors();   // crates and a survivor at each outpost
  if (P.zone !== 'deep') { P.zone = 'deep'; G.S.zone = 'deep'; world.setZone('deep'); } P.pos.set(-17, TUBE.y, -10); cam.yaw = Math.PI; P.face = 0; G.regoPos.set(-15, TUBE.y, -9); if (P.carry) G.removeItem(P.carry); G.S.suitOn = false;   // you were indoors, out of your suit, when it hit
  if (free) {   // the Commander and the Engineer survived: they are crew you can give jobs to, and the stores are stocked for three people
    const S = G.S; for (const [id, name] of [['vasquez', 'Commander Vasquez'], ['okoro', 'Engineer Okoro']]) if (!S.helpers.some((h) => h.id === id)) S.helpers.push({ id, kind: 'human', name, role: 'idle', img: 'c_' + id });
    S.o2 = S.o2Cap; S.water = Math.min(S.waterCap, S.water + 24); S.cans += 24;
  }
  ui.showHud(true); G.state = 'play'; G.simOn = true; G.nextEventAt = G.S.t + 7 + G.S.rng() * 5; G.save();
  if (free) { ui.bubble('Everyone is safe! <b>Commander Vasquez and Engineer Okoro are part of your crew</b>: give them jobs at the Control Center. The big screen shows what is broken. <b>First job: power.</b> Press <b>H</b> whenever you want my advice.', 'joy', 18); G.pointTo('lift'); return; }
  ui.bubble('I am right here with you. The big screen shows what is broken. <b>First job: power.</b> Put your suit on at the airlock, take the elevator up, pull a broken panel off its mount, and bring it down to the Fix-It Bench. Press <b>H</b> whenever you want my advice.', 'happy', 18); G.pointTo('lift');
}
if (params.get('go')) start(mode, true, Number(params.get('seed')) || undefined);
