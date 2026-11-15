// MOONKEEPER — Mars: training. Eleven short steps, each finished by doing the thing, not by reading about it:
// walk, open a building, check the power, switch a machine off and on, see what dust does, mend a practice breakdown,
// drive the rover, fetch spare parts, park to recharge. Nothing can go wrong here. It runs in the real outpost.
import { tt } from '../i18n.js';
import { MARS, marsFlows } from './sim.js';
import * as T from './terrain.js';

const SOL = MARS.SOL_H, LANDER = { x: T.PAD.x + 12, z: T.PAD.z + 6 };
export const TRAINED_KEY = 'mk-mars-trained';
export const wasTrained = () => { try { return localStorage.getItem(TRAINED_KEY) === '1'; } catch (e) { return false; } };

export function makeTraining(env) {
  const { G, ui } = env, P = G.player, S = () => env.state(); let i = -1, mode = 'explore', f = {}, btn = null;
  const near = (x, z, r) => Math.hypot(P.pos.x - x, P.pos.z - z) < r, door = (id) => T.B[id].door, kw = (x) => x.toFixed(0) + ' kW';
  // go: a building, the rover or the lander to point the yellow line at. at: [x, z] of that place. done(): has the player done it?
  const steps = [
    { id: 'walk', go: 'cmd', at: () => door('cmd'), short: tt('Walk to the Command Habitat'), done: () => near(...door('cmd'), 6.5),
      say: tt('<b>Welcome to Mars training.</b> I am REGO. Walk with <b>W A S D</b> and look round with the mouse. The <b>yellow line</b> on the ground always shows the way. Follow it to the <b>Command Habitat</b>.') },
    { id: 'open', go: 'cmd', at: () => door('cmd'), short: tt('Press E at the door'), done: () => !!f.panel_cmd,
      say: tt('Every building has a door. Stand at it and press <b>E</b>. A panel opens that says what the building does, what it needs and what it gives. Try it here.') },
    { id: 'power', short: tt('Press Tab to see the power'), done: () => !!f.panel_power,
      say: tt('Good. Power is what everything runs on. Press <b>Tab</b> (or the lightning button) from anywhere to see the <b>Power Station</b>: what the Sun and the fission unit are making, what is being used, and how full the battery is.') },
    { id: 'switch', go: 'lab', at: () => door('lab'), short: tt('Switch the Research Laboratory off, then on again'), done: () => { if (!S().on.lab) f.labOff = 1; return !!f.labOff && S().on.lab; },
      say: tt('On Mars you cannot run everything all the time. Follow the line to the <b>Research Laboratory</b>, open its panel, and <b>switch it off</b>. Its door lamp turns red. Then switch it <b>on</b> again.') },
    { id: 'dust', go: 'power', at: () => door('power'), short: tt('At the Power Station, make the sky a regional storm'), enter: () => { f.kw0 = S().flow.solar; }, done: () => S().tauWant >= 4,
      say: tt('Now the great danger: <b>dust</b>. Follow the line to the <b>Power Station</b> and choose <b>Science demo: make the sky a regional storm</b>. In training the sky changes at once.') },
    { id: 'clear', go: 'power', at: () => door('power'), short: tt('Now make the sky clear again'), done: () => S().tauWant < 1,
      say: () => tt`Look up: the Sun is a dim spot and the shadows have gone. The solar field fell from <b>${kw(f.kw0 || 0)}</b> to <b>${kw(S().flow.solar)}</b>. A real storm lasts for sols. Open the panel again and <b>make the sky clear</b>.` },
    { id: 'mend', go: 'thermal', at: () => door('thermal'), short: tt('Mend the heat pump'), enter: () => { const s = S(); s.fault = { ...(s.fault || {}), thermal: true }; G.audio.play('alarm'); }, done: () => !(S().fault && S().fault.thermal),
      say: tt('<b>Practice alarm!</b> The heat pump has tripped. On a mission this is how I will warn you when something breaks. Follow the line to the <b>Thermal Control Facility</b>, press <b>E</b>, and choose <b>Mend it</b>.') },
    { id: 'drive', go: 'car', at: () => [G.car.x, G.car.z], short: tt('Get into the rover'), done: () => P.in === 'car',
      say: tt('Mended. Now the <b>rover</b>, for places too far to walk. Follow the line to it and press <b>E</b> to get in. Drive with <b>W</b> and <b>S</b>, steer with <b>A</b> and <b>D</b>.') },
    { id: 'lander', go: 'lander', at: () => [LANDER.x, LANDER.z], short: tt('Drive to the lander'), enter: () => { S().cargo = 2; }, done: () => near(LANDER.x, LANDER.z, 26),
      say: tt('The lander stands 200 m to the west, with spare parts still in its hold. <b>Drive to it.</b> Watch the rover\'s battery in the corner: every metre uses a little.') },
    { id: 'unpack', go: 'lander', at: () => [LANDER.x, LANDER.z], short: tt('Get out, then unpack the spare parts'), done: () => !S().cargo,
      say: tt('Press <b>E</b> to get out. Then press <b>E</b> at the lander and <b>unpack the spare parts</b>. Every repair that needs a part uses one of these.') },
    { id: 'park', at: () => [T.ROVER_PAD.x, T.ROVER_PAD.z], pad: true, short: tt('Drive back and park on the round pad'), done: () => Math.hypot(G.car.x - T.ROVER_PAD.x, G.car.z - T.ROVER_PAD.z) < 4.6 && Math.abs(G.car.v) < 0.6,
      say: tt('Last thing. Press <b>M</b> for the map if you want to see where you are. Then drive back and <b>park on the round pad</b> by the garage: that is where the rover recharges.') },
  ];
  const active = () => i >= 0, label = () => tt`Training ${i + 1} of ${steps.length}`;
  const point = (st) => { if (st.pad) G.goal = { id: 'pad', x: T.ROVER_PAD.x, z: T.ROVER_PAD.z, zone: 'top', name: tt('Rover charging pad'), text: null }; else if (st.go) G.pointTo(st.go); };
  const say = () => { if (!active()) return false; const st = steps[i]; ui.bubble(typeof st.say === 'function' ? st.say() : st.say, st.id === 'mend' ? 'alert' : 'happy', 22); return true; };
  function enter() { const st = steps[i]; if (st.enter) st.enter(); G.goal = null; point(st); say(); }
  function finish(skipped) {
    if (!active()) return; i = -1; const s = S(); s.train = false; if (btn) { btn.remove(); btn = null; } G.goal = null; ui.objective(null);
    if (!skipped) { try { localStorage.setItem(TRAINED_KEY, '1'); } catch (e) { /* storage may be blocked */ } G.audio.play('ok'); }
    env.done(mode, !!skipped);
  }
  function begin(m) {
    mode = m; i = 0; f = {}; S().train = true;
    if (typeof document !== 'undefined') { btn = document.createElement('button'); btn.id = 'train-skip'; btn.textContent = tt('Skip training ▸'); btn.onclick = () => finish(true); document.querySelector('#hud').appendChild(btn); }
  }
  // Every frame, after the game has drawn its own guide: keep it daytime, let the demo sky change at once, and move on when the step is done.
  function tick() {
    if (!active()) return; const s = S(), sn = s.flow.sun;
    if (sn.hour > 15.5 || sn.hour < 8) s.t = Math.floor(s.t / SOL) * SOL + (9.5 / 24) * SOL;
    if (Math.abs(s.tau - s.tauWant) > 0.01) { s.tau = s.tauWant; s.flow = marsFlows(s); }
    if (steps[i].done()) { i++; if (i >= steps.length) { i = steps.length - 1; return finish(false); } return enter(); }
    const st = steps[i], w = st.at ? st.at() : null;
    if (w && !G.goal && !near(w[0], w[1], 9)) point(st);
    if (G.goal) G.goal.text = `${label()}: ${st.short}`; else ui.objective(`<i class="dot"></i><b>${label()}</b> ${st.short}`);
  }
  const note = (kind, id) => { f[kind + '_' + id] = 1; };
  return { active, begin, intro: enter, tick, note, say, skip: () => finish(true), steps: steps.map((q) => q.id), get step() { return i; } };
}
