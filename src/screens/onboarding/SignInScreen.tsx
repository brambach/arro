import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TextField } from '../../components/TextField';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

/**
 * Stub sign-in. Phase 2 swaps the button for Sign in with Apple, which hands over the
 * name itself. Until then we ask for a first name so the family has something to call you.
 */
export function SignInScreen({ navigation }: RootStackScreenProps<'SignIn'>) {
  const { draft, updateDraft } = useApp();
  const next = nextAfter(draft.role, 'SignIn');

  return (
    <OnboardingFrame
      title="Sign in"
      subtitle="Your family will see this name."
      step={stepOf(draft.role, 'SignIn')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue with Apple"
      primaryDisabled={!draft.name.trim()}
      onPrimary={() => next && navigation.navigate(next as 'NameFamily')}
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
      <Text style={styles.note}>
        Preview sign-in: no account is created yet. Real Sign in with Apple comes in the next phase.
      </Text>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, lineHeight: 17, color: colors.faint, marginTop: 14 },
});
