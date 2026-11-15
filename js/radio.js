// MOONKEEPER — what Mission Control says on the radio, and when. Pure logic, so tools/radio_test.mjs can check it.
// The radio only works while the Earth Link is up: the dish must point at Earth and be switched on.
// Lines answer what is happening at the station; when nothing is, Mission Control says something worth knowing.
const CALM = [
  'Your words take 1.3 seconds to reach us, and ours take 1.3 seconds back. Sorry for the pause.',
  'Remember: no choice is free up there. Check what a thing costs before you switch it on.',
  'Stay under the rock roof when you can. It is the best radiation shield you have.',
  'Drink water and rest, Moonkeeper. Tired people make mistakes.',
  'We are tracking your signal. Right now it is the only one coming from the Moon.',
];

// Returns { key, who, text } for the next thing worth saying, or null. S.radio remembers what was said and when.
export function radioLine(S) {
  const R = S.radio || (S.radio = { said: {}, resc: 0, off: false, calm: 0 }), F = S.flow, sun = F.sun, bp = S.battery / Math.max(1, F.cap);
  const left = S.hours === Infinity ? null : (S.hours - (S.t - S.t0)) / 24;
  const once = (k) => R.said[k] === undefined, every = (k, h) => R.said[k] === undefined || S.t - R.said[k] >= h;
  const say = (key, text, who = 'MISSION CONTROL') => { R.said[key] = S.t; return { key, who, text }; };
  if (!F.commsOn) { R.off = true;                                      // no link: only static, and one reminder now and then
    return every('static', 30) ? say('static', S.f.commsDown ? 'Only static. The dish is not pointing at Earth, so Mission Control cannot hear you.' : 'Only static. The Earth Link is switched off.', 'RADIO') : null; }
  if (R.off) { R.off = false; return say('back', 'We have you again, Tranquility Deep. It is good to hear you.'); }
  if (S.storm && S.t >= S.storm.start && S.t < S.storm.end) return every('storm', 6) ? say('storm', 'The storm is passing over you now. Stay under the rock until we call the all-clear.') : null;
  if (S.o2 < 1 && every('o2', 20)) return say('o2', 'Your oxygen tank is low. Keep the Oxygen Room working above everything else.');
  if (S.water < 5 && every('water', 20)) return say('water', 'Water is low at your end. Without water the Oxygen Maker stops too.');
  if (bp < 0.2 && F.net < 0 && every('battery', 20)) return say('battery', `We read your battery at ${Math.round(bp * 100)} percent and falling. Switch off what you can spare.`);
  if (S.rescued.length > R.resc) { R.resc = S.rescued.length; return say('rescue' + R.resc, 'We hear you brought someone home. Well done. Every astronaut counts.'); }
  if (sun.up && sun.toSunset < 14 && once('sunset')) return say('sunset', `Sunset at your site in ${Math.max(1, Math.round(sun.toSunset))} hours. After that your panels make nothing for two weeks. Fill the battery.`);
  if (!sun.up && once('night')) return say('night', 'The Sun is down at your site. You are on the battery and the reactor now. We are with you all night.');
  if (left !== null && left < 1 && once('lastday')) return say('lastday', 'The rescue ship is less than a day out. Hold on.');
  if (left !== null && left >= 1 && every('ship', 40)) return say('ship', `The rescue ship is ${left.toFixed(1)} days out and on course.`);
  if (every('calm', 30)) { const text = CALM[R.calm % CALM.length]; R.calm++; return say('calm', text); }
  return null;
}
