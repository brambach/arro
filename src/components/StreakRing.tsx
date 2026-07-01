import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../theme/tokens';

/**
 * StreakRing (Spec §8) — progress ring showing value/goal (the conic ring in
 * the design). Inner circle hosts arbitrary content (goal number, n/total, …).
 */
type Props = {
  value: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  track?: string;
  innerBg?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function StreakRing({
  value,
  goal,
  size = 74,
  strokeWidth = 7,
  color = colors.primary,
  track = colors.ringTrack,
  innerBg = colors.warmFill,
  children,
  style,
}: Props) {
  const progress = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const innerDiameter = size - strokeWidth * 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <View
            style={{
              width: innerDiameter,
              height: innerDiameter,
              borderRadius: innerDiameter / 2,
              backgroundColor: innerBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
