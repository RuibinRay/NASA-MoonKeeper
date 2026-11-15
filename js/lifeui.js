// MOONKEEPER — screens for the farms, the Water Plant, the life-support loop, research and the moon-soil experiment.
// One window with tabs: switching view never opens a second window. Jobs that take game time close the window first.
import { ROOMS, K, fmt } from './config.js';
import { computeFlows, roomOk, note, jobHours } from './sim.js';
import { CROPS, LIGHT, TECH, EXP_POTS, WX, GROW_SCALE, rackState, plant, ripeIn, canResearch, research, startExperiment, planBatch, startBatch, batchKw, subTemp, trapEta } from './life.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pct = (x) => Math.round(clamp(x, 0, 9) * 100) + '%';
const bar = (v, col = 'var(--cyan)') => `<span class="lf-bar"><i style="width:${clamp(v, 0, 1) * 100}%;background:${col}"></i></span>`;
const dots = (v, max = 1.5) => { const n = Math.round(clamp(v / max, 0, 1) * 5); return '●'.repeat(n) + '○'.repeat(5 - n); };
const LIM = { light: 'too little light', water: 'no water reaching the roots', food: 'no plant food left', warmth: 'wrong temperature', air: 'damp air' };
const STEPS = ['Collect icy soil', 'Seal the chamber', 'Pump out the air', 'Heat', 'Ice turns to vapour', 'Cold trap freezes it', 'Melt, filter, store'];
const PA = (x) => 0.5 * Math.pow(900 / 0.5, x / 100), PAX = (pa) => (Math.log(pa / 0.5) / Math.log(900 / 0.5)) * 100;   // slider position <-> pascals (a log scale)

