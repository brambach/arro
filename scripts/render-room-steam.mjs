#!/usr/bin/env node
/**
 * The timer room's three slow steam paths, blurred, as a transparent PNG
 * (assets/timer/room-steam.png). They're the mockup's paths
 * (spec/mockups/src/A/timer.html), drawn here once: a full-screen SVG blur on
 * the phone took about 600 ms to draw the first time, which held up the door.
 *
 *   node scripts/render-room-steam.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { repoRoot } from './lib/load-theme.mjs';

// The steam color is the palette's steam (#F8F4EE); see src/theme/tokens.ts.
const STEAM = '#F8F4EE';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="956" viewBox="0 0 440 956" fill="none">
 <defs><filter id="b" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>
 <g filter="url(#b)" stroke="${STEAM}" stroke-linecap="round">
  <path d="M150 956c-18-60 26-92 6-150s-30-80-6-130" stroke-width="7" stroke-opacity=".07"/>
  <path d="M292 956c20-50-22-86-2-136s28-70 8-118" stroke-width="9" stroke-opacity=".06"/>
  <path d="M222 956c-12-40 18-70 4-110" stroke-width="5" stroke-opacity=".08"/>
 </g></svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 660 } }).render().asPng();
const dir = join(repoRoot, 'assets/timer');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'room-steam.png'), png);
console.log('assets/timer/room-steam.png', png.length, 'bytes');
