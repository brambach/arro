import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { palette, radii } from '../theme/tokens';
import { easing, moments, timing, useReduceMotion } from '../theme/motion';
import { rng } from './material';

/**
 * A short burst of sparks when the whole family's week is kept: 10 particles
 * flying out from a point and fading (transform and opacity only). Each new
 * `burstKey` plays it once. With Reduce Motion it doesn't play; the slat
 * filling and the line of copy carry the moment.
 *
 * Place it absolutely over the point the sparks come from (its own box is 0 x 0).
 */
export function SparkBurst({ burstKey }: { burstKey: number }) {
  const reduceMotion = useReduceMotion();
  if (!burstKey || reduceMotion !== false) return null;
  return <Sparks key={burstKey} seed={burstKey} />;
}

function Sparks({ seed }: { seed: number }) {
  const { count, distance } = moments.weekKept.sparks;
  const sparks = useMemo(() => {
    const r = rng(seed * 31 + 7);
    return Array.from({ length: count }, (_, i) => {
      // Mostly upward, like sparks off a coal.
      const angle = -Math.PI / 2 + (i / (count - 1) - 0.5) * Math.PI * 1.1 + (r() - 0.5) * 0.3;
      const dist = distance[0] + r() * (distance[1] - distance[0]);
      return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 4 + Math.round(r() * 3), hot: r() > 0.5 };
    });
  }, [seed, count, distance]);
  return (
    <View style={styles.origin} pointerEvents="none">
      {sparks.map((s, i) => (
        <Spark key={i} {...s} />
      ))}
    </View>
  );
}

function Spark({ dx, dy, size, hot }: { dx: number; dy: number; size: number; hot: boolean }) {
  const p = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    const { duration, easing: fly } = moments.weekKept.sparks;
    p.set(withTiming(1, { duration, easing: fly }));
    o.set(withSequence(withTiming(1, timing.utility), withTiming(0, { duration: duration - timing.utility.duration, easing: easing.leave })));
    // Plays once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateX: dx * p.value }, { translateY: dy * p.value }, { scale: 1 - 0.5 * p.value }],
  }));
  return (
    <Animated.View
      style={[
        styles.spark,
        { width: size, height: size, left: -size / 2, top: -size / 2, backgroundColor: hot ? palette.glow : palette.ember },
        s,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', width: 0, height: 0 },
  spark: { position: 'absolute', borderRadius: radii.round },
});
