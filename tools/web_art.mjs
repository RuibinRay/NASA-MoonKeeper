// Turns full-size art originals into the small JPEGs the game loads. Needs ffmpeg on the PATH.
//   node tools/web_art.mjs tools/art_jobs_v3.json
// Every job with a "web" path is scaled to "webW" pixels wide and written there.
// An optional "webCrop" (an ffmpeg crop expression, e.g. "iw:ih*0.9:0:ih*0.1") is applied first.
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
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', `${job.webCrop ? `crop=${job.webCrop},` : ''}scale=${job.webW || 1600}:-2:flags=lanczos`, '-q:v', '3', out], { stdio: 'inherit' });
  if (r.error || r.status !== 0) { console.error('ffmpeg failed for', job.id, r.error?.message || ''); process.exitCode = 1; continue; }
  made++; console.log('web', job.web, (fs.statSync(out).size / 1024).toFixed(0) + ' kB');
}
console.log(`web art: ${made} written${missing.length ? `, not generated yet: ${missing.join(' ')}` : ''}`);
