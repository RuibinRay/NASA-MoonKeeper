// MOONKEEPER — what the quality of the hands-on work does to the station. Pure logic, so tools/jobfx_test.mjs can check it.
// What the quality of the hands-on work does to the station, beyond the time it takes. q: 'great' (three stars) or 'poor' (failed).
// Each entry returns [apply(S), text] or null. It runs just after the job, so it lands on top of whatever the job itself changed.
const spare = (S, n) => S.mat !== Infinity && S.mat >= n;
export const jobEffect = (title, tag, q) => {
  const T = (re) => re.test(title), poor = q === 'poor', great = q === 'great';
  if (T(/Brushing/i)) return poor ? [(S) => { S.dust = Math.max(S.dust, 0.2); }, 'Streaks of dust were left behind: the panels are still losing some power.'] : great ? [(S) => { S.dust = 0; }, 'Not a speck left: the panels are at full power.'] : null;
  if (tag === 'cook' || T(/Cooking/i)) return poor ? [(S) => { S.meals = Math.max(0, S.meals - 1); }, 'The bottom of the pot burned: one meal was lost.'] : great ? [(S) => { S.meals += 1; }, 'Nothing burned and nothing wasted: one extra meal.'] : null;
  if (T(/Picking/i)) return poor ? [(S) => { S.raw = Math.max(0, S.raw - 2); }, 'Some plants were picked too early or too late: 2 raw food wasted.'] : great ? [(S) => { S.raw += 2; }, 'Every plant picked at its best: 2 extra raw food.'] : null;
  if (T(/Patching/i)) return poor ? [(S) => { S.o2 = Math.max(0, S.o2 - 0.25); }, 'The seam took a long time to close: 0.25 kg of air escaped while you worked.'] : great ? [(S) => { S.o2 = Math.min(S.o2Cap, S.o2 + 0.1); }, 'A fast, tight seal: hardly any air was lost.'] : null;
  if (T(/Sealing/i)) return poor ? [(S) => { S.water = Math.max(0, S.water - 3); }, 'The joint kept dripping while you worked: 3 L of water was lost.'] : null;
  if (T(/Servicing|digester/i)) return poor ? [(S) => { S.water = Math.max(0, S.water - 2); }, 'Some water was spilled: 2 L lost.'] : null;
  if (T(/battery module/i)) return poor ? [(S) => { S.battery = Math.max(0, S.battery - 10); }, 'A bad connection sparked: 10 kWh drained from the battery.'] : null;
  if (T(/Rebuilding|Repairing|heater circuit|Installing the solar panel/i)) return poor ? [(S) => { if (spare(S, 1)) S.mat -= 1; }, 'A part was damaged and had to be replaced: 1 extra material used.'] : null;
  return null;
};
