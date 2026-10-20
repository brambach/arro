/**
 * Turns the cached family (a FamilySnapshot from the server or the preview), the
 * outbox and the optimistic changes into what each screen shows. Pure: no
 * storage, no network, no clock but `now`. Every string a screen shows about
 * weeks, streaks and sessions is made here, so it's tested in one place
 * (src/state/__tests__/buildView.test.ts).
 *
 * Streaks and statuses come from the server (member_week_streaks,
 * family_week_streak, family_week_history). The only thing worked out here is
 * your own week with sessions still in the outbox (weeks.ts,
 * overlayPendingSessions).
 */
import {
  AppConfig,
  FamilySnapshot,
  FamilyWeekState,
  HistoryStatus,
  Member,
  MemberId,
  MemberWeek,
  PastWeekRow,
  Pause,
  PhotoSource,
  SaunaType,
  Session,
  SessionComment,
  TemperatureUnit,
  WallWood,
  WeekStartsOn,
} from '../data/types';
import { paletteColor } from '../data/palette';
import { joinNames, plural, saunaTypeLabels, sessionDetails } from '../data/saunas';
import {
  WEEKDAY_LETTER,
  WEEKDAY_SHORT,
  addDays,
  dateLabel,
  dayKey,
  greetingFor,
  isoWeekday,
  shortDate,
  timeLabel,
  untilLabel,
  weekDays,
  weekStart,
  weekdayIndex,
  weekdayName,
} from './dates';
import { DRAFT_NOTICE, OutboxEntry, SessionDraft, pendingSessions } from './outbox';
import { Milestone, MilestoneMemory, badges, dueMilestone } from './milestones';
import { NagMemory, EMPTY_NAG, nagCardState, nagEligibleFrom, plusRowLabel, plusVisible } from './plus';
import { overlayPendingSessions } from './weeks';
import type { TimerState } from './timer';

// ─── Copy ────────────────────────────────────────────────────────────────────

export const COPY = {
  kept: 'Kept',
  invited: 'Invited',
  keptThisWeek: 'Kept this week',
  logYesterday: 'Log yesterday’s',
  soloStreak: 'Your family streak starts when someone joins',
  inviteSomeone: 'Invite someone',
  backAtItTitle: 'Back at it, together',
  backAtItBody: 'A new streak starts this week. Every session counts toward it.',
  streakRules: 'Streak rules',
  seeEveryWeek: 'See every week',
  printWall: 'Print the wall',
  thisWeek: 'This week',
  lastWeek: 'Last week',
  updateRequired: 'A new version of Saunafam is ready. Update in TestFlight or the App Store.',
  shortSession: (min: number) => `Sessions under ${min} minutes are saved but don’t count toward the week.`,
};

/** Replies one tap away on someone else's session. "Cold plunge hero" only after a plunge. */
export const QUICK_REPLIES_OTHERS = ['Nice heat', 'Jealous', 'Save me a spot'];
export const QUICK_REPLY_PLUNGE = 'Cold plunge hero';
/** On a session you were in. */
export const QUICK_REPLIES_MINE = ['Felt great', 'Needed that'];

// ─── View types ──────────────────────────────────────────────────────────────

/** A person as screens draw them. Satisfies the old components' Member. */
export interface MemberView extends Member {
  photoUri: PhotoSource;
  isMe: boolean;
  invited: boolean;
  joinedOn: string | null;
}

/** What tapping a person on Today or Week does. */
export type PersonTap =
  | { kind: 'nudge'; memberId: MemberId }
  | { kind: 'session'; sessionId: string }
  | { kind: 'invite' }
  | { kind: 'none' };

export interface FamilyRow {
  member: MemberView;
  /** One per session of the goal, filled for each counted day (●●○). */
  dots: boolean[];
  /** "Kept", "2 of 3", "On a break until Friday", "Invited". */
  status: string;
  state: 'kept' | 'progress' | 'break' | 'invited';
  tap: PersonTap;
}

export interface TodayView {
  dateLabel: string;
  greeting: string;
  you: { dots: boolean[]; countedDays: number; goal: number; kept: boolean; label: string };
  /** Only ever names progress: "Maya and Jo have kept this week. Sam’s on 1." */
  familyLine: string | null;
  streak: {
    kind: 'solo' | 'building' | 'broken';
    /** The big number and what it counts: 8 "weeks together", or after a break 7 "weeks together this year". */
    value: number;
    label: string;
    familyStreak: number;
    weeksTogetherThisYear: number;
  };
  /** Solo founder: "Your family streak starts when someone joins", plus an invite. */
  soloInvite: { title: string; action: string } | null;
  /** After a broken streak. Never says who missed. */
  backAtIt: { title: string; body: string } | null;
  /** "Log yesterday’s", or Monday morning's "Did you sauna on Sunday? Log it". */
  forgot: { kind: 'yesterday' | 'lastDay'; label: string; date: string } | null;
  family: FamilyRow[];
  /** "Couldn’t save this one. Tap to fix it", one per refused draft. */
  drafts: { clientId: string; label: string }[];
  /** Sessions still in the outbox. */
  waiting: number;
}

