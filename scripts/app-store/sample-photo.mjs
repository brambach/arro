/**
 * The sample photo on the Feed screenshot: a lake at dusk from a sauna dock,
 * drawn here (no stock photo, no people) so the set can be rebuilt anywhere.
 * 1600 x 1200 (4:3, the app's session photo shape), returned as PNG bytes.
 */
import { Resvg } from '@resvg/resvg-js';

/** A small seeded random, so the photo comes out the same every time. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A ragged forest edge along `base`: spruces of mixed heights in clumps, as one path. */
function treeline(rand, { base, min, max, step, width, from = -20 }) {
  let d = `M ${from} ${base + 200} L ${from} ${base}`;
  let clump = 1;
  for (let x = from; x < width + 40; ) {
    if (rand() < 0.12) clump = 0.6 + rand() * 0.6;
    const h = (min + rand() * (max - min)) * clump + rand() * 10;
    const w = h * (0.3 + rand() * 0.14) + step * 0.1;
    const top = base - h;
    const lean = (rand() - 0.5) * w * 0.12;
    // A spruce: a spire with ragged tiers, wider toward the ground.
    const tiers = 4 + Math.floor(rand() * 3);
    const pts = [];
    for (let i = tiers; i >= 1; i--) {
      const f = i / (tiers + 1);
      const y = base - h * f;
      const half = (w * 0.5) * (1 - f) * (0.8 + rand() * 0.4);
      pts.push([x + w / 2 - half + lean * f, y + 4 * rand()]);
      pts.push([x + w / 2 - half * 0.45 + lean * f, y - h * 0.06]);
    }
    for (const [px, py] of pts) d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    d += ` L ${(x + w / 2 + lean).toFixed(1)} ${top.toFixed(1)}`;
    for (const [px, py] of pts.reverse()) d += ` L ${(2 * (x + w / 2) - px + 2 * lean * 0).toFixed(1)} ${py.toFixed(1)}`;
    d += ` L ${(x + w).toFixed(1)} ${(base - h * 0.05).toFixed(1)}`;
    x += w * (0.4 + rand() * 0.35);
  }
  return `${d} L ${width + 40} ${base + 200} Z`;
}

