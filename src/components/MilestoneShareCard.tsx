import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadows } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { MilestoneData } from '../data/types';
import { members } from '../data/family';
import { AvatarRing } from './AvatarRing';
import { PhotoSlot } from './PhotoSlot';

/**
 * MilestoneShareCard (Spec §8 / frame 6b) — the keepsake photo card:
 * photo + day badge + milestone title, with a footer carrying the person's
 * avatar, the family motto, and the date. This is the shareable artifact.
 */
export function MilestoneShareCard({
  milestone,
  style,
}: {
  milestone: MilestoneData;
  style?: StyleProp<ViewStyle>;
}) {
  const member = members[milestone.memberId];

  return (
    <View style={[styles.card, style]}>
      <PhotoSlot uri={milestone.photoUri} style={styles.photo} placeholderLabel="Bryce's sunrise run">
        <LinearGradient
          colors={['rgba(64,40,20,0.05)', 'rgba(64,40,20,0)', 'rgba(120,60,20,0.55)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>Day {milestone.day}</Text>
        </View>
        <View style={styles.caption}>
          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.subtitle}>{milestone.subtitle}</Text>
        </View>
      </PhotoSlot>

      <View style={styles.footer}>
        <AvatarRing member={member} size={52} ringWidth={2.5} state="today" badge="none" />
        <View style={styles.footerText}>
          <Text style={styles.quote}>{milestone.quote}</Text>
          <Text style={styles.dateLine}>{milestone.dateLine}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.cardLg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    transform: [{ rotate: '-1.4deg' }],
    ...shadows.hero,
  },
  photo: { height: 300, width: '100%' },
  dayBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  dayBadgeText: { fontFamily: fonts.serif, fontSize: 15, color: colors.primary },
  caption: { position: 'absolute', left: 18, right: 18, bottom: 16 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 29,
    lineHeight: 31,
    color: colors.white,
    textShadowColor: 'rgba(80,40,10,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontFamily: fonts.sansLabel,
    fontSize: 13,
    color: colors.white,
    opacity: 0.95,
    marginTop: 5,
    textShadowColor: 'rgba(80,40,10,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  footerText: { flex: 1 },
  quote: { fontFamily: fonts.serifItalic, fontSize: 15, color: colors.ink },
  dateLine: { fontFamily: fonts.sansLabel, fontSize: 12, color: colors.faint, marginTop: 2 },
});
