#!/usr/bin/env node
/**
 * Checks every text and background pair in src/theme/contrast.ts against WCAG
 * AA (4.5:1 for body text, 3:1 for large text: 18 pt and up, or 14 pt and up
 * at weight 600). Exits non-zero if any pair fails.
 *
 *   node scripts/check-contrast.mjs
 *
 * It reads the same TypeScript the app uses, compiled on the fly with the
 * project's own TypeScript.
 */
import { loadTheme } from './lib/load-theme.mjs';

const { contrast } = await loadTheme(['tokens', 'contrast']);

function parse(color) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\(([^)]+)\)$/.exec(color);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(',').map(Number);
    return { r, g, b, a };
  }
  throw new Error(`Can't read color ${color}`);
}

function over(fg, bg) {
  return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
}

function luminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const isLarge = (p) => p.size >= 18 || (p.size >= 14 && p.weight >= 600);

let failures = 0;
const rows = [];
for (const pair of contrast.textPairs) {
  const bg = parse(pair.bg);
  let fg = parse(pair.fg);
  if (fg.a < 1) fg = over(fg, parse(pair.over ?? pair.bg));
  const r = ratio(fg, bg);
  const large = isLarge(pair);
  const need = large ? 3 : 4.5;
  const ok = r >= need;
  if (!ok) failures++;
  rows.push({
    status: ok ? 'pass' : 'FAIL',
    ratio: r.toFixed(2),
    need: need.toFixed(1),
    text: `${pair.size}/${pair.weight}${large ? ' large' : ''}`,
    pair: `${pair.fg} on ${pair.bg}`,
    use: pair.use + (pair.rule ? `  [rule: ${pair.rule}]` : ''),
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('', 5), pad('ratio', 6), pad('need', 5), pad('text', 14), pad('pair', 46), 'use');
for (const r of rows) console.log(pad(r.status, 5), pad(r.ratio, 6), pad(r.need, 5), pad(r.text, 14), pad(r.pair, 46), r.use);
console.log();
if (failures) {
  console.log(`${failures} pair(s) fail WCAG AA.`);
  process.exit(1);
}
console.log(`All ${rows.length} pairs meet WCAG AA.`);
