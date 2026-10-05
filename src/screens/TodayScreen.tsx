import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { AvatarStack } from '../components/AvatarStack';
import { Card } from '../components/Card';
import { CheerButton } from '../components/CheerButton';
import { FadeInView } from '../components/FadeInView';
import { Check } from '../components/Icons';
import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { StreakRing } from '../components/StreakRing';
import { TextButton } from '../components/TextButton';
import { joinNames } from '../data/workouts';
import { Member } from '../data/types';
import { AppView, GoalView, StreakView } from '../state/buildView';
import { useView } from '../state/AppState';
import { useYesterdayOpen } from '../state/useYesterdayOpen';
import { MainTabScreenProps } from '../navigation/types';

export function TodayScreen({ navigation }: MainTabScreenProps<'Today'>) {
  const view = useView();
  const { streak, goal } = view;
  const afterBreak = streak.restartDay;
  let delay = 0;
  const next = () => (delay += 60);

  const streakCard = <StreakCard streak={streak} />;

  return (
    <Screen>
      <FadeInView delay={0} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{view.today.dateLabel}</Text>
          <Text style={[type.greeting, { marginTop: 4 }]}>{view.today.greeting}</Text>
        </View>
        <AvatarRing member={view.me} size={40} />
      </FadeInView>

      {/* After a break, Today leads with the number that can't break. */}
      {afterBreak ? (
        <FadeInView delay={next()} style={styles.section}>
          {streakCard}
        </FadeInView>
      ) : null}
      {afterBreak ? (
        <FadeInView delay={next()} style={styles.section}>
          <BackAtItCard />
        </FadeInView>
      ) : null}

      <FadeInView delay={next()} style={styles.section}>
        <MoveSection view={view} onLog={(day) => navigation.navigate('LogToday', { day })} />
      </FadeInView>

      <FadeInView delay={next()} style={styles.section}>
        <SummaryCard view={view} onInvite={() => navigation.navigate('Invite')} />
      </FadeInView>

      {!afterBreak ? (
        <FadeInView delay={next()} style={styles.section}>
          {streakCard}
        </FadeInView>
      ) : null}

      {goal.status !== 'none' ? (
        <FadeInView delay={next()} style={styles.section}>
          <GoalCard goal={goal} onOpenMilestone={() => navigation.navigate('Milestone', { kind: 'family' })} />
        </FadeInView>
      ) : null}

      <FadeInView delay={next()} style={styles.section}>
        <SectionHeader
          title="Family today"
          action={view.nudgeTarget ? 'Nudge' : undefined}
          onAction={() => navigation.navigate('Nudge', { memberId: view.nudgeTarget?.id })}
          style={{ marginBottom: 2 }}
        />
        <View>
          {[...view.familyList, ...view.invitedList].map((m, i, all) => {
            const nudgeable = !m.invited && m.id !== view.me.id && m.today === 'still';
            return (
              <FadeInView key={m.id} delay={delay + i * 40}>
                <MemberRow
                  member={m}
                  last={i === all.length - 1}
                  onPress={
                    m.invited
                      ? () => navigation.navigate('Invite')
                      : nudgeable
                        ? () => navigation.navigate('Nudge', { memberId: m.id })
                        : undefined
                  }
                />
              </FadeInView>
            );
          })}
        </View>
      </FadeInView>
    </Screen>
  );
}

// ─── Move: the biggest thing on the screen ───────────────────────────────────

function MoveSection({ view, onLog }: { view: AppView; onLog: (day: 'today' | 'yesterday') => void }) {
  const yesterdayOk = useYesterdayOpen();
  if (view.iKeptToday) {
    return (
      <Card radius={radii.cardLg} padding={16} background={colors.keptBg} style={styles.keptCard}>
        <View style={styles.keptTick}>
          <Check size={18} color={colors.white} strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.keptTitle}>You moved today</Text>
          <Text style={styles.keptMeta} numberOfLines={1}>
            {view.me.meta}
          </Text>
        </View>
        <TextButton label="Add another" onPress={() => onLog('today')} />
      </Card>
    );
  }
  return (
    <View>
      <PrimaryButton
        title="I moved today"
        size="large"
        icon={<Check size={22} color={colors.white} strokeWidth={2.6} />}
        onPress={() => onLog('today')}
      />
      {yesterdayOk && (
        <View style={styles.yesterday}>
          <Text style={styles.yesterdayText}>Forgot yesterday? </Text>
          <TextButton label="Log yesterday" onPress={() => onLog('yesterday')} />
        </View>
      )}
    </View>
  );
}

// ─── "x of y kept it today", including a family of one ───────────────────────

function SummaryCard({ view, onInvite }: { view: AppView; onInvite: () => void }) {
  const { joinedCount, keptCount, invitedList, today } = view;
  const solo = joinedCount === 1;
  const everyone = joinedCount > 1 && keptCount === joinedCount;

  return (
    <Card radius={radii.cardLg} padding={18}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={type.bigNumber}>
            {keptCount} of {joinedCount}
          </Text>
          <Text style={styles.keptLabel}>kept it today</Text>
          <AvatarStack members={view.familyList} size={28} overlap={8} style={{ marginTop: 14 }} />
        </View>
        <StreakRing value={keptCount} goal={joinedCount} size={84} strokeWidth={9} />
      </View>

      {solo ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {invitedList.length
              ? `Waiting for ${joinNames(invitedList.map((m) => m.name))} to join.`
              : 'Your family starts when someone joins.'}
          </Text>
          <TextButton label={invitedList.length ? 'Send the invite again' : 'Invite a family member'} onPress={onInvite} />
        </View>
      ) : today.pending ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>{today.pending.prompt} — </Text>
          {today.pending.cta ? <CheerButton variant="link" label={today.pending.cta} cheeredLabel="Cheered" /> : null}
        </View>
      ) : everyone ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Everyone’s kept today.</Text>
        </View>
      ) : null}
    </Card>
  );
}

