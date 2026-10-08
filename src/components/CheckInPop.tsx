import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { motion, useReduceMotion } from '../theme/motion';

/**
 * The check-in moment (house "signature" overshoot, as on arrofamily.com):
 * when `play` turns true the child pops from 0.4 to full size with a small
 * overshoot, once. Otherwise it just sits there. Reduce Motion → no pop.
 */
export function CheckInPop({
  play,
  delay = 0,
  style,
  children,
}: {
  play: boolean;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const p = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!play || reduceMotion !== false) {
      p.setValue(1);
      return;
    }
    p.setValue(0);
    const a = Animated.timing(p, { toValue: 1, ...motion.signature, delay, useNativeDriver: true });
    a.start();
    // Never leave the tick half-popped if the effect re-runs mid-flight.
    return () => {
      a.stop();
      p.setValue(1);
    };
  }, [play, reduceMotion, p, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
