// MOONKEEPER — the translation tool.
//   node tools/i18n.mjs check            every language: how many texts it has, and any that are broken; fails if a text a
//                                         player sees is not marked for translation, or a translation breaks its markup
//   node tools/i18n.mjs wrap [--dry]     marks every text a player sees with tt`...` / tt('...') (safe to run again)
//   node tools/i18n.mjs keys             prints how many texts there are, file by file
//   node tools/i18n.mjs todo <lang> <out.tsv>       writes the texts a language still lacks, one per line: number, tab, English
//   node tools/i18n.mjs merge <lang> <todo.tsv> <done.tsv>...   puts translated lines (number, tab, text) into lang/<lang>.json
// How it works: js/i18n.js looks each English text up in lang/<code>.json. In a template, ${...} becomes {0}, {1}...
// The texts are found by reading the game's source with a small JavaScript lexer, so nothing has to be listed by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'js'), LANGDIR = path.join(ROOT, 'lang');
const SKIP_FILES = new Set(['i18n.js', 'nasa-events.js']);
// every game file under js/, sub-folders included (js/mars/...), as paths like 'ui.js' or 'mars/world.js'
const jsFiles = (dir = '') => fs.readdirSync(path.join(JS, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? jsFiles(dir + d.name + '/') : d.name.endsWith('.js') && !SKIP_FILES.has(d.name) ? [dir + d.name] : [])).sort();

// ---------------------------------------------------------------- the lexer
export function literals(src) {
  const out = []; let i = 0, prevSig = '';
  const regexOk = () => !prevSig || '(,=:[!&|?{};+-*%<>~^'.includes(prevSig) || /\b(return|typeof|case|of|in|do|else|void|yield|await)\s*$/.test(src.slice(Math.max(0, i - 9), i));
  const quoted = (q) => { const s = i; i++; let v = ''; while (i < src.length && src[i] !== q) { if (src[i] === '\\') { v += src.slice(i, i + 2); i += 2; } else v += src[i++]; } i++; return { s, e: i, raw: v }; };
  const template = () => {
    const s = i; i++; const chunks = [], exprs = []; let cs = i;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { chunks.push({ s: cs, e: i }); i++; return { s, e: i, chunks, exprs }; }
      if (c === '$' && src[i + 1] === '{') { chunks.push({ s: cs, e: i }); i += 2; const es = i; scan(true); exprs.push({ s: es, e: i - 1 }); cs = i; continue; }
      i++;
    }
    return { s, e: i, chunks, exprs };
  };
  function scan(inExpr) {
    let d = 0;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && n === '*') { const k = src.indexOf('*/', i + 2); i = k < 0 ? src.length : k + 2; continue; }
      if (c === '\'' || c === '"') { const r = quoted(c); out.push({ kind: 'str', q: c, ...r }); prevSig = 'a'; continue; }
      if (c === '`') { const r = template(); out.push({ kind: 'tpl', ...r }); prevSig = 'a'; continue; }
      if (c === '/' && regexOk()) { i++; let cls = false; while (i < src.length) { const ch = src[i]; if (ch === '\\') { i += 2; continue; } if (ch === '[') cls = true; else if (ch === ']') cls = false; else if ((ch === '/' && !cls) || ch === '\n') break; i++; } i++; while (/[a-z]/i.test(src[i] || '')) i++; prevSig = 'a'; continue; }
      if (c === '{') d++;
      if (c === '}') { if (inExpr && d === 0) { i++; return; } d--; }
      if (!/\s/.test(c)) prevSig = /[\w$]/.test(c) ? 'a' : c;
      i++;
    }
  }
  scan(false);
  for (const l of out) { l.before = src.slice(Math.max(0, l.s - 60), l.s); l.after = src.slice(l.e, l.e + 30); }
  return out;
}