// ─── Streak that can break, and the number that can't ────────────────────────

function StreakCard({ streak }: { streak: StreakView }) {
  if (streak.kind === 'solo') {
    return (
      <Card radius={radii.cardLg} padding={18}>
        <Text style={styles.cardLabel}>Your streak</Text>
        <Text style={styles.streakBig}>{streak.current > 0 ? `Day ${streak.current}` : 'Start today'}</Text>
        <Text style={styles.cardNote}>
          The family streak and your days together start counting when the second person joins.
        </Text>
      </Card>
    );
  }

  // After a break there's no zero: lead with days together and the longest streak.
  const leadsWithTogether = streak.kind === 'afterBreak';
  return (
    <Card radius={radii.cardLg} padding={18}>
      {leadsWithTogether ? (
        <>
          <Text style={styles.cardLabel}>Days together this year</Text>
          <Text style={styles.streakBig}>{streak.daysTogether}</Text>
          <Text style={styles.cardNote}>This number never goes back to zero.</Text>
        </>
      ) : (
        <>
          <Text style={styles.cardLabel}>Family streak</Text>
          <Text style={styles.streakBig}>Day {streak.current}</Text>
        </>
      )}
      <View style={styles.statRow}>
        {!leadsWithTogether ? (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{streak.daysTogether}</Text>
            <Text style={styles.statLabel}>days together this year</Text>
          </View>
        ) : null}
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streak.longest}</Text>
          <Text style={styles.statLabel}>{leadsWithTogether ? 'longest streak, in days' : 'longest streak'}</Text>
        </View>
      </View>
    </Card>
  );
}

/** Day 1 after a break. Says nothing about who missed. */
function BackAtItCard() {
  return (
    <Card radius={radii.cardLg} padding={18} background={colors.todayPillBg} style={{ borderColor: '#F3D7BC' }}>
      <Text style={styles.backTitle}>Back at it, together</Text>
      <Text style={styles.backBody}>
        A fresh start today. Every day you’ve spent together still counts, and a new streak begins when everyone moves.
      </Text>
    </Card>
  );
}

// ─── Your first 30 days together ─────────────────────────────────────────────

function GoalCard({ goal, onOpenMilestone }: { goal: GoalView; onOpenMilestone: () => void }) {
  if (goal.status === 'done') {
    return (
      <Card radius={radii.cardLg} padding={18} background={colors.keptBg} onPress={onOpenMilestone}>
        <Text style={[styles.cardLabel, { color: colors.kept }]}>Your first 30 days together</Text>
        <Text style={styles.goalDone}>You did it. 30 days together.</Text>
        <Text style={styles.cardNote}>See your milestone</Text>
      </Card>
    );
  }
  const waiting = goal.status === 'waiting';
  return (
    <Card radius={radii.cardLg} padding={18}>
      <View style={styles.goalHead}>
        <Text style={styles.cardLabel}>Your first 30 days together</Text>
        <Text style={styles.goalCount}>{waiting ? '0' : goal.day} of {goal.total}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(goal.day / goal.total) * 100}%` }]} />
      </View>
      <Text style={styles.cardNote}>
        {waiting ? 'Starts when your first family member joins.' : 'A milestone card waits at the end.'}
      </Text>
    </Card>
  );
}

// ─── Family list ─────────────────────────────────────────────────────────────

function MemberRow({ member, last, onPress }: { member: Member; last: boolean; onPress?: () => void }) {
  const kept = member.today === 'kept';
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? (member.invited ? `Invite ${member.name} again` : `Nudge ${member.name}`) : undefined}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <AvatarRing member={member} size={40} />
      <View style={styles.rowMiddle}>
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {member.meta}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View
          style={[
            styles.pill,
            { backgroundColor: member.invited ? colors.divider : kept ? colors.keptBg : colors.todayPillBg },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: member.invited ? colors.muted : kept ? colors.kept : colors.todayPillText },
            ]}
          >
            {member.invited ? 'Invited' : kept ? 'Kept' : 'Today'}
          </Text>
        </View>
        <Text style={styles.streak}>{member.streak > 0 ? member.streak : ''}</Text>
      </View>
    </Wrapper>
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
  keptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: '#D3E4D8' },
  keptTick: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.kept,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keptTitle: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  keptMeta: { fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  yesterday: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  yesterdayText: { fontSize: 13, color: colors.muted },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keptLabel: { fontSize: 14, color: colors.muted, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 4,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
  },
  footerText: { fontSize: 13, color: '#8A8073' },
  cardLabel: { fontSize: 13, fontWeight: weights.semibold, color: colors.muted },
  cardNote: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 6 },
  streakBig: { fontSize: 34, lineHeight: 40, fontWeight: weights.bold, letterSpacing: -0.6, color: colors.ink, marginTop: 4 },
  statRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
  },
  stat: { flex: 1 },
  statValue: { ...type.stat },
  statLabel: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  backTitle: { fontSize: 18, fontWeight: weights.bold, letterSpacing: -0.2, color: colors.todayPillText },
  backBody: { fontSize: 13.5, lineHeight: 19, color: colors.inkSoft, marginTop: 6 },
  goalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalCount: { fontSize: 13, fontWeight: weights.semibold, color: colors.primary, fontVariant: ['tabular-nums'] },
  goalDone: { fontSize: 18, fontWeight: weights.bold, letterSpacing: -0.2, color: colors.ink, marginTop: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#F0E7D8', marginTop: 12, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
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
