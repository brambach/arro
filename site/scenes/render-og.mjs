// Renders the social cards (1200 x 630, used for Open Graph and Twitter's
// summary_large_image) from the HTML in scenes/og/:
//   public/og/home.png  from og/home.html
//   public/og/join.png  from og/join.html
// With --icons it also writes the temporary favicon set from
// public/favicon.svg (favicon.ico, apple-touch-icon.png, icon-512.png).
// The icon pipeline (scripts/generate-icons.mjs) replaces those later.
//
// Run: NODE_PATH=<folder with playwright in node_modules> node site/scenes/render-og.mjs [--icons]
// See capture.mjs for installing Playwright outside the repo.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '..', 'public');
mkdirSync(join(pub, 'og'), { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const name of ['home', 'join']) {
    await page.goto(pathToFileURL(join(here, 'og', `${name}.html`)).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(pub, 'og', `${name}.png`), type: 'png' });
    console.log(`og/${name}.png`);
  }

  if (process.argv.includes('--icons')) {
    const svg = readFileSync(join(pub, 'favicon.svg'), 'utf8');
    const render = async (size, square) => {
      const p = await browser.newPage({ viewport: { width: size, height: size } });
      // Full bleed for the touch icons (iOS rounds the corners itself).
      const body = square ? svg.replace('rx="14"', 'rx="0"') : svg;
      await p.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${body}`);
      const png = await p.screenshot({ omitBackground: true, type: 'png' });
      await p.close();
      return png;
    };
    writeFileSync(join(pub, 'apple-touch-icon.png'), await render(180, true));
    writeFileSync(join(pub, 'icon-512.png'), await render(512, true));
    // An .ico holding 16, 32 and 48 px PNGs.
    const sizes = [16, 32, 48];
    const pngs = [];
    for (const s of sizes) pngs.push(await render(s, false));
    const header = Buffer.alloc(6 + 16 * sizes.length);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((s, i) => {
      const e = 6 + i * 16;
      header.writeUInt8(s, e);
      header.writeUInt8(s, e + 1);
      header.writeUInt8(0, e + 2);
      header.writeUInt8(0, e + 3);
      header.writeUInt16LE(1, e + 4);
      header.writeUInt16LE(32, e + 6);
      header.writeUInt32LE(pngs[i].length, e + 8);
      header.writeUInt32LE(offset, e + 12);
      offset += pngs[i].length;
    });
    writeFileSync(join(pub, 'favicon.ico'), Buffer.concat([header, ...pngs]));
    console.log('favicon.ico, apple-touch-icon.png, icon-512.png');
  }
} finally {
  await browser.close();
}
