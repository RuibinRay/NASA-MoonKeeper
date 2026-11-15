// Checks what a three-star or a failed minigame does to the station's resources, for every job in the game.
//   node tools/jobfx_test.mjs
import { jobEffect } from '../js/jobfx.js';

const fresh = () => ({ meals: 4, raw: 6, o2: 3, o2Cap: 8, water: 20, dust: 0.03, mat: 5, battery: 200 });
// [job title, tag, quality, the one field that must change, expected change]   (null field = no consequence expected)
const CASES = [
  ['Cooking', 'cook', 'great', 'meals', +1], ['Cooking', 'cook', 'poor', 'meals', -1], ['Cooking', 'cook', 'ok', null],
  ['Picking the ripe racks', undefined, 'great', 'raw', +2], ['Picking the ripe racks', undefined, 'poor', 'raw', -2],
  ['Brushing the solar panels', undefined, 'great', 'dust', -0.03], ['Brushing the solar panels', undefined, 'poor', 'dust', +0.17],
  ['Patching the hole in the Kitchen', undefined, 'great', 'o2', +0.1], ['Patching the hole in the Kitchen', undefined, 'poor', 'o2', -0.25],
  ['Sealing the water pipe', undefined, 'poor', 'water', -3], ['Sealing the water pipe', undefined, 'great', null],
  ['Servicing the Water Plant', undefined, 'poor', 'water', -2], ['Running the waste digester', undefined, 'poor', 'water', -2],
  ['Plugging in the battery module', undefined, 'poor', 'battery', -10],
  ['Rebuilding the Bathroom', undefined, 'poor', 'mat', -1], ['Repairing the oxygen plant', undefined, 'poor', 'mat', -1],
  ['Fixing the heater circuit', undefined, 'poor', 'mat', -1], ['Installing the solar panel', undefined, 'poor', 'mat', -1],
  ['Unloading crates', undefined, 'poor', null], ['Putting on your spacesuit', undefined, 'poor', null], ['Pulling the broken panel off', undefined, 'poor', null],
  ['Replanting with potatoes', undefined, 'great', null],
];
let bad = 0;
for (const [title, tag, q, field, want] of CASES) {
  const S = fresh(), before = { ...S }, fx = jobEffect(title, tag, q); if (fx) fx[0](S);
  const changed = Object.keys(S).filter((k) => Math.abs(S[k] - before[k]) > 1e-9);
  const ok = field === null ? changed.length === 0 : changed.length === 1 && changed[0] === field && Math.abs(S[field] - before[field] - want) < 1e-9 && typeof fx[1] === 'string' && fx[1].length > 10;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${title.padEnd(34)} ${q.padEnd(6)} ${field === null ? 'no consequence' : `${field} ${want > 0 ? '+' : ''}${want}`}${ok ? '' : '   got: ' + JSON.stringify(changed.map((k) => [k, +(S[k] - before[k]).toFixed(3)]))}`);
}
// limits: never below zero, never above the tank, and endless materials stay endless
const low = { ...fresh(), meals: 0, raw: 1, o2: 0.1, water: 1, battery: 4, mat: 0 };
for (const [t, tag] of [['Cooking', 'cook'], ['Picking the ripe racks'], ['Patching the hole in the Kitchen'], ['Sealing the water pipe'], ['Plugging in the battery module'], ['Rebuilding the Bathroom']]) jobEffect(t, tag, 'poor')[0](low);
const full = { ...fresh(), o2: 7.95 }; jobEffect('Patching the hole in the Kitchen', undefined, 'great')[0](full);
const endless = { ...fresh(), mat: Infinity }; jobEffect('Rebuilding the Bathroom', undefined, 'poor')[0](endless);
const limits = Object.values(low).every((v) => v >= 0) && low.mat === 0 && full.o2 === 8 && endless.mat === Infinity;
console.log(`${limits ? 'ok  ' : 'FAIL'} limits: nothing goes below zero, oxygen stops at the tank size, endless materials stay endless`); if (!limits) bad++;
console.log(bad ? `${bad} problem(s)` : 'all job consequences behave as designed'); process.exitCode = bad ? 1 : 0;
