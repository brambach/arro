/**
 * The Saunafam data model, as the app holds it. These mirror the server
 * (docs/saunafam/API.md) in camelCase; backend.ts maps rows to them and nothing
 * else talks to Supabase. The view models the screens read are in
 * src/state/buildView.ts.
 */

/** A family member's id (members.id on the server, or a preview id such as "sam"). */
export type MemberId = string;

/**
 * A photo source. A URL string, or a bundled local image via
 * `require('../../assets/x.jpg')`. null means the solid-color initial avatar.
 */
export type PhotoSource = string | number | null;

// ─── Saunas ──────────────────────────────────────────────────────────────────

export type SaunaType = 'traditional' | 'wood_fired' | 'infrared' | 'steam' | 'smoke' | 'banya' | 'other';

/** How a session was logged: from the timer, or the form with no timer. */
export type SessionSource = 'timer' | 'manual';

export type TemperatureUnit = 'C' | 'F';

/** One row of `sessions`. A shared session is several rows with the same `sharedId`. */
export interface Session {
  id: string;
  memberId: MemberId;
  /** The anchor's id on every row of a shared session (the anchor included); null when solo. */
  sharedId: string | null;
  /** Who logged it. Equals memberId on solo and anchor rows; null if the logger was removed. */
  loggedBy: MemberId | null;
  /** ISO time. */
  startedAt: string;
  /** "2026-10-19", in the member's own time zone. */
  localDate: string;
  /** Heat minutes only, 1 to 240. */
  durationMinutes: number;
  rounds: number;
  saunaType: SaunaType;
  tempC: number | null;
  humidityPct: number | null;
  coldPlunge: boolean;
  coldMinutes: number | null;
  place: string | null;
  note: string | null;
  photoPath: string | null;
  /** A signed link to the photo, or a local file while the upload is pending. */
  photoUrl: string | null;
  source: SessionSource;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  /** Made on this phone and still in the outbox: shown as yours, not on the server yet. */
  pending?: boolean;
}

export interface SessionCheer {
  id: string;
  /** Always an anchor or solo row id. */
  sessionId: string;
  memberId: MemberId;
  createdAt: string;
  /** Shown before the server has it (an optimistic cheer). */
  pending?: boolean;
}

export interface SessionComment {
  id: string;
  sessionId: string;
  memberId: MemberId;
  body: string;
  createdAt: string;
  pending?: boolean;
}

// ─── Families and members ────────────────────────────────────────────────────

/** 1 = Monday (default), 7 = Sunday. ISO weekday numbers. */
export type WeekStartsOn = 1 | 7;

export type WallWood = 'birch' | 'cedar' | 'alder' | 'charred_pine';

export interface FamilyMember {
  id: MemberId;
  userId: string;
  name: string;
  /** members.colour, rendered as stored. */
  color: string;
  photoPath: string | null;
  photoUrl: string | null;
  timezone: string;
  joinedAt: string;
  joinedOn: string;
  weekendCheckin: boolean;
}

/** One row of `family_rules`: the rhythm from a week on. */
export interface FamilyRule {
  effectiveFrom: string;
  goalPerWeek: number;
  minMinutes: number;
}

/** A member's break: their local dates, both inclusive. */
export interface Pause {
  memberId: MemberId;
  startsOn: string;
  endsOn: string;
}

// ─── Weeks and streaks ───────────────────────────────────────────────────────

/** A member's week, as the server works it out (spec, "Weekly streak rules"). */
export type MemberWeekStatus = 'kept' | 'pending' | 'joined' | 'paused' | 'frozen' | 'missed';

/** In the history, someone else's frozen or missed week reads not_kept. */
export type HistoryStatus = MemberWeekStatus | 'not_kept';

export type FamilyWeekState = 'counted' | 'broken' | 'pending' | 'skip';

