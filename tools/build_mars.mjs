// Builds js/mars/mola.js from NASA's Mars Orbiter Laser Altimeter (MOLA) gridded elevation data.
//   node tools/build_mars.mjs            downloads what is missing into data/raw/mars/ (git-ignored), then builds
//   node tools/build_mars.mjs --check    fails if js/mars/mola.js is out of date
//
// Source: MGS MOLA Mission Experiment Gridded Data Records (MEGDR), NASA Planetary Data System, Geosciences Node.
//   https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
//   megt90n000cb.img   the whole planet at 4 pixels per degree (about 15 km a pixel at the equator)
//   megt44n180hb.img   0–44°N, 180–270°E at 128 pixels per degree (about 463 m a pixel); only the rows we need are fetched
// Values are metres of topography: planetary radius minus the radius of the areoid (Mars's "sea level").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw', 'mars'), OUT = path.join(ROOT, 'js', 'mars', 'mola.js');
const BASE = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x';
const SITE = { lat: 39.5, lon: 191.2 };            // the outpost: a bay of Arcadia Planitia among the Erebus Montes
const R_MARS = 3389.5;                              // km, mean radius (NASA Mars Fact Sheet)
const BAND = { latTop: 43, latBot: 37 };            // rows of the 128 ppd tile kept on disk
const T = { W: 11520, ppd: 128, latTop: 44, lon0: 180 };

async function get(url, file, range) {
  if (fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const r = await fetch(url, range ? { headers: { Range: `bytes=${range[0]}-${range[1]}` } } : {});
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); console.log('downloaded', path.basename(file), fs.statSync(file).size, 'bytes');
}
const gFile = path.join(RAW, 'megt90n000cb.img'), bFile = path.join(RAW, 'megt44n180hb_37N-43N.img');
const row0 = (T.latTop - BAND.latTop) * T.ppd, rows = (BAND.latTop - BAND.latBot) * T.ppd;
await get(`${BASE}/meg004/megt90n000cb.img`, gFile);
await get(`${BASE}/meg128/megt44n180hb.img`, bFile, [row0 * T.W * 2, (row0 + rows) * T.W * 2 - 1]);

const g = fs.readFileSync(gFile), b = fs.readFileSync(bFile);
if (g.length !== 1440 * 720 * 2 || b.length !== rows * T.W * 2) throw new Error('unexpected file size');
// elevation (m) at a latitude and east longitude from the detailed band, bilinear
const band = (lat, lon) => {
  const fr = (BAND.latTop - lat) * T.ppd - 0.5, fc = (lon - T.lon0) * T.ppd - 0.5, r = Math.max(0, Math.min(rows - 2, Math.floor(fr))), c = Math.max(0, Math.min(T.W - 2, Math.floor(fc))), u = fr - r, v = fc - c;
  const at = (rr, cc) => b.readInt16BE((rr * T.W + cc) * 2);
  return (at(r, c) * (1 - v) + at(r, c + 1) * v) * (1 - u) + (at(r + 1, c) * (1 - v) + at(r + 1, c + 1) * v) * u;
};
const kmLat = (Math.PI * R_MARS) / 180, kmLon = kmLat * Math.cos((SITE.lat * Math.PI) / 180);
const here = (eastKm, northKm) => band(SITE.lat + northKm / kmLat, SITE.lon + eastKm / kmLon);
const siteElev = here(0, 0);

// 1. the whole planet, one value a degree, in 8 bits (steps of 120 m: -8200 m … +22400 m)
const GW = 360, GH = 180, glob = Buffer.alloc(GW * GH); let gmin = 1e9, gmax = -1e9;
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let s = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += g.readInt16BE(((y * 4 + j) * 1440 + x * 4 + i) * 2); const m = s / 16; gmin = Math.min(gmin, m); gmax = Math.max(gmax, m); glob[y * GW + x] = Math.max(0, Math.min(255, Math.round((m + 8200) / 120))); }

