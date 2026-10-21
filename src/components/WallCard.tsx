import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space, WoodName } from '../theme/tokens';
import { moments } from '../theme/motion';
import { maxFontScale, type } from '../theme/typography';
import type { Slat as SlatView, WeekView } from '../state/buildView';
import { Card } from './Card';
import { RollingNumber } from './RollingNumber';
import { SlatWall, WallWeek } from './SlatWall';
import type { SlatState } from './Slat';

/**
 * Week's top card: the wall of slats stacking up from the bottom (a bench gap
 * every fourth), this week on top with your ember dots, and beside it the
 * family streak in big coal Fraunces with "Longest" and "This year" under it.
 */
type Props = {
  wall: WeekView['wall'];
  numbers: WeekView['numbers'];
  /** "Your first week together", in place of a big 0. */
  headline?: string | null;
  myDots: { filled: number; count: number };
  rollIn: boolean;
};

/** How a week reads on the wall. A freeze is lake; a week everyone was away is plain. */
export function slatStateOf(s: SlatView): SlatState {
  if (s.current) return 'current';
  if (s.state === 'counted') return s.freezeUsed ? 'frozen' : 'kept';
  if (s.state === 'skip') return 'paused';
  if (s.state === 'solo' && s.freezeUsed) return 'frozen';
  return 'open';
}

export function wallWeeks(slats: SlatView[], myDots: { filled: number; count: number }): WallWeek[] {
  return slats.map((s) => ({ state: slatStateOf(s), dots: s.current ? myDots : undefined }));
}

export function WallCard({ wall, numbers, headline, myDots, rollIn }: Props) {
  const [streak, ...rest] = numbers;
  const weeks = wallWeeks(wall.slats, myDots);
  const kept = weeks.filter((w) => w.state === 'kept' || w.state === 'frozen').length;
  return (
    <Card padding={space.s24}>
      <View style={styles.row}>
        <View style={styles.wall} accessible accessibilityLabel={`The wall: ${weeks.length - 1} weeks, ${kept} kept, and this week`}>
          <SlatWall weeks={weeks} wood={wall.wood as WoodName} nail={wall.nail} />
        </View>
        <View style={styles.numbers}>
          {headline ? (
            <Text style={type.heading} maxFontSizeMultiplier={maxFontScale.heading} accessibilityRole="header">
              {headline}
            </Text>
          ) : (
            <>
              <RollingNumber value={streak.value} color={palette.coal} rollIn={rollIn} delay={moments.todayArrival.stagger} accessibilityLabel={`${streak.value} ${streak.label}`} />
              <Text style={[type.heading, styles.label]} maxFontSizeMultiplier={maxFontScale.heading} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {streak.label}
              </Text>
            </>
          )}
          <View style={styles.stats}>
            {rest.map((n) => (
              <View key={n.key} accessible accessibilityLabel={`${n.label}: ${n.value}`}>
                <Text style={type.bodyStrong}>{n.value}</Text>
                <Text style={type.label}>{n.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s16 },
  // The wall takes a little under half the card, so "weeks together" stays on one line in 24 pt.
  wall: { flex: 9 },
  numbers: { flex: 11, paddingBottom: space.s4 },
  label: { marginTop: space.s8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s20, rowGap: space.s8, marginTop: space.s16 },
});
