import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useApp } from '../state/AppState';
import { isSaunaType } from '../data/saunas';
import { TimerState } from '../state/timer';
import { PreviewScenarioId } from '../data/preview';
import { sendDevCommand } from './capture';
import { writeMindfulMinutes } from '../state/health';
import { pickSessionPhoto } from '../state/sessionPhoto';
import { devScheduleNotification, scheduleWeeklyReminders, scheduledNotifications } from '../state/notifications';
import { NOTIFICATION_COPY, REMINDER_PREFIX } from '../state/reminders';
import { setHealthEnabled } from '../state/healthSettings';

/**
 * Dev builds only (mounted behind __DEV__ in RootNavigator): drives the app from
 * simctl deep links for screenshots and recordings.
 *
 *   com.arrofamily.arro://dev/onboard                         skip onboarding (no server: the preview family)
 *   com.arrofamily.arro://dev/timer?ago=760&target=15        a timer 12:40 in
 *   com.arrofamily.arro://dev/timer?ago=600&cool=120          cooling off for 2 min after 10 min
 *   com.arrofamily.arro://dev/timer?ago=11400                 3 hours 10 in
 *   com.arrofamily.arro://dev/clear                           no timer
 *   com.arrofamily.arro://dev/preview?id=draft                a Prototype preview scenario (id=none for yours)
 *   com.arrofamily.arro://dev/open?screen=Timer               open a screen (LogSession takes draft=first, day=yesterday)
 *   com.arrofamily.arro://dev/back                            go back
 *   com.arrofamily.arro://dev/health-on                       Apple Health switch on (iOS's sheet the first time)
 *   com.arrofamily.arro://dev/health-write?min=15&ago=1200    write a test session to Health (logged to Metro)
 *   com.arrofamily.arro://dev/timer-start?ago=890&target=15   start the timer for real (schedules its notifications) as if tapped 890 s ago
 *   com.arrofamily.arro://dev/photo?from=camera              the session photo picker, as the log form's buttons call it
 *   com.arrofamily.arro://dev/ids                             log session and member ids (for test pushes)
 *   com.arrofamily.arro://dev/notif-list                      log what's scheduled
 *   com.arrofamily.arro://dev/reminder-soon?in=5             a weekly reminder (real copy and id prefix) in 5 seconds
 *   com.arrofamily.arro://dev/notif-raw?id=arro-reminder-x&in=600&kind=session&sessionId=...   any notification, as is
 *   anything else (start, loyly, round, done, cancel, stale, panel, hide, form-*) goes to the screens
 */
