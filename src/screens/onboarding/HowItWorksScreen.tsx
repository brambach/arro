import React from 'react';
import { StepScreen } from '../../components/StepScreen';
import { StreakRulesList } from '../../components/StreakRulesList';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const HOW_IT_WORKS_COPY = {
  title: 'How the streak works',
  subtitle: 'Seven rules, all short. Settings keeps them if you want to read them again.',
  done: 'Got it',
};

/** The rules list, once, in the family's own rhythm. Settings > Streak rules shows it again. */
export function HowItWorksScreen({ navigation }: RootStackScreenProps<'HowItWorks'>) {
  const { draft } = useApp();
  const invite = draft.role === 'invitee' ? draft.invite : null;
  const rhythm =
    draft.role === 'founder'
      ? { goal: draft.goal, minMinutes: draft.minMinutes, weekStartsOn: draft.weekStartsOn }
      : // The invite says the goal and minimum; the week start isn't in it, so it reads Monday.
        { goal: invite?.goalPerWeek ?? 3, minMinutes: invite?.minMinutes ?? 10, weekStartsOn: 1 as const };

  return (
    <StepScreen
      title={HOW_IT_WORKS_COPY.title}
      subtitle={HOW_IT_WORKS_COPY.subtitle}
      step={stepOf(draft.role, 'HowItWorks')}
      onBack={() => navigation.goBack()}
      primaryLabel={HOW_IT_WORKS_COPY.done}
      onPrimary={() => {
        const next = nextAfter(draft.role, 'HowItWorks');
        if (next) navigation.navigate(next as 'OnboardingInvite');
      }}
    >
      <StreakRulesList rhythm={rhythm} />
    </StepScreen>
  );
}
