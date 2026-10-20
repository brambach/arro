import React, { memo, useEffect, useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { gradients, heatHot, heatSteps, Stop as GradientStop } from '../theme/tokens';
import { loops, moments, timing, useReduceMotion } from '../theme/motion';
import { useScreenVisible } from './useScreenVisible';

/**
 * The heat in the dark room: a radial glow rising from the bottom edge
 * (SVG radial gradients, transform and opacity only).
 *
 * - `rise`: on mount it rises into place over 1.4 s (the door closes).
 * - It breathes (`glow-breathe`: 6 s, opacity 0.55 to 0.75) while visible.
 * - `warmth` (0 to 5) is the heat step: one step every 5 minutes, each fading
 *   in more of a hotter layer until it's close to ember.
 * - `cooled` shifts it toward lake over 700 ms (finishing a session).
 *
 * With Reduce Motion it holds still at the middle of its breath and changes
 * by crossfade.
 */
type Props = {
  warmth?: number;
  cooled?: boolean;
  rise?: boolean;
  /** Breathing on or off (it also stops while the screen isn't visible). */
  breathe?: boolean;
  /** The area it fills; the window by default. */
  width?: number;
  height?: number;
};

export function HeatGlow({ warmth = 0, cooled = false, rise = false, breathe = true, ...size }: Props) {
  const win = useWindowDimensions();
  const width = size.width ?? win.width;
  const height = size.height ?? win.height;
  const visible = useScreenVisible();
  const reduceMotion = useReduceMotion();
  const still = reduceMotion !== false;
  const mid = (loops.glowBreathe.from + loops.glowBreathe.to) / 2;

  const lift = useSharedValue(rise ? 1 : 0);
  const shown = useSharedValue(rise ? 0 : 1);
  const breath = useSharedValue(mid);
  const hot = useSharedValue(heatSteps[clampStep(warmth)]);
  const cool = useSharedValue(cooled ? 1 : 0);

  useEffect(() => {
    if (!rise) return;
    const cfg = moments.doorCloses.glowRise;
    shown.set(withTiming(1, still ? timing.utility : cfg));
    lift.set(still ? 0 : withTiming(0, cfg));
    // Rises once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!breathe || !visible || still) {
      cancelAnimation(breath);
      breath.set(withTiming(mid, timing.utility));
      return;
    }
    const half = { duration: loops.glowBreathe.duration / 2, easing: loops.glowBreathe.easing };
    breath.set(withSequence(
      withTiming(loops.glowBreathe.from, half),
      withRepeat(withTiming(loops.glowBreathe.to, half), -1, true),
    ));
    return () => cancelAnimation(breath);
  }, [breathe, visible, still, breath, mid]);

  useEffect(() => {
    hot.set(withTiming(heatSteps[clampStep(warmth)], timing.settle));
  }, [warmth, hot]);

  useEffect(() => {
    cool.set(withTiming(cooled ? 1 : 0, moments.finishCool.glow));
  }, [cooled, cool]);

  const root = useAnimatedStyle(() => ({
    opacity: shown.value * breath.value,
    transform: [{ translateY: lift.value * height * 0.35 }],
  }));
  const warm = useAnimatedStyle(() => ({ opacity: 1 - cool.value }));
  const hotStyle = useAnimatedStyle(() => ({ opacity: hot.value * (1 - cool.value) }));
  const coolStyle = useAnimatedStyle(() => ({ opacity: cool.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, root]}>
        <Animated.View style={[StyleSheet.absoluteFill, warm]}>
          <GlowArt width={width} height={height} outer={gradients.heat} core={gradients.heatCore} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, hotStyle]}>
          <GlowArt width={width} height={height} outer={heatHot} core={gradients.heatCore} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, coolStyle]}>
          <GlowArt width={width} height={height} outer={gradients.cool} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function clampStep(w: number) {
  return Math.max(0, Math.min(heatSteps.length - 1, Math.round(w)));
}

/**
 * The mockup's two glows: a wide one centered just below the bottom edge (about
 * a screen and a half wide, almost the screen tall), and a brighter core close
 * to the floor. Sizes are shares of the area, from the 440 x 956 mockup.
 * The mockup draws them at 0.66; here that's the breath (0.55 to 0.75).
 */
const GlowArt = memo(function GlowArt({
  width,
  height,
  outer,
  core,
}: {
  width: number;
  height: number;
  outer: GradientStop[];
  core?: GradientStop[];
}) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id={`${id}o`} cx="50%" cy="50%" r="50%">
          {outer.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
          ))}
        </RadialGradient>
        {core ? (
          <RadialGradient id={`${id}c`} cx="50%" cy="50%" r="50%">
            {core.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
            ))}
          </RadialGradient>
        ) : null}
      </Defs>
      <Ellipse cx={width / 2} cy={height * 1.02} rx={width * 0.82} ry={height * 0.47} fill={`url(#${id}o)`} />
      {core ? <Ellipse cx={width / 2} cy={height * 1.01} rx={width * 0.43} ry={height * 0.21} fill={`url(#${id}c)`} /> : null}
    </Svg>
  );
});
