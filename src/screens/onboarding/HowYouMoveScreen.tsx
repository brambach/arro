import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { ChoiceRow } from '../../components/ChoiceRow';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { PulseIcon, TargetIcon } from '../../components/Icons';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

/** "I moved today" leads. Apple Health is the automatic option and arrives in phase 3. */
export function HowYouMoveScreen({ navigation }: RootStackScreenProps<'HowYouMove'>) {
  const { draft, updateDraft } = useApp();
  const next = nextAfter(draft.role, 'HowYouMove');

  return (
    <OnboardingFrame
      title="How do you move?"
      subtitle="Either way, any movement counts."
      step={stepOf(draft.role, 'HowYouMove')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      onPrimary={() => next && navigation.navigate(next as 'ReminderTime')}
    >
      <ChoiceRow
        title="I moved today"
        tag="Easiest"
        body="Tap once when you’ve moved. A walk, the gym, yoga, anything."
        icon={<TargetIcon />}
        selected={draft.moveMethod === 'manual'}
        onPress={() => updateDraft({ moveMethod: 'manual' })}
      />
      <ChoiceRow
        title="Apple Health"
        body="Counts your workouts for you, no tapping."
        icon={<PulseIcon />}
        selected={draft.moveMethod === 'health'}
        onPress={() => updateDraft({ moveMethod: 'health' })}
      />
      {draft.moveMethod === 'health' ? (
        <Text style={styles.note}>
          Apple Health connects in a later update. Until then, “I moved today” is always there too.
        </Text>
      ) : null}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 2 },
});
