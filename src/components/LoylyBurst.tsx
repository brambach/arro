import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { easing, moments, timing, useReduceMotion } from '../theme/motion';

/**
 * Throw löyly in the timer room: soft wisps of steam that rise from the floor,
 * spread and thin out (moments.loylyBurst). Each new `burstKey` throws again.
 * No data, just delight.
 *
 * The wisp is drawn ahead of time and blurred (assets/timer/loyly-wisp.png,
 * from scripts/render-room-steam.mjs), so it reads as steam, not as a line,
 * and costs nothing to draw. Transform and opacity only. Reduce Motion: the
 * wisps fade in place.
 */
const wisp = require('../../assets/timer/loyly-wisp.png');

/** Where the wisps stand, as shares of the width, and how big each one is. */
const WISPS = [
  { x: 0.24, scale: 0.8, delay: 1 },
  { x: 0.4, scale: 1.05, delay: 0 },
  { x: 0.55, scale: 0.95, delay: 2 },
  { x: 0.7, scale: 0.85, delay: 3 },
  { x: 0.5, scale: 1.2, delay: 4 },
] as const;

/** The wisp art's shape (160 x 560). */
const ASPECT = 160 / 560;

export function LoylyBurst({ burstKey, width, height }: { burstKey: number; width: number; height: number }) {
  if (burstKey <= 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" key={burstKey}>
      {WISPS.slice(0, moments.loylyBurst.count).map((w, i) => (
        <Wisp key={i} {...w} width={width} height={height} />
      ))}
    </View>
  );
}

function Wisp({ x, scale, delay, width, height }: { x: number; scale: number; delay: number; width: number; height: number }) {
  const reduceMotion = useReduceMotion();
  const { duration, stagger, fadeInShare, rise, easing: out } = moments.loylyBurst;
  const h = height * 0.5 * scale;
  const w = h * ASPECT;
  const t = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    const wait = delay * stagger;
    if (reduceMotion !== false) {
      t.set(1);
      o.set(withDelay(wait, withSequence(withTiming(0.8, timing.utility), withTiming(0, { duration: duration / 2, easing: easing.leave }))));
      return;
    }
    t.set(withDelay(wait, withTiming(1, { duration, easing: out })));
    o.set(
      withDelay(
        wait,
        withSequence(
          withTiming(1, { duration: duration * fadeInShare, easing: easing.utility }),
          withTiming(0, { duration: duration * (1 - fadeInShare), easing: easing.leave }),
        ),
      ),
    );
    // Plays once per throw (each throw mounts new wisps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateY: -rise * height * t.value },
      // It billows as it rises: wider, a little taller.
      { scaleX: 0.8 + 0.5 * t.value },
      { scaleY: 0.85 + 0.25 * t.value },
    ],
  }));
  return (
    <Animated.View style={[styles.wisp, { left: width * x - w / 2, top: height - h * 0.85, width: w, height: h }, style]}>
      <Image source={wisp} style={StyleSheet.absoluteFill} resizeMode="stretch" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wisp: { position: 'absolute' },
});
