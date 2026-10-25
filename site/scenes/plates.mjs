// Renders the grayscale scene sources in scenes/plates/*.svg and dithers them
// to 1-bit palette PNGs in public/art/ (ink on transparent paper), then writes a
// review contact sheet (each output on its paper at 1x and 2x) outside the repo.
// Fails if a plate is over 25,000 bytes.
//
// Run: NODE_PATH=<folder with playwright in node_modules> node site/scenes/plates.mjs [--sheet out.png]
// Needs python3 with Pillow for scenes/dither.py.

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const sources = join(here, 'plates');
const art = join(here, '..', 'public', 'art');
const sheetFlag = process.argv.indexOf('--sheet');
const sheet = sheetFlag > 0 ? process.argv[sheetFlag + 1] : join(tmpdir(), 'plates-sheet.png');
const maxPlateBytes = 25_000;

const birch = '#EFE6D8';
const char = '#221F1C';
const cedar = '#7A4E2E';

const settings = {
  'plate-1': { algo: 'atkinson', ink: cedar, paper: birch },
  'plate-2': { algo: 'atkinson', ink: birch, paper: char, invert: true },
  'steam-1': { algo: 'bayer4', ink: cedar, paper: birch },
  'steam-2': { algo: 'bayer4', ink: cedar, paper: birch },
  'steam-3': { algo: 'bayer4', ink: cedar, paper: birch },
};

const names = readdirSync(sources).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
const unknown = names.filter((n) => !settings[n]);
if (unknown.length) throw new Error(`no settings in plates.mjs for ${unknown.join(', ')}`);

const size = (svg) => {
  const w = svg.match(/<svg[^>]*\swidth="(\d+)"/)?.[1];
  const h = svg.match(/<svg[^>]*\sheight="(\d+)"/)?.[1];
  if (!w || !h) throw new Error('source svg needs integer width and height attributes');
  return { width: Number(w), height: Number(h) };
};

const tmp = mkdtempSync(join(tmpdir(), 'plates-'));
mkdirSync(art, { recursive: true });
mkdirSync(dirname(sheet), { recursive: true });

const browser = await chromium.launch();
const outputs = [];
try {
  for (const name of names) {
    const svg = readFileSync(join(sources, `${name}.svg`), 'utf8');
    const { width, height } = size(svg);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>html,body{margin:0;background:#fff}svg{display:block;filter:grayscale(1)}</style>${svg}`,
    );
    const gray = join(tmp, `${name}.png`);
    await page.screenshot({ path: gray, type: 'png' });
    await page.close();

    const s = settings[name];
    const out = join(art, `${name}.png`);
    const args = [join(here, 'dither.py'), '--algo', s.algo, '--ink', s.ink, '--paper', s.paper];
    if (s.invert) args.push('--invert');
    execFileSync('python3', [...args, gray, out], { stdio: ['ignore', 'ignore', 'inherit'] });

    const bytes = statSync(out).size;
    console.log(`art/${name}.png ${width}x${height} ${bytes.toLocaleString('en-US')} bytes`);
    outputs.push({ name, width, height, bytes, paper: s.paper, data: readFileSync(out).toString('base64') });
  }

  const cells = outputs
    .map(
      (o) => `<figure style="background:${o.paper}">
        <img src="data:image/png;base64,${o.data}" width="${o.width}" height="${o.height}">
        <img src="data:image/png;base64,${o.data}" width="${o.width * 2}" height="${o.height * 2}">
        <figcaption>${o.name} ${o.width}x${o.height} ${o.bytes} bytes, 1x and 2x</figcaption>
      </figure>`,
    )
    .join('');
  const page = await browser.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>
    body{margin:0;background:#888;font:12px monospace;display:flex;flex-wrap:wrap;gap:8px;padding:8px;align-items:flex-start}
    figure{margin:0;padding:24px;display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
    figcaption{width:100%;color:#888}
    img{image-rendering:pixelated;display:block}
  </style>${cells}`);
  await page.screenshot({ path: sheet, type: 'png', fullPage: true });
  await page.close();
  console.log(sheet);
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}

const heavy = outputs.filter((o) => o.name.startsWith('plate-') && o.bytes > maxPlateBytes);
if (heavy.length) {
  console.error(`over ${maxPlateBytes} bytes: ${heavy.map((o) => `${o.name} (${o.bytes})`).join(', ')}`);
  process.exit(1);
}
