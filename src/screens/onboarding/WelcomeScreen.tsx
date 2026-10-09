import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows } from '../../theme/tokens';
import { motion } from '../../theme/motion';
import { type, weights } from '../../theme/typography';
import { ArroMark } from '../../components/Icons';
import { FadeInView } from '../../components/FadeInView';
import { Glass } from '../../components/Glass';
import { Landscape } from '../../components/Landscape';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';

export function WelcomeScreen({ navigation }: RootStackScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const short = useWindowDimensions().height < 740;
  const { startFlow } = useApp();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <FadeInView rise={14} {...motion.statement} style={styles.hero}>
        <ArroMark size={60} />
        <Text style={styles.wordmark}>Arro</Text>
        <Text style={styles.tagline}>Every day forward, together.</Text>
      </FadeInView>

      {/* The same dawn as arrofamily.com, so the app opens where the site left off. */}
      <View style={styles.scene}>
        <Landscape time="dawn" height={short ? 200 : 320} fadeBottom delay={150} style={styles.landscape} />
      </View>

      {/* The welcome sits on glass over the near hill, the way the day card sits over the hills on the site. */}
      <FadeInView delay={380} rise={10} {...motion.statement}>
        <Glass radius={24} padding={18} style={styles.panel}>
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
        </Glass>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen, paddingHorizontal: 26 },
  hero: { alignItems: 'center', paddingTop: 72 },
  wordmark: { ...type.display, fontSize: 40, lineHeight: 46, color: colors.ink, marginTop: 20 },
  tagline: { ...type.body, marginTop: 6 },
  scene: { flex: 1, justifyContent: 'flex-end', marginHorizontal: -26, marginBottom: -96 },
  panel: { marginHorizontal: -8, paddingTop: 22 },
  landscape: { width: '100%' },
  line: { fontSize: 17, lineHeight: 25, fontWeight: weights.regular, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: 6 },
  cta: { marginTop: 22 },
  secondary: {
    marginTop: 12,
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.card,
    ...shadows.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: weights.semibold, color: colors.ink },
  note: { ...type.meta, textAlign: 'center', marginTop: 16 },
});
