import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { CogIcon } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { useView } from '../state/AppState';
import { workoutSourceLabels, workoutSummary, workoutTypeLabels } from '../data/workouts';
import { MainTabScreenProps } from '../navigation/types';

export function ProfileScreen({ navigation }: MainTabScreenProps<'Me'>) {
  const view = useView();
  const me = view.me;
  const profile = view.profile;

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={10} accessibilityLabel="Settings">
          <CogIcon />
        </Pressable>
      </View>

      <FadeInView style={styles.identity}>
        <AvatarRing member={me} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me.name}</Text>
          <Text style={styles.location}>{profile.subtitle}</Text>
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={styles.editPill}
          >
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        </View>
      </FadeInView>

      <FadeInView delay={60} style={styles.section}>
        <View style={styles.statsCard}>
          {profile.stats.map((s, i) => (
            <View
              key={s.label}
              style={[styles.statCell, i % 2 === 0 && styles.cellRight, i < 2 && styles.cellBottom]}
            >
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>
                {s.value}
                {s.unit ? <Text style={styles.statUnit}> {s.unit}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <SectionHeader title="Recent workouts" titleColor={colors.ink} style={styles.sectionHead} />
        {profile.recentWorkouts.length === 0 ? (
          <Text style={styles.empty}>Your workouts show up here once you log one.</Text>
        ) : null}
        {profile.recentWorkouts.map((w, i) => (
          <Pressable
            key={w.id}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })}
            accessibilityRole="button"
            accessibilityLabel={`${workoutTypeLabels[w.type]} ${w.when}`}
            style={[styles.workoutRow, i < profile.recentWorkouts.length - 1 && styles.workoutBorder]}
          >
            <AvatarRing member={view.members[w.memberId] ?? me} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.workoutWhen}>{w.when}</Text>
              <Text style={styles.workoutMeta}>
                {workoutSummary(w)} · {workoutSourceLabels[w.source]}
              </Text>
            </View>
          </Pressable>
        ))}
      </FadeInView>

      <FadeInView delay={160} style={styles.section}>
        <SectionHeader title="Milestones" titleColor={colors.ink} style={styles.sectionHead} />
        {profile.milestones.length === 0 ? (
          <Text style={styles.empty}>Your first one is 7 days in a row.</Text>
        ) : null}
        <View style={styles.milestones}>
          {profile.milestones.map((n) => (
            <Pressable
              key={n}
              style={styles.msCol}
              accessibilityRole="button"
              accessibilityLabel={`${n} day milestone`}
              onPress={() => navigation.navigate('Milestone', { kind: 'personal', days: n })}
            >
              <View style={styles.msCircle}>
                <Text style={styles.msNumber}>{n}</Text>
              </View>
              <Text style={styles.msLabel}>days</Text>
            </Pressable>
          ))}
        </View>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing.gutter, paddingTop: 2 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingHorizontal: spacing.gutter,
    paddingTop: 2,
  },
  name: { ...type.stat, fontSize: 22 },
  location: { ...type.meta, marginTop: 2 },
  editPill: {
    alignSelf: 'flex-start',
    marginTop: 9,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  editText: { ...type.meta, fontWeight: weights.semibold, color: colors.inkSoft },
  section: { paddingHorizontal: spacing.gutter, marginTop: 24 },
  sectionHead: { marginBottom: 4 },
  statsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  statCell: { width: '50%', padding: 14 },
  cellRight: { borderRightWidth: 1, borderRightColor: colors.divider },
  cellBottom: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  statLabel: { ...type.meta, color: colors.muted },
  statValue: { ...type.stat, marginTop: 3 },
  statUnit: { fontFamily: undefined, fontSize: 13, fontWeight: weights.medium, color: colors.faint2 },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  workoutBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  workoutWhen: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink },
  workoutMeta: { ...type.meta, marginTop: 1 },
  empty: { ...type.body, marginTop: 6 },
  milestones: { flexDirection: 'row', gap: 16, marginTop: 4 },
  msCol: { alignItems: 'center', gap: 6 },
  msCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msNumber: { ...type.stat, fontSize: 20, lineHeight: 24 },
  msLabel: { ...type.meta, color: colors.faint2 },
});
