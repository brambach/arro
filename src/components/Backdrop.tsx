import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { contours } from '../theme/contours';
import { useReduceMotion } from '../theme/motion';

/** One tile of the map on screen, in points. Matches arrofamily.com on phones. */
const TILE = 520;
/** How strongly the contour lines show. Matches the map on arrofamily.com. */
const LINE_OPACITY = 0.13;
/** The tracing grid, in points. Finer looks smoother and costs more. */
const CELL = 10;
/**
 * How often the map is traced again. The lines move a point or two a second,
 * so eight frames a second reads as smooth and keeps the JS thread quiet.
 */
const FRAME_MS = 125;

/**
 * One clock for every backdrop, so the map doesn't jump when a screen is
 * pushed over another: both show the same moment of the same map.
 */
const EPOCH = Date.now();
const clock = () => (Date.now() - EPOCH) / 1000;

/** Marching squares: for each corner pattern, the edges its line crosses, in pairs (0 top, 1 right, 2 bottom, 3 left). */
const CROSS = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [0, 2], [0, 1, 2, 3], [1, 2], [1, 3], [0, 1], [3, 0], []];
/**
 * Loops with fewer points than this are specks where a bump just pokes over a
 * level. They'd flicker in and out as the map moves, so they're left out.
 */
const SPECK = 6;

/**
 * Traces the contour map over a width x height area at time t (seconds): the
 * same field, levels and line weights as the site (site/public/site.js), from
 * the recipe in theme/contours.ts. Cell crossings are chained into whole lines
 * and drawn as smooth curves. Returns SVG path data for the ordinary lines and
 * for the index lines.
 */
function trace(width: number, height: number, t: number) {
  const { waves, lo, hi, levels } = contours;
  const step = (hi - lo) / levels;
  const tau = Math.PI * 2;
  const nx = Math.ceil(width / CELL) + 1;
  const ny = Math.ceil(height / CELL) + 1;
  const grid = new Float32Array(nx * ny);
  for (const [kx, ky, a, p, s] of waves) {
    const sx = new Float32Array(nx);
    const cx = new Float32Array(nx);
    for (let i = 0; i < nx; i++) {
      const x = (tau * kx * i * CELL) / TILE;
      sx[i] = Math.sin(x);
      cx[i] = Math.cos(x);
    }
    for (let j = 0; j < ny; j++) {
      const y = (tau * ky * j * CELL) / TILE + p + s * t;
      const ac = a * Math.cos(y);
      const as = a * Math.sin(y);
      const o = j * nx;
      for (let i = 0; i < nx; i++) grid[o + i] += ac * sx[i] + as * cx[i];
    }
  }

  // Each crossing is keyed by its grid edge and level, so the two cells either
  // side of an edge find the same point.
  const at = new Map<number, [number, number]>();
  const adj = new Map<number, number[]>();
  const join = (p: number, q: number) => {
    const a = adj.get(p);
    if (a) a.push(q);
    else adj.set(p, [q]);
    const b = adj.get(q);
    if (b) b.push(p);
    else adj.set(q, [p]);
  };
  for (let j = 0; j < ny - 1; j++) {
    const o = j * nx;
    const y0 = j * CELL;
    for (let i = 0; i < nx - 1; i++) {
      const a = grid[o + i];
      const b = grid[o + i + 1];
      const c = grid[o + nx + i + 1];
      const d = grid[o + nx + i];
      const from = Math.max(0, Math.ceil((Math.min(a, b, c, d) - lo) / step - 0.5));
      const to = Math.min(levels - 1, Math.ceil((Math.max(a, b, c, d) - lo) / step - 0.5) - 1);
      const x0 = i * CELL;
      for (let k = from; k <= to; k++) {
        const v = lo + step * (k + 0.5);
        const point = (side: number) => {
          let key: number;
          let x: number;
          let y: number;
          switch (side) {
            case 0: key = (o + i) * 2; x = x0 + (CELL * (v - a)) / (b - a); y = y0; break;
            case 1: key = (o + i + 1) * 2 + 1; x = x0 + CELL; y = y0 + (CELL * (v - b)) / (c - b); break;
            case 2: key = (o + nx + i) * 2; x = x0 + (CELL * (v - d)) / (c - d); y = y0 + CELL; break;
            default: key = (o + i) * 2 + 1; x = x0; y = y0 + (CELL * (v - a)) / (d - a);
          }
          key = key * levels + k;
          if (!at.has(key)) at.set(key, [x, y]);
          return key;
        };
        const pairs = CROSS[(a > v ? 1 : 0) | (b > v ? 2 : 0) | (c > v ? 4 : 0) | (d > v ? 8 : 0)];
        for (let e = 0; e < pairs.length; e += 2) join(point(pairs[e]), point(pairs[e + 1]));
      }
    }
  }

  const out = ['', ''];
  const seen = new Set<number>();
  const r = (n: number) => Math.round(n * 10) / 10;
  const walk = (start: number, closed: boolean) => {
    const pts: [number, number][] = [];
    let cur: number | undefined = start;
    while (cur !== undefined) {
      seen.add(cur);
      pts.push(at.get(cur)!);
      cur = adj.get(cur)!.find((n) => !seen.has(n));
    }
    if (closed && pts.length < SPECK) return;
    // Smooth curves through the points: quadratic curves between midpoints.
    const n = pts.length;
    const mid = (i: number) => {
      const p = pts[i % n];
      const q = pts[(i + 1) % n];
      return `${r((p[0] + q[0]) / 2)} ${r((p[1] + q[1]) / 2)}`;
    };
    const q = (i: number) => `Q${r(pts[i][0])} ${r(pts[i][1])} ${mid(i)}`;
    let d: string;
    if (n < 3) {
      d = `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}`;
    } else if (closed) {
      d = `M${mid(n - 1)}`;
      for (let i = 0; i < n; i++) d += q(i);
      d += 'Z';
    } else {
      d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
      for (let i = 1; i < n - 1; i++) d += q(i);
      d += `L${r(pts[n - 1][0])} ${r(pts[n - 1][1])}`;
    }
    out[(start % levels) % 4 === 3 ? 1 : 0] += d;
  };
  // Lines that run off the screen first (they have a loose end), then loops.
  for (const [key, ns] of adj) if (ns.length === 1 && !seen.has(key)) walk(key, false);
  for (const key of adj.keys()) if (!seen.has(key)) walk(key, true);
  return { lines: out[0], index: out[1] };
}

