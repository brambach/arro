import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useApp } from '../state/AppState';
import { PreviewScenarioId, previewNow } from '../data/preview';
import type { RootStackParamList } from '../navigation/types';
import type { PreviewBehavior } from '../state/purchases';

/**
 * Dev builds only, and only with EXPO_PUBLIC_DEV_DRIVER=1: lets a script on the
 * Mac drive the app in the Simulator for screenshots and recordings, with no
 * taps. It polls a little local server (localhost:8099/next) for one command at
 * a time: sign in to the preview family, pick a scenario, go to a screen, or log
 * a session as if the form had just closed. Release builds never include it
 * (App.tsx mounts it behind __DEV__).
 */
export const devDriverOn = __DEV__ && process.env.EXPO_PUBLIC_DEV_DRIVER === '1';
/** Several simulators can run captures at once, each with its own driver server. */
const DRIVER_PORT = process.env.EXPO_PUBLIC_DEV_DRIVER_PORT || '8099';

type Command =
  | { op: 'onboard' }
  | { op: 'scenario'; id: PreviewScenarioId | null }
  | { op: 'nav'; route: keyof RootStackParamList; params?: object }
  | { op: 'tab'; tab: 'Today' | 'ThisWeek' | 'Feed' | 'Me' }
  | { op: 'reset' }
  | { op: 'scroll'; y: number }
  | { op: 'back' }
  | { op: 'emit'; event: string }
  | { op: 'openCard'; index: number; reply?: boolean; route?: 'SessionDetail' | 'EditSession' }
  | { op: 'cheerCard'; index: number }
  | { op: 'log'; minutes?: number; minutesAgo?: number }
  | { op: 'cheer'; id: string }
  | { op: 'comment'; id: string; body: string }
  | { op: 'plusStore'; behavior: PreviewBehavior; storeMs?: number; serverMs?: number }
  | { op: 'emitArg'; event: string; arg: string | number }
  | { op: 'timer'; ago: number; target?: number };

export function DevDriver({ navigation }: { navigation: NavigationContainerRefWithCurrent<RootStackParamList> }) {
  const app = useApp();
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  });

  useEffect(() => {
    let alive = true;
    const run = async (c: Command) => {
      const a = appRef.current;
      switch (c.op) {
        case 'onboard':
          if (a.session) return;
          a.startFlow('founder');
          a.updateDraft({ name: 'Sam', familyName: 'Sunday sauna' });
          // updateDraft commits through a ref; give it a frame.
          await new Promise((r) => setTimeout(r, 50));
          await appRef.current.completeOnboarding(false);
          return;
        case 'scenario':
          a.setPreview(c.id);
          return;
        case 'nav':
          // The route names are checked by the server script, not here.
          (navigation.navigate as (name: string, params?: object) => void)(c.route, c.params);
          return;
        case 'tab':
          (navigation.navigate as (name: string, params?: object) => void)('Main', { screen: c.tab });
          return;
        case 'reset':
          navigation.resetRoot({ index: 0, routes: [{ name: 'Main' }] });
          return;
        case 'scroll':
          // Every mounted Screen listens; only the visible one matters in a capture.
          DeviceEventEmitter.emit('devScroll', c.y);
          return;
        case 'openCard': {
          const cards = a.view?.feed.sections.flatMap((x) => x.cards) ?? [];
          const card = cards[c.index];
          if (card) (navigation.navigate as (name: string, params?: object) => void)(c.route ?? 'SessionDetail', { sessionId: card.id, reply: c.reply });
          return;
        }
        case 'cheerCard': {
          const card = (a.view?.feed.sections.flatMap((x) => x.cards) ?? [])[c.index];
          if (card) await a.cheer(card.id);
          return;
        }
        case 'emit':
          DeviceEventEmitter.emit(c.event);
          return;
        case 'back':
          if (navigation.canGoBack()) navigation.goBack();
          return;
        case 'log': {
          const at = new Date(previewNow(new Date()).getTime() - (c.minutesAgo ?? 30) * 60_000);
          await a.logSession({ startedAt: at.toISOString(), durationMinutes: c.minutes ?? 20, saunaType: 'traditional', tempC: 85, source: 'timer' });
          return;
        }
        case 'cheer':
          await a.cheer(c.id);
          return;
        case 'comment':
          await a.comment(c.id, c.body);
          return;
        case 'plusStore':
          a.setPreviewPurchases(c.behavior, { storeMs: c.storeMs, serverMs: c.serverMs });
          return;
        case 'timer': {
          const start = new Date(Date.now() - c.ago * 1000).toISOString();
          a.devSetTimer({ startedAt: start, rounds: [{ start, end: null }], targetMinutes: c.target ?? 15, saunaType: 'traditional' });
          return;
        }
        case 'emitArg':
          DeviceEventEmitter.emit(c.event, c.arg);
          return;
      }
    };
    const tick = async () => {
      if (!alive) return;
      try {
        const res = await fetch(`http://localhost:${DRIVER_PORT}/next`);
        if (res.status === 200) await run((await res.json()) as Command);
      } catch {
        // No server running: try again later.
      }
      if (alive) setTimeout(tick, 300);
    };
    tick();
    return () => {
      alive = false;
    };
  }, [navigation]);

  return null;
}
