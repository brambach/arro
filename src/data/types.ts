import { MemberId } from '../theme/tokens';

export type { MemberId };

/**
 * A photo source. Use a URL string, or a bundled local image via
 * `require('../../assets/mum.jpg')` (which resolves to a number). null → the
 * colored-initials placeholder is shown.
 */
export type PhotoSource = string | number | null;

/** kept = ran today · still = still has today · missed = broke chain · freeze = rest-day freeze */
export type DayState = 'kept' | 'still' | 'missed' | 'freeze';

/** Avatar ring/badge state (Spec §4). */
export type AvatarState = 'kept' | 'today' | 'missed' | 'freeze';

export interface Member {
  id: MemberId;
  name: string;
  color: string;
  soft: string;
  streak: number;
  /** Whether they've kept today or still have it. */
  today: 'kept' | 'still';
  location?: string;
  /** Real photo (URL or bundled require()); null → colored initials placeholder. */
  photoUri?: PhotoSource;
}

export interface KeptRun {
  memberId: MemberId;
  day: number;
  meta: string; // e.g. "3.2 mi sunrise run · Brisbane"
}

export interface Reaction {
  emoji: string;
  count: number;
}

export interface FeedItem {
  id: string;
  memberId: MemberId;
  day: number;
  detail: string;
  time?: string; // "2h" — omit for the freshest item
  keptBadge?: boolean; // green check instead of a timestamp
  note?: string; // "Darcey & Whit cheered"
  reactions: Reaction[];
}

export type WeekDayState = 'kept' | 'freeze' | 'today' | 'future' | 'missed';

export interface WeekDay {
  label: string; // M T W T F S S
  state: WeekDayState;
}

export interface MilestoneData {
  memberId: MemberId;
  day: number;
  title: string; // "Bryce kept\n30 days"
  subtitle: string; // "One month running in Brisbane 🌅"
  quote: string;
  dateLine: string; // "June 30 · streak still alive"
  cheeredBy: MemberId[];
  photoUri?: PhotoSource;
}

export interface ProfileBadge {
  day: number;
  label: string;
  reached: boolean;
  toGo?: number;
}

export interface RecentRun {
  title: string;
  meta: string; // "Today · 3.2 mi"
  day: number;
  tint: readonly [string, string]; // gradient for the icon tile
}
