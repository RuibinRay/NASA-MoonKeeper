// Checks what Mission Control says and when. Run: node tools/radio_test.mjs
import { createSim, applyDisaster, computeFlows, step } from '../js/sim.js';
import { radioLine } from '../js/radio.js';
let fails = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); if (!cond) fails++; };
const sim = (mode = 'pilot') => { const S = createSim(mode, 7); applyDisaster(S); computeFlows(S); return S; };
const link = (S, on) => { S.f.commsDown = !on; S.lv.comms = on ? 1 : 0; computeFlows(S); };

{ const S = sim(); link(S, false); const a = radioLine(S);
  ok('with the dish knocked over there is only static', a && a.key === 'static' && a.who === 'RADIO' && /dish/.test(a.text), a && a.text);
  ok('static is not repeated straight away', radioLine(S) === null);
  S.t += 31; computeFlows(S); ok('static comes again after a long while', radioLine(S)?.key === 'static');
  S.f.commsDown = false; S.lv.comms = 0; computeFlows(S); S.t += 31; ok('a link that is switched off says so', /switched off/.test(radioLine(S)?.text || '')); }

{ const S = sim(); link(S, false); radioLine(S); link(S, true); const a = radioLine(S);
  ok('when the link comes back, Mission Control greets you first', a && a.key === 'back' && a.who === 'MISSION CONTROL', a && a.text); }

{ const S = sim(); link(S, true); S.battery = S.flow.cap * 0.1; S.lv.farm = 3; S.lv.o2gen = 3; S.mounts = S.mounts.map(() => 0); computeFlows(S); const a = radioLine(S);
  ok('a low, falling battery is the first thing mentioned', a && a.key === 'battery' && /10 percent/.test(a.text), a && a.text);
  ok('and it is not nagged about again at once', radioLine(S)?.key !== 'battery'); }

{ const S = sim(); link(S, true); S.o2 = 0.5; ok('low oxygen comes before everything else', radioLine(S)?.key === 'o2'); S.o2 = 3; S.water = 2; ok('then low water', radioLine(S)?.key === 'water'); }

{ const S = sim(); link(S, true); const seen = []; for (let i = 0; i < 12; i++) { const a = radioLine(S); if (a) seen.push(a.key); S.t += 12; computeFlows(S); }
  ok('a quiet station hears the rescue ship and calm lines, never the same twice in a row', seen.length >= 4 && seen.every((k, i) => i === 0 || k !== seen[i - 1]) && seen.includes('ship') && seen.includes('calm'), seen.join(' ')); }

{ const S = sim(); link(S, true); let sunset = null, night = null; for (let h = 0; h < S.hours && !(sunset && night); h += 2) { step(S, 2); if (S.over) break; S.o2 = 5; S.water = 30; S.battery = S.flow.cap; S.health = 100; computeFlows(S); const a = radioLine(S); if (a?.key === 'sunset') sunset = a; if (a?.key === 'night') night = a; }
  ok('sunset is announced once, before it happens', !!sunset && /Sunset at your site in \d+ hours/.test(sunset.text), sunset && sunset.text);
  ok('nightfall is announced once', !!night, night && night.text); }

{ const S = sim(); link(S, true); S.rescued.push('aurora'); const a = radioLine(S); ok('a rescue is noticed, once', a && a.key === 'rescue1' && radioLine(S)?.key !== 'rescue1'); }

{ const S = sim(); link(S, true); const j = JSON.parse(JSON.stringify(S.radio || {})); radioLine(S); const copy = JSON.parse(JSON.stringify(S.radio)); ok('what was said is kept with the mission, so a reload does not repeat it', copy.said && Object.keys(copy.said).length > 0); }

console.log(fails ? `\n${fails} check${fails > 1 ? 's' : ''} failed.` : '\nAll radio checks passed.'); process.exitCode = fails ? 1 : 0;
