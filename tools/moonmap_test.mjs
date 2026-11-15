// Checks the real-Moon map: the distances, the drawing's geometry, and the numbers the page shows.
//   node tools/moonmap_test.mjs
import { MOON_R, REAL, SEAS, CRATERS, CABEUS, ICE_LAT, ROVER_KMH, arcDeg, gcKm, gcPath, ring, ortho, realFacts, realMoonSvg, roundTo } from '../js/moonmap.js';
import { K, MINE, STATIONS } from '../js/config.js';

let bad = 0, n = 0;
const ok = (name, cond, got) => { n++; if (!cond) { bad++; console.log('FAIL', name, got === undefined ? '' : `(got ${got})`); } };
const near = (name, got, want, tol) => ok(name, Math.abs(got - want) <= tol, got);

// --- distances over the ground
near('a quarter of the way round the Moon is 2,729 km', gcKm({ lat: 0, lon: 0 }, { lat: 0, lon: 90 }), (Math.PI / 2) * MOON_R, 0.01);
near('pole to pole is half the way round', gcKm(REAL.north, REAL.south), Math.PI * MOON_R, 0.01);
near('a place is no distance from itself', gcKm(REAL.base, REAL.base), 0, 1e-6);
near('distance is the same both ways', gcKm(REAL.base, REAL.probe), gcKm(REAL.probe, REAL.base), 1e-9);
near('base to the north pole: 90° minus its latitude', arcDeg(REAL.base, REAL.north), 90 - REAL.base.lat, 1e-9);
near('base to the north pole is about 2,476 km', gcKm(REAL.base, REAL.north), 2476, 2);
near('base to the south pole is about 2,982 km', gcKm(REAL.base, REAL.south), 2982, 2);
ok('the probe site is 2,940 to 2,980 km away', gcKm(REAL.base, REAL.probe) > 2940 && gcKm(REAL.base, REAL.probe) < 2980, gcKm(REAL.base, REAL.probe));
ok('the map uses the same place as the rest of the game', Math.abs(REAL.base.lat - K.LAT) < 0.01 && Math.abs(REAL.base.lon - K.LON) < 0.01, `${K.LAT}, ${K.LON}`);
ok('the probe site is inside the southern ice zone', REAL.probe.lat < -ICE_LAT, REAL.probe.lat);
ok('the probe struck inside the crater Cabeus', gcKm(REAL.probe, { lat: CABEUS[1], lon: CABEUS[2] }) < CABEUS[3] / 2, gcKm(REAL.probe, { lat: CABEUS[1], lon: CABEUS[2] }));
ok('the Ocean of Storms is the only sea drawn smaller than it is', SEAS.filter((q) => q[0] !== 'Ocean of Storms').every((q) => q[3] > 200 && q[3] < 1200) && SEAS[0][3] === 2592 / 2, SEAS[0][3]);

// --- paths
const path = gcPath(REAL.base, REAL.probe, 40);
near('a path starts where it should', gcKm(path[0], REAL.base), 0, 0.01);
near('a path ends where it should', gcKm(path[40], REAL.probe), 0, 0.01);
let sum = 0; for (let i = 1; i < path.length; i++) sum += gcKm(path[i - 1], path[i]);
near('the steps of a path add up to the whole trip', sum, gcKm(REAL.base, REAL.probe), 0.5);
const north = gcPath(REAL.base, REAL.north, 10);
ok('the trip to the north pole runs straight up the base\'s line of longitude', north.slice(0, 10).every((p) => Math.abs(p.lon - REAL.base.lon) < 1e-6), north[5].lon);

// --- round patches
const tranq = SEAS.find((s) => s[0] === 'Sea of Tranquility'), tc = { lat: tranq[1], lon: tranq[2] };
ok('every point of a round patch is the same distance from its middle', ring(tc, tranq[3] / 2, 24).every((p) => Math.abs(gcKm(tc, p) - tranq[3] / 2) < 0.01));
ok('the base lies inside the Sea of Tranquility', gcKm(tc, REAL.base) < tranq[3] / 2, gcKm(tc, REAL.base));
ok('every sea and crater faces Earth', [...SEAS, ...CRATERS].every((s) => ortho({ lat: s[1], lon: s[2] }).front));

// --- the picture's geometry
const c = ortho({ lat: 0, lon: 0 }, 100);
ok('the middle of the near side is the middle of the disc', Math.abs(c.x) < 1e-9 && Math.abs(c.y) < 1e-9);
near('the north pole is at the top edge', ortho(REAL.north, 100).y, -100, 1e-9);
near('the south pole is at the bottom edge', ortho(REAL.south, 100).y, 100, 1e-9);
ok('east is to the right and north is up', ortho(REAL.base, 100).x > 0 && ortho(REAL.base, 100).y < 0);
const far = ortho({ lat: 10, lon: 150 }, 100);
ok('a far-side place is pushed to the edge of the disc', !far.front && Math.abs(Math.hypot(far.x, far.y) - 100) < 1e-9);
ok('nothing on the near side falls outside the disc', path.every((p) => Math.hypot(ortho(p, 100).x, ortho(p, 100).y) <= 100 + 1e-9));

// --- the numbers on the page
const gate = STATIONS.find((s) => s.id === 'gate').pos, gameM = Math.hypot(MINE.x - gate[0], MINE.z - gate[1]), F = realFacts(gameM);
ok('the page speaks of the nearer pole', F.poleKm === gcKm(REAL.base, REAL.north) && F.poleKm < gcKm(REAL.base, REAL.south));
ok('"about 2,500 km" is honest', roundTo(F.poleKm, 100) === 2500, roundTo(F.poleKm, 100));
ok('"about 3,000 km" is honest', roundTo(F.probeKm, 100) === 3000, roundTo(F.probeKm, 100));
ok('the game draws the mine 500 to 800 m from the pit elevator', gameM > 500 && gameM < 800, gameM);
near('the real trip is the game\'s trip times the stated number', F.times * gameM / 1000, F.poleKm, 1e-6);
ok('"about 4,000 times" is honest', roundTo(F.times, 500) === 4000, F.times);
near('driving hours are distance over speed', F.hours, F.poleKm / ROVER_KMH, 1e-9);
ok('the drive is about 8 days', Math.round(F.days) === 8, F.days);
ok('the nearest ice zone is closer than the pole', F.iceEdgeKm < F.poleKm && F.iceEdgeKm > 1500, F.iceEdgeKm);
ok('Earth is more than 150 times as far as the pole', F.earthTimes > 150 && F.earthTimes < 160, F.earthTimes);
near('the Moon is about 3,475 km wide', F.widthKm, 3475, 1);

// --- the drawing itself
const svg = realMoonSvg(460);
ok('the drawing is one picture', svg.startsWith('<svg') && svg.trim().endsWith('</svg>'));
ok('the drawing has no broken numbers', !/NaN|undefined|Infinity/.test(svg));
ok('the drawing shows both distances', svg.includes('2,500 km') && svg.includes('3,000 km'));
ok('the drawing names the base, both poles and the probe', ['Your base', 'North pole', 'South pole', 'A probe found water here'].every((t) => svg.includes(t)));
ok('the drawing has one patch for every sea', (svg.match(/<path d="M[^"]+Z"\/>/g) || []).length === SEAS.length);
ok('nothing in the game\'s drawing names a space agency', !/NASA|ESA|LRO|LCROSS/.test(svg));

console.log(bad ? `${bad} of ${n} real-Moon map checks FAILED` : `All ${n} real-Moon map checks passed.`);
process.exit(bad ? 1 : 0);
