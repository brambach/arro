#!/usr/bin/env node
/**
 * The warm haze that drifts behind every light screen (Backdrop), as one
 * transparent PNG: assets/backdrop/haze.png.
 *
 * It was two SVG radial gradients drawn by react-native-svg on the main thread
 * each time a screen mounted, over an area larger than the screen. The M16
 * self-review measured that at about 30 ms of the first frames of every stack
 * push. An image is decoded once and cached, so pushes no longer pay for it.
 *
 * Every position and radius is a share of the box, so the image stretched to
 * any box draws the same haze. The colors and opacities come from the theme
 * (palette.glow and haze.warm, palette.steam and haze.light), with the same
 * smooth (1 - t)^2 falloff as SoftEllipse's smoothStops.
 *
 *   node scripts/render-backdrop-haze.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { loadTheme, repoRoot } from './lib/load-theme.mjs';

const { tokens } = await loadTheme(['tokens']);
const { palette, haze } = tokens;

// Any box works (see above); this one is the mockup's 440 x 956 plus the drift's padding.
const W = 536;
const H = 1052;

/** SoftEllipse's smoothStops: opacity follows (1 - t)^2, sampled finely, out to `reach`. */
function stops(color, peak, reach) {
  const n = 10;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return `<stop offset="${(t * reach).toFixed(3)}" stop-color="${color}" stop-opacity="${(peak * (1 - t) * (1 - t)).toFixed(4)}"/>`;
  }).join('');
}

/** Backdrop's HazeArt: warm light from the upper right, a pale pool on the left. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
 <defs>
  <radialGradient id="warm" cx="0.5" cy="0.5" r="0.5">${stops(palette.glow, haze.warm, 0.7)}</radialGradient>
  <radialGradient id="light" cx="0.5" cy="0.5" r="0.5">${stops(palette.steam, haze.light, 0.7)}</radialGradient>
 </defs>
 <ellipse cx="${W * 0.85}" cy="${H * 0.06}" rx="${W * 0.7}" ry="${H * 0.38}" fill="url(#warm)"/>
 <ellipse cx="0" cy="${H * 0.6}" rx="${W * 0.6}" ry="${H * 0.3}" fill="url(#light)"/>
</svg>`;

// Half the box's points is plenty for a haze this soft; the phone stretches it smoothly.
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W / 2 } }).render().asPng();
const dir = join(repoRoot, 'assets/backdrop');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'haze.png'), png);
console.log('assets/backdrop/haze.png', png.length, 'bytes');
