import { MemberId } from '../theme/tokens';

export type { MemberId };

/**
 * A photo source. Use a URL string, or a bundled local image via
 * `require('../../assets/mum.jpg')`. null → the solid-color initial avatar.
 */
export type PhotoSource = string | number | null;

export type DayStatus = 'kept' | 'still';

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
  subtitle: string; // "One month running in Brisbane."
  motto: string; // "Every day forward, together."
  dateLine: string; // "June 30 · streak still alive"
  cheeredBy: MemberId[];
  photoUri?: PhotoSource;
}

export interface ProfileStat {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
}

export interface RecentRun {
  memberId: MemberId;
  when: string; // "Today · 6:21 AM"
  dist: string; // "3.2 mi"
  place: string; // "Brisbane"
}
