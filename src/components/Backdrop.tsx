import React, { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop, Use } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { contours } from '../theme/contours';
import { useReduceMotion } from '../theme/motion';

/** The contour tile's size on screen, in points. */
const TILE = 520;
/** How strongly the contour lines show. Matches .map-layer.on on arrofamily.com. */
const LINE_OPACITY = 0.13;
/** How far the map sways each way, and how long each sway takes. Same as the site. */
const SWAY = 36;
const SWAY_X_MS = 31000;
const SWAY_Y_MS = 23000;
/** Each moment of the land is held this long, fade included. */
const HOLD_MS = 5000;
const FADE_MS = 3500;

/**
 * The map's motion is shared by every Backdrop, so moving from one screen to
 * the next never restarts it: the lines carry on where they were. Two layers,
 * one showing. Every HOLD_MS the hidden one takes the next moment of the land
 * (contours.frames, 0 to 7 and back) and fades in over the other, so the
 * lines seem to shift like water without ever jumping. All of it runs on the
 * native driver; JS only swaps a frame every few seconds.
 */
const swayX = new Animated.Value(0);
const swayY = new Animated.Value(0);
const fades = [new Animated.Value(1), new Animated.Value(0)];
let shown = { frames: [0, 1] as [number, number], front: 0 };
const listeners = new Set<() => void>();
let users = 0;
let stop: (() => void) | null = null;

function start() {
  const sway = (value: Animated.Value, duration: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
  const loops = [sway(swayX, SWAY_X_MS), sway(swayY, SWAY_Y_MS)];
  loops.forEach((l) => l.start());

  let frame = shown.frames[shown.front];
  let step = 1;
  const timer = setInterval(() => {
    if (frame + step < 0 || frame + step >= contours.frames.length) step = -step;
    frame += step;
    const back = 1 - shown.front;
    const frames: [number, number] = [...shown.frames];
    frames[back] = frame;
    shown = { frames, front: shown.front };
    listeners.forEach((l) => l());
    // Give the hidden layer a moment to draw its new lines before it shows.
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fades[back], { toValue: 1, duration: FADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fades[1 - back], { toValue: 0, duration: FADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
      shown = { frames: shown.frames, front: back };
    }, 120);
  }, HOLD_MS);

  return () => {
    clearInterval(timer);
    loops.forEach((l) => l.stop());
  };
}

function useMapMotion(enabled: boolean) {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    if (users++ === 0) stop = start();
    return () => {
      listeners.delete(listener);
      if (--users === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }, [enabled]);
  return shown.frames;
}

/** One layer: the tile at one moment, repeated to fill the screen plus the sway. */
const Layer = memo(function Layer({ frame, width, height }: { frame: number; width: number; height: number }) {
  const scale = TILE / contours.size;
  const { lines, index } = contours.frames[frame];
  const tiles: [number, number][] = [];
  for (let y = 0; y < height; y += TILE) for (let x = 0; x < width; x += TILE) tiles.push([x, y]);
  return (
    <Svg width={width} height={height}>
      <Defs>
        <G id={`tile-${frame}`} transform={`scale(${scale})`}>
          <Path d={lines} strokeWidth={contours.lineWidth} />
          <Path d={index} strokeWidth={contours.indexWidth} />
        </G>
      </Defs>
      <G fill="none" stroke={colors.shadowWarm} strokeOpacity={LINE_OPACITY} strokeLinejoin="round" strokeLinecap="round">
        {tiles.map(([x, y]) => (
          <Use key={`${x},${y}`} href={`#tile-${frame}`} x={x} y={y} />
        ))}
      </G>
    </Svg>
  );
});

/** Dawn: the warm light in the top-right corner. Dusk: a lower, rosier light at the bottom, for the end of a day. */
function Light({ light, width, height }: { light: 'dawn' | 'dusk'; width: number; height: number }) {
  if (light === 'dusk') {
    return (
      <Svg width={width} height={height} style={styles.light}>
        <Defs>
          <RadialGradient id="dusk" cx="50%" cy="100%" rx="95%" ry="55%" fx="50%" fy="100%">
            <Stop offset="0" stopColor="#B06052" stopOpacity={0.2} />
            <Stop offset="0.55" stopColor="#B06052" stopOpacity={0.07} />
            <Stop offset="1" stopColor="#B06052" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#dusk)" />
      </Svg>
    );
  }
  const glowHeight = Math.round(width * 1.25);
  return (
    <Svg width={width} height={glowHeight} style={styles.light}>
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
      <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sun)" />
      <Rect x="0" y="0" width={width} height={glowHeight} fill="url(#sage)" />
    </Svg>
  );
}

/**
 * The page behind every paper screen, the same as arrofamily.com: a contour
 * map, faint topographic lines like the map of a walk (theme/contours.ts,
 * drawn by site/scenes/contours.mjs), that sways and shifts very slowly, with
 * a warm light over it: dawn in the top-right corner, or dusk along the bottom
 * for the end of a day (Milestone). It sits still behind a screen's content,
 * so glass and cards scroll over it. Faint on purpose; it's paper, not a
 * picture. Reduce Motion holds it still.
 */
export function Backdrop({ light = 'dawn' }: { light?: 'dawn' | 'dusk' }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const frames = useMapMotion(reduceMotion === false);
  const w = width + SWAY * 2;
  const h = height + SWAY * 2;
  const moving = reduceMotion === false;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.map,
          { width: w, height: h },
          moving && {
            transform: [
              { translateX: swayX.interpolate({ inputRange: [0, 1], outputRange: [-SWAY, SWAY] }) },
              { translateY: swayY.interpolate({ inputRange: [0, 1], outputRange: [-SWAY * 0.6, SWAY * 0.6] }) },
            ],
          },
        ]}
      >
        {moving ? (
          [0, 1].map((i) => (
            <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity: fades[i] }]}>
              <Layer frame={frames[i]} width={w} height={h} />
            </Animated.View>
          ))
        ) : (
          <Layer frame={0} width={w} height={h} />
        )}
      </Animated.View>
      <Light light={light} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { position: 'absolute', left: -SWAY, top: -SWAY },
  light: { position: 'absolute', left: 0, top: 0 },
});
