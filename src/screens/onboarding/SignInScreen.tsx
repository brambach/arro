import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors } from '../../theme/tokens';
import { motion } from '../../theme/motion';
import { type, weights } from '../../theme/typography';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { ArroMark, ChevronLeft } from '../../components/Icons';
import { FadeInView } from '../../components/FadeInView';
import { Card } from '../../components/Card';
import { Backdrop } from '../../components/Backdrop';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useApp } from '../../state/AppState';
import { appleSignInAvailable } from '../../state/backend';
import { showError } from '../../state/confirm';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

/**
 * Sign in with Apple. Apple only shares the name the first time, and people can
 * hide it, so the first-name field stays: it's what the family sees.
 * Where Apple sign-in isn't available (web preview, no Supabase config) it's the
 * phase 1 preview sign-in and nothing is created on a server.
 */
export function SignInScreen({ navigation, route }: RootStackScreenProps<'SignIn'>) {
  const returning = !!route.params?.returning;
  const { draft, updateDraft, signIn } = useApp();
  const next = nextAfter(draft.role, 'SignIn');
  const [apple, setApple] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const signedIn = !!draft.userId;

  useEffect(() => {
    appleSignInAvailable().then(setApple);
  }, []);

  const goNext = () => next && navigation.navigate(next as 'NameFamily');

  const onApple = async () => {
    setBusy(true);
    try {
      const result = await signIn();
      // 'done': an existing account went straight to its family and the stack changes by itself.
      if (result === 'continue' && returning) {
        // Signed in with Apple, but this Apple ID isn't in a family yet.
        showError('No Arro account yet', 'This Apple ID isn’t in a family. Go back to start a family or use an invite.');
      } else if (result === 'continue' && draft.name.trim()) goNext();
      if (result === 'ask') navigation.navigate('NotificationsPrompt', { returning: true });
    } catch (e) {
      // Raw fetch errors read like a crash; anything network-shaped gets a plain sentence.
      const message = e instanceof Error ? e.message : '';
      showError(
        'Couldn’t sign in',
        !message || /fetch failed|network/i.test(message)
          ? 'Arro couldn’t reach the server. Check your connection and try again.'
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const needsApple = apple && !signedIn;

  if (returning) {
    return (
      <WelcomeBack
        apple={apple}
        busy={busy}
        onApple={onApple}
        onBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <OnboardingFrame
      title="Sign in"
      subtitle="Your family will see this name."
      step={stepOf(draft.role, 'SignIn')}
      onBack={() => navigation.goBack()}
      primaryLabel={apple ? 'Continue' : 'Continue with Apple'}
      primaryDisabled={!draft.name.trim() || !!needsApple || apple === null}
      onPrimary={goNext}
    >
      <TextField
        label="Your first name"
        value={draft.name}
        onChangeText={(name) => updateDraft({ name })}
        autoCapitalize="words"
        autoComplete="given-name"
        maxLength={24}
        placeholder="First name"
        returnKeyType="done"
      />
      {needsApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={14}
          style={[styles.apple, busy && styles.busy]}
          onPress={busy ? () => undefined : onApple}
        />
      ) : null}
      <Text style={styles.note}>
        {apple
          ? signedIn
            ? 'Signed in with Apple.'
            : 'Arro only uses your Apple ID to sign you in. Your email isn’t shared with your family.'
          : 'Preview sign-in: no account is created. Sign in with Apple needs the iPhone app.'}
      </Text>
    </OnboardingFrame>
  );
}

/**
 * From Welcome's "Sign in": the same map and glass panel as Welcome, so coming
 * back feels like the front door rather than a step in setting up.
 */
function WelcomeBack({
  apple,
  busy,
  onApple,
  onBack,
}: {
  apple: boolean | null;
  busy: boolean;
  onApple: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.back, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <Backdrop />
      <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Back" style={styles.backButton}>
        <ChevronLeft />
      </Pressable>
      <FadeInView rise={14} {...motion.statement} style={styles.hero}>
        <ArroMark size={60} />
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.tagline}>Your family’s been moving.</Text>
      </FadeInView>

      <View style={styles.space} />

      <FadeInView delay={380} rise={10} {...motion.statement}>
        <Card padding={20} style={styles.panel}>
          <Text style={styles.line}>Sign in with the Apple ID you use for Arro and you’ll go straight to your family.</Text>
          {apple ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={[styles.appleBig, busy && styles.busy]}
              onPress={busy ? () => undefined : onApple}
            />
          ) : (
            <PrimaryButton title="Sign in with Apple" onPress={onApple} disabled style={styles.cta} />
          )}
          <Text style={styles.panelNote}>
            {apple === false ? 'Sign in with Apple needs the iPhone app.' : 'Your email isn’t shared with your family.'}
          </Text>
        </Card>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  apple: { height: 52, marginTop: 18 },
  busy: { opacity: 0.5 },
  note: { ...type.meta, marginTop: 14 },
  // Welcome back, laid out like Welcome.
  back: { flex: 1, backgroundColor: colors.screen, paddingHorizontal: 26 },
  backButton: { width: 28, height: 40, justifyContent: 'center', marginLeft: -10 },
  hero: { alignItems: 'center', paddingTop: 32 },
  heading: { ...type.display, fontSize: 46, lineHeight: 50, color: colors.ink, marginTop: 18 },
  tagline: { ...type.body, marginTop: 6 },
  space: { flex: 1 },
  panel: { marginHorizontal: -8, paddingTop: 22 },
  line: { fontSize: 17, lineHeight: 25, fontWeight: weights.regular, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: 6 },
  appleBig: { height: 52, marginTop: 22 },
  cta: { marginTop: 22 },
  panelNote: { ...type.meta, textAlign: 'center', marginTop: 16 },
});
