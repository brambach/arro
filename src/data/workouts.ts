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

/** "Run · 5.4 km · 32 min", "Run · 32 min", or just "Yoga" when there's nothing else. */
export function workoutSummary(w: { type: WorkoutType; duration?: string; distance?: string }): string {
  return [workoutTypeLabels[w.type], w.distance, w.duration].filter(Boolean).join(' · ');
}

/** Places that measure distance in miles. Everywhere else gets kilometres. */
const MILES_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

function usesMiles(): boolean {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split(/[-_]/).find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part));
    return !!region && MILES_REGIONS.has(region);
  } catch {
    return false;
  }
}

/** "5.4 km", "850 m", or "3.4 mi" where the phone is set to a miles country. Undefined for no distance. */
export function distanceLabel(meters?: number, miles: boolean = usesMiles()): string | undefined {
  if (!meters || meters < 50) return undefined;
  if (miles) {
    const mi = meters / 1609.344;
    return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** "Darcey", "Darcey and Whit", "Darcey, Whit and Mum". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
