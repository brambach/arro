import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { depth, palette, radii, space } from '../theme/tokens';
import { distances, springs, timing } from '../theme/motion';
import { type } from '../theme/typography';
import { WEEKDAY_SHORT } from '../state/dates';
import { daysInOrder } from '../state/settingsCopy';

/**
 * Pick the reminder days: seven small aspen tiles, like the Week screen's day
 * strip. A picked day fills ember with its name in steam. Any number can be on.
 * Days follow the family's week start. Wraps to two rows at the largest
 * Dynamic Type sizes.
 */
const FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Props = {
  /** ISO weekdays, 1 Monday to 7 Sunday. */
  days: number[];
  onChange: (days: number[]) => void;
  weekStartsOn?: number;
};

export function DayPicker({ days, onChange, weekStartsOn = 1 }: Props) {
  const { fontScale } = useWindowDimensions();
  const wrap = fontScale >= 1.35;
  const toggle = (d: number) => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));
  return (
    <View accessibilityLabel="Reminder days" style={[styles.row, wrap && styles.wrap]}>
      {daysInOrder(weekStartsOn).map((d) => (
        <Day key={d} day={d} on={days.includes(d)} wrap={wrap} onPress={() => toggle(d)} />
      ))}
    </View>
  );
}

function Day({ day, on, wrap, onPress }: { day: number; on: boolean; wrap: boolean; onPress: () => void }) {
  const lit = useSharedValue(on ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    lit.set(withTiming(on ? 1 : 0, timing.utility));
  }, [on, lit]);
  const fill = useAnimatedStyle(() => ({ opacity: lit.value }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const label = WEEKDAY_SHORT[day - 1];
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.set(withSpring(distances.pressScale, springs.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, springs.press));
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={FULL[day - 1]}
      style={wrap ? styles.cellWrap : styles.cell}
    >
      <Animated.View style={[styles.tile, press]}>
        <Text style={[type.bodySmallStrong, styles.off]}>{label}</Text>
        <Animated.View style={[StyleSheet.absoluteFill, styles.on, fill]} pointerEvents="none">
          <Text style={[type.bodySmallStrong, styles.onText]}>{label}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.s4 },
  wrap: { flexWrap: 'wrap', gap: space.s8 },
  cell: { flex: 1 },
  cellWrap: { width: '30%', flexGrow: 1 },
  tile: {
    minHeight: 48,
    paddingVertical: space.s8,
    borderRadius: radii.slat,
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  off: { color: palette.smoke },
  on: { backgroundColor: palette.ember, alignItems: 'center', justifyContent: 'center' },
  onText: { color: palette.steam },
});
