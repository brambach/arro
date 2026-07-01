import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radii, shadows } from '../theme/tokens';
import { fonts } from '../theme/typography';
import { ArroMark, StarIcon, StravaWave, UsersIcon } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackScreenProps } from '../navigation/types';

const FEATURES = [
  {
    title: 'Connect Strava',
    body: 'Your daily runs sync automatically.',
    tint: ['#FF9A52', '#F0803C'] as const,
    icon: <StravaWave size={22} />,
  },
  {
    title: 'Join your family',
    body: "See everyone's streak in one place.",
    tint: ['#84C79A', '#6FB98A'] as const,
    icon: <UsersIcon size={24} />,
  },
  {
    title: 'Keep your daily streak',
    body: 'One run a day keeps the chain alive.',
    tint: ['#7FB4DA', '#6FA6CE'] as const,
    icon: <StarIcon size={22} />,
  },
];

export function OnboardingScreen({ navigation }: RootStackScreenProps<'Onboarding'>) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={gradients.onboarding} style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <FadeInView style={styles.iconWrap}>
          <LinearGradient colors={gradients.appIcon} style={styles.appIcon}>
            <ArroMark size={90} color="#fff" />
          </LinearGradient>
        </FadeInView>

        <FadeInView delay={120} style={styles.titleWrap}>
          <Text style={styles.wordmark}>Arro</Text>
          <Text style={styles.tagline}>Every day forward, together.</Text>
        </FadeInView>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <FadeInView key={f.title} delay={220 + i * 100}>
              <View style={styles.featureCard}>
                <LinearGradient colors={f.tint} style={styles.featureIcon}>
                  {f.icon}
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureBody}>{f.body}</Text>
                </View>
              </View>
            </FadeInView>
          ))}
        </View>

        <FadeInView delay={560} style={styles.ctaWrap}>
          <PrimaryButton title="Connect Strava" onPress={() => navigation.replace('Main')} />
          <Text style={styles.ctaNote}>Free for your whole family · no ads</Text>
        </FadeInView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 26, alignItems: 'center' },
  iconWrap: { marginBottom: 24 },
  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  titleWrap: { alignItems: 'center', gap: 12, marginBottom: 30 },
  wordmark: { fontFamily: fonts.serif, fontSize: 42, color: '#3A2B22', letterSpacing: -0.6 },
  tagline: { fontFamily: fonts.serifItalic, fontSize: 19, color: '#B06A34', textAlign: 'center' },
  features: { alignSelf: 'stretch', gap: 12 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    ...shadows.card,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontFamily: fonts.sansHeavy, fontSize: 16, color: colors.ink },
  featureBody: { fontFamily: fonts.sansBody, fontSize: 13.5, color: colors.muted, marginTop: 2 },
  ctaWrap: { alignSelf: 'stretch', alignItems: 'center', gap: 14, marginTop: 32 },
  ctaNote: { fontFamily: fonts.sansBody, fontSize: 13, color: '#A9977F' },
});
