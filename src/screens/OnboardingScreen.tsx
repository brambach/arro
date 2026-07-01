import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/tokens';
import { weights } from '../theme/typography';
import { ArroMark, FlameIcon, SyncIcon, UsersIcon } from '../components/Icons';
import { FadeInView } from '../components/FadeInView';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackScreenProps } from '../navigation/types';

const FEATURES = [
  { title: 'Connect Strava', body: 'Your daily runs sync automatically.', icon: <SyncIcon /> },
  { title: 'Join your family', body: "See everyone's streak in one place.", icon: <UsersIcon /> },
  { title: 'Keep your daily streak', body: 'One run a day keeps the chain alive.', icon: <FlameIcon /> },
];

export function OnboardingScreen({ navigation }: RootStackScreenProps<'Onboarding'>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <FadeInView style={styles.hero}>
        <ArroMark size={60} />
        <Text style={styles.wordmark}>Arro</Text>
        <Text style={styles.tagline}>Every day forward, together.</Text>
      </FadeInView>

      <View style={styles.spacer} />

      <FadeInView delay={120} style={styles.bottom}>
        <View style={styles.card}>
          {FEATURES.map((f, i) => (
            <View key={f.title} style={[styles.row, i < FEATURES.length - 1 && styles.rowBorder]}>
              <View style={styles.icon}>{f.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <PrimaryButton title="Connect Strava" onPress={() => navigation.replace('Main')} style={styles.cta} />
        <Text style={styles.note}>Free for your whole family · no ads</Text>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen, paddingHorizontal: 26 },
  hero: { alignItems: 'center', paddingTop: 48 },
  wordmark: { fontSize: 34, fontWeight: weights.bold, letterSpacing: -0.6, color: colors.ink, marginTop: 20 },
  tagline: { fontSize: 15, color: '#8A8177', marginTop: 8 },
  spacer: { flex: 1 },
  bottom: {},
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.cardLg,
    paddingHorizontal: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.dividerSoft },
  icon: { width: 26, alignItems: 'center' },
  featureTitle: { fontSize: 15, fontWeight: weights.semibold, color: colors.ink },
  featureBody: { fontSize: 13, color: colors.faint, marginTop: 2 },
  cta: { marginTop: 22 },
  note: { textAlign: 'center', fontSize: 12.5, color: '#A49B8F', marginTop: 15 },
});
