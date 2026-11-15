// MOONKEEPER — REGO's voice. Uses the speech built into the browser, so there is nothing to download
// and nothing is sent anywhere. Voices differ from one device to the next; some devices have none.
// REGO speaks the language the game is set to, with a voice of that language. If the device has no voice for it, REGO stays quiet.
import { tt, LANG } from './i18n.js';
const WORDS = [
  [/<kbd>([^<]*)<\/kbd>/g, ' $1 '], [/<br\s*\/?>/g, '. '], [/<[^>]+>/g, ' '],                       // keys are read by name; other tags are dropped
  [/&nbsp;/g, ' '], [/&amp;/g, tt(' and ')], [/&lt;/g, tt(' less than ')], [/&gt;/g, tt(' more than ')],
  [/−/g, tt(' minus ')], [/(\d)\s*°C/g, tt('$1 degrees Celsius')], [/°C/g, tt(' degrees Celsius')],
  [/(\d)\s*kWh\b/g, tt('$1 kilowatt hours')], [/(\d)\s*kW\b/g, tt('$1 kilowatts')], [/(\d)\s*mSv\b/g, tt('$1 millisieverts')], [/(\d)\s*kPa\b/g, tt('$1 kilopascals')], [/(\d)\s*Pa\b/g, tt('$1 pascals')],
  [/(\d)\s*km\b/g, tt('$1 kilometres')], [/(\d)\s*kg\b/g, tt('$1 kilograms')], [/(\d)\s*m\/s\b/g, tt('$1 metres per second')], [/(\d)\s*L\b/g, tt('$1 litres')], [/(\d)\s*h\b/g, tt('$1 hours')], [/(\d)\s*m\b/g, tt('$1 metres')],
  [/CO₂|CO2/g, tt('carbon dioxide')], [/O₂/g, tt('oxygen')], [/H₂O/g, tt('water')], [/→/g, tt(', then ')], [/[·•|]/g, ', '], [/[“”"]/g, ''], [/—|–/g, ', '], [/\s+/g, ' '],
];
// what a line of game text sounds like: no markup, units spelled out
export const spoken = (html) => { let t = String(html || ''); for (const [re, to] of WORDS) t = t.replace(re, to); return t.trim(); };

const SPEAK = LANG === 'qps' ? 'en' : LANG;          // the test language speaks English
export class Voice {
  constructor(soundOn = () => true) {
    this.on = false; this.soundOn = soundOn; this.voice = null; this.last = '';
    this.ok = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (this.ok) { const pick = () => { const all = speechSynthesis.getVoices().filter((v) => String(v.lang).toLowerCase().replace('_', '-').split('-')[0] === SPEAK);
        this.voice = all.find((v) => /natural|neural/i.test(v.name)) || all.find((v) => /google|aria|jenny|samantha|zira|daniel/i.test(v.name)) || all.find((v) => v.default) || all[0] || null; };
      pick(); try { speechSynthesis.addEventListener('voiceschanged', pick); } catch (e) { /* older browsers */ } }
  }
  // Say one line. A new line always replaces the one being spoken.
  say(html) {
    if (!this.ok || !this.on || !this.soundOn()) return false; if (!this.voice && SPEAK !== 'en') return false;   // no voice for this language: an English voice would garble it
    const text = spoken(html); if (!text) return false;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-US';
      u.rate = 1; u.pitch = 1.2; u.volume = 0.9; this.last = text; speechSynthesis.speak(u); return true; } catch (e) { return false; }
  }
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } }
}
