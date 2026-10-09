import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/tokens';

/**
 * The warm light from the top of arrofamily.com: a clay glow up in the
 * top-right corner, fading into the paper. It sits still behind a screen's
 * content, so glass cards that scroll over it pick up its colour. Very faint on
 * purpose; it's light, not a colour block.
 */
export function Backdrop() {
  const { width } = useWindowDimensions();
  const height = Math.round(width * 1.25);
  return (
    <View style={[StyleSheet.absoluteFill, { bottom: undefined, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="sun" cx="82%" cy="2%" rx="90%" ry="70%" fx="82%" fy="2%">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
            <Stop offset="0.5" stopColor={colors.primary} stopOpacity={0.08} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sage" cx="0%" cy="38%" rx="70%" ry="45%" fx="0%" fy="38%">
            <Stop offset="0" stopColor={colors.kept} stopOpacity={0.07} />
            <Stop offset="1" stopColor={colors.kept} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#sun)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#sage)" />
      </Svg>
    </View>
  );
}
