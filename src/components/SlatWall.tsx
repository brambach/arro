import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { space, WoodName } from '../theme/tokens';
import { moments, springTouchdownMs, timing, useReduceMotion } from '../theme/motion';
import { Slat, SlatState } from './Slat';

/**
 * The streak as a wall of slats, stacking up from the bottom: the oldest week
 * at the bottom, this week on top. Every fourth slat starts a new bench, with a
 * little more space above, so a 12-week streak reads as three benches.
 *
 * `build` plays the milestone build: a slat drops onto the wall every 50 ms from the
 * bottom, each dropping onto the wall with a spring. `onSlatDown` fires as
 * each one touches down (for a haptic on the last), `onBuilt` when the top one
 * has. With Reduce Motion the wall is simply there.
 */
export type WallWeek = { state: SlatState; dots?: { filled: number; count: number } };

type Props = {
  /** Oldest first. */
  weeks: WallWeek[];
  wood?: WoodName;
  slatHeight?: number;
  build?: boolean;
  onSlatDown?: (index: number) => void;
  onBuilt?: () => void;
  onIgnitePeak?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Slats per bench. */
export const BENCH = 4;

export function SlatWall({ weeks, wood = 'birch', slatHeight = 21, build = false, onSlatDown, onBuilt, onIgnitePeak, style }: Props) {
  return (
    <View style={[styles.wall, style]} accessibilityRole="summary">
      {weeks.map((w, i) => (
        <LandingSlat
          key={i}
          index={i}
          build={build}
          last={i === weeks.length - 1}
          onDown={onSlatDown}
          onBuilt={onBuilt}
          bench={i > 0 && i % BENCH === 0}
        >
          <Slat
            state={w.state}
            dots={w.dots}
            wood={wood}
            height={slatHeight}
            seed={i}
            woodDelay={i * moments.plusWoodCrossfade.perSlat}
            onIgnitePeak={onIgnitePeak}
          />
        </LandingSlat>
      ))}
    </View>
  );
}

function LandingSlat({
  children,
  index,
  build,
  last,
  bench,
  onDown,
  onBuilt,
}: {
  children: React.ReactNode;
  index: number;
  build: boolean;
  last: boolean;
  bench: boolean;
  onDown?: (index: number) => void;
  onBuilt?: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const animate = build && reduceMotion === false;
  const y = useSharedValue(animate ? -moments.milestoneWall.drop : 0);
  const o = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    const delay = index * moments.milestoneWall.perSlat;
    o.set(withDelay(delay, withTiming(1, timing.utility)));
    y.set(withDelay(
      delay,
      withSpring(0, moments.milestoneWall.slat, (finished) => {
        'worklet';
        if (finished && last && onBuilt) scheduleOnRN(onBuilt);
      }),
    ));
    // Touchdown is the spring's first arrival, before its small settle: that's
    // the frame a haptic belongs to, so it's timed instead of tied to the end.
    const t = onDown ? setTimeout(() => onDown(index), delay + springTouchdownMs(moments.milestoneWall.slat)) : undefined;
    return () => clearTimeout(t);
    // The build plays once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  const s = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={[bench && styles.bench, s]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wall: { flexDirection: 'column-reverse', gap: space.s4 },
  bench: { marginBottom: space.s12 },
});
