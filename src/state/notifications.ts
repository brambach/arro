/**
 * Notifications through expo-notifications: the permission, this phone's Expo
 * push token (the server's pushes go through send-push), the weekly reminders
 * and the timer's two local notifications. Schedules and copy are in reminders.ts.
 *
 * The module is loaded only when its native side is present: a dev build made
 * before expo-notifications was added, Jest and the web preview don't have it,
 * and there notifications are simply unavailable.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type * as NotificationsModule from 'expo-notifications';
import {
  NOTIFICATION_COPY,
  REMINDER_PREFIX,
  ScheduledReminder,
  TIMER_SAFETY_ID,
  TIMER_TARGET_ID,
  legacyIdentifiers,
} from './reminders';

type Notifications = typeof NotificationsModule;

let loaded: Notifications | null | undefined;

function notifications(): Notifications | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoNotificationScheduler')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as Notifications;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

export function notificationsAvailable(): boolean {
  return notifications() !== null;
}

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function notificationPermission(): Promise<NotificationPermission> {
  const n = notifications();
  if (!n) return 'unavailable';
  try {
    return (await n.getPermissionsAsync()).status;
  } catch {
    return 'unavailable';
  }
}

/** Shows iOS's sheet the first time. After a "Don't Allow", only the Settings app can change it. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const n = notifications();
  if (!n) return 'unavailable';
  try {
    // No badges, ever: alerts and sounds only.
    const { status } = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return status;
  } catch {
    return 'unavailable';
  }
}

/** Notifications that arrive while Saunafam is open show as a banner too, without a badge. */
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

// Scheduling runs one at a time, so two quick refreshes can't leave duplicates behind.
let queue: Promise<void> = Promise.resolve();

function serial(task: (n: Notifications) => Promise<void>): Promise<void> {
  queue = queue.then(async () => {
    const n = notifications();
    if (!n) return;
    try {
      await task(n);
    } catch {
      // Scheduling failed this time; the next launch or refresh tries again.
    }
  });
  return queue;
}

async function cancelWhere(n: Notifications, match: (id: string) => boolean): Promise<void> {
  const scheduled = await n.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((s) => match(s.identifier)).map((s) => n.cancelScheduledNotificationAsync(s.identifier)));
}

/**
 * Cancels Arro's pending notifications (every identifier starting "arro-"), so
 * "You still have today" stops. Safe to run on every launch; there's nothing to
 * cancel after the first.
 */
export function cancelLegacyNotifications(): Promise<void> {
  return serial(async (n) => {
    const scheduled = await n.getAllScheduledNotificationsAsync();
    await Promise.all(legacyIdentifiers(scheduled.map((s) => s.identifier)).map((id) => n.cancelScheduledNotificationAsync(id)));
  });
}

