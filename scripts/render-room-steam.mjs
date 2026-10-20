#!/usr/bin/env node
/**
 * The timer room's steam, blurred, as transparent PNGs:
 * - assets/timer/room-steam.png: the mockup's three slow paths over the floor;
 * - assets/timer/loyly-wisp.png: one soft wisp that Throw löyly sends up.
 * The room's paths are the mockup's (spec/mockups/src/A/timer.html). They're
 * drawn here once: a full-screen SVG blur on the phone took about 600 ms to
 * draw the first time, which held up the door.
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

// One wisp: an S curve rising from a broad base, fading to nothing at the top.
const wisp = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="560" viewBox="0 0 160 560" fill="none">
 <defs>
  <linearGradient id="fade" x1="0" y1="560" x2="0" y2="0" gradientUnits="userSpaceOnUse">
   <stop offset="0" stop-color="${STEAM}" stop-opacity="0.55"/>
   <stop offset="0.45" stop-color="${STEAM}" stop-opacity="0.35"/>
   <stop offset="1" stop-color="${STEAM}" stop-opacity="0"/>
  </linearGradient>
  <filter id="soft" x="-60%" y="-10%" width="220%" height="120%"><feGaussianBlur stdDeviation="9"/></filter>
 </defs>
 <path d="M80 540c-34-70 34-120 2-200s-36-120 -4-200 30-80 6-120" stroke="url(#fade)" stroke-width="30" stroke-linecap="round" filter="url(#soft)"/>
</svg>`;
const wispPng = new Resvg(wisp, { fitTo: { mode: 'width', value: 240 } }).render().asPng();
writeFileSync(join(dir, 'loyly-wisp.png'), wispPng);
console.log('assets/timer/loyly-wisp.png', wispPng.length, 'bytes');
