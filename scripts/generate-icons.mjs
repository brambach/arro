#!/usr/bin/env node
/**
 * Renders every icon Saunafam ships from the SVG masters in assets/brand/
 * (written by scripts/brand/build-icon-masters.mjs). Deterministic, and safe
 * to run from scratch: `rm -rf assets/brand/out && node scripts/generate-icons.mjs`.
 *
 * Writes:
 * - assets/brand/out/icon-1024.png, icon-dark-1024.png, icon-tinted-1024.png
 * - assets/brand/out/ios/icon-<size>.png for every legacy iOS size
 *   (21 to 60 px from icon-small.svg, 20 px and under from icon-tiny.svg)
 * - assets/brand/out/web/: favicon.ico (16, 32, 48), favicon.svg, favicon.png
 *   (48), apple-touch-icon.png (180), icon-96.png, icon-512.png. The .ico,
 *   .svg, apple-touch-icon and icon-512 are copied to site/public/ too
 * - assets/brand/out/android/: the adaptive layers (foreground, background,
 *   monochrome) at 1024
 * - assets/brand/out/splash-transparent.png, the native splash's (empty) image
 * - assets/icon.png, assets/splash-icon.png, assets/favicon.png and
 *   assets/android-icon-*.png, the paths app.json points at
 *
 * Opaque icons are written as RGB PNGs with no alpha channel (App Store
 * Connect rejects an app icon with one). The tinted icon and the Android
 * foreground and monochrome layers keep their transparency.
 *
 *   node scripts/generate-icons.mjs
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';
import { repoRoot } from './lib/load-theme.mjs';

const brand = join(repoRoot, 'assets/brand');
const out = join(brand, 'out');
const master = (name) => readFileSync(join(brand, name), 'utf8');

const IOS_SIZES = [180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20];
const SMALL = 60;
const TINY = 20;

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render();
}

/** A PNG with transparency, straight from resvg. */
function rgba(svg, size) {
  return render(svg, size).asPng();
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** An opaque PNG (color type 2, no alpha), for icons that must not carry one. */
function rgb(svg, size) {
  const img = render(svg, size);
  const { width, height } = img;
  const px = img.pixels; // RGBA, premultiplied is irrelevant here: the masters are opaque
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = y * (width * 3 + 1) + 1 + x * 3;
      if (px[s + 3] !== 255) throw new Error(`An opaque icon has a see-through pixel at ${x},${y} (${size}px)`);
      raw[d] = px[s];
      raw[d + 1] = px[s + 1];
      raw[d + 2] = px[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(path, data) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, data);
  console.log('wrote', path.slice(repoRoot.length + 1));
}

const icon = master('icon.svg');
const iconSmall = master('icon-small.svg');
const iconTiny = master('icon-tiny.svg');
const iconDark = master('icon-dark.svg');
const iconTinted = master('icon-tinted.svg');
const favicon = master('favicon.svg');

// 1024 masters for iOS light, dark and tinted.
write(join(out, 'icon-1024.png'), rgb(icon, 1024));
write(join(out, 'icon-dark-1024.png'), rgb(iconDark, 1024));
write(join(out, 'icon-tinted-1024.png'), rgba(iconTinted, 1024));

// Every legacy iOS size.
for (const s of IOS_SIZES) write(join(out, 'ios', `icon-${s}.png`), rgb(s <= TINY ? iconTiny : s <= SMALL ? iconSmall : icon, s));

// Web.
const web = join(out, 'web');
const ico = await pngToIco([rgba(favicon, 16), rgba(favicon, 32), rgba(favicon, 48)]);
write(join(web, 'favicon.ico'), ico);
write(join(web, 'favicon.svg'), favicon);
write(join(web, 'favicon.png'), rgba(favicon, 48));
write(join(web, 'apple-touch-icon.png'), rgb(icon, 180));
write(join(web, 'icon-96.png'), rgba(iconSmall, 96));
write(join(web, 'icon-512.png'), rgb(icon, 512));

// Android adaptive layers.
const android = join(out, 'android');
write(join(android, 'foreground.png'), rgba(master('android-foreground.svg'), 1024));
write(join(android, 'background.png'), rgb(master('android-background.svg'), 1024));
write(join(android, 'monochrome.png'), rgba(master('android-monochrome.svg'), 1024));

// The paths app.json reads.
const assets = join(repoRoot, 'assets');
copyFileSync(join(out, 'icon-1024.png'), join(assets, 'icon.png'));
copyFileSync(join(android, 'foreground.png'), join(assets, 'android-icon-foreground.png'));
copyFileSync(join(android, 'background.png'), join(assets, 'android-icon-background.png'));
copyFileSync(join(android, 'monochrome.png'), join(assets, 'android-icon-monochrome.png'));
copyFileSync(join(web, 'favicon.png'), join(assets, 'favicon.png'));
// The native splash image: fully transparent, on purpose. The native splash
// must equal the JS splash's first frame, which is plain birch (the mark draws
// in after). expo-splash-screen needs an image to apply the background color;
// without one its storyboard falls back to the system white.
write(join(out, 'splash-transparent.png'), rgba('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>', 64));
// The splash mark: the stone and its heat on transparent, for anything that
// shows a centered splash image (the app's native splash is plain birch; see
// docs/saunafam/PROGRESS.md, M7).
write(join(assets, 'splash-icon.png'), rgba(master('android-foreground.svg'), 1024));
console.log('copied icon.png, favicon.png, android-icon-*.png into assets/');

// The site's favicons, over the old Arro ones.
const site = join(repoRoot, 'site/public');
for (const f of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-512.png']) {
  copyFileSync(join(web, f), join(site, f));
}
console.log('copied the web icons into site/public/');
