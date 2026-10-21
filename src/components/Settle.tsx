import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { distances, stagger, timing, useReduceMotion } from '../theme/motion';

/**
 * One part of a screen's single `settle` arrival (spec, Motion): it rises
 * `distances.arrive` into place and fades in over 1100 ms, `index` times 70 ms
 * after the first part. Plays once, on mount, or when `go` turns true.
 *
 * It holds at opacity 0 until Reduce Motion has answered, so nothing flashes
 * finished and then animates. With Reduce Motion on it's a 240 ms crossfade,
 * no rise. Opacity and transform only.
 */
type Props = {
  children: React.ReactNode;
  index?: number;
  /** Hold until this is true (Welcome waits for the splash). */
  go?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Settle({ children, index = 0, go = true, style }: Props) {
  const reduceMotion = useReduceMotion();
  const o = useSharedValue(0);

  useEffect(() => {
    if (!go || reduceMotion === null) return;
    o.set(reduceMotion ? withTiming(1, timing.utility) : withDelay(index * stagger, withTiming(1, timing.settle)));
  }, [go, reduceMotion, index, o]);

  const rise = reduceMotion ? 0 : distances.arrive;
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - o.value) * rise }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