export interface Slat {
  weekStart: string;
  /** solo: before the family streak started (fewer than two people). */
  state: FamilyWeekState | 'solo';
  freezeUsed: boolean;
  current: boolean;
}

export interface DayCell {
  date: string;
  letter: string;
  went: boolean;
  isToday: boolean;
  future: boolean;
}

export interface PastWeekView {
  weekStart: string;
  /** "Week of Oct 5: kept", "Week of Sep 28: kept, a freeze was used" */
  label: string;
  state: FamilyWeekState | null;
  /** Who went and on which days (tap a week). */
  members: { member: MemberView; status: string; days: string[]; daysLabel: string }[];
}

export interface WeekView {
  wall: { slats: Slat[]; wood: WallWood };
  numbers: { key: 'streak' | 'longest' | 'thisYear'; value: number; label: string }[];
  rows: FamilyRow[];
  /** Your Mon to Sun strip, under your own row. */
  myStrip: DayCell[];
  past: PastWeekView[];
  /** Plus items under the 12 weeks; only with plus_enabled. */
  seeEveryWeek: boolean;
  printWall: boolean;
  /** The quiet Plus card at the bottom. 'new' means show it and record the showing. */
  nag: 'hidden' | 'showing' | 'new';
}

export interface CommentView {
  id: string;
  member: MemberView;
  body: string;
  mine: boolean;
  canDelete: boolean;
  pending: boolean;
}

export interface FeedCard {
  /** The anchor's id: cheers, comments and the photo live there. */
  id: string;
  loggerId: MemberId | null;
  /** Logger first, then the others in join order. */
  members: MemberView[];
  /** "Maya had a sauna", "Maya, Jo and Sam had a sauna together" */
  title: string;
  /** "20 min · Traditional · 85°C" */
  details: string;
  saunaType: SaunaType;
  rounds: number;
  coldPlunge: boolean;
  coldMinutes: number | null;
  place: string | null;
  note: string | null;
  photoUri: PhotoSource;
  /** "Today · 6:21 PM" */
  when: string;
  localDate: string;
  startedAt: string;
  cheers: { count: number; line: string | null; byMe: boolean; memberIds: MemberId[] };
  canCheer: boolean;
  /** "Cheer Maya on" */
  cheerLabel: string;
  comments: CommentView[];
  quickReplies: string[];
  /** You logged it. */
  mine: boolean;
  /** You're one of the people in it. */
  imIn: boolean;
  /** Still in the outbox. */
  pending: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRemoveMe: boolean;
  /** Your own row in it, for Remove me. */
  myRowId: string | null;
  /** The full rows, anchor first, for the edit form. */
  rows: Session[];
}

export interface FeedView {
  sections: { key: 'thisWeek' | 'lastWeek'; title: string; cards: FeedCard[] }[];
  empty: boolean;
}

export interface ProfileView {
  name: string;
  familyName: string;
  photoUri: PhotoSource;
  stats: { key: 'streak' | 'longest' | 'month' | 'hours'; label: string; value: string; unit?: string }[];
  favoriteType: string | null;
  favoritePlace: string | null;
  recent: FeedCard[];
  badges: { weeks: number; earned: boolean; label: string }[];
  /** Heat log, Timer face and App icon rows: only with plus_enabled. */
  plusRows: boolean;
}

export interface RulesView {
  goal: number;
  minMinutes: number;
  weekStartsOn: WeekStartsOn;
  /** "Monday" */
  weekStartDay: string;
  /** "3 sessions a week, 10 minutes or more" */
  summary: string;
  /** A change waiting for next week: "Starting Monday, Oct 26". */
  pendingChange: { goal: number; minMinutes: number; label: string } | null;
  canEdit: boolean;
}

export interface MilestoneView extends Milestone {
  title: string;
  subtitle: string;
}

export interface AppView {
  status: 'ready' | 'loading' | 'error';
  offline: boolean;
  updateRequired: boolean;
  familyId: string;
  familyName: string;
  joinCode: string;
  me: MemberView;
  members: Record<MemberId, MemberView>;
  /** Everyone in join order, then people invited by name. */
  allMembers: MemberView[];
  isFounder: boolean;
  rules: RulesView;
  today: TodayView;
  week: WeekView;
  feed: FeedView;
  profile: ProfileView;
  /** Every session card by anchor id and by each row id. */
  sessions: Record<string, FeedCard>;
  /** Your break today or coming up, and your breaks for Take a break's limits. */
  myBreak: { endsOn: string; until: string } | null;
  myPauses: { startsOn: string; endsOn: string }[];
  /** People you can add to a session ("Sat with someone?"): joined, not you. */
  sessionCompanions: MemberView[];
  recentPlaces: string[];
  /** The family minimum this week, for the short-session line and the timer target. */
  minMinutes: number;
  unit: TemperatureUnit;
  timer: TimerState | null;
  milestone: MilestoneView | null;
  plus: { visible: boolean; active: boolean; rowLabel: string | null; wood: WallWood; payerIsMe: boolean };
}