// 2. the region: 192 km square centred on the outpost, 1.2 km a cell, metres as 16-bit numbers
const RN = 160, RKM = 192, reg = Buffer.alloc(RN * RN * 2); let rmin = 1e9, rmax = -1e9;
for (let j = 0; j < RN; j++) for (let i = 0; i < RN; i++) { const e = ((i + 0.5) / RN - 0.5) * RKM, n = (0.5 - (j + 0.5) / RN) * RKM, m = Math.round(here(e, n)); rmin = Math.min(rmin, m); rmax = Math.max(rmax, m); reg.writeInt16LE(m, (j * RN + i) * 2); }

// 3. the skyline: for every half degree of compass bearing, how high the land stands above the horizontal as seen from
//    the outpost (eye 2 m up), with the planet's curve taken off. Stored in hundredths of a degree, with the distance (km) of that high point.
const HN = 720, sky = Buffer.alloc(HN * 2), skyD = Buffer.alloc(HN); let top = { deg: -9 };
for (let a = 0; a < HN; a++) { const az = (a / HN) * 2 * Math.PI; let best = -1e9, bd = 0;
  for (let d = 1; d <= 150; d += 0.25) { const e = Math.sin(az) * d, n = Math.cos(az) * d; if (Math.abs(n / kmLat) > 2.45) break; const h = (here(e, n) - siteElev - 2) / 1000 - (d * d) / (2 * R_MARS), ang = (Math.atan2(h, d) * 180) / Math.PI; if (ang > best) { best = ang; bd = d; } }
  sky.writeInt16LE(Math.round(best * 100), a * 2); skyD[a] = Math.round(bd); if (best > top.deg) top = { deg: best, bearing: a / 2, km: bd }; }

// 4. the lie of the land at the outpost itself: slope over the nearest 4 km (it is very flat)
const slopeE = (here(2, 0) - here(-2, 0)) / 4000, slopeN = (here(0, 2) - here(0, -2)) / 4000;

const out = `// GENERATED by tools/build_mars.mjs — do not edit by hand.
// Real Mars topography from NASA's Mars Orbiter Laser Altimeter (MGS MOLA MEGDR, PDS Geosciences Node):
// https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
const b64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
export const SITE = ${JSON.stringify({ ...SITE, elev: Math.round(siteElev), slopeE: +slopeE.toFixed(5), slopeN: +slopeN.toFixed(5) })};   // degrees north, degrees east, metres above the areoid, rise per metre towards east and north
export const GLOBAL = { w: ${GW}, h: ${GH}, min: -8200, step: 120, data: b64('${glob.toString('base64')}') };   // one cell a degree, row 0 = 90°N, column 0 = 0°E; metres = min + step × value
const reg = b64('${reg.toString('base64')}');
export const REGION = { n: ${RN}, km: ${RKM}, min: ${rmin}, max: ${rmax}, data: new Int16Array(reg.buffer, reg.byteOffset, ${RN * RN}) };   // ${RKM} km square centred on the outpost, north up, metres
const sk = b64('${sky.toString('base64')}');
export const SKYLINE = { n: ${HN}, deg100: new Int16Array(sk.buffer, sk.byteOffset, ${HN}), km: b64('${skyD.toString('base64')}') };   // per half degree of bearing (0 = north, clockwise): height of the real skyline in hundredths of a degree, and how far away it is
`;
const stats = `site ${SITE.lat}N ${SITE.lon}E elev ${Math.round(siteElev)} m · planet ${Math.round(gmin)}…${Math.round(gmax)} m · region ${rmin}…${rmax} m · highest skyline ${top.deg.toFixed(2)}° at bearing ${top.bearing}° (${top.km} km) · slope E ${(slopeE * 1000).toFixed(2)} N ${(slopeN * 1000).toFixed(2)} m per km`;
if (process.argv.includes('--check')) { const ok = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') === out; console.log(ok ? 'js/mars/mola.js is up to date' : 'js/mars/mola.js is OUT OF DATE: run node tools/build_mars.mjs'); process.exitCode = ok ? 0 : 1; }
else { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, out); console.log('wrote js/mars/mola.js', (out.length / 1024).toFixed(0), 'KB'); }
console.log(stats);
