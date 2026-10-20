import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { PreviewScenarioId, PREVIEW_SCENARIOS } from '../data/preview';
import { Draft, useApp } from '../state/AppState';
import { resetDevOverrides, setDevOverrides } from '../state/devTools';
import { PATHS, Role } from '../screens/onboarding/steps';
import { RootStackParamList } from './types';

/**
 * Dev builds only: deep links that open any onboarding step or Settings screen
 * in a known state, for simulator captures. Release builds render nothing and
 * never listen (the component returns before subscribing when !__DEV__).
 *
 *   <scheme>://dev/onboarding/Rhythm?role=founder&name=Sam&family=Sunday%20sauna
 *   <scheme>://dev/screen/TakeBreak?preview=onBreak
 *   <scheme>://dev/sheet/renamed?as=member
 *   <scheme>://dev/flags?apple=1&paysForPlus=1
 *   <scheme>://dev/reset
 *
 * `onboarding/<route>` signs out first (in the preview that only clears the
 * phone), then builds the stack Welcome, then every step before <route> on that
 * path, so Back works. `screen/<route>` signs in to the preview family if
 * needed, picks the scenario, and opens Main, Settings, <route>.
 */
type Nav = NavigationContainerRefWithCurrent<RootStackParamList>;

function parse(url: string): { path: string[]; query: Record<string, string> } | null {
  const m = /^[a-z0-9+.-]+:\/\/(?:[^/]*\/)?dev\/([^?#]*)(?:\?([^#]*))?/i.exec(url);
  if (!m) return null;
  const query: Record<string, string> = {};
  for (const pair of (m[2] ?? '').split('&').filter(Boolean)) {
    const [k, v = ''] = pair.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return { path: m[1].split('/').filter(Boolean), query };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DevLinks({ navigation }: { navigation: Nav }) {
  const app = useApp();
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  }, [app]);

  const handle = useCallback(
    async (url: string | null) => {
      if (!url) return;
      const link = parse(url);
      if (!link) return;
      const [kind, target] = link.path;
      const q = link.query;
      const a = () => appRef.current;

      if (kind === 'reset') {
        resetDevOverrides();
        return;
      }
      if (kind === 'flags') {
        setDevOverrides({ appleButton: q.apple === '1', paysForPlus: q.paysForPlus === '1' });
        return;
      }
      if (kind === 'onboarding' && target) {
        if (a().session) {
          await a().signOut();
          await wait(400);
        }
        const role: Role = q.role === 'invitee' ? 'invitee' : 'founder';
        a().startFlow(role);
        const patch: Partial<Draft> = {};
        if (q.name) patch.name = q.name;
        if (q.family) patch.familyName = q.family;
        if (q.code) patch.joinCode = q.code;
        if (q.goal) patch.goal = Number(q.goal);
        if (q.min) patch.minMinutes = Number(q.min);
        if (q.sunday === '1') patch.weekStartsOn = 7;
        a().updateDraft(patch);
        const path = PATHS[role];
        const at = path.indexOf(target as keyof RootStackParamList);
        const before = at < 0 ? [] : path.slice(0, at + 1);
        const routes = target === 'Welcome' ? [{ name: 'Welcome' as const }] : [{ name: 'Welcome' as const }, ...before.map((name) => ({ name }))];
        await wait(100);
        if (navigation.isReady()) navigation.reset({ index: routes.length - 1, routes } as never);
        return;
      }
      if (kind === 'screen' && target) {
        if (!a().session) {
          a().startFlow('founder');
          a().updateDraft({ name: 'Sam', familyName: 'Sunday sauna' });
          await wait(50);
          await a().completeOnboarding(true);
          await wait(400);
        }
        const preview = q.preview && PREVIEW_SCENARIOS.some((s) => s.id === q.preview) ? (q.preview as PreviewScenarioId) : 'family';
        a().setPreview(preview);
        await wait(150);
        const routes =
          target === 'Main'
            ? [{ name: 'Main' }]
            : target === 'Settings'
              ? [{ name: 'Main' }, { name: 'Settings' }]
              : [{ name: 'Main' }, { name: 'Settings' }, { name: target }];
        if (navigation.isReady()) navigation.reset({ index: routes.length - 1, routes } as never);
        return;
      }
      if (kind === 'sheet' && target === 'renamed') {
        setDevOverrides({ renamedSheet: q.as === 'member' ? 'member' : 'founder' });
      }
    },
    [navigation],
  );

  useEffect(() => {
    if (!__DEV__) return;
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [handle]);

  return null;
}
