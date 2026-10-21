import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useApp } from '../state/AppState';
import { NotificationTap, onNotificationTap } from '../state/notifications';
import { RootStackParamList } from './types';
import { tapRoute } from './tapRoute';

/**
 * Opens the right screen for a tapped notification, pushes and local ones alike
 * (where each lands is tapRoute.ts). A push is about something new on the
 * server, so the family is fetched first. A tap that arrives before the session
 * has loaded (the tap opened the app) waits for it.
 */
export function NotificationTaps({ navigation }: { navigation: NavigationContainerRefWithCurrent<RootStackParamList> }) {
  const { ready, session, refresh, view } = useApp();
  const pending = useRef<NotificationTap | null>(null);
  const signedIn = ready && !!session;
  const timerRunning = useRef(false);
  const hasTimer = !!view?.timer;
  useEffect(() => {
    timerRunning.current = hasTimer;
  }, [hasTimer]);

  const open = useCallback(
    (tap: NotificationTap) => {
      const go = () => {
        const to = tapRoute(tap, { timerRunning: timerRunning.current });
        // tapRoute's names and params are RootStackParamList's; navigate's overloads don't take a union.
        (navigation.navigate as (name: string, params?: object) => void)(to.name, 'params' in to ? to.params : undefined);
      };
      // A tap from the background arrives before the app is active. A sheet (Nudge, the timer room)
      // presented then lands over a blank screen, so wait until the app is back in front.
      if (AppState.currentState === 'active') {
        go();
        return;
      }
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active') return;
        sub.remove();
        requestAnimationFrame(go);
      });
    },
    [navigation],
  );

  useEffect(
    () =>
      onNotificationTap((tap) => {
        pending.current = tap;
        const local = tap.kind === 'timer' || tap.kind === 'reminder';
        (local ? Promise.resolve() : refresh()).finally(() => {
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
