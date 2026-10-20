// Proof captures for the site, against a running `npx wrangler dev`.
//   cd site && npx wrangler dev --local-upstream localhost:8787
//   NODE_PATH=<folder with playwright in node_modules> node site/scenes/capture.mjs [shots|video|all]
// Playwright isn't in the app's package.json. Install it anywhere outside
// the repo (npm i --prefix /tmp/pw playwright) and point NODE_PATH there;
// `npx playwright install chromium` fetches the browser.
//
// Writes, from the repo root:
//   design/screenshots/saunafam/site/home-<width>.png   (full page)
//   design/screenshots/saunafam/site/join-390.png
//   design/recordings/saunafam/site-first-load.mp4      (needs ffmpeg)

import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = process.env.SITE_URL || 'http://localhost:8787';
const shotsDir = join(repo, 'design/screenshots/saunafam/site');
const recDir = join(repo, 'design/recordings/saunafam');
const what = process.argv[2] || 'all';

// Scroll the whole page once so scroll-triggered moments have played, then
// come back to the top and let them finish.
async function settleWholePage(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(1800);
}

async function shots(browser) {
  mkdirSync(shotsDir, { recursive: true });
  for (const width of [360, 390, 768, 1280, 1920]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, deviceScaleFactor: width < 768 ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await settleWholePage(page);
    await page.screenshot({ path: join(shotsDir, `home-${width}.png`), fullPage: true });
    await ctx.close();
    console.log(`home-${width}.png`);
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}/join/ABC23456`, { waitUntil: 'networkidle' });
  await settleWholePage(page);
  await page.screenshot({ path: join(shotsDir, 'join-390.png'), fullPage: true });
  await ctx.close();
  console.log('join-390.png');
}

async function video(browser) {
  mkdirSync(recDir, { recursive: true });
  const tmp = join(recDir, '.tmp-video');
  rmSync(tmp, { recursive: true, force: true });
  const size = { width: 1280, height: 800 };
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: tmp, size } });
  const page = await ctx.newPage();
  // A cold load: nothing cached. Hold on the settled page, then scroll to
  // the wall so its one landing is in the clip too.
  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  await page.evaluate(() => document.querySelector('.wall')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(2600);
  await ctx.close();
  const raw = join(tmp, readdirSync(tmp).find((f) => f.endsWith('.webm')));
  const out = join(recDir, 'site-first-load.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'fps=30,scale=1280:-2', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
  rmSync(tmp, { recursive: true, force: true });
  console.log('site-first-load.mp4');
}

const browser = await chromium.launch();
try {
  if (what === 'shots' || what === 'all') await shots(browser);
  if (what === 'video' || what === 'all') await video(browser);
} finally {
  await browser.close();
}
