import type { LatLng } from '../state/routes';

/** A family member's id. Any string; colours come from the join-order palette in tokens.ts. */
export type MemberId = string;

/** Any workout counts. A walk and a marathon count the same. */
export type WorkoutType = 'walk' | 'run' | 'gym' | 'yoga' | 'swim' | 'ride' | 'other';

/** Where a workout came from: Apple Health, or a manual "I moved today" check-in. */
export type WorkoutSource = 'health' | 'manual';

/**
 * A photo source. Use a URL string, or a bundled local image via
 * `require('../../assets/mum.jpg')`. null → the solid-color initial avatar.
 */
export type PhotoSource = string | number | null;

export type DayStatus = 'kept' | 'still';

/** How a person logs: Apple Health (automatic) or the manual "I moved today" check-in. */
export type MoveMethod = 'manual' | 'health';

/** When a person usually moves. Sets their reminder and the "usually evenings" line. */
export type ReminderSlot = 'morning' | 'lunch' | 'evening';

export interface Member {
  id: MemberId;
  name: string;
  color: string;
  streak: number;
  today: DayStatus; // kept it today, or still has today
  meta: string; // one-line status for the Today list
  location?: string;
  relationship?: string; // "You", "Sister", "Brother"
  photoUri?: PhotoSource;
  /** Invited but hasn't joined yet. Doesn't count towards "x of y kept it today". */
  invited?: boolean;
}

export interface FeedItem {
  id: string;
  memberId: MemberId;
  kind: 'kept' | 'still';
  title: string; // "Bryce kept Day 24" / "Darcey still has today"
  meta: string;
  time?: string; // "6:21 AM"
  cheer?: string; // a cheer line, or nudge prompt
  hearts?: number; // heart count (kept posts)
  workoutId?: string; // opens the workout detail (kept posts)
  photoUri?: PhotoSource; // the workout's photo, shown under the post
  route?: LatLng[]; // the workout's route, drawn small under the post
}

export type WeekState = 'kept' | 'freeze' | 'today' | 'missed';

/** One dot in the compact 7-day strip. */
export interface WeekStripDay {
  label: string; // M T W T F S S
  state: WeekState;
}

/** One row in the day-by-day list. */
export interface WeekRow {
  dow: string; // Mon
  date: string; // 24
  state: WeekState;
  avatars: MemberId[];
  badge?: string; // "Freeze day" | "Today"
}

export interface MilestoneData {
  memberId: MemberId;
  day: number;
  title: string; // "Bryce kept\n30 days"
  subtitle: string; // "A month of showing up, from Brisbane."
  motto: string; // "Every day forward, together."
  dateLine: string; // "June 30 · streak still alive"
  cheeredBy: MemberId[];
  photoUri?: PhotoSource;
}

export interface ProfileStat {
  label: string;
  value: string;
  unit?: string;
}

/** One row in a recent-workouts list. */
export interface RecentWorkout {
  id: string;
  memberId: MemberId;
  type: WorkoutType;
  source: WorkoutSource;
  when: string; // "Today · 6:21 AM"
  duration?: string; // "32 min" (optional: a check-in can skip it)
  distance?: string; // "5.4 km" (Health workouts that recorded one)
  place?: string; // "Brisbane"
}

export interface WorkoutDetail extends RecentWorkout {
  note?: string;
  photoUri?: PhotoSource;
  cheeredBy: MemberId[];
  /** Only for Health workouts that recorded one, already trimmed at both ends. */
  route?: LatLng[];
  /** The photo's path on the server, so its owner can replace or remove it. */
  photoPath?: string;
}

