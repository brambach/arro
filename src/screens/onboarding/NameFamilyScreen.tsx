import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { palette, space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Field } from '../../components/Field';
import { StepScreen } from '../../components/StepScreen';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { FAMILY_NAME_PLACEHOLDERS, nextAfter, stepOf } from './steps';

export const NAME_FAMILY_COPY = {
  title: 'Name your family',
  subtitle: 'Only the people you invite will see it. Your group chat’s name works fine.',
  label: 'Family name',
  hint: 'You can change it later in Settings.',
  continue: 'Continue',
  error: 'Couldn’t save the name. Check your connection and try again.',
};

/** How long each placeholder shows before the next. */
const PLACEHOLDER_MS = 2600;

/**
 * Name your family. The family itself is made one step later, at Your rhythm,
 * because its week start can't change once it exists. Coming back here after
 * that renames it.
 */
export function NameFamilyScreen({ navigation }: RootStackScreenProps<'NameFamily'>) {
  const { draft, updateDraft, saveFamilyName } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);

  // The placeholders take turns while the field is empty.
  const empty = !draft.familyName;
  useEffect(() => {
    if (!empty) return;
    const id = setInterval(() => setN((i) => (i + 1) % FAMILY_NAME_PLACEHOLDERS.length), PLACEHOLDER_MS);
    return () => clearInterval(id);
  }, [empty]);

  const onContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveFamilyName();
      const next = nextAfter('founder', 'NameFamily');
      if (next) navigation.navigate(next as 'Rhythm');
    } catch {
      setError(NAME_FAMILY_COPY.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepScreen
      title={NAME_FAMILY_COPY.title}
      subtitle={NAME_FAMILY_COPY.subtitle}
      step={stepOf('founder', 'NameFamily')}
      onBack={() => navigation.goBack()}
      primaryLabel={NAME_FAMILY_COPY.continue}
      primaryDisabled={!draft.familyName.trim() || saving}
      onPrimary={onContinue}
    >
      <Field
        label={NAME_FAMILY_COPY.label}
        value={draft.familyName}
        onChangeText={(familyName) => updateDraft({ familyName })}
        autoCapitalize="words"
        maxLength={32}
        placeholder={FAMILY_NAME_PLACEHOLDERS[n]}
        returnKeyType="done"
        onSubmitEditing={() => draft.familyName.trim() && onContinue()}
        hint={NAME_FAMILY_COPY.hint}
      />
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: palette.coal, marginTop: space.s16 },
});
