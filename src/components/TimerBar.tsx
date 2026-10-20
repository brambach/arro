import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { palette, radii, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { useView } from '../state/AppState';
import { timerBarLabel } from '../state/timer';

/**
 * Placeholder from M9 until M8 lands its own: the slim dark bar at the top of
 * Today while a timer runs, "In the heat · 12:04". Tapping it reopens the
 * timer. M8 owns this file; the coordinator takes M8's version at merge.
 */
export function TimerBar() {
  const view = useView();
  const navigation = useNavigation();
  const [now, setNow] = useState(() => new Date());
  const running = !!view.timer;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!view.timer) return null;
  const label = timerBarLabel(view.timer, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the timer"
      // The Timer route is M8's; it isn't in RootStackParamList on this branch yet.
      onPress={() => (navigation.navigate as (name: string) => void)('Timer')}
      style={styles.bar}
    >
      <View style={styles.dot} />
      <Text style={[type.bodySmallStrong, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    backgroundColor: palette.char,
    borderRadius: radii.field,
    paddingHorizontal: space.s16,
    paddingVertical: space.s12,
  },
  dot: { width: 8, height: 8, borderRadius: radii.round, backgroundColor: palette.ember },
  label: { color: palette.steam },
});
