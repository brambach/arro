import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/tokens';
import { ChoiceRow } from '../../components/ChoiceRow';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { PulseIcon, TargetIcon } from '../../components/Icons';
import { useApp } from '../../state/AppState';
import { connectHealth, healthAvailable } from '../../state/health';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

/** "I moved today" leads. Apple Health asks for read access to workouts when they continue with it. */
export function HowYouMoveScreen({ navigation }: RootStackScreenProps<'HowYouMove'>) {
  const { draft, updateDraft } = useApp();
  const next = nextAfter(draft.role, 'HowYouMove');
  const [asking, setAsking] = useState(false);
  const canUseHealth = healthAvailable();

  const onContinue = async () => {
    if (draft.moveMethod === 'health' && canUseHealth) {
      setAsking(true);
      try {
        await connectHealth();
      } catch {
        // Onboarding goes on either way; "I moved today" still works.
      } finally {
        setAsking(false);
      }
    }
    if (next) navigation.navigate(next as 'ReminderTime');
  };

  return (
    <OnboardingFrame
      title="How do you move?"
      subtitle="Either way, any movement counts."
      step={stepOf(draft.role, 'HowYouMove')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      primaryDisabled={asking}
      onPrimary={onContinue}
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
          {canUseHealth
            ? 'Arro only reads your workouts, never anything else. “I moved today” is always there too.'
            : 'Apple Health isn’t available here. “I moved today” is always there instead.'}
        </Text>
      ) : null}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 18, color: colors.faint, marginTop: 2 },
});
