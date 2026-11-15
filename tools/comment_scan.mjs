// Finds code that a "// comment" has swallowed: a comment in the middle of a line whose text looks like statements.
// Run: node tools/comment_scan.mjs   (exits 1 if anything is found)
import fs from 'node:fs';
const files = fs.readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'nasa-events.js').map((f) => 'js/' + f);
// index of the first "//" that is not inside a string, a template or a regular expression (rough, but good enough for this code style)
const commentAt = (line) => {
  let q = null, re = false, prev = '';
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (re) { if (c === '\\') i++; else if (c === '/') re = false; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && line[i + 1] === '/') return i;
    if (c === '/' && /[=(,:;!&|?{}[\n]|^$/.test(prev)) { re = true; continue; }
    if (c.trim()) prev = c;
  }
  return -1;
};
// an assignment that ends in a semicolon; a call that ends the line; a call followed by more code; a statement keyword; a G. call; an S. assignment
const looksLikeCode = (t) => /[\w)\]]\s*(=|\+=|-=|\+\+|--)\s*[^=].*;|\)\s*;\s*$|\)\s*;\s*[\w$.]+\s*(\(|=[^=]|\+=|-=|\+\+|\.\w)|;\s*(if|for|const|let|return|else)\b|\bG\.\w+\(|\bS\.\w+\s*[-+]?=/.test(t);
let found = 0;
for (const f of files) {
  const lines = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').split(/\r?\n/);
  lines.forEach((line, n) => { const i = commentAt(line); if (i < 0) return; const before = line.slice(0, i).trim(), text = line.slice(i + 2);
    if (before && looksLikeCode(text)) { found++; console.log(`${f}:${n + 1}  //${text.slice(0, 150)}`); } });
}
console.log(found ? `${found} suspicious comment${found > 1 ? 's' : ''}` : 'No swallowed code found.');
process.exitCode = found ? 1 : 0;
