import React, { useEffect, useId, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { alpha, gradients, palette, radii, space } from '../theme/tokens';
import { emberPeakMs, moments, timing, useReduceMotion } from '../theme/motion';

/**
 * The ember dot: one counted day this week. Lit, it's a little glowing coal
 * (lit from the upper left, with a soft heat halo). Unlit, it's a dent in the
 * wood. When a dot goes from unlit to lit after it's on screen, it ignites with
 * the `ember` overshoot, and `onIgnitePeak` fires at the overshoot's peak, which
 * is where the save haptic belongs.
 *
 * Sizes: `large` 14 (Today's slat), `small` 9 (the wall's current week),
 * `mini` 9 flat with no glow (row status).
 */
export type DotSize = 'large' | 'small' | 'mini';

const DIAMETER: Record<DotSize, number> = { large: 14, small: 9, mini: 9 };
/** The halo reaches this far past the dot. */
const HALO: Record<DotSize, number> = { large: 9, small: 6, mini: 0 };

export function EmberDot({
  lit,
  size = 'large',
  onIgnitePeak,
}: {
  lit: boolean;
  size?: DotSize;
  onIgnitePeak?: () => void;
}) {
  const d = DIAMETER[size];
  const halo = HALO[size];
  const reduceMotion = useReduceMotion();
  const id = `ember${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shown = useSharedValue(lit ? 1 : 0);
  const scale = useSharedValue(1);
  const wasLit = useRef(lit);
  const peakRef = useRef(onIgnitePeak);

  useEffect(() => {
    peakRef.current = onIgnitePeak;
  }, [onIgnitePeak]);

  useEffect(() => {
    const before = wasLit.current;
    wasLit.current = lit;
    if (lit === before) return;
    if (!lit) {
      shown.set(withTiming(0, timing.utility));
      return;
    }
    if (reduceMotion !== false) {
      shown.set(withTiming(1, timing.utility));
      const t = setTimeout(() => peakRef.current?.(), timing.utility.duration);
      return () => clearTimeout(t);
    }
    // Ignite: from a spark to a coal, overshooting a little, as the ember curve does.
    scale.set(moments.checkInIgnite.fromScale);
    shown.set(withTiming(1, timing.utility));
    scale.set(withTiming(1, timing.ember));
    // The haptic fires at the overshoot's peak, not at the start.
    const t = setTimeout(() => peakRef.current?.(), emberPeakMs);
    return () => clearTimeout(t);
  }, [lit, reduceMotion, shown, scale]);

  const litStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: scale.value }] }));

  if (size === 'mini') {
    return (
      <View style={[styles.mini, { width: d, height: d }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.miniOn, litStyle]} />
      </View>
    );
  }

  const box = d + halo * 2;
  return (
    <View style={{ width: d, height: d }}>
      <View style={[styles.dent, { width: d, height: d }]} />
      <Animated.View style={[styles.lit, { left: -halo, top: -halo, width: box, height: box }, litStyle]}>
        <Svg width={box} height={box}>
          <Defs>
            <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.3" stopColor={palette.glow} stopOpacity={0.5} />
              <Stop offset="1" stopColor={palette.glow} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`${id}c`} cx="40%" cy="35%" r="65%">
              {gradients.emberDot.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </RadialGradient>
          </Defs>
          <Circle cx={box / 2} cy={box / 2} r={box / 2} fill={`url(#${id}h)`} />
          <Circle cx={box / 2} cy={box / 2} r={d / 2 + 2.5} fill={palette.ember} fillOpacity={0.12} />
          <Circle cx={box / 2} cy={box / 2} r={d / 2} fill={`url(#${id}c)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * A row of ember dots: `filled` of `count` lit. A dot that newly lights
 * ignites; pass `onIgnitePeak` to time the save haptic to it.
 */
export function EmberDots({
  count,
  filled,
  size = 'large',
  onIgnitePeak,
  style,
}: {
  count: number;
  filled: number;
  size?: DotSize;
  onIgnitePeak?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const gap = size === 'large' ? space.s24 : size === 'small' ? space.s12 : space.s4;
  return (
    <View
      style={[styles.row, { gap }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${Math.min(filled, count)} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <EmberDot key={i} lit={i < filled} size={size} onIgnitePeak={onIgnitePeak} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dent: {
    position: 'absolute',
    borderRadius: radii.round,
    backgroundColor: alpha.dotEmpty,
    boxShadow: `inset 0px 1px 1.5px 0px ${alpha.dotEmptyShade}`,
  },
  lit: { position: 'absolute' },
  mini: { borderRadius: radii.round, backgroundColor: palette.aspen, boxShadow: `inset 0px 0.5px 1px 0px ${alpha.dotEmptyShade}` },
  miniOn: { borderRadius: radii.round, backgroundColor: palette.ember },
});
