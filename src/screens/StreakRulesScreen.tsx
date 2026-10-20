import React from 'react';
import { StreakRulesList } from '../components/StreakRulesList';
import { SubScreen } from '../components/SubScreen';
import { RootStackScreenProps } from '../navigation/types';
import { useView } from '../state/AppState';

export const STREAK_RULES_COPY = {
  title: 'Streak rules',
  lead: 'How the family streak, freezes and breaks work. The same rules everyone saw when they joined.',
};

/** Settings > Streak rules: the rules list onboarding showed, in the family's own rhythm. */
export function StreakRulesScreen({ navigation }: RootStackScreenProps<'StreakRules'>) {
  const { rules } = useView();
  return (
    <SubScreen title={STREAK_RULES_COPY.title} lead={STREAK_RULES_COPY.lead} onBack={() => navigation.goBack()}>
      <StreakRulesList rhythm={{ goal: rules.goal, minMinutes: rules.minMinutes, weekStartsOn: rules.weekStartsOn }} />
    </SubScreen>
  );
}
