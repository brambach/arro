import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, Text, TextStyle } from 'react-native';

/**
 * Streak count-up (Spec §7): animate 0 → value once, easeOutCubic, then rest.
 * Falls back to the final value instantly when Reduce Motion is on.
 */
type Props = {
  value: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  suffix?: string;
};

export function CountUp({ value, duration = 900, delay = 0, style, suffix = '' }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let listenerId: string | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        setDisplay(value);
        return;
      }
      listenerId = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
      Animated.timing(anim, {
        toValue: value,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    // Cleanup must be returned synchronously from the effect (not from inside
    // the promise) so React actually runs it — detaches the listener + stops.
    return () => {
      cancelled = true;
      if (listenerId) anim.removeListener(listenerId);
      anim.stopAnimation();
    };
  }, [value, duration, delay, anim]);

  return (
    <Text style={style} allowFontScaling>
      {display}
      {suffix}
    </Text>
  );
}