// ─── Optimistic changes ──────────────────────────────────────────────────────

/** Changes shown before the server confirms them, rolled back quietly if it says no. */
export interface Optimistic {
  /** Cheers given (true) or taken back (false), by anchor id. */
  cheers: Record<string, boolean>;
  /** Comments not on the server yet. */
  comments: SessionComment[];
  deletedComments: string[];
  /** Session rows gone: Remove me (your row) or Delete (every row of a session, by anchor). */
  removedRows: string[];
  removedSessions: string[];
  /** Edit profile. */
  profile: { name?: string; photoUri?: string | null } | null;
}

export const NO_OPTIMISTIC: Optimistic = {
  cheers: {},
  comments: [],
  deletedComments: [],
  removedRows: [],
  removedSessions: [],
  profile: null,
};

/** The family with optimistic changes laid over it. */
export function applyOptimistic(family: FamilySnapshot, o: Optimistic, myId: MemberId): FamilySnapshot {
  const goneSession = (s: Session) =>
    o.removedRows.includes(s.id) || o.removedSessions.includes(s.sharedId ?? s.id) || o.removedSessions.includes(s.id);
  const sessions = family.sessions.filter((s) => !goneSession(s));
  const myRecent = family.myRecent.filter((s) => !goneSession(s));
  let cheers = family.cheers.filter((c) => !(c.memberId === myId && o.cheers[c.sessionId] === false));
  for (const [sessionId, on] of Object.entries(o.cheers)) {
    if (on && !cheers.some((c) => c.sessionId === sessionId && c.memberId === myId)) {
      cheers = [...cheers, { id: `pending-cheer-${sessionId}`, sessionId, memberId: myId, createdAt: family.fetchedAt, pending: true }];
    }
  }
  const comments = [
    ...family.comments.filter((c) => !o.deletedComments.includes(c.id)),
    ...o.comments.filter((c) => !o.deletedComments.includes(c.id)),
  ];
  const members = o.profile
    ? family.members.map((m) =>
        m.id === myId
          ? {
              ...m,
              name: o.profile?.name ?? m.name,
              photoUrl: o.profile?.photoUri !== undefined ? (o.profile.photoUri ?? null) : m.photoUrl,
            }
          : m,
      )
    : family.members;
  return { ...family, sessions, myRecent, cheers, comments, members };
}

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Dots for a week: `goal` of them, filled for each counted day. */
export function weekDots(countedDays: number, goal: number): boolean[] {
  return Array.from({ length: Math.max(goal, 1) }, (_, i) => i < countedDays);
}

/** "Sam’s on 1" */
function onLine(name: string, n: number): string {
  return `${name}’s on ${n}`;
}

/**
 * Today's family line. Names who kept the week and who's on their way, never
 * who hasn't started, and never you (your slat is right above it).
 */
export function familyLine(rows: { name: string; countedDays: number; kept: boolean; onBreak: boolean }[]): string | null {
  const kept = rows.filter((r) => r.kept).map((r) => r.name);
  const going = rows.filter((r) => !r.kept && !r.onBreak && r.countedDays > 0);
  const parts: string[] = [];
  if (kept.length) parts.push(`${joinNames(kept)} ${kept.length === 1 ? 'has' : 'have'} kept this week.`);
  if (going.length) parts.push(`${joinNames(going.map((r) => onLine(r.name, r.countedDays)))}.`);
  return parts.length ? parts.join(' ') : null;
}

/** "Today · 6:21 PM", "Yesterday · 7:00 AM", "Mon, Oct 12 · 7:00 AM" */
export function whenLabel(localDate: string, startedAt: string, today: string): string {
  const time = timeLabel(new Date(startedAt));
  if (localDate === today) return `Today · ${time}`;
  if (localDate === addDays(today, -1)) return `Yesterday · ${time}`;
  return `${WEEKDAY_SHORT[weekdayIndex(localDate)]}, ${shortDate(localDate)} · ${time}`;
}

/** The letters for a week starting on `weekStartsOn`: M T W T F S S, or S M T W T F S. */
export function dayLetters(weekStartsOn: WeekStartsOn): string[] {
  return weekStartsOn === 7 ? [WEEKDAY_LETTER[6], ...WEEKDAY_LETTER.slice(0, 6)] : [...WEEKDAY_LETTER];
}

