// Draws the contour map behind every page of arrofamily.com and every paper
// screen of the app: faint topographic lines, like the map of a walk.
//
//   node site/scenes/contours.mjs
//
// The map is a smooth height field (a sum of waves) traced into contour lines.
// Each wave also has a slow speed, so the field shifts over time and the lines
// drift and reshape like a tide map. This script writes:
//   - site/public/contours.svg: one still tile of the map at time 0, the
//     site's fallback when JS is off or Reduce Motion is on.
//   - the wave recipe into site/public/site.js, between the FIELD markers,
//     which traces the live map on a canvas behind the page.
//   - the same recipe as src/theme/contours.ts, which the app's Backdrop
//     traces with react-native-svg.
// No packages needed.
import fs from 'fs';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname);
const T = 960; // tile size in SVG units
const N = 240; // grid cells across the tile
const PAD = 4; // grid cells traced beyond each edge, so lines run off the tile
const S = T / N;
const LEVELS = 18; // contour lines from the lowest point to the highest
const SEED = 3;
const LINE = 1.3; // stroke widths in tile units: ordinary lines
const INDEX = 2.2; // and every fourth (index) line
// How fast the waves turn, in radians a second. Slow enough that you notice
// the map has moved rather than watch it move.
const DRIFT = 0.03;

// A smooth height field that wraps at the tile's edges: a sum of waves whose
// frequencies are whole numbers of cycles per tile. Lower frequencies are
// stronger, so it reads as land rather than ripples.
let seed = SEED;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const waves = [];
for (let i = 0; i < 22; i++) {
  const kx = Math.floor(rnd() * 9) - 4;
  const ky = Math.floor(rnd() * 9) - 4;
  if (!kx && !ky) continue;
  waves.push({ kx, ky, a: 1 / Math.pow(Math.hypot(kx, ky), 1.7), p: rnd() * Math.PI * 2 });
}
// Each wave's speed, drawn after the shapes so the still tile doesn't change.
// Half turn one way, half the other, so the map churns in place rather than
// sliding off in one direction.
for (const w of waves) w.s = (rnd() < 0.5 ? -1 : 1) * DRIFT * (0.5 + rnd());
const W = N + 2 * PAD + 1;
const h = new Float64Array(W * W);
for (let j = 0; j < W; j++) {
  for (let i = 0; i < W; i++) {
    const x = (i - PAD) / N;
    const y = (j - PAD) / N;
    let v = 0;
    for (const w of waves) v += w.a * Math.sin(2 * Math.PI * (w.kx * x + w.ky * y) + w.p);
    h[j * W + i] = v;
  }
}
let lo = Infinity;
let hi = -Infinity;
for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }

// Marching squares for one level: a segment per crossed cell, then segments
// chained into lines by their shared edge points.
function trace(level) {
  const at = (i, j) => h[j * W + i];
  const key = (i, j, side) => `${i},${j},${side}`; // side: h = horizontal edge, v = vertical edge
  const point = new Map();
  const edge = (i, j, side) => {
    const k = key(i, j, side);
    if (!point.has(k)) {
      const a = at(i, j);
      const b = side === 'h' ? at(i + 1, j) : at(i, j + 1);
      const t = (level - a) / (b - a);
      point.set(k, side === 'h' ? [i + t, j] : [i, j + t]);
    }
    return k;
  };
  const links = new Map();
  const link = (a, b) => {
    (links.get(a) || links.set(a, []).get(a)).push(b);
    (links.get(b) || links.set(b, []).get(b)).push(a);
  };
  for (let j = 0; j < W - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const c = (at(i, j) > level) | ((at(i + 1, j) > level) << 1) | ((at(i + 1, j + 1) > level) << 2) | ((at(i, j + 1) > level) << 3);
      if (c === 0 || c === 15) continue;
      const top = () => edge(i, j, 'h');
      const bottom = () => edge(i, j + 1, 'h');
      const left = () => edge(i, j, 'v');
      const right = () => edge(i + 1, j, 'v');
      const pairs = {
        1: [[left, top]], 2: [[top, right]], 3: [[left, right]], 4: [[right, bottom]],
        5: [[left, top], [right, bottom]], 6: [[top, bottom]], 7: [[left, bottom]],
        8: [[bottom, left]], 9: [[top, bottom]], 10: [[top, right], [bottom, left]],
        11: [[right, bottom]], 12: [[right, left]], 13: [[top, right]], 14: [[left, top]],
      }[c];
      for (const [a, b] of pairs) link(a(), b());
    }
  }
  const seen = new Set();
  const lines = [];
  const walk = (start) => {
    const line = [start];
    seen.add(start);
    let cur = start;
    for (;;) {
      const next = (links.get(cur) || []).find((n) => !seen.has(n));
      if (!next) break;
      seen.add(next);
      line.push(next);
      cur = next;
    }
    return line;
  };
  // Open lines first (they start at a point with one neighbour), then loops.
  for (const [k, ns] of links) if (ns.length === 1 && !seen.has(k)) lines.push({ pts: walk(k), closed: false });
  for (const k of links.keys()) if (!seen.has(k)) lines.push({ pts: walk(k), closed: true });
  return lines.map(({ pts, closed }) => ({
    closed,
    pts: pts.map((k) => point.get(k)).map(([x, y]) => [(x - PAD) * S, (y - PAD) * S]),
  }));
}

