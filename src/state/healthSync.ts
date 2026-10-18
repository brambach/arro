/**
 * Apple Health workouts -> Health workouts on the server. This file doesn't know
 * which HealthKit module reads them: the module's adapter hands it plain
 * HealthWorkout values, keyed by HKWorkoutActivityType case names.
 *
 * Only today and yesterday go to the server (migration 20261005000006). Older
 * workouts are skipped quietly: no backdating and no import of older history.
 *
 * Several apps can save the same workout to Health: a Whoop strap auto-detects
 * the run an Apple Watch or Strava also recorded. Overlapping workouts count once,
 * keeping the best copy (a route, then the app that recorded it on purpose, then
 * the longer one). Very short ones, usually a strap guessing, are left out.
 */
import { WorkoutType } from '../data/types';
import {
  deleteWorkout,
  fillHealthWorkoutDetails,
  insertHealthWorkout,
  replaceHealthWorkout,
  SavedHealthWorkout,
  WorkoutDateError,
} from './backend';
import { addDays, dayKey, yesterdayOpen } from './dates';
import { encodePolyline, LatLng, shareableRoute } from './routes';

export interface HealthWorkout {
  /** HealthKit's workout UUID, the server's dedupe key. */
  uuid: string;
  /** HKWorkoutActivityType case name, such as "running" or "traditionalStrengthTraining". */
  activityType: string;
  start: Date;
  /** When it ended. Older callers may leave it out; start + duration stands in. */
  end?: Date;
  durationSeconds: number;
  /** The recording app's bundle id, such as "com.whoop.iphone". */
  sourceId?: string;
  /** The recording app or device as Health names it, such as "WHOOP". */
  sourceName?: string;
  /** Total distance in metres, when Health recorded one. */
  distanceMeters?: number;
  /** The raw GPS track, when Health recorded one. Trimmed and thinned before it's sent. */
  route?: LatLng[];
}

export interface HealthSyncResult {
  added: number;
  alreadySynced: number;
  /** Already saved, and this sync added its distance or route. */
  updated: number;
  /** Older than yesterday, or yesterday after the server stopped taking it. */
  skipped: number;
  /** The workouts this sync added, so Arro can say so. */
  addedWorkouts: { id: string; type: WorkoutType; sourceName?: string }[];
  /** Saved rows swapped for a better copy of the same workout. */
  replaced: number;
  /** Saved rows taken off: a duplicate, or gone from Health. */
  removed: number;
}

/** Shorter than this is usually a strap guessing, not a workout. */
export const MIN_HEALTH_SECONDS = 5 * 60;

/**
 * Lower is better when two apps recorded the same workout. Apple's own Workout
 * app and the watch first, then apps you start on purpose, then anything else,
 * then straps that detect workouts on their own.
 */
export function sourceRank(sourceId: string | undefined): number {
  const id = (sourceId ?? '').toLowerCase();
  if (id.startsWith('com.apple.')) return 0;
  if (/strava|garmin|nike|runkeeper|peloton|zwift|wahoo|polar|suunto|coros|fitbod|ladder|hevy/.test(id)) return 1;
  if (/whoop|oura|ultrahuman|fitbit/.test(id)) return 3;
  return 2;
}

function endOf(w: HealthWorkout): number {
  return (w.end ?? new Date(w.start.getTime() + w.durationSeconds * 1000)).getTime();
}

/** True when two spans share at least half of the shorter one. */
function overlapping(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  const shared = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  const shorter = Math.min(aEnd - aStart, bEnd - bStart);
  return shared > 0 && shared >= shorter / 2;
}

function better(a: HealthWorkout, b: HealthWorkout): HealthWorkout {
  if (!!a.route !== !!b.route) return a.route ? a : b;
  const ra = sourceRank(a.sourceId);
  const rb = sourceRank(b.sourceId);
  if (ra !== rb) return ra < rb ? a : b;
  return a.durationSeconds >= b.durationSeconds ? a : b;
}

/** One workout per stretch of time: overlapping copies collapse into the best one. */
export function distinctHealthWorkouts(workouts: HealthWorkout[]): HealthWorkout[] {
  const sorted = [...workouts].sort((a, b) => a.start.getTime() - b.start.getTime());
  const kept: HealthWorkout[] = [];
  for (const w of sorted) {
    const i = kept.findIndex((k) => overlapping(k.start.getTime(), endOf(k), w.start.getTime(), endOf(w)));
    if (i === -1) kept.push(w);
    else kept[i] = better(kept[i], w);
  }
  return kept;
}

export interface HealthSyncPlan {
  insert: HealthWorkout[];
  /** Already saved under this UUID: fill in a route or distance that arrived later. */
  fill: HealthWorkout[];
  /** A saved row that is the same workout as a better copy: point it at that copy. */
  replace: { rowId: string; with: HealthWorkout }[];
  /** Saved rows to take off. */
  remove: string[];
  skipped: number;
}

/**
 * What a sync should do, before any network call. `saved` is this member's Health
 * rows for the days the server still takes.
 *
 * Removing a row can take back a day the family already counted, so it's narrow:
 * only rows dated today, never yesterday's. A duplicate of a workout Health still
 * has is safe to remove. A row whose workout is gone from Health is only removed
 * when `canRemove` (Arro is open, so Health could be read in full: a locked phone
 * can't read it) and the read found something: with Health access turned off,
 * HealthKit returns an empty list rather than an error.
 *
 * The five-minute minimum only stops new rows. A saved row is never removed for
 * being short (build 6 had no minimum).
 */
