#!/usr/bin/env node
/**
 * Renders the six App Store screenshots (spec section 5, design/app-store/screenshots.md):
 * a Fraunces caption on birch over the app in a device frame, from the raw
 * simulator captures in design/app-store/screenshots/raw/<size>/.
 *
 *   node scripts/app-store-shots.mjs
 *
 * Writes design/app-store/screenshots/6.9/ (1320 x 2868, from the iPhone 17 Pro
 * Max) and 6.3/ (1206 x 2622, from the iPhone 17 Pro). Every capture and every
 * output is checked: exact pixel size, and no alpha channel (App Store Connect
 * refuses transparency). Any failure stops the run with a non-zero exit.
 *
 * New captures: scripts/app-store/capture.mjs.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import pngjs from 'pngjs';
import { loadTheme, repoRoot } from './lib/load-theme.mjs';

const { PNG } = pngjs;
const { tokens } = await loadTheme(['tokens']);
const { palette } = tokens;

/** The two sets. `capture` is the simulator's screenshot size; the output is the same size. */
const SIZES = [
  { id: '6.9', width: 1320, height: 2868, device: 'iPhone 17 Pro Max' },
  { id: '6.3', width: 1206, height: 2622, device: 'iPhone 17 Pro' },
];

/** In order. Line breaks are set by hand so every caption has a good rag. */
const SHOTS = [
  { file: '1-timer', caption: ['Close the door.', 'We’ll keep time.'], wordmark: true },
  { file: '2-today', caption: ['One streak for', 'the whole family.'] },
  { file: '3-week', caption: ['Three a week,', 'together.'] },
  { file: '4-log', caption: ['Sat together?', 'Log it once.'] },
  { file: '5-feed', caption: ['Cheer each', 'other on.'] },
  { file: '6-milestone', caption: ['12 weeks', 'in the heat.'] },
];

const fonts = ['assets/fonts/FrauncesSoft-SemiBold.ttf', 'assets/fonts/FrauncesSoft-Regular.ttf'].map((f) => join(repoRoot, f));
const wordmark = readFileSync(join(repoRoot, 'assets/brand/wordmark.svg'), 'utf8');
const wordmarkBody = wordmark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '');
const wordmarkBox = wordmark.match(/viewBox="([\d.\s]+)"/)[1].split(/\s+/).map(Number);

const failures = [];
function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

/** Reads a PNG's header: size and color type (2 = RGB, 6 = RGBA). */
function pngHeader(buf) {
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

/** True if any pixel isn't fully opaque. */
function hasTransparency(png) {
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 255) return true;
  return false;
}

/**
 * One screenshot as SVG, laid out on a 1320-wide grid and scaled to the size.
 * The device sits at the same place on every shot, so the set reads as a strip.
 */
