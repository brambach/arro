/**
 * Notifications through expo-notifications: the permission, the daily reminder
 * (local, scheduled from reminders.ts) and this phone's Expo push token, which
 * the server uses for cheers, joins and the evening nudge (send-push).
 *
 * Like health.ts, the module is loaded only when its native side is present: a
 * dev build made before expo-notifications was added, and the web preview, don't
 * have it. There, notifications are simply unavailable.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type * as NotificationsModule from 'expo-notifications';
import { ReminderSlot } from '../data/types';
import { REMINDER_COPY, reminderTimes } from './reminders';

type Notifications = typeof NotificationsModule;

let loaded: Notifications | null | undefined;

function notifications(): Notifications | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoNotificationScheduler')) {
    try {
      loaded = require('expo-notifications') as Notifications;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

/** True on an iPhone build that has expo-notifications. */
export function notificationsAvailable(): boolean {
  return notifications() !== null;
}

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function notificationPermission(): Promise<NotificationPermission> {
  const n = notifications();
  if (!n) return 'unavailable';
  try {
    const { status } = await n.getPermissionsAsync();
    return status;
  } catch {
    return 'unavailable';
  }
}

/** Shows iOS's sheet the first time. After a "Don't Allow", only the Settings app can change it. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const n = notifications();
  if (!n) return 'unavailable';
  try {
    // No badges, ever (healthy-contact rule 5): ask for alerts and sounds only.
    const { status } = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return status;
  } catch {
    return 'unavailable';
  }
}

/** Notifications that arrive while Arro is open show as a banner too, without a badge. */
export function showNotificationsInForeground(): void {
  notifications()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const REMINDER_PREFIX = 'arro-reminder-';

// Scheduling runs one at a time, so two quick refreshes can't leave duplicates behind.
let queue: Promise<void> = Promise.resolve();

/**
 * Replaces the scheduled daily reminders: one a day for the next two weeks at
 * the chosen time, leaving today's out once this person has moved. `slot` null
 * clears them (reminders off, or signed out).
 */
export function scheduleReminders(slot: ReminderSlot | null, movedToday: boolean): Promise<void> {
  queue = queue.then(async () => {
    const n = notifications();
    if (!n) return;
    try {
      const scheduled = await n.getAllScheduledNotificationsAsync();
      await Promise.all(
        scheduled
          .filter((s) => s.identifier.startsWith(REMINDER_PREFIX))
          .map((s) => n.cancelScheduledNotificationAsync(s.identifier)),
      );
      if (!slot || (await n.getPermissionsAsync()).status !== 'granted') return;
      for (const at of reminderTimes(slot, movedToday)) {
        await n.scheduleNotificationAsync({
          identifier: `${REMINDER_PREFIX}${at.toISOString()}`,
          content: { title: REMINDER_COPY.title, body: REMINDER_COPY.body, data: { kind: 'reminder' } },
          trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: at },
        });
      }
    } catch {
      // Scheduling failed this time; the next launch or refresh tries again.
    }
  });
  return queue;
}

/**
 * This phone's Expo push token, or null without permission, without an EAS
 * project id in app.json (extra.eas.projectId), or offline.
 */
export async function expoPushToken(): Promise<string | null> {
  const n = notifications();
  if (!n) return null;
  try {
    if ((await n.getPermissionsAsync()).status !== 'granted') return null;
    // Reads the project id from app.json's extra.eas.projectId; throws without one.
    const { data } = await n.getExpoPushTokenAsync();
    return data;
  } catch {
    return null;
  }
}

/** What a tapped notification carries in `data` (push_outbox.data on the server, or the reminder's). */
export type NotificationTap =
  | { kind: 'cheer'; workoutId: string }
  | { kind: 'joined'; memberId: string }
  | { kind: 'evening'; memberId: string }
  | { kind: 'nudge'; memberId: string }
  | { kind: 'reminder' };

function asTap(data: unknown): NotificationTap | null {
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.kind === 'cheer' && typeof d.workoutId === 'string') return { kind: 'cheer', workoutId: d.workoutId };
  if ((d.kind === 'joined' || d.kind === 'evening' || d.kind === 'nudge') && typeof d.memberId === 'string') {
    return { kind: d.kind, memberId: d.memberId };
  }
  if (d.kind === 'reminder') return { kind: 'reminder' };
  return null;
}

/**
 * Calls `onTap` for each notification the person taps, including the one that
 * opened Arro from closed. Returns a function that stops listening.
 */
export function onNotificationTap(onTap: (tap: NotificationTap) => void): () => void {
  const n = notifications();
  if (!n) return () => undefined;
  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    if (!response || response.actionIdentifier !== n.DEFAULT_ACTION_IDENTIFIER) return;
    const tap = asTap(response.notification.request.content.data);
    n.clearLastNotificationResponse();
    if (tap) onTap(tap);
  };
  handle(n.getLastNotificationResponse());
  const sub = n.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