/** True while this screen is the one on top. Always true outside a navigator. */
function useFocused() {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
}

type Props = {
  /**
   * Where the warm light comes from: dawn in the top-right corner (every
   * paper screen), or dusk low along the bottom (milestones, the end of a day
   * kept).
   */
  light?: 'dawn' | 'dusk';
};

/**
 * The page behind every paper screen, the same as arrofamily.com: a contour
 * map, faint topographic lines like the map of a walk, with a warm light over
 * it. The lines drift and reshape very slowly, like a tide map: the field from
 * theme/contours.ts (written by site/scenes/contours.mjs) is traced again a few
 * times a second while the screen is on top and the app is open. With Reduce
 * Motion it holds still. Glass cards that scroll over it pick up the lines and
 * the light. Faint on purpose; it's paper, not a picture.
 */
export function Backdrop({ light = 'dawn' }: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const focused = useFocused();
  const [t, setT] = useState(clock);
  const live = focused && reduceMotion === false;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (AppState.currentState === 'active') setT(clock());
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [live]);

  const { lines, index } = useMemo(() => trace(width, height, t), [width, height, t]);
  const scale = TILE / contours.size;
  const glowHeight = Math.round(width * 1.25);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="sun" cx="82%" cy="2%" rx="90%" ry="70%" fx="82%" fy="2%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
            <Stop offset="0.5" stopColor={colors.primary} stopOpacity={0.08} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sage" cx="0%" cy="38%" rx="70%" ry="45%" fx="0%" fy="38%">
            <Stop offset="0" stopColor={colors.kept} stopOpacity={0.07} />
            <Stop offset="1" stopColor={colors.kept} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="dusk" cx="50%" cy="100%" rx="75%" ry="60%" fx="50%" fy="100%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.2} />
            <Stop offset="0.45" stopColor={colors.primary} stopOpacity={0.08} />
            <Stop offset="0.75" stopColor={colors.freeze} stopOpacity={0.04} />
            <Stop offset="1" stopColor={colors.freeze} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <G fill="none" stroke={colors.shadowWarm} strokeOpacity={LINE_OPACITY} strokeLinejoin="round" strokeLinecap="round">
          <Path d={lines} strokeWidth={contours.lineWidth * scale} />
          <Path d={index} strokeWidth={contours.indexWidth * scale} />
        </G>
        {light === 'dawn' ? (
          <>
            <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sun)" />
            <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sage)" />
          </>
        ) : (
          <Rect x="0" y={height - glowHeight} width={width} height={glowHeight} fill="url(#dusk)" />
        )}
      </Svg>
    </View>
  );
}