function compose(shot, size, captureB64) {
  const W = size.width;
  const H = size.height;
  const u = W / 1320;
  const px = (n) => +(n * u).toFixed(2);

  // The device: the capture at 74% with a 20 pt-ish bezel.
  const screenW = px(980);
  const screenH = +(screenW * (H / W)).toFixed(2);
  const bezel = px(22);
  const deviceW = screenW + bezel * 2;
  const deviceH = screenH + bezel * 2;
  const deviceX = (W - deviceW) / 2;
  const deviceY = H - deviceH - px(96);
  const screenR = px(150);
  const outerR = screenR + bezel;
  const sx = deviceX + bezel;
  const sy = deviceY + bezel;

  // The caption: two lines of Fraunces SemiBold, the last line's baseline a fixed gap above the device.
  const fontSize = px(106);
  const leading = px(118);
  const lastBaseline = deviceY - px(92);
  const lines = shot.caption
    .map((line, i) => {
      const y = lastBaseline - (shot.caption.length - 1 - i) * leading;
      return `<text x="${W / 2}" y="${y.toFixed(2)}" text-anchor="middle" font-family="Fraunces Soft SemiBold" font-weight="600" font-size="${fontSize}" letter-spacing="${px(-2.2)}" fill="${palette.char}">${line}</text>`;
    })
    .join('\n    ');
  const firstBaseline = lastBaseline - (shot.caption.length - 1) * leading;

  // The wordmark, on the first shot only, centered above the caption.
  let mark = '';
  if (shot.wordmark) {
    const markW = px(300);
    const scale = markW / wordmarkBox[2];
    const markH = wordmarkBox[3] * scale;
    const markY = firstBaseline - fontSize - px(88) - markH;
    mark = `<g transform="translate(${((W - markW) / 2).toFixed(2)} ${markY.toFixed(2)}) scale(${scale.toFixed(5)})">${wordmarkBody}</g>`;
  }

  // Faint vertical slats on the birch, as on the app's background.
  let slats = '';
  for (let x = px(44); x < W; x += px(88)) slats += `<rect x="${x.toFixed(2)}" y="0" width="${Math.max(1, px(2)).toFixed(2)}" height="${H}" fill="${palette.char}" opacity="0.028"/>`;

  // Side buttons, in the bezel's color, just proud of the frame.
  const btn = (x, y, h) => `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${px(7)}" height="${h.toFixed(2)}" rx="${px(3)}" fill="#3A3531"/>`;
  const buttons = [
    btn(deviceX - px(5), deviceY + px(330), px(96)),
    btn(deviceX - px(5), deviceY + px(470), px(150)),
    btn(deviceX - px(5), deviceY + px(640), px(150)),
    btn(deviceX + deviceW - px(2), deviceY + px(520), px(230)),
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="warm" cx="0.92" cy="0.02" r="0.75">
      <stop offset="0" stop-color="${palette.glow}" stop-opacity="0.2"/>
      <stop offset="1" stop-color="${palette.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="${palette.aspen}" stop-opacity="0"/>
      <stop offset="1" stop-color="${palette.aspen}" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4A433D"/>
      <stop offset="0.5" stop-color="#2A2622"/>
      <stop offset="1" stop-color="#46403A"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation="${px(44)}"/></filter>
    <filter id="contact" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${px(10)}"/></filter>
    <clipPath id="screen"><rect x="${sx.toFixed(2)}" y="${sy.toFixed(2)}" width="${screenW}" height="${screenH}" rx="${screenR}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="${palette.birch}"/>
  ${slats}
  <rect width="${W}" height="${H}" fill="url(#warm)"/>
  <rect width="${W}" height="${H}" fill="url(#floor)"/>
  ${mark}
  ${lines}
  <rect x="${(deviceX + px(30)).toFixed(2)}" y="${(deviceY + px(70)).toFixed(2)}" width="${(deviceW - px(60)).toFixed(2)}" height="${deviceH.toFixed(2)}" rx="${outerR}" fill="#5A3A22" opacity="0.30" filter="url(#shadow)"/>
  <rect x="${(deviceX + px(8)).toFixed(2)}" y="${(deviceY + px(14)).toFixed(2)}" width="${(deviceW - px(16)).toFixed(2)}" height="${deviceH.toFixed(2)}" rx="${outerR}" fill="#2A1C12" opacity="0.22" filter="url(#contact)"/>
  ${buttons}
  <rect x="${deviceX.toFixed(2)}" y="${deviceY.toFixed(2)}" width="${deviceW.toFixed(2)}" height="${deviceH.toFixed(2)}" rx="${outerR}" fill="url(#band)"/>
  <rect x="${(deviceX + px(4)).toFixed(2)}" y="${(deviceY + px(4)).toFixed(2)}" width="${(deviceW - px(8)).toFixed(2)}" height="${(deviceH - px(8)).toFixed(2)}" rx="${outerR - px(4)}" fill="#0E0D0C"/>
  <image x="${sx.toFixed(2)}" y="${sy.toFixed(2)}" width="${screenW}" height="${screenH}" preserveAspectRatio="none" clip-path="url(#screen)" xlink:href="data:image/png;base64,${captureB64}"/>
</svg>`;
}

for (const size of SIZES) {
  const outDir = join(repoRoot, 'design/app-store/screenshots', size.id);
  mkdirSync(outDir, { recursive: true });
  for (const shot of SHOTS) {
    const rawPath = join(repoRoot, 'design/app-store/screenshots/raw', size.id, `${shot.file}.png`);
    let raw;
    try {
      raw = readFileSync(rawPath);
    } catch {
      fail(`${size.id}/${shot.file}: no capture at ${rawPath}`);
      continue;
    }
    const head = pngHeader(raw);
    if (head.width !== size.width || head.height !== size.height) {
      fail(`${size.id}/${shot.file}: capture is ${head.width} x ${head.height}, expected ${size.width} x ${size.height} (${size.device})`);
      continue;
    }

    const svg = compose(shot, size, raw.toString('base64'));
    const rendered = new Resvg(svg, {
      fitTo: { mode: 'original' },
      font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Fraunces Soft SemiBold' },
    }).render();
    // Flatten to RGB: App Store Connect refuses an alpha channel.
    const rgba = PNG.sync.read(rendered.asPng());
    if (hasTransparency(rgba)) fail(`${size.id}/${shot.file}: the render has transparent pixels`);
    const out = PNG.sync.write(rgba, { colorType: 2, inputHasAlpha: true });
    const file = join(outDir, `${shot.file}.png`);
    writeFileSync(file, out);

    // Check what was written, not what was meant.
    const check = pngHeader(readFileSync(file));
    if (check.width !== size.width || check.height !== size.height) fail(`${file}: ${check.width} x ${check.height}, expected ${size.width} x ${size.height}`);
    else if (check.colorType !== 2) fail(`${file}: PNG color type ${check.colorType}, expected 2 (RGB, no alpha)`);
    else console.log(`ok  ${size.id}/${shot.file}.png  ${check.width} x ${check.height}, RGB`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s). Nothing above marked FAIL can be uploaded.`);
  process.exit(1);
}
console.log(`\nAll ${SIZES.length * SHOTS.length} screenshots are the exact size, with no alpha channel.`);
