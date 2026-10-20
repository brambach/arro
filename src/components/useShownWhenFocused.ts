import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

/**
 * Holds a value while the screen is covered (the log sheet is up over Today)
 * and hands the new one over just after the screen is back, so a moment that
 * belongs to the change plays where it can be seen: "The sheet closes. On
 * Today, your avatar ring fills..." (Key motion moment 5).
 *
 * While the screen is in front, changes pass straight through.
 */
/**
 * How long iOS takes to slide a page sheet away once the screen under it is
 * focused again (tuned in the check-in recording: the sheet is gone, the dot starts).
 * A platform number, not one of ours, so it isn't in motion.ts.
 */
export const SHEET_DISMISS_MS = 400;

export function useShownWhenFocused<T>(value: T, settleMs: number = SHEET_DISMISS_MS): T {
  const focused = useIsFocused();
  const [shown, setShown] = useState(value);
  const wasFocused = useRef(focused);
  // When the hold ends. Kept across re-renders: a new `value` arriving mid-hold
  // (the view rebuilds often) must not cut the wait short.
  const holdUntil = useRef(0);

  useEffect(() => {
    if (focused && !wasFocused.current) holdUntil.current = Date.now() + settleMs;
    wasFocused.current = focused;
    if (!focused || shown === value) return;
    // Coming back, the sheet is still sliding away: wait for it.
    const t = setTimeout(() => setShown(value), Math.max(0, holdUntil.current - Date.now()));
    return () => clearTimeout(t);
  }, [focused, value, shown, settleMs]);

  return shown;
}
