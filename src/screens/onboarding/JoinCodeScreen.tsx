import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TextField } from '../../components/TextField';
import { useApp } from '../../state/AppState';
import { InviteError } from '../../state/backend';
import { showError } from '../../state/confirm';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

export function JoinCodeScreen({ navigation }: RootStackScreenProps<'JoinCode'>) {
  const { draft, updateDraft, lookUpInvite, online } = useApp();
  const code = draft.joinCode;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = code.trim().length >= 4 && !busy;

  const find = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await lookUpInvite();
      navigation.navigate('InvitePreview');
    } catch (e) {
      if (e instanceof InviteError) setError(e.message);
      else showError('Couldn’t check the code', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingFrame
      title="Enter your code"
      subtitle="It’s in the message your family member sent. If you opened a link, it’s the last part."
      step={stepOf('invitee', 'JoinCode')}
      onBack={() => navigation.goBack()}
      primaryLabel="Find my family"
      primaryDisabled={!ready}
      onPrimary={find}
    >
      <TextField
        label="Join code"
        value={code}
        onChangeText={(t) => {
          setError(null);
          updateDraft({ joinCode: t.toUpperCase().replace(/[^A-Z0-9]/g, '') });
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="K7P4QX"
        returnKeyType="go"
        onSubmitEditing={find}
        style={styles.code}
      />
      {error ? (
        <Text style={[styles.hint, styles.error]}>{error}</Text>
      ) : (
        <Text style={styles.hint}>{online ? 'Codes last 14 days.' : 'In this preview, any code opens the Home crew.'}</Text>
      )}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 22, letterSpacing: 4, fontWeight: '600', textAlign: 'center', height: 60 },
  hint: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 12, textAlign: 'center' },
  error: { color: colors.ink },
});
