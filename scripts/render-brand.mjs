#!/usr/bin/env node
/**
 * Renders the two brand proofs from the same tokens the app uses:
 *
 * - design/brand/icon-sizes.png: the icon at 16, 29, 40, 60, 180 and 1024 px
 *   (actual pixels) on light and dark wallpapers, plus the dark and tinted
 *   variants;
 * - design/brand/brand-sheet.png: palette with hex, member colors, type scale,
 *   spacing, radii and depth, motion tokens, buttons and rows, slats, the
 *   icon and the wordmark.
 *
 *   node scripts/render-brand.mjs
 *
 * Both are HTML pages shot with headless Chrome, so the body text is the real
 * SF Pro (-apple-system on a Mac) and Fraunces comes from assets/fonts. Chrome
 * is found at $CHROME_PATH, /Applications/Google Chrome.app, or the Chrome for
 * Testing that Playwright caches. Run `node scripts/generate-icons.mjs` first.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { loadTheme, repoRoot } from './lib/load-theme.mjs';
import { stoneIcon } from './brand/stone-icon.mjs';

const { tokens, motionTokens, material } = await loadTheme(['tokens', 'motionTokens', 'src/components/material']);
const {
  palette,
  alpha,
  memberPalette,
  memberNames,
  onMember,
  gradients,
  woods,
  frozenFinish,
  depth,
  radii,
  spaceScale,
} = tokens;

function findChrome() {
  const candidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)
      .filter((n) => n.startsWith('chromium-'))
      .sort()
      .reverse()) {
      candidates.push(
        join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
        join(cache, d, 'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      );
    }
  }
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium binary.');
  return found;
}

const chrome = findChrome();
const work = mkdtempSync(join(tmpdir(), 'saunafam-brand-'));

function shoot(html, out, width, height, scale) {
  const page = join(work, `${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(page, html);
  rmSync(out, { force: true });
  try {
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--allow-file-access-from-files',
        `--force-device-scale-factor=${scale}`,
        `--window-size=${width},${height}`,
        '--virtual-time-budget=4000',
        `--screenshot=${out}`,
        `file://${page}`,
      ],
      { stdio: 'pipe' },
    );
  } catch (e) {
    // Headless Chrome on macOS can exit non-zero after the screenshot is written
    // (its teardown watchdog); only a missing file is a failure.
    if (!existsSync(out) || statSync(out).size === 0) throw e;
  }
  console.log('wrote', out.slice(repoRoot.length + 1));
}

const file = (p) => `file://${join(repoRoot, p)}`;
const dataPng = (svg, size) =>
  `data:image/png;base64,${new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng().toString('base64')}`;

const fontFaces = `
@font-face { font-family: 'Fraunces Soft'; src: url('${file('assets/fonts/FrauncesSoft-Regular.ttf')}'); font-weight: 400; }
@font-face { font-family: 'Fraunces Soft'; src: url('${file('assets/fonts/FrauncesSoft-SemiBold.ttf')}'); font-weight: 600; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; color: ${palette.char}; }
.disp { font-family: 'Fraunces Soft', serif; }
.caps { font: 600 12px/16px system-ui, sans-serif; letter-spacing: .8px; text-transform: uppercase; color: ${palette.stone}; }
`;

// ---------------------------------------------------------------- icon sizes
{
  // Each size draws from the master generate-icons.mjs uses for it: over 60 px
  // the full art, 21 to 60 the small master, 20 and under the tiny one. The
  // 16@2x column is the tiny master at 32, for a retina tab or home screen.
  const detailFor = (s) => (s > 60 ? 'full' : s > 20 ? 'small' : 'tiny');
  const sizes = [
    [16, 16],
    [32, '16@2x'],
    [29, 29],
    [40, 40],
    [60, 60],
    [180, 180],
  ];
  const tile = (tone, px, label, extra = '') => {
    const detail = label === '16@2x' ? 'tiny' : detailFor(px);
    const svg = stoneIcon({ tone, detail, background: tone !== 'tinted' });
    return `<div class="cell"><img src="${dataPng(svg, px)}" width="${px}" height="${px}" style="border-radius:${(px * 0.2237).toFixed(2)}px;${extra}"><span>${label}</span></div>`;
  };
  const row = (label, wall, tone, extra = '') =>
    `<div class="row ${wall}"><div class="label">${label}</div>${sizes.map(([px, l]) => tile(tone, px, l, extra)).join('')}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces}
    body { background: #E9E3DA; width: 2480px; padding: 56px; }
    h1 { font: 600 44px/48px 'Fraunces Soft'; }
    p.lede { font-size: 18px; color: ${palette.smoke}; margin: 8px 0 32px; max-width: 1200px; }
    .wrap { display: flex; gap: 48px; align-items: flex-start; }
    .big img { display: block; border-radius: 229px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.35); }
    .big span { display:block; margin-top: 12px; font-size: 15px; color: ${palette.smoke}; }
    .rows { display: flex; flex-direction: column; gap: 16px; flex: 1; }
    .row { display: flex; align-items: flex-end; gap: 36px; padding: 20px 32px; border-radius: 28px; }
    .row.light { background: linear-gradient(160deg, #F4F1EC, #DCD6CE); }
    .row.dark { background: linear-gradient(160deg, #3A3A40, #16161A); }
    .row .label { width: 220px; font-size: 16px; font-weight: 600; align-self: center; }
    .row.dark .label, .row.dark span { color: #E6E2DC; }
    .cell { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .cell img { display: block; image-rendering: auto; box-shadow: 0 1px 2px rgba(0,0,0,.18); }
    .cell span { font-size: 13px; color: ${palette.smoke}; }
    .tinted { background: linear-gradient(160deg, #2B2B30, #121215); display:inline-block; }
  </style></head><body>
    <h1>Saunafam app icon at every size</h1>
    <p class="lede">Actual pixels. Over 60 px: the full art. 21 to 60 px: the small master (bigger stone, two short bold wisps). 20 px and under, and the favicon: the tiny master (biggest stone, no wisps). The tinted master is grayscale on transparent, shown here on a dark tile; iOS applies the tint the person picks.</p>
    <div class="wrap">
      <div class="big"><img src="${file('assets/brand/out/icon-1024.png')}" width="1024" height="1024"><span>1024 px, light</span></div>
      <div class="rows">
        ${row('Light, light wallpaper', 'light', 'light')}
        ${row('Light, dark wallpaper', 'dark', 'light')}
        ${row('Dark variant', 'dark', 'dark')}
        ${row('Tinted master (iOS tints it)', 'dark', 'tinted', 'background:#202024;')}
        <div class="row light"><div class="label">Favicon</div>
          ${[16, 32, 48, 180].map((s) => `<div class="cell"><img src="${dataPng(readFileSync(join(repoRoot, 'assets/brand/favicon.svg'), 'utf8'), s)}" width="${s}" height="${s}" style="border-radius:${s * 0.2}px"><span>${s}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </body></html>`;
  shoot(html, join(repoRoot, 'design/brand/icon-sizes.png'), 2480, 1600, 1);
}

// --------------------------------------------------------------- brand sheet
{
  const grad = (stops, dir = '180deg') =>
    `linear-gradient(${dir}, ${stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')})`;
  const use = {
    birch: 'screen',
    steam: 'cards, sheets',
    aspen: 'trays, empty slats',
    grain: 'hairlines',
    stone: 'meta text, icons',
    pebble: 'graphics only',
    smoke: 'secondary text',
    char: 'text, the dark room',
    ember: 'the one accent',
    coal: 'pressed, ember text',
    glow: 'heat, gradients only',
    lake: 'cold, freezes',
    moss: 'kept, quietly',
  };
  const swatches = Object.entries(palette)
    .map(
      ([k, v]) =>
        `<div class="sw"><div class="chip" style="background:${v}"></div><b>${k}</b><code>${v}</code><i>${use[k] ?? ''}</i></div>`,
    )
    .join('');
  const members = memberPalette
    .map(
      (c, i) =>
        `<div class="mem"><div class="av" style="background:${c}">${memberNames[i][0].toUpperCase()}</div><b>${memberNames[i]}</b><code>${c}</code></div>`,
    )
    .join('');
  const typeRows = [
    [
      'display 64/64',
      `<div class="disp" style="font:600 64px/64px 'Fraunces Soft';letter-spacing:-1.5px;color:${palette.coal}">8</div>`,
    ],
    ['title 34/38', `<div style="font:600 34px/38px 'Fraunces Soft';letter-spacing:-.6px">Good evening, Sam</div>`],
    ['heading 24/28', `<div style="font:400 24px/28px 'Fraunces Soft';letter-spacing:-.2px">weeks together</div>`],
    [
      'body 17/24',
      `<div style="font:400 17px/24px system-ui, sans-serif;letter-spacing:-.2px">Maya has kept this week. Jo's on 2.</div>`,
    ],
    [
      'body small 15/21',
      `<div style="font:400 15px/21px system-ui, sans-serif;color:${palette.smoke}">Yesterday, 18 minutes with Sam</div>`,
    ],
    [
      'label 13/18',
      `<div style="font:400 13px/18px system-ui, sans-serif;color:${palette.stone}">Tuesday · 15 min</div>`,
    ],
    ['caption 12/16 small caps', `<div class="caps">This week · 2 of 3</div>`],
    [
      'timer 96, fixed digits',
      `<div style="background:${palette.char};border-radius:16px;padding:8px 24px;display:inline-flex">${[...'12:40'].map((ch) => `<span style="display:inline-block;text-align:center;width:${ch === ':' ? 23 : 62}px;font:400 96px/104px 'Fraunces Soft';color:${palette.steam}">${ch}</span>`).join('')}</div>`,
    ],
  ]
    .map(([k, v]) => `<div class="tr"><span class="caps">${k}</span>${v}</div>`)
    .join('');
  const spacing = spaceScale
    .map((s) => `<div class="sp"><code>${s}</code><div style="width:${s * 4}px"></div></div>`)
    .join('');
  const depthTiles = [
    [
      'card, radius ' + radii.card,
      `border-radius:${radii.card}px;box-shadow:${depth.card};background:${palette.steam}`,
    ],
    ['float', `border-radius:${radii.card}px;box-shadow:${depth.float};background:${palette.steam}`],
    [
      'button, radius ' + radii.button,
      `border-radius:${radii.button}px;box-shadow:${depth.button};background:${grad(gradients.emberButton)}`,
    ],
    [
      'field, radius ' + radii.field,
      `border-radius:${radii.field}px;box-shadow:${depth.card};background:${palette.steam}`,
    ],
    ['tray, sunk', `border-radius:${radii.slat}px;box-shadow:${depth.sunk};background:${palette.aspen}`],
    [
      'slat, radius ' + radii.slat,
      `border-radius:${radii.slat}px;background:${grad(woods.birch.open.stops)};box-shadow:inset 0 1px 0 ${woods.birch.open.rimTop}, inset 0 -1px 0 ${woods.birch.open.rimBottom}`,
    ],
  ]
    .map(([k, st]) => `<div class="dt"><div style="width:120px;height:80px;${st}"></div><span>${k}</span></div>`)
    .join('');
  const curve = (name, [x1, y1, x2, y2], ms) => {
    const W = 160,
      H = 110,
      p = 12;
    const X = (v) => p + v * (W - 2 * p),
      Y = (v) => H - p - v * (H - 2 * p - 14);
    return `<div class="cv"><svg width="${W}" height="${H}"><rect x="${p}" y="${p}" width="${W - 2 * p}" height="${H - 2 * p}" fill="none" stroke="${palette.grain}"/>
      <path d="M${X(0)} ${Y(0)} C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(1)} ${Y(1)}" fill="none" stroke="${palette.ember}" stroke-width="2.5" stroke-linecap="round"/></svg>
      <b>${name}</b><span>${ms}</span><code>bezier(${[x1, y1, x2, y2].join(', ')})</code></div>`;
  };
  const { curves, durations, springs, stagger, loopTokens, momentSummary } = motionTokens;
  const motion = [
    curve('settle', curves.settle, `${durations.settle} ms, one arrival per screen`),
    curve('ember', curves.ember, `${durations.ember} ms, check-ins only`),
    curve('utility', curves.utility, `${durations.utility} ms, ease-out`),
    curve('leave', curves.leave, 'fades out, lifts that leave'),
    curve('burst', curves.burst, 'sparks, löyly'),
  ].join('');
  const springRows = Object.entries(springs)
    .map(
      ([k, v]) =>
        `<tr><td>spring ${k}</td><td>damping ${v.damping}, stiffness ${v.stiffness}, mass ${v.mass}</td></tr>`,
    )
    .join('');
  const loopRows = `<tr><td>${loopTokens.glowBreathe.name}</td><td>${loopTokens.glowBreathe.duration / 1000} s, opacity ${loopTokens.glowBreathe.from} to ${loopTokens.glowBreathe.to}</td></tr>
    <tr><td>${loopTokens.steamDrift.name}</td><td>${loopTokens.steamDrift.duration / 1000} s, ${loopTokens.steamDrift.distance} pt</td></tr>
    <tr><td>stagger</td><td>${stagger} ms</td></tr>`;
  const momentRows = momentSummary
    .map(
      (m) =>
        `<tr><td>${m.moment}</td><td>${m.ms}${/^\d+$/.test(m.ms) ? ' ms' : m.ms.includes(' to ') ? ' ms' : ''}</td><td>${m.curve}</td></tr>`,
    )
    .join('');

  // Slats, drawn with the app's own grain generator.
  const slatSvg = (finish, seed, h, frozen = false, paused = false) => {
    const W = 300;
    const g = paused ? null : material.grain(W, h, 40 + seed, h >= 40 ? 7 : 4, !frozen);
    let p = '';
    if (g) {
      for (const l of g.lines)
        p += `<path d="${l.d}" stroke="${finish.grain}" stroke-opacity="${(finish.grainOpacity * l.opacity).toFixed(3)}" stroke-width="${l.width.toFixed(2)}" fill="none" vector-effect="non-scaling-stroke"/>`;
      if (g.knot)
        p += `<ellipse cx="${g.knot.cx}" cy="${g.knot.cy}" rx="${g.knot.rx}" ry="${g.knot.ry}" stroke="${finish.grain}" stroke-opacity="${finish.grainOpacity * 1.2}" stroke-width=".7" fill="none" vector-effect="non-scaling-stroke"/>`;
    }
    if (frozen)
      for (const d of material.frost(W, h, 99 + seed, 70))
        p += `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="#fff" fill-opacity="${d.opacity}"/>`;
    return `<div class="slat" style="height:${h}px;border-radius:${h >= 40 ? radii.slat : radii.slatSmall}px;background:${grad(finish.stops)};box-shadow:inset 0 1px 0 ${finish.rimTop}, inset 0 -1px 0 ${finish.rimBottom}"><svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none">${p}</svg></div>`;
  };
  const dot = (on, size = 14) =>
    on
      ? `<i class="dot" style="width:${size}px;height:${size}px;background:radial-gradient(circle at 40% 35%, ${gradients.emberDot.map((s) => `${s.color} ${s.offset * 100}%`).join(', ')});box-shadow:0 0 0 3px rgba(201,84,42,.12), 0 0 10px 2px rgba(242,163,94,.45)"></i>`
      : `<i class="dot" style="width:${size}px;height:${size}px;background:${alpha.dotEmpty};box-shadow:inset 0 1px 1.5px ${alpha.dotEmptyShade}"></i>`;
  const wall = ['kept', 'kept', 'frozen', 'kept', 'kept', 'paused', 'kept', 'kept', 'cur']
    .map((s, i) => {
      const bench = i > 0 && i % 4 === 0 ? 'margin-bottom:12px;' : '';
      if (s === 'cur')
        return `<div style="position:relative;${bench}">${slatSvg(woods.birch.open, i, 21)}<div class="in">${dot(true, 9)}${dot(true, 9)}${dot(false, 9)}</div></div>`;
      if (s === 'frozen') return `<div style="${bench}">${slatSvg(frozenFinish, i, 21, true)}</div>`;
      if (s === 'paused') return `<div style="${bench}">${slatSvg(woods.birch.open, i, 21, false, true)}</div>`;
      return `<div style="${bench}">${slatSvg(woods.birch.kept, i, 21)}</div>`;
    })
    .reverse()
    .join('');
  const woodRows = Object.entries(woods)
    .map(
      ([k, w], i) =>
        `<div class="wood"><span class="caps">${k.replace('_', ' ')}</span>${slatSvg(w.open, 20 + i, 21)}${slatSvg(w.kept, 30 + i, 21)}</div>`,
    )
    .join('');
  const avatar = (n, c) => `<div class="av sm" style="background:${c}">${n[0]}</div>`;
  const mini = (k) =>
    `<span class="minis">${[0, 1, 2].map((i) => `<i style="background:${i < k ? palette.ember : palette.aspen};${i < k ? '' : `box-shadow:inset 0 .5px 1px ${alpha.dotEmptyShade}`}"></i>`).join('')}</span>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces}
    body { width: 1600px; background: ${palette.birch}; padding: 64px; position: relative; }
    .wall-bg { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 27px, ${alpha.wallLine} 27px 28px); pointer-events: none; }
    header { display: flex; align-items: center; gap: 40px; position: relative; }
    header img.icon { width: 180px; height: 180px; border-radius: 40px; box-shadow: ${depth.float}; }
    header h1 { font: 600 34px/38px 'Fraunces Soft'; margin-top: 16px; }
    header p { font-size: 17px; line-height: 24px; color: ${palette.smoke}; max-width: 640px; margin-top: 8px; }
    section { margin-top: 48px; position: relative; }
    section > .caps { display: block; margin: 0 0 12px 8px; }
    .card { background: ${palette.steam}; border-radius: ${radii.card}px; box-shadow: ${depth.card}; padding: 24px; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 16px; }
    .sw { display: flex; flex-direction: column; gap: 4px; }
    .sw .chip { height: 72px; border-radius: 12px; box-shadow: ${depth.card}; margin-bottom: 6px; }
    .sw b, .mem b { font-size: 15px; } .sw code, .mem code, code { font: 13px/18px ui-monospace, SFMono-Regular, monospace; color: ${palette.smoke}; }
    .sw i { font-style: normal; font-size: 13px; color: ${palette.stone}; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .mems { display: flex; gap: 28px; }
    .mem { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .av { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${onMember}; font: 600 21px system-ui, sans-serif; box-shadow: ${depth.avatar}; }
    .av.sm { width: 38px; height: 38px; font-size: 15px; }
    .tr { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
    .sp { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; } .sp code { width: 28px; text-align: right; } .sp div { height: 14px; border-radius: 6px; background: ${palette.ember}; }
    .dts { display: flex; gap: 28px; flex-wrap: wrap; } .dt { display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: ${palette.smoke}; }
    .cvs { display: flex; gap: 20px; flex-wrap: wrap; } .cv { display: flex; flex-direction: column; gap: 2px; width: 160px; } .cv b { font-size: 15px; } .cv span { font-size: 13px; color: ${palette.smoke}; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; } td { padding: 7px 8px; border-top: .5px solid ${alpha.hairline}; } td:first-child { font-weight: 600; } td:last-child { color: ${palette.smoke}; }
    .btn { height: 64px; border-radius: 16px; background: ${grad(gradients.emberButton)}; box-shadow: ${depth.button}; color: ${palette.steam}; font: 600 17px system-ui, sans-serif; display: flex; align-items: center; justify-content: center; letter-spacing: -.2px; }
    .btn.reg { height: 52px; } .btn.pressed { background: ${grad(gradients.coalButton)}; box-shadow: ${depth.buttonPressed}; transform: scale(.97); } .btn.dis { opacity: .45; }
    .act { font: 600 17px system-ui, sans-serif; text-align: center; padding: 8px; letter-spacing: -.2px; }
    .room { background: ${palette.char}; border-radius: 22px; padding: 28px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .ash { height: 56px; width: 220px; border-radius: 16px; background: linear-gradient(180deg, ${alpha.ashTop}, ${alpha.ashBottom}); box-shadow: ${depth.ash}; color: ${palette.steam}; font: 600 17px system-ui, sans-serif; display: flex; align-items: center; justify-content: center; }
    .acts { display: flex; justify-content: space-between; width: 100%; } .acts span { font: 600 17px system-ui, sans-serif; color: ${palette.steam}; } .acts span.dim { color: ${alpha.steam60}; font-weight: 500; }
    .list { background: ${palette.steam}; border-radius: 22px; box-shadow: ${depth.card}; padding: 4px 0; }
    .lr { display: flex; align-items: center; gap: 12px; padding: 8px 20px; min-height: 60px; position: relative; }
    .lr + .lr::before { content: ''; position: absolute; top: 0; right: 0; left: 72px; height: .5px; background: ${alpha.hairline}; }
    .lr.plain + .lr.plain::before { left: 20px; }
    .lr .t { flex: 1; } .lr .t b { display: block; font: 600 17px/24px system-ui, sans-serif; letter-spacing: -.2px; } .lr .t i { display: block; font: 400 13px/18px system-ui, sans-serif; color: ${palette.stone}; font-style: normal; }
    .lr .v { font: 400 15px system-ui, sans-serif; color: ${palette.smoke}; } .lr .v.k { color: ${palette.moss}; font-weight: 600; }
    .minis { display: flex; gap: 4px; } .minis i { width: 9px; height: 9px; border-radius: 50%; display: block; }
    .tg { width: 52px; height: 32px; border-radius: 16px; position: relative; box-shadow: ${depth.sunk}; }
    .tg::after { content: ''; position: absolute; top: 3px; left: 3px; width: 26px; height: 26px; border-radius: 50%; background: ${palette.steam}; box-shadow: ${depth.thumb}; }
    .tg.on { background: linear-gradient(180deg, ${gradients.emberButton[0].color}, ${gradients.emberButton[2].color}); } .tg.on::after { left: 23px; } .tg.off { background: ${palette.aspen}; }
    .field label { display: block; font: 600 13px/18px system-ui, sans-serif; color: ${palette.char}; margin-bottom: 8px; }
    .field div { height: 52px; border-radius: 12px; background: ${palette.steam}; box-shadow: ${depth.card}, ${depth.focus}; display: flex; align-items: center; padding: 0 16px; font: 17px system-ui, sans-serif; }
    .field small { display: block; margin-top: 8px; font: 13px system-ui, sans-serif; color: ${palette.stone}; }
    .slat { position: relative; overflow: hidden; } .slat svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .in { position: absolute; inset: 0; display: flex; align-items: center; gap: 12px; padding-left: 12px; }
    .dot { display: block; border-radius: 50%; }
    .walls { display: flex; gap: 40px; align-items: flex-end; } .wallc { width: 220px; display: flex; flex-direction: column; gap: 4px; }
    .wood { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 12px; align-items: center; margin-bottom: 10px; }
    .stack { display: flex; flex-direction: column; gap: 16px; }
    .today { position: relative; height: 54px; }
  </style></head><body><div class="wall-bg"></div>
  <header>
    <img class="icon" src="${file('assets/brand/out/icon-1024.png')}">
    <div><img src="${file('assets/brand/wordmark.svg')}" style="height:44px"><h1>Löyly: birch, stone and ember</h1>
    <p>Saunafam's design system, rendered from the app's own tokens (src/theme). Pale aspen by day; the room goes dark only when the door closes.</p></div>
  </header>

  <section><span class="caps">Palette</span><div class="card"><div class="grid">${swatches}</div></div></section>

  <section class="row2">
    <div><span class="caps">Member colors, in join order</span><div class="card"><div class="mems">${members}</div></div></div>
    <div><span class="caps">Spacing: the 4 pt grid, and only these</span><div class="card">${spacing}</div></div>
  </section>

  <section class="row2">
    <div><span class="caps">Type: Fraunces Soft (SOFT 100, WONK 0) and SF Pro</span><div class="card">${typeRows}</div></div>
    <div class="stack">
      <div><span class="caps">Radii and depth</span><div class="card"><div class="dts">${depthTiles}</div></div></div>
      <div><span class="caps">Motion tokens</span><div class="card"><div class="cvs">${motion}</div><table style="margin-top:16px">${springRows}${loopRows}</table></div></div>
    </div>
  </section>

  <section class="row2">
    <div><span class="caps">Key moments</span><div class="card"><table>${momentRows}</table></div></div>
    <div class="stack">
      <div><span class="caps">Buttons</span><div class="card stack">
        <div class="btn">Start a session</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><div class="btn reg">Save</div><div class="btn reg pressed">Pressed</div><div class="btn reg dis">Disabled</div></div>
        <div style="display:flex;justify-content:space-around"><div class="act">Log one I already did</div><div class="act" style="color:${palette.coal}">Keep this wood with Plus</div></div>
      </div></div>
      <div class="room"><div class="ash">Throw löyly</div><div class="acts"><span class="dim">Cancel</span><span>Add a round</span><span>Done</span></div></div>
    </div>
  </section>

  <section class="row2">
    <div class="stack"><span class="caps">Rows, toggles and fields</span>
      <div class="list">
        <div class="lr">${avatar('M', memberPalette[1])}<div class="t"><b>Maya</b><i>Tonight · 20 min · 85°C</i></div>${mini(3)}<span class="v k">Kept</span></div>
        <div class="lr">${avatar('J', memberPalette[2])}<div class="t"><b>Jo</b><i>Yesterday · 18 min with Sam</i></div>${mini(2)}<span class="v">2 of 3</span></div>
        <div class="lr">${avatar('S', memberPalette[0])}<div class="t"><b>Sam</b><i>Tuesday · 15 min</i></div>${mini(1)}<span class="v">1 of 3</span></div>
      </div>
      <div class="list">
        <div class="lr plain"><div class="t"><b>Sessions a week</b></div><span class="v">3 a week</span></div>
        <div class="lr plain"><div class="t"><b>Reminders</b></div><div class="tg on"></div></div>
        <div class="lr plain"><div class="t"><b>Weekend nudge</b></div><div class="tg off"></div></div>
      </div>
      <div class="card field"><label>Family name</label><div>Sunday sauna</div><small>Everyone in the family sees this.</small></div>
    </div>
    <div class="stack"><span class="caps">Slats: kept, frozen, paused, this week</span>
      <div class="card">
        <div class="today">${slatSvg(woods.birch.open, 11, 54)}<div class="in" style="gap:24px;padding-left:24px">${dot(true)}${dot(true)}${dot(false)}<span class="caps" style="margin-left:auto;margin-right:20px;color:${palette.smoke}">Week 8</span></div></div>
        <div class="walls" style="margin-top:24px"><div class="wallc">${wall}</div>
          <div><div style="font:600 84px/76px 'Fraunces Soft';color:${palette.coal};letter-spacing:-2px">7</div><div style="font:400 24px/28px 'Fraunces Soft';margin-top:6px">weeks together</div></div></div>
      </div>
      <div class="card"><span class="caps" style="display:block;margin-bottom:12px">Woods: open, then kept (cedar, alder and charred pine are Plus)</span>${woodRows}</div>
    </div>
  </section>
  </body></html>`;
  shoot(html, join(repoRoot, 'design/brand/brand-sheet.png'), 1600, 3420, 2);
}

rmSync(work, { recursive: true, force: true });
