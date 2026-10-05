import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TextField } from '../../components/TextField';
import { useApp } from '../../state/AppState';
import { showError } from '../../state/confirm';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

export function NameFamilyScreen({ navigation }: RootStackScreenProps<'NameFamily'>) {
  const { draft, updateDraft, saveFamilyName } = useApp();
  const [saving, setSaving] = useState(false);

  // Signed in, the family is made on the server here, so the invite step has a real code.
  const onContinue = async () => {
    setSaving(true);
    try {
      await saveFamilyName();
      navigation.navigate('HowItWorks');
    } catch {
      showError('Couldn’t save your family', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingFrame
      title="Name your family"
      subtitle="Only the people you invite will ever see it."
      step={stepOf('founder', 'NameFamily')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      primaryDisabled={!draft.familyName.trim() || saving}
      onPrimary={onContinue}
    >
      <TextField
        label="Family name"
        value={draft.familyName}
        onChangeText={(familyName) => updateDraft({ familyName })}
        autoCapitalize="words"
        maxLength={32}
        placeholder="The Rambachs"
        returnKeyType="done"
      />
      <Text style={styles.note}>A group chat name works. You can change it later.</Text>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 12 },
});
