import React, { useCallback, useEffect, useState } from 'react';
import { AppState as RNAppState, Linking, StyleSheet, Text, View } from 'react-native';
import { palette, space } from '../theme/tokens';
import { type } from '../theme/typography';
import { Card } from '../components/Card';
import { DayPicker } from '../components/DayPicker';
import { ListGroup } from '../components/ListRow';
import { SolidButton } from '../components/SolidButton';
import { GroupLabel, GroupNote, SubScreen } from '../components/SubScreen';
import { TextAction } from '../components/TextAction';
import { TimeStepper } from '../components/TimeStepper';
import { ToggleRow } from '../components/ToggleRow';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { NotificationPermission, notificationPermission } from '../state/notifications';
import { reminderSentence } from '../state/settingsCopy';

export const NOTIFICATIONS_COPY = {
  title: 'Notifications',
  lead: 'Sessions, cheers, comments and nudges from your family come as notifications. These are the ones you choose.',
  offTitle: 'Notifications are off for Saunafam.',
  offBody: 'Nothing from your family reaches you, reminders included. Turn them on in the Settings app.',
  openSettings: 'Open Settings',
  askTitle: 'Saunafam hasn’t asked yet.',
  askBody: 'Turn them on to hear when someone has a sauna, cheers you on or joins.',
  turnOn: 'Turn on notifications',
  reminders: 'Reminders',
  remindMe: 'Remind me if I’m behind',
  remindersOff: 'No reminders. Turn this on to pick days and a time.',
  days: 'Days',
  time: 'Time',
  family: 'From your family',
  weekend: 'Weekend check-in',
  weekendSub: 'Saturday evening, who could use a cheer',
  weekendNote:
    'Sent once, on Saturday between 5 and 6 PM, if you’ve kept your week and someone else can still make theirs. It never says who missed.',
  failed: 'Couldn’t change that. Check your connection and try again.',
};

/**
 * Settings > Notifications: "Remind me if I'm behind" with its days and time
 * (kept on this phone; the server keeps the time), and the "Weekend check-in"
 * switch, which the server reads from members.weekend_checkin.
 */
export function NotificationsScreen({ navigation }: RootStackScreenProps<'Notifications'>) {
  const { session, setReminders, setWeekendCheckin, turnOnNotifications } = useApp();
  const view = useView();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekend, setWeekend] = useState(view.weekendCheckin);

  const check = useCallback(() => {
    notificationPermission().then(setPermission);
  }, []);
  useEffect(() => {
    check();
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  if (!session) return null;
  const me = session.me;

  const change = async (patch: Parameters<typeof setReminders>[0]) => {
    setError(null);
    try {
      const result = await setReminders(patch);
      if (result) setPermission(result);
    } catch {
      setError(NOTIFICATIONS_COPY.failed);
    }
  };

  const toggleWeekend = async (on: boolean) => {
    setWeekend(on);
    setError(null);
    try {
      await setWeekendCheckin(on);
    } catch {
      setWeekend(!on);
      setError(NOTIFICATIONS_COPY.failed);
    }
  };

  return (
    <SubScreen title={NOTIFICATIONS_COPY.title} lead={NOTIFICATIONS_COPY.lead} onBack={() => navigation.goBack()}>
      {permission === 'denied' ? (
        <Card padding={20} style={styles.banner}>
          <Text style={type.bodyStrong}>{NOTIFICATIONS_COPY.offTitle}</Text>
          <Text style={[type.bodySmall, styles.bannerBody]}>{NOTIFICATIONS_COPY.offBody}</Text>
          <TextAction label={NOTIFICATIONS_COPY.openSettings} tone="coal" onPress={() => Linking.openSettings()} style={styles.bannerAction} />
        </Card>
      ) : null}
      {permission === 'undetermined' ? (
        <Card padding={20} style={styles.banner}>
          <Text style={type.bodyStrong}>{NOTIFICATIONS_COPY.askTitle}</Text>
          <Text style={[type.bodySmall, styles.bannerBody]}>{NOTIFICATIONS_COPY.askBody}</Text>
          <SolidButton title={NOTIFICATIONS_COPY.turnOn} onPress={async () => setPermission(await turnOnNotifications())} style={styles.bannerButton} />
        </Card>
      ) : null}

      <GroupLabel first>{NOTIFICATIONS_COPY.reminders}</GroupLabel>
      <ListGroup>
        <ToggleRow title={NOTIFICATIONS_COPY.remindMe} value={me.remindersWanted} onValueChange={(wanted) => change({ wanted })} />
      </ListGroup>
      {me.remindersWanted ? (
        <>
          <Card padding={20} style={styles.picker}>
            <Text style={[type.caption, styles.label]}>{NOTIFICATIONS_COPY.days}</Text>
            <DayPicker days={me.reminderDays} onChange={(days) => change({ days })} weekStartsOn={view.rules.weekStartsOn} />
            <Text style={[type.caption, styles.label, styles.second]}>{NOTIFICATIONS_COPY.time}</Text>
            <TimeStepper time={me.reminderTime} onChange={(time) => change({ time })} />
          </Card>
          <GroupNote>{reminderSentence(me.reminderDays, me.reminderTime)}</GroupNote>
        </>
      ) : (
        <GroupNote>{NOTIFICATIONS_COPY.remindersOff}</GroupNote>
      )}

      <GroupLabel>{NOTIFICATIONS_COPY.family}</GroupLabel>
      <ListGroup>
        <ToggleRow title={NOTIFICATIONS_COPY.weekend} subtitle={NOTIFICATIONS_COPY.weekendSub} value={weekend} onValueChange={toggleWeekend} />
      </ListGroup>
      <GroupNote>{NOTIFICATIONS_COPY.weekendNote}</GroupNote>
      {error ? (
        <View style={styles.errorWrap}>
          <Text style={[type.bodySmall, styles.error]}>{error}</Text>
        </View>
      ) : null}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: space.s32 },
  bannerBody: { marginTop: space.s4 },
  bannerAction: { alignSelf: 'flex-start', marginTop: space.s8 },
  bannerButton: { marginTop: space.s16 },
  picker: { marginTop: space.s12 },
  label: { marginBottom: space.s12 },
  second: { marginTop: space.s24 },
  errorWrap: { marginTop: space.s16, marginHorizontal: space.s8 },
  error: { color: palette.coal },
});
