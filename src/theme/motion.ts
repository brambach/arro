import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing as RNEasing } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { curves, durations, loopTokens, momentSummary, springs, stagger } from './motionTokens';

export { curves, durations, momentSummary, springs, stagger };

/**
 * Saunafam's motion: slower and heavier than Arro (design/saunafam-spec.md,
 * section 2). Every duration and curve in the app comes from this file.
 *
 * - settle: one arrival per screen, played once. 1100 ms.
 * - ember: a soft overshoot, for check-ins only. 520 ms.
 * - utility: small state changes. 240 ms.
 * - springs for physical moves (a button growing into the room, slats dropping onto the wall),
 *   curves for fades.
 * - ambient loops are slow and named for what they do, and they pause when
 *   their screen isn't visible.
 *
 * Transform and opacity only. With Reduce Motion on, everything shows finished
 * and changes are crossfades (`reduced`).
 *
 * Reanimated runs these on the UI thread: pass `timing.settle` to withTiming,
 * `springs.slat` to withSpring.
 */

type CurveName = keyof typeof curves;

const bezier = (name: CurveName) => {
  const [a, b, c, d] = curves[name];
  return Easing.bezier(a, b, c, d);
};

/** Reanimated easings, from `curves`. */
export const easing = {
  settle: bezier('settle'),
  ember: bezier('ember'),
  utility: bezier('utility'),
  leave: bezier('leave'),
  breathe: bezier('breathe'),
  burst: bezier('burst'),
  linear: Easing.linear,
} as const;

/** Ready to pass to withTiming. */
export const timing = {
  settle: { duration: durations.settle, easing: easing.settle },
  ember: { duration: durations.ember, easing: easing.ember },
  utility: { duration: durations.utility, easing: easing.utility },
} as const;

/** How far things move. */
export const distances = {
  /** An arrival rises this far into place. */
  arrive: 12,
  /** A pressed button or tile shrinks to this. */
  pressScale: 0.97,
  /** A slat drops this far onto the wall. */
  slatDrop: 28,
} as const;

/**
 * Ambient loops, named for what they do. Slow (6 s or more), and paused when
 * their screen isn't visible.
 */
export const loops = {
  /** The heat glow breathing, one full cycle. */
  glowBreathe: { ...loopTokens.glowBreathe, easing: easing.breathe },
  /** The warm haze drifting over the wall, and the wisps after the splash. */
  steamDrift: { ...loopTokens.steamDrift, easing: easing.breathe },
} as const;

/**
 * Every key moment in section 2, with its timeline. Times in ms from the
 * moment's start. The components read these; nothing hard-codes a duration.
 */
export const moments = {
  /** 1. First launch. About 1.5 s, once. */
  splash: {
    wisps: { start: 0, duration: 600, easing: easing.settle, glowOpacity: 0.4 },
    stone: { start: 400, duration: 600, easing: easing.settle, fromScale: 0.96 },
    wordmark: { start: 700, duration: 500, easing: easing.settle, fromLetterSpacing: 2 },
    exit: { start: 1200, duration: 300, easing: easing.leave, lift: 8 },
    total: 1500,
    /**
     * The wisps thin out a little behind the mark's exit, so they never sit on
     * top of the next screen's content; that screen's own haze carries on.
     */
    hazeOut: { start: 1200, duration: 600, easing: easing.leave },
    /** Returning users skip the splash: a fade from the native splash into Today. */
    returning: { duration: 400, easing: easing.utility },
    /** Reduce Motion: the finished mark, held, then a crossfade. */
    reduced: { hold: 500, duration: 250, easing: easing.utility },
  },
  /** 2. Today's first paint: one settle arrival, 70 ms between items. */
  todayArrival: {
    ...timing.settle,
    stagger,
    rise: distances.arrive,
    order: ['greeting', 'weekSlat', 'startButton', 'family'] as const,
  },
  /** 3. Starting the timer: the door closes. */
  doorCloses: {
    /** The button's frame grows into the full screen. */
    morph: springs.morph,
    /** The background eases from birch to char. */
    room: { duration: 800, easing: easing.settle },
    /** The heat glow rises from the bottom edge. */
    glowRise: { duration: 1400, easing: easing.settle },
  },
  /** 4. Finishing a session. */
  finishCool: {
    /** The glow cools toward lake. */
    glow: { duration: 700, easing: easing.leave },
    /** The room lightens back to birch as the log sheet comes up: an even ease, so it keeps pace with the sheet. */
    room: { duration: 800, easing: easing.leave },
  },
  /** 5. Saving a session: the next ember dot ignites. */
  checkInIgnite: { ...timing.ember, fromScale: 0.2 },
  /** 5. The whole family's week is kept: the slat fills, sparks, a line of copy. */
  weekKept: {
    /** After a save, the dot lands first; then this beat, then the fill (src/state/checkIn.ts). */
    hold: 180,
    fill: { duration: 700, easing: easing.settle },
    sparks: { count: 10, duration: 900, easing: easing.burst, distance: [28, 56] as const },
    /** "Week kept, together" appears after the sparks start. */
    lineDelay: 500,
    line: timing.settle,
  },
  /** 6. Streak milestone: the wall builds, one slat every 50 ms. */
  milestoneWall: {
    perSlat: 50,
    slat: springs.slat,
    drop: distances.slatDrop,
    number: timing.ember,
  },
  /** Plus: picking a wood crossfades the slats one at a time from the left. */
  plusWoodCrossfade: { duration: 400, easing: easing.settle, perSlat: 40 },
  /** "Throw löyly": a quick burst of wisps from the bottom. */
  loylyBurst: {
    duration: 1600,
    easing: easing.burst,
    count: 5,
    stagger: 90,
    /** Share of the duration spent drawing, and fading in. */
    drawShare: 0.45,
    fadeInShare: 0.2,
    /** How far the wisps rise, as a share of the screen height. */
    rise: 0.3,
  },
  /**
   * A sheet (the log form): it rises on the morph spring and leaves on a quick
   * ease. Its scrim fades with it.
   */
  sheet: {
    open: springs.morph,
    close: { duration: 320, easing: easing.leave },
    scrim: { duration: 400, easing: easing.settle },
    /** How far a drag on the handle has to go before letting go closes it. */
    dismissDrag: 120,
  },
  /** The timer room's own panels and dialogs: a short rise and fade. */
  roomPanel: { duration: 360, easing: easing.settle, rise: 24 },
  /** The splash's wisps start one after another. */
  wispStagger: 90,
  /** Tabs, stack pushes, small state changes. */
  utility: timing.utility,
} as const;

