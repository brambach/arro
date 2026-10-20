import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { moments, timing, useReduceMotion } from '../theme/motion';

/**
 * One item of a screen's arrival (Key motion moment 2): it rises 12 pt into
 * place and fades in on the `settle` curve, `index` x 70 ms after the first.
 * Plays once, when it mounts with `play` on (or when `play` turns on).
 *
 * While Reduce Motion is still being read it holds, hidden, so nothing flashes
 * in finished and then animates. With Reduce Motion on it's a short crossfade.
 * `play={false}` and `still` show the finished state at once (a screen that has
 * already arrived, a skeleton swapping for content).
 */
type Props = {
  index: number;
  play?: boolean;
  /** Skip the arrival: shown, finished, from the first frame. */
  still?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Arrive({ index, play = true, still = false, children, style }: Props) {
  const reduceMotion = useReduceMotion();
  const p = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still || !play || reduceMotion === null) return;
    if (reduceMotion) {
      p.set(withTiming(1, timing.utility));
      return;
    }
    const { duration, easing, stagger } = moments.todayArrival;
    p.set(withDelay(index * stagger, withTiming(1, { duration, easing })));
  }, [still, play, reduceMotion, index, p]);

  const rise = moments.todayArrival.rise;
  const reduced = reduceMotion === true;
  const s = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: reduced ? 0 : (1 - p.value) * rise }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}
