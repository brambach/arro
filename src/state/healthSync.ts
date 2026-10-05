/**
 * Apple Health workouts -> Health workouts on the server. This file doesn't know
 * which HealthKit module reads them: the module's adapter hands it plain
 * HealthWorkout values, keyed by HKWorkoutActivityType case names.
 *
 * Only today and yesterday go to the server (migration 20261005000006). Older
 * workouts are skipped quietly: no backdating and no import of older history.
 */
import { WorkoutType } from '../data/types';
import { insertHealthWorkout, WorkoutDateError } from './backend';
import { addDays, dayKey, yesterdayOpen } from './dates';

export interface HealthWorkout {
  /** HealthKit's workout UUID, the server's dedupe key. */
  uuid: string;
  /** HKWorkoutActivityType case name, such as "running" or "traditionalStrengthTraining". */
  activityType: string;
  start: Date;
  durationSeconds: number;
}

export interface HealthSyncResult {
  added: number;
  alreadySynced: number;
  /** Older than yesterday, or yesterday after the server stopped taking it. */
  skipped: number;
}

const TYPE_FOR_ACTIVITY: Record<string, WorkoutType> = {
  walking: 'walk',
  hiking: 'walk',
  running: 'run',
  trackAndField: 'run',
  traditionalStrengthTraining: 'gym',
  functionalStrengthTraining: 'gym',
  coreTraining: 'gym',
  highIntensityIntervalTraining: 'gym',
  crossTraining: 'gym',
  elliptical: 'gym',
  rowing: 'gym',
  stairClimbing: 'gym',
  stairs: 'gym',
  stepTraining: 'gym',
  mixedCardio: 'gym',
  yoga: 'yoga',
  pilates: 'yoga',
  mindAndBody: 'yoga',
  flexibility: 'yoga',
  barre: 'yoga',
  swimming: 'swim',
  waterFitness: 'swim',
  cycling: 'ride',
  handCycling: 'ride',
};

export function workoutTypeFor(activityType: string): WorkoutType {
  return TYPE_FOR_ACTIVITY[activityType] ?? 'other';
}

/** The day a Health workout counts for: the local day it started, like the Health app shows it. */
export function healthLocalDate(w: HealthWorkout): string {
  return dayKey(w.start);
}

/** Whole minutes for duration_minutes (1 to 1440), or undefined for a zero-length workout. */
export function healthMinutes(w: HealthWorkout): number | undefined {
  const minutes = Math.round(w.durationSeconds / 60);
  if (minutes < 1) return undefined;
  return Math.min(minutes, 1440);
}

/** Which of these workouts the server would take right now, before any network call. */
export function sendableHealthWorkouts(workouts: HealthWorkout[], now: Date = new Date()): HealthWorkout[] {
  const today = dayKey(now);
  const yesterday = addDays(today, -1);
  const takesYesterday = yesterdayOpen(now);
  return workouts.filter((w) => {
    const date = healthLocalDate(w);
    return date === today || (date === yesterday && takesYesterday);
  });
}

/**
 * Saves today's and yesterday's Health workouts for this member. Safe to run as
 * often as Health reports changes: the server keeps one row per Health UUID.
 */
export async function syncHealthWorkouts(
  memberId: string,
  workouts: HealthWorkout[],
  now: Date = new Date(),
): Promise<HealthSyncResult> {
  const sendable = sendableHealthWorkouts(workouts, now);
  const result: HealthSyncResult = { added: 0, alreadySynced: 0, skipped: workouts.length - sendable.length };
  for (const w of sendable) {
    try {
      const outcome = await insertHealthWorkout(memberId, {
        healthWorkoutId: w.uuid,
        localDate: healthLocalDate(w),
        type: workoutTypeFor(w.activityType),
        minutes: healthMinutes(w),
      });
      if (outcome === 'added') result.added += 1;
      else result.alreadySynced += 1;
    } catch (e) {
      // The day closed between the check above and the insert. Skip it quietly.
      if (e instanceof WorkoutDateError) result.skipped += 1;
      else throw e;
    }
  }
  return result;
}
