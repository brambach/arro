import { useSyncExternalStore } from 'react';

/**
 * When the first-launch splash starts to leave (spec, Key motion moment 1).
 * The splash's wisps become Welcome's haze, and Welcome's own settle starts as
 * the mark lifts away, so the two read as one move. Screens that open later
 * (after a sign out) see it as already gone.
 */
let leaving = false;
const listeners = new Set<() => void>();

export function markSplashLeaving(): void {
  if (leaving) return;
  leaving = true;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True once the splash has started to lift away. */
export function useSplashLeaving(): boolean {
  return useSyncExternalStore(subscribe, () => leaving, () => true);
}
