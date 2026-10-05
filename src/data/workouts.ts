import { WorkoutSource, WorkoutType } from './types';

export const workoutTypeLabels: Record<WorkoutType, string> = {
  walk: 'Walk',
  run: 'Run',
  gym: 'Gym',
  yoga: 'Yoga',
  swim: 'Swim',
  ride: 'Ride',
  other: 'Workout',
};

export const workoutSourceLabels: Record<WorkoutSource, string> = {
  health: 'Apple Health',
  manual: 'Checked in',
};

/** "Run · 32 min" or just "Yoga" when there's no duration. */
export function workoutSummary(w: { type: WorkoutType; duration?: string }): string {
  const label = workoutTypeLabels[w.type];
  return w.duration ? `${label} · ${w.duration}` : label;
}

/** "Darcey", "Darcey and Whit", "Darcey, Whit and Mum". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
