import { useEffect, useRef } from 'react';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useApp } from '../state/AppState';
import { NotificationTap, onNotificationTap } from '../state/notifications';
import { RootStackParamList } from './types';

/**
 * Opens the right screen for a tapped notification: the workout someone cheered,
 * the family list after a join, the "still has today" card for the evening nudge.
 * A nudge and the daily reminder just open the app. A tap that arrives before the session has
 * loaded (Arro opened from closed) waits for it.
 */
export function NotificationTaps({ navigation }: { navigation: NavigationContainerRefWithCurrent<RootStackParamList> }) {
  const { ready, session, refresh } = useApp();
  const pending = useRef<NotificationTap | null>(null);
  const signedIn = ready && !!session;

  const open = useRef((tap: NotificationTap) => {
    if (tap.kind === 'cheer') navigation.navigate('WorkoutDetail', { workoutId: tap.workoutId });
    else if (tap.kind === 'joined') navigation.navigate('FamilyMembers');
    else if (tap.kind === 'evening') navigation.navigate('Nudge', { memberId: tap.memberId });
    // Someone cheered you on before you'd moved: Today, where "I moved today" is.
    else if (tap.kind === 'nudge') navigation.navigate('Main', { screen: 'Today' });
  }).current;

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
