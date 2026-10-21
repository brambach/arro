import React, { memo, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { alpha } from '../theme/tokens';
import { loops, useReduceMotion } from '../theme/motion';
import { wallLines } from './material';
import { useScreenVisible } from './useScreenVisible';

/**
 * The room behind every screen (Direction A, Texture): very faint vertical
 * slats, like a sauna wall, drawn once as SVG, with a soft warm haze drifting
 * slowly over them (`steam-drift`, 20 s). The drift pauses when the screen
 * isn't visible, and with Reduce Motion the haze holds still.
 *
 * The haze is a pre-rendered image (scripts/render-backdrop-haze.mjs), not SVG:
 * drawing its gradients on every screen's first frame cost about 30 ms of each
 * stack push (M16).
 *
 * Put it first inside a screen's root view; it fills the screen behind the
 * content and never takes touches. `tone="dark"` is the timer room.
 */
type Props = {
  tone?: 'light' | 'dark';
  /** The drifting haze. On by default on light screens. */
  haze?: boolean;
  /** Seed for the slat spacing, so neighboring screens don't line up exactly. */
  seed?: number;
};

export function Backdrop({ tone = 'light', haze = tone === 'light', seed = 7 }: Props) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Wall width={width} height={height} seed={seed} color={tone === 'light' ? alpha.wallLine : alpha.wallLineDark} />
      {haze ? <Haze width={width} height={height} /> : null}
    </View>
  );
}

const Wall = memo(function Wall({ width, height, seed, color }: { width: number; height: number; seed: number; color: string }) {
  const xs = useMemo(() => wallLines(width, seed), [width, seed]);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {xs.map((x) => (
        <Rect key={x} x={x} y={0} width={1} height={height} fill={color} />
      ))}
    </Svg>
  );
});

function Haze({ width, height }: { width: number; height: number }) {
  const visible = useScreenVisible();
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!visible || reduceMotion !== false) {
      cancelAnimation(t);
      return;
    }
    // One full drift out and back over 20 s, eased so it never visibly turns.
    t.set(withRepeat(withTiming(1, { duration: loops.steamDrift.duration / 2, easing: loops.steamDrift.easing }), -1, true));
    return () => cancelAnimation(t);
  }, [visible, reduceMotion, t]);

  const d = loops.steamDrift.distance;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -d * t.value }, { translateY: d * 0.5 * t.value }],
  }));

  // Drawn a little larger than the screen so the drift never shows an edge.
  const pad = d * 2;
  return (
    <Animated.View style={[{ position: 'absolute', left: -pad, top: -pad, width: width + pad * 2, height: height + pad * 2 }, style]}>
      <MemoHazeArt width={width + pad * 2} height={height + pad * 2} />
    </Animated.View>
  );
}

// Warm light from the upper right, a pale pool on the left. Every position in it
// is a share of its box, so stretched to any box it draws the same haze.
const hazeArt = require('../../assets/backdrop/haze.png');

const MemoHazeArt = memo(function HazeArt({ width, height }: { width: number; height: number }) {
  return <Image source={hazeArt} style={{ width, height }} resizeMode="stretch" />;
});
