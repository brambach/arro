import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { palette } from '../theme/tokens';
import { emberPeakMs, timing, useReduceMotion } from '../theme/motion';
import { Avatar } from './Avatar';

/**
 * Your avatar on Today's header, with a thin ember ring for this week: it
 * fills by the share of the goal you've reached (2 of 3 is two thirds). When
 * a save moves it on, the ring fills on the `ember` curve, timed with the
 * slat's dot igniting (Key motion moment 5). A kept week closes the ring.
 *
 * The ring sits outside the avatar, so the avatar is the same size as anywhere
 * else and nothing moves when the ring changes.
 */
type Props = {
  name: string;
  color: string;
  photoUri?: string | null;
  /** 0 to 1. */
  progress: number;
  size?: number;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const STROKE = 2;
const GAP = 3;

export function AvatarProgress({ name, color, photoUri, progress, size = 40 }: Props) {
  const reduceMotion = useReduceMotion();
  const box = size + (GAP + STROKE) * 2;
  const r = size / 2 + GAP + STROKE / 2;
  const length = 2 * Math.PI * r;
  const p = useSharedValue(clamp(progress));
  const before = useRef(progress);

  useEffect(() => {
    if (before.current === progress) return;
    const grew = progress > before.current;
    before.current = progress;
    if (reduceMotion !== false || !grew) {
      p.set(withTiming(clamp(progress), timing.utility));
      return;
    }
    // Fills as the dot ignites: starting together, landing at the dot's peak.
    p.set(withDelay(Math.max(0, emberPeakMs - timing.ember.duration / 2), withTiming(clamp(progress), timing.ember)));
  }, [progress, reduceMotion, p]);

  // A round cap on an empty ring would still draw a dot, so it hides at 0.
  const ring = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value), strokeOpacity: p.value > 0.005 ? 1 : 0 }));

  return (
    <View style={{ width: box, height: box }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        <Circle cx={box / 2} cy={box / 2} r={r} stroke={palette.grain} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={box / 2}
          cy={box / 2}
          r={r}
          stroke={palette.ember}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={ring}
          // Start at twelve o'clock.
          transform={`rotate(-90 ${box / 2} ${box / 2})`}
        />
      </Svg>
      <View style={[styles.center, { width: box, height: box }]}>
        <Avatar name={name} color={color} photoUri={photoUri} size={size} />
      </View>
    </View>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