/** "Mon, Wed and Sat" */
function daysLabel(days: string[]): string {
  return joinNames(days.map((d) => WEEKDAY_SHORT[weekdayIndex(d)]));
}

/** Hours in the heat: "2.5" under 10, whole hours after. */
export function hoursLabel(minutes: number): string {
  const h = minutes / 60;
  if (h === 0) return '0';
  return h < 10 ? `${Math.round(h * 10) / 10}` : `${Math.round(h)}`;
}

/** What a past week reads as, in your own view. Only you are named as using your freeze. */
export function pastWeekOutcome(state: FamilyWeekState | null, freezeUsed: boolean, myStatus: HistoryStatus | null): string {
  if (state === 'counted') {
    if (!freezeUsed) return 'kept';
    return myStatus === 'frozen' ? 'kept, your freeze was used' : 'kept, a freeze was used';
  }
  if (state === 'broken') return 'not kept';
  if (state === 'skip') return 'everyone was on a break';
  if (state === 'pending') return 'still open';
  // Before the family streak: just your own week.
  switch (myStatus) {
    case 'kept':
      return 'kept';
    case 'frozen':
      return 'kept, your freeze was used';
    case 'paused':
      return 'on a break';
    case 'joined':
      return 'your first week';
    default:
      return 'not kept';
  }
}

/** One person's line in a past week. Someone else's miss is only ever "Not kept". */
export function pastStatusLabel(status: HistoryStatus, mine: boolean): string {
  switch (status) {
    case 'kept':
      return 'Kept';
    case 'frozen':
      return mine ? 'Your freeze covered it' : 'Not kept';
    case 'paused':
      return 'On a break';
    case 'joined':
      return 'First week';
    case 'pending':
      return 'Still open';
    default:
      return 'Not kept';
  }
}

export function milestoneView(m: Milestone, familyName: string): MilestoneView {
  return m.kind === 'family'
    ? { ...m, title: `${m.weeks} weeks together`, subtitle: `${familyName} has kept ${m.weeks} weeks in a row.` }
    : { ...m, title: `${m.weeks} weeks in a row`, subtitle: 'Your own streak, week after week.' };
}

/** "Starting Monday, Oct 26" */
export function startingLabel(date: string): string {
  return `Starting ${weekdayName(date)}, ${shortDate(date)}`;
}

export function rhythmSummary(goal: number, minMinutes: number): string {
  return `${plural(goal, 'session')} a week, ${minMinutes} minutes or more`;
}

// ─── Building it ─────────────────────────────────────────────────────────────

export interface ViewInput {
  myId: MemberId;
  family: FamilySnapshot;
  now: Date;
  status?: AppView['status'];
  offline?: boolean;
  outbox?: OutboxEntry[];
  /** Preview only: sessions logged in the preview, shown as saved (there's no server to send them to). */
  previewSent?: OutboxEntry[];
  drafts?: SessionDraft[];
  optimistic?: Optimistic;
  /** People invited by name who haven't joined (kept on the phone). */
  invited?: { id: string; name: string }[];
  /** Your own photo on this phone, until the uploaded one loads. */
  myPhotoUri?: string | null;
  /** Session photos on this phone, by session id or client id. */
  localPhotos?: Record<string, string>;
  timer?: TimerState | null;
  config: AppConfig;
  appBuild: number;
  unit: TemperatureUnit;
  yesterdayOpen: boolean;
  milestones?: MilestoneMemory;
  nag?: NagMemory;
}

function groupSessions(sessions: Session[]): Session[][] {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = s.sharedId ?? s.id;
    const list = groups.get(key) ?? [];
    if (!list.some((x) => x.id === s.id)) list.push(s);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, rows]) => [...rows].sort((a, b) => Number(b.id === key) - Number(a.id === key)));
}

