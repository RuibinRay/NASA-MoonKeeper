// Distills the raw NASA downloads in data/raw into the compact module the game loads: js/nasa-events.js
// Usage: node tools/build_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');
const J = (f) => JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
const csv = (f) => {
  const rows = [];
  for (const line of fs.readFileSync(path.join(RAW, f), 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const out = []; let cur = ''; let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur); rows.push(out);
  }
  return rows;
};

// ---------- 1. DONKI: solar flares + solar energetic particle (SEP) storms + fast CMEs + geomagnetic storms
const flr = J('donki_flr_2011_2026.json');
const sep = J('donki_sep_2011_2026.json');
const cme = J('donki_cmeanalysis_2011_2026.json');
const gst = J('donki_gst_2011_2026.json');

const nearEarth = (s) => (s.instruments || []).some((i) => /^(GOES|SOHO|ACE)/.test(i.displayName));
const gt100 = (s) => (s.instruments || []).some((i) => /^GOES.*>100 MeV/.test(i.displayName));
const sepById = new Map(sep.map((s) => [s.sepID, s]));
const cmeSpeed = new Map();
for (const c of cme) {
  const cur = cmeSpeed.get(c.associatedCMEID);
  if (!cur || c.speed > cur.v) cmeSpeed.set(c.associatedCMEID, { v: Math.round(c.speed), link: c.associatedCMELink || c.link });
}
const kpByCme = new Map();
for (const g of gst) {
  const kp = Math.max(...(g.allKpIndex || []).map((k) => k.kpIndex || 0), 0);
  for (const le of g.linkedEvents || []) if (/CME/.test(le.activityID)) kpByCme.set(le.activityID, Math.max(kp, kpByCme.get(le.activityID) || 0));
}

const storms = [];
const usedSep = new Set();
for (const f of flr) {
  const cls = f.classType || '';
  const big = /^X/.test(cls);
  const m5 = /^M[5-9]/.test(cls);
  if (!big && !m5) continue;
  const links = (f.linkedEvents || []).map((l) => l.activityID);
  const seps = links.filter((id) => /SEP/.test(id)).map((id) => sepById.get(id)).filter((s) => s && nearEarth(s));
  if (!big && !seps.length) continue;
  seps.forEach((s) => usedSep.add(s.sepID));
  let best = null; let kp = 0;
  for (const id of links.filter((x) => /CME/.test(x))) {
    const c = cmeSpeed.get(id);
    if (c && (!best || c.v > best.v)) best = c;
    kp = Math.max(kp, kpByCme.get(id) || 0);
  }
  const hard = seps.some(gt100);
  storms.push({
    t: f.peakTime || f.beginTime, cls, ar: f.activeRegionNum || 0, loc: f.sourceLocation || '', link: f.link,
    sev: hard ? 3 : seps.length ? 2 : 1,
    sep: seps.length ? { t: seps[0].eventTime, inst: seps.find(gt100)?.instruments[0].displayName || seps[0].instruments[0].displayName, link: seps[0].link } : null,
    cme: best, kp: kp || 0,
  });
}
storms.sort((a, b) => a.t.localeCompare(b.t));

// ---------- 2. Apollo Passive Seismic Experiment (NASA PDS): shallow moonquakes + meteoroid impacts
const doy = (y, d, hhmm = '0') => {
  const dt = new Date(Date.UTC(y, 0, 1) + (Number(d) - 1) * 864e5);
  const h = String(hhmm).padStart(4, '0');
  return dt.toISOString().slice(0, 10) + 'T' + h.slice(0, 2) + ':' + h.slice(2) + 'Z';
};
const sm = csv('pds_apollo_nakamura_1979_sm_locations.csv').slice(1);
const quakes = sm.map((r) => ({
  t: doy(Number(r[0]), r[1], String(r[2]).padStart(2, '0') + String(r[3]).padStart(2, '0')),
  mag: Number(r[7]), lat: r[5] === '' ? null : Number(r[5]), lon: r[6] === '' ? null : Number(r[6]),
}));

