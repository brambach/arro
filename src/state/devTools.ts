import { useSyncExternalStore } from 'react';

/**
 * Dev builds only: switches for capturing screens the simulator can't reach on
 * its own (src/navigation/DevLinks.tsx sets them from a deep link). Every
 * reader checks __DEV__ first, so a release build always sees the defaults.
 */
export interface DevOverrides {
  /** Show Sign in with Apple's button even without a server. */
  appleButton: boolean;
  /** Show "Arro is now Saunafam" now, as the founder or as anyone else. */
  renamedSheet: 'founder' | 'member' | null;
  /** Answer delete-account's dry run with "you pay for Plus". */
  paysForPlus: boolean;
  /** See Family rules as someone who didn't start the family. */
  asMember: boolean;
  /** Open one of Settings' confirms straight away. */
  settingsConfirm: 'signOut' | 'delete' | null;
}

const DEFAULTS: DevOverrides = { appleButton: false, renamedSheet: null, paysForPlus: false, asMember: false, settingsConfirm: null };

let state: DevOverrides = DEFAULTS;
const listeners = new Set<() => void>();

export function setDevOverrides(patch: Partial<DevOverrides>): void {
  if (!__DEV__) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function resetDevOverrides(): void {
  setDevOverrides(DEFAULTS);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useDevOverrides(): DevOverrides {
  const value = useSyncExternalStore(subscribe, () => state, () => DEFAULTS);
  return __DEV__ ? value : DEFAULTS;
}
