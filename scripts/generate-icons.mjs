/**
 * Generates the Arro app icons from the final production mark (lowercase-"a"
 * route mark, Arro Brand & Logo handoff) on the flat Arro-orange tile.
 *
 * sharp is only needed to rasterize and is NOT a project dependency. Run with:
 *   npm install --no-save sharp && node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const ORANGE = '#F26A1B';

/** The mark in a 120 viewBox, scaled+centered into an N canvas at `frac` of the canvas. */
function mark(N, frac, color) {
  const S = (frac * N) / 120;
  const T = (N - 120 * S) / 2;
  return (
    `<g transform="translate(${T} ${T}) scale(${S})">` +
    `<circle cx="53" cy="59" r="25.5" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/>` +
    `<path d="M78.5 35 V78 Q78.5 86 88 84.5" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`
  );
}

function svg(N, { bg, markColor, frac }) {
  const rect = bg ? `<rect width="${N}" height="${N}" fill="${bg}"/>` : '';
  const m = markColor ? mark(N, frac, markColor) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="0 0 ${N} ${N}">${rect}${m}</svg>`;
}

const targets = [
  { file: 'icon.png', n: 1024, opts: { bg: ORANGE, markColor: '#fff', frac: 0.587 } },
  { file: 'android-icon-background.png', n: 1024, opts: { bg: ORANGE } },
  { file: 'android-icon-foreground.png', n: 1024, opts: { markColor: '#fff', frac: 0.46 } },
  { file: 'android-icon-monochrome.png', n: 1024, opts: { markColor: '#000', frac: 0.46 } },
  { file: 'favicon.png', n: 48, opts: { bg: ORANGE, markColor: '#fff', frac: 0.6 } },
  { file: 'splash-icon.png', n: 1024, opts: { bg: ORANGE, markColor: '#fff', frac: 0.55 } },
];

for (const { file, n, opts } of targets) {
  let img = sharp(Buffer.from(svg(n, opts)));
  if (opts.bg) img = img.flatten({ background: ORANGE });
  await img.png().toFile(join(assets, file));
  console.log('wrote', file, `(${n}x${n})`);
}
console.log('done');
