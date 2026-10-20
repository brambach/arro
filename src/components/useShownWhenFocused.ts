import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { durations } from '../theme/motion';

/**
 * Holds a value while the screen is covered (the log sheet is up over Today)
 * and hands the new one over just after the screen is back, so a moment that
 * belongs to the change plays where it can be seen: "The sheet closes. On
 * Today, your avatar ring fills..." (Key motion moment 5).
 *
 * While the screen is in front, changes pass straight through.
 */
export function useShownWhenFocused<T>(value: T, settleMs: number = durations.utility): T {
  const focused = useIsFocused();
  const [shown, setShown] = useState(value);
  const wasFocused = useRef(focused);

  useEffect(() => {
    const cameBack = focused && !wasFocused.current;
    wasFocused.current = focused;
    if (!focused || shown === value) return;
    // Coming back, the sheet is still sliding away: wait for it.
    const t = setTimeout(() => setShown(value), cameBack ? settleMs : 0);
    return () => clearTimeout(t);
  }, [focused, value, shown, settleMs]);

  return shown;
}
