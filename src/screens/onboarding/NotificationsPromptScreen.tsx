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
import { REMINDER_SLOTS } from '../../state/reminders';

/**
 * The last onboarding step: when you usually move (the reminder time, and the
 * "usually evenings" line your family sees), then the pre-prompt before iOS asks.
 * The ask covers cheers, nudges and joins; "No daily reminder" keeps those but
 * skips the reminder. One "Continue", as Apple asks for a screen before a system
 * prompt: it shows iOS's sheet, and either answer there finishes. A "Don't Allow"
 * still finishes, and Settings > Notifications shows it's off.
 *
 * `returning`: an existing account signing in on a phone that hasn't been asked
 * yet. No reminder choice or steps then; it goes straight to the family.
 */
export function NotificationsPromptScreen({ navigation, route }: RootStackScreenProps<'NotificationsPrompt'>) {
  const { draft, updateDraft, completeOnboarding, finishSignIn } = useApp();
  const returning = !!route.params?.returning;
  const [reminder, setReminder] = useState(true);
  const [busy, setBusy] = useState(false);

  // Joining happens here for an invitee, so a code can expire on the way.
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await requestNotificationPermission();
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

  if (returning) {
    return (
      <OnboardingFrame
        title="Hear from your family?"
        subtitle="Arro lets you know when someone cheers you on or joins, and at most once an evening who still has today."
        primaryLabel="Continue"
        primaryDisabled={busy}
        onPrimary={() => finish()}
      >
        <Card padding={20} style={styles.card}>
          <View style={styles.bell}>
            <BellIcon size={28} color={colors.inkSoft} />
          </View>
          <Text style={styles.body}>No red badges, no countdowns. You can turn them off any time in Settings.</Text>
        </Card>
        <Text style={styles.also}>Next, your iPhone asks to allow notifications.</Text>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      title="When do you usually move?"
      subtitle="Arro reminds you then, only if you haven’t moved yet. Your family sees “usually evenings”, never a countdown."
      step={stepOf(draft.role, 'NotificationsPrompt')}
      onBack={() => navigation.goBack()}
      primaryLabel="Continue"
      primaryDisabled={busy}
      onPrimary={() => finish()}
    >
      {REMINDER_SLOTS.map((s) => (
        <ChoiceRow
          key={s.slot}
          title={s.title}
          body={`Reminder at ${s.time}`}
          selected={reminder && draft.reminder === s.slot}
          onPress={() => {
            setReminder(true);
            updateDraft({ reminder: s.slot });
          }}
        />
      ))}
      <ChoiceRow title="No daily reminder" selected={!reminder} onPress={() => setReminder(false)} />
      <Text style={styles.also}>
        You’ll also hear when someone cheers you on or joins. Next, your iPhone asks to allow notifications.
      </Text>
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
  also: { ...type.meta, marginTop: 14 },
});
