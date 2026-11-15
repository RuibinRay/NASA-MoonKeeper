// Writes the teacher's page twice from one text: docs/TEACHERS.md (to read on GitHub) and teachers.html (to print).
// The mission table comes from js/config.js and the question table from js/quiz.js, so the sheet cannot drift from the game.
// Usage: node tools/build_teachers.mjs          (add --check to fail if the two files on disk are out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES, K } from '../js/config.js';
import { QUIZ } from '../js/quiz.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://ruibinray.github.io/NASA-MoonKeeper/', REPO = 'https://github.com/RuibinRay/NASA-MoonKeeper';

// The name of each emergency as a teacher would say it, in the order the questions are listed.
const EMERGENCY = {
  storm: 'Solar storm', meteor: 'Meteoroid strike', breach: 'A room is losing air', dust: 'Dust on the solar panels', quake: 'Moonquake', fire: 'Fire in the kitchen',
  co2: 'Air cleaner failure', mold: 'Mould on the tomatoes', pump: 'The farm pump stops', led: 'Half the farm lamps go dark', seal: 'A leaking seal at the Water Plant',
  drift: 'Signal to Earth lost', freeze: 'Heater circuit failure', distress: 'Voices on the radio',
};
const missing = Object.keys(QUIZ).filter((k) => !EMERGENCY[k]), extra = Object.keys(EMERGENCY).filter((k) => !QUIZ[k]);
if (missing.length || extra.length) { console.error('The emergency names and the questions do not match:', { missing, extra }); process.exit(1); }

const minutes = (m) => Math.round((m.days * 24 * m.hourLen) / 60);   // how long the mission clock takes if it never stops
const missions = ['cadet', 'pilot', 'commander'].map((k) => MODES[k]).map((m) => `| ${m.name} | ${m.ages.replace('Ages ', '').replace('–', ' to ')} | ${m.days} | about ${minutes(m)} minutes |`).join('\n');
const questions = Object.keys(EMERGENCY).map((k) => `| ${EMERGENCY[k]} | ${QUIZ[k].q} | ${QUIZ[k].a[0]} |`).join('\n');
const moonDay = K.LUNAR_DAY.toFixed(1);