const lev = csv('pds_apollo_levent.1008weber.csv');
const H = lev[0]; const ix = (n) => H.indexOf(n);
const types = {};
const impactsAll = [];
for (const r of lev.slice(1)) {
  const t2 = (r[ix('T2')] || '').trim();
  types[t2] = (types[t2] || 0) + 1;
  if (t2 !== 'C') continue; // C = meteoroid impact (see PDS label)
  const amps = ['A1', 'A2', 'A3', 'A4'].map((a) => parseFloat(r[ix(a)])).filter((x) => !isNaN(x));
  if (!amps.length) continue;
  const start = String(r[ix('S')]).padStart(4, '0'); const end = String(r[ix('E')]).padStart(4, '0');
  let dur = null;
  if (end !== '9999') {
    dur = (Number(end.slice(0, 2)) * 60 + Number(end.slice(2))) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(2)));
    if (dur < 0) dur += 1440;
  }
  impactsAll.push({ t: doy(1900 + Number(r[ix('Y')]), r[ix('JD')], start), amp: Math.max(...amps), st: amps.length, dur });
}
const impacts = impactsAll.filter((i) => i.amp >= 12 && i.st >= 2).sort((a, b) => a.t.localeCompare(b.t));

// ---------- 3. data.nasa.gov "Meteorite Landings": witnessed falls, for size comparisons
const met = csv('datanasa_meteorite_landings.csv').slice(1);
const meteorites = met
  .filter((r) => r[5] === 'Fell' && Number(r[4]) >= 200 && Number(r[4]) <= 400000 && Number(r[6]) >= 1800 && r[7] && r[8])
  .map((r) => ({ n: r[0], g: Math.round(Number(r[4])), y: Number(r[6]), c: r[3] }));

const stats = {
  built: new Date().toISOString().slice(0, 10),
  donkiRange: '2011-01-01 to 2026-11-14',
  flaresTotal: flr.length,
  flaresX: flr.filter((f) => /^X/.test(f.classType)).length,
  sepTotal: sep.length,
  sepNearEarth: sep.filter(nearEarth).length,
  cmeFast: cme.length,
  gstTotal: gst.length,
  apolloEvents: lev.length - 1,
  apolloTypes: types,
  apolloImpacts: types.C, apolloDeep: (types.A || 0) + (types.M || 0), apolloThermal: types.T,
  apolloShallow: quakes.length,
  meteoriteFalls: met.filter((r) => r[5] === 'Fell').length,
  meteoritesTotal: met.length,
};

const out = `// AUTO-GENERATED by tools/build_data.mjs from real NASA downloads in data/raw. Do not edit by hand.
// STORMS  : NASA CCMC DONKI (flares, SEP, CME analysis, geomagnetic storms)  https://ccmc.gsfc.nasa.gov/DONKI/
// QUAKES, IMPACTS : Apollo Passive Seismic Experiment Expanded Event Catalog (NASA PDS, urn:nasa:pds:apollo_seismic_event_catalog)
// METEORITES : "Meteorite Landings" dataset on data.nasa.gov
export const NASA_STATS = ${JSON.stringify(stats)};
export const STORMS = ${JSON.stringify(storms)};
export const QUAKES = ${JSON.stringify(quakes)};
export const IMPACTS = ${JSON.stringify(impacts)};
export const METEORITES = ${JSON.stringify(meteorites)};
`;
fs.writeFileSync(path.join(ROOT, 'js', 'nasa-events.js'), out);
console.log(JSON.stringify(stats, null, 1));
console.log('storms', storms.length, 'by sev', [1, 2, 3].map((s) => storms.filter((x) => x.sev === s).length).join('/'), '| quakes', quakes.length, '| impacts kept', impacts.length, '| meteorites', meteorites.length, '| bytes', out.length);
console.log('sample storm', JSON.stringify(storms.filter((s) => s.sev === 3).slice(-1)[0]));
console.log('biggest impacts', impactsAll.sort((a, b) => b.amp - a.amp).slice(0, 5).map((i) => i.t + ' amp ' + i.amp).join(' | '));