export function buildView(input: ViewInput): AppView {
  const myId = input.myId;
  const now = input.now;
  const today = dayKey(now);
  const optimistic = input.optimistic ?? NO_OPTIMISTIC;
  const family = applyOptimistic(input.family, optimistic, myId);
  const unit = input.unit;

  // Sessions in the outbox, unless the server already has them.
  const onServer = new Set([...family.sessions, ...family.myRecent].filter((s) => s.loggedBy === myId).map((s) => s.clientId));
  const pendingEntries = (input.outbox ?? []).filter((e) => !onServer.has(e.input.clientId));
  const pending = [
    ...pendingSessions(pendingEntries, (iso) => dayKey(new Date(iso))),
    ...pendingSessions(input.previewSent ?? [], (iso) => dayKey(new Date(iso))).map((x) => ({ ...x, pending: false })),
  ];
  const allSessions = [...pending, ...family.sessions];

  // People.
  const byJoin = [...family.members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id));
  const joinIndex = new Map(byJoin.map((m, i) => [m.id, i]));
  const members: Record<MemberId, MemberView> = {};
  for (const m of byJoin) {
    members[m.id] = {
      id: m.id,
      name: m.name,
      color: m.color,
      photoUri: m.photoUrl ?? (m.id === myId ? (input.myPhotoUri ?? null) : null),
      isMe: m.id === myId,
      invited: false,
      joinedOn: m.joinedOn,
    };
  }
  const joinedNames = new Set(byJoin.map((m) => m.name.trim().toLowerCase()));
  const invited: MemberView[] = (input.invited ?? [])
    .filter((p) => !joinedNames.has(p.name.trim().toLowerCase()))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      color: paletteColor(byJoin.length + i),
      photoUri: null,
      isMe: false,
      invited: true,
      joinedOn: null,
    }));
  for (const p of invited) members[p.id] = p;
  const me: MemberView =
    members[myId] ?? { id: myId, name: 'You', color: paletteColor(0), photoUri: input.myPhotoUri ?? null, isMe: true, invited: false, joinedOn: today };
  const solo = byJoin.length < 2;
  const isFounder = byJoin[0]?.id === myId;
  const nameOf = (id: MemberId | null) => (id ? (members[id]?.name ?? 'Someone') : 'Someone');

  // Weeks, with outbox sessions counted in.
  const weekStartsOn = family.weekStartsOn;
  const fallbackWeek = (id: MemberId): MemberWeek => ({
    memberId: id,
    localToday: today,
    weekStart: weekStart(today, weekStartsOn),
    countedDays: 0,
    countedDates: [],
    goal: family.goalPerWeek,
    minMinutes: family.minMinutes,
    personalStreak: 0,
    longestPersonalStreak: 0,
    keptThisWeek: false,
    lastWeekStatus: null,
    freezeAvailable: true,
    freezeBackOn: null,
    pausedUntil: null,
  });
  const weekOf = (id: MemberId) => overlayPendingSessions(family.memberWeeks[id] ?? fallbackWeek(id), pending);
  const myWeek = weekOf(myId);
  const ws = myWeek.weekStart;

  // Session cards.
  const cards: Record<string, FeedCard> = {};
  const cardFor = (rows: Session[]): FeedCard => {
    const anchor = rows[0];
    const loggerId = anchor.loggedBy ?? anchor.memberId;
    const people = [...rows]
      .sort((a, b) => {
        if (a.memberId === loggerId) return -1;
        if (b.memberId === loggerId) return 1;
        return (joinIndex.get(a.memberId) ?? 99) - (joinIndex.get(b.memberId) ?? 99);
      })
      .map((r) => members[r.memberId] ?? { id: r.memberId, name: 'Someone', color: paletteColor(0), photoUri: null, isMe: false, invited: false, joinedOn: null });
    // The logger first, then join order; "you" goes last when someone else logged it.
    const ordered = people[0]?.isMe ? people : [...people.filter((p) => !p.isMe), ...people.filter((p) => p.isMe)];
    const names = ordered.map((p, i) => (p.isMe ? (i === 0 ? 'You' : 'you') : p.name));
    const title = people.length > 1 ? `${joinNames(names)} had a sauna together` : `${names[0]} had a sauna`;
    const myRow = rows.find((r) => r.memberId === myId) ?? null;
    const imIn = !!myRow;
    const mine = loggerId === myId;
    const cheerRows = family.cheers.filter((c) => c.sessionId === anchor.id);
    const cheerIds = cheerRows.map((c) => c.memberId).sort((a, b) => Number(b === myId) - Number(a === myId));
    const cheerNames = cheerIds.map((id) => (id === myId ? 'You' : nameOf(id)));
    const comments: CommentView[] = family.comments
      .filter((c) => c.sessionId === anchor.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => ({
        id: c.id,
        member: members[c.memberId] ?? me,
        body: c.body,
        mine: c.memberId === myId,
        canDelete: c.memberId === myId || mine,
        pending: !!c.pending,
      }));
    const isPending = rows.some((r) => r.pending);
    return {
      id: anchor.id,
      loggerId,
      members: people,
      title,
      details: sessionDetails(anchor, unit),
      saunaType: anchor.saunaType,
      rounds: anchor.rounds,
      coldPlunge: anchor.coldPlunge,
      coldMinutes: anchor.coldMinutes,
      place: anchor.place,
      note: anchor.note,
      photoUri: anchor.photoUrl ?? input.localPhotos?.[anchor.id] ?? input.localPhotos?.[anchor.clientId] ?? null,
      when: whenLabel(anchor.localDate, anchor.startedAt, today),
      localDate: anchor.localDate,
      startedAt: anchor.startedAt,
      cheers: {
        count: cheerIds.length,
        line: cheerNames.length ? `${joinNames(cheerNames)} cheered` : null,
        byMe: cheerIds.includes(myId),
        memberIds: cheerIds,
      },
      canCheer: !imIn && !isPending,
      cheerLabel: people.length > 1 ? 'Cheer them on' : `Cheer ${people[0].name} on`,
      comments,
      quickReplies: imIn ? QUICK_REPLIES_MINE : [...QUICK_REPLIES_OTHERS, ...(anchor.coldPlunge ? [QUICK_REPLY_PLUNGE] : [])],
      mine,
      imIn,
      pending: isPending,
      canEdit: mine && !isPending,
      canDelete: mine && !isPending,
      canRemoveMe: imIn && !mine && !isPending,
      myRowId: myRow?.id ?? null,
      rows,
    };
  };
  const groups = groupSessions(allSessions).sort((a, b) => b[0].startedAt.localeCompare(a[0].startedAt));
  const feedCards = groups.map(cardFor);
  for (const card of [...feedCards, ...groupSessions(family.myRecent).map(cardFor)]) {
    if (cards[card.id]) continue;
    cards[card.id] = card;
    for (const r of card.rows) cards[r.id] = cards[r.id] ?? card;
  }

  // Family rows (Today and Week).
  const latestThisWeek = (id: MemberId) =>
    allSessions
      .filter((s) => s.memberId === id && s.localDate >= weekOf(id).weekStart)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const rowFor = (m: MemberView): FamilyRow => {
    const w = weekOf(m.id);
    const latest = latestThisWeek(m.id);
    const sessionTap: PersonTap = latest ? { kind: 'session', sessionId: latest.sharedId ?? latest.id } : { kind: 'none' };
    if (w.keptThisWeek) return { member: m, dots: weekDots(w.countedDays, w.goal), status: COPY.kept, state: 'kept', tap: sessionTap };
    if (w.pausedUntil) {
      return {
        member: m,
        dots: weekDots(w.countedDays, w.goal),
        status: `On a break until ${untilLabel(w.pausedUntil, today)}`,
        state: 'break',
        tap: m.isMe ? sessionTap : { kind: 'none' },
      };
    }
    return {
      member: m,
      dots: weekDots(w.countedDays, w.goal),
      status: `${w.countedDays} of ${w.goal}`,
      state: 'progress',
      tap: m.isMe ? sessionTap : { kind: 'nudge', memberId: m.id },
    };
  };
  const joinedRows = byJoin.map((m) => rowFor(members[m.id]));
  const invitedRows: FamilyRow[] = invited.map((m) => ({ member: m, dots: [], status: COPY.invited, state: 'invited', tap: { kind: 'invite' } }));

  // Today.
  const s = family.week;
  const broken = !solo && s.familyStreak === 0 && s.longestStreak > 0;
  const lastDay = addDays(today, -1);
  const firstDayMorning = isoWeekday(today) === weekStartsOn && now.getHours() < 12;
  const forgot: TodayView['forgot'] = !input.yesterdayOpen
    ? null
    : firstDayMorning && myWeek.lastWeekStatus && myWeek.lastWeekStatus !== 'kept'
      ? { kind: 'lastDay', label: `Did you sauna on ${weekdayName(lastDay)}? Log it`, date: lastDay }
      : { kind: 'yesterday', label: COPY.logYesterday, date: lastDay };
  const todayView: TodayView = {
    dateLabel: dateLabel(now),
    greeting: `${greetingFor(now)}, ${me.name}.`,
    you: {
      dots: weekDots(myWeek.countedDays, myWeek.goal),
      countedDays: myWeek.countedDays,
      goal: myWeek.goal,
      kept: myWeek.keptThisWeek,
      label: myWeek.keptThisWeek ? COPY.keptThisWeek : `${myWeek.countedDays} of ${myWeek.goal} this week`,
    },
    familyLine: solo
      ? null
      : familyLine(
          byJoin
            .filter((m) => m.id !== myId)
            .map((m) => {
              const w = weekOf(m.id);
              return { name: m.name, countedDays: w.countedDays, kept: w.keptThisWeek, onBreak: !!w.pausedUntil };
            }),
        ),
    streak: solo
      ? { kind: 'solo', value: 0, label: 'weeks together', familyStreak: 0, weeksTogetherThisYear: 0 }
      : broken
        ? {
            kind: 'broken',
            value: s.weeksTogetherThisYear,
            label: s.weeksTogetherThisYear === 1 ? 'week together this year' : 'weeks together this year',
            familyStreak: 0,
            weeksTogetherThisYear: s.weeksTogetherThisYear,
          }
        : {
            kind: 'building',
            value: s.familyStreak,
            label: s.familyStreak === 1 ? 'week together' : 'weeks together',
            familyStreak: s.familyStreak,
            weeksTogetherThisYear: s.weeksTogetherThisYear,
          },
    soloInvite: solo ? { title: COPY.soloStreak, action: COPY.inviteSomeone } : null,
    backAtIt: broken ? { title: COPY.backAtItTitle, body: COPY.backAtItBody } : null,
    forgot,
    family: [...joinedRows, ...invitedRows],
    drafts: (input.drafts ?? []).map((d) => ({ clientId: d.input.clientId, label: DRAFT_NOTICE })),
    waiting: pendingEntries.length,
  };

  // Week.
  const historyWeeks = [...new Map(family.history.map((h) => [h.weekStart, h])).values()].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );
  const myHistory = new Map(family.history.filter((h) => h.memberId === myId).map((h) => [h.weekStart, h]));
  const slats: Slat[] = [
    ...historyWeeks.map(
      (h): Slat => ({
        weekStart: h.weekStart,
        state: h.familyState ?? 'solo',
        freezeUsed: h.familyState === null ? myHistory.get(h.weekStart)?.status === 'frozen' : h.freezeUsed,
        current: false,
      }),
    ),
    { weekStart: ws, state: solo ? 'solo' : 'pending', freezeUsed: false, current: true },
  ];
  const letters = dayLetters(weekStartsOn);
  const myStrip: DayCell[] = weekDays(ws).map((d, i) => ({
    date: d,
    letter: letters[i],
    went: myWeek.countedDates.includes(d),
    isToday: d === today,
    future: d > today,
  }));
  const pastByWeek = new Map<string, PastWeekRow[]>();
  for (const h of family.history) pastByWeek.set(h.weekStart, [...(pastByWeek.get(h.weekStart) ?? []), h]);
  const past: PastWeekView[] = [...pastByWeek.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([weekStartKey, rows]) => {
      const first = rows[0];
      const mine = rows.find((r) => r.memberId === myId) ?? null;
      return {
        weekStart: weekStartKey,
        label: `Week of ${shortDate(weekStartKey)}: ${pastWeekOutcome(first.familyState, first.freezeUsed, mine?.status ?? null)}`,
        state: first.familyState,
        members: rows
          .filter((r) => members[r.memberId])
          .map((r) => ({
            member: members[r.memberId],
            status: pastStatusLabel(r.status, r.memberId === myId),
            days: r.days,
            daysLabel: daysLabel(r.days),
          })),
      };
    });
  const plusOn = plusVisible(input.config);
  const familyWeeksKnown = historyWeeks.map((h) => ({ weekStart: h.weekStart, state: h.familyState }));
  const nag = nagCardState({
    plusEnabled: plusOn,
    familyHasPlus: family.plus.active,
    joinedOn: me.joinedOn ?? today,
    today,
    eligibleFrom: nagEligibleFrom(familyWeeksKnown, Math.max(s.longestStreak, s.weeksTogetherThisYear), today),
    memory: input.nag ?? EMPTY_NAG,
  });
  const weekView: WeekView = {
    wall: { slats, wood: family.plus.wallWood },
    numbers: [
      { key: 'streak', value: solo ? 0 : s.familyStreak, label: 'Weeks in a row' },
      { key: 'longest', value: s.longestStreak, label: 'Longest streak' },
      { key: 'thisYear', value: s.weeksTogetherThisYear, label: 'Together this year' },
    ],
    rows: joinedRows,
    myStrip,
    past,
    seeEveryWeek: plusOn,
    printWall: plusOn,
    nag,
  };

  // Feed: this week and last week, newest first.
  const lastWs = addDays(ws, -7);
  const thisWeekCards = feedCards.filter((c) => c.localDate >= ws);
  const lastWeekCards = feedCards.filter((c) => c.localDate >= lastWs && c.localDate < ws);
  const feed: FeedView = {
    sections: [
      { key: 'thisWeek' as const, title: COPY.thisWeek, cards: thisWeekCards },
      { key: 'lastWeek' as const, title: COPY.lastWeek, cards: lastWeekCards },
    ].filter((sec) => sec.cards.length > 0),
    empty: thisWeekCards.length + lastWeekCards.length === 0,
  };

  // Me.
  const myCards = groupSessions([...pending.filter((p) => p.memberId === myId), ...family.myRecent, ...family.sessions.filter((x) => x.memberId === myId)])
    .sort((a, b) => b[0].startedAt.localeCompare(a[0].startedAt))
    .map((rows) => cards[rows[0].id] ?? cards[rows[0].sharedId ?? ''] ?? cardFor(rows));
  const seenCards = new Set<string>();
  const recent = myCards.filter((c) => (seenCards.has(c.id) ? false : (seenCards.add(c.id), true))).slice(0, 3);
  const st = family.stats;
  const profile: ProfileView = {
    name: me.name,
    familyName: family.name,
    photoUri: me.photoUri,
    stats: [
      { key: 'streak', label: 'Weeks in a row', value: `${myWeek.personalStreak}` },
      { key: 'longest', label: 'Longest streak', value: `${myWeek.longestPersonalStreak}`, unit: myWeek.longestPersonalStreak === 1 ? 'week' : 'weeks' },
      { key: 'month', label: 'Sessions this month', value: `${st.sessionsThisMonth}` },
      { key: 'hours', label: 'Hours in the heat this year', value: hoursLabel(st.minutesThisYear) },
    ],
    favoriteType: st.favoriteSaunaType ? saunaTypeLabels[st.favoriteSaunaType] : null,
    favoritePlace: st.favoritePlace,
    recent,
    badges: badges(myWeek.longestPersonalStreak).map((b) => ({ ...b, label: `${b.weeks} weeks` })),
    plusRows: plusOn,
  };

  // Rules.
  const pendingRule = [...family.rules]
    .filter((r) => r.effectiveFrom > ws)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const rules: RulesView = {
    goal: myWeek.goal,
    minMinutes: myWeek.minMinutes,
    weekStartsOn,
    weekStartDay: weekStartsOn === 7 ? 'Sunday' : 'Monday',
    summary: rhythmSummary(myWeek.goal, myWeek.minMinutes),
    pendingChange: pendingRule
      ? { goal: pendingRule.goalPerWeek, minMinutes: pendingRule.minMinutes, label: startingLabel(pendingRule.effectiveFrom) }
      : null,
    canEdit: isFounder,
  };

  // Breaks.
  const myPausesList = family.pauses.filter((p: Pause) => p.memberId === myId);
  const nextBreak = myPausesList.filter((p) => p.endsOn >= today).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];

  const due = input.milestones
    ? dueMilestone(input.milestones, myId, { family: solo ? 0 : s.familyStreak, personal: myWeek.personalStreak })
    : null;

  return {
    status: input.status ?? 'ready',
    offline: input.offline ?? false,
    updateRequired: input.appBuild < input.config.minIosBuild,
    familyId: family.id,
    familyName: family.name,
    joinCode: family.joinCode,
    me,
    members,
    allMembers: [...byJoin.map((m) => members[m.id]), ...invited],
    isFounder,
    rules,
    today: todayView,
    week: weekView,
    feed,
    profile,
    sessions: cards,
    myBreak: nextBreak ? { endsOn: nextBreak.endsOn, until: untilLabel(nextBreak.endsOn, today) } : null,
    myPauses: myPausesList.map((p) => ({ startsOn: p.startsOn, endsOn: p.endsOn })),
    sessionCompanions: byJoin.filter((m) => m.id !== myId).map((m) => members[m.id]),
    recentPlaces: family.recentPlaces,
    minMinutes: myWeek.minMinutes,
    unit,
    timer: input.timer ?? null,
    milestone: due ? milestoneView(due, family.name) : null,
    plus: {
      visible: plusOn,
      active: family.plus.active,
      rowLabel: plusOn ? plusRowLabel(family.plus) : null,
      wood: family.plus.wallWood,
      payerIsMe: family.plus.payerIsMe,
    },
  };
}

