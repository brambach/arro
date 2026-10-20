import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { depth, gradients, palette, radii, space } from '../theme/tokens';
import { type } from '../theme/typography';
import type { DayCell } from '../state/buildView';
import { weekdayName } from '../state/dates';
import { joinNames } from '../data/saunas';

/**
 * Your Mon to Sun strip under your row on Week: a tile a day, ember with a dot
 * on days you went, a lighter tile with an ember dot for today, aspen trays
 * for the rest. The letters follow the family's week start.
 */
export function DayStrip({ days }: { days: DayCell[] }) {
  const went = days.filter((d) => d.went).length;
  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={describe(days, went)}>
      {days.map((d) => (
        <View key={d.date} style={[styles.tile, d.went ? styles.on : d.isToday ? styles.today : null]}>
          {d.went ? (
            <LinearGradient
              colors={[gradients.emberButton[0].color, gradients.emberButton[1].color, gradients.emberButton[2].color]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Text style={[type.bodySmallStrong, styles.letter, d.went ? styles.letterOn : d.isToday ? styles.letterToday : null]} allowFontScaling={false}>
            {d.letter}
          </Text>
          <View style={[styles.dot, d.went ? styles.dotOn : d.isToday ? styles.dotToday : null]} />
        </View>
      ))}
    </View>
  );
}

function describe(days: DayCell[], went: number) {
  return went ? `This week you went ${joinNames(days.filter((d) => d.went).map((d) => weekdayName(d.date)))}` : 'No sessions yet this week';
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.s8 },
  tile: {
    flex: 1,
    height: 44,
    borderRadius: radii.slat,
    overflow: 'hidden',
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s4,
  },
  on: { boxShadow: depth.button },
  today: { backgroundColor: palette.birch },
  letter: { color: palette.smoke, lineHeight: 18 },
  letterOn: { color: palette.steam },
  letterToday: { color: palette.char },
  dot: { width: 4, height: 4, borderRadius: radii.round, opacity: 0 },
  dotOn: { backgroundColor: palette.steam, opacity: 0.9 },
  dotToday: { backgroundColor: palette.ember, opacity: 1 },
});
