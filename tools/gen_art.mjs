// Generates the game's cinematic art with the Higgsfield API (Marketing Studio Image 2.5 "Sunburst", 4K).
// The API key is NEVER stored in this project. Pass it in the environment:
//   HF_KEY="<key id>:<key secret>" node tools/gen_art.mjs tools/art_jobs.json [--only id1,id2]
// Docs: https://docs.higgsfield.ai/docs/models/marketing-studio-image/sunburst.md
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobsFile = process.argv[2];
const spec = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
const OUT_REL = spec.outDir || 'assets/art/4k';
const OUT = path.join(ROOT, OUT_REL);
const STATE_FILE = path.join(ROOT, 'assets', 'art', 'manifest.json');
const ENDPOINT = 'https://api.higgsfield.ai/marketing-studio/image/sunburst';
const KEY = (process.env.HF_KEY || '').trim();
if (!KEY) { console.error('Set HF_KEY in the environment.'); process.exit(1); }
const HEADERS = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null;
const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));

async function runJob(job) {
  const st = (state[job.id] ||= {});
  if (st.file && fs.existsSync(path.join(ROOT, st.file)) && !force) return console.log('skip (done)', job.id);
  const prompt = `${job.prompt} ${(spec.styles && spec.styles[job.style]) || spec.style || ''}`.trim();
  const refs = (job.refs || []).map((r) => state[r]?.url).filter(Boolean);
  if (!st.request_id || force) {
    const body = {
      prompt,
      resolution: job.resolution || spec.resolution || '4k',
      quality: job.quality || spec.quality || 'high',
      aspect_ratio: job.aspect_ratio || '16:9',
    };
    if (refs.length) body.image_urls = refs;
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { ...HEADERS, 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(body),
    });
    const t = await r.text();
    if (!r.ok) { console.error('SUBMIT FAILED', job.id, r.status, t.slice(0, 400)); st.error = `${r.status} ${t.slice(0, 200)}`; save(); return; }
    const j = JSON.parse(t);
    Object.assign(st, { request_id: j.request_id, status_url: j.status_url, prompt, model: 'marketing-studio/image/sunburst', refs: job.refs || [], error: undefined, file: undefined, url: undefined });
    save();
    console.log('submitted', job.id, j.request_id);
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 15 * 60 * 1000) {
    await sleep(6000);
    let j;
    try {
      const r = await fetch(st.status_url, { headers: HEADERS });
      j = await r.json();
    } catch (e) { continue; }
    if (j.status === 'completed') {
      const url = j.images?.[0]?.url;
      const ext = (url.split('?')[0].match(/\.(png|jpe?g|webp)$/i)?.[1] || 'png').toLowerCase();
      const rel = `${OUT_REL}/${job.id}.${ext}`;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      fs.writeFileSync(path.join(ROOT, rel), buf);
      Object.assign(st, { url, file: rel, bytes: buf.length, seconds: Math.round((Date.now() - t0) / 1000) });
      save();
      return console.log('DONE', job.id, rel, (buf.length / 1e6).toFixed(1) + 'MB', st.seconds + 's');
    }
    if (['failed', 'nsfw', 'canceled'].includes(j.status)) {
      st.error = j.status + ' ' + JSON.stringify(j.error || '').slice(0, 200);
      st.request_id = undefined;
      save();
      return console.error('FAILED', job.id, st.error);
    }
  }
  console.error('TIMEOUT', job.id);
}

const jobs = spec.jobs.filter((j) => !only || only.includes(j.id));
const CONC = Number(process.env.HF_CONC || 4);
// Jobs that other jobs use as a reference image go first, so their URL exists when the rest are submitted.
const usedAsRef = new Set(spec.jobs.flatMap((j) => j.refs || []));
const pool = async (list) => {
  let next = 0;
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (next < list.length) {
        const job = list[next++];
        try { await runJob(job); } catch (e) { console.error('ERROR', job.id, e.message); }
      }
    })
  );
};
await pool(jobs.filter((j) => usedAsRef.has(j.id) && !(j.refs || []).length));
await pool(jobs.filter((j) => !usedAsRef.has(j.id) || (j.refs || []).length));
console.log('finished:', jobs.map((j) => `${j.id}:${state[j.id]?.file ? 'ok' : 'MISSING'}`).join(' '));
if (spec.jobs.some((j) => j.web)) await import('./web_art.mjs'); // make the small JPEGs the game loads
