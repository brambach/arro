import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { Card } from '../components/Card';
import { CountUp } from '../components/CountUp';
import { FadeInView } from '../components/FadeInView';
import { SectionHeader } from '../components/SectionHeader';
import { SettingsIcon } from '../components/Icons';
import { StreakRing } from '../components/StreakRing';
import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { members, profile } from '../data/family';
import { ProfileBadge, RecentRun } from '../data/types';
import { MainTabScreenProps } from '../navigation/types';

export function ProfileScreen({ navigation }: MainTabScreenProps<'Me'>) {
  const insets = useSafeAreaInsets();
  const me = members[profile.memberId];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 12,
          paddingHorizontal: 22,
        }}
      >
        {/* Identity */}
        <FadeInView delay={40} style={styles.identity}>
          <AvatarRing
            member={me}
            size={96}
            ringWidth={3.5}
            state="kept"
            glow
            badgeSize={32}
          />
          <Text style={styles.name}>{me.name}</Text>
          <Text style={styles.tagline}>{profile.tagline}</Text>
        </FadeInView>

        {/* Current streak */}
        <FadeInView delay={140}>
          <Card background={colors.warmFill} radius={26} padding={20} style={styles.streakCard}>
            <View>
              <Text style={styles.streakOverline}>Current streak</Text>
              <View style={styles.streakValueRow}>
                <CountUp
                  value={profile.currentStreak}
                  duration={1100}
                  style={styles.streakNumber}
                />
                <Text style={styles.streakDays}>days</Text>
              </View>
            </View>
            <StreakRing
              value={profile.currentStreak}
              goal={profile.goal}
              size={74}
              strokeWidth={8}
              innerBg="#FFE9D0"
            >
              <Text style={styles.goalNumber}>{profile.goal}</Text>
              <Text style={styles.goalLabel}>GOAL</Text>
            </StreakRing>
          </Card>
        </FadeInView>

        {/* Stats */}
        <FadeInView delay={200} style={styles.statsRow}>
          {profile.stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <CountUp value={s.value} duration={1150} style={styles.statValue} />
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </FadeInView>

        {/* Milestones */}
        <FadeInView delay={250}>
          <SectionHeader title="Milestones" style={styles.sectionHeader} />
          <View style={styles.badges}>
            {profile.badges.map((b) => (
              <MilestoneBadge
                key={b.day}
                badge={b}
                onPress={b.reached ? () => navigation.navigate('Milestone') : undefined}
              />
            ))}
          </View>
        </FadeInView>

        {/* Recent runs */}
        <FadeInView delay={320}>
          <SectionHeader title="Recent runs" style={styles.sectionHeader} />
          <View style={{ gap: 8 }}>
            {profile.recentRuns.map((r) => (
              <RecentRunRow key={r.title} run={r} />
            ))}
          </View>
        </FadeInView>
      </ScrollView>

      {/* Settings entry */}
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        hitSlop={10}
        style={[styles.settingsBtn, { top: insets.top + 10 }]}
        accessibilityLabel="Settings"
      >
        <SettingsIcon size={22} color={colors.faint} />
      </Pressable>
    </View>
  );
}

function MilestoneBadge({ badge, onPress }: { badge: ProfileBadge; onPress?: () => void }) {
  return (
    <Pressable style={styles.badgeCol} onPress={onPress} disabled={!onPress}>
      <View style={[styles.badgeCircle, badge.reached ? styles.badgeReached : styles.badgeLocked]}>
        <Text style={[styles.badgeNumber, !badge.reached && { color: colors.tabInactive }]}>
          {badge.day}
        </Text>
      </View>
      <Text style={[styles.badgeLabel, !badge.reached && { color: colors.tabInactive }]}>
        {badge.label}
      </Text>
    </Pressable>
  );
}

function RecentRunRow({ run }: { run: RecentRun }) {
  return (
    <Card radius={18} padding={0}>
      <View style={styles.recentRow}>
        <LinearGradient colors={run.tint} style={styles.recentTile} />
        <View style={{ flex: 1 }}>
          <Text style={type.name}>{run.title}</Text>
          <Text style={styles.recentMeta}>{run.meta}</Text>
        </View>
        <Text style={styles.recentDay}>Day {run.day}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  settingsBtn: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { alignItems: 'center', paddingTop: 8 },
  name: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink, marginTop: 12 },
  tagline: { fontFamily: fonts.sansLabel, fontSize: 13, color: colors.faint, marginTop: 2 },
  streakCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakOverline: {
    fontFamily: fonts.sansHeavy,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#C88A3A',
  },
  streakValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  streakNumber: { fontFamily: fonts.serif, fontSize: 52, lineHeight: 54, color: colors.primary },
  streakDays: { fontFamily: fonts.serif, fontSize: 20, color: colors.primaryPress },
  goalNumber: { fontFamily: fonts.serif, fontSize: 17, color: colors.ink, lineHeight: 19 },
  goalLabel: {
    fontFamily: fonts.sansHeavy,
    fontSize: 8,
    letterSpacing: 0.4,
    color: '#C88A3A',
    marginTop: 1,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  statValue: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  statLabel: { fontFamily: fonts.sansLabel, fontSize: 11.5, color: colors.faint, marginTop: 2 },
  sectionHeader: { marginTop: 18, marginBottom: 10 },
  badges: { flexDirection: 'row', gap: 12 },
  badgeCol: { flex: 1, alignItems: 'center', gap: 6 },
  badgeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeReached: { backgroundColor: colors.primary, ...shadows.card },
  badgeLocked: { backgroundColor: '#F3E7D5', borderWidth: 2, borderColor: '#E4CFB2' },
  badgeNumber: { fontFamily: fonts.serif, fontSize: 18, color: colors.white },
  badgeLabel: { fontFamily: fonts.sansLabel, fontSize: 11, color: colors.reactionInk },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 15 },
  recentTile: { width: 36, height: 36, borderRadius: 12 },
  recentMeta: { fontFamily: fonts.sansBody, fontSize: 12, color: colors.muted, marginTop: 1 },
  recentDay: { fontFamily: fonts.sansLabel, fontSize: 12, color: colors.kept },
});
