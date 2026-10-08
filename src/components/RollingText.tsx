import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { motion, useReduceMotion } from '../theme/motion';

/**
 * Text that rolls when it changes: the old value lifts out, the new one rises
 * in from below (the streak counter on arrofamily.com does the same, 24 → 25).
 * First render just shows the value. Reduce Motion → swaps in place.
 */
export function RollingText({ value, style }: { value: string; style?: StyleProp<TextStyle> }) {
  const reduceMotion = useReduceMotion();
  const [shown, setShown] = useState(value);
  const [leaving, setLeaving] = useState<string | null>(null);
  const p = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (value === shown) return;
    if (reduceMotion !== false) {
      p.setValue(1);
      setLeaving(null);
      setShown(value);
      return;
    }
    setLeaving(shown);
    setShown(value);
    p.setValue(0);
    const a = Animated.timing(p, { toValue: 1, ...motion.statement, useNativeDriver: true });
    a.start(() => setLeaving(null));
    return () => {
      a.stop();
      p.setValue(1);
    };
    // `shown` is what's on screen now; only a new `value` starts a roll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduceMotion]);

  const lift = p.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  return (
    <View style={styles.clip}>
      <Animated.Text
        style={[
          style,
          { opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
        ]}
      >
        {shown}
      </Animated.Text>
      {leaving !== null ? (
        <Animated.Text
          style={[
            style,
            StyleSheet.absoluteFill,
            {
              opacity: p.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }),
              transform: [{ translateY: Animated.multiply(lift, 18) }],
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {leaving}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden', alignSelf: 'flex-start' } });