export function planHealthSync(
  workouts: HealthWorkout[],
  saved: SavedHealthWorkout[],
  now: Date,
  options: { dismissed?: ReadonlySet<string>; canRemove?: boolean } = {},
): HealthSyncPlan {
  const today = dayKey(now);
  const inHealth = new Set(workouts.map((w) => w.uuid));
  const candidates = workouts.filter((w) => !options.dismissed?.has(w.uuid));
  const sendable = sendableHealthWorkouts(candidates, now);
  const keep = distinctHealthWorkouts(sendable);
  const plan: HealthSyncPlan = { insert: [], fill: [], replace: [], remove: [], skipped: workouts.length - keep.length };

  const byUuid = new Map(saved.map((r) => [r.healthWorkoutId, r]));
  const used = new Set<string>();
  for (const w of keep) {
    const row = byUuid.get(w.uuid);
    if (row) {
      used.add(row.id);
      plan.fill.push(w);
    }
  }
  for (const w of keep) {
    if (byUuid.has(w.uuid)) continue;
    // A saved copy of the same workout, from another app: point it at this one.
    const twin = saved.find(
      (r) =>
        !used.has(r.id) &&
        !keep.some((k) => k.uuid === r.healthWorkoutId) &&
        r.startedAt &&
        overlapping(
          new Date(r.startedAt).getTime(),
          new Date(r.startedAt).getTime() + (r.minutes ?? 1) * 60_000,
          w.start.getTime(),
          endOf(w),
        ),
    );
    if (twin) {
      used.add(twin.id);
      plan.replace.push({ rowId: twin.id, with: w });
    } else if (w.durationSeconds >= MIN_HEALTH_SECONDS) {
      plan.insert.push(w);
    } else {
      plan.skipped += 1;
    }
  }
  for (const r of saved) {
    if (used.has(r.id) || r.localDate < today) continue;
    // A duplicate or dismissed: Health still has it, so this read was complete.
    if (inHealth.has(r.healthWorkoutId)) plan.remove.push(r.id);
    else if (options.canRemove && workouts.length > 0) plan.remove.push(r.id);
  }
  return plan;
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
  wheelchairRunPace: 'run',
  wheelchairWalkPace: 'walk',
  mixedMetabolicCardioTraining: 'gym',
  jumpRope: 'gym',
  boxing: 'gym',
  kickboxing: 'gym',
  martialArts: 'gym',
  cooldown: 'yoga',
  preparationAndRecovery: 'yoga',
  taiChi: 'yoga',
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

/** Start time, whole metres and the shareable route for the server, when Health has them. */
export function healthDetails(w: HealthWorkout): { startedAt: string; distanceMeters?: number; route?: string } {
  const route = w.route ? shareableRoute(w.route) : null;
  const meters = w.distanceMeters ? Math.round(w.distanceMeters) : undefined;
  return {
    startedAt: w.start.toISOString(),
    distanceMeters: meters && meters <= 1_000_000 ? meters : undefined,
    route: route ? encodePolyline(route) : undefined,
  };
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

/** The source name stored with a workout, trimmed to what the server takes. */
function sourceApp(w: HealthWorkout): string | undefined {
  const name = w.sourceName?.trim();
  return name ? name.slice(0, 60) : undefined;
}

/**
 * Saves today's and yesterday's Health workouts for this member, one per workout
 * however many apps recorded it, and tidies rows that are duplicates or gone.
 * Safe to run as often as Health reports changes: the server keeps one row per Health UUID.
 */
export async function syncHealthWorkouts(
  memberId: string,
  workouts: HealthWorkout[],
  saved: SavedHealthWorkout[],
  now: Date = new Date(),
  options: { dismissed?: ReadonlySet<string>; canRemove?: boolean } = {},
): Promise<HealthSyncResult> {
  const plan = planHealthSync(workouts, saved, now, options);
  const result: HealthSyncResult = {
    added: 0,
    alreadySynced: 0,
    updated: 0,
    skipped: plan.skipped,
    addedWorkouts: [],
    replaced: 0,
    removed: 0,
  };
  for (const w of plan.fill) {
    result.alreadySynced += 1;
    // Saved before its route arrived, or before Arro read routes: fill in what's new.
    const details = healthDetails(w);
    if (details.route || details.distanceMeters) {
      if (await fillHealthWorkoutDetails(memberId, w.uuid, details)) result.updated += 1;
    }
  }
  for (const { rowId, with: w } of plan.replace) {
    try {
      await replaceHealthWorkout(rowId, {
        healthWorkoutId: w.uuid,
        type: workoutTypeFor(w.activityType),
        minutes: healthMinutes(w),
        sourceApp: sourceApp(w),
        ...healthDetails(w),
      });
      result.replaced += 1;
    } catch (e) {
      if (e instanceof WorkoutDateError) result.skipped += 1;
      else throw e;
    }
  }
  for (const w of plan.insert) {
    try {
      const type = workoutTypeFor(w.activityType);
      const row = await insertHealthWorkout(memberId, {
        healthWorkoutId: w.uuid,
        localDate: healthLocalDate(w),
        type,
        minutes: healthMinutes(w),
        sourceApp: sourceApp(w),
        ...healthDetails(w),
      });
      if (row.outcome === 'added') {
        result.added += 1;
        result.addedWorkouts.push({ id: row.id, type, sourceName: sourceApp(w) });
      } else {
        result.alreadySynced += 1;
      }
    } catch (e) {
      // The day closed between the check above and the insert. Skip it quietly.
      if (e instanceof WorkoutDateError) result.skipped += 1;
      else throw e;
    }
  }
  for (const id of plan.remove) {
    await deleteWorkout(id);
    result.removed += 1;
  }
  return result;
}
