import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/**
 * The house motion, shared with arrofamily.com (site/public/styles.css):
 * - statement: one 900ms easeOutExpo arrival per screen, played once
 * - signature: a 400ms overshoot, only for check-ins (ticks, "Kept", the week's days)
 * - utility: 200ms ease-out for small state changes
 * Transform and opacity only. Reduce Motion shows everything finished.
 */
export const motion = {
  statement: { duration: 900, easing: Easing.bezier(0.19, 1, 0.22, 1) },
  signature: { duration: 400, easing: Easing.bezier(0.2, 1.4, 0.4, 1) },
  utility: { duration: 200, easing: Easing.out(Easing.quad) },
} as const;

let cached: boolean | null = null;

/**
 * Reduce Motion, kept live. Null until the first probe answers, so a caller can
 * hold its animation instead of flashing the finished state first.
 */
export function useReduceMotion(): boolean | null {
  const [value, setValue] = useState<boolean | null>(cached);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        cached = v;
        if (mounted) setValue(v);
      })
      // Never leave content waiting on a probe that failed.
      .catch(() => mounted && setValue(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      cached = v;
      if (mounted) setValue(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return value;
}
