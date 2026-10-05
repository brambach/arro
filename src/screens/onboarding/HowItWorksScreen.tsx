import React from 'react';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { StreakRulesList } from '../../components/StreakRulesList';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** The one place onboarding explains the streak and freeze days. Settings > Streak rules repeats it. */
export function HowItWorksScreen({ navigation }: RootStackScreenProps<'HowItWorks'>) {
  const { draft } = useApp();

  return (
    <OnboardingFrame
      title="How the streak works"
      subtitle="Short version: show up a little, together."
      step={stepOf(draft.role, 'HowItWorks')}
      onBack={() => navigation.goBack()}
      primaryLabel="Got it"
      onPrimary={() => navigation.navigate('HowYouMove')}
    >
      <StreakRulesList />
    </OnboardingFrame>
  );
}
