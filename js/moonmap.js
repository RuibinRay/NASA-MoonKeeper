// The real Moon, to scale: where the base and the polar ice really are, and how far apart.
// Pure logic and a drawing made of text (SVG). Checked by `node tools/moonmap_test.mjs`.
// REAL: every position here is a real place on the Moon; the distances are worked out from them on a ball of the Moon's size.
// STORY: the game draws the ice mine a short trip from the base. This page shows the true distance.
import { tt } from './i18n.js';

export const MOON_R = 1737.4;                 // km, the Moon's mean radius
export const EARTH_KM = 384400;               // km, mean distance from Earth to the Moon
export const ROVER_KMH = 13;                  // km/h: the fastest the crewed Moon rovers of the 1970s drove on flat ground
export const ICE_LAT = 70;                    // ice on the surface has been found only closer to a pole than this latitude

// Latitude (north is +) and longitude (east is +), in degrees.
export const REAL = {
  base:  { lat: 8.3355, lon: 33.222 },        // the pit in the Sea of Tranquility where the station is
  north: { lat: 90, lon: 0 },
  south: { lat: -90, lon: 0 },
  probe: { lat: -84.68, lon: -48.71 },        // where a probe was crashed into a dark crater in 2009; the dust it threw up held water
};

// The Moon's seas of old lava that face Earth: [name, latitude, longitude, width in km], from the official gazetteer of lunar names.
// They are drawn as simple round patches of that width.
// The one exception is the largest, the Ocean of Storms: a ragged shape 2,592 km long, drawn half as wide so it does not swallow its neighbours.
export const SEAS = [
  [tt('Ocean of Storms'), 20.67, -56.68, 1296], [tt('Sea of Showers'), 34.72, -14.91, 1145.53], [tt('Sea of Serenity'), 27.29, 18.36, 674.28],
  [tt('Sea of Tranquility'), 8.35, 30.83, 875.75], [tt('Sea of Crises'), 16.18, 59.10, 555.92], [tt('Sea of Fertility'), -7.83, 53.67, 840.35],
  [tt('Sea of Nectar'), -15.19, 34.60, 339.39], [tt('Sea of Clouds'), -20.59, -17.29, 714.50], [tt('Sea of Moisture'), -24.48, -38.57, 419.67],
  [tt('Sea of Vapours'), 13.20, 4.09, 242.46], [tt('Known Sea'), -10.53, -22.31, 350.01], [tt('Sea of Islands'), 7.79, -30.64, 511.93],
];
// Two bright young craters that help the eye recognise the Moon: [name, latitude, longitude].
export const CRATERS = [[tt('Tycho'), -43.30, -11.22], [tt('Copernicus'), 9.62, -20.08]];
// The dark crater the probe struck: [name, latitude, longitude, width in km].
export const CABEUS = [tt('Cabeus'), -85.33, -42.13, 100.58];

const D = Math.PI / 180;
const vec = (p) => { const a = p.lat * D, o = p.lon * D; return [Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o)]; };   // x to the east, y to the north, z towards Earth
const place = (v) => ({ lat: Math.asin(Math.max(-1, Math.min(1, v[1]))) / D, lon: Math.atan2(v[0], v[2]) / D });

// The angle between two places, seen from the Moon's centre (degrees), and the shortest trip over the ground (km).
export function arcDeg(a, b) { const p = vec(a), q = vec(b); return Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) / D; }
export function gcKm(a, b) { return arcDeg(a, b) * D * MOON_R; }

// The shortest path over the ground from a to b, as n + 1 places.
export function gcPath(a, b, n = 32) {
  const p = vec(a), q = vec(b), w = arcDeg(a, b) * D, out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = Math.sin(w) || 1, k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
    out.push(w < 1e-9 ? { ...a } : place([p[0] * k1 + q[0] * k2, p[1] * k1 + q[1] * k2, p[2] * k1 + q[2] * k2]));
  }
  return out;
}

// A round patch of ground: n places, all `km` over the ground from the centre.
export function ring(c, km, n = 40) {
  const r = km / MOON_R, la = c.lat * D, out = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * 2 * Math.PI, lat = Math.asin(Math.sin(la) * Math.cos(r) + Math.cos(la) * Math.sin(r) * Math.cos(th));
    out.push({ lat: lat / D, lon: c.lon + Math.atan2(Math.sin(th) * Math.sin(r) * Math.cos(la), Math.cos(r) - Math.sin(la) * Math.sin(lat)) / D });
  }
  return out;
}

// The Moon as we see it from Earth: a place becomes a spot on a disc of radius R. x grows to the right (east), y grows downwards (south).
// front is false for places on the far side; those are pushed out to the edge of the disc.
export function ortho(p, R = 1) {
  const v = vec(p), front = v[2] >= 0; let x = v[0], y = -v[1];
  if (!front) { const l = Math.hypot(x, y) || 1; x /= l; y /= l; }
  return { x: x * R, y: y * R, front };
}

