import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../../theme/tokens';
import { wordmark } from './wordmarkPaths';

/**
 * The wordmark, "saunafam" in Fraunces Soft 600, outlined (assets/brand/wordmark.svg).
 *
 * `fontSize` is the size it's set at, in points. `spacing`, if given, is a
 * shared value for extra letter spacing in points: the splash settles it from
 * 2 to 0. Each letter sits in its own layer and moves by its index times the
 * spacing, centered on the word: a transform on the UI thread, and the same
 * look as animating letter spacing (which an outlined word can't do).
 */
type Props = {
  fontSize: number;
  color?: string;
  spacing?: SharedValue<number>;
};

export const Wordmark = memo(function Wordmark({ fontSize, color = palette.char, spacing }: Props) {
  const scale = fontSize / wordmark.em;
  const width = wordmark.width * scale;
  const height = wordmark.height * scale;
  const gaps = wordmark.letters.length - 1;
  return (
    <View style={{ width, height }} accessible accessibilityRole="header" accessibilityLabel="saunafam">
      {wordmark.letters.map((l, i) => (
        <Letter key={i} d={l.d} x={l.x} offset={i - gaps / 2} spacing={spacing} width={width} height={height} color={color} />
      ))}
    </View>
  );
});

function Letter({
  d,
  x,
  offset,
  spacing,
  width,
  height,
  color,
}: {
  d: string;
  x: number;
  offset: number;
  spacing?: SharedValue<number>;
  width: number;
  height: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: spacing ? spacing.value * offset : 0 }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${wordmark.width} ${wordmark.height}`}>
        <Path d={d} fill={color} transform={`translate(${x} 0)`} />
      </Svg>
    </Animated.View>
  );
}
