import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarRing } from '../components/AvatarRing';
import { CogIcon } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { members, profile } from '../data/family';
import { MainTabScreenProps } from '../navigation/types';

export function ProfileScreen({ navigation }: MainTabScreenProps<'Me'>) {
  const me = members[profile.memberId];

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
          <Text style={styles.location}>{profile.location}</Text>
          <Pressable style={styles.editPill}>
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
              <Text style={[styles.statValue, s.accent && { color: colors.primary }]}>
                {s.value}
                {s.unit ? <Text style={styles.statUnit}> {s.unit}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      </FadeInView>

      <FadeInView delay={120} style={styles.section}>
        <SectionHeader title="Recent runs" action="See all" titleColor={colors.ink} style={styles.sectionHead} />
        {profile.recentRuns.map((r, i) => (
          <Pressable
            key={r.when}
            onPress={() => navigation.navigate('RunDetail')}
            accessibilityRole="button"
            accessibilityLabel={`Run ${r.when}`}
            style={[styles.runRow, i < profile.recentRuns.length - 1 && styles.runBorder]}
          >
            <AvatarRing member={members[r.memberId]} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.runWhen}>{r.when}</Text>
              <Text style={styles.runMeta}>
                {r.dist} · {r.place}
              </Text>
            </View>
          </Pressable>
        ))}
      </FadeInView>

      <FadeInView delay={160} style={styles.section}>
        <SectionHeader title="Milestones" action="See all" titleColor={colors.ink} style={styles.sectionHead} />
        <View style={styles.milestones}>
          {profile.milestones.map((n, i) => (
            <Pressable
              key={n}
              style={styles.msCol}
              accessibilityRole={i === 0 ? 'button' : undefined}
              accessibilityLabel={i === 0 ? `${n} day milestone` : undefined}
              onPress={i === 0 ? () => navigation.navigate('Milestone') : undefined}
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
  location: { fontSize: 13, color: colors.faint, marginTop: 2 },
  editPill: {
    alignSelf: 'flex-start',
    marginTop: 9,
    borderWidth: 1,
    borderColor: '#E5DCCD',
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  editText: { fontSize: 12.5, fontWeight: weights.semibold, color: colors.inkSoft },
  section: { paddingHorizontal: spacing.gutter, marginTop: 18 },
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
  statLabel: { fontSize: 12, color: colors.muted },
  statValue: { fontSize: 22, fontWeight: weights.bold, color: colors.ink, marginTop: 3 },
  statUnit: { fontSize: 13, fontWeight: weights.semibold, color: colors.faint2 },
  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8.5 },
  runBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  runWhen: { fontSize: 14, fontWeight: weights.semibold, color: colors.ink },
  runMeta: { fontSize: 12.5, color: colors.faint, marginTop: 1 },
  milestones: { flexDirection: 'row', gap: 16, marginTop: 4 },
  msCol: { alignItems: 'center', gap: 6 },
  msCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msNumber: { fontSize: 18, fontWeight: weights.bold, color: colors.primary },
  msLabel: { fontSize: 11, color: colors.faint2 },
});