/**
 * A family with just you in it, for the moment before the server has answered
 * (first launch, nothing cached) and for an error with nothing cached. Screens
 * read view.status and show their loading or error state over it.
 */
export function placeholderFamily(
  me: { id: MemberId; name: string; color: string; joinedOn: string },
  familyName: string,
  now: Date,
): FamilySnapshot {
  const today = dayKey(now);
  const ws = weekStart(today, 1);
  return {
    id: 'placeholder',
    name: familyName,
    joinCode: '',
    weekStartsOn: 1,
    goalPerWeek: 3,
    minMinutes: 10,
    saunafamStartedOn: ws,
    members: [
      {
        id: me.id,
        userId: '',
        name: me.name,
        color: me.color,
        photoPath: null,
        photoUrl: null,
        timezone: 'UTC',
        joinedAt: `${me.joinedOn}T00:00:00.000Z`,
        joinedOn: me.joinedOn,
        weekendCheckin: true,
      },
    ],
    rules: [],
    sessions: [],
    myRecent: [],
    cheers: [],
    comments: [],
    pauses: [],
    week: { familyStreak: 0, longestStreak: 0, weeksTogetherThisYear: 0, startedOn: null, latestWeekState: null },
    memberWeeks: {},
    history: [],
    stats: { sessionsThisMonth: 0, minutesThisYear: 0, favoriteSaunaType: null, favoritePlace: null },
    plus: { active: false, product: null, status: null, expiresAt: null, payerName: null, payerIsMe: false, wallWood: 'birch' },
    recentPlaces: [],
    fetchedAt: now.toISOString(),
  };
}

/** The day a session would be dated on this phone, for "Log yesterday's" defaults. */
export function localDateOf(iso: string): string {
  return dayKey(new Date(iso));
}
