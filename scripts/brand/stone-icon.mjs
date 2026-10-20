/**
 * The Saunafam icon, round two (candidate E): a river stone resting on a
 * bench, its underside glowing where it meets the heat, two wisps of steam
 * above. Replaces D after the coordinator's review of design/brand/icon-sizes.png:
 *
 * - small sizes were specks: at 60 px and under the stone fills about 74% of
 *   the tile, and at 20 px and under (and the favicon) 77%, sitting lower;
 * - the wisps read as brown worms: they're tapered steam now (wide at the
 *   base, thinning and fading to nothing), warm white, softly blurred, two
 *   different lengths and phases; at 29 to 60 px two short bold strokes; at
 *   20 px and under, none;
 * - the stone leaned toward a bun: the silhouette is irregular, one shoulder
 *   lower, a gently curved underside, a soft specular top-left, speckle only
 *   at full size, and the ember brightest in a thin rim at the underside,
 *   spilling onto the bench below;
 * - the tinted master had an outline ring: it's one solid tone now, with a
 *   tonal step for the rim and the wisps.
 *
 * `stoneIcon(options)` returns an SVG string on a 1024 canvas.
 */
import { smoothClosed } from './icon-art.mjs';

/** The stone in its own frame: centered on (0, 0), 556 wide, 300 tall, underside curved. */
const STONE_POINTS = [
  [-278, 36],
  [-252, -44],
  [-174, -112],
  [-58, -150],
  [70, -146],
  [186, -102],
  [262, -32],
  [278, 40],
  [236, 104],
  [126, 142],
  [-14, 150],
  [-150, 136],
  [-242, 96],
];
export const stoneLocalPath = smoothClosed(STONE_POINTS, 1);

/** Light and heat around the stone, in the stone's own frame (before scaling). */
export const stoneGeometry = {
  /** A soft halo of heat on the bench below, reaching a little up the sides. */
  spill: { cx: 10, cy: 136, rx: 390, ry: 128 },
  /** The glow on the bench, just under the curved underside. */
  floor: { cx: 12, cy: 164, rx: 330, ry: 74 },
  /** The hot line where the underside meets the heat. */
  core: { cx: 18, cy: 150, rx: 220, ry: 13 },
  /** Warmth on the lower part of the stone, from y0 (none) to y1 (most). */
  under: { y0: 70, y1: 152 },
  /** The soft specular top left, and a tighter glint inside it. */
  sheen: { cx: -118, cy: -96, rx: 128, ry: 42 },
  glint: { cx: -140, cy: -104, rx: 42, ry: 10 },
  /** The bounding box, for cropping. */
  box: { x: -278, y: -150, w: 556, h: 300 },
};

/** Where the stone sits and how big, per detail level. */
const LAYOUT = {
  full: { cx: 512, cy: 604, s: 1.08 },
  small: { cx: 512, cy: 640, s: 1.36 },
  tiny: { cx: 512, cy: 556, s: 1.42 },
};

const BIRCH = ['#F4EDE2', '#ECE1CF'];
const CHAR = ['#2C2824', '#1B1816'];

function wispCenterline(x0, y0, length, amp, phase, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // The sway grows as the steam rises and loosens.
    const x = x0 + amp * Math.sin(phase + t * Math.PI * 2.4) * (0.3 + 0.7 * t);
    pts.push([x, y0 - length * t, t]);
  }
  return pts;
}

