import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { depth, palette, radii, space } from '../../theme/tokens';
import { type } from '../../theme/typography';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { StepScreen } from '../../components/StepScreen';
import { useApp } from '../../state/AppState';
import { InviteError } from '../../state/backend';
import { requestNotificationPermission } from '../../state/notifications';
import { RootStackScreenProps } from '../../navigation/types';
import { stepOf } from './steps';

export const NOTIFICATIONS_PROMPT_COPY = {
  title: 'Hear from your family?',
  subtitle: 'Saunafam tells you when someone has a sauna, cheers you on or joins, and on Saturday who could use a cheer.',
  calm: 'No red badges and no countdowns. Turn any of it off in Settings.',
  reminders: 'Your reminders need this too.',
  allow: 'Turn on notifications',
  notNow: 'Not now',
  errorTitle: 'Couldn’t join yet.',
  offline: 'Check your connection and try again.',
  newCode: 'Ask your family for a new code.',
};

/**
 * The notifications ask: what Saunafam sends, then iOS's own sheet. Either
 * answer finishes onboarding. A "Don't Allow" still finishes, and reminders
 * that can't arrive aren't kept.
 *
 * `returning`: an existing account signing in on a phone that hasn't been
 * asked yet. No steps; it goes straight to the family.
 */
export function NotificationsPromptScreen({ navigation, route }: RootStackScreenProps<'NotificationsPrompt'>) {
  const { draft, completeOnboarding, finishSignIn } = useApp();
  const returning = !!route.params?.returning;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (allow: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const permission = allow ? await requestNotificationPermission() : null;
      // The web preview has no notifications, so it keeps the reminder choice.
      const canNotify = permission === 'granted' || permission === 'unavailable';
      if (returning) await finishSignIn();
      else await completeOnboarding(canNotify && draft.remindersWanted);
    } catch (e) {
      setBusy(false);
      const why =
        e instanceof InviteError
          ? e.kind === 'notFound'
            ? `${e.message} ${NOTIFICATIONS_PROMPT_COPY.newCode}`
            : e.message
          : NOTIFICATIONS_PROMPT_COPY.offline;
      setError(`${NOTIFICATIONS_PROMPT_COPY.errorTitle} ${why}`);
    }
  };

  return (
    <StepScreen
      title={NOTIFICATIONS_PROMPT_COPY.title}
      subtitle={NOTIFICATIONS_PROMPT_COPY.subtitle}
      step={returning ? undefined : stepOf(draft.role, 'NotificationsPrompt')}
      onBack={returning ? undefined : () => navigation.goBack()}
      primaryLabel={NOTIFICATIONS_PROMPT_COPY.allow}
      primaryDisabled={busy}
      onPrimary={() => finish(true)}
      secondaryLabel={NOTIFICATIONS_PROMPT_COPY.notNow}
      onSecondary={() => finish(false)}
    >
      <Card padding={20} style={styles.card}>
        <View style={styles.bell}>
          <Icon name="bell" size={24} color={palette.coal} />
        </View>
        <Text style={[type.body, styles.text]}>
          {NOTIFICATIONS_PROMPT_COPY.calm}
          {!returning && draft.remindersWanted ? ` ${NOTIFICATIONS_PROMPT_COPY.reminders}` : ''}
        </Text>
      </Card>
      {error ? <Text style={[type.bodySmall, styles.error]}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.s16 },
  bell: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    backgroundColor: palette.aspen,
    boxShadow: depth.sunk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  error: { color: palette.coal, marginTop: space.s16 },
});
