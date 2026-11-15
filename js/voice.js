// MOONKEEPER — REGO's voice. Uses the speech built into the browser, so there is nothing to download
// and nothing is sent anywhere. Voices differ from one device to the next; some devices have none.
const WORDS = [
  [/<kbd>([^<]*)<\/kbd>/g, ' $1 '], [/<br\s*\/?>/g, '. '], [/<[^>]+>/g, ' '],                       // keys are read by name; other tags are dropped
  [/&nbsp;/g, ' '], [/&amp;/g, ' and '], [/&lt;/g, ' less than '], [/&gt;/g, ' more than '],
  [/−/g, ' minus '], [/(\d)\s*°C/g, '$1 degrees Celsius'], [/°C/g, ' degrees Celsius'],
  [/(\d)\s*kWh\b/g, '$1 kilowatt hours'], [/(\d)\s*kW\b/g, '$1 kilowatts'], [/(\d)\s*mSv\b/g, '$1 millisieverts'], [/(\d)\s*kPa\b/g, '$1 kilopascals'], [/(\d)\s*Pa\b/g, '$1 pascals'],
  [/(\d)\s*km\b/g, '$1 kilometres'], [/(\d)\s*kg\b/g, '$1 kilograms'], [/(\d)\s*m\/s\b/g, '$1 metres per second'], [/(\d)\s*L\b/g, '$1 litres'], [/(\d)\s*h\b/g, '$1 hours'], [/(\d)\s*m\b/g, '$1 metres'],
  [/CO₂|CO2/g, 'carbon dioxide'], [/O₂/g, 'oxygen'], [/H₂O/g, 'water'], [/→/g, ', then '], [/[·•|]/g, ', '], [/[“”"]/g, ''], [/—|–/g, ', '], [/\s+/g, ' '],
];
// what a line of game text sounds like: no markup, units spelled out
export const spoken = (html) => { let t = String(html || ''); for (const [re, to] of WORDS) t = t.replace(re, to); return t.trim(); };

export class Voice {
  constructor(soundOn = () => true) {
    this.on = false; this.soundOn = soundOn; this.voice = null; this.last = '';
    this.ok = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (this.ok) { const pick = () => { const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
        this.voice = all.find((v) => /natural|neural/i.test(v.name)) || all.find((v) => /google|aria|jenny|samantha|zira|daniel/i.test(v.name)) || all.find((v) => v.default) || all[0] || null; };
      pick(); try { speechSynthesis.addEventListener('voiceschanged', pick); } catch (e) { /* older browsers */ } }
  }
  // Say one line. A new line always replaces the one being spoken.
  say(html) {
    if (!this.ok || !this.on || !this.soundOn()) return false; const text = spoken(html); if (!text) return false;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-US';
      u.rate = 1; u.pitch = 1.2; u.volume = 0.9; this.last = text; speechSynthesis.speak(u); return true; } catch (e) { return false; }
  }
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } }
}
