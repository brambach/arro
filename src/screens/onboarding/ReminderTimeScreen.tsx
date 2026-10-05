import React from 'react';
import { ChoiceRow } from '../../components/ChoiceRow';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { useApp } from '../../state/AppState';
import { ReminderSlot } from '../../data/types';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

export const REMINDER_SLOTS: { slot: ReminderSlot; title: string; time: string }[] = [
  { slot: 'morning', title: 'Morning', time: '8:00 AM' },
  { slot: 'lunch', title: 'Lunchtime', time: '12:30 PM' },
  { slot: 'evening', title: 'Evening', time: '6:30 PM' },
];

/** Sets the reminder time and the "usually evenings" line the family sees on Today. */
export function ReminderTimeScreen({ navigation }: RootStackScreenProps<'ReminderTime'>) {
  const { draft, updateDraft } = useApp();

  return (
    <OnboardingFrame
      title="When do you usually move?"
      subtitle="We’ll remind you once, at this time. Your family sees “usually evenings” on your row, never a countdown."
      step={stepOf(draft.role, 'ReminderTime')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      onPrimary={() => navigation.navigate('NotificationsPrompt')}
    >
      {REMINDER_SLOTS.map((s) => (
        <ChoiceRow
          key={s.slot}
          title={s.title}
          body={`Reminder at ${s.time}`}
          selected={draft.reminder === s.slot}
          onPress={() => updateDraft({ reminder: s.slot })}
        />
      ))}
    </OnboardingFrame>
  );
}
