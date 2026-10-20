/**
 * Procedural materials, ported from the approved mockups (spec mockups,
 * src/common.js): wood grain, the wall's vertical slats, frost stipple and steam
 * wisps. Everything is seeded, so a slat looks the same on every render and
 * every phone. Pure functions, no colors (those live in src/theme).
 */

/** A small linear congruential generator: the mockups' `rng`. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type GrainLine = { d: string; opacity: number; width: number };
export type Knot = { cx: number; cy: number; rx: number; ry: number; coreRx: number };

/**
 * Wavy grain lines across a w x h slat. `opacity` is a multiplier for the wood's
 * grain opacity. A knot appears on about two slats in three.
 */
export function grain(w: number, h: number, seed: number, lines = 7, knot = true): { lines: GrainLine[]; knot: Knot | null } {
  const r = rng(seed);
  const out: GrainLine[] = [];
  for (let i = 0; i < lines; i++) {
    let y = ((i + 0.5 + (r() - 0.5) * 0.6) * h) / lines;
    let d = `M-4 ${y.toFixed(1)}`;
    const segs = 4 + Math.floor(r() * 3);
    for (let s = 1; s <= segs; s++) {
      const x = (w * s) / segs + 4;
      const yy = y + (r() - 0.5) * h * 0.18;
      const cx = x - w / segs / 2;
      const cy = y + (r() - 0.5) * h * 0.3;
      d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${yy.toFixed(1)}`;
      y = yy;
    }
    out.push({ d, opacity: 0.5 + r() * 0.7, width: 0.5 + r() * 0.7 });
  }
  let k: Knot | null = null;
  if (knot && r() > 0.35) {
    k = {
      cx: w * (0.2 + r() * 0.6),
      cy: h * (0.35 + r() * 0.3),
      rx: 4 + r() * 5,
      ry: 1.4 + r() * 1.2,
      coreRx: 1.6 + r() * 2,
    };
  }
  return { lines: out, knot: k };
}

/** Frost stipple for a frozen week: small dots scattered over w x h. */
export function frost(w: number, h: number, seed: number, count = 70) {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    cx: r() * w,
    cy: r() * h,
    r: 0.4 + r() * 0.7,
    opacity: 0.25 + r() * 0.4,
  }));
}

/**
 * The wall behind every screen: vertical lines about every `step` points with a
 * little random spacing, like the boards of a sauna wall.
 */
export function wallLines(width: number, seed: number, step = 28): number[] {
  const r = rng(seed);
  const xs: number[] = [];
  let x = 10 + r() * 10;
  while (x < width) {
    xs.push(Math.round(x * 10) / 10);
    x += step + (r() - 0.5) * 7;
  }
  return xs;
}

type Pt = [number, number];
type Cubic = [Pt, Pt, Pt, Pt];

function cubicLength([p0, p1, p2, p3]: Cubic, samples = 24): number {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    len += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
  }
  return len;
}

export type Wisp = { d: string; length: number };

/**
 * A steam wisp rising from (x, bottom) by `height`: a sinuous line of
 * `turns` S-bends that sways `sway` to each side. Returns the path and its
 * length, for drawing it with a stroke dash offset.
 */
export function wisp(x: number, bottom: number, height: number, seed: number, sway = 10, turns = 3): Wisp {
  const r = rng(seed);
  const seg = height / turns;
  let p: Pt = [x, bottom];
  let d = `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let length = 0;
  let side = r() > 0.5 ? 1 : -1;
  for (let i = 0; i < turns; i++) {
    // Sway narrows as the steam rises and thins.
    const s = sway * (1 - i / (turns + 1)) * (0.8 + r() * 0.4);
    const end: Pt = [x + (r() - 0.5) * sway * 0.6, p[1] - seg * (0.85 + r() * 0.3)];
    const c1: Pt = [p[0] + side * s, p[1] - seg * 0.35];
    const c2: Pt = [end[0] - side * s, end[1] + seg * 0.35];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
    length += cubicLength([p, c1, c2, end]);
    p = end;
    side = -side;
  }
  return { d, length: Math.ceil(length) };
}
