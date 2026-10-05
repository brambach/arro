/**
 * Apple Health through @appeeky/expo-healthkit. Read-only: Arro asks for
 * workouts and nothing else, and never writes to Health.
 *
 * The module's native side only exists in the dev build. Expo Go and the web
 * preview don't have it, and importing the module there would throw, so it's
 * loaded only when its native module is present. Everywhere else Health is
 * simply unavailable and "I moved today" carries on as before.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type * as HealthKitModule from '@appeeky/expo-healthkit';
import { addDays, dayKey, fromKey } from './dates';
import { HealthWorkout } from './healthSync';

type HealthKit = typeof HealthKitModule;

let loaded: HealthKit | null | undefined;

function healthKit(): HealthKit | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoHealthKit')) {
    try {
      loaded = require('@appeeky/expo-healthkit') as HealthKit;
      if (!loaded.isAvailable()) loaded = null;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

/** True on an iPhone dev build with HealthKit. False in Expo Go, on the web and on iPad without Health. */
export function healthAvailable(): boolean {
  return healthKit() !== null;
}

/** HKWorkoutActivityType raw value -> case name, such as 37 -> "running". */
let activityNames: Map<number, string> | null = null;

function activityName(hk: HealthKit, raw: number): string {
  if (!activityNames) {
    activityNames = new Map(Object.entries(hk.WorkoutActivityType).map(([name, value]) => [value as number, name]));
  }
  return activityNames.get(raw) ?? 'other';
}

/**
 * Starts watching Health for new workouts, so iOS wakes Arro when one is saved,
 * even with the app closed. Safe to call on every launch.
 */
export async function watchHealthWorkouts(): Promise<void> {
  const hk = healthKit();
  if (!hk) return;
  await hk.observe([hk.WorkoutType.workout]);
  await hk.enableBackgroundDelivery(hk.WorkoutType.workout, hk.UpdateFrequency.immediate);
}

/**
 * Shows Apple's Health sheet for reading workouts, then starts watching.
 * iOS never says whether reading was allowed: a "no" just means no workouts come back.
 * False when Health isn't available here.
 */
export async function connectHealth(): Promise<boolean> {
  const hk = healthKit();
  if (!hk) return false;
  await hk.requestAuthorization({ toRead: [hk.WorkoutType.workout] });
  await watchHealthWorkouts();
  return true;
}

/** Workouts that started from local midnight yesterday until now: all the server will take. */
export async function readRecentHealthWorkouts(now: Date = new Date()): Promise<HealthWorkout[]> {
  const hk = healthKit();
  if (!hk) return [];
  const from = fromKey(addDays(dayKey(now), -1));
  from.setHours(0, 0, 0, 0);
  const samples = await hk.queryWorkouts({ from, to: now, excludeSources: ['self'] });
  return samples.map((s) => ({
    uuid: s.uuid,
    activityType: activityName(hk, s.workoutActivityType),
    start: s.startDate,
    durationSeconds: s.duration,
  }));
}

/**
 * Calls back when Health has new workouts, including when iOS relaunches Arro in
 * the background. The returned promise holds iOS's ~30 s of background time.
 */
export function onHealthWorkoutsChanged(listener: () => Promise<void>): { remove(): void } {
  const hk = healthKit();
  if (!hk) return { remove() {} };
  return hk.addUpdateListener(async ({ type }) => {
    if (type === hk.WorkoutType.workout) await listener();
  });
}