/** One row of member_week_streaks: a member's current week. */
export interface MemberWeek {
  memberId: MemberId;
  localToday: string;
  weekStart: string;
  countedDays: number;
  countedDates: string[];
  goal: number;
  minMinutes: number;
  personalStreak: number;
  longestPersonalStreak: number;
  keptThisWeek: boolean;
  lastWeekStatus: MemberWeekStatus | null;
  freezeAvailable: boolean;
  freezeBackOn: string | null;
  /** The last day of the break they're on today. */
  pausedUntil: string | null;
}

/** family_week_streak: the family's numbers. */
export interface FamilyWeekSummary {
  familyStreak: number;
  longestStreak: number;
  weeksTogetherThisYear: number;
  startedOn: string | null;
  latestWeekState: FamilyWeekState | null;
}

/** One row of family_week_history: one member in one past week. */
export interface PastWeekRow {
  weekStart: string;
  familyState: FamilyWeekState | null;
  freezeUsed: boolean;
  memberId: MemberId;
  status: HistoryStatus;
  countedDays: number;
  goal: number;
  days: string[];
}

/** my_session_stats: the numbers on Me. */
export interface SessionStats {
  sessionsThisMonth: number;
  minutesThisYear: number;
  favoriteSaunaType: SaunaType | null;
  favoritePlace: string | null;
}

// ─── App config and Plus ─────────────────────────────────────────────────────

export interface AppConfig {
  /** If the app's own build number is lower, show the update screen. */
  minIosBuild: number;
  /** While false, nothing about Plus appears anywhere. */
  plusEnabled: boolean;
}

export type PlusProduct = 'saunafam.plus.annual' | 'saunafam.plus.lifetime';
export type PlusPlanStatus = 'trial' | 'active' | 'grace_period' | 'billing_issue' | 'cancelled' | 'expired';

/** family_plus: what the family has. The app never decides Plus from local purchase state. */
export interface PlusStatus {
  active: boolean;
  product: PlusProduct | null;
  status: PlusPlanStatus | null;
  expiresAt: string | null;
  payerName: string | null;
  payerIsMe: boolean;
  /** The wood to draw: the family's pick while Plus is active, else birch. */
  wallWood: WallWood;
}

// ─── The cached family ───────────────────────────────────────────────────────

/**
 * Everything one refresh brings back, cached on the phone under arro.family.v2
 * so screens open from it. The preview family is one of these too.
 */
export interface FamilySnapshot {
  id: string;
  name: string;
  joinCode: string;
  weekStartsOn: WeekStartsOn;
  /** The rhythm going forward. This week's goal is in memberWeeks. */
  goalPerWeek: number;
  minMinutes: number;
  saunafamStartedOn: string;
  members: FamilyMember[];
  rules: FamilyRule[];
  /** This week and last week across the family, newest first. */
  sessions: Session[];
  /** Your own last few sessions, for Me, even when older than last week. */
  myRecent: Session[];
  cheers: SessionCheer[];
  comments: SessionComment[];
  pauses: Pause[];
  week: FamilyWeekSummary;
  memberWeeks: Record<MemberId, MemberWeek>;
  /** Up to 12 past weeks (more with Plus), newest first. */
  history: PastWeekRow[];
  stats: SessionStats;
  plus: PlusStatus;
  /** The family's most recent places, newest first, for the place chips. */
  recentPlaces: string[];
  /** When this came from the server (ISO). */
  fetchedAt: string;
}

// ─── Legacy display types ────────────────────────────────────────────────────
// The Arro components that are still in src/components (AvatarRing, AvatarStack,
// WorkoutCard, DayPill) read these. They go when M6 to M10 replace those
// components; nothing new should use FeedItem or WeekState.

/** Who to draw: enough for an avatar. buildView's MemberView satisfies it. */
export interface Member {
  id: MemberId;
  name: string;
  color: string;
  photoUri?: PhotoSource;
}

/** @deprecated Arro's feed card. Use buildView's FeedCard. */
export interface FeedItem {
  id: string;
  memberId: MemberId;
  kind: 'kept' | 'still';
  title: string;
  meta: string;
  time?: string;
  cheer?: string;
  hearts?: number;
  photoUri?: PhotoSource;
}

/** @deprecated Arro's day dot. */
export type WeekState = 'kept' | 'freeze' | 'today' | 'missed';
