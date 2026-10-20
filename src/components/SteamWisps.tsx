import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { alpha } from '../theme/tokens';
import { easing, loops, moments, timing, useReduceMotion } from '../theme/motion';
import { wisp, Wisp } from './material';
import { useScreenVisible } from './useScreenVisible';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Steam: soft wisps drawn as strokes, each a wide faint stroke under a narrower
 * one (React Native SVG has no blur, so the softness is layered).
 *
 * - `draw`: the wisps draw upward from their base with a stroke dash offset
 *   over `drawDuration`, then keep drifting. The splash uses this.
 * - Otherwise they're already there and drift slowly (`steam-drift`).
 * - `burstKey`: each new value throws löyly: a quick burst of wisps rising
 *   from the bottom and thinning out. No data, just delight.
 *
 * Drift pauses when the screen isn't visible. With Reduce Motion the wisps are
 * drawn and still, and a burst is a short fade.
 */
type Props = {
  width: number;
  height: number;
  tone?: 'light' | 'dark';
  /** Where the wisps stand, as fractions of the width. */
  columns?: number[];
  /** The wisps' base, as a fraction of the height from the top. */
  base?: number;
  /** How far they rise, as a fraction of the height. */
  rise?: number;
  draw?: boolean;
  drawDuration?: number;
  drawDelay?: number;
  burstKey?: number;
  /** Stroke width of the core line; the soft halo is about 2.5 times it. */
  thickness?: number;
  /** How far each wisp sways to either side, in points. */
  sway?: number;
};

export function SteamWisps({
  width,
  height,
  tone = 'light',
  columns = [0.36, 0.5, 0.64],
  base = 0.9,
  rise = 0.5,
  draw = false,
  drawDuration = moments.splash.wisps.duration,
  drawDelay = 0,
  burstKey = 0,
  thickness = 6,
  sway = 16,
}: Props) {
  const color = tone === 'light' ? alpha.wispLight : alpha.wispDark;
  const paths = useMemo(
    () => columns.map((c, i) => wisp(width * c, height * base, height * rise * (0.85 + (i % 2) * 0.15), 11 + i * 7, sway)),
    [columns, width, height, base, rise, sway],
  );
  return (
    <View style={[StyleSheet.absoluteFill, styles.box]} pointerEvents="none">
      <Drift>
        <Svg width={width} height={height}>
          {paths.map((p, i) => (
            <DrawnWisp
              key={i}
              wisp={p}
              color={color}
              thickness={thickness}
              draw={draw}
              duration={drawDuration}
              delay={drawDelay + i * moments.wispStagger}
            />
          ))}
        </Svg>
      </Drift>
      {burstKey > 0 ? <Burst key={burstKey} width={width} height={height} color={color} thickness={thickness} /> : null}
    </View>
  );
}

/** The slow drift: up a little and back, breathing, while visible. */
function Drift({ children }: { children: React.ReactNode }) {
  const visible = useScreenVisible();
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!visible || reduceMotion !== false) {
      cancelAnimation(t);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: loops.steamDrift.duration / 2, easing: loops.steamDrift.easing }), -1, true));
    return () => cancelAnimation(t);
  }, [visible, reduceMotion, t]);
  const s = useAnimatedStyle(() => ({
    opacity: 1 - 0.25 * t.value,
    transform: [{ translateY: -loops.steamDrift.distance * t.value }],
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, s]}>{children}</Animated.View>;
}

function DrawnWisp({
  wisp: w,
  color,
  thickness,
  draw,
  duration,
  delay,
}: {
  wisp: Wisp;
  color: string;
  thickness: number;
  draw: boolean;
  duration: number;
  delay: number;
}) {
  const reduceMotion = useReduceMotion();
  const offset = useSharedValue(draw ? w.length : 0);
  useEffect(() => {
    if (!draw) return;
    if (reduceMotion !== false) {
      offset.set(0);
      return;
    }
    offset.set(withDelay(delay, withTiming(0, { duration, easing: moments.splash.wisps.easing })));
    // Draws once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <G>
      <AnimatedPath
        d={w.d}
        stroke={color}
        strokeOpacity={0.14}
        strokeWidth={thickness * 3.2}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[w.length, w.length]}
        animatedProps={props}
      />
      <AnimatedPath
        d={w.d}
        stroke={color}
        strokeOpacity={0.4}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[w.length, w.length]}
        animatedProps={props}
      />
    </G>
  );
}

/** Throw löyly: wisps rise fast from the bottom edge and thin out. */
function Burst({ width, height, color, thickness }: { width: number; height: number; color: string; thickness: number }) {
  const { count } = moments.loylyBurst;
  const wisps = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = width * (0.18 + (0.64 * i) / Math.max(1, count - 1));
        return wisp(x, height + 20, height * 0.42, 101 + i * 13, 16, 3);
      }),
    [count, width, height],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {wisps.map((w, i) => (
        <BurstWisp key={i} wisp={w} index={i} width={width} height={height} color={color} thickness={thickness} />
      ))}
    </View>
  );
}

function BurstWisp({
  wisp: w,
  index,
  width,
  height,
  color,
  thickness,
}: {
  wisp: Wisp;
  index: number;
  width: number;
  height: number;
  color: string;
  thickness: number;
}) {
  const reduceMotion = useReduceMotion();
  const { duration, easing: rise, stagger, drawShare, fadeInShare } = moments.loylyBurst;
  const offset = useSharedValue(w.length);
  const y = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    const delay = index * stagger;
    if (reduceMotion !== false) {
      offset.set(0);
      o.set(withDelay(delay, withSequence(withTiming(0.8, timing.utility), withTiming(0, { duration: duration / 2 }))));
      return;
    }
    offset.set(withDelay(delay, withTiming(0, { duration: duration * drawShare, easing: rise })));
    y.set(withDelay(delay, withTiming(-height * moments.loylyBurst.rise, { duration, easing: rise })));
    o.set(withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: duration * fadeInShare, easing: easing.utility }),
        withTiming(0, { duration: duration * (1 - fadeInShare), easing: easing.leave }),
      ),
    ));
    // Plays once, on mount (each burst is a new mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s]}>
      <Svg width={width} height={height}>
        <AnimatedPath
          d={w.d}
          stroke={color}
          strokeOpacity={0.5}
          strokeWidth={thickness * 3}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={[w.length, w.length]}
          animatedProps={props}
        />
        <AnimatedPath
          d={w.d}
          stroke={color}
          strokeWidth={thickness * 1.2}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={[w.length, w.length]}
          animatedProps={props}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ box: { overflow: 'visible' } });
