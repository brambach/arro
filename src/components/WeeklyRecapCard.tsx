import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { Member, WeekDay } from '../data/types';
import { AvatarStack } from './AvatarStack';
import { DayPill } from './DayPill';
import { ArroMark } from './Icons';

/**
 * WeeklyRecapCard (Spec §8 / frame 3a) — the simple, shareable weekly recap.
 * Deliberately not a dense habit tracker: one week strip, one headline number,
 * the family, one warm line.
 */
type Props = {
  range: string;
  headline: string;
  days: WeekDay[];
  keptDays: number;
  totalDays: number;
  runsTogether: number;
  quote: string;
  members: Member[];
  style?: StyleProp<ViewStyle>;
};

export function WeeklyRecapCard({
  range,
  headline,
  days,
  keptDays,
  totalDays,
  runsTogether,
  quote,
  members,
  style,
}: Props) {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={gradients.recapStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.strip}
      />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={type.overline}>{range}</Text>
          <ArroMark size={26} />
        </View>

        <Text style={styles.headline}>{headline}</Text>

        <View style={styles.days}>
          {days.map((d, i) => (
            <DayPill key={i} state={d.state} label={d.label} />
          ))}
        </View>

        <View style={styles.bigRow}>
          <Text style={styles.bigNumber}>{keptDays}</Text>
          <Text style={styles.bigCaption}>
            of {totalDays} days the whole{'\n'}family moved forward
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.footerRow}>
          <AvatarStack members={members} size={40} overlap={10} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.runsValue}>{runsTogether}</Text>
            <Text style={styles.runsLabel}>runs together</Text>
          </View>
        </View>

        <Text style={styles.quote}>{quote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFCF7',
    borderRadius: 30,
    overflow: 'hidden',
    ...shadows.hero,
  },
  strip: { height: 8 },
  body: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 26 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 30,
    color: colors.ink,
    marginTop: 14,
  },
  days: { flexDirection: 'row', gap: 5, marginTop: 20 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 24 },
  bigNumber: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 40, color: colors.primary },
  bigCaption: { fontFamily: fonts.sansLabel, fontSize: 15, lineHeight: 19, color: colors.reactionInk },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: 22 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  runsValue: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  runsLabel: { fontFamily: fonts.sansLabel, fontSize: 11, color: colors.faint },
  quote: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: '#B06A34',
    textAlign: 'center',
    marginTop: 20,
  },
});