/** A tapered wisp as a filled outline: `w0` wide at the base, a point at the top. */
function taperedWisp(x0, y0, length, amp, phase, w0) {
  const c = wispCenterline(x0, y0, length, amp, phase);
  const left = [];
  const right = [];
  for (let i = 0; i < c.length; i++) {
    const [x, y, t] = c[i];
    const [px, py] = c[Math.max(0, i - 1)];
    const [nx, ny] = c[Math.min(c.length - 1, i + 1)];
    const dx = nx - px;
    const dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    const w = (w0 / 2) * Math.pow(1 - t, 1.15);
    left.push([x - (dy / len) * w, y + (dx / len) * w]);
    right.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  const ring = [...left, ...right.reverse()];
  return `M${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}

/** A short wisp as a polyline, for stroking at small sizes. */
function strokeWisp(x0, y0, length, amp, phase) {
  const c = wispCenterline(x0, y0, length, amp, phase, 24);
  return `M${c.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;
}

/**
 * Options:
 * - tone: 'light' | 'dark' | 'tinted'
 * - detail: 'full' (over 60 px), 'small' (21 to 60 px), 'tiny' (20 px and under, and the favicon)
 * - background: fill the square (ignored for tinted, which is transparent)
 * - scale: shrink the art inside the canvas (the Android safe zone)
 * - art: false for the background alone
 */
export function stoneIcon({ tone = 'light', detail = 'full', background = true, scale = 1, art = true } = {}) {
  const tinted = tone === 'tinted';
  const dark = tone === 'dark';
  const L = LAYOUT[detail];
  const g = stoneGeometry;
  const o = [];
  o.push('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">');
  o.push('<defs>');
  const bg = dark ? CHAR : BIRCH;
  o.push(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>`);
  if (tinted) {
    // One tone for the stone; the heat and the steam are a step lighter.
    o.push('<radialGradient id="stone" cx="0" cy="0" r="1"><stop offset="0" stop-color="#8E8E8E"/><stop offset="1" stop-color="#8E8E8E"/></radialGradient>');
  } else {
    const st = dark ? ['#857F79', '#4E4945', '#302C29', '#231F1D'] : ['#7B756F', '#48433F', '#2C2926', '#1C1A18'];
    o.push(`<radialGradient id="stone" cx="-130" cy="-110" r="470" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${st[0]}"/><stop offset=".42" stop-color="${st[1]}"/><stop offset=".8" stop-color="${st[2]}"/><stop offset="1" stop-color="${st[3]}"/></radialGradient>`);
  }
  const u = g.under;
  if (tinted) {
    o.push(`<linearGradient id="under" x1="0" y1="${u.y0}" x2="0" y2="${u.y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#C8C8C8" stop-opacity="0"/><stop offset=".7" stop-color="#C8C8C8" stop-opacity=".6"/><stop offset="1" stop-color="#E6E6E6" stop-opacity="1"/></linearGradient>`);
  } else {
    o.push(`<linearGradient id="under" x1="0" y1="${u.y0}" x2="0" y2="${u.y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#D9612F" stop-opacity="0"/><stop offset=".55" stop-color="#E06A35" stop-opacity=".22"/><stop offset=".85" stop-color="#F08848" stop-opacity=".7"/><stop offset="1" stop-color="#FFC284" stop-opacity="1"/></linearGradient>`);
  }
  // Smooth falloffs (sampled (1 - t)^2), so no glow shows a ring.
  const falloff = (id, color, peak, inner) => {
    const stops = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return `<stop offset="${t.toFixed(3)}" stop-color="${inner && t < 0.3 ? inner : color}" stop-opacity="${(peak * (1 - t) * (1 - t)).toFixed(3)}"/>`;
    }).join('');
    return `<radialGradient id="${id}" cx=".5" cy=".5" r=".5">${stops}</radialGradient>`;
  };
  if (tinted) {
    o.push(falloff('spill', '#FFFFFF', 0.28));
    o.push(falloff('floor', '#FFFFFF', 0.75));
    o.push(falloff('core', '#FFFFFF', 0.95));
  } else {
    o.push(falloff('spill', '#F2A35E', dark ? 0.55 : 0.48));
    o.push(falloff('floor', '#F08848', 1, '#FFB46C'));
    o.push(falloff('core', '#FFE2BC', 1, '#FFF4E4'));
  }
  // Steam: warm white, opaque at the base, fading to nothing at the top.
  const steam = tinted ? '#D4D4D4' : dark ? '#F8F4EE' : '#FFFCF7';
  o.push(`<linearGradient id="wisp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${steam}" stop-opacity="${dark ? '.55' : '.95'}"/><stop offset=".5" stop-color="${steam}" stop-opacity="${dark ? '.28' : '.55'}"/><stop offset="1" stop-color="${steam}" stop-opacity="0"/></linearGradient>`);
  // A faint warm shade under the steam, so it reads on pale birch.
  o.push('<linearGradient id="wispShade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#A98F6B" stop-opacity=".8"/><stop offset=".6" stop-color="#A98F6B" stop-opacity=".34"/><stop offset="1" stop-color="#B9A383" stop-opacity="0"/></linearGradient>');
  const smallSteam = tinted ? '#D4D4D4' : dark ? '#F8F4EE' : '#CDBA9C';
  o.push(`<linearGradient id="wispBold" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${smallSteam}" stop-opacity="${dark ? '.75' : '1'}"/><stop offset="1" stop-color="${smallSteam}" stop-opacity="${dark ? '.35' : '.55'}"/></linearGradient>`);
  for (const [id, sd] of [['b3', 3], ['b5', 5], ['b8', 8], ['b16', 16]]) {
    o.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`);
  }
  o.push('<filter id="speck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.85"/></filter>');
  o.push('<filter id="fleck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".16" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 14 -9.2"/></filter>');
  o.push(`<path id="sp" d="${stoneLocalPath}"/>`);
  o.push('<clipPath id="sc"><use href="#sp"/></clipPath>');
  o.push('</defs>');

  if (background && !tinted) {
    o.push('<rect width="1024" height="1024" fill="url(#bg)"/>');
    if (detail === 'full') {
      const xs = [138, 296, 450, 612, 768, 924];
      o.push(`<g opacity="${dark ? '.03' : '.06'}" fill="${dark ? '#F8F4EE' : '#A88F6A'}">${xs.map((x) => `<rect x="${x}" width="3" height="1024"/>`).join('')}</g>`);
    }
  }
  if (!art) {
    o.push('</svg>');
    return o.join('\n');
  }

  const ell = (e, fill, extra = '') => `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${fill}" ${extra}/>`;
  const outer = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  o.push(`<g transform="${outer}">`);
  o.push(`<g transform="translate(${L.cx} ${L.cy}) scale(${L.s})">`);
  // Heat on the bench: the halo, the glow, the hot line under the stone.
  const small = detail !== 'full';
  o.push(ell(g.spill, 'url(#spill)'));
  o.push(ell(small ? { ...g.floor, rx: 290, ry: 62 } : g.floor, 'url(#floor)'));
  o.push(ell(small ? { ...g.core, rx: 240, ry: 26 } : g.core, 'url(#core)', small ? '' : 'filter="url(#b3)"'));
  // The stone.
  o.push('<use href="#sp" fill="url(#stone)"/>');
  o.push('<g clip-path="url(#sc)">');
  o.push(`<rect x="-300" y="${u.y0}" width="600" height="${160 - u.y0}" fill="url(#under)"/>`);
  if (!tinted) {
    // The thin bright rim where the underside meets the heat.
    o.push(`<ellipse cx="${g.core.cx}" cy="${g.core.cy + 4}" rx="${g.core.rx + 30}" ry="${small ? 26 : 14}" fill="#FFD7A6" opacity="${small ? 1 : 0.85}" filter="url(#b${small ? 3 : 5})"/>`);
    o.push(ell(g.sheen, '#FFFFFF', `opacity="${dark ? '.16' : '.15'}" filter="url(#b16)"`));
    if (detail === 'full') {
      o.push(ell(g.glint, '#FFFFFF', 'opacity=".14" filter="url(#b5)"'));
      o.push('<rect x="-290" y="-160" width="580" height="320" filter="url(#speck)" opacity=".05"/>');
      o.push('<rect x="-290" y="-160" width="580" height="320" filter="url(#fleck)" opacity=".05"/>');
    }
  }
  o.push('</g>');
  o.push('</g>');

  // Steam: two wisps starting a little above the stone's dome.
  const top = L.cy + g.box.y * L.s; // the dome's highest point
  const gap = detail === 'full' ? 26 : 22;
  if (detail === 'full') {
    const w1 = taperedWisp(L.cx - 64, top - gap, 250, 26, 0.2, 36);
    const w2 = taperedWisp(L.cx + 60, top - gap + 12, 204, 22, 2.1, 30);
    if (!tinted && !dark) {
      o.push(`<g fill="url(#wispShade)" filter="url(#b8)" transform="translate(3 4)"><path d="${w1}"/><path d="${w2}"/></g>`);
    }
    o.push(`<g fill="url(#wisp)" filter="url(#b3)"><path d="${w1}"/><path d="${w2}"/></g>`);
  } else if (detail === 'small') {
    const s1 = strokeWisp(L.cx - 74, top - gap - 10, 160, 22, 0.2);
    const s2 = strokeWisp(L.cx + 70, top - gap, 130, 20, 2.1);
    o.push(`<g fill="none" stroke="url(#wispBold)" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"><path d="${s1}"/><path d="${s2}"/></g>`);
  }
  o.push('</g>');
  o.push('</svg>');
  return o.join('\n');
}
