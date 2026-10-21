import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Card } from '../../components/Card';
import { DayPicker } from '../../components/DayPicker';
import { StepScreen } from '../../components/StepScreen';
import { TimeStepper } from '../../components/TimeStepper';
import { useApp } from '../../state/AppState';
import { reminderSentence } from '../../state/settingsCopy';
import { RootStackScreenProps } from '../../navigation/types';
import { nextAfter, stepOf } from './steps';

export const REMINDERS_COPY = {
  title: 'Remind me if I’m behind.',
  subtitle: 'Only on the days you pick, and only while your week isn’t kept.',
  days: 'Days',
  time: 'Time',
  continue: 'Continue',
  none: 'No reminders',
};

/**
 * Reminders: days (Thursday and Saturday to start) and a time (6:30 PM), or
 * "No reminders". The notifications ask comes next, since reminders need it.
 */
export function ReminderTimeScreen({ navigation }: RootStackScreenProps<'ReminderTime'>) {
  const { draft, updateDraft } = useApp();
  const goNext = () => {
    const next = nextAfter(draft.role, 'ReminderTime');
    if (next) navigation.navigate(next as 'NotificationsPrompt');
  };
  const weekStartsOn = draft.role === 'founder' ? draft.weekStartsOn : 1;

  return (
    <StepScreen
      title={REMINDERS_COPY.title}
      subtitle={REMINDERS_COPY.subtitle}
      step={stepOf(draft.role, 'ReminderTime')}
      onBack={() => navigation.goBack()}
      primaryLabel={REMINDERS_COPY.continue}
      primaryDisabled={draft.reminderDays.length === 0}
      onPrimary={() => {
        updateDraft({ remindersWanted: true });
        goNext();
      }}
      secondaryLabel={REMINDERS_COPY.none}
      onSecondary={() => {
        updateDraft({ remindersWanted: false });
        goNext();
      }}
    >
      <Card padding={20}>
        <Text style={[type.caption, styles.label]}>{REMINDERS_COPY.days}</Text>
        <DayPicker days={draft.reminderDays} onChange={(reminderDays) => updateDraft({ reminderDays })} weekStartsOn={weekStartsOn} />
        <Text style={[type.caption, styles.label, styles.second]}>{REMINDERS_COPY.time}</Text>
        <TimeStepper time={draft.reminderTime} onChange={(reminderTime) => updateDraft({ reminderTime })} />
      </Card>
      <Text style={[type.label, styles.sentence]}>{reminderSentence(draft.reminderDays, draft.reminderTime)}</Text>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space.s12 },
  second: { marginTop: space.s24 },
  sentence: { marginTop: space.s12, marginHorizontal: space.s8 },
});