/** Replaces the weekly reminders with `reminders` (from weeklyReminders). An empty list clears them. */
export function scheduleWeeklyReminders(reminders: ScheduledReminder[]): Promise<void> {
  return serial(async (n) => {
    await cancelWhere(n, (id) => id.startsWith(REMINDER_PREFIX));
    if (!reminders.length || (await n.getPermissionsAsync()).status !== 'granted') return;
    for (const r of reminders) {
      await n.scheduleNotificationAsync({
        identifier: r.identifier,
        content: { title: r.title, body: r.body, data: { kind: 'reminder' } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
  });
}

/**
 * The timer's two: "15 minutes in. Time to cool off." at the target, and the
 * 45-minute safety line. null for either cancels it. Called when the timer
 * starts or resumes; cancelTimerNotifications when it cools off or finishes.
 */
export function scheduleTimerNotifications(
  times: { target: Date | null; safety: Date | null },
  targetMinutes: number,
): Promise<void> {
  return serial(async (n) => {
    await cancelWhere(n, (id) => id === TIMER_TARGET_ID || id === TIMER_SAFETY_ID);
    if ((await n.getPermissionsAsync()).status !== 'granted') return;
    if (times.target) {
      await n.scheduleNotificationAsync({
        identifier: TIMER_TARGET_ID,
        content: { title: NOTIFICATION_COPY.timerTarget(targetMinutes), data: { kind: 'timer' } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: times.target },
      });
    }
    if (times.safety) {
      await n.scheduleNotificationAsync({
        identifier: TIMER_SAFETY_ID,
        content: { title: NOTIFICATION_COPY.timerSafety, data: { kind: 'timer' } },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: times.safety },
      });
    }
  });
}

export function cancelTimerNotifications(): Promise<void> {
  return serial((n) => cancelWhere(n, (id) => id === TIMER_TARGET_ID || id === TIMER_SAFETY_ID));
}

/** Everything this app scheduled (sign out). */
export function cancelAllLocalNotifications(): Promise<void> {
  return serial((n) => n.cancelAllScheduledNotificationsAsync());
}

/**
 * What's scheduled on this phone (dev captures and checks). iOS hands a DATE
 * trigger back as a time interval counted from when it was scheduled, so that's
 * what this reports.
 */
export async function scheduledNotifications(): Promise<{ identifier: string; title: string | null; trigger: string }[]> {
  const n = notifications();
  if (!n) return [];
  const all = await n.getAllScheduledNotificationsAsync();
  return all.map((s) => {
    const t = s.trigger as { type?: string; seconds?: number } | null;
    const trigger = typeof t?.seconds === 'number' ? `${Math.round(t.seconds)} s after scheduling` : t?.type ?? 'unknown';
    return { identifier: s.identifier, title: s.content.title, trigger };
  });
}

/** Dev builds only: schedule one notification `seconds` from now, as is (legacy cleanup and tap checks). */
export function devScheduleNotification(identifier: string, title: string, body: string, seconds: number, data: Record<string, unknown>): Promise<void> {
  if (!__DEV__) return Promise.resolve();
  return serial(async (n) => {
    await n.scheduleNotificationAsync({
      identifier,
      content: { title, body, data },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + seconds * 1000) },
    });
  });
}

/** This phone's Expo push token, or null without permission, a project id, or a connection. */
export async function expoPushToken(): Promise<string | null> {
  const n = notifications();
  if (!n) return null;
  try {
    if ((await n.getPermissionsAsync()).status !== 'granted') return null;
    const { data } = await n.getExpoPushTokenAsync();
    return data;
  } catch {
    return null;
  }
}

/** What a tapped notification carries in `data` (docs/saunafam/API.md, "Pushes"). */
export type NotificationTap =
  | { kind: 'session' | 'shared' | 'session_cheer' | 'session_comment'; sessionId: string }
  | { kind: 'nudge'; memberId: string }
  | { kind: 'weekend'; weekStart: string | null }
  | { kind: 'joined'; memberId: string }
  | { kind: 'reminder' }
  | { kind: 'timer' };

/** Pure, for tests: a push's data to a tap, or null for anything unknown (build 8's kinds included). */
export function parseTap(data: unknown): NotificationTap | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const kind = d.kind;
  if (
    (kind === 'session' || kind === 'shared' || kind === 'session_cheer' || kind === 'session_comment') &&
    typeof d.sessionId === 'string'
  ) {
    return { kind, sessionId: d.sessionId };
  }
  if ((kind === 'nudge' || kind === 'joined') && typeof d.memberId === 'string') return { kind, memberId: d.memberId };
  if (kind === 'weekend') return { kind, weekStart: typeof d.weekStart === 'string' ? d.weekStart : null };
  if (kind === 'reminder' || kind === 'timer') return { kind };
  return null;
}

// Taps already handled, by notification id and delivery time: the launch tap can come through
// both the "last response" and the listener, and the listener is set up again as sign-in changes.
const handledTaps = new Set<string>();

/** Calls `onTap` for each notification tapped, including the one that opened the app. */
export function onNotificationTap(onTap: (tap: NotificationTap) => void): () => void {
  const n = notifications();
  if (!n) return () => undefined;
  let alive = true;
  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    if (!alive || !response || response.actionIdentifier !== n.DEFAULT_ACTION_IDENTIFIER) return;
    const key = `${response.notification.request.identifier}@${response.notification.date}`;
    if (handledTaps.has(key)) return;
    handledTaps.add(key);
    const tap = parseTap(response.notification.request.content.data);
    // Cleared so the same tap isn't handled again when this listener is set up again.
    n.clearLastNotificationResponseAsync().catch(() => undefined);
    if (tap) onTap(tap);
  };
  // The tap that opened the app (SDK 57: the async getter; the sync one is deprecated).
  n.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => undefined);
  const sub = n.addNotificationResponseReceivedListener(handle);
  return () => {
    alive = false;
    sub.remove();
  };
}
