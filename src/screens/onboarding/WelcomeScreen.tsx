import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../../theme/tokens';
import { weights } from '../../theme/typography';
import { ArroMark } from '../../components/Icons';
import { FadeInView } from '../../components/FadeInView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';

export function WelcomeScreen({ navigation }: RootStackScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const { startFlow } = useApp();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <FadeInView style={styles.hero}>
        <ArroMark size={60} />
        <Text style={styles.wordmark}>Arro</Text>
        <Text style={styles.tagline}>Every day forward, together.</Text>
      </FadeInView>

      <View style={styles.spacer} />

      <FadeInView delay={120}>
        <Text style={styles.line}>
          One streak for the whole family. Move a little each day, any way you like, and see everyone’s day in one place.
        </Text>
        <PrimaryButton
          title="Start a family"
          onPress={() => {
            startFlow('founder');
            navigation.navigate('SignIn');
          }}
          style={styles.cta}
        />
        <Pressable
          onPress={() => {
            startFlow('invitee');
            navigation.navigate('JoinCode');
          }}
          accessibilityRole="button"
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>I have an invite</Text>
        </Pressable>
        <Text style={styles.note}>Free for your whole family · no ads</Text>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen, paddingHorizontal: 26 },
  hero: { alignItems: 'center', paddingTop: 72 },
  wordmark: { fontSize: 34, fontWeight: weights.bold, letterSpacing: -0.6, color: colors.ink, marginTop: 20 },
  tagline: { fontSize: 15, color: '#8A8177', marginTop: 8 },
  spacer: { flex: 1 },
  line: { fontSize: 17, lineHeight: 24, fontWeight: weights.medium, color: colors.ink, textAlign: 'center', paddingHorizontal: 6 },
  cta: { marginTop: 28 },
  secondary: {
    marginTop: 12,
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  note: { textAlign: 'center', fontSize: 12.5, color: '#A49B8F', marginTop: 16 },
});
