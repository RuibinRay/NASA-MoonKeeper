// How REGO keeps up with you without walking into walls. Pure logic; checked by `node tools/follow_test.mjs`.
// The game hands in one question, free(x, z): "may a small robot stand here?" Everything else is worked out from that.
//
// 1. Where to stand. REGO likes the spot behind your right shoulder. If that spot is in a wall, or a wall lies between
//    you and it, REGO takes the next spot on the list: behind your left shoulder, then closer in, then beside you.
// 2. How to get there. If the way is clear, straight there. If not (you went through a door), along the path you
//    walked, which is always clear because you walked it.
// 3. No running at walls. A step that would end in a wall slides along it, or is not taken.
// 4. No fussing. Once REGO has stopped, it stays put while it is near you, in sight, and not in your way.

// Places to stand, as [metres to your right, metres ahead of you]. Earlier is better.
export const SPOTS = [[1.9, -1.3], [-1.9, -1.3], [1.3, -1.0], [-1.3, -1.0], [0, -1.6], [0.9, -0.6], [-0.9, -0.6], [1.2, 0.3], [-1.2, 0.3], [0, -1.0]];
// Places to stand beside a job, measured from the thing being worked on.
export const JOB_SPOTS = [[1.25, -0.95], [-1.25, -0.95], [1.7, -1.7], [-1.7, -1.7]];

// Is every point on the straight line from a to b free? Checked every `step` metres, and at b itself.
export function clearLine(free, ax, az, bx, bz, step = 0.3) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) { const t = i / n; if (!free(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}

// The spots from `list` that REGO may use: free, and with a clear line from where you stand.
// ax, az: the place the spots are measured from (you, or the job). face: the way you face. px, pz: where you stand.
export function goodSpots(free, list, ax, az, face, px = ax, pz = az) {
  const fx = Math.sin(face), fz = Math.cos(face), out = [];
  list.forEach(([r, f], i) => { const x = ax + fz * r + fx * f, z = az - fx * r + fz * f; if (free(x, z) && clearLine(free, px, pz, x, z)) out.push({ i, x, z }); });
  return out;
}

export class Follower {
  constructor() { this.trail = []; this.spot = -1; this.betterT = 0; this.stuckT = 0; this.last = null; this.resting = false; }
  reset() { this.trail.length = 0; this.spot = -1; this.betterT = 0; this.stuckT = 0; this.last = null; this.resting = false; }

  // me: REGO's place {x, z}, changed in place. you: {x, z, face}. job: {x, z} of the thing being worked on, or null.
  // Returns { speed, moved: [dx, dz], jumped } so the caller can turn and animate REGO.
  update(dt, me, you, free, job = null) {
    const out = { speed: 0, dx: 0, dz: 0, jumped: false };
    if (this.last && Math.hypot(me.x - this.last.x, me.z - this.last.z) > 2.5) this.reset();   // REGO was moved by something else (a new zone, a loaded mission)
    // --- the path you walked, one mark every 0.7 m
    const t = this.trail, tip = t[t.length - 1];
    if (!tip || Math.hypot(you.x - tip.x, you.z - tip.z) > 0.7) { t.push({ x: you.x, z: you.z }); if (t.length > 80) t.shift(); }
    // --- where to stand
    let spots = job ? goodSpots(free, JOB_SPOTS, job.x, job.z, you.face, you.x, you.z) : [];
    const atJob = spots.length > 0; if (!atJob) spots = goodSpots(free, SPOTS, you.x, you.z, you.face);
    let pick = spots.find((s) => s.i === this.spot && this.atJob === atJob);
    if (!pick) { pick = spots[0]; this.betterT = 0; }                                         // the old spot is gone: take the best there is
    else if (spots[0].i !== pick.i) { this.betterT += dt; if (this.betterT > 0.8) { pick = spots[0]; this.betterT = 0; } } else this.betterT = 0;   // a better one must last a moment before REGO changes sides
    this.atJob = atJob; this.spot = pick ? pick.i : -1;
    const goal = pick || { x: you.x, z: you.z }, near = pick ? 0.3 : 1.1;                    // no spot at all: come close and wait
    const dGoal = Math.hypot(goal.x - me.x, goal.z - me.z);
    // --- which way to go
    let aim = goal;
    if (clearLine(free, me.x, me.z, goal.x, goal.z)) { t.length = 0; t.push({ x: you.x, z: you.z }); }   // REGO can see its spot: the old path is no longer needed
    else {
      let seen = -1; for (let i = t.length - 1; i >= 0; i--) if (clearLine(free, me.x, me.z, t[i].x, t[i].z)) { seen = i; break; }   // the newest mark REGO can see
      if (seen > 0) t.splice(0, seen);
      if (t.length && Math.hypot(t[0].x - me.x, t[0].z - me.z) < 0.45 && t.length > 1) t.shift();
      if (t.length) aim = t[0];
    }
    // --- too far behind, wedged somewhere out of sight, or found inside a wall (a loaded mission, a door that shut): appear beside you
    const dYou = Math.hypot(you.x - me.x, you.z - me.z);
    if (dYou > 32 || (this.stuckT > 1.5 && dYou > 7) || this.stuckT > 4 || !free(me.x, me.z)) { me.x = goal.x; me.z = goal.z; this.reset(); this.last = { x: me.x, z: me.z }; out.jumped = true; return out; }
    // --- happy where it is? Near you, in sight, and not in front of you. (Beside a job REGO always goes to its place.)
    if (!atJob) {
      const ahead = dYou > 1e-3 ? ((me.x - you.x) * Math.sin(you.face) + (me.z - you.z) * Math.cos(you.face)) / dYou : 1;   // 1: straight ahead of you, -1: straight behind
      const far = this.resting ? 3.4 : 2.7, front = this.resting ? 0.5 : 0.1;   // once settled, REGO puts up with a little more before it moves again
      if (dYou > 1.1 && dYou < far && ahead < front && free(me.x, me.z) && clearLine(free, you.x, you.z, me.x, me.z)) { this.resting = true; this.stuckT = 0; this.last = { x: me.x, z: me.z }; return out; }
    }
    this.resting = false;
    // --- take the step
    const dAim = Math.hypot(aim.x - me.x, aim.z - me.z);
    if (dGoal > near && dAim > 1e-4) {
      const sp = Math.min(Math.max(dGoal - (pick ? 0 : near), 0.2) * 3.2, 12), step = Math.min(sp * dt, dAim), ux = (aim.x - me.x) / dAim, uz = (aim.z - me.z) / dAim;
      let nx = me.x + ux * step, nz = me.z + uz * step;
      if (!free(nx, nz)) { if (free(nx, me.z) && Math.abs(ux) > 0.15) nz = me.z; else if (free(me.x, nz) && Math.abs(uz) > 0.15) nx = me.x; else { nx = me.x; nz = me.z; } }   // slide along the wall, or stay
      out.dx = nx - me.x; out.dz = nz - me.z; const went = Math.hypot(out.dx, out.dz);
      this.stuckT = went < step * 0.25 ? this.stuckT + dt : 0;
      me.x = nx; me.z = nz; out.speed = dt > 0 ? went / dt : 0;
    } else { this.stuckT = 0; this.resting = true; }
    this.last = { x: me.x, z: me.z };
    return out;
  }
}
