import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, Text, TextStyle } from 'react-native';
import { easings, useReduceMotion } from '../theme/motion';

/**
 * A number that counts up to its value once, on arrival. Keeps the value's
 * decimal places ("86.4" counts in tenths). Reduced Motion → shows the value.
 */
export function CountUp({
  value,
  delay = 0,
  duration = 700,
  style,
  children,
}: {
  value: string;
  delay?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const target = parseFloat(value);
  const decimals = value.includes('.') ? value.split('.')[1].length : 0;
  const p = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(reduceMotion ? value : (0).toFixed(decimals));

  useEffect(() => {
    if (reduceMotion === null || Number.isNaN(target)) return;
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const id = p.addListener(({ value: v }) => setShown((target * v).toFixed(decimals)));
    const a = Animated.timing(p, { toValue: 1, duration, delay, easing: easings.out, useNativeDriver: false });
    a.start(() => setShown(value));
    return () => {
      a.stop();
      p.removeListener(id);
    };
  }, [reduceMotion, p, target, decimals, value, delay, duration]);

  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {Number.isNaN(target) ? value : shown}
      {children}
    </Text>
  );
}
