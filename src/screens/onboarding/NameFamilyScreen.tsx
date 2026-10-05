import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { TextField } from '../../components/TextField';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

export function NameFamilyScreen({ navigation }: RootStackScreenProps<'NameFamily'>) {
  const { draft, updateDraft } = useApp();

  return (
    <OnboardingFrame
      title="Name your family"
      subtitle="Only the people you invite will ever see it."
      step={stepOf('founder', 'NameFamily')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      primaryDisabled={!draft.familyName.trim()}
      onPrimary={() => navigation.navigate('HowItWorks')}
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
  note: { fontSize: 12.5, color: colors.faint, marginTop: 12 },
});
