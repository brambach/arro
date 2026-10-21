// A mock of how a join link unfurls in iMessage, built from the real page.
// It fetches /join/<code> from a running `npx wrangler dev`, reads the
// og:title, og:image and og:url the Worker served, and draws an
// iMessage-style conversation with that preview card. og:image points at
// https://saunafam.com, so the local file with the same path is used.
//
// Run: NODE_PATH=<folder with playwright> node site/scenes/link-preview.mjs
// Writes design/screenshots/saunafam/invite-link-preview.png

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const base = process.env.SITE_URL || 'http://localhost:8787';
const code = 'ABC23456';

const html = await (await fetch(`${base}/join/${code}`)).text();
const meta = (attr, key) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  if (!m) throw new Error(`missing ${key}`);
  return m[1].replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
};
const title = meta('property', 'og:title');
const image = meta('property', 'og:image');
const pageUrl = meta('property', 'og:url');
const card = meta('name', 'twitter:card');
const imagePath = new URL(image).pathname;
const img = readFileSync(join(here, '..', 'public', imagePath)).toString('base64');
const domain = new URL(pageUrl).hostname;
console.log({ title, image, pageUrl, card });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:390px;background:#fff;font-family:-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased;padding:0 0 24px}
.top{height:110px;border-bottom:.5px solid #d8d8dc;background:#f7f7f7;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:10px;gap:4px}
.top i{width:44px;height:44px;border-radius:50%;background:#5F8794;color:#fff;font:600 19px/44px -apple-system,system-ui,sans-serif;text-align:center;font-style:normal}
.top b{font:500 12px/14px -apple-system,system-ui,sans-serif;color:#111}
.stamp{text-align:center;font:500 11px/14px -apple-system,system-ui,sans-serif;color:#8e8e93;margin:16px 0 8px}
.row{display:flex;padding:2px 12px}
.in{justify-content:flex-start}.out{justify-content:flex-end}
.bubble{max-width:272px;padding:8px 13px;border-radius:19px;font-size:16px;line-height:21px}
.in .bubble{background:#E9E9EB;color:#000}
.out .bubble{background:#0B84FE;color:#fff}
.link{width:272px;border-radius:19px;overflow:hidden;background:#E9E9EB}
.link img{display:block;width:272px;height:${Math.round(272 * 630 / 1200)}px;object-fit:cover}
.link .meta{padding:9px 13px 10px}
.link .t{font:600 14px/18px -apple-system,system-ui,sans-serif;color:#000;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.link .d{font:400 13px/17px -apple-system,system-ui,sans-serif;color:#8e8e93;margin-top:2px}
.note{margin:14px 20px 0;font:400 11px/14px -apple-system,system-ui,sans-serif;color:#8e8e93;text-align:center}
</style></head><body>
<div class="top"><i>S</i><b>Sam</b></div>
<p class="stamp">iMessage<br>Today 6:42 PM</p>
<div class="row in"><div class="bubble">Sam invited you to Sunday sauna on Saunafam. We keep a weekly sauna streak together. Get Saunafam, tap 'I have an invite' and enter the code ${code}.</div></div>
<div class="row in"><div class="link"><img src="data:image/png;base64,${img}" alt=""><div class="meta"><p class="t">${esc(title)}</p><p class="d">${esc(domain)}</p></div></div></div>
<div class="row out"><div class="bubble">I'm in. Saving my spot on the bench</div></div>
<p class="note">Mock built from the live tags: og:title, og:image (${esc(imagePath)}), og:url and twitter:card ${esc(card)}, as served by the Worker for /join/${code}.</p>
</body></html>`;

const out = join(repo, 'design/screenshots/saunafam');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 600 }, deviceScaleFactor: 3 });
  await p.setContent(page, { waitUntil: 'load' });
  await p.screenshot({ path: join(out, 'invite-link-preview.png'), fullPage: true });
  console.log('design/screenshots/saunafam/invite-link-preview.png');
} finally {
  await browser.close();
}
