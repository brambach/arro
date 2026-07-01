/**
 * Generates the Arro app icons from the brand mark (the "A" running trail with
 * three footfall dots) + the orange gradient, so all launcher/splash art is on-brand.
 *
 * sharp is only needed to rasterize and is NOT a project dependency. Run with:
 *   npm install --no-save sharp && node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

/** Build a square SVG: optional orange-gradient fill + optional centered white/dark mark. */
function svg(N, { bg = 'none', mark = true, markColor = '#fff', frac = 0.6 } = {}) {
  const S = (frac * N) / 48; // scale the 48-unit mark viewBox
  const T = (N * (1 - frac)) / 2; // center it
  const defs = `<defs><linearGradient id="g" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="#FF9E52"/><stop offset="1" stop-color="#EE7B3A"/></linearGradient></defs>`;
  const rect = bg === 'gradient' ? `<rect width="${N}" height="${N}" fill="url(#g)"/>` : '';
  const markG = mark
    ? `<g transform="translate(${T} ${T}) scale(${S})">` +
      `<path d="M11.5 38.5 L24 10.5 L36.5 38.5" stroke="${markColor}" stroke-width="4.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/>` +
      `<circle cx="17.6" cy="28.5" r="3" fill="${markColor}"/>` +
      `<circle cx="24" cy="28.5" r="3" fill="${markColor}"/>` +
      `<circle cx="30.4" cy="28.5" r="3" fill="${markColor}"/>` +
      `</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}">${defs}${rect}${markG}</svg>`;
}

const targets = [
  // iOS + general master: full-bleed gradient, white mark (OS masks the corners)
  { file: 'icon.png', n: 1024, opts: { bg: 'gradient', markColor: '#fff', frac: 0.6 } },
  // Android adaptive: gradient background layer + white mark foreground within the safe zone
  { file: 'android-icon-background.png', n: 1024, opts: { bg: 'gradient', mark: false } },
  { file: 'android-icon-foreground.png', n: 1024, opts: { bg: 'none', markColor: '#fff', frac: 0.44 } },
  { file: 'android-icon-monochrome.png', n: 1024, opts: { bg: 'none', markColor: '#000', frac: 0.44 } },
  // Web + splash
  { file: 'favicon.png', n: 48, opts: { bg: 'gradient', markColor: '#fff', frac: 0.62 } },
  { file: 'splash-icon.png', n: 1024, opts: { bg: 'gradient', markColor: '#fff', frac: 0.55 } },
];

for (const { file, n, opts } of targets) {
  const out = join(assets, file);
  let img = sharp(Buffer.from(svg(n, opts)));
  // Opaque, alpha-free PNGs for the launcher/splash/web icons; transparency is
  // only kept for the Android foreground/monochrome layers.
  if (opts.bg === 'gradient') img = img.flatten({ background: '#EE7B3A' });
  await img.png().toFile(out);
  console.log('wrote', file, `(${n}x${n})`);
}
console.log('done');
