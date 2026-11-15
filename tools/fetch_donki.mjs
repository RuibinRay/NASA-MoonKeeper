// Downloads NASA DONKI space-weather archives in 60-day windows (the API's maximum range).
// Source: NASA CCMC DONKI web service  https://ccmc.gsfc.nasa.gov/DONKI/
// Usage:  node tools/fetch_donki.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'raw');
const BASE = 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get';
const START = new Date('2011-01-01T00:00:00Z');
const END = new Date('2026-11-14T00:00:00Z');
const TYPES = [
  { key: 'FLR', extra: '' },
  { key: 'SEP', extra: '' },
  { key: 'GST', extra: '' },
  { key: 'CMEAnalysis', extra: '&mostAccurateOnly=true&speed=1000&halfAngle=0&catalog=ALL' },
];
const iso = (d) => d.toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function windows() {
  const w = [];
  let a = new Date(START);
  while (a < END) {
    const b = new Date(Math.min(a.getTime() + 59 * 864e5, END.getTime()));
    w.push([iso(a), iso(b)]);
    a = new Date(b.getTime() + 864e5);
  }
  return w;
}

async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(45000) });
      const t = await r.text();
      if (r.ok) return t.trim() ? JSON.parse(t) : [];
      if (r.status === 404 || /No data/i.test(t)) return [];
      throw new Error(r.status + ' ' + t.slice(0, 80));
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
    }
  }
}

for (const t of TYPES) {
  const all = [];
  const win = windows();
  let failed = 0;
  const CONC = 3;
  for (let i = 0; i < win.length; i += CONC) {
    const chunk = win.slice(i, i + CONC);
    const res = await Promise.all(
      chunk.map(([a, b]) =>
        get(`${BASE}/${t.key}?startDate=${a}&endDate=${b}${t.extra}`).catch((e) => {
          failed++;
          console.error(t.key, a, b, 'FAILED', e.message);
          return [];
        })
      )
    );
    for (const r of res) if (Array.isArray(r)) all.push(...r);
    await sleep(250);
  }
  const file = path.join(OUT, `donki_${t.key.toLowerCase()}_2011_2026.json`);
  fs.writeFileSync(file, JSON.stringify(all));
  console.log(t.key, 'records', all.length, 'failed windows', failed, '->', path.basename(file));
}