export function installLife(G) {
  const ui = G.ui;
  if (!document.getElementById('life-css')) { const l = document.createElement('link'); l.id = 'life-css'; l.rel = 'stylesheet'; l.href = 'css/life.css'; document.head.appendChild(l); }
  const rname = (id) => ROOMS.find((r) => r.id === id).name;

  // view: 'farm' | 'pick' | 'water' | 'loop' | 'tech' | 'exp'.  home: { room } when opened in a farm, { plant: true } at the Water Plant.
  G.lifeScreen = async (view, home = {}, arg) => {
    const S = G.S; let next = null;
    await ui.window({ title: 'Life support', html: '', wide: true, onMount: (w) => {
      const body = w.querySelector('.win-b'), h2 = w.querySelector('h2');
      const run = (fn) => { next = fn; ui.close(); };
      const go = (v, a) => { view = v; arg = a; render(); };
      const live = (fn, ms = 500) => { clearInterval(ui._tick); fn(); ui._tick = setInterval(() => { if (!document.body.contains(body)) return clearInterval(ui._tick); fn(); }, ms); };
      const tabs = () => { const t = []; if (home.room) t.push(['farm', rname(home.room)], ['exp', 'Moon-soil experiment']); if (home.plant) t.push(['water', 'Water Plant']); t.push(['loop', 'Life-support loop'], ['tech', `Research (${S.sci})`]);
        return `<div class="lf-tabs">${t.map(([k, n]) => `<button data-tab="${k}" class="${k === view || (k === 'farm' && view === 'pick') ? 'on' : ''}">${n}</button>`).join('')}</div>`; };
      const wire = () => body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => go(b.dataset.tab)));
      const V = {
        // ---------------- a farm room ----------------
        farm() {
          const room = home.room; h2.textContent = rname(room);
          const paint = () => {
            const F = computeFlows(S), e = F.life.env[room], racks = S.racks.map((r, i) => [r, i]).filter(([r]) => r.room === room), nRipe = ripeIn(S, room), days = F.life.nutriUse > F.life.nutriGain ? S.nutri / (F.life.nutriUse - F.life.nutriGain) : Infinity;
            const rows = racks.map(([r, i]) => { const c = CROPS[r.kind]; if (!c) return `<div class="lf-rack"><i class="chip" style="background:#2a3642"></i><div class="nm"><b>Empty ${r.soil ? 'soil bed' : 'rack'}</b><small>Lamp off: it uses no power.</small></div><span></span><span></span><button class="lf-btn" data-pick="${i}">Plant</button></div>`;
              const st = rackState(S, r, e), left = st.grow > 0.01 ? ((1 - r.g) * c.days * 24) / st.grow : Infinity, sick = r.hp < 0.5;
              const msg = r.ripe ? ['ripe', 'RIPE — pick it!'] : !e.ok ? ['sick', 'This room is not working'] : sick ? ['sick', `Sick${st.lim ? ': ' + LIM[st.lim] : ''}`] : st.lim && st.low < 0.8 ? ['slow', `Slowed by ${LIM[st.lim]}${left < 999 ? ' · ready in ' + fmt.hrs(left) : ''}`] : ['', `Growing well · ready in ${left < 999 ? fmt.hrs(left) : '—'}`];
              return `<div class="lf-rack"><i class="chip" style="background:${c.col}"></i><div class="nm"><b>${c.name}${r.soil ? ' <small style="display:inline">(moon-soil bed)</small>' : ''}</b><small class="${msg[0]}">${msg[1]}</small></div><div><label>Grown ${pct(r.g)}</label>${bar(r.g, c.col)}</div><div><label>Health ${pct(r.hp)}</label>${bar(r.hp, r.hp > 0.6 ? 'var(--green)' : r.hp > 0.35 ? 'var(--amber)' : 'var(--red)')}</div><button class="lf-btn" data-pick="${i}">Change</button></div>`; }).join('');
            const tool = []; if (S.f.pump === room) tool.push(`<button class="lf-btn" data-fix="pump">Fix the water pump (1 material, 1 h)</button>`); if (S.f.led === room) tool.push(`<button class="lf-btn" data-fix="led">Replace the dead lamps (1 material, 1 h)</button>`);
            if (S.f.mold && room === 'tomato') tool.push(`<button class="lf-btn" data-fix="fans">Mold! Fans on full for two days (+2 kW)</button>`, `<button class="lf-btn" data-fix="cut">Mold! Cut out the sick plants</button>`);
            body.innerHTML = `${tabs()}<div class="lf-grid"><div><div class="lf-card"><h4>Racks</h4>${rows}<div class="lf-row"><button class="lf-btn go" data-do="pick" ${nRipe ? '' : 'disabled'}>Pick ${nRipe} ripe rack${nRipe === 1 ? '' : 's'} (1 h)</button>${tool.join('')}</div></div></div>
              <div><div class="lf-card"><h4>What the plants get</h4><div class="lf-env">
                <div class="${S.lv.farm === 0 ? 'bad' : ''}">Lamps, both farms<b>Level ${S.lv.farm}<span class="pm"><button data-lamp="-1">−</button><button data-lamp="1">+</button></span></b>${F.use.farm.toFixed(1)} kW now</div>
                <div>Thermostat here<b>${e.temp}°C<span class="pm"><button data-temp="-2">−</button><button data-temp="2">+</button></span></b>set to ${e.set}°C</div>
                <div class="${e.ppm > 3000 ? 'warn' : ''}">CO₂ in the air<b>${e.ppm} ppm</b>${e.ppm < 1000 ? 'plants would like more' : 'plenty for plants'}</div>
                <div class="${e.rh > 75 ? 'warn' : ''}">Humidity<b>${e.rh}%</b>${e.dry ? 'being dried' : 'nothing is drying the air!'}</div>
                <div class="${S.nutri <= 0 ? 'bad' : days < 2 ? 'warn' : ''}">Plant food<b>${S.nutri === Infinity ? '∞' : S.nutri.toFixed(2) + ' kg'}</b>${days === Infinity ? 'holding steady' : 'lasts ' + fmt.days(days)}</div>
                <div class="${S.water <= 0 ? 'bad' : ''}">Farm water<b>${F.wFarm.toFixed(1)} L a day</b>${pct(F.farmBack)} comes back</div></div></div>
                <img src="assets/img/rm_farmracks.jpg" alt="" style="width:100%;border-radius:12px;margin-bottom:10px;display:block" onerror="this.remove()"><div class="learn"><b>The rule of the scarcest thing.</b> A plant needs light, water, plant food, warmth and fresh air all at once. It grows only as fast as whichever one it has least of, so fixing anything else changes nothing. Farmers call this Liebig's law.</div></div></div>`;
            wire(); body.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => go('pick', Number(b.dataset.pick))));
            body.querySelectorAll('[data-lamp]').forEach((b) => (b.onclick = () => { S.lv.farm = clamp(S.lv.farm + Number(b.dataset.lamp), 0, 3); G.audio.play('click'); paint(); }));
            body.querySelectorAll('[data-temp]').forEach((b) => (b.onclick = () => { S.farmT[room] = clamp(S.farmT[room] + Number(b.dataset.temp), 8, 30); G.audio.play('click'); paint(); }));
            const d = body.querySelector('[data-do=pick]'); if (d) d.onclick = () => run(() => G.J.pick(room));
            body.querySelectorAll('[data-fix]').forEach((b) => (b.onclick = () => { const k = b.dataset.fix, def = ROOMS.find((r) => r.id === room), site = { x: (def.x0 + def.x1) / 2, z: def.side * 15 };
              if (k === 'fans') { S.f.mold = false; S.extraKw.fans = 2; S.fansUntil = S.t + 48; ui.toast('Fans on full. The mold is drying out.', 'good'); paint(); }
              else if (k === 'cut') { S.f.mold = false; for (const r of S.racks) if (r.room === room) { r.g = 0; r.ripe = 0; r.hp = Math.max(0.5, r.hp); } ui.toast('Sick plants removed. The racks start again from seed.'); paint(); }
              else run(() => G.J.fix(k === 'pump' ? 'Fixing the water pump' : 'Replacing the dead lamps', 1, 1, site, k === 'pump' ? ['Draining the line…', 'Swapping the pump…', 'Water is flowing again…'] : ['Unclipping the dead strips…', 'Fitting new LEDs…', 'Lights on…'], () => { S.f[k] = null; ui.toast(k === 'pump' ? 'Pump fixed. Water and plant food are reaching the roots again.' : 'Lamps replaced.', 'good'); })); }));
          };
          live(paint, 900);
        },
        // ---------------- choose what to plant in one rack ----------------
        pick() {
          const i = arg, r = S.racks[i]; h2.textContent = `What shall this ${r.soil ? 'soil bed' : 'rack'} grow?`; clearInterval(ui._tick);
          const card = (id, c) => `<button class="lf-crop" data-kind="${id}" style="--c:${c.col}"><b>${c.name}${r.kind === id ? ' · growing now' : ''}</b>
            <div class="tags"><span>${c.days} game days</span><span>${c.real} real days</span><span>${c.to === 'raw' ? `${c.food} raw food` : c.to === 'meals' ? `${c.food} ready meals` : c.to === 'herbs' ? '1 bunch' : '1 research'}</span><span>${c.t[0]}–${c.t[1]}°C</span></div>
            <div class="m"><span>Light</span><span>${dots(c.light)}</span></div><div class="m"><span>Water</span><span>${dots(c.water, 2.9)}</span></div><div class="m"><span>Plant food</span><span>${dots(c.nutri, 0.05)}</span></div>
            <p>${c.tip}</p><em>Grown in space? ${c.space}</em></button>`;
          body.innerHTML = `${tabs()}<div class="mini" style="margin-bottom:10px">Replanting takes half an hour and throws away whatever is growing in this rack now. Every crop wants something different: no rack is free.</div>
            <div class="lf-crops">${Object.entries(CROPS).map(([id, c]) => card(id, c)).join('')}<button class="lf-crop" data-kind="" style="--c:#55616d"><b>Leave it empty</b><p>The lamp switches off. Saves 1 kW at lamp level 2, and the water and plant food it would have used.</p></button></div>
            <div class="lf-row"><button class="lf-btn" data-back>Back</button></div>`;
          wire(); body.querySelector('[data-back]').onclick = () => go('farm');
          body.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => { const kind = b.dataset.kind || null, def = ROOMS.find((q) => q.id === r.room);
            run(async () => { await G.job({ title: kind ? `Replanting with ${CROPS[kind].name.toLowerCase()}` : 'Clearing the rack', hours: 0.5, steps: ['Clearing the old plants…', kind ? 'Setting seeds in the rack…' : 'Rinsing the channels…', 'Checking the pump and the lamp…'], site: { x: (def.x0 + def.x1) / 2, z: def.side * 15 }, sparks: false });
              plant(S, i, kind); note(S, kind ? `Planted ${CROPS[kind].name.toLowerCase()}.` : 'Cleared a rack.'); ui.toast(kind ? `${CROPS[kind].name} planted. Ready in about ${CROPS[kind].days} game days if they get what they need.` : 'Rack cleared. Its lamp is off.', 'good'); }); }));
        },
        // ---------------- the Water Plant ----------------
        water() {
          h2.textContent = 'Water Plant'; const w = S.wx, rec = G._wxRec || (G._wxRec = { tab: 'ice', method: 'elec', n: 1, kw: 4, hours: 5, pa: 10, ikw: 8, ihours: 10 });
          const opts = () => (rec.tab === 'ilm' ? { mode: 'ilm', kw: rec.ikw, hours: rec.ihours } : { mode: 'ice', method: rec.method, n: Math.max(1, Math.min(rec.n, 4)), kw: rec.kw, hours: rec.hours, pa: rec.pa });
          const controls = () => rec.tab === 'ilm'
            ? `<div class="mini"><span class="lf-real l">LAB-PROVEN</span>Not ice: this makes brand-new water from rock. Hydrogen (left over from the Oxygen Maker) pulls oxygen out of a dark mineral called ilmenite at about 1,000°C. It works on real Moon soil in the lab, but it is hungry: compare the power per litre.</div>
               <div class="lf-sl"><span>Furnace power</span><input type="range" id="wx-ikw" min="4" max="10" step="0.5" value="${rec.ikw}"><b id="wx-ikw-v"></b></div><div class="lf-sl"><span>Time</span><input type="range" id="wx-ih" min="2" max="12" step="1" value="${rec.ihours}"><b id="wx-ih-v"></b></div>`
            : `<div class="lf-seg">${Object.entries(WX.METHODS).map(([k, m]) => `<button data-m="${k}" class="${rec.method === k ? 'on' : ''}">${m.name}</button>`).join('')}</div><div class="mini" id="wx-mt"></div>
               <div class="lf-sl"><span>Canisters</span><input type="range" id="wx-n" min="1" max="4" step="1" value="${rec.n}"><b id="wx-n-v"></b></div>
               <div class="lf-sl" id="wx-kw-row"><span>Heater power</span><input type="range" id="wx-kw" min="1" max="8" step="0.5" value="${rec.kw}"><b id="wx-kw-v"></b></div>
               <div class="lf-sl"><span>Time</span><input type="range" id="wx-h" min="1" max="16" step="1" value="${rec.hours}"><b id="wx-h-v"></b></div>
               <div class="lf-sl"><span>Chamber pressure</span><input type="range" id="wx-pa" min="0" max="100" step="1" value="${Math.round(PAX(rec.pa))}"><b id="wx-pa-v"></b></div>`;
          body.innerHTML = `${tabs()}<div class="lf-grid even"><div>
              <div class="lf-card"><h4>Recipe</h4><div class="lf-seg"><button data-t="ice" class="${rec.tab === 'ice' ? 'on' : ''}">Ice from polar soil</button><button data-t="ilm" class="${rec.tab === 'ilm' ? 'on' : ''}">Water from rock (experimental)</button></div><div id="wx-ctl">${controls()}</div>
                ${S.flow.frost > 0 ? `<div class="learn" style="border-color:#6fb1ff"><b>FROZEN.</b> It is too cold topside for the Water Plant${w.batch ? ': the batch is waiting where it is' : ''}. Turn the Topside Heaters up to level ${S.flow.heatNeed} on the Power Board (Tab) and it carries on.</div>` : ''}<div class="lf-pred" id="wx-pred"></div><div class="lf-row"><button class="lf-btn go" id="wx-go">Start the batch</button><button class="lf-btn" id="wx-fix">Service the machine (1 material, 1 h)</button></div></div>
              <img src="assets/img/rm_waterplant.jpg" alt="" style="width:100%;border-radius:12px;margin-bottom:10px;display:block" onerror="this.remove()"><div class="learn"><span class="lf-real r">REAL</span>Ice hides only in craters near the Moon's poles that never see the Sun: a probe that crashed into one found about 5.6% water in the soil. Our base is near the equator, where there is none, so <span class="lf-real g">STORY</span>icy soil is hauled here in canisters from a polar mine. <span class="lf-real c">IDEA</span>Nobody has run an ice plant on the Moon yet; microwaves pulling ice out of frozen soil has been shown in the lab.</div></div>
            <div><div class="lf-card"><h4>Machine dashboard</h4><div class="lf-steps" id="wx-steps"></div><div class="lf-g" id="wx-g"></div><canvas class="lf-cv" id="wx-cv" width="560" height="210" style="margin-top:8px"></canvas><div class="mini" id="wx-leg" style="margin-top:6px"></div></div></div></div>`;
          wire(); const $ = (q) => body.querySelector(q);
          let plan = null;
          const predict = () => { const o = opts(); plan = planBatch(S, o, S.flow.sun.factor); const kwhL = plan.water > 0.05 ? plan.kwh / plan.water : Infinity, busy = !!w.batch, noIce = o.mode === 'ice' && w.ice < o.n;
            const spare = S.flow.supply - S.flow.demand + (S.flow.use.wx || 0), short = spare < plan.peakKw && S.battery < plan.kwh; if (short) plan.warn.push(`Not enough power right now: the station has ${Math.max(0, spare).toFixed(1)} kW to spare and ${Math.round(S.battery)} kWh in the battery, and this run wants ${plan.kwh.toFixed(0)} kWh. It may crawl and make little or no water. Wait for sunlight or charge the battery first.`);
            $('#wx-pred').innerHTML = `Expect <b>${plan.water.toFixed(1)} L</b> of water${o.mode === 'ice' ? ` from ${(plan.max).toFixed(1)} kg of ice (<b>${pct(plan.eff)}</b> recovered)` : ` (the chemistry allows at most ${plan.max.toFixed(1)} L)`}, using <b>${plan.kwh.toFixed(0)} kWh</b>${kwhL < 999 ? ` — <b>${kwhL.toFixed(1)} kWh a litre</b>` : ''}, drawing up to <b>${plan.peakKw.toFixed(1)} kW</b>.${plan.warn.map((x) => `<div class="lf-warn">⚠ ${x}</div>`).join('')}${!plan.warn.length ? '<div class="lf-ok">✓ This recipe looks good.</div>' : ''}${noIce && !busy ? `<div class="lf-warn">⚠ Only ${w.ice} canister${w.ice === 1 ? '' : 's'} in the hopper. Carry icy soil here and press E to load it.</div>` : ''}`;
            $('#wx-go').disabled = busy || noIce; $('#wx-go').textContent = busy ? 'A batch is running…' : 'Start the batch'; };
          const labels = () => { if (rec.tab === 'ilm') { $('#wx-ikw-v').textContent = rec.ikw + ' kW'; $('#wx-ih-v').textContent = rec.ihours + ' h'; return; }
            $('#wx-n-v').textContent = `${rec.n} (have ${w.ice})`; $('#wx-kw-v').textContent = rec.method === 'solar' ? 'free' : rec.kw + ' kW'; $('#wx-h-v').textContent = rec.hours + ' h'; $('#wx-pa-v').textContent = `${rec.pa < 10 ? rec.pa.toFixed(1) : Math.round(rec.pa)} Pa`; $('#wx-kw-row').style.opacity = rec.method === 'solar' ? 0.35 : 1;
            $('#wx-mt').innerHTML = `${WX.METHODS[rec.method].text} At ${rec.pa < 10 ? rec.pa.toFixed(1) : Math.round(rec.pa)} Pa, ice turns to vapour at <b>${rec.pa > WX.TRIPLE_PA ? '— it melts instead' : Math.round(subTemp(rec.pa)) + '°C'}</b>.`; };
          const bind = () => { const on = (id, fn) => { const x = $(id); if (x) x.oninput = () => { fn(Number(x.value)); labels(); predict(); dash(); }; };
            on('#wx-n', (v) => (rec.n = v)); on('#wx-kw', (v) => (rec.kw = v)); on('#wx-h', (v) => (rec.hours = v)); on('#wx-pa', (v) => (rec.pa = PA(v))); on('#wx-ikw', (v) => (rec.ikw = v)); on('#wx-ih', (v) => (rec.ihours = v));
            body.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { rec.method = b.dataset.m; $('#wx-ctl').innerHTML = controls(); bind(); labels(); predict(); dash(); })); };
          body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { rec.tab = b.dataset.t; go('water'); }));
          $('#wx-go').onclick = () => { if (S.flow.frost > 0) return ui.toast(`The Water Plant is frozen. Turn the Topside Heaters up to level ${S.flow.heatNeed} first.`, 'bad'); const o = opts(), r = startBatch(S, o); if (r === 'noice') return ui.toast('Not enough canisters in the hopper.', 'bad'); if (r === 'noh2') return ui.toast('Water from rock needs hydrogen from the Oxygen Maker. The Oxygen Room must be working.', 'bad'); if (r !== 'ok') return;
            G.audio.play('ok'); note(S, o.mode === 'ilm' ? 'Started a water-from-rock run.' : `Started an ice batch (${o.n} canister${o.n > 1 ? 's' : ''}).`); ui.toast('Batch started. It runs by itself; watch the vapour pipe, or go and do something else.', 'good'); predict(); dash(); };
          $('#wx-fix').onclick = () => { if (w.batch) return ui.toast('Wait for the batch to finish first.', 'bad'); run(() => G.J.fix('Servicing the Water Plant', 1, 1, { x: 54.5, z: -12 }, ['Checking the door seals…', 'Scraping old frost off the cold trap…', 'Testing for leaks…'], () => { w.cond = 1; w.seal = 1; ui.toast('Water Plant serviced: seals tight, cold trap clean.', 'good'); })); };
          const dash = () => { const b = w.batch, cv = $('#wx-cv'); if (!cv) return; const c = cv.getContext('2d'), W = 560, H = 210, o = opts();
            const ts = b && b.mode === 'ice' ? (b.pa > WX.TRIPLE_PA ? 0 : subTemp(b.pa)) : 0, step = !b ? (w.ice > 0 ? 0 : -1) : b.mode === 'ilm' ? (b.T < WX.ILM_T ? 3 : 4) : b.total - b.left < 0.3 ? 2 : b.T < ts - 0.5 && b.sub < 0.01 ? 3 : b.ice > 0.02 ? (b.rate > 0 ? 5 : 4) : 6;
            $('#wx-steps').innerHTML = STEPS.map((s, i) => `<span class="${i === step ? 'on' : b && i < step ? 'done' : ''}">${i + 1}. ${b && b.mode === 'ilm' && i === 4 ? 'Rock gives up oxygen' : s}</span>`).join('');
            const G6 = b ? [['Soil temperature', `${Math.round(b.T)}°C`], ['Chamber pressure', b.mode === 'ilm' ? 'sealed' : `${b.pa < 10 ? b.pa.toFixed(1) : Math.round(b.pa)} Pa`], ['Power use', `${(batchKw(b) * (b.method === 'solar' ? 1 : S.flow.eff)).toFixed(1)} kW`], ['Water caught', `${b.got.toFixed(1)} L`], ['Recovered so far', pct(b.got / b.max)], ['Time left', fmt.hrs(b.left)]]
              : [['Canisters waiting', w.ice], ['Water made so far', `${w.made.toFixed(0)} L`], ['Batches run', w.runs], ['Machine condition', pct(w.cond)], ['Door seals', pct(w.seal)], ['Cold trap catches', pct(trapEta(S, 10))]];
            $('#wx-g').innerHTML = G6.map(([a, v]) => `<div>${a}<b>${v}</b></div>`).join('');
            // graph: soil temperature (amber) and water caught (blue) against time. While idle it shows what the recipe predicts.
            const log = b ? b.log : plan ? plan.log : [], total = b ? b.total : o.hours, mode = b ? b.mode : o.mode, T0 = mode === 'ilm' ? 0 : -160, T1 = mode === 'ilm' ? 1100 : 60, maxW = Math.max(0.5, b ? b.max : plan ? plan.max : 1);
            const X = (t) => 40 + (t / total) * (W - 56), YT = (T) => H - 24 - ((T - T0) / (T1 - T0)) * (H - 40), YW = (x) => H - 24 - (x / maxW) * (H - 40);
            c.clearRect(0, 0, W, H); c.strokeStyle = '#1c2c3c'; c.lineWidth = 1; c.font = '10px Inter,sans-serif'; c.fillStyle = '#7f95a8'; c.textAlign = 'right';
            for (let k = 0; k <= 4; k++) { const y = H - 24 - (k / 4) * (H - 40); c.beginPath(); c.moveTo(40, y); c.lineTo(W - 16, y); c.stroke(); c.fillText(Math.round(T0 + (k / 4) * (T1 - T0)) + '°', 36, y + 3); }
            c.textAlign = 'center'; for (let k = 0; k <= 4; k++) c.fillText(((k / 4) * total).toFixed(0) + ' h', X((k / 4) * total), H - 8);
            if (mode === 'ice') { const pa = b ? b.pa : o.pa, y = YT(pa > WX.TRIPLE_PA ? 0 : subTemp(pa)); c.setLineDash([4, 4]); c.strokeStyle = '#49e6ff66'; c.beginPath(); c.moveTo(40, y); c.lineTo(W - 16, y); c.stroke(); c.setLineDash([]); c.fillStyle = '#49e6ff'; c.textAlign = 'left'; c.fillText('ice turns to vapour here', 46, y - 4); }
            const line = (idx, Y, col) => { if (!log.length) return; c.strokeStyle = col; c.lineWidth = 2.2; if (!b) c.setLineDash([6, 5]); c.beginPath(); log.forEach((p, i) => (i ? c.lineTo(X(p[0]), Y(p[idx])) : c.moveTo(X(p[0]), Y(p[idx])))); c.stroke(); c.setLineDash([]); };
            line(1, YT, '#ffb347'); line(2, YW, '#49b6ff');
            $('#wx-leg').innerHTML = `<span style="color:#ffb347">▬ soil temperature</span> · <span style="color:#49b6ff">▬ water caught (top of graph = ${maxW.toFixed(1)} L)</span> · ${b ? 'live' : 'dashed = what this recipe predicts'}${w.last && !b ? ` · last batch: ${w.last.water.toFixed(1)} L, ${pct(w.last.eff)}, ${w.last.kwh.toFixed(0)} kWh` : ''}`; };
          bind(); labels(); predict(); live(() => { dash(); if (!w.batch && $('#wx-go') && $('#wx-go').disabled && !(rec.tab === 'ice' && w.ice < rec.n)) predict(); }, 400);
        },
        // ---------------- the life-support loop: where every litre and every breath goes ----------------
        loop() {
          h2.textContent = 'Life-support loop'; let t0 = performance.now();
          body.innerHTML = `${tabs()}<canvas class="lf-cv" id="lp-cv" width="940" height="360"></canvas><div class="lf-grid even" style="margin-top:12px"><div class="lf-card"><h4>Made and used, each day</h4><div id="lp-bal"></div></div><div class="lf-card"><h4>The last days</h4><canvas class="lf-cv" id="lp-tr" width="440" height="170"></canvas><div class="mini" id="lp-leg" style="margin-top:6px"></div></div></div>
            <div class="learn"><b>Nothing is thrown away.</b> Your breath feeds the plants, the plants give back a little oxygen, the water they breathe out is caught and drunk again, and waste becomes plant food. But plants only help: six racks give less than a quarter of the oxygen one person needs. The machines do the rest, and every machine eats power.</div>`;
          wire(); const cv = body.querySelector('#lp-cv'), c = cv.getContext('2d'), tr = body.querySelector('#lp-tr'), c2 = tr.getContext('2d');
          const N = { plants: [140, 60, 'FARMS'], crew: [470, 60, 'CREW'], tank: [800, 60, 'WATER TANK'], air: [220, 200, 'OXYGEN TANK'], rec: [470, 200, 'RECYCLER & WASTE'], wx: [860, 200, 'WATER PLANT'], dust: [90, 320, 'MOON-DUST PLANT'], o2m: [700, 320, 'OXYGEN MAKER'] };
          const paint = () => { const F = computeFlows(S), L = F.life, t = (performance.now() - t0) / 1000, w = S.wx;
            c.clearRect(0, 0, 940, 360); c.font = '600 11px Inter,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
            const arrow = (a, b, v, unit, col, label, bend = 0) => { const [x0, y0] = N[a], [x1, y1] = N[b], on = v > 0.004, mx = (x0 + x1) / 2 + bend * (y1 - y0) * 0.25, my = (y0 + y1) / 2 - bend * (x1 - x0) * 0.25;
              c.strokeStyle = on ? col : '#26323e'; c.lineWidth = on ? 2 + Math.min(4, v * 1.2) : 1.5; c.setLineDash(on ? [9, 7] : [3, 6]); c.lineDashOffset = on ? -t * 26 : 0; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx, my, x1, y1); c.stroke(); c.setLineDash([]);
              const lx = (x0 + 2 * mx + x1) / 4, ly = (y0 + 2 * my + y1) / 4, txt = `${label} ${v < 10 ? v.toFixed(2) : v.toFixed(0)} ${unit}`, tw = c.measureText(txt).width + 10; c.fillStyle = '#081019e6'; c.fillRect(lx - tw / 2, ly - 8, tw, 16); c.fillStyle = on ? col : '#55616d'; c.fillText(txt, lx, ly); };
            arrow('air', 'crew', F.o2Use, 'kg', '#58e08a', 'oxygen'); arrow('crew', 'plants', F.co2Out, 'kg', '#c8a0ff', 'CO₂ breathed out', 0.25); arrow('plants', 'air', F.o2Farm, 'kg', '#58e08a', 'plant oxygen', 0.5);
            arrow('tank', 'crew', F.wCrew, 'L', '#49b6ff', 'water'); arrow('tank', 'o2m', K.H2O_PER_KG_O2 * F.o2Elec, 'L', '#49b6ff', 'water split'); arrow('o2m', 'air', F.o2Elec, 'kg', '#58e08a', 'oxygen');
            arrow('crew', 'rec', F.wCrew * F.rate, 'L', '#7fd0ff', 'used water'); arrow('plants', 'rec', F.wFarm * F.farmBack, 'L', '#7fd0ff', 'water from damp air', 0.45); arrow('rec', 'tank', F.wCrew * F.rate + F.wFarm * F.farmBack, 'L', '#49b6ff', 'clean water', -0.5);
            arrow('rec', 'plants', L.nutriGain, 'kg', '#ffb347', 'plant food', 0.45); arrow('dust', 'air', F.o2Isru, 'kg', '#58e08a', 'oxygen from rock'); arrow('wx', 'tank', w.batch ? (w.batch.rate || 0) * 24 * 0.8 : 0, 'L', '#49b6ff', w.batch ? 'new water' : 'idle');
            for (const k in N) { const [x, y, nm] = N[k], sub = { crew: `${F.people} ${F.people > 1 ? 'people' : 'person'}`, air: `${S.o2.toFixed(1)} kg`, plants: `${L.racksOn} racks · ${F.use.farm.toFixed(1)} kW`, o2m: `level ${S.lv.o2gen} · ${F.use.o2gen} kW`, tank: `${S.water.toFixed(0)} L`, rec: `${pct(F.rate)} back · ${F.use.recycler} kW`, wx: w.batch ? `${fmt.hrs(w.batch.left)} left` : `${w.ice} canisters`, dust: F.o2Isru > 0 ? `${F.use.isru} kW` : 'off' }[k];
              c.fillStyle = '#0c1622'; c.strokeStyle = '#2d445a'; c.lineWidth = 1.5; const bw = 150, bh = 40; c.beginPath(); c.roundRect(x - bw / 2, y - bh / 2, bw, bh, 9); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.font = '700 11.5px Inter,sans-serif'; c.fillText(nm, x, y - 7); c.fillStyle = '#9bb0c3'; c.font = '600 10.5px Inter,sans-serif'; c.fillText(sub, x, y + 9); c.font = '600 11px Inter,sans-serif'; }
            const foodGrow = S.racks.reduce((a, r) => { const cr = CROPS[r.kind]; if (!cr || cr.to === 'herbs' || cr.to === 'sci' || !L.env[r.room].ok) return a; const st = rackState(S, r, L.env[r.room]); return a + (cr.food * st.grow) / cr.days; }, 0);
            const rows = [['Oxygen', F.o2Elec + F.o2Isru + F.o2Farm, F.o2Use + F.o2Leak, 'kg', F.o2Days], ['Water', F.wCrew * F.rate + F.wFarm * F.farmBack, F.wUsed + K.H2O_PER_KG_O2 * F.o2Elec + S.f.leakWater * 24, 'L', F.waterDays], ['Food', foodGrow, F.foodUse, 'meals', F.foodDays], ['Power', F.supply, F.demand, 'kW', F.battHours / 24], ['Plant food', L.nutriGain, L.nutriUse, 'kg', L.nutriUse > L.nutriGain ? S.nutri / (L.nutriUse - L.nutriGain) : Infinity], ['CO₂', L.co2Fix, F.co2Out, 'kg', Infinity]];
            body.querySelector('#lp-bal').innerHTML = rows.map(([n, a, b2, u, days], i) => { const m = Math.max(a, b2, 1e-6), net = a - b2; return `<div class="lf-bal"><b>${n}</b><div><small>${i === 5 ? 'plants take in' : 'made'} ${a.toFixed(2)} ${u}</small>${bar(a / m, 'var(--green)')}</div><div><small>${i === 5 ? 'crew breathes out' : 'used'} ${b2.toFixed(2)} ${u}</small>${bar(b2 / m, i === 5 ? '#c8a0ff' : 'var(--amber)')}</div><span class="net" style="color:${net >= -1e-6 || i === 5 ? 'var(--green)' : days < 1.5 ? 'var(--red)' : 'var(--amber)'}">${i === 5 ? pct(a / b2) : net >= 0 ? 'OK' : days === Infinity ? '' : fmt.days(days)}</span></div>`; }).join('');
            // trends from the mission log: battery, oxygen, water, food (each as a share of full)
            const hs = S.hist.slice(-96), W2 = 440, H2 = 170; c2.clearRect(0, 0, W2, H2); c2.strokeStyle = '#1c2c3c'; c2.lineWidth = 1; for (let k = 0; k <= 4; k++) { const y = 10 + (k / 4) * (H2 - 30); c2.beginPath(); c2.moveTo(8, y); c2.lineTo(W2 - 8, y); c2.stroke(); }
            if (hs.length > 1) { const ta = hs[0][0], tb = hs[hs.length - 1][0]; [[1, '#ffd257'], [2, '#58e08a'], [3, '#49b6ff'], [4, '#ff8a5a']].forEach(([i, col]) => { c2.strokeStyle = col; c2.lineWidth = 2; c2.beginPath(); hs.forEach((h, k) => { const x = 8 + ((h[0] - ta) / Math.max(1e-6, tb - ta)) * (W2 - 16), y = 10 + (1 - clamp(h[i], 0, 1)) * (H2 - 30); k ? c2.lineTo(x, y) : c2.moveTo(x, y); }); c2.stroke(); });
              c2.fillStyle = '#7f95a8'; c2.font = '10px Inter,sans-serif'; c2.textAlign = 'left'; c2.fillText(`${fmt.hrs(tb - ta)} ago`, 8, H2 - 6); c2.textAlign = 'right'; c2.fillText('now', W2 - 8, H2 - 6); }
            else { c2.fillStyle = '#7f95a8'; c2.font = '12px Inter,sans-serif'; c2.textAlign = 'center'; c2.fillText('The graph fills in as the mission goes on.', W2 / 2, H2 / 2); } };
          body.querySelector('#lp-leg').innerHTML = '<span style="color:#ffd257">▬ battery</span> · <span style="color:#58e08a">▬ oxygen</span> · <span style="color:#49b6ff">▬ water</span> · <span style="color:#ff8a5a">▬ food</span>';
          live(paint, 120);
        },
        // ---------------- research ----------------
        tech() {
          h2.textContent = 'Farm and water research'; clearInterval(ui._tick);
          const paint = () => { body.innerHTML = `${tabs()}<div class="lf-card"><h4>Research points: ${S.sci}</h4><div class="mini">You earn a point the first time you harvest each crop, for every rack of thale cress, and the first time you try each way of heating icy soil. The moon-soil experiment is worth 3, and making water from rock is worth 2. Curiosity pays.</div></div>
            <div class="lf-card"><h4>Upgrades</h4>${Object.entries(TECH).map(([id, t]) => `<div class="lf-tech"><div><b>${t.name}</b><small>${t.text}${t.needs === 'exp' && !(S.exp && S.exp.done) ? ' <i>Finish the moon-soil experiment first.</i>' : ''}</small></div>${S.tech[id] ? '<span class="got">✓ BUILT</span>' : `<button class="lf-btn ${canResearch(S, id) ? 'go' : ''}" data-tech="${id}" ${canResearch(S, id) ? '' : 'disabled'}>${t.sci} research + ${t.mat} materials</button>`}</div>`).join('')}</div>`;
            wire(); body.querySelectorAll('[data-tech]').forEach((b) => (b.onclick = () => { if (research(S, b.dataset.tech)) { G.audio.play('ok'); note(S, `Researched: ${TECH[b.dataset.tech].name}.`, 'good'); ui.toast(`${TECH[b.dataset.tech].name} built!`, 'good'); paint(); } })); };
          paint();
        },
        // ---------------- the moon-soil experiment ----------------
        exp() {
          const room = home.room; h2.textContent = 'The moon-soil experiment';
          body.innerHTML = `${tabs()}<div class="lf-grid even"><div><canvas class="lf-cv" id="ex-cv" width="460" height="250"></canvas><div class="lf-row" id="ex-act"></div></div>
            <div><img src="assets/img/rm_experiment.jpg" alt="" style="width:100%;border-radius:12px;margin-bottom:10px;display:block" onerror="this.remove()"><div class="lf-card"><h4>The question</h4><div class="mini" style="font-size:13px;line-height:1.5">Could we farm in moon soil instead of carrying water tanks and pumps from Earth? Plant the same seeds three ways, give them the same light and water, and compare. That is a fair test.</div><div id="ex-res" style="margin-top:8px"></div></div>
              <div class="learn"><span class="lf-real r">REAL</span>In 2022 scientists grew thale cress in soil brought back by Apollo 11, 12 and 17: less than a gram per plant. Nearly every seed sprouted, but the plants were slower and smaller, with stunted roots, and some turned reddish-black from stress. The soil from Apollo 11, the most sun-battered, did worst. <span class="lf-real l">LAB</span>Treating imitation moon soil with compost, helpful fungi and bacteria has helped plants since then. <b>On the open surface nothing can grow at all: no air, no liquid water, and 300 degrees between day and night.</b></div></div></div>`;
          wire(); const cv = body.querySelector('#ex-cv'), c = cv.getContext('2d');
          const paint = () => { const x = S.exp, g = x ? x.g : 0, t = performance.now() / 1000; c.clearRect(0, 0, 460, 250); c.fillStyle = '#ff4fd822'; c.fillRect(20, 14, 420, 8); c.textAlign = 'center'; c.font = '600 11px Inter,sans-serif';
            EXP_POTS.forEach((p, i) => { const cx = 85 + i * 145, base = 190, s = g * p.size; c.fillStyle = i === 0 ? '#2f6f9a' : i === 1 ? '#6a4a32' : '#6f6b66'; c.beginPath(); c.moveTo(cx - 42, base); c.lineTo(cx + 42, base); c.lineTo(cx + 32, base + 34); c.lineTo(cx - 32, base + 34); c.closePath(); c.fill(); c.fillStyle = i === 0 ? '#49b6ff' : i === 1 ? '#4f3624' : '#8a8580'; c.fillRect(cx - 40, base - 5, 80, 7);
              if (s > 0.01) { const sway = Math.sin(t * 1.4 + i) * 3 * s, hgt = 110 * s; c.strokeStyle = p.leaf; c.lineWidth = 2 + 2 * s; c.beginPath(); c.moveTo(cx, base - 4); c.quadraticCurveTo(cx + sway, base - 4 - hgt * 0.6, cx + sway * 1.6, base - 4 - hgt); c.stroke(); c.fillStyle = p.leaf;
                for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + i, r = 26 * s + 6 * s * Math.sin(t + k); c.beginPath(); c.ellipse(cx + Math.cos(a) * r * 0.7, base - 8 - Math.abs(Math.sin(a)) * 5, r * 0.55, r * 0.22, a, 0, 6.283); c.fill(); } c.beginPath(); c.arc(cx + sway * 1.6, base - 6 - hgt, 3 + 3 * s, 0, 6.283); c.fill(); }
              c.fillStyle = '#dbe7f2'; c.fillText(['Water + plant food', 'Treated moon soil', 'Raw moon soil'][i], cx, base + 50); });
            const act = body.querySelector('#ex-act'), ok = roomOk(S, room) && S.lv.farm > 0; const key = `${!!x}|${x && x.done}|${ok}|${x && x.room}`;
            if (act.dataset.k !== key) { act.dataset.k = key; act.innerHTML = !x || x.done ? `<button class="lf-btn go" id="ex-go" ${ok ? '' : 'disabled'}>${x ? 'Run it again' : 'Plant the three pots'}</button>${ok ? '' : '<span class="lf-warn">This farm needs air, power and its lamps on.</span>'}` : `<span class="mini">Growing in the ${rname(x.room)}… the pots sit on the bench by the wall.</span>`;
              const b = act.querySelector('#ex-go'); if (b) b.onclick = () => { startExperiment(S, room); note(S, 'Started the moon-soil experiment.'); G.audio.play('ok'); ui.toast('Three pots planted. Come back in about half a game day.', 'good'); }; }
            const res = body.querySelector('#ex-res'), rk = `${!!x}|${x && x.done}|${x ? Math.round(x.g * 20) : 0}`;
            if (res.dataset.k !== rk) { res.dataset.k = rk; res.innerHTML = !x ? '' : `<div class="stat"><span>Progress</span><b>${x.done ? 'finished' : pct(x.g)}</b></div>` + (x.done ? EXP_POTS.map((p) => `<div class="lf-tech"><div><b>${p.name}</b><small>${p.note}</small></div><span class="got" style="color:${p.leaf}">${Math.round(p.size * 100)}% size</span></div>`).join('') + '<div class="lf-ok">✓ +3 research. Treated moon-soil beds can now be researched.</div>' : ''); } };
          live(paint, 100);
        },
      };
      const render = () => { (V[view] || V.loop)(); };
      render();
    } });
    clearInterval(ui._tick);
    if (next) await next();
  };
  G.farmPanel = (room) => G.lifeScreen('farm', { room });
  G.waterPlant = () => G.lifeScreen('water', { plant: true });
  G.loopScreen = () => G.lifeScreen('loop', {});
}
