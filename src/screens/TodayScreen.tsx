import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { AvatarStack } from '../components/AvatarStack';
import { Card } from '../components/Card';
import { CheerButton } from '../components/CheerButton';
import { FadeInView } from '../components/FadeInView';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StreakRing } from '../components/StreakRing';
import { currentUser, familyList, today } from '../data/family';
import { Member } from '../data/types';

export function TodayScreen(_props: unknown) {
  return (
    <Screen>
      <FadeInView delay={0} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{today.dateLabel}</Text>
          <Text style={[type.greeting, { marginTop: 4 }]}>{today.greeting}</Text>
        </View>
        <AvatarRing member={currentUser} size={40} />
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
        <Card radius={radii.cardLg} padding={18}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={type.bigNumber}>
                {today.keptCount} of {today.total}
              </Text>
              <Text style={styles.keptLabel}>kept it today</Text>
              <AvatarStack members={familyList} size={28} overlap={8} style={{ marginTop: 14 }} />
            </View>
            <StreakRing value={today.keptCount} goal={today.total} size={84} strokeWidth={9} />
          </View>
          <View style={styles.pending}>
            <Text style={styles.pendingText}>{today.cheerPrompt} — </Text>
            <CheerButton variant="link" label={today.cheerCta} cheeredLabel="Cheered" />
          </View>
        </Card>
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <SectionHeader title="Family today" action="Nudge" style={{ marginBottom: 2 }} />
        <View>
          {familyList.map((m, i) => (
            <FadeInView key={m.id} delay={160 + i * 40}>
              <MemberRow member={m} last={i === familyList.length - 1} />
            </FadeInView>
          ))}
        </View>
      </FadeInView>
    </Screen>
  );
}

function MemberRow({ member, last }: { member: Member; last: boolean }) {
  const kept = member.today === 'kept';
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <AvatarRing member={member} size={40} />
      <View style={styles.rowMiddle}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {member.meta}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.pill, { backgroundColor: kept ? colors.keptBg : colors.todayPillBg }]}>
          <Text style={[styles.pillText, { color: kept ? colors.kept : colors.todayPillText }]}>
            {kept ? 'Kept' : 'Today'}
          </Text>
        </View>
        <Text style={styles.streak}>{member.streak}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.gutter,
    paddingTop: 6,
  },
  date: { fontSize: 13, color: colors.muted },
  section: { paddingHorizontal: spacing.gutter, marginTop: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keptLabel: { fontSize: 14, color: colors.muted, marginTop: 2 },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
  },
  pendingText: { fontSize: 13, color: '#8A8073' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowMiddle: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink },
  meta: { fontSize: 12.5, color: colors.faint, marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9 },
  pillText: { fontSize: 11.5, fontWeight: weights.semibold },
  streak: {
    fontSize: 17,
    fontWeight: weights.semibold,
    color: '#B4AA9C',
    fontVariant: ['tabular-nums'],
    minWidth: 20,
    textAlign: 'right',
  },
});