// The numbers the page shows. gameM: how far the game draws the mine from the pit elevator, in metres.
export function realFacts(gameM) {
  const poleKm = Math.min(gcKm(REAL.base, REAL.north), gcKm(REAL.base, REAL.south)), probeKm = gcKm(REAL.base, REAL.probe);
  const iceEdgeKm = (ICE_LAT - REAL.base.lat) * D * MOON_R, hours = poleKm / ROVER_KMH;
  return { gameM, poleKm, probeKm, iceEdgeKm, times: (poleKm * 1000) / gameM, hours, days: hours / 24, earthKm: EARTH_KM, earthTimes: EARTH_KM / poleKm, widthKm: 2 * MOON_R };
}
export const roundTo = (v, step) => Math.round(v / step) * step;

// The drawing. W: width and height of the picture's own grid; the disc is centred in it.
export function realMoonSvg(W = 460) {
  const R = W * 0.4, cx = W / 2, cy = W / 2 + 2, f = (v) => v.toFixed(1);
  const at = (p) => { const o = ortho(p, R); return { x: cx + o.x, y: cy + o.y }; };
  const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f(at(p).x)} ${f(at(p).y)}`).join('');
  const base = at(REAL.base), np = at(REAL.north), sp = at(REAL.south), pr = at(REAL.probe);
  const toPole = gcPath(REAL.base, REAL.north, 30), toProbe = gcPath(REAL.base, REAL.probe, 40);
  const mid = (path, t) => at(path[Math.round((path.length - 1) * t)]);
  const m1 = mid(toPole, 0.38), m2 = mid(toProbe, 0.5), iceY = Math.sin(ICE_LAT * D) * R;
  const km = (v) => roundTo(v, 100).toLocaleString('en-US') + ' km';
  const grid = [-60, -30, 0, 30, 60].map((la) => { const y = cy - Math.sin(la * D) * R, h = Math.cos(la * D) * R; return `<line x1="${f(cx - h)}" x2="${f(cx + h)}" y1="${f(y)}" y2="${f(y)}"/>`; }).join('')
    + [30, 60].map((lo) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(Math.sin(lo * D) * R)}" ry="${f(R)}"/>`).join('') + `<line x1="${f(cx)}" x2="${f(cx)}" y1="${f(cy - R)}" y2="${f(cy + R)}"/>`;
  return `<svg class="rm-moon" viewBox="0 0 ${W} ${W}" role="img" aria-label="${tt`The side of the Moon that faces Earth, showing the base near the middle and the ice near the two poles`}">
    <defs><radialGradient id="rm-g" cx="42%" cy="38%" r="75%"><stop offset="0" stop-color="#c9cdd3"/><stop offset="0.7" stop-color="#9da3ac"/><stop offset="1" stop-color="#6d7480"/></radialGradient><clipPath id="rm-c"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/></clipPath></defs>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="url(#rm-g)"/>
    <g clip-path="url(#rm-c)">
      <g class="rm-sea">${SEAS.map(([, la, lo, w]) => `<path d="${poly(ring({ lat: la, lon: lo }, w / 2))}Z"/>`).join('')}</g>
      <g class="rm-ray">${CRATERS.map(([, la, lo]) => { const c = at({ lat: la, lon: lo }); return `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(R * 0.022)}"/>`; }).join('')}</g>
      <g class="rm-grid">${grid}</g>
      <rect class="rm-ice" x="${f(cx - R)}" y="${f(cy - R)}" width="${f(2 * R)}" height="${f(R - iceY)}"/><rect class="rm-ice" x="${f(cx - R)}" y="${f(cy + iceY)}" width="${f(2 * R)}" height="${f(R - iceY)}"/>
    </g>
    <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="rgba(255,255,255,.35)"/>
    <path class="rm-trip" d="${poly(toPole)}"/><path class="rm-trip" d="${poly(toProbe)}"/>
    <text class="rm-km" x="${f(m1.x - 8)}" y="${f(m1.y + 4)}" text-anchor="end">${km(gcKm(REAL.base, REAL.north))}</text>
    <text class="rm-km" x="${f(m2.x - 8)}" y="${f(m2.y + 4)}" text-anchor="end">${km(gcKm(REAL.base, REAL.probe))}</text>
    <circle class="rm-pole" cx="${f(np.x)}" cy="${f(np.y)}" r="4"/><text x="${f(np.x)}" y="${f(np.y - 10)}" text-anchor="middle">${tt`North pole`}</text>
    <circle class="rm-pole" cx="${f(sp.x)}" cy="${f(sp.y)}" r="4"/><text x="${f(sp.x + 10)}" y="${f(sp.y + 18)}">${tt`South pole`}</text>
    <circle class="rm-probe" cx="${f(pr.x)}" cy="${f(pr.y)}" r="4.5"/><text x="${f(pr.x - 8)}" y="${f(pr.y + 18)}" text-anchor="end">${tt`A probe found water here`}</text>
    <circle class="rm-base" cx="${f(base.x)}" cy="${f(base.y)}" r="6"/><text class="rm-you" x="${f(base.x + 10)}" y="${f(base.y + 4)}">${tt`Your base`}</text>
    <text x="${f(cx - R * 0.5)}" y="${f(cy - iceY + 16)}" text-anchor="middle" class="rm-icel">ice zone</text><text x="${f(cx - R * 0.5)}" y="${f(cy + iceY - 8)}" text-anchor="middle" class="rm-icel">ice zone</text>
  </svg>`;
}