// Douglas-Peucker: drop points that sit within `tol` of a straight run.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1;
    let dist = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > dist) { dist = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Smooth curves through the kept points: quadratic curves between midpoints.
const r = (n) => Math.round(n);
function toPath({ pts, closed }) {
  pts = simplify(pts, 0.6);
  if (pts.length < 3) return `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}`;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  if (closed) {
    const n = pts.length;
    let d = `M${mid(pts[n - 1], pts[0]).map(r).join(' ')}`;
    for (let i = 0; i < n; i++) {
      const m = mid(pts[i], pts[(i + 1) % n]);
      d += `Q${r(pts[i][0])} ${r(pts[i][1])} ${r(m[0])} ${r(m[1])}`;
    }
    return d + 'Z';
  }
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1]);
    d += `Q${r(pts[i][0])} ${r(pts[i][1])} ${r(m[0])} ${r(m[1])}`;
  }
  const last = pts[pts.length - 1];
  return d + `L${r(last[0])} ${r(last[1])}`;
}

// Every fourth line is an index contour, a little heavier, as on a real map.
const groups = [[], []];
for (let k = 0; k < LEVELS; k++) {
  const level = lo + ((hi - lo) * (k + 0.5)) / LEVELS;
  const d = trace(level).filter((l) => l.pts.length > 3).map(toPath).join('');
  groups[k % 4 === 3 ? 1 : 0].push(d);
}
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">` +
  `<g fill="none" stroke="#463219" stroke-linejoin="round" stroke-linecap="round">` +
  `<path stroke-width="${LINE}" d="${groups[0].join('')}"/>` +
  `<path stroke-width="${INDEX}" d="${groups[1].join('')}"/>` +
  `</g></svg>\n`;
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const field = {
  size: T,
  levels: LEVELS,
  lo: r4(lo),
  hi: r4(hi),
  lineWidth: LINE,
  indexWidth: INDEX,
  waves: waves.map(({ kx, ky, a, p, s: sp }) => [kx, ky, r4(a), r4(p), r4(sp)]),
};
const ts =
  `// Generated by site/scenes/contours.mjs. Don't edit by hand; run that instead.\n` +
  `// The contour map's recipe, the same one site/public/site.js traces on the site.\n\n` +
  `export const contours = {\n` +
  `  /** One tile of the map, in tile units. Waves repeat a whole number of times across it. */\n` +
  `  size: ${T},\n` +
  `  /** Contour lines from the lowest point to the highest; every fourth is an index line. */\n` +
  `  levels: ${LEVELS},\n` +
  `  lo: ${field.lo},\n` +
  `  hi: ${field.hi},\n` +
  `  /** Stroke widths in tile units. */\n` +
  `  lineWidth: ${LINE},\n` +
  `  indexWidth: ${INDEX},\n` +
  `  /** [cycles across the tile in x, in y, strength, phase, speed in radians a second] */\n` +
  `  waves: ${JSON.stringify(field.waves)} as [number, number, number, number, number][],\n` +
  `};\n`;
const svgOut = path.join(here, '../public/contours.svg');
const tsOut = path.join(here, '../../src/theme/contours.ts');
const jsOut = path.join(here, '../public/site.js');
const js = fs.readFileSync(jsOut, 'utf8').replace(
  /(\/\/ FIELD start[^\n]*\n)[\s\S]*?(\s*\/\/ FIELD end)/,
  `$1const FIELD = ${JSON.stringify(field)};$2`,
);
for (const [out, text] of [[svgOut, svg], [tsOut, ts], [jsOut, js]]) {
  fs.writeFileSync(out, text);
  console.log(`${path.relative(process.cwd(), out)}: ${(text.length / 1024).toFixed(1)} KB`);
}