const md = `# MOONKEEPER: teacher's page

A lesson plan for 40 minutes, for ages 7 to 18. Printed, it is two sheets: the lesson first, then the questions and reference.

**Play the game:** [${SITE}](${SITE}) · **This page, ready to print:** [${SITE}teachers.html](${SITE}teachers.html)

> This plan has not yet been tried in a classroom, and the timings are estimates. If you use it, the most useful thing you can tell us is where pupils got stuck.

## What it is

Pupils keep a Moon base alive until a rescue ship lands. A meteor shower has damaged the station, and power, air, water and food all run out unless they act. A small robot, REGO, gives hints. MOONKEEPER is not an official NASA product. The science, and the source of every number, is in the [science notes](${REPO}/blob/main/docs/SCIENCE_AND_SOURCES.md).

## What pupils should be able to do afterwards

1. **Describe day and night on the Moon.** One Moon day lasts about ${moonDay} Earth days: about two weeks of light, then two weeks of dark. With no air to hold or move warmth, the ground swings from about ${K.SURF_DAY_C}°C to ${String(K.SURF_NIGHT_C).replace('-', '−')}°C. Under the rock, the cave stays near 17°C.
2. **Say what keeps people alive.** Name the four things the station must keep up (power, air, water, food) and one link between them, such as "oxygen is made from water" or "farms need lamps, and lamps need power".
3. **Plan with a limit.** Explain why the battery must be full before sunset, and give one choice they made that cost something else.
4. **Stay calm in an emergency.** Describe the four steps the game repeats: stop, understand, choose, act.
5. **Tell real from story.** Give one thing in the game that is a measured fact and one that is made up.

## Before the lesson

| Mission | Ages | Game days | The mission clock, if it never stopped |
| --- | --- | --- | --- |
${missions}

- **Time.** The clock stops while a pupil reads a card or a panel, which adds time. Sleeping and long jobs skip ahead, which takes it away. The game opens with a short comic and a hands-on training: allow about five minutes, or tick "Skip the comic and training" for pupils who have played before. A mission that is not finished can be carried on later: it saves in the browser, on that computer, and the title screen offers "Continue".
- **Equipment.** A computer with a keyboard and a mouse, and a modern browser. There are touch controls for phones and tablets, but a whole mission has not been tested on them.
- **Privacy.** No download, no sign-in, no accounts. The page loads its lettering from Google Fonts and makes no other outside connection.
- **Settings worth knowing** (the Settings button, on the title screen and during play): "REGO reads aloud" (on by itself in Cadet missions), "Guide mode" (a yellow line shows where to go), "Questions" (leave it on), and "Graphics" (choose Low on a slow computer).
- **Try it first.** Ten minutes of play will show you what pupils meet.

## The 40-minute lesson

| Minutes | What happens |
| --- | --- |
| 0 to 5 | **Ask.** "How long is one day on the Moon?" Take guesses. Then: "What would you need to stay alive there for a week?" Write the answers on the board and keep them for the end. |
| 5 to 10 | **Start.** Pupils work in pairs: one drives, the other reads the cards aloud and decides. Choose the mission for their age. Take the comic and the training. |
| 10 to 30 | **Play.** Swap roles at minute 20. Walk round and ask the prompts below. Do not give answers: point to REGO (key H). |
| 30 to 35 | **Look.** Everyone presses P to pause, then T for the Day and night page. Find "now" on the graph. Is the Sun up? How long until it sets or rises? Then press M and choose "The real Moon": how far away is the ice really? |
| 35 to 40 | **Talk.** Go back to the list on the board. What did the station really need? What ran short first? Finish with the exit question. |

**Prompts while they play**

- "What is your battery doing? What will happen at sunset?"
- "Which gauge is falling fastest? What makes more of it?"
- "The card says the clock has stopped. What are your choices, and what does each one cost?"
- "What did REGO suggest? Do you agree?"

## Exit question

One minute, on paper: **"Night on the Moon lasts about two weeks. Write two things a Moon base must do before the Sun sets, and say why."**

A good answer has two of these: fill the battery, because solar panels make nothing in the dark; keep machines on the surface warm, because the ground falls to about ${String(K.SURF_NIGHT_C).replace('-', '−')}°C; switch off what is not needed, so the stored power lasts.

## The questions the game asks

After each kind of emergency the game asks one question with three answers. A right answer earns a research point. A wrong one costs nothing, and the game explains the answer either way. The end screen shows how many were answered right. A pupil meets only the emergencies that happen in their mission; these are all ${Object.keys(QUIZ).length}.

| Emergency | Question | Right answer |
| --- | --- | --- |
${questions}

## Questions for talking afterwards

**Ages 7 to 10**

- What ran short first? What did you do about it?
- Why is it dark for so long on the Moon?
- Why do you need a spacesuit outside but not inside the station?

**Ages 11 to 14**

- Why did the battery matter so much before sunset?
- Pick one emergency. What were your choices, and what did yours cost?
- Why is the station underground? (Rock stops radiation and meteoroids, and the temperature stays steady.)

**Ages 15 to 18**

- Draw the loop: where does the oxygen come from, and where does the water go? (Key L shows the game's answer.)
- The game puts the ice mine a short trip from a base near the Moon's equator. Why is that wrong, and why might the designers have done it? Where would you build the base?
- Which numbers in the game would you check before trusting them, and where would you look?

## Real and made up

In the game, the Space Guide (key N) has a page called "Real or made up?". A short version:

| Measured on or from the Moon | Our story, or sized for play |
| --- | --- |
| A Moon day lasts about ${moonDay} Earth days | A meteor shower wrecking every station at once |
| The surface swings from about ${K.SURF_DAY_C}°C to ${String(K.SURF_NIGHT_C).replace('-', '−')}°C | The ice mine a short trip away: real polar ice is about 2,500 km from this base |
| Shaded pits stay near 17°C | One game hour passes in 7 to 9 seconds |
| Gravity is one-sixth of Earth's | Crops ripen in about a day |
| The storms, moonquakes and impacts carry the dates of real recorded events | Hens on the Moon |
| Soil in a dark polar crater held about 5.6% water where a probe struck | Nobody has yet built a station in a lava tube |

## If something goes wrong

- **The game is slow.** Settings, then Graphics, then Low.
- **A pupil is lost.** Key H asks REGO what matters most. Guide mode draws a yellow line to the next job.
- **The mouse is trapped in the game.** Press Esc.
- **A pupil loses the mission.** The end screen explains what happened and why, with a graph of the whole mission, and offers "Try again". A lost mission is a good place to start the talk.

## Keys

| Key | What it does | Key | What it does |
| --- | --- | --- | --- |
| W A S D | Move | Tab | Power Board |
| Mouse | Look | M | Map, and the real Moon |
| E | Do the thing in front of you | H | Ask REGO |
| Q | Second action | N | Space Guide |
| Space | Hop | L | Life-support loop |
| Shift | Run | T | Day and night |
| V | Change view | P | Pause |
`;

