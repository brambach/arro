import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ViewProps } from 'react-native';

/**
 * Entrance motion (Spec §7): cards fade in and rise 14pt over ~520ms
 * with cubic-bezier(.2,.7,.3,1). Runs once on mount; base state stays visible.
 * Honours the OS "Reduce Motion" setting.
 */
type Props = ViewProps & {
  delay?: number;
  rise?: number;
  duration?: number;
};

export function FadeInView({
  delay = 0,
  rise = 14,
  duration = 520,
  style,
  children,
  ...rest
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.bezier(0.2, 0.7, 0.3, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, progress, delay, duration]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [rise, 0],
              }),
            },
          ],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