export function DevCapture() {
  const appNow = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const appRef = useRef(appNow);
  useEffect(() => {
    appRef.current = appNow;
  });

  useEffect(() => {
    const handle = (url: string | null) => {
      const app = appRef.current;
      if (!url) return;
      const match = /:\/\/dev\/([^?]+)(?:\?(.*))?$/.exec(url);
      if (!match) return;
      const command = match[1];
      const args: Record<string, string> = {};
      for (const pair of (match[2] ?? '').split('&')) {
        const [k, v] = pair.split('=');
        if (k) args[k] = decodeURIComponent(v ?? '');
      }
      if (command === 'onboard') {
        // Skip onboarding with the preview family: you're Sam in "Sunday sauna".
        app.updateDraft({ name: 'Sam', familyName: 'Sunday sauna' });
        setTimeout(() => appRef.current.completeOnboarding(false).catch(() => undefined), 50);
      } else if (command === 'timer') {
        const now = Date.now();
        const ago = Number(args.ago ?? 0) * 1000;
        const cool = Number(args.cool ?? 0) * 1000;
        const start = new Date(now - ago).toISOString();
        const state: TimerState = {
          startedAt: start,
          rounds: [{ start, end: cool ? new Date(now - cool).toISOString() : null }],
          targetMinutes: Number(args.target ?? 15),
          saunaType: isSaunaType(args.type) ? args.type : 'traditional',
        };
        app.devSetTimer(state);
      } else if (command === 'clear') {
        app.devSetTimer(null);
      } else if (command === 'preview') {
        app.setPreview(args.id && args.id !== 'none' ? (args.id as PreviewScenarioId) : null);
      } else if (command === 'open') {
        if (args.screen === 'Timer') navigation.navigate('Timer', {});
        else if (args.screen === 'LogSession') {
          const draftId = args.draft === 'first' ? app.view?.today.drafts[0]?.clientId : undefined;
          navigation.navigate('LogSession', {
            draftId,
            day: args.day === 'yesterday' ? 'yesterday' : undefined,
          });
        } else if (args.screen) navigation.navigate(args.screen as never);
      } else if (command === 'health-on') {
        setHealthEnabled(true).then((p) => console.log(`[dev] Apple Health: ${p}`));
      } else if (command === 'health-write') {
        // The preview family isn't on the server, so its sessions never go to Health; this writes one through the real path.
        const startedAt = new Date(Date.now() - Number(args.ago ?? 1200) * 1000).toISOString();
        writeMindfulMinutes([{ id: `dev-${Date.now()}`, startedAt, durationMinutes: Number(args.min ?? 15) }]).then((r) =>
          console.log(`[dev] Apple Health write: ${JSON.stringify(r)}`),
        );
      } else if (command === 'timer-start') {
        app
          .startTimer({ at: new Date(Date.now() - Number(args.ago ?? 0) * 1000), targetMinutes: Number(args.target ?? 15) })
          .then((t) => console.log(`[dev] timer started at ${t.startedAt}`));
      } else if (command === 'photo') {
        pickSessionPhoto(args.from === 'library' ? 'library' : 'camera').then(
          (uri) => console.log(`[dev] photo: ${uri ?? 'none'}`),
          (e: unknown) => console.log(`[dev] photo failed: ${String(e)}`),
        );
      } else if (command === 'ids') {
        const v = app.view;
        console.log(`[dev] sessions: ${JSON.stringify(Object.keys(v?.sessions ?? {}).slice(0, 12))} members: ${JSON.stringify(Object.keys(v?.members ?? {}))}`);
      } else if (command === 'notif-list') {
        scheduledNotifications().then((list) => console.log(`[dev] scheduled: ${JSON.stringify(list)}`));
      } else if (command === 'reminder-soon') {
        const at = new Date(Date.now() + Number(args.in ?? 5) * 1000);
        scheduleWeeklyReminders([
          { identifier: `${REMINDER_PREFIX}dev`, at, title: NOTIFICATION_COPY.reminderTitle(2), body: NOTIFICATION_COPY.reminderBody(10) },
        ]).then(() => console.log('[dev] reminder scheduled'));
      } else if (command === 'notif-raw') {
        const { id, in: secs, title, ...data } = args;
        devScheduleNotification(id ?? 'dev-raw', title ?? 'Test', '', Number(secs ?? 5), data).then(() => console.log(`[dev] scheduled ${id}`));
      } else if (command === 'back') {
        if (navigation.canGoBack()) navigation.goBack();
      } else {
        sendDevCommand(command, args);
      }
    };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    // simctl openurl asks "Open in ...?" every time. For long capture runs, start
    // Metro with EXPO_PUBLIC_DEV_CAPTURE=http://127.0.0.1:8765 and serve the same
    // commands (one per line, "dev/start") from there: polled four times a second.
    const queue = process.env.EXPO_PUBLIC_DEV_CAPTURE;
    let poll: ReturnType<typeof setInterval> | undefined;
    if (queue) {
      poll = setInterval(() => {
        fetch(`${queue}/next`)
          .then((r) => r.text())
          .then((text) => text.split('\n').forEach((line) => line && handle(`capture://${line}`)))
          .catch(() => undefined);
      }, 250);
    }
    return () => {
      sub.remove();
      if (poll) clearInterval(poll);
    };
  }, [navigation]);

  return null;
}