export const cook = (raw) => raw.replace(/\r\n?/g, '\n').replace(/\\(\n|u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (m, e) => {
  if (e === '\n') return '';
  if (e[0] === 'u' && e.length > 1) return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
  if (e[0] === 'x' && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
  return { n: '\n', t: '\t', r: '\r', 0: '\0', b: '\b', f: '\f', v: '\v' }[e] ?? e;
});
// the key a literal has in the language files: templates get {0}, {1} where their ${...} are
export const keyOf = (src, l) => (l.kind === 'str' ? cook(l.raw) : l.chunks.map((c, k) => (k ? '{' + (k - 1) + '}' : '') + cook(src.slice(c.s, c.e))).join(''));
const lineOf = (src, p) => src.slice(0, p).split('\n').length;

// ---------------------------------------------------------------- what counts as words a player reads
const KEYNAMES = new Set(['Enter', 'Escape', 'Tab', 'Space', 'Shift', 'Control', 'Alt', 'Meta', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);
const UNITS = new Set(['kW', 'kWh', 'kPa', 'mSv', 'km', 'kg', 'cm', 'mm', 'ms', 'min', 'rgb', 'rgba', 'px']);
// every class and id the style sheets use, plus a few words the code uses as ids: a lowercase phrase made only of these is not words to read
const CLASSES = new Set(['disabled', 'checked', 'selected', 'hidden', 'readonly', 'deep', 'top', 'car', 'ship', 'off', 'on']);
for (const f of [path.join(ROOT, 'css/style.css'), path.join(ROOT, 'css/life.css')]) if (fs.existsSync(f)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/[.#]([a-zA-Z][\w-]*)/g)) for (const w of m[1].split('-')) CLASSES.add(w);
// properties whose value is always shown to the player, even a single lowercase word ("pilot", "cooking")
const SHOWN = /(?:^|[\s{,(])(?:name|whoName|what|job|label|sub|title|text|tip|blurb|info|hit|tag|ages|cap|btn|perk|desc|hint|msg|step)\s*:\s*$/;
const shownIds = new Set(['cook', 'panel', 'battery']);   // values under those names that are really ids
const KEEP = new Set([' · Language']);                     // stays English on purpose: the word "Language" beside its translation
export function prose(text) {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\{\d+\}/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').trim();
  if (!plain || KEYNAMES.has(plain)) return false;
  if (/^(https?:|[\w./{}-]+\.(jpe?g|png|webp|svg|json|m?js|css|mp3|ogg|wav|glb|html)\b)/.test(text.trim())) return false;   // files and links
  const bare = text.replace(/<[^>]*>/g, ' ');                                                       // outside the markup: styles inside tags do not count
  if (/\b(\d+|\{\d+\})?px\b/.test(bare) && /\b(sans-serif|serif|monospace|Inter|Chakra|Bangers)\b/.test(bare)) return false;   // canvas fonts
  if (/^(rgba?|hsla?)\(/.test(plain) || /^[XYZ]{3}$/.test(plain)) return false;                   // colours, rotation orders
  if (/\b(uniform|varying|gl_FragColor|gl_Position|void main)\b/.test(bare)) return false;         // shader code
  if (/\b(vec[234]|mat[34]|smoothstep|fract|texture2D)\s*\(|#include\s*<|\bfloat\s+\w+\s*[=(;,)]|\bvoid\s+\w+\s*\(/.test(text)) return false;   // shader pieces
  if (!/\s/.test(plain) && plain.length > 30) return false;                                       // one long token: packed data (base64), not words
  if (/\b(translate[XY]?|rotate|scale|linear-gradient|radial-gradient|calc|cubic-bezier|url)\(/.test(bare) || /^[a-z-]+ \{\d+\}m?s\b/.test(bare.trim())) return false;   // css values
  if (/^([a-z-]+\s*:\s*[^;:]*;?\s*)+$/.test(plain)) return false;                                  // css
  if (/^[#.[][\w-]/.test(plain) && /^[\w\s#.,:>~+()[\]="'*-]+$/.test(plain) && !/\s\p{Lu}\p{Ll}/u.test(plain)) return false;   // selectors (".name", not ". The night...")
  if (!/\p{L}{2,}/u.test(plain)) return false;
  if (/^(ON|OK)$/.test(plain)) return true;
  const words = plain.match(/\p{L}{2,}/gu) || [];
  if (/\{\d+\}\s+\p{L}{2,}|\p{L}{2,}\s+\{\d+\}/u.test(text.replace(/<[^>]*>/g, ' ')) && words.some((w) => !UNITS.has(w))) return true;   // "{0} days", "{0} of {1}", "fixing {0}"
  if (!/\s/.test(plain) && !/^\p{Lu}/u.test(plain)) return false;                                  // one lowercase token: an id
  if (!/\p{Lu}/u.test(plain) && !/[.!?,:;…]/.test(plain) && words.every((w) => CLASSES.has(w) || UNITS.has(w))) return false;   // style names ("radio off") and ids
  if (!/\p{Lu}/u.test(plain) && !words.some((w) => w.length >= 3)) return false;
  if (/^[\w$-]+$/.test(plain) && !/^\p{Lu}\p{Ll}/u.test(plain) && !/^\p{Lu}{3,}$/u.test(plain)) return false;   // one id-like word
  return true;
}

// Where a literal is used, if not on screen: comparisons, keys, selectors, storage, sounds...
const CALLS = /(?:^|[^\w$])(?:\$|\$\$|querySelector|querySelectorAll|getElementById|closest|matches|add|remove|toggle|contains|addEventListener|removeEventListener|getItem|setItem|removeItem|createElement|setAttribute|getAttribute|hasAttribute|RegExp|startsWith|endsWith|indexOf|includes|split|getContext|play|log|warn|error|info|debug|has|get|delete)\(\s*$/;
export function usedForCode(l) {
  const b = l.before, a = l.after;
  if (CALLS.test(b)) return 'argument of a lookup call';
  if (/(?:===?|!==?)\s*$/.test(b) || /^\s*(?:===?|!==?)/.test(a)) return 'compared';
  if (/\bcase\s*$/.test(b)) return 'switch case';
  if (/[{,]\s*$/.test(b) && /^\s*:/.test(a)) return 'object key';
  if (/^\s*in\b/.test(a)) return 'in operator';
  if (/\b(?:from|import)\s*$/.test(b)) return 'import';
  if (/(?:className|\.font|cssText|\.id|\.key|\.code)\s*\+?=\s*$/.test(b)) return 'property for code';
  if (/(?:^|[\s{,])(?:timeZone|locale|lang|type|kind|mode|role|id|key|ico|icon|img|src|href|cls|class|color|font|sound|mood|who|zone|dir|src|unit|weekday|month|day|year)\s*:\s*$/.test(b)) return 'setting for code';
  if (/[\w$]$/.test(b)) return 'tagged by something else';
  return '';
}
export const wrapped = (l) => (l.kind === 'tpl' ? /(?:^|[^\w$.])tt$/.test(l.before) : /(?:^|[^\w$.])tt\(\s*$/.test(l.before));

// ---------------------------------------------------------------- markup: runs of words between block tags
const INLINE = new Set(['b', 'i', 'em', 'strong', 'u', 'br', 'kbd', 'sup', 'sub', 'a', 'code', 'mark', 's', 'abbr', 'wbr']);
const ATTRS = /\b(title|aria-label|alt|placeholder|data-tip)="([^"$`{}<>]*)"/g;
// tokens of a literal's content: text, tag (block or inline) and expr, with absolute positions
function tokens(src, l) {
  const parts = l.kind === 'str' ? [{ s: l.s + 1, e: l.e - 1 }] : l.chunks;
  const out = []; let inTag = null;
  parts.forEach((c, k) => {
    let p = c.s, ts = c.s;
    const flushText = (to) => { if (!inTag && to > ts) out.push({ type: 'text', s: ts, e: to }); };
    while (p < c.e) {
      const ch = src[p];
      if (!inTag && ch === '<' && /[a-zA-Z/!]/.test(src[p + 1] || '')) { flushText(p); inTag = { s: p }; p++; continue; }
      if (inTag && ch === '>') { const raw = src.slice(inTag.s, p + 1), m = raw.match(/^<\/?\s*([a-zA-Z][\w-]*)/), name = m ? m[1].toLowerCase() : '!'; out.push({ type: 'tag', s: inTag.s, e: p + 1, name, block: !INLINE.has(name), raw }); inTag = null; ts = p + 1; p++; continue; }
      p++;
    }
    flushText(c.e); ts = c.e;
    if (l.kind === 'tpl' && k < l.exprs.length) { const x = l.exprs[k]; if (!inTag) out.push({ type: 'expr', s: x.s - 2, e: x.e + 1 }); ts = x.e + 1; }
  });
  return out;
}
// the pieces of a literal that need translating: [{ s, e }] spans of source (runs of words, and attribute values)
function spans(src, l) {
  const toks = tokens(src, l), runs = []; let cur = [];
  const end = () => { if (cur.length) runs.push(cur); cur = []; };
  for (const t of toks) { if (t.type === 'tag' && t.block) end(); else cur.push(t); }
  end();
  const out = [], hasBlock = toks.some((t) => t.type === 'tag' && t.block);
  const blank = (t) => (t.type === 'text' && !src.slice(t.s, t.e).trim()) || (t.type === 'tag' && t.name === 'br');
  for (let run of runs) {
    for (;;) {
      while (run.length && blank(run[0])) run = run.slice(1);
      while (run.length && blank(run.at(-1))) run = run.slice(0, -1);
      // <b>Graphics</b> alone: translate the words, keep the tag outside
      const a = run[0], z = run.at(-1);
      if (run.length > 2 && a.type === 'tag' && z.type === 'tag' && !/^<\//.test(a.raw) && z.raw.replace(/\s/g, '') === `</${a.name}>` && run.filter((t) => t.type === 'tag' && t.name === a.name).length === 2) { run = run.slice(1, -1); continue; }
      break;
    }
    if (!run.length) continue;
    let s = run[0].s, e = run.at(-1).e;
    if (run[0].type === 'text') s += src.slice(run[0].s, run[0].e).length - src.slice(run[0].s, run[0].e).trimStart().length;
    if (run.at(-1).type === 'text') e -= src.slice(run.at(-1).s, run.at(-1).e).length - src.slice(run.at(-1).s, run.at(-1).e).trimEnd().length;
    const text = run.map((t) => (t.type === 'expr' ? '{0}' : t.type === 'text' ? src.slice(t.s, t.e) : t.raw)).join('');
    if (prose(text)) out.push({ s, e, run: true });
  }
  for (const t of toks) if (t.type === 'tag') for (const m of t.raw.matchAll(ATTRS)) if (prose(m[2])) { const vs = t.s + m.index + m[0].indexOf('"') + 1; out.push({ s: vs, e: vs + m[2].length, attr: true }); }
  // whole: one run that is the entire literal, so the literal itself is marked (tt`...` or tt('...')) rather than a piece inside it
  const body = src.slice(l.s + 1, l.e - 1), ts = l.s + 1 + (body.length - body.trimStart().length), te = l.e - 1 - (body.length - body.trimEnd().length);
  return { list: out.sort((a, b) => a.s - b.s), whole: !hasBlock && out.length === 1 && !out[0].attr && out[0].s === ts && out[0].e === te };
}

// ---------------------------------------------------------------- wrap: mark every text a player sees
function plan(src) {
  const L = literals(src), edits = [], skipped = [], marked = [];
  for (const l of L) {
    if (wrapped(l)) continue;
    const key = keyOf(src, l), forced = !prose(key) && SHOWN.test(l.before) && /\p{L}{2,}/u.test(key.replace(/\{\d+\}/g, '')) && !/[<>]/.test(key) && !shownIds.has(key);
    const attrText = [...key.matchAll(ATTRS)].some((m) => prose(m[2]));   // a tooltip can be the only words in a piece of markup
    if ((!prose(key) && !forced && !attrText) || KEEP.has(key)) continue;
    // an ending chosen by number, like 's are' / ' is': left for the plural pass, which makes two whole sentences
    if (l.kind === 'str' && /^[a-z ]{0,6}$/.test(key) && (/\?\s*$/.test(l.before) && /^\s*:\s*(['"])[a-z ]{0,6}\1/.test(l.after) || /\?\s*(['"])[a-z ]{0,6}\1\s*:\s*$/.test(l.before))) continue;
    const why = usedForCode(l);
    if (why) { skipped.push({ l, key, why }); continue; }
    const sp = forced ? { list: [{ s: l.s, e: l.e, run: true }], whole: true } : spans(src, l);
    if (!sp.list.length) continue;
    if (sp.whole) {
      if (l.kind === 'str') edits.push({ at: l.s, ins: 'tt(' }, { at: l.e, ins: ')' }); else edits.push({ at: l.s, ins: 'tt' });
      marked.push({ l, key, forced }); continue;
    }
    if (l.kind === 'tpl') { for (const p of sp.list) edits.push({ at: p.s, ins: '${tt`' }, { at: p.e, ins: '`}' }); marked.push({ l, key, split: sp.list.length }); continue; }
    // a quoted string with markup: split it into pieces joined with +
    const q = l.q, pieces = []; let p = l.s + 1;
    for (const x of sp.list) { if (x.s > p) pieces.push(q + src.slice(p, x.s) + q); pieces.push('tt(' + q + src.slice(x.s, x.e) + q + ')'); p = x.e; }
    if (p < l.e - 1) pieces.push(q + src.slice(p, l.e - 1) + q);
    edits.push({ at: l.s, del: l.e - l.s, ins: '(' + pieces.join(' + ') + ')' }); marked.push({ l, key, split: sp.list.length });
  }
  return { edits, skipped, marked };
}
function apply(src, edits) {
  const E = [...edits].sort((a, b) => b.at - a.at);
  for (let k = 1; k < E.length; k++) if (E[k].at === E[k - 1].at && (E[k].del || E[k - 1].del)) throw new Error('two edits at one place');
  let s = src; for (const x of E) s = s.slice(0, x.at) + x.ins + s.slice(x.at + (x.del || 0)); return s;
}
// the import line for a file at js/<f>: './i18n.js' beside it, '../i18n.js' one folder down (js/mars/...)
const importFor = (f) => `import { tt } from '${'../'.repeat(f.split('/').length - 1) || './'}i18n.js';`;
function addImport(s, f = 'x.js') {
  if (/import\s*\{[^}]*\btt\b[^}]*\}\s*from\s*'(\.\.?\/)+i18n\.js'/.test(s)) return s;
  const nl = s.includes('\r\n') ? '\r\n' : '\n', lines = s.split(/\r?\n/);
  let last = -1; lines.forEach((ln, j) => { if (/^\s*import\b.*from\s*'/.test(ln) && j < 40) last = j; });   // after the last import,
  const at = last >= 0 ? last + 1 : lines.findIndex((ln) => !/^\s*\/\//.test(ln));                        // or after the header comment
  lines.splice(at, 0, importFor(f)); return lines.join(nl);
}

// English plural endings: tt`${n} panel${n > 1 ? 's' : ''}` becomes (n > 1 ? tt`${n} panels` : tt`${n} panel`),
// so that every language gets whole sentences to translate.
const CHOICE = /^\s*([^?]+?)\s*\?\s*(['"])([a-z ]{0,6})\2\s*:\s*(['"])([a-z ]{0,6})\4\s*$/;
export function pluralPass(src) {
  for (let pass = 0; pass < 500; pass++) {
    let done = false;
    for (const l of literals(src)) {
      if (l.kind !== 'tpl' || !wrapped(l)) continue;
      const k = l.exprs.findIndex((x) => { const m = src.slice(x.s, x.e).match(CHOICE); return !!m; });
      if (k < 0) continue;
      const x = l.exprs[k], m = src.slice(x.s, x.e).match(CHOICE), body = (suffix) => src.slice(l.s, x.s - 2) + suffix + src.slice(x.e + 1, l.e);
      src = src.slice(0, l.s - 2) + `(${m[1]} ? tt${body(m[3])} : tt${body(m[5])})` + src.slice(l.e); done = true; break;
    }
    if (!done) break;
  }
  return src;
}

function wrapAll(dry) {
  let total = 0; const report = [];
  for (const f of jsFiles()) {
    const file = path.join(JS, f), src = fs.readFileSync(file, 'utf8'), { edits, skipped, marked } = plan(src);
    total += marked.length;
    for (const m of marked) report.push(`${f}:${lineOf(src, m.l.s)}  ${m.forced ? '[forced] ' : ''}${m.split ? '[split ' + m.split + '] ' : ''}${JSON.stringify(m.key).slice(0, 140)}`);
    for (const x of skipped) report.push(`${f}:${lineOf(src, x.l.s)}  SKIPPED (${x.why}) ${JSON.stringify(x.key).slice(0, 120)}`);
    if (!dry && edits.length) { const out = pluralPass(addImport(apply(src, edits), f)); fs.writeFileSync(file, out); }
  }
  return { total, report };
}

// ---------------------------------------------------------------- the texts in the code and in the pages
// Every page at the top of the project with marked texts (index.html, science.html...): its data-t texts and its <title>.
const pages = () => fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && /\bdata-t\b/.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))).sort();
function htmlKeys() {
  const keys = [];
  for (const page of pages()) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
      const [whole, name, attrs] = m;
      if (/\bdata-t-title\b/.test(attrs)) { const t = attrs.match(/\btitle="([^"]*)"/); if (t) keys.push({ key: t[1], where: `${page} title` }); }
      if (/\bdata-t-alt\b/.test(attrs)) { const t = attrs.match(/\balt="([^"]*)"/); if (t) keys.push({ key: t[1], where: `${page} alt` }); }
      if (/\bdata-t-aria\b/.test(attrs)) { const t = attrs.match(/\baria-label="([^"]*)"/); if (t) keys.push({ key: t[1], where: `${page} aria-label` }); }
      if (!/\bdata-t\b(?!-)/.test(attrs)) continue;
      // the element's inner HTML, up to its matching close tag
      let depth = 1, p = m.index + whole.length; const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g'); re.lastIndex = p;
      let mm; while ((mm = re.exec(html))) { depth += mm[1] ? -1 : 1; if (!depth) break; }
      keys.push({ key: html.slice(p, mm.index).replace(/\s+/g, ' ').trim(), where: page });
    }
    const title = html.match(/<title>([^<]*)<\/title>/); if (title) keys.push({ key: title[1], where: `${page} <title>` });
  }
  return keys;
}
export function allKeys() {
  const map = new Map();
  for (const f of jsFiles()) {
    const src = fs.readFileSync(path.join(JS, f), 'utf8');
    for (const l of literals(src)) if (wrapped(l)) { const k = keyOf(src, l); if (!map.has(k)) map.set(k, `${f}:${lineOf(src, l.s)}`); }
  }
  for (const { key, where } of htmlKeys()) if (!map.has(key)) map.set(key, where);
  return map;
}

// ---------------------------------------------------------------- checks
const tagsOf = (s) => (s.match(/<\/?[a-zA-Z][^>]*>/g) || []).map((t) => t.replace(/\s+/g, ' ')).sort().join('|');
const holesOf = (s) => (s.match(/\{\d+\}/g) || []).sort().join('');
export function broken(key, val) {
  if (typeof val !== 'string' || !val.trim()) return 'empty';
  if (holesOf(key) !== holesOf(val)) return `the {0} {1}... places differ: ${holesOf(key)} vs ${holesOf(val)}`;
  if (tagsOf(key) !== tagsOf(val)) return 'the markup differs';
  if (/<kbd>/.test(key) && (key.match(/<kbd>[^<]*<\/kbd>/g) || []).join() !== (val.match(/<kbd>[^<]*<\/kbd>/g) || []).join()) return 'a key name inside <kbd> was changed';
  return '';
}
const langFiles = () => (fs.existsSync(LANGDIR) ? fs.readdirSync(LANGDIR).filter((f) => /^[a-z]{2,3}\.json$/.test(f)).sort() : []);

function collisions(keys) {
  const out = [];
  for (const f of jsFiles()) {
    const src = fs.readFileSync(path.join(JS, f), 'utf8');
    for (const l of literals(src)) { if (wrapped(l)) continue; const k = keyOf(src, l); if (keys.has(k) && prose(k) && usedForCode(l)) out.push(`${f}:${lineOf(src, l.s)} ${JSON.stringify(k)} is translated elsewhere but ${usedForCode(l)} here`); }
  }
  return out;
}

const cmd = process.argv[2], args = process.argv.slice(3), direct = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!direct) { /* imported by another tool */ } else if (cmd === 'wrap') {
  const { total, report } = wrapAll(args.includes('--dry'));
  if (args.includes('--report')) console.log(report.join('\n'));
  console.log(`${args.includes('--dry') ? 'Would mark' : 'Marked'} ${total} texts for translation.`);
} else if (cmd === 'keys') {
  const keys = allKeys(), by = {};
  for (const w of keys.values()) { const f = w.split(':')[0]; by[f] = (by[f] || 0) + 1; }
  console.log(by); console.log(keys.size, 'texts,', [...keys.keys()].reduce((a, k) => a + k.length, 0), 'characters');
} else if (cmd === 'todo') {
  // writes <dir>/todo.tsv (every missing text, numbered) and <dir>/part-N.tsv (the same lines in pieces of about <size>, names first)
  const [lang, dir, size = '400'] = args, keys = allKeys(), have = fs.existsSync(path.join(LANGDIR, lang + '.json')) ? JSON.parse(fs.readFileSync(path.join(LANGDIR, lang + '.json'), 'utf8')) : {};
  const ORDER = ['config.js', 'index.html', 'ui.js', 'main.js', 'story.js', 'actions.js', 'events.js', 'life.js', 'lifeui.js', 'minigames.js', 'quiz.js', 'radio.js', 'sim.js', 'jobfx.js', 'moonmap.js', 'world.js', 'voice.js'];
  const fileOf = (w) => w.split(/[: ]/)[0], rank = (k) => { const i = ORDER.indexOf(fileOf(keys.get(k))); return i < 0 ? 99 : i; };
  const todo = [...keys.keys()].filter((k) => !have[k] || broken(k, have[k])).map((k, i) => ({ k, i })).sort((a, b) => rank(a.k) - rank(b.k) || a.i - b.i).map((x) => x.k);
  const esc = (k) => k.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'todo.tsv'), todo.map((k, n) => `${n + 1}\t${esc(k)}`).join('\n') + '\n');
  let part = 0, lines = [], last = '';
  const flush = () => { if (lines.length) fs.writeFileSync(path.join(dir, `part-${++part}.tsv`), lines.join('\n') + '\n'); lines = []; last = ''; };
  todo.forEach((k, n) => { const f = fileOf(keys.get(k)); if (f !== last) { lines.push(`# from ${f}`); last = f; } lines.push(`${n + 1}\t${esc(k)}`); if (lines.length >= +size && n + 1 < todo.length) flush(); });
  flush();
  console.log(`${todo.length} texts for ${lang} written to ${dir}/todo.tsv and ${part} parts`);
} else if (cmd === 'merge') {
  const [lang, todoFile, ...done] = args, file = path.join(LANGDIR, lang + '.json');
  const unesc = (s) => s.replace(/\\(\\|n|t)/g, (m, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : '\\'));
  const rows = (f) => new Map(fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((x) => /^\d+\t/.test(x)).map((x) => { const k = x.indexOf('\t'); return [+x.slice(0, k), unesc(x.slice(k + 1))]; }));
  const src = rows(todoFile), have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  let n = 0; const bad = [];
  // the spaces at either end belong to the English sentence it joins, so they are copied from it
  // In languages that write 2,5 for two and a half, "384,400" would read as 384.4: thousands get a thin space instead ("384 400").
  const COMMA = ['de', 'fr', 'es', 'pt', 'it', 'ru', 'tr', 'id', 'vi'].includes(lang);
  // Only a number written with a thousands comma in the English is changed, so a decimal the translator wrote ("0,057") is left alone.
  const thousands = (key, v) => { if (!COMMA) return v; for (const n of new Set(key.match(/\d{1,3}(?:,\d{3})+(?!\d)/g) || [])) v = v.split(n).join(n.replace(/,/g, '\u202f')); return v; };
  const ends = (key, v) => key.match(/^\s*/)[0] + thousands(key, v.trim()) + key.match(/\s*$/)[0];
  for (const d of done) for (const [id, raw] of rows(d)) { const key = src.get(id); if (key === undefined) { bad.push(`${d}: line ${id} is not in the list`); continue; } const val = ends(key, raw); const why = broken(key, val); if (why) { bad.push(`${id}: ${why}: ${JSON.stringify(key).slice(0, 80)}`); continue; } have[key] = val; n++; }
  const keys = allKeys(), sorted = {}; for (const k of keys.keys()) if (have[k] !== undefined) sorted[k] = have[k];
  fs.mkdirSync(LANGDIR, { recursive: true }); fs.writeFileSync(file, JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"') + '\n');
  console.log(`${lang}: ${n} translations added; ${Object.keys(sorted).length} of ${keys.size} texts now translated.`); if (bad.length) console.log(bad.length + ' lines refused:\n' + bad.slice(0, 40).join('\n'));
} else if (cmd === 'check' || !cmd) {
  const keys = allKeys(); let fail = 0;
  const { total, report } = wrapAll(true);
  if (total) { fail++; console.log(`${total} texts a player can see are not marked for translation (node tools/i18n.mjs wrap marks them):`); console.log(report.filter((r) => !/SKIPPED/.test(r)).slice(0, 30).join('\n')); }
  // words written by a style sheet (content:'...') must come from a variable the game sets in the chosen language
  for (const f of ['style.css', 'life.css']) { const p = path.join(ROOT, 'css', f); if (!fs.existsSync(p)) continue;
    const css = fs.readFileSync(p, 'utf8').replace(/var\([^()]*\)/g, ''); const bad = [...css.matchAll(/content:\s*(['"])([^'"]*\p{L}{2,}[^'"]*)\1/gu)].map((m) => m[2]);
    if (bad.length) { fail++; console.log(`css/${f} writes words that cannot be translated: ${bad.join(' | ')} (use content:var(--t-name,'English') and set --t-name in js/main.js)`); } }
  const col = collisions(new Set(keys.keys()));
  if (col.length) { fail++; console.log(`${col.length} texts are translated in one place but used by the code untranslated in another:\n` + col.join('\n')); }
  for (const f of langFiles()) {
    const lang = f.slice(0, -5), cat = JSON.parse(fs.readFileSync(path.join(LANGDIR, f), 'utf8'));
    let have = 0; const bad = [];
    for (const k of keys.keys()) if (cat[k] !== undefined) { const why = broken(k, cat[k]); if (why) bad.push(`${why}: ${JSON.stringify(k).slice(0, 90)}`); else have++; }
    const stale = Object.keys(cat).filter((k) => !keys.has(k)).length;
    console.log(`${lang.padEnd(3)} ${String(have).padStart(5)} of ${keys.size} texts (${(100 * have / keys.size).toFixed(1)}%)${stale ? `, ${stale} no longer used` : ''}${bad.length ? `, ${bad.length} BROKEN` : ''}`);
    if (bad.length) { fail++; console.log('   ' + bad.slice(0, 10).join('\n   ')); }
  }
  console.log(fail ? 'Translation check FAILED.' : `Translation check passed: ${keys.size} texts marked, every translation keeps its markup and its {0} places.`);
  process.exit(fail ? 1 : 0);
}
