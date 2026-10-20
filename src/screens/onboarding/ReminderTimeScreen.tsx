import React from 'react';
import { ChoiceRow } from '../../components/ChoiceRow';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { useApp } from '../../state/AppState';
import { clockTimeLabel, reminderDaysLabel } from '../../state/reminders';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

/** Reminder times on offer until M10 rebuilds this step with days and a time picker. */
export const REMINDER_SLOTS: { time: string; title: string }[] = [
  { time: '08:00', title: 'Morning' },
  { time: '12:30', title: 'Lunchtime' },
  { time: '18:30', title: 'Evening' },
];

/** "Remind me if I'm behind": the time, on the default days (Thursday and Saturday). M10 adds the days. */
export function ReminderTimeScreen({ navigation }: RootStackScreenProps<'ReminderTime'>) {
  const { draft, updateDraft } = useApp();

  return (
    <OnboardingFrame
      title="Remind me if I’m behind"
      subtitle="Only on the days you pick, and only while your week isn’t kept."
      step={stepOf(draft.role, 'ReminderTime')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      onPrimary={() => navigation.navigate('NotificationsPrompt')}
    >
      {REMINDER_SLOTS.map((s) => (
        <ChoiceRow
          key={s.time}
          title={s.title}
          body={`${reminderDaysLabel(draft.reminderDays)} at ${clockTimeLabel(s.time)}, if you’re behind`}
          selected={draft.reminderTime === s.time}
          onPress={() => updateDraft({ reminderTime: s.time })}
        />
      ))}
    </OnboardingFrame>
  );
}
