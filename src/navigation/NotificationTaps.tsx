import { useCallback, useEffect, useRef } from 'react';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useApp } from '../state/AppState';
import { NotificationTap, onNotificationTap } from '../state/notifications';
import { RootStackParamList } from './types';

/**
 * Opens the right screen for a tapped notification (docs/saunafam/API.md,
 * "Pushes"): SessionDetail for a session, shared session, cheer or comment; the
 * Nudge sheet; the Week tab for the weekend check-in; Family members after a
 * join. Reminders and the timer just open the app. A tap that arrives before the
 * session has loaded (opened from closed) waits for it.
 */
export function NotificationTaps({ navigation }: { navigation: NavigationContainerRefWithCurrent<RootStackParamList> }) {
  const { ready, session, refresh } = useApp();
  const pending = useRef<NotificationTap | null>(null);
  const signedIn = ready && !!session;

  const open = useCallback((tap: NotificationTap) => {
    switch (tap.kind) {
      case 'session':
      case 'shared':
      case 'session_cheer':
      case 'session_comment':
        navigation.navigate('SessionDetail', { sessionId: tap.sessionId });
        break;
      case 'nudge':
        navigation.navigate('Nudge', { memberId: tap.memberId });
        break;
      case 'weekend':
        navigation.navigate('Main', { screen: 'ThisWeek' });
        break;
      case 'joined':
        navigation.navigate('FamilyMembers');
        break;
      default:
        // A reminder or the timer: opening the app is enough.
        break;
    }
  }, [navigation]);

  useEffect(
    () =>
      onNotificationTap((tap) => {
        pending.current = tap;
        // The push is about something new on the server, so fetch it before showing it.
        refresh().finally(() => {
          if (pending.current === tap && navigation.isReady() && signedIn) {
            pending.current = null;
            open(tap);
          }
        });
      }),
    [navigation, open, refresh, signedIn],
  );

  useEffect(() => {
    if (!signedIn || !pending.current) return;
    const tap = pending.current;
    const timer = setInterval(() => {
      if (!navigation.isReady()) return;
      clearInterval(timer);
      pending.current = null;
      open(tap);
    }, 100);
    return () => clearInterval(timer);
  }, [navigation, open, signedIn]);

  return null;
}
