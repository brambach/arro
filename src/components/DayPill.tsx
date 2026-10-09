import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { weights } from '../theme/typography';
import { WeekState } from '../data/types';
import { Check, Snowflake } from './Icons';

/**
 * DayPill — one dot in the compact 7-day strip.
 * kept = green check on soft green · freeze = blue snowflake on soft blue ·
 * today = ink ring with an ink dot (not moving yet is not an alert, so no accent).
 */
export function DayPill({ state, label, size = 28 }: { state: WeekState; label: string; size?: number }) {
  const isToday = state === 'today';
  return (
    <View style={styles.col}>
      <View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2 },
          state === 'kept' && { backgroundColor: colors.keptBg },
          state === 'freeze' && { backgroundColor: colors.freezeBg },
          isToday && { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.ink },
          state === 'missed' && { backgroundColor: colors.divider },
        ]}
      >
        {state === 'kept' && <Check size={14} color={colors.keptCheck} />}
        {state === 'freeze' && <Snowflake size={15} color={colors.freezeIcon} />}
        {isToday && <View style={styles.todayDot} />}
      </View>
      <Text style={[styles.label, isToday && { color: colors.ink, fontWeight: weights.semibold }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: 'center', gap: 6 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink },
  label: { fontSize: 12, color: colors.faint3, fontWeight: weights.medium },
});
