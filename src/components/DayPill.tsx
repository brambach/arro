import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { WeekDayState } from '../data/types';
import { Check } from './Icons';

/**
 * DayPill (Spec §8) — one tile in the weekly strip.
 * kept = peach + orange check · freeze = blue tile + blue dot ·
 * today = white + orange outline + orange dot · future/missed = faint.
 */
type Props = {
  state: WeekDayState;
  label: string;
  size?: number;
};

export function DayPill({ state, label, size = 36 }: Props) {
  const isToday = state === 'today';
  const labelColor = isToday ? colors.primary : colors.faint;

  return (
    <View style={styles.col}>
      <View style={[styles.tile, { width: size, height: size }, tileStyle(state)]}>
        {state === 'kept' && <Check size={15} color={colors.primary} />}
        {state === 'freeze' && <View style={[styles.dot, { backgroundColor: colors.freezeDot }]} />}
        {state === 'today' && (
          <View style={[styles.dot, { width: 7, height: 7, backgroundColor: colors.primary }]} />
        )}
      </View>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function tileStyle(state: WeekDayState) {
  switch (state) {
    case 'kept':
      return { backgroundColor: colors.keptTileBg };
    case 'freeze':
      return { backgroundColor: colors.freezeTileBg };
    case 'today':
      return { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary };
    case 'missed':
      return { backgroundColor: colors.hairline };
    default:
      return { backgroundColor: colors.hairline, opacity: 0.6 };
  }
}

const styles = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 8 },
  tile: {
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 8 },
  label: { fontFamily: fonts.sansHeavy, fontSize: 11 },
});
