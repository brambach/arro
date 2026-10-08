import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/**
 * Shared motion vocabulary. Springs are tuned to settle without a visible
 * wobble: they give presses and arrivals a little weight, never a bounce.
 */
export const springs = {
  /** Press-in / release on tappable surfaces. */
  press: { speed: 40, bounciness: 0 },
  /** Things arriving: beads, badges, the active tab icon. */
  pop: { speed: 14, bounciness: 7 },
  /** Gentle settle for larger surfaces. */
  settle: { speed: 12, bounciness: 3 },
} as const;

export const easings = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
} as const;

let cached: boolean | null = null;

/**
 * Reduce Motion, kept live. Returns null until the first probe resolves so
 * callers can hold an animation rather than flash its end state.
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
      // Never leave content stuck invisible if the probe rejects.
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
