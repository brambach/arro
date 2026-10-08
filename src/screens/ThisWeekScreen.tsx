import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { Card } from '../components/Card';
import { CalendarIcon } from '../components/Icons';
import { CheckInPop } from '../components/CheckInPop';
import { DayPill } from '../components/DayPill';
import { FadeInView } from '../components/FadeInView';
import { Screen } from '../components/Screen';
import { TextButton } from '../components/TextButton';
import { Member, WeekRow } from '../data/types';
import { useView } from '../state/AppState';
import { MainTabScreenProps } from '../navigation/types';

export function ThisWeekScreen({ navigation }: MainTabScreenProps<'ThisWeek'>) {
  const view = useView();
  const { week } = view;
  const solo = view.joinedCount === 1;
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
              // The week's check-ins land one after another, as on arrofamily.com; today waits.
              <CheckInPop key={i} play={d.state === 'kept' || d.state === 'freeze'} delay={250 + i * 70}>
                <DayPill state={d.state} label={d.label} />
              </CheckInPop>
            ))}
          </View>
          <Text style={styles.summary}>{week.summary}</Text>
          {solo ? (
            <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
              <TextButton
                label={view.invitedList.length ? 'Send the invite again' : 'Invite a family member'}
                onPress={() => navigation.navigate('Invite')}
              />
            </View>
          ) : null}
        </Card>
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <Card radius={radii.cardLg} padding={0} style={{ paddingHorizontal: 18 }}>
          {week.rows.map((r, i) => (
            <DayRow key={r.dow} row={r} members={view.members} last={i === week.rows.length - 1} />
          ))}
        </Card>
      </FadeInView>
    </Screen>
  );
}

function DayRow({ row, members, last }: { row: WeekRow; members: Record<string, Member>; last: boolean }) {
  const isToday = row.state === 'today';
  // Today stands out by weight, not by colour.
  const badgeColor = row.state === 'freeze' ? colors.freeze : colors.todayPillText;
  const badgeBg = row.state === 'freeze' ? colors.freezeBg : colors.todayPillBg;

  return (
    <View style={[styles.dayRow, !last && styles.rowBorder]}>
      <Text style={[styles.dow, isToday && styles.dowToday]}>{row.dow}</Text>
      <Text style={styles.date}>{row.date}</Text>
      <View style={styles.avatars}>
        <AvatarStack members={row.avatars.map((id) => members[id]).filter(Boolean)} size={24} overlap={6} />
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
  section: { paddingHorizontal: spacing.gutter, marginTop: 20 },
  headline: { ...type.greeting },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 17 },
  summary: { ...type.body, marginTop: 17 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dividerSoft },
  dow: { width: 40, fontSize: 15, fontWeight: weights.regular, color: colors.inkSoft },
  dowToday: { fontWeight: weights.semibold, color: colors.ink },
  date: { ...type.meta, width: 22, color: colors.faint2, fontVariant: ['tabular-nums'] },
  avatars: { flex: 1, paddingLeft: 6 },
  badge: { borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9 },
  badgeText: { fontSize: 12, fontWeight: weights.semibold },
});
