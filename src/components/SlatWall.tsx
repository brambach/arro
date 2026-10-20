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
 * `build` plays the milestone build: the slats land one every 50 ms from the
 * bottom, each dropping onto the wall with a spring. `onSlatLanded` fires as
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
  onSlatLanded?: (index: number) => void;
  onBuilt?: () => void;
  onIgnitePeak?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Slats per bench. */
export const BENCH = 4;

export function SlatWall({ weeks, wood = 'birch', slatHeight = 21, build = false, onSlatLanded, onBuilt, onIgnitePeak, style }: Props) {
  return (
    <View style={[styles.wall, style]} accessibilityRole="summary">
      {weeks.map((w, i) => (
        <LandingSlat
          key={i}
          index={i}
          build={build}
          last={i === weeks.length - 1}
          onLanded={onSlatLanded}
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
  onLanded,
  onBuilt,
}: {
  children: React.ReactNode;
  index: number;
  build: boolean;
  last: boolean;
  bench: boolean;
  onLanded?: (index: number) => void;
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
      withSpring(0, moments.milestoneWall.land, (finished) => {
        'worklet';
        if (finished && last && onBuilt) scheduleOnRN(onBuilt);
      }),
    ));
    // Touchdown is the spring's first arrival, before its small settle: that's
    // the frame a haptic belongs to, so it's timed rather than tied to the end.
    const t = onLanded ? setTimeout(() => onLanded(index), delay + springTouchdownMs(moments.milestoneWall.land)) : undefined;
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
