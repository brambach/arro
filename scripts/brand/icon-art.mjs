/**
 * The Saunafam icon, as SVG source: a single river stone with ember heat
 * beneath it, on birch, with two faint steam wisps above.
 *
 * `icon(options)` returns an SVG string on a 1024 canvas. The masters in
 * assets/brand/*.svg are written from here by build-icon-masters.mjs, and the
 * explorations in design/brand/icon-explorations.png come from `candidates`.
 *
 * Owner's note on the mockup: at small sizes its stone read like a hockey puck.
 * So the stone here is a river stone (asymmetric, domed, flatter beneath, no
 * straight sides), it carries a soft top light and a little texture at large
 * sizes, and the heat is brightest right under it and spills up its lower edge.
 */

/**
 * A closed, smooth outline through `points` (Catmull-Rom turned into cubic
 * Beziers). `tension` 1 is the plain spline; lower is tighter at each point,
 * which reads as the soft facets of a real sauna stone.
 */
export function smoothClosed(points, tension = 1) {
  const n = points.length;
  const f = (v) => v.toFixed(1);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const k = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/** Stone outlines on the 1024 grid. */
export const stones = {
  /** A sauna stone: rounded, with soft facets, domed and heavier on the left, a flatter seat. */
  sauna: smoothClosed(
    [
      [268, 646],
      [296, 548],
      [392, 482],
      [512, 462],
      [632, 478],
      [728, 534],
      [766, 622],
      [726, 700],
      [612, 736],
      [470, 742],
      [344, 724],
    ],
    0.95,
  ),
  /** The same, taller and rounder: a river stone you'd pick up. */
  riverTall: smoothClosed(
    [
      [282, 650],
      [300, 552],
      [380, 474],
      [500, 444],
      [628, 456],
      [724, 520],
      [760, 612],
      [730, 692],
      [626, 738],
      [482, 748],
      [356, 728],
    ],
    1,
  ),
  /** The mockup's stone (for comparison): a symmetric pill. */
  puck: 'M258 604C258 506 374 452 518 452C664 452 770 510 770 604C770 690 662 732 516 732C368 732 258 692 258 604Z',
  /** A river stone: dome high and a little left, a long shoulder to the right, a flat seat. */
  river:
    'M246 646C240 560 330 478 486 468C628 459 760 512 786 606C806 680 742 732 594 740C474 746 354 744 290 712C262 698 248 676 246 646Z',
  /** Rounder and taller: more pebble, less loaf. */
  pebble:
    'M268 636C262 536 356 452 500 446C650 440 772 516 780 616C786 692 712 740 574 744C440 748 330 736 290 700C276 686 270 664 268 636Z',
  /** River stone, tilted: the dome leans left, the right end tucks lower. */
  tilted:
    'M240 618C246 528 352 462 498 462C640 462 768 528 790 622C808 702 726 746 586 748C452 750 330 734 280 694C254 674 238 650 240 618Z',
};

const BIRCH_TOP = '#F4EDE2';
const BIRCH_BOTTOM = '#ECE1CF';
const CHAR_TOP = '#2C2824';
const CHAR_BOTTOM = '#1B1816';

/**
 * Options:
 * - stone: a key of `stones`
 * - tone: 'light' | 'dark' | 'tinted'
 * - detail: 'full' (texture, slats, wisps) | 'small' (bolder wisps, no texture) | 'favicon' (no wisps, bigger stone)
 * - glow: 'mockup' | 'heat' (brighter at the core, spilling up the edge)
 * - background: true to fill the square (light/dark); tinted is always transparent
 */
export function icon({ stone = 'river', tone = 'light', detail = 'full', glow = 'heat', background = true, artScale = 1, slats = true, art = true } = {}) {
  const d = stones[stone];
  const fav = detail === 'favicon';
  const tinted = tone === 'tinted';
  const dark = tone === 'dark';
  // The favicon fills more of its frame and sits at the optical center.
  const t = fav ? 'translate(512 470) scale(1.7) translate(-521 -596)' : `translate(512 600) scale(${artScale}) translate(-516 -606)`;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">`);
  out.push('<defs>');
  out.push(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark ? CHAR_TOP : BIRCH_TOP}"/><stop offset="1" stop-color="${dark ? CHAR_BOTTOM : BIRCH_BOTTOM}"/></linearGradient>`);
  // The stone's body: lit from the upper left, a grey you can read as stone,
  // darkest at the lower right.
  if (tinted) {
    // Tinted: the stone a mid grey, so the heat beneath (white) is the brightest
    // thing, as it is in color. iOS maps brightness to the tint's strength.
    out.push(`<radialGradient id="stone" cx="430" cy="500" r="400" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#B4B4B4"/><stop offset="1" stop-color="#7C7C7C"/></radialGradient>`);
  } else if (glow === 'mockup') {
    out.push(`<radialGradient id="stone" cx="430" cy="480" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4B4540"/><stop offset=".5" stop-color="#2B2723"/><stop offset="1" stop-color="#1D1A17"/></radialGradient>`);
  } else {
    const stops = dark
      ? ['#7E7974', '#4B4743', '#2F2C29', '#231F1D']
      : ['#77726C', '#46423E', '#2B2826', '#1C1A18'];
    out.push(`<radialGradient id="stone" cx="420" cy="486" r="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".42" stop-color="${stops[1]}"/><stop offset=".78" stop-color="${stops[2]}"/><stop offset="1" stop-color="${stops[3]}"/></radialGradient>`);
  }
  // Heat lighting the stone from beneath: warm on the lower third, brightest at the seat.
  out.push(`<linearGradient id="under" x1="0" y1="600" x2="0" y2="752" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E06A35" stop-opacity="0"/><stop offset=".3" stop-color="#E06A35" stop-opacity=".06"/><stop offset=".55" stop-color="#E06A35" stop-opacity=".22"/><stop offset=".75" stop-color="#EE7C3E" stop-opacity=".55"/><stop offset=".9" stop-color="#F8994F" stop-opacity=".85"/><stop offset="1" stop-color="#FFB878" stop-opacity="1"/></linearGradient>`);
  out.push(`<linearGradient id="rim" x1="0" y1="600" x2="0" y2="752" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#FFC890" stop-opacity="0"/><stop offset="1" stop-color="#FFD8A8" stop-opacity="1"/></linearGradient>`);
  // The glow beneath: hot at the core, ember, then gone.
  if (glow === 'mockup') {
    out.push(`<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F7A45C" stop-opacity=".95"/><stop offset=".4" stop-color="#E0703A" stop-opacity=".55"/><stop offset=".75" stop-color="#C9542A" stop-opacity=".14"/><stop offset="1" stop-color="#C9542A" stop-opacity="0"/></radialGradient>`);
  } else if (tinted) {
    out.push(`<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity=".4"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`);
  } else {
    out.push(`<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB46C" stop-opacity="1"/><stop offset=".3" stop-color="#F08848" stop-opacity=".8"/><stop offset=".6" stop-color="#D9612F" stop-opacity=".34"/><stop offset="1" stop-color="#C9542A" stop-opacity="0"/></radialGradient>`);
    out.push(`<radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF0D8" stop-opacity="1"/><stop offset=".35" stop-color="#FFC07E" stop-opacity=".9"/><stop offset="1" stop-color="#F59A58" stop-opacity="0"/></radialGradient>`);
    out.push(`<radialGradient id="spill" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F2A35E" stop-opacity="${dark ? '.5' : '.42'}"/><stop offset=".55" stop-color="#E8763C" stop-opacity=".16"/><stop offset="1" stop-color="#E0703A" stop-opacity="0"/></radialGradient>`);
  }
  const wispColor = tinted ? '#FFFFFF' : dark ? '#F8F4EE' : '#C2A988';
  out.push(`<linearGradient id="wisp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${wispColor}" stop-opacity="${dark ? '.62' : '1'}"/><stop offset=".7" stop-color="${wispColor}" stop-opacity="${dark ? '.3' : '.45'}"/><stop offset="1" stop-color="${wispColor}" stop-opacity="0"/></linearGradient>`);
  out.push(`<filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`);
  out.push(`<filter id="b12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>`);
  out.push(`<filter id="b24" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>`);
  out.push(`<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.85"/></filter>`);
  // Flecks: the pale crystals in a diabase sauna stone, sparse and soft.
  out.push(`<filter id="fleck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".16" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 14 -9.2"/></filter>`);
  out.push(`<path id="sp" d="${d}"/>`);
  out.push(`<clipPath id="sc"><use href="#sp"/></clipPath>`);
  out.push('</defs>');

  if (background && !tinted) out.push(`<rect width="1024" height="1024" fill="url(#bg)"/>`);
  // The sauna wall, very faint.
  if (background && slats && !tinted && detail === 'full') {
    const xs = [138, 296, 450, 612, 768, 924];
    out.push(`<g opacity="${dark ? '.03' : '.06'}" fill="${dark ? '#F8F4EE' : '#A88F6A'}">${xs.map((x) => `<rect x="${x}" width="3" height="1024"/>`).join('')}</g>`);
  }

  if (!art) {
    out.push('</svg>');
    return out.join('\n');
  }
  out.push(`<g transform="${t}">`);
  // Heat beneath: a halo rising behind the stone's sides, the glow on the
  // floor, and a hot core right under the seat.
  if (glow === 'mockup') {
    out.push(`<ellipse cx="516" cy="716" rx="360" ry="140" fill="url(#glow)"/>`);
    out.push(`<ellipse cx="516" cy="726" rx="236" ry="26" fill="#FFB775" filter="url(#b12)"/>`);
  } else if (tinted) {
    out.push(`<ellipse cx="520" cy="742" rx="330" ry="104" fill="url(#glow)"/>`);
  } else {
    out.push(`<ellipse cx="516" cy="640" rx="360" ry="190" fill="url(#spill)"/>`);
    out.push(`<ellipse cx="520" cy="744" rx="${fav ? 340 : 360}" ry="${fav ? 118 : 106}" fill="url(#glow)"/>`);
    out.push(`<ellipse cx="516" cy="744" rx="${fav ? 250 : 230}" ry="${fav ? 34 : 26}" fill="url(#core)" filter="url(#b6)"/>`);
  }
  // The stone.
  out.push(`<use href="#sp" fill="url(#stone)"/>`);
  if (!tinted) {
    out.push(`<g clip-path="url(#sc)">`);
    // Warm light from below, then the bright seat line.
    if (glow !== 'mockup') out.push(`<rect x="200" y="540" width="640" height="230" fill="url(#under)"/>`);
    out.push(`<use href="#sp" fill="none" stroke="url(${glow === 'mockup' ? '#rimOld' : '#rim'})" stroke-width="${fav ? 30 : 22}" filter="url(#b6)"/>`);
    // Top light: a soft sheen on the dome, and a tighter glint.
    out.push(`<ellipse cx="452" cy="512" rx="190" ry="54" fill="#FFFFFF" opacity="${dark ? '.13' : '.12'}" filter="url(#b24)"/>`);
    if (detail === 'full' && glow !== 'mockup') {
      out.push(`<ellipse cx="410" cy="508" rx="70" ry="16" fill="#FFFFFF" opacity=".1" filter="url(#b6)"/>`);
      // A little texture: the stone's grain, very faint.
      out.push(`<rect x="230" y="420" width="580" height="340" filter="url(#grain)" opacity=".09"/>`);
      out.push(`<rect x="230" y="420" width="580" height="340" filter="url(#fleck)" opacity=".1"/>`);
    }
    out.push('</g>');
  } else {
    // Tinted: the heat line under the stone as a lighter band, so the mark still reads as warm from beneath.
    out.push(`<g clip-path="url(#sc)"><use href="#sp" fill="none" stroke="#FFFFFF" stroke-opacity=".9" stroke-width="36" filter="url(#b6)"/></g>`);
  }

  // Two steam wisps. Bolder at small sizes; gone on the favicon.
  if (!fav) {
    const w = detail === 'small' ? [30, 28] : [24, 22];
    out.push(`<g fill="none" stroke="url(#wisp)" stroke-linecap="round">`);
    out.push(`<path d="M452 410c-28-34 26-58 4-98s-2-62 18-84" stroke-width="${w[0]}"/>`);
    out.push(`<path d="M578 404c-26-32 24-54 4-90s-2-56 14-74" stroke-width="${w[1]}"/>`);
    out.push('</g>');
  }
  out.push('</g>');
  out.push('</svg>');
  return out.join('\n');
}

/** The explorations, in the order they're shown. */
export const candidates = [
  { id: 'A', label: 'A. Mockup (the puck)', opts: { stone: 'puck', glow: 'mockup' } },
  { id: 'B', label: 'B. Long river stone', opts: { stone: 'river', artScale: 1.12 } },
  { id: 'C', label: 'C. Faceted sauna stone', opts: { stone: 'sauna', artScale: 1.12 } },
  { id: 'D', label: 'D. Domed river stone', opts: { stone: 'riverTall', artScale: 1.12 } },
];

/** The pick (see design/brand/icon-explorations.png): D. */
export const chosen = { stone: 'riverTall', artScale: 1.12 };
