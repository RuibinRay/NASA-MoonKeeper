// MOONKEEPER — languages.
// The game is written in English. Every other language is a file lang/<code>.json that maps each English text to its
// translation. In the code a text is marked with tt`...` (a template, where ${...} becomes {0}, {1} in the file) or
// tt('...'). Anything without a translation simply stays in English, so a missing line never breaks the game.
// The language is chosen before any other part of the game loads (this module waits for its file), so texts that are
// set up once, like room names, are already in the right language. Changing the language reloads the page; a mission
// in progress is saved first and can be continued.
// node tools/i18n.mjs check   tells which texts each language still lacks.

export const LANGS = [
  ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['it', 'Italiano'],
  ['ru', 'Русский'], ['tr', 'Türkçe'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['zh', '中文（简体）'],
  ['ja', '日本語'], ['ko', '한국어'], ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'],
];
const RTL = ['ar'];
const known = (c) => c === 'qps' || LANGS.some(([k]) => k === c);   // qps: a test language that brackets every marked text

function choose() {
  try { const q = new URLSearchParams(location.search).get('lang'); if (q && known(q)) return q; } catch (e) { /* no address */ }
  try { const s = localStorage.getItem('mk-lang'); if (s && known(s)) return s; } catch (e) { /* storage blocked */ }
  try { for (const l of navigator.languages || [navigator.language]) { const c = String(l || '').toLowerCase().split('-')[0]; if (known(c) && c !== 'qps') return c; } } catch (e) { /* no navigator */ }
  return 'en';
}

export let LANG = 'en';
let CAT = null, PSEUDO = false;
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  LANG = choose(); PSEUDO = LANG === 'qps';
  if (LANG !== 'en' && !PSEUDO) {
    try { const r = await fetch(`lang/${LANG}.json`); if (!r.ok) throw new Error(r.status); CAT = await r.json(); } catch (e) { CAT = null; }
  }
  document.documentElement.lang = PSEUDO ? 'en' : LANG; document.documentElement.dir = 'ltr';
  document.documentElement.dataset.dir = RTL.includes(LANG) ? 'rtl' : 'ltr';   // text boxes turn right-to-left; the play screen keeps its layout
}

const look = (k) => { if (PSEUDO) return '⟦' + k + '⟧'; const v = CAT && CAT[k]; return typeof v === 'string' && v ? v : k; };
const keyOf = new WeakMap();
// tt`Battery ${n}% full` or tt('Settings')
export function tt(s, ...v) {
  if (s == null) return '';
  if (typeof s === 'string') return look(s);
  let k = keyOf.get(s);
  if (k === undefined) { k = s[0]; for (let i = 1; i < s.length; i++) k += '{' + (i - 1) + '}' + s[i]; keyOf.set(s, k); }
  const out = look(k);
  return v.length ? out.replace(/\{(\d+)\}/g, (m, i) => (+i < v.length ? String(v[+i]) : m)) : out;
}

// Case changes that respect the language: German keeps the capital on its nouns, Turkish has its own dotted and dotless i.
const loc = () => (LANG === 'qps' ? 'en' : LANG);
export const lower = (s) => (LANG === 'de' ? String(s) : String(s).toLocaleLowerCase(loc()));
export const upper = (s) => String(s).toLocaleUpperCase(loc());

export const setLang = (code) => { try { localStorage.setItem('mk-lang', code); } catch (e) { /* storage blocked */ } };
export const langName = (code = LANG) => (LANGS.find(([k]) => k === code) || [code, code])[1];

// The words written into index.html: each element marked data-t has its content translated, data-t-title its tooltip.
export function translatePage(root = document) {
  root.querySelectorAll('[data-t]').forEach((el) => { const k = el.innerHTML.replace(/\s+/g, ' ').trim(), v = tt(k); if (v !== k) el.innerHTML = v; });
  root.querySelectorAll('[data-t-title]').forEach((el) => { const k = el.getAttribute('title'); if (k) el.setAttribute('title', tt(k)); });
  root.querySelectorAll('[data-t-alt]').forEach((el) => { const k = el.getAttribute('alt'); if (k) el.setAttribute('alt', tt(k)); });
  root.querySelectorAll('[data-t-aria]').forEach((el) => { const k = el.getAttribute('aria-label'); if (k) el.setAttribute('aria-label', tt(k)); });
  document.title = tt(document.title);
}
