import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { Card } from '../components/Card';
import { CheerButton } from '../components/CheerBar';
import { CountUp } from '../components/CountUp';
import { FadeInView } from '../components/FadeInView';
import { MemberRow, StreakValue } from '../components/MemberRow';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StreakRing } from '../components/StreakRing';
import { currentUser, keptRuns, members, today } from '../data/family';
import { MainTabScreenProps } from '../navigation/types';

export function TodayScreen({ navigation }: MainTabScreenProps<'Today'>) {
  const boardMembers = today.onTheBoard.map((id) => members[id]);
  const stillMembers = today.stillToday.map((id) => members[id]);

  return (
    <Screen>
      {/* Header */}
      <FadeInView delay={40} style={styles.header}>
        <View>
          <Text style={styles.date}>{today.dateLabel}</Text>
          <Text style={[type.greeting, { marginTop: 2 }]}>{today.greeting}</Text>
        </View>
        <AvatarRing member={currentUser} size={38} badge="none" state="today" />
      </FadeInView>

      {/* Summary */}
      <FadeInView delay={120} style={styles.section}>
        <Card background={colors.warmFill} radius={24} padding={17} elevation="card">
          <View style={styles.summaryRow}>
            <StreakRing
              value={today.keptCount}
              goal={today.total}
              size={56}
              strokeWidth={8}
              innerBg={colors.warmFill}
            >
              <Text style={styles.summaryFraction}>
                {today.keptCount}/{today.total}
              </Text>
            </StreakRing>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                <CountUp value={today.keptCount} duration={700} /> of {today.total} have kept it
                today
              </Text>
              <Text style={styles.summarySub}>Two to go — Julie & Greg still have today.</Text>
            </View>
          </View>
        </Card>
      </FadeInView>

      {/* On the board */}
      <FadeInView delay={180} style={styles.section}>
        <SectionHeader
          title="On the board today"
          count={boardMembers.length}
          tint={colors.kept}
          style={styles.sectionHeader}
        />
        <Card radius={22} padding={0}>
          {boardMembers.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <View style={styles.divider} />}
              <MemberRow
                member={m}
                avatarState="kept"
                glow={i === 0}
                subtitle={keptRuns[m.id]?.meta ?? ''}
                trailing={<StreakValue value={m.streak} color={m.color} />}
                style={styles.rowInset}
              />
            </View>
          ))}
        </Card>
      </FadeInView>

      {/* Still has today */}
      <FadeInView delay={260} style={styles.section}>
        <SectionHeader
          title="Still has today"
          count={stillMembers.length}
          tint={colors.warn}
          style={styles.sectionHeader}
        />
        <Card radius={22} padding={0}>
          {stillMembers.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <View style={styles.divider} />}
              <MemberRow
                member={m}
                avatarState="today"
                subtitle={`Day ${m.streak} · still has today`}
                subtitleColor={colors.warn}
                trailing={<CheerButton />}
                style={styles.rowInset}
              />
            </View>
          ))}
        </Card>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.section,
    paddingTop: 8,
  },
  date: { fontFamily: fonts.sansLabel, fontSize: 14, color: colors.faint, letterSpacing: 0.2 },
  section: { paddingHorizontal: spacing.lg, marginTop: 16 },
  sectionHeader: { marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  summaryFraction: { fontFamily: fonts.serif, fontSize: 15, color: colors.ink },
  summaryTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 23, color: colors.ink },
  summarySub: { fontFamily: fonts.sansBody, fontSize: 12.5, color: colors.muted, marginTop: 3 },
  divider: { height: 1, backgroundColor: '#F4EBDD', marginLeft: 63 },
  rowInset: { paddingVertical: 13, paddingHorizontal: 15 },
});
