import React, { useEffect, useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { depth, layout, palette, radii, space } from '../theme/tokens';
import { distances, loops, springs, timing, useReduceMotion } from '../theme/motion';
import { type } from '../theme/typography';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../state/AppState';
import { heatMs, phase, timerBarLabel } from '../state/timer';
import { spokenClock } from '../state/timerRoom';
import { useNow } from './useNow';
import { useScreenVisible } from './useScreenVisible';

/** The bar's corner radius; the room's door starts from it. */
const BAR_RADIUS = radii.field;

/**
 * The slim dark bar at the top of Today while a timer runs: "In the heat ·
 * 12:04" (or "Cooling off · 12:04"), with a small ember coal breathing beside
 * it (lake while cooling off). Tapping it reopens the timer: the room grows
 * out of the bar, which is already char, so it reads as one surface.
 *
 * Renders nothing when no timer is running, so Today can always place it:
 *
 *   <TimerBar />
 *
 * It ticks once a second only while its screen is visible.
 */
export function TimerBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const { view } = useApp();
  const timer = view?.timer ?? null;
  const visible = useScreenVisible();
  const now = useNow(!!timer && visible);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const frame = useRef<View>(null);
  const scale = useSharedValue(1);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!timer) return null;
  const heat = phase(timer) === 'heat';
  const label = timerBarLabel(timer, now);

  const open = () => {
    const go = (x: number, y: number, width: number, height: number) =>
      navigation.navigate('Timer', {
        origin: width > 0 ? { x, y, width, height, radius: BAR_RADIUS, tone: 'char' } : undefined,
      });
    if (frame.current) frame.current.measureInWindow(go);
    else go(0, 0, 0, 0);
  };

  return (
    <Pressable
      onPress={open}
      onPressIn={() => scale.set(withSpring(distances.pressScale, springs.press))}
      onPressOut={() => scale.set(withSpring(1, springs.press))}
      accessibilityRole="button"
      accessibilityLabel={`${heat ? 'In the heat' : 'Cooling off'}, ${spokenClock(heatMs(timer, now))}`}
      accessibilityHint="Opens the timer"
      style={style}
    >
      <Animated.View ref={frame} collapsable={false} style={[styles.bar, press]}>
        <Coal heat={heat} visible={visible} />
        <Text style={[type.bodySmallStrong, styles.label]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** A small coal that breathes (glow-breathe) while the screen is visible. */
function Coal({ heat, visible }: { heat: boolean; visible: boolean }) {
  const reduceMotion = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!visible || reduceMotion !== false) {
      cancelAnimation(o);
      o.set(withTiming(1, timing.utility));
      return;
    }
    const half = { duration: loops.glowBreathe.duration / 2, easing: loops.glowBreathe.easing };
    // The bar's coal breathes between the glow's two stops, scaled to full brightness.
    const low = loops.glowBreathe.from / loops.glowBreathe.to;
    o.set(withSequence(withTiming(low, half), withRepeat(withTiming(1, half), -1, true)));
    return () => cancelAnimation(o);
  }, [visible, reduceMotion, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={styles.coalBox}>
      <Animated.View style={[styles.coalGlow, { backgroundColor: heat ? palette.glow : palette.lake }, s]} />
      <View style={[styles.coal, { backgroundColor: heat ? palette.ember : palette.lake }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    paddingHorizontal: space.s16,
    paddingVertical: space.s8,
    borderRadius: BAR_RADIUS,
    borderCurve: 'continuous',
    backgroundColor: palette.char,
    boxShadow: depth.card,
  },
  label: { color: palette.steam, flexShrink: 1, fontVariant: ['tabular-nums'] },
  coalBox: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  coalGlow: { position: 'absolute', width: 12, height: 12, borderRadius: radii.round, opacity: 0.5 },
  coal: { width: 6, height: 6, borderRadius: radii.round },
});
