// Draws the site's material art as static SVG files in public/art/.
// Run after changing it: node site/scenes/art.mjs
//
// The same procedural helpers as the approved Löyly mockups
// (spec/mockups/src/common.js): a seeded random, wavy wood grain with an
// occasional knot, the faint vertical slat wall, the frost stipple on a
// frozen slat, and the timer's arc of ember dots. Seeded, so every run
// writes the same files.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'art');
mkdirSync(out, { recursive: true });

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const f = (n) => Number(n.toFixed(1));
const svg = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>${body}</svg>\n`;

// Wavy grain lines across w x h, with a knot now and then.
function grain(w, h, color, op, seed, lines = 4, knot = true) {
  const r = rng(seed);
  let p = '';
  for (let i = 0; i < lines; i++) {
    let y = ((i + 0.5 + (r() - 0.5) * 0.6) * h) / lines;
    let d = `M-4 ${f(y)}`;
    const segs = 4 + Math.floor(r() * 3);
    for (let s = 1; s <= segs; s++) {
      const x = (w * s) / segs + 4;
      const yy = y + (r() - 0.5) * h * 0.18;
      const cx = x - w / segs / 2;
      const cy = y + (r() - 0.5) * h * 0.3;
      d += ` Q${f(cx)} ${f(cy)} ${f(x)} ${f(yy)}`;
      y = yy;
    }
    p += `<path d="${d}" stroke="${color}" stroke-opacity="${(op * (0.5 + r() * 0.7)).toFixed(3)}" stroke-width="${(0.5 + r() * 0.7).toFixed(2)}" fill="none"/>`;
  }
  if (knot && r() > 0.35) {
    const kx = w * (0.2 + r() * 0.6);
    const ky = h * (0.35 + r() * 0.3);
    p += `<ellipse cx="${f(kx)}" cy="${f(ky)}" rx="${f(4 + r() * 5)}" ry="${f(1.4 + r() * 1.2)}" stroke="${color}" stroke-opacity="${(op * 1.2).toFixed(3)}" stroke-width="0.7" fill="none"/>`;
  }
  return p;
}

const files = {};

// The wall behind every page: 1 px lines every 28 px or so, slightly
// uneven. A 560 x 8 tile, repeated in both directions by styles.css.
{
  const r = rng(7);
  let x = 10 + r() * 10;
  let p = '';
  while (x < 556) {
    p += `<rect x="${f(x)}" y="0" width="1" height="8" fill="#B9A584" fill-opacity="0.13"/>`;
    x += 28 + (r() - 0.5) * 7;
  }
  files['wall.svg'] = svg(560, 8, p);
}

// The same wall for the dark heat room, in steam at 3.5%.
{
  const r = rng(3);
  let x = 10 + r() * 10;
  let p = '';
  while (x < 556) {
    p += `<rect x="${f(x)}" y="0" width="1" height="8" fill="#F8F4EE" fill-opacity="0.04"/>`;
    x += 28 + (r() - 0.5) * 7;
  }
  files['wall-dark.svg'] = svg(560, 8, p);
}

// Grain for kept (ember) slats: four variants so the wall doesn't repeat.
for (let i = 0; i < 4; i++) {
  files[`grain-kept-${i}.svg`] = svg(400, 24, grain(400, 24, '#FFD9B5', 0.32, 40 + i * 3), ' preserveAspectRatio="none"');
}
// Grain for aspen slats (empty and the current week).
files['grain-aspen.svg'] = svg(400, 24, grain(400, 24, '#9C7B52', 0.35, 11), ' preserveAspectRatio="none"');

// A frozen slat: lake grain plus a white frost stipple.
{
  const r = rng(99);
  let p = grain(400, 24, '#E8F4F8', 0.25, 52, 4, false);
  for (let k = 0; k < 120; k++) {
    p += `<circle cx="${f(r() * 400)}" cy="${f(r() * 24)}" r="${(0.4 + r() * 0.7).toFixed(2)}" fill="#fff" fill-opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`;
  }
  files['frost.svg'] = svg(400, 24, p, ' preserveAspectRatio="none"');
}

// The timer's arc of ember dots at 14:32 of a 15 minute target.
{
  const n = 61;
  const frac = (14 + 32 / 60) / 15;
  const cx = 220;
  const cy = 220;
  const R = 176;
  let g =
    '<defs><radialGradient id="e" cx="40%" cy="35%"><stop offset="0" stop-color="#FFC48A"/><stop offset=".5" stop-color="#E56A33"/><stop offset="1" stop-color="#9E3B1B"/></radialGradient>' +
    '<filter id="gl" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="2.4"/></filter></defs>';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = ((-150 + 300 * t) * Math.PI) / 180;
    const x = f(cx + R * Math.sin(a));
    const y = f(cy - R * Math.cos(a));
    const r = i % 20 === 0 ? 4.2 : 2.6;
    if (t <= frac + 1e-6) {
      g += `<circle cx="${x}" cy="${y}" r="${f(r + 2.2)}" fill="#F2A35E" opacity=".45" filter="url(#gl)"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#e)"/>`;
    } else {
      g += `<circle cx="${x}" cy="${y}" r="${f(r - 0.4)}" fill="#F8F4EE" opacity=".2"/>`;
    }
  }
  files['arc.svg'] = svg(440, 440, g);
}

for (const [name, body] of Object.entries(files)) {
  writeFileSync(join(out, name), body);
}
console.log(`wrote ${Object.keys(files).length} files to public/art/`);
