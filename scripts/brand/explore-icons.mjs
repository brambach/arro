#!/usr/bin/env node
/**
 * Renders the icon candidates side by side at 1024, 180, 60, 29 and 16 px, on
 * light and dark wallpapers, to design/brand/icon-explorations.png.
 *
 *   node scripts/brand/explore-icons.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { candidates as earlier, icon } from './icon-art.mjs';
import { stoneIcon } from './stone-icon.mjs';
import { repoRoot } from '../lib/load-theme.mjs';
import { fontFiles, png, rounded } from './render-lib.mjs';

const SIZES = [180, 60, 29, 16];

// A to D are the first round (icon-art.mjs; D was the first pick). E is the
// refinement after review (stone-icon.mjs), now the pick.
const candidates = [
  ...earlier.map((c) => ({ ...c, svg: (s) => icon({ ...c.opts, detail: s && s <= 40 ? 'small' : 'full' }) })),
  {
    id: 'E',
    label: 'E. River stone on a bench (pick)',
    svg: (s) => stoneIcon({ detail: !s || s > 60 ? 'full' : s > 20 ? 'small' : 'tiny' }),
  },
];
const COL = 360;
const ROW_H = 300;
const width = 260 + COL * candidates.length;
const height = 140 + ROW_H * 2 + 300 + 320;

const parts = [];
parts.push(`<rect width="${width}" height="${height}" fill="#E9E3DA"/>`);
parts.push(`<text x="40" y="70" font-family="Fraunces Soft" font-weight="600" font-size="40" fill="#221F1C">Icon explorations</text>`);
parts.push(
  `<text x="40" y="104" font-family="Helvetica Neue" font-size="18" fill="#55504A">Each candidate at 180, 60, 29 and 16 px (actual pixels), on a light and a dark wallpaper. Big previews below at 240.</text>`,
);

candidates.forEach((c, i) => {
  const x0 = 260 + i * COL;
  parts.push(`<text x="${x0}" y="160" font-family="Helvetica Neue" font-weight="bold" font-size="20" fill="#221F1C">${c.label}</text>`);
  [false, true].forEach((darkWall, r) => {
    const y0 = 190 + r * ROW_H;
    parts.push(`<rect x="${x0 - 20}" y="${y0 - 10}" width="${COL - 20}" height="${ROW_H - 30}" rx="18" fill="${darkWall ? '#2B2B30' : '#F2F1EE'}"/>`);
    let x = x0;
    for (const s of SIZES) {
      const img = png(c.svg(s), s);
      parts.push(rounded(img, x, y0 + 200 - s, s));
      x += s + 14;
    }
  });
  const big = png(c.svg(), 240);
  parts.push(rounded(big, x0 + 30, 190 + ROW_H * 2 + 6, 240));
});
// The favicon variant of the pick: no wisps, a bigger stone, bolder heat.
const fy = 190 + ROW_H * 2 + 300;
parts.push(`<text x="40" y="${fy + 30}" font-family="Helvetica Neue" font-weight="bold" font-size="20" fill="#221F1C">Favicon (from E): no wisps, the stone at 77% of the tile</text>`);
let fx = 260;
for (const s of [16, 32, 48, 180]) {
  for (const darkWall of [false, true]) {
    parts.push(`<rect x="${fx - 10}" y="${fy + 50}" width="${s + 20}" height="${Math.max(s, 48) + 20}" rx="8" fill="${darkWall ? '#2B2B30' : '#FFFFFF'}"/>`);
    parts.push(rounded(png(stoneIcon({ detail: 'tiny' }), s), fx, fy + 60, s, 0.2));
    fx += s + 40;
  }
}
parts.push(`<text x="40" y="250" font-family="Helvetica Neue" font-size="18" fill="#55504A">Light wallpaper</text>`);
parts.push(`<text x="40" y="${250 + ROW_H}" font-family="Helvetica Neue" font-size="18" fill="#55504A">Dark wallpaper</text>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">${parts.join('')}</svg>`;
const out = join(repoRoot, 'design/brand/icon-explorations.png');
mkdirSync(join(repoRoot, 'design/brand'), { recursive: true });
writeFileSync(out, new Resvg(svg, { font: { fontFiles, loadSystemFonts: true } }).render().asPng());
console.log('wrote design/brand/icon-explorations.png');
