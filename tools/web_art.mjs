// Turns full-size art originals into the small JPEGs the game loads. Needs ffmpeg on the PATH.
//   node tools/web_art.mjs tools/art_jobs_v3.json
// Every job with a "web" path is scaled to "webW" pixels wide and written there.
// An optional "webCrop" (an ffmpeg crop expression, e.g. "iw:ih*0.9:0:ih*0.1") is applied first.
// An optional "webFilter" (any ffmpeg filter, e.g. "eq=gamma=1.4") is applied last.
// If the job file has a top-level "thumbW", every picture written to assets/img also gets a small "<name>_s.jpg" for grids.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const stateFile = path.join(ROOT, 'assets', 'art', 'manifest.json');
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
let made = 0, missing = [];
for (const job of spec.jobs) {
  if (!job.web) continue;
  const src = state[job.id]?.file && path.join(ROOT, state[job.id].file);
  if (!src || !fs.existsSync(src)) { missing.push(job.id); continue; }
  const out = path.join(ROOT, job.web);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const vf = (w) => `${job.webCrop ? `crop=${job.webCrop},` : ''}scale=${w}:-2:flags=lanczos${job.webFilter ? `,${job.webFilter}` : ''}`;
  const run = (w, to, q) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', vf(w), '-q:v', q, to], { stdio: 'inherit' });
  const r = run(job.webW || 1600, out, '3');
  if (r.error || r.status !== 0) { console.error('ffmpeg failed for', job.id, r.error?.message || ''); process.exitCode = 1; continue; }
  if (spec.thumbW && job.web.startsWith('assets/img/')) run(spec.thumbW, out.replace(/.jpg$/, '_s.jpg'), '4');
  made++; console.log('web', job.web, (fs.statSync(out).size / 1024).toFixed(0) + ' kB');
}
console.log(`web art: ${made} written${missing.length ? `, not generated yet: ${missing.join(' ')}` : ''}`);