/**
 * Where an overshoot curve peaks, as a fraction of its duration. A haptic that
 * belongs to an overshoot fires here: on the frame the motion arrives, not when
 * it starts (Quality bar, Haptics match the motion).
 */
export function peakFraction(name: CurveName): number {
  const [x1, y1, x2, y2] = curves[name];
  const at = (p1: number, p2: number, s: number) => 3 * (1 - s) * (1 - s) * s * p1 + 3 * (1 - s) * s * s * p2 + s * s * s;
  let best = 1;
  let bestY = -Infinity;
  for (let i = 0; i <= 400; i++) {
    const s = i / 400;
    const y = at(y1, y2, s);
    if (y > bestY + 1e-9) {
      bestY = y;
      best = at(x1, x2, s);
    }
  }
  return best;
}

/**
 * Ms until a spring that starts at rest first reaches its target: the frame a
 * dropped slat touches the wall, before the small settle. Underdamped springs
 * only (all of ours are); others return their settle estimate.
 */
export function springTouchdownMs(config: { damping: number; stiffness: number; mass: number }): number {
  const w0 = Math.sqrt(config.stiffness / config.mass);
  const zeta = config.damping / (2 * Math.sqrt(config.stiffness * config.mass));
  if (zeta >= 1) {
    // Critically or overdamped (springs.morph): it never crosses its target, so
    // "touchdown" is when it's within 1% of it. Stepped numerically; the old
    // 4 / (zeta * w0) estimate came in at about half the real time.
    let x = 0;
    let v = 0;
    const dt = 1 / 1000;
    for (let i = 1; i <= 5000; i++) {
      const a = (config.stiffness * (1 - x) - config.damping * v) / config.mass;
      v += a * dt;
      x += v * dt;
      if (x >= 0.99) return i;
    }
    return 5000;
  }
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return Math.round(((Math.PI - Math.atan(wd / (zeta * w0))) / wd) * 1000);
}

/** Ms into an ember move when it peaks: when its success haptic fires. */
export const emberPeakMs = Math.round(durations.ember * peakFraction('ember'));

/**
 * Arro's old names, for React Native's Animated in screens that haven't been
 * rebuilt yet. Mapped onto settle, ember and utility. Don't use in new code.
 */
export const motion = {
  /** @deprecated use timing.settle with Reanimated */
  statement: { duration: durations.settle, easing: RNEasing.bezier(...curves.settle) },
  /** @deprecated use timing.ember with Reanimated */
  signature: { duration: durations.ember, easing: RNEasing.bezier(...curves.ember) },
  /** @deprecated use timing.utility with Reanimated */
  utility: { duration: durations.utility, easing: RNEasing.bezier(...curves.utility) },
} as const;

let cached: boolean | null = null;

/** The last known Reduce Motion setting (null before the first probe answers). */
export function reduceMotionNow(): boolean | null {
  return cached;
}

/**
 * Reduce Motion, kept live: turning it on in Settings changes the app without
 * a relaunch. Null until the first probe answers, so a caller can hold its
 * animation instead of flashing the finished state first.
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
      .catch(() => {
        if (mounted) setValue(false);
      });
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

/** Probe Reduce Motion once, for code that runs before any component (the splash gate). */
export async function probeReduceMotion(): Promise<boolean> {
  try {
    cached = await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    cached = false;
  }
  return cached;
}
