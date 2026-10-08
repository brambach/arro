import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, EasingFunction, ViewProps } from 'react-native';

/**
 * Entry primitive (Motion Handoff Spec §1): opacity 0→1 + translateY 8→0,
 * 220–320ms, Easing.out(cubic). Stagger via `delay` (rows 40ms apart).
 * Reduced Motion → cross-fade only, no rise. Resolves to a calm final state.
 */
type Props = ViewProps & {
  delay?: number;
  rise?: number;
  duration?: number;
  /** Defaults to the entry curve; screens' one big arrival passes motion.statement's. */
  easing?: EasingFunction;
};

export function FadeInView({ delay = 0, rise = 8, duration = 280, easing = Easing.out(Easing.cubic), style, children, ...rest }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => mounted && setReduceMotion(enabled))
      // If the probe ever rejects, fall back to animating — never leave content invisible.
      .catch(() => mounted && setReduceMotion(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 120 : duration,
      delay: reduceMotion ? 0 : delay,
      easing,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, progress, delay, duration, easing]);

  const translateY = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]} {...rest}>
      {children}
    </Animated.View>
  );
}
