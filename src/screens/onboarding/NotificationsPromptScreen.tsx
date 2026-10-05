import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Card } from '../../components/Card';
import { BellIcon } from '../../components/Icons';
import { OnboardingFrame } from '../../components/OnboardingFrame';
import { useApp } from '../../state/AppState';
import { InviteError } from '../../state/backend';
import { showError } from '../../state/confirm';
import { requestNotificationPermission } from '../../state/notifications';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';
import { REMINDER_SLOTS } from './ReminderTimeScreen';

/**
 * Pre-prompt: explains the reminder before iOS asks. "Turn on reminders" shows iOS's
 * sheet; either button finishes onboarding and opens Today. A "Don't Allow" there
 * still finishes, and Settings > Notifications explains how to turn it on later.
 */
export function NotificationsPromptScreen({ navigation }: RootStackScreenProps<'NotificationsPrompt'>) {
  const { draft, completeOnboarding } = useApp();
  const time = REMINDER_SLOTS.find((s) => s.slot === draft.reminder)?.time ?? '6:30 PM';
  const [busy, setBusy] = useState(false);

  // Joining happens here for an invitee, so a code can expire on the way.
  const finish = async (remindersWanted: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (remindersWanted) await requestNotificationPermission();
      await completeOnboarding(remindersWanted);
    } catch (e) {
      setBusy(false);
      showError(
        'Couldn’t join yet',
        e instanceof InviteError ? `${e.message} Ask your family for a new code.` : 'Check your connection and try again.',
      );
    }
  };

  return (
    <OnboardingFrame
      title="Want a reminder?"
      subtitle="One a day, only if you haven’t moved yet."
      step={stepOf(draft.role, 'NotificationsPrompt')}
      onBack={() => navigation.goBack()}
      primaryLabel="Turn on reminders"
      primaryDisabled={busy}
      onPrimary={() => finish(true)}
      secondaryLabel="Not now"
      onSecondary={() => finish(false)}
    >
      <Card padding={20} style={styles.card}>
        <View style={styles.bell}>
          <BellIcon size={28} color={colors.inkSoft} />
        </View>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.body}>
          Arro sends it once, at the time you picked. No red badges, no countdowns. You can change or turn it off any time in Settings.
        </Text>
      </Card>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  bell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.todayPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { ...type.bigNumber, fontSize: 28, lineHeight: 34, marginTop: 14 },
  body: { ...type.body, textAlign: 'center', marginTop: 8 },
});
