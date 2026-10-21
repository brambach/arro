/**
 * The check-in moment on Today (spec, Key motion moment 5), as plain numbers so
 * it's tested: what a change to your week plays, and when each beat arrives.
 *
 * 1. Your next ember dot ignites (the `ember` overshoot) and your avatar ring
 *    fills; the save haptic fires at the dot's peak.
 * 2. If that session completed the whole family's week: a short hold, then the
 *    slat fills with ember from edge to edge, the week-kept haptic and the spark
 *    burst arrive as it's full, then "Week kept, together" settles in.
 *
 * With Reduce Motion the slat simply turns kept and the line crossfades in.
 */
import { durations, moments } from '../theme/motion';

export interface WeekShown {
  /** Your counted days. */
  filled: number;
  /** The whole family's week is kept. */
  weekKept: boolean;
}

export interface CheckInChange {
  /** A dot newly lit: the ignite and the save haptic. */
  ignite: boolean;
  /** The family's week just became kept: the fill, the sparks and the line. */
  keep: boolean;
}

export function checkInChange(before: WeekShown, after: WeekShown): CheckInChange {
  return { ignite: after.filled > before.filled, keep: after.weekKept && !before.weekKept };
}

/** A beat between the dot landing and the slat starting to fill, so they read as two things. */
export const KEEP_HOLD_MS = moments.weekKept.hold;

/** When each beat starts, in ms from the moment Today shows the new week. */
export function checkInTimeline(change: CheckInChange, reduceMotion: boolean) {
  if (reduceMotion) return { fillAt: 0, fullAt: durations.utility, lineAt: durations.utility };
  const fillAt = change.ignite ? durations.ember + KEEP_HOLD_MS : 0;
  const fullAt = fillAt + moments.weekKept.fill.duration;
  return { fillAt, fullAt, lineAt: fullAt + moments.weekKept.lineDelay };
}
