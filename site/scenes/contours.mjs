// Draws the contour map behind every page of arrofamily.com and every paper
// screen of the app: faint topographic lines, like the map of a walk.
// The tile repeats without a seam, so the lines carry on across any page size.
//
//   node site/scenes/contours.mjs
//
// The map moves a little: the land is drawn at FRAMES moments a short way
// apart, and the site and the app fade from one to the next and back, so the
// lines seem to slowly shift. Writes site/public/contours-0.svg and onwards
// (the site tiles them in CSS) and the same paths as src/theme/contours.ts
// (the app draws them with react-native-svg in src/components/Backdrop.tsx).
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
const FRAMES = 8; // moments drawn
const STEP = 0.03; // how far each wave travels between moments, in cycles

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
// Each wave drifts at its own speed, so the land changes shape over time
// rather than sliding. The speeds come from a second seed, so the first
// moment is the same map as before the lines moved.
let seed2 = SEED + 1000;
const rnd2 = () => (seed2 = (seed2 * 16807) % 2147483647) / 2147483647;
for (const w of waves) w.speed = rnd2() * 2 - 1;

const W = N + 2 * PAD + 1;
const fields = [];
for (let f = 0; f < FRAMES; f++) {
  const h = new Float64Array(W * W);
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const x = (i - PAD) / N;
      const y = (j - PAD) / N;
      let v = 0;
      for (const w of waves) v += w.a * Math.sin(2 * Math.PI * (w.kx * x + w.ky * y + w.speed * STEP * f) + w.p);
      h[j * W + i] = v;
    }
  }
  fields.push(h);
}
// One set of levels for every moment, so a line keeps its height as it moves.
let lo = Infinity;
let hi = -Infinity;
for (const v of fields[0]) { lo = Math.min(lo, v); hi = Math.max(hi, v); }

// Marching squares for one level: a segment per crossed cell, then segments
// chained into lines by their shared edge points.
function trace(h, level) {
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
const frames = fields.map((h) => {
  const groups = [[], []];
  for (let k = 0; k < LEVELS; k++) {
    const level = lo + ((hi - lo) * (k + 0.5)) / LEVELS;
    const d = trace(h, level).filter((l) => l.pts.length > 3).map(toPath).join('');
    groups[k % 4 === 3 ? 1 : 0].push(d);
  }
  return { lines: groups[0].join(''), index: groups[1].join('') };
});

const outputs = frames.map(({ lines, index }, f) => [
  `../public/contours-${f}.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">` +
    `<g fill="none" stroke="#463219" stroke-linejoin="round" stroke-linecap="round">` +
    `<path stroke-width="${LINE}" d="${lines}"/>` +
    `<path stroke-width="${INDEX}" d="${index}"/>` +
    `</g></svg>\n`,
]);
outputs.push([
  '../../src/theme/contours.ts',
  `// Generated by site/scenes/contours.mjs. Don't edit by hand; run that instead.\n` +
    `// The contour map tile at each moment, the same as site/public/contours-*.svg.\n\n` +
    `export const contours = {\n` +
    `  size: ${T},\n` +
    `  lineWidth: ${LINE},\n` +
    `  indexWidth: ${INDEX},\n` +
    `  /** Each moment: ordinary lines (lineWidth) and every fourth, index, line (indexWidth). */\n` +
    `  frames: [\n` +
    frames.map(({ lines, index }) => `    {\n      lines: '${lines}',\n      index: '${index}',\n    },\n`).join('') +
    `  ],\n` +
    `} as const;\n`,
]);
for (const [rel, text] of outputs) {
  const out = path.join(here, rel);
  fs.writeFileSync(out, text);
  console.log(`${path.relative(process.cwd(), out)}: ${(text.length / 1024).toFixed(1)} KB`);
}
