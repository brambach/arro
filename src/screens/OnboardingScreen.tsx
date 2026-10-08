import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, memberColors, radii } from '../theme/tokens';
import { fonts, weights } from '../theme/typography';
import { ArroMark } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { PrimaryButton } from '../components/PrimaryButton';
import { StreakChain } from '../components/StreakChain';
import { familyList, welcomeChain, welcomeDayLabels } from '../data/family';
import { RootStackScreenProps } from '../navigation/types';

const daysBetween = familyList.reduce((sum, m) => sum + m.streak, 0);

/**
 * Welcome — the first thing anyone in the family sees. Leads with what Arro
 * feels like (everyone's week, linked) rather than a feature list, then one
 * clear way in.
 */
export function OnboardingScreen({ navigation }: RootStackScreenProps<'Onboarding'>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFE6CF', '#FFF3E6', colors.screen]}
        locations={[0, 0.32, 0.62]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 22 }]}>
        <FadeInView style={styles.brand}>
          <ArroMark size={30} />
          <Text style={styles.wordmark}>Arro</Text>
        </FadeInView>

        <View style={styles.spacerTop} />

        <FadeInView delay={90} rise={12}>
          <Text style={styles.headline}>
            Every day forward,{'\n'}
            <Text style={styles.headlineSoft}>together.</Text>
          </Text>
        </FadeInView>

        <FadeInView delay={170} rise={12}>
          <Text style={styles.lede}>
            One run a day, wherever everyone is. Your family’s streaks sit side by side, so nobody
            carries the chain alone.
          </Text>
        </FadeInView>

        <FadeInView delay={260} rise={16} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>This week</Text>
            <Text style={styles.cardAside}>{daysBetween} days between you</Text>
          </View>
          <StreakChain rows={welcomeChain} labels={welcomeDayLabels} delay={420} />
          <View style={styles.cardFoot}>
            <View style={styles.footDot} />
            <Text style={styles.footText}>Darcey still has today. Usually an evening run.</Text>
          </View>
        </FadeInView>

        <View style={styles.spacer} />

        <FadeInView delay={520} rise={10}>
          <PrimaryButton title="Connect Strava" onPress={() => navigation.replace('Main')} />
          <Text style={styles.note}>Runs sync from Strava on their own. Free for the whole family, no ads.</Text>
        </FadeInView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  content: { flex: 1, paddingHorizontal: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmark: { fontSize: 21, fontWeight: weights.bold, letterSpacing: -0.4, color: colors.ink },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    color: colors.ink,
  },
  headlineSoft: { fontFamily: fonts.serifItalic, color: colors.primary },
  lede: { fontSize: 16, lineHeight: 23, color: colors.inkSoft, marginTop: 14, maxWidth: 320 },
  card: {
    marginTop: 28,
    backgroundColor: colors.card,
    borderRadius: radii.cardLg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#B5652A',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: weights.semibold, color: colors.inkSoft },
  cardAside: { fontFamily: fonts.serifItalic, fontSize: 13.5, color: colors.muted },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dividerSoft,
  },
  footDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: memberColors.darcey.color },
  footText: { flex: 1, fontSize: 12.5, color: colors.muted },
  spacerTop: { flex: 0.8, minHeight: 28 },
  spacer: { flex: 1, minHeight: 24 },
  note: { textAlign: 'center', fontSize: 12.5, lineHeight: 18, color: colors.faint2, marginTop: 14, paddingHorizontal: 12 },
});
