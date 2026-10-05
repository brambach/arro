import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/tokens';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { ChevronLeft, ShareIcon } from '../components/Icons';
import { PhotoSlot } from '../components/PhotoSlot';
import { PrimaryButton } from '../components/PrimaryButton';
import { milestone as personalMilestone } from '../data/family';
import { joinNames } from '../data/workouts';
import { useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

export function MilestoneScreen({ navigation, route }: RootStackScreenProps<'Milestone'>) {
  const insets = useSafeAreaInsets();
  const view = useView();
  // "Your first 30 days together" ends on the family card; the Me tab shows Bryce's own.
  const milestone = route.params?.kind === 'family' ? view.milestone : personalMilestone;
  const cheerers = milestone.cheeredBy.map((id) => view.members[id]).filter(Boolean);
  // Without a photo the top is plain paper with ink type, not a grey stand-in under a dark gradient.
  const hasPhoto = !!milestone.photoUri;

  return (
    <View style={styles.root}>
      <View style={[styles.photo, !hasPhoto && styles.paper]}>
        {hasPhoto ? (
          <>
            <PhotoSlot uri={milestone.photoUri} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(22,15,8,0.42)', 'rgba(22,15,8,0)', 'rgba(22,15,8,0.06)', 'rgba(22,15,8,0.84)']}
              locations={[0, 0.26, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        ) : (
          <Text style={[styles.numeral, { top: insets.top + 56 }]} accessibilityElementsHidden importantForAccessibility="no">
            {milestone.day}
          </Text>
        )}
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.back, !hasPhoto && styles.backPaper, { top: insets.top + 8 }]}
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ChevronLeft size={20} color={hasPhoto ? colors.white : colors.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.caption}>
          <View style={[styles.dayPill, !hasPhoto && styles.dayPillPaper]}>
            <Text style={[styles.dayPillText, !hasPhoto && { color: colors.todayPillText }]}>Day {milestone.day}</Text>
          </View>
          <Text style={[styles.title, !hasPhoto && { color: colors.ink }]}>{milestone.title}</Text>
          <Text style={[styles.subtitle, !hasPhoto && { color: colors.inkSoft }]}>{milestone.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 22 }]}>
        <Text style={styles.motto}>{milestone.motto}</Text>
        <Text style={styles.dateLine}>{milestone.dateLine}</Text>
        <View style={styles.cheered}>
          <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
          <Text style={styles.cheeredText}>Cheered on by {joinNames(cheerers.map((c) => c.name))}</Text>
        </View>
        <View style={styles.actions}>
          <PrimaryButton title="Send a cheer" onPress={() => {}} style={{ flex: 1 }} />
          <Pressable style={styles.shareBtn} accessibilityLabel="Share">
            <ShareIcon size={20} color={colors.inkSoft} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  photo: { flex: 1, overflow: 'hidden' },
  paper: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  numeral: {
    position: 'absolute',
    left: spacing.gutter,
    fontFamily: type.display.fontFamily,
    fontSize: 150,
    lineHeight: 160,
    fontWeight: weights.regular,
    color: colors.track,
  },
  back: {
    position: 'absolute',
    left: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPaper: { backgroundColor: colors.screen },
  caption: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, bottom: 24 },
  dayPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  dayPillPaper: { backgroundColor: colors.todayPillBg },
  dayPillText: { color: colors.white, fontSize: 13, fontWeight: weights.semibold },
  title: { ...type.display, color: colors.white },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.92)', marginTop: 11 },
  panel: { paddingHorizontal: spacing.gutter, paddingTop: 20, backgroundColor: colors.screen },
  motto: { ...type.greeting },
  dateLine: { ...type.meta, marginTop: 4 },
  cheered: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  cheeredText: { ...type.meta, color: colors.muted, flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18, alignItems: 'center' },
  shareBtn: {
    width: 54,
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
