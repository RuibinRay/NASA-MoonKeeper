// MOONKEEPER — every picture made with SI (AI image tools) carries a visible "SI-generated" mark.
// The NASA Space Apps rules ask that SI-made images and videos show a visible watermark. The game's pictures all live in
// assets/img/, so this finds them by where they come from: a picture added later is marked without anyone remembering to.
// Pictures shown as a CSS background (title, mission page, end screen) are marked in css/style.css; the job games mark
// the picture they draw on their canvas themselves.
import { tt } from './i18n.js';

const marks = new Map();   // picture -> its mark
const isSI = (img) => (img.getAttribute('src') || '').includes('assets/img/');

function place(img, m) {
  if (!img.isConnected) { m.remove(); marks.delete(img); return; }
  const w = img.offsetWidth, h = img.offsetHeight, shown = w > 0 && h > 0 && img.offsetParent;
  m.style.display = shown ? '' : 'none';
  if (!shown) return;
  const icon = w < 56 || h < 40, small = icon || w < 120 || h < 80;   // an icon says "SI", a small picture the full words in small letters
  m.classList.toggle('tiny', small); m.textContent = icon ? 'SI' : tt('SI-generated');
  const pad = small ? 1 : Math.max(4, Math.min(10, w * 0.015));
  // measured on screen, so a zoomed window (text size), right-to-left text or a moving window cannot push it off the picture
  const r = img.getBoundingClientRect(), z = r.width / w || 1;
  m.style.left = '0px'; m.style.top = '0px'; const o = m.getBoundingClientRect();
  m.style.left = `${(r.right - o.left) / z - m.offsetWidth - pad}px`;
  m.style.top = `${(r.bottom - o.top) / z - m.offsetHeight - pad}px`;
}

function scan() {
  for (const img of document.querySelectorAll('img')) {
    if (!isSI(img)) { const m = marks.get(img); if (m) { m.remove(); marks.delete(img); } continue; }
    let m = marks.get(img);
    if (!m || !m.isConnected || m.previousSibling !== img) { m?.remove(); m = document.createElement('i'); m.className = 'si-mark'; m.setAttribute('aria-hidden', 'true'); img.after(m); marks.set(img, m); img.addEventListener('load', () => place(img, m)); }
    place(img, m);
  }
  for (const [img, m] of marks) if (!img.isConnected) { m.remove(); marks.delete(img); }
}

let queued = false;
const soon = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 30); };

export function startSIMarks() {
  if (typeof document === 'undefined') return;
  const ours = (r) => r.target.classList?.contains('si-mark') || (r.type === 'childList' && r.addedNodes.length > 0 && !r.removedNodes.length && [...r.addedNodes].every((n) => n.classList?.contains('si-mark')));
  new MutationObserver((list) => { if (list.some((r) => !ours(r))) soon(); })   // anything but our own marks moving
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
  addEventListener('resize', soon);
  setInterval(scan, 1000);   // windows open with an animation; settle the marks after it
  scan();
}
