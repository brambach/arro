import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { type } from '../../theme/typography';
import { OnboardingFrame } from '../../components/OnboardingFrame';
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
export function SignInScreen({ navigation }: RootStackScreenProps<'SignIn'>) {
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
      if (result === 'continue' && draft.name.trim()) goNext();
      if (result === 'ask') navigation.navigate('NotificationsPrompt', { returning: true });
    } catch (e) {
      showError('Couldn’t sign in', e instanceof Error ? e.message : 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const needsApple = apple && !signedIn;

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
        placeholder="Bryce"
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

const styles = StyleSheet.create({
  apple: { height: 52, marginTop: 18 },
  busy: { opacity: 0.5 },
  note: { ...type.meta, marginTop: 14 },
});
