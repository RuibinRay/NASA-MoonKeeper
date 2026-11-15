// Checks that the colours which carry a warning can be told apart by players with colour-blindness.
//   node tools/colour_test.mjs          (add --table to print every pair)
//
// Method: each colour is passed through a simulation of the three kinds of dichromacy (Machado, Oliveira and Fernandes 2009,
// severity 1.0, applied to linear RGB), turned into CIE L*a*b*, and compared with its partner by the plain colour difference
// dE (CIE 1976). A pair passes when, in normal sight and in all three simulations, dE is at least NEED, or when the game
// also marks the difference without colour (a different icon, a label, an arrow). NEED is this project's own bar, not a
// standard: about the difference between two neighbouring crayons. Nobody with colour-blindness has yet looked at the game.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8'), ui = fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8');
export const NEED = 20;

// ---- colour science
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const hex = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); };
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const see = (h, kind) => { const l = hex(h).map(lin); return kind === 'normal' ? l : M[kind].map((r) => clamp01(r[0] * l[0] + r[1] * l[1] + r[2] * l[2])); };
const lab = ([r, g, b]) => {
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047, Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b, Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
export const dE = (h1, h2, kind) => { const a = lab(see(h1, kind)), b = lab(see(h2, kind)); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
const KINDS = ['normal', 'protan', 'deutan', 'tritan'];
export const worst = (h1, h2) => { let w = { d: Infinity }; for (const k of KINDS) { const d = dE(h1, h2, k); if (d < w.d) w = { d, kind: k }; } return w; };

// ---- the game's colours, read from its own files so that this check follows any change
const cssVar = (name) => { const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9a-fA-F]{6})')); if (!m) throw new Error('no --' + name + ' in css/style.css'); return m[1]; };
const grab = (re, what) => { const m = ui.match(re); if (!m) throw new Error('could not find ' + what + ' in js/ui.js'); return m; };
const C = { cyan: cssVar('cyan'), amber: cssVar('amber'), red: cssVar('red'), green: cssVar('green') };
const rc = grab(/const RCOL = \{([^}]+)\}/, 'the room colours')[1], RCOL = Object.fromEntries([...rc.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => [m[1], m[2]]));
const mt = grab(/st === 1 \? '(#[0-9a-fA-F]{6})' : st === 2 \? '(#[0-9a-fA-F]{6})' : '(#[0-9a-fA-F]{6})'/, 'the solar mount colours'), MOUNT = { working: mt[1], broken: mt[2], empty: mt[3] };
const dr = grab(/r\.door \? '(#[0-9a-fA-F]{6})' : '(#[0-9a-fA-F]{6})'/, 'the door colours'), DOOR = { open: dr[1], locked: dr[2] };
const chip = (cls) => { const m = css.match(new RegExp('\\.' + cls.replace('.', '\\.') + '\\{[^}]*color:(#[0-9a-fA-F]{6})')); if (!m) throw new Error('no text colour for .' + cls); return m[1]; };
const COST = chip('cost'), GAIN = chip('cost.gain');

// Does the game mark the difference without colour? Each is looked for in the files, so the answer cannot go stale.
const cue = {
  alerts: /\.alert\.warn::before|\.alert::before/.test(css),                         // a different mark in front of an emergency and a reminder
  gauges: /\.gauge\.crit[^{]*::before/.test(css) && /\.gauge\.warn[^{]*::before/.test(css),   // a mark in front of the number on a gauge that is low or critical
  toasts: /kind === 'bad' \? IC\.alert : kind === 'good' \? IC\.ok/.test(ui),          // a different icon on good and bad notes
  chips: /\.cost\{[^}]*border-style:dashed/.test(css) && /\.cost\.gain::before/.test(css),   // a dashed square chip for a cost, a pill with a tick for a gain
  rooms: /RTXT\[st\]/.test(ui),                                                        // every room on the map carries its state in words
  mounts: /st === 2\) \{[^}]*moveTo|brokenMark/.test(ui),                              // a cross drawn on a broken panel
  doors: /lockMark|!r\.door\) \{[^}]*strokeRect/.test(ui),                             // a bar drawn across a locked door
};

const pairs = [
  ['an emergency alert and a yellow reminder', C.red, C.amber, cue.alerts, 'a different mark in front'],
  ['a gauge that is fine and one that is low', C.cyan, C.amber, cue.gauges, 'a mark on the gauge'],
  ['a gauge that is low and one that is critical', C.amber, C.red, cue.gauges, 'a mark on the gauge'],
  ['a good note and a bad note', C.green, C.red, cue.toasts, 'a different icon'],
  ['a cost and a gain on a choice', COST, GAIN, cue.chips, 'the shape of the chip and a tick'],
  ['a working solar panel and a broken one on the map', MOUNT.working, MOUNT.broken, cue.mounts, 'a cross on the broken one'],
  ['a broken solar panel and an empty mount on the map', MOUNT.broken, MOUNT.empty, cue.mounts, 'a cross on the broken one'],
  ['an open door and a locked door on the station map', DOOR.open, DOOR.locked, cue.doors, 'a bar across the locked one'],
];
const states = Object.keys(RCOL);
for (let i = 0; i < states.length; i++) for (let j = i + 1; j < states.length; j++) pairs.push([`rooms on the station map: ${states[i]} and ${states[j]}`, RCOL[states[i]], RCOL[states[j]], cue.rooms, 'the state written in the room']);

let bad = 0, byColour = 0, byCue = 0; const rows = [];
for (const [name, a, b, hasCue, cueName] of pairs) {
  const w = worst(a, b), colourOk = w.d >= NEED, pass = colourOk || hasCue;
  if (colourOk) byColour++; else if (hasCue) byCue++; else { bad++; console.log(`FAIL ${name}: ${a} and ${b} differ by only ${w.d.toFixed(1)} with ${w.kind} sight, and nothing but colour tells them apart`); }
  rows.push(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} ${a} ${b}  ` + KINDS.map((k) => `${k} ${dE(a, b, k).toFixed(0).padStart(3)}`).join('  ') + `  ${colourOk ? 'by colour' : hasCue ? 'by ' + cueName : 'NOT TOLD APART'}`);
}
if (process.argv.includes('--table')) console.log(rows.join('\n'));
console.log(bad ? `${bad} of ${pairs.length} colour pairs FAILED` : `All ${pairs.length} colour pairs can be told apart: ${byColour} by colour alone in every kind of sight, ${byCue} with the help of a mark or a label.`);
process.exit(bad ? 1 : 0);
