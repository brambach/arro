import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { palette, space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Field } from '../../components/Field';
import { StepScreen } from '../../components/StepScreen';
import { useApp } from '../../state/AppState';
import { InviteError } from '../../state/backend';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const JOIN_CODE_COPY = {
  title: 'Enter your code',
  subtitle: 'It’s in the message from whoever invited you.',
  label: 'Join code',
  hint: 'Eight letters and numbers. Codes last 14 days.',
  previewHint: 'In this preview, any code opens Sunday sauna.',
  find: 'Find my family',
  offline: 'Couldn’t check the code. Check your connection and try again.',
};

/** Invitee, step 1: the join code. Before sign-in the server only says the family's name and size. */
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
      const next = nextAfter('invitee', 'JoinCode');
      if (next) navigation.navigate(next as 'InvitePreview');
    } catch (e) {
      setError(e instanceof InviteError ? e.message : JOIN_CODE_COPY.offline);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepScreen
      title={JOIN_CODE_COPY.title}
      subtitle={JOIN_CODE_COPY.subtitle}
      step={stepOf('invitee', 'JoinCode')}
      onBack={() => navigation.goBack()}
      primaryLabel={JOIN_CODE_COPY.find}
      primaryDisabled={!ready}
      onPrimary={find}
    >
      <Field
        label={JOIN_CODE_COPY.label}
        value={code}
        onChangeText={(t) => {
          setError(null);
          updateDraft({ joinCode: t.toUpperCase().replace(/[^A-Z0-9]/g, '') });
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        // Eight characters (six before October 2026), with room for a pasted space.
        maxLength={12}
        placeholder="K7P4QX9M"
        returnKeyType="go"
        onSubmitEditing={find}
        style={styles.code}
        hint={error ? undefined : online ? JOIN_CODE_COPY.hint : JOIN_CODE_COPY.previewHint}
        error={error ?? undefined}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  code: { ...type.headingStrong, letterSpacing: 4, textAlign: 'center', paddingVertical: space.s16, color: palette.char },
});
