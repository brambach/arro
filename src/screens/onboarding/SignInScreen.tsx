import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { layout, palette, radii, space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Field } from '../../components/Field';
import { SolidButton } from '../../components/SolidButton';
import { StepScreen } from '../../components/StepScreen';
import { useApp } from '../../state/AppState';
import { appleSignInAvailable } from '../../state/backend';
import { useDevOverrides } from '../../state/devTools';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const SIGN_IN_COPY = {
  title: 'Sign in',
  subtitle: 'Your family sees your first name, nothing else.',
  nameLabel: 'Your first name',
  namePlaceholder: 'First name',
  continue: 'Continue',
  appleNote: 'Saunafam only uses your Apple ID to sign you in. Your email isn’t shared with your family.',
  signedIn: 'Signed in with Apple.',
  previewNote: 'Preview sign-in. Nothing is made on a server, and Sign in with Apple needs the iPhone app.',
  backTitle: 'Welcome back',
  backSubtitle: 'Sign in with the Apple ID you use for Saunafam and you’ll go straight to your family.',
  backPreview: 'Sign in with Apple needs the iPhone app.',
  noAccountTitle: 'No Saunafam account yet',
  noAccount: 'This Apple ID isn’t in a family. Go back to start one, or use an invite.',
  offline: 'Saunafam couldn’t reach the server. Check your connection and try again.',
};

/**
 * Sign in with Apple. Apple shares a name only the first time, and people can
 * hide it, so the first-name field stays: it's what the family sees. Without a
 * server (the preview, the web build) it's a preview sign-in and nothing is
 * made.
 *
 * `returning` (Welcome's "Sign in"): someone with an account. No name, no
 * steps; it goes straight to the family.
 */
export function SignInScreen({ navigation, route }: RootStackScreenProps<'SignIn'>) {
  const returning = !!route.params?.returning;
  const { draft, updateDraft, signIn } = useApp();
  const dev = useDevOverrides();
  const next = nextAfter(draft.role, 'SignIn');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = !!draft.userId;
  const apple = available || dev.appleButton;

  useEffect(() => {
    appleSignInAvailable().then(setAvailable);
  }, []);

  const goNext = () => {
    if (next) navigation.navigate(next as 'NameFamily');
  };

  const onApple = async () => {
    if (busy || !available) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn();
      // 'done': an existing account went straight to its family and the stack changes by itself.
      if (result === 'continue' && returning) setError(`${SIGN_IN_COPY.noAccountTitle}. ${SIGN_IN_COPY.noAccount}`);
      else if (result === 'continue' && (draft.name.trim() || returning)) goNext();
      if (result === 'ask') navigation.navigate('NotificationsPrompt', { returning: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setError(!message || /fetch failed|network/i.test(message) ? SIGN_IN_COPY.offline : message);
    } finally {
      setBusy(false);
    }
  };

  const appleButton = (
    <View style={busy && styles.busy} pointerEvents={busy ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radii.button}
        style={styles.apple}
        onPress={onApple}
      />
    </View>
  );

  if (returning) {
    return (
      <StepScreen
        title={SIGN_IN_COPY.backTitle}
        subtitle={SIGN_IN_COPY.backSubtitle}
        onBack={() => navigation.goBack()}
        primaryLabel=""
        onPrimary={onApple}
        footer={apple ? appleButton : <SolidButton title="Sign in with Apple" disabled />}
      >
        <Text style={type.label}>{apple ? 'Your email isn’t shared with your family.' : SIGN_IN_COPY.backPreview}</Text>
        {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
      </StepScreen>
    );
  }

  const needsApple = apple && !signedIn;
  return (
    <StepScreen
      title={SIGN_IN_COPY.title}
      subtitle={SIGN_IN_COPY.subtitle}
      step={stepOf(draft.role, 'SignIn')}
      onBack={() => navigation.goBack()}
      primaryLabel={SIGN_IN_COPY.continue}
      primaryDisabled={!draft.name.trim() || available === null}
      onPrimary={goNext}
      footer={needsApple ? appleButton : undefined}
    >
      <Field
        label={SIGN_IN_COPY.nameLabel}
        value={draft.name}
        onChangeText={(name) => updateDraft({ name })}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={24}
        placeholder={SIGN_IN_COPY.namePlaceholder}
        returnKeyType="done"
      />
      <Text style={[type.label, styles.note]}>
        {apple ? (signedIn ? SIGN_IN_COPY.signedIn : SIGN_IN_COPY.appleNote) : SIGN_IN_COPY.previewNote}
      </Text>
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  apple: { height: layout.button, width: '100%' },
  busy: { opacity: 0.5 },
  note: { marginTop: space.s16 },
  error: { color: palette.coal, marginTop: space.s16 },
});
