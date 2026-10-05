import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TextField } from '../../components/TextField';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

export function JoinCodeScreen({ navigation }: RootStackScreenProps<'JoinCode'>) {
  const { draft, updateDraft } = useApp();
  const code = draft.joinCode;

  return (
    <OnboardingFrame
      title="Enter your code"
      subtitle="It’s in the message your family member sent. If you opened a link, it’s the last part."
      step={stepOf('invitee', 'JoinCode')}
      onBack={() => navigation.goBack()}
      primaryLabel="Find my family"
      primaryDisabled={code.trim().length < 4}
      onPrimary={() => navigation.navigate('InvitePreview')}
    >
      <TextField
        label="Join code"
        value={code}
        onChangeText={(t) => updateDraft({ joinCode: t.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="K7P4QX"
        returnKeyType="go"
        onSubmitEditing={() => code.trim().length >= 4 && navigation.navigate('InvitePreview')}
        style={styles.code}
      />
      <Text style={styles.hint}>In this preview, any code opens the Home crew.</Text>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 22, letterSpacing: 4, fontWeight: '600', textAlign: 'center', height: 60 },
  hint: { fontSize: 12.5, color: colors.faint, marginTop: 12, textAlign: 'center' },
});
