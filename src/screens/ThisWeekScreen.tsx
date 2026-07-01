import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { Card } from '../components/Card';
import { CalendarIcon } from '../components/Icons';
import { DayPill } from '../components/DayPill';
import { FadeInView } from '../components/FadeInView';
import { Screen } from '../components/Screen';
import { members, week } from '../data/family';
import { WeekRow } from '../data/types';

export function ThisWeekScreen(_props: unknown) {
  return (
    <Screen>
      <FadeInView style={styles.header}>
        <Text style={type.title}>This Week</Text>
        <CalendarIcon />
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
        <Card radius={radii.cardLg} padding={18}>
          <Text style={styles.headline}>{week.headline}</Text>
          <View style={styles.strip}>
            {week.strip.map((d, i) => (
              <DayPill key={i} state={d.state} label={d.label} />
            ))}
          </View>
          <Text style={styles.summary}>{week.summary}</Text>
        </Card>
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <Card radius={radii.cardLg} padding={0} style={{ paddingHorizontal: 18 }}>
          {week.rows.map((r, i) => (
            <DayRow key={r.dow} row={r} last={i === week.rows.length - 1} />
          ))}
        </Card>
      </FadeInView>
    </Screen>
  );
}

function DayRow({ row, last }: { row: WeekRow; last: boolean }) {
  const isToday = row.state === 'today';
  const dowColor = isToday ? colors.primary : colors.ink;
  const badgeColor = row.state === 'freeze' ? colors.freeze : colors.todayPillText;
  const badgeBg = row.state === 'freeze' ? '#E6EEF5' : colors.todayPillBg;

  return (
    <View style={[styles.dayRow, !last && styles.rowBorder]}>
      <Text style={[styles.dow, { color: dowColor }]}>{row.dow}</Text>
      <Text style={styles.date}>{row.date}</Text>
      <View style={styles.avatars}>
        <AvatarStack members={row.avatars.map((id) => members[id])} size={24} overlap={6} />
      </View>
      {row.badge ? (
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{row.badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: 6,
  },
  section: { paddingHorizontal: spacing.gutter, marginTop: 16 },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: weights.bold, letterSpacing: -0.2, color: colors.ink },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 17 },
  summary: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 17 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9.5 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dividerSoft },
  dow: { width: 36, fontSize: 13.5, fontWeight: weights.semibold },
  date: { width: 18, fontSize: 13, color: colors.faint2, fontVariant: ['tabular-nums'] },
  avatars: { flex: 1, paddingLeft: 6 },
  badge: { borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9 },
  badgeText: { fontSize: 11, fontWeight: weights.semibold },
});
