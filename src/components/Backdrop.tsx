import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { contours } from '../theme/contours';

/** The contour tile's size on screen, in points. */
const TILE = 520;
/** How strongly the contour lines show. Matches body::before on arrofamily.com. */
const LINE_OPACITY = 0.13;

/**
 * The page behind every paper screen, the same as arrofamily.com: a contour
 * map, faint topographic lines like the map of a walk (theme/contours.ts,
 * drawn by site/scenes/contours.mjs), with the warm dawn light in the top-right
 * corner. It sits still behind a screen's content, so glass cards that scroll
 * over it pick up the lines and the light. Faint on purpose; it's paper, not a
 * picture. Welcome and Milestone keep their hills instead: the hills fade up
 * out of flat paper, which would cut the lines off.
 */
export function Backdrop() {
  const { width, height } = useWindowDimensions();
  const scale = TILE / contours.size;
  const tiles: [number, number][] = [];
  for (let y = 0; y < height; y += TILE) for (let x = 0; x < width; x += TILE) tiles.push([x, y]);
  const glowHeight = Math.round(width * 1.25);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
        <G fill="none" stroke={colors.shadowWarm} strokeOpacity={LINE_OPACITY} strokeLinejoin="round" strokeLinecap="round">
          {tiles.map(([x, y]) => (
            <G key={`${x},${y}`} transform={`translate(${x} ${y}) scale(${scale})`}>
              <Path d={contours.lines} strokeWidth={contours.lineWidth} />
              <Path d={contours.index} strokeWidth={contours.indexWidth} />
            </G>
          ))}
        </G>
        <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sun)" />
        <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sage)" />
      </Svg>
    </View>
  );
}