export function samplePhoto() {
  const W = 1600;
  const H = 1200;
  const horizon = 585;
  const rand = rng(7);
  const far = treeline(rand, { base: horizon, min: 30, max: 70, step: 20, width: W });
  const near = treeline(rand, { base: horizon + 4, min: 60, max: 135, step: 28, width: W * 0.6 });
  // The forest's mass under the spires: a low, lumpy band along the shore.
  let mass = `M -20 ${horizon + 4}`;
  for (let x = -20; x <= W + 40; x += 30) mass += ` Q ${x - 15} ${(horizon - 14 - 16 * rand() - (x < W * 0.6 ? 18 : 2)).toFixed(1)} ${x} ${(horizon - 8 - 10 * rand() - (x < W * 0.6 ? 14 : 0)).toFixed(1)}`;
  mass += ` L ${W + 40} ${horizon + 4} Z`;
  // Thin cloud streaks, lit from below.
  let clouds = '';
  for (let i = 0; i < 7; i++) {
    const cy = 90 + rand() * 300;
    clouds += `<ellipse cx="${(rand() * W).toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(180 + rand() * 320).toFixed(0)}" ry="${(8 + rand() * 14).toFixed(0)}" fill="${cy > 260 ? '#F7D2AE' : '#C9B9B4'}" opacity="${(0.35 + rand() * 0.3).toFixed(2)}"/>`;
  }

  // Ripples: short light strokes, denser and longer toward the dock.
  let ripples = '';
  for (let i = 0; i < 220; i++) {
    const t = rand();
    const y = horizon + 10 + t * t * (H - horizon - 10);
    const len = 12 + (20 + t * 220) * rand();
    // Most light sits under the low sun.
    const x = rand() < 0.55 ? 1090 - 260 * (0.3 + t) + rand() * 520 * (0.3 + t) - len / 2 : rand() * W;
    const o = 0.04 + 0.16 * rand();
    const hgt = 1 + t * 5;
    ripples += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(len / 2).toFixed(1)}" ry="${(hgt / 2).toFixed(1)}" fill="#FFE7C9" opacity="${o.toFixed(2)}"/>`;
  }

  // The dock: planks running from the bottom left out over the water.
  let planks = '';
  const dock = { nearL: -160, nearR: 720, farL: 290, farR: 450, top: 840 };
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = i / n;
    const b = (i + 1) / n;
    const xl = (t) => dock.nearL + (dock.nearR - dock.nearL) * t;
    const xf = (t) => dock.farL + (dock.farR - dock.farL) * t;
    const tone = ['#7A5038', '#84573C', '#6F4733', '#8B5E40'][i % 4];
    planks += `<path d="M ${xl(a) + 5} ${H + 2} L ${xf(a) + 0.8} ${dock.top} L ${xf(b) - 0.8} ${dock.top} L ${xl(b) - 5} ${H + 2} Z" fill="${tone}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7F93A6"/>
      <stop offset="0.45" stop-color="#C9B3A6"/>
      <stop offset="0.8" stop-color="#EBC29C"/>
      <stop offset="1" stop-color="#F3C08E"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.68" cy="0.97" r="0.6">
      <stop offset="0" stop-color="#FFE2B8" stop-opacity="0.95"/>
      <stop offset="0.35" stop-color="#F6BF8A" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#F6BF8A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E7B98F"/>
      <stop offset="0.25" stop-color="#B49482"/>
      <stop offset="1" stop-color="#4E5A62"/>
    </linearGradient>
    <radialGradient id="glint" cx="0.68" cy="0" r="0.55">
      <stop offset="0" stop-color="#FFE6C2" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#FFE6C2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="deck" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.3" stop-color="#FFD3A0" stop-opacity="0"/>
      <stop offset="1" stop-color="#FFD3A0" stop-opacity="0.22"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="#1E1A16" stop-opacity="0"/>
      <stop offset="1" stop-color="#1E1A16" stop-opacity="0.45"/>
    </radialGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="haze" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
    <filter id="reflect" x="-10%" y="-10%" width="120%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="3"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="wood" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.25 0.006" numOctaves="3" seed="5" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" result="ga"/>
      <feComposite in="ga" in2="SourceGraphic" operator="in" result="gc"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gc"/></feMerge>
    </filter>
    <filter id="cloud" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="14 6"/></filter>
    <filter id="steam" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
    <clipPath id="waterClip"><rect x="0" y="${horizon}" width="${W}" height="${H - horizon}"/></clipPath>
  </defs>
  <rect width="${W}" height="${horizon}" fill="url(#sky)"/>
  <rect width="${W}" height="${horizon}" fill="url(#sun)"/>
  <g filter="url(#cloud)">${clouds}</g>
  <ellipse cx="1090" cy="${horizon - 22}" rx="30" ry="30" fill="#FFF0D8" opacity="0.95" filter="url(#soft)"/>
  <path d="M -20 ${horizon - 30} C 300 ${horizon - 80}, 520 ${horizon - 70}, 760 ${horizon - 40} S 1300 ${horizon - 95}, 1640 ${horizon - 50} L 1640 ${horizon} L -20 ${horizon} Z" fill="#8E8E98" opacity="0.55" filter="url(#soft)"/>
  <path d="${far}" fill="#55595A" opacity="0.85" filter="url(#soft)"/>
  <path d="${mass}" fill="#343B37" filter="url(#soft)"/>
  <path d="${near}" fill="#2F3632" filter="url(#soft)"/>
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#water)"/>
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#glint)"/>
  <g clip-path="url(#waterClip)" opacity="0.55" filter="url(#reflect)">
    <g transform="translate(0 ${2 * horizon}) scale(1 -1)">
      <path d="${far}" fill="#4B4F50"/>
      <path d="${mass}" fill="#2E3431"/>
      <path d="${near}" fill="#2A302D"/>
    </g>
  </g>
  <path d="M 1060 ${horizon} L 1120 ${horizon} L 1330 ${H} L 850 ${H} Z" fill="#FFE3BC" opacity="0.16" filter="url(#haze)"/>
  ${ripples}
  <ellipse cx="760" cy="${horizon + 8}" rx="980" ry="26" fill="#F7E6D2" opacity="0.5" filter="url(#haze)"/>
  <path d="M ${dock.nearL} ${H + 2} L ${dock.farL} ${dock.top} L ${dock.farR} ${dock.top} L ${dock.nearR} ${H + 2} Z" fill="#2E1F17"/>
  <rect x="${dock.farL + 6}" y="${dock.top - 46}" width="12" height="60" rx="3" fill="#3A2A20"/>
  <rect x="${dock.farR - 18}" y="${dock.top - 46}" width="12" height="60" rx="3" fill="#3A2A20"/>
  <g filter="url(#wood)">${planks}</g>
  <path d="M ${dock.farL} ${dock.top} L ${dock.farR} ${dock.top} L ${dock.farR} ${dock.top + 10} L ${dock.farL} ${dock.top + 10} Z" fill="#3D2A20"/>
  <path d="M ${dock.nearL} ${H + 2} L ${dock.farL} ${dock.top} L ${dock.farR} ${dock.top} L ${dock.nearR} ${H + 2} Z" fill="url(#deck)"/>
  <path d="M ${dock.farL} ${dock.top} L ${dock.farR} ${dock.top} L ${dock.nearR} ${H + 2} L ${dock.nearL} ${H + 2} Z" fill="url(#rim)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.1"/>
</svg>`;
  return new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
}