// ---- a small Markdown reader: only what this sheet uses
const NEW_PAGE = 'The questions the game asks';   // printed, the second sheet starts here
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
function toHtml(text) {
  const out = [], lines = text.split('\n'); let i = 0;
  const cells = (l) => l.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^(#{1,3}) (.*)$/);
    if (h) { out.push(`<h${h[1].length}${h[2] === NEW_PAGE ? ' class="newpage"' : ''}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (l.startsWith('|')) {
      const head = cells(l); i += 2; const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue;
    }
    const list = l.match(/^(- |\d+\. )/);
    if (list) {
      const tag = list[1] === '- ' ? 'ul' : 'ol', items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, ''));
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`); continue;
    }
    if (l.startsWith('> ')) { out.push(`<p class="note">${inline(l.slice(2))}</p>`); i++; continue; }
    out.push(`<p>${inline(l)}</p>`); i++;
  }
  return out.join('\n');
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MOONKEEPER: teacher's page</title>
<meta name="description" content="A 40-minute lesson with the MOONKEEPER Moon-base game: learning goals, a lesson plan, and the questions the game asks.">
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;background:#f3f1ec;color:#1b2026;font:16px/1.5 Georgia,'Times New Roman',serif}
  main{max-width:820px;margin:0 auto;padding:28px 22px 60px;background:#fff;min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,.06)}
  h1{font:700 30px/1.15 'Segoe UI',system-ui,sans-serif;margin:0 0 4px;letter-spacing:-.01em}
  h2{font:700 19px/1.2 'Segoe UI',system-ui,sans-serif;margin:26px 0 8px;padding-top:12px;border-top:2px solid #1b2026}
  p{margin:8px 0}ul,ol{margin:8px 0;padding-left:22px}li{margin:3px 0}
  a{color:#0b5cad}
  .note{border-left:4px solid #c9821a;background:#fbf4e6;padding:8px 12px;border-radius:0 6px 6px 0;font-size:15px}
  table{width:100%;border-collapse:collapse;margin:10px 0;font:14px/1.4 'Segoe UI',system-ui,sans-serif}
  th,td{border:1px solid #c9ccd1;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#eef1f4}
  .bar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 4px;font-family:'Segoe UI',system-ui,sans-serif}
  .bar a,.bar button{font:600 14px/1 'Segoe UI',system-ui,sans-serif;padding:10px 14px;border-radius:8px;border:1px solid #1b2026;background:#1b2026;color:#fff;text-decoration:none;cursor:pointer}
  .bar button{background:#fff;color:#1b2026}
  @media (max-width:560px){main{padding:18px 14px 40px}table{font-size:13px}th,td{padding:5px 6px}h1{font-size:25px}}
  @media print{
    body{background:#fff;font-size:10.5pt;line-height:1.35}main{max-width:none;padding:0;box-shadow:none}
    .bar{display:none}a{color:inherit;text-decoration:none}.newpage{break-before:page}
    h1{font-size:19pt}h2{font-size:12.5pt;margin:12pt 0 4pt;padding-top:6pt;break-after:avoid}
    table{font-size:9pt;margin:5pt 0}th,td{padding:2.5pt 4pt}tr,li{break-inside:avoid}p{margin:4pt 0}ul,ol{margin:4pt 0}
    @page{margin:14mm}
  }
</style>
</head>
<body>
<main>
<div class="bar"><a href="./">Play MOONKEEPER</a><button onclick="window.print()">Print this page</button></div>
${toHtml(md)}
</main>
</body>
</html>
`;

const files = [['docs/TEACHERS.md', md], ['teachers.html', html]];
if (process.argv.includes('--check')) {
  const stale = files.filter(([f, text]) => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n') !== text);
  if (stale.length) { console.error('Out of date: ' + stale.map((s) => s[0]).join(', ') + '. Run: node tools/build_teachers.mjs'); process.exit(1); }
  console.log("The teacher's page matches the game."); process.exit(0);
}
for (const [f, text] of files) { fs.writeFileSync(path.join(ROOT, f), text); console.log('wrote', f, (text.length / 1024).toFixed(1) + ' kB'); }
