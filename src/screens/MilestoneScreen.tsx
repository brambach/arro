import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/tokens';
import { motion } from '../theme/motion';
import { type, weights } from '../theme/typography';
import { AvatarStack } from '../components/AvatarStack';
import { ChevronLeft } from '../components/Icons';
import { Backdrop } from '../components/Backdrop';
import { PhotoSlot } from '../components/PhotoSlot';
import { FadeInView } from '../components/FadeInView';
import { MilestoneData } from '../data/types';
import { joinNames } from '../data/workouts';
import { useView } from '../state/AppState';
import { RootStackScreenProps } from '../navigation/types';

export function MilestoneScreen({ navigation, route }: RootStackScreenProps<'Milestone'>) {
  const insets = useSafeAreaInsets();
  // On short phones (SE) the caption sits under the numeral, so nothing overlaps.
  const short = useWindowDimensions().height < 740;
  const view = useView();
  // "Your first 30 days together" ends on the family card; the Me tab shows your own runs.
  const params = route.params;
  const milestone: MilestoneData =
    params.kind === 'family'
      ? view.milestone
      : {
          memberId: view.me.id,
          day: params.days,
          title: `${params.days} days\nin a row`,
          subtitle: 'One day at a time, every one of them counted.',
          motto: 'Every day forward, together.',
          dateLine: '',
          cheeredBy: [],
        };
  const cheerers = milestone.cheeredBy.map((id) => view.members[id]).filter(Boolean);
  // Without a photo the top is plain paper with ink type, not a grey stand-in under a dark gradient.
  const hasPhoto = !!milestone.photoUri;

  return (
    <View style={styles.root}>
      {/* The end of a day: the same moving map, under the evening light. */}
      <Backdrop light="dusk" />
      <View style={styles.photo}>
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
          <>
            <FadeInView delay={80} rise={14} {...motion.statement} style={[styles.numeralWrap, { top: insets.top + 56 }]}>
              <Text style={styles.numeral} accessibilityElementsHidden importantForAccessibility="no">
                {milestone.day}
              </Text>
            </FadeInView>
          </>
        )}
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.back, !hasPhoto && styles.backPaper, { top: insets.top + 8 }]}
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <ChevronLeft size={20} color={hasPhoto ? colors.white : colors.ink} strokeWidth={2.2} />
        </Pressable>
        <FadeInView
          delay={220}
          rise={12}
          {...motion.statement}
          style={[styles.caption, !hasPhoto && (short ? { top: insets.top + 200, bottom: undefined } : styles.captionPaper)]}
        >
          <View style={[styles.dayPill, !hasPhoto && styles.dayPillPaper]}>
            <Text style={[styles.dayPillText, !hasPhoto && { color: colors.todayPillText }]}>Day {milestone.day}</Text>
          </View>
          <Text style={[styles.title, !hasPhoto && { color: colors.ink }]}>{milestone.title}</Text>
          <Text style={[styles.subtitle, !hasPhoto && { color: colors.inkSoft }]}>{milestone.subtitle}</Text>
        </FadeInView>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 22 }]}>
        <Text style={styles.motto}>{milestone.motto}</Text>
        {milestone.dateLine ? <Text style={styles.dateLine}>{milestone.dateLine}</Text> : null}
        {/* Cheers and "Send a cheer" come back once milestones live on the server. */}
        {cheerers.length ? (
          <View style={styles.cheered}>
            <AvatarStack members={cheerers} size={26} overlap={6} borderColor={colors.screen} />
            <Text style={styles.cheeredText}>Cheered on by {joinNames(cheerers.map((c) => c.name))}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  photo: { flex: 1, overflow: 'hidden' },
  numeralWrap: { position: 'absolute', left: spacing.gutter },
  numeral: {
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
  // Low on the page, in the evening light.
  captionPaper: { bottom: 40 },
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
  panel: { paddingHorizontal: spacing.gutter, paddingTop: 20 },
  motto: { ...type.greeting },
  dateLine: { ...type.meta, marginTop: 4 },
  cheered: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  cheeredText: { ...type.meta, color: colors.muted, flex: 1 },
});
