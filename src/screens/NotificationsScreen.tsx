import React, { useCallback, useEffect, useState } from 'react';
import { AppState as RNAppState, Linking } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useApp, useView } from '../state/AppState';
import { showError } from '../state/confirm';
import { NotificationPermission, notificationPermission } from '../state/notifications';
import { clockTimeLabel, reminderDaysLabel } from '../state/reminders';
import { Btn, Choices, H, P, PlainScreen } from './plain';
import { REMINDER_SLOTS } from './onboarding/ReminderTimeScreen';

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Settings > Notifications, plain until M10: reminder days and time, and the weekend check-in. */
export function NotificationsScreen({ navigation }: RootStackScreenProps<'Notifications'>) {
  const { session, setReminders, setWeekendCheckin, turnOnNotifications } = useApp();
  const view = useView();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
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
    try {
      const result = await setReminders(patch);
      if (result) setPermission(result);
    } catch {
      showError('Couldn’t change your reminder', 'Check your connection and try again.');
    }
  };

  return (
    <PlainScreen title="Notifications" onBack={() => navigation.goBack()}>
      {permission === 'denied' ? <Btn title="Notifications are off. Open Settings" onPress={() => Linking.openSettings()} /> : null}
      {permission === 'undetermined' ? <Btn title="Turn on notifications" onPress={async () => setPermission(await turnOnNotifications())} /> : null}
      <H>Remind me if I’m behind</H>
      <P muted>{me.remindersWanted ? `${reminderDaysLabel(me.reminderDays)} at ${clockTimeLabel(me.reminderTime)}` : 'No reminders'}</P>
      <Btn title={me.remindersWanted ? 'No reminders' : 'Turn reminders on'} onPress={() => change({ wanted: !me.remindersWanted })} />
      <Choices
        options={DAYS}
        value={null}
        label={(d) => `${DAY_SHORT[d - 1]}${me.reminderDays.includes(d) ? ' ✓' : ''}`}
        onChange={(d) => change({ days: me.reminderDays.includes(d) ? me.reminderDays.filter((x) => x !== d) : [...me.reminderDays, d] })}
      />
      <Choices options={REMINDER_SLOTS.map((s) => s.time)} value={me.reminderTime} label={clockTimeLabel} onChange={(time) => change({ time })} />
      <H>Weekend check-in</H>
      <Btn title={view.weekendCheckin ? 'On' : 'Off'} onPress={() => setWeekendCheckin(!view.weekendCheckin)} />
    </PlainScreen>
  );
}
