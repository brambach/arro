import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop, Use } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { contours } from '../theme/contours';
import { useReduceMotion } from '../theme/motion';

/**
 * The soft mesh behind arrofamily.com (site/public/backdrop.js), in the same
 * colours: Arro's paper with pools of warm cream, apricot, sage and a pale
 * evening blue, all close to paper. The site draws it with a shader; here each
 * pool is a radial gradient that drifts on its own slow clock (native driver),
 * so the pools slide past each other and the colour never sits the same way.
 * Positions and sizes are fractions of the screen.
 */
const POOLS = [
  { color: '#EFE2D1', x: 0.85, y: 0.08, r: 0.95, dx: 0.12, dy: 0.06, ms: 47000 },
  { color: '#E9ECE1', x: 0.05, y: 0.42, r: 0.9, dx: 0.1, dy: 0.08, ms: 61000 },
  { color: '#F3E5D6', x: 0.2, y: 0.92, r: 0.85, dx: 0.09, dy: 0.05, ms: 53000 },
  { color: '#ECEAE6', x: 0.95, y: 0.7, r: 0.8, dx: 0.1, dy: 0.07, ms: 71000 },
] as const;

/** How strongly the contour lines show on Welcome. Matches .hero::before on the site. */
const LINE_OPACITY = 0.11;
const TILE = 520;

/**
 * One clock per pool, shared by every Backdrop, so moving from screen to
 * screen the colour carries on rather than restarting.
 */
const clocks = POOLS.map(() => new Animated.Value(0));
let users = 0;
let loops: Animated.CompositeAnimation[] = [];

function useMeshMotion(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (users++ === 0) {
      loops = POOLS.map((pool, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(clocks[i], { toValue: 1, duration: pool.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(clocks[i], { toValue: 0, duration: pool.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      );
      loops.forEach((l) => l.start());
    }
    return () => {
      if (--users === 0) loops.forEach((l) => l.stop());
    };
  }, [enabled]);
}

/** The contour map, still, fading out by halfway down: Welcome's equivalent of the site's hero. */
function Map({ width, height }: { width: number; height: number }) {
  const { lines, index } = contours.frames[0];
  const tiles: [number, number][] = [];
  for (let y = 0; y < height; y += TILE) for (let x = 0; x < width; x += TILE) tiles.push([x, y]);
  return (
    <Svg width={width} height={height} style={styles.layer}>
      <Defs>
        <LinearGradient id="mapFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={1} />
          <Stop offset="0.25" stopColor="#fff" stopOpacity={1} />
          <Stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id="mapMask">
          <Rect x="0" y="0" width={width} height={height} fill="url(#mapFade)" />
        </Mask>
        <G id="mapTile" transform={`scale(${TILE / contours.size})`}>
          <Path d={lines} strokeWidth={contours.lineWidth} />
          <Path d={index} strokeWidth={contours.indexWidth} />
        </G>
      </Defs>
      <G mask="url(#mapMask)" fill="none" stroke={colors.shadowWarm} strokeOpacity={LINE_OPACITY} strokeLinejoin="round" strokeLinecap="round">
        {tiles.map(([x, y]) => (
          <Use key={`${x},${y}`} href="#mapTile" x={x} y={y} />
        ))}
      </G>
    </Svg>
  );
}

/** Dawn: the warm light in the top-right corner. Dusk: a lower, rosier light along the bottom, for the end of a day. */
function Light({ light, width, height }: { light: 'dawn' | 'dusk'; width: number; height: number }) {
  if (light === 'dusk') {
    return (
      <Svg width={width} height={height} style={styles.layer}>
        <Defs>
          <RadialGradient id="dusk" cx="50%" cy="100%" rx="95%" ry="55%" fx="50%" fy="100%">
            <Stop offset="0" stopColor="#B06052" stopOpacity={0.16} />
            <Stop offset="0.55" stopColor="#B06052" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#B06052" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#dusk)" />
      </Svg>
    );
  }
  const glowHeight = Math.round(width * 1.25);
  return (
    <Svg width={width} height={glowHeight} style={styles.layer}>
      <Defs>
        <RadialGradient id="sun" cx="82%" cy="2%" rx="90%" ry="70%" fx="82%" fy="2%">
          <Stop offset="0" stopColor={colors.primary} stopOpacity={0.14} />
          <Stop offset="0.5" stopColor={colors.primary} stopOpacity={0.05} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sun)" />
    </Svg>
  );
}

/**
 * The page behind every paper screen, the same as arrofamily.com: a soft,
 * slowly drifting mesh of paper colours with a warm light over it, dawn in
 * the top-right corner or dusk along the bottom for the end of a day
 * (Milestone). `map` adds the still contour map at the top, fading into the
 * mesh, for Welcome (the site's hero has it too). It sits still behind a
 * screen's content, so glass and cards scroll over it. Reduce Motion holds
 * the mesh still.
 */
export function Backdrop({ light = 'dawn', map = false }: { light?: 'dawn' | 'dusk'; map?: boolean }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const moving = reduceMotion === false;
  useMeshMotion(moving);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {POOLS.map((pool, i) => {
        const size = Math.round(Math.max(width, height) * pool.r);
        return (
          <Animated.View
            key={i}
            style={[
              styles.layer,
              { width: size, height: size, left: pool.x * width - size / 2, top: pool.y * height - size / 2 },
              moving && {
                transform: [
                  { translateX: clocks[i].interpolate({ inputRange: [0, 1], outputRange: [-pool.dx * width, pool.dx * width] }) },
                  { translateY: clocks[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [pool.dy * height, -pool.dy * height, pool.dy * height] }) },
                ],
              },
            ]}
          >
            <Svg width={size} height={size}>
              <Defs>
                <RadialGradient id={`pool${i}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={pool.color} stopOpacity={1} />
                  <Stop offset="0.6" stopColor={pool.color} stopOpacity={0.45} />
                  <Stop offset="1" stopColor={pool.color} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width={size} height={size} fill={`url(#pool${i})`} />
            </Svg>
          </Animated.View>
        );
      })}
      {map ? <Map width={width} height={height} /> : null}
      <Light light={light} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});
