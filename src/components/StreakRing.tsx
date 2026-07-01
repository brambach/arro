import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * StreakRing — progress ring for the Today summary. Fill primitive
 * (Motion §2): strokeDashoffset sweeps from empty → target over ~600ms
 * ease-out, once. Reduced Motion → render at the final value, no sweep.
 */
type Props = {
  value: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function StreakRing({
  value,
  goal,
  size = 84,
  strokeWidth = 9,
  color = colors.primary,
  track = '#F0E7D8',
  children,
  style,
}: Props) {
  const progress = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const target = circumference * (1 - progress);

  const offset = useRef(new Animated.Value(circumference)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let m = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => m && setReduceMotion(v));
    return () => {
      m = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      offset.setValue(target);
      return;
    }
    const anim = Animated.timing(offset, {
      toValue: target,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, target, offset]);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {children ? (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.center}>{children}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
