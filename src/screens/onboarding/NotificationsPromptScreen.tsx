import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Card } from '../../components/Card';
import { ChoiceRow } from '../../components/ChoiceRow';
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
 * Pre-prompt: explains what the family's notifications are before iOS asks. The ask
 * is for cheers, nudges and joins; the daily reminder is a separate choice on the
 * screen. "Turn on notifications" shows iOS's sheet; either button finishes. A
 * "Don't Allow" there still finishes, and Settings > Notifications shows it's off.
 *
 * `returning`: an existing account signing in on a phone that hasn't been asked
 * yet. No reminder choice or steps then; it goes straight to the family.
 */
export function NotificationsPromptScreen({ navigation, route }: RootStackScreenProps<'NotificationsPrompt'>) {
  const { draft, completeOnboarding, finishSignIn } = useApp();
  const returning = !!route.params?.returning;
  const time = REMINDER_SLOTS.find((s) => s.slot === draft.reminder)?.time ?? '6:30 PM';
  const [reminder, setReminder] = useState(true);
  const [busy, setBusy] = useState(false);

  // Joining happens here for an invitee, so a code can expire on the way.
  const finish = async (allow: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = allow ? await requestNotificationPermission() : null;
      // A reminder that can't arrive isn't kept. The web preview has no notifications, so it keeps the choice.
      const canNotify = permission === 'granted' || permission === 'unavailable';
      if (returning) await finishSignIn();
      else await completeOnboarding(canNotify && reminder);
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
      title="Hear from your family?"
      subtitle="Arro lets you know when someone cheers you on or joins, and at most once an evening who still has today."
      step={returning ? undefined : stepOf(draft.role, 'NotificationsPrompt')}
      onBack={returning ? undefined : () => navigation.goBack()}
      primaryLabel="Turn on notifications"
      primaryDisabled={busy}
      onPrimary={() => finish(true)}
      secondaryLabel="Not now"
      onSecondary={() => finish(false)}
    >
      <Card padding={20} style={styles.card}>
        <View style={styles.bell}>
          <BellIcon size={28} color={colors.inkSoft} />
        </View>
        <Text style={styles.body}>
          No red badges, no countdowns. You can turn them off any time in Settings.
        </Text>
      </Card>
      {returning ? null : (
        <View style={styles.choices}>
          <ChoiceRow
            title="Daily reminder too"
            body={`At ${time}, only if you haven’t moved yet`}
            selected={reminder}
            onPress={() => setReminder(true)}
          />
          <ChoiceRow title="No daily reminder" selected={!reminder} onPress={() => setReminder(false)} />
        </View>
      )}
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
  body: { ...type.body, textAlign: 'center', marginTop: 12 },
  choices: { marginTop: 18 },
});
