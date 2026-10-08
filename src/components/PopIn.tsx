import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';
import { springs, useReduceMotion } from '../theme/motion';

/**
 * Arrival for small, countable things (day dots, badges, milestones): scale up
 * from 0.5 on a light spring. Stagger with `delay`. Reduced Motion → appears.
 */
export function PopIn({ delay = 0, style, children, ...rest }: ViewProps & { delay?: number }) {
  const reduceMotion = useReduceMotion();
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      p.setValue(1);
      return;
    }
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(p, { toValue: 1, ...springs.pop, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [reduceMotion, p, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
