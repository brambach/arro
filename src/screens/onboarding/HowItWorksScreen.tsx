import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { type } from '../../theme/typography';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { StreakRulesList } from '../../components/StreakRulesList';
import { useApp } from '../../state/AppState';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** The one place onboarding explains the streak and freeze days: the three that matter on day one. Settings > Streak rules has the rest. */
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
      <StreakRulesList brief />
      <Text style={styles.more}>The finer points are in Settings, under Streak rules.</Text>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  more: { ...type.meta, marginTop: 14, textAlign: 'center' },
});
