/**
 * Turns the saved session, and the server's family when there is one, into what the
 * screens show. Streaks, freezes and "days together" for a real family come from the
 * server. The fake family in data/family.ts stays as the preview family.
 */
import { memberColor } from '../theme/tokens';
import {
  FeedItem,
  Member,
  MemberId,
  MilestoneData,
  ProfileStat,
  RecentWorkout,
  WeekRow,
  WeekStripDay,
  WorkoutDetail,
} from '../data/types';
import {
  familyMembersList,
  familyMilestone,
  feed as demoFeed,
  profile as demoProfile,
  today as demoToday,
  week as demoWeek,
  workouts as demoWorkouts,
} from '../data/family';
import { joinNames, workoutSummary } from '../data/workouts';
import { LoggedWorkout, SavedSession } from './session';
import type { RemoteFamily, RemoteWorkout } from './backend';
import {
  WEEKDAY_LETTER,
  WEEKDAY_SHORT,
  addDays,
  dateLabel,
  daysBetween,
  dayKey,
  fromKey,
  greetingFor,
  timeLabel,
  weekdayIndex,
} from './dates';

/** Preview states from Settings (prototype only): the fake family in different moments. */
export type Preview = 'demo' | 'afterBreak' | 'goalDone';

export const GOAL_DAYS = 30;

export interface StreakView {
  /** solo: family of one · building: a running family streak · afterBreak: broken, nobody has restarted it yet */
  kind: 'solo' | 'building' | 'afterBreak';
  current: number;
  longest: number;
  /** Days the family has moved together this year. Never resets. null until the second person joins. */
  daysTogether: number | null;
  /** Day 1 after a break: show "Back at it, together". */
  restartDay: boolean;
}

export interface GoalView {
  /** waiting: starts when someone joins · active · done: show the milestone card · none: finished long ago */
  status: 'waiting' | 'active' | 'done' | 'none';
  day: number;
  total: number;
}

export interface AppView {
  familyName: string;
  joinCode: string;
  me: Member;
  /** Everyone, in join order, including people who haven't joined yet. */
  allMembers: Member[];
  members: Record<MemberId, Member>;
  /** Joined members in Today's order. */
  familyList: Member[];
  invitedList: Member[];
  joinedCount: number;
  keptCount: number;
  iKeptToday: boolean;
  /** A joined member (not you) who still has today, for the Nudge screen. */
  nudgeTarget?: Member;
  today: {
    dateLabel: string;
    greeting: string;
    /** The "Darcey's still got today" line under the summary card. */
    pending: { id?: MemberId; prompt: string; cta?: string } | null;
  };
  feed: FeedItem[];
  week: { headline: string; summary: string; strip: WeekStripDay[]; rows: WeekRow[] };
  profile: { subtitle: string; stats: ProfileStat[]; recentWorkouts: RecentWorkout[]; milestones: number[] };
  workouts: Record<string, WorkoutDetail>;
  streak: StreakView;
  goal: GoalView;
  milestone: MilestoneData;
  usuallyLine: string;
}

const SLOT_WORD = { morning: 'mornings', lunch: 'lunchtimes', evening: 'evenings' } as const;

// ─── Logged workouts → labels and streaks ────────────────────────────────────

function minutesLabel(minutes?: number): string | undefined {
  return minutes ? `${minutes} min` : undefined;
}

function whenLabel(w: LoggedWorkout, todayKey: string): string {
  const time = timeLabel(new Date(w.loggedAt));
  if (w.localDate === todayKey) return `Today · ${time}`;
  if (w.localDate === addDays(todayKey, -1)) return `Yesterday · ${time}`;
  const d = fromKey(w.localDate);
  return `${WEEKDAY_SHORT[weekdayIndex(w.localDate)]}, ${d.getMonth() + 1}/${d.getDate()} · ${time}`;
}

function toDetail(w: LoggedWorkout, memberId: MemberId, todayKey: string): WorkoutDetail {
  return {
    id: w.id,
    memberId,
    type: w.type,
    source: 'manual',
    when: whenLabel(w, todayKey),
    duration: minutesLabel(w.minutes),
    note: w.note,
    photoUri: w.photoUri ?? null,
    cheeredBy: [],
  };
}

/** Consecutive days with a workout, ending today (or yesterday, while today is still open). */
function personalStreaks(logs: LoggedWorkout[], todayKey: string): { current: number; longest: number } {
  const days = new Set(logs.map((l) => l.localDate));
  let current = 0;
  let cursor = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue; // not the start of a run
    let run = 0;
    for (let c = day; days.has(c); c = addDays(c, 1)) run += 1;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}

function newestFirst(logs: LoggedWorkout[]): LoggedWorkout[] {
  return [...logs].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
}

function feedItem(w: LoggedWorkout, me: Member, todayKey: string): FeedItem {
  const label = w.localDate === todayKey ? 'moved today' : 'moved yesterday';
  return {
    id: `feed-${w.id}`,
    memberId: me.id,
    kind: 'kept',
    title: `${me.name} ${label}`,
    meta: workoutSummary({ type: w.type, duration: minutesLabel(w.minutes) }),
    time: timeLabel(new Date(w.loggedAt)),
    workoutId: w.id,
  };
}

function meMember(session: SavedSession, logs: LoggedWorkout[], todayKey: string, streak: number): Member {
  const latestToday = newestFirst(logs).find((l) => l.localDate === todayKey);
  return {
    id: session.me.id,
    name: session.me.name,
    color: session.me.color,
    streak,
    today: latestToday ? 'kept' : 'still',
    meta: latestToday
      ? `${workoutSummary({ type: latestToday.type, duration: minutesLabel(latestToday.minutes) })} · ${timeLabel(new Date(latestToday.loggedAt))}`
      : `Still has today · usually ${SLOT_WORD[session.me.reminder]}`,
    relationship: 'You',
    photoUri: session.me.photoUri,
  };
}

/** Mon-Sun strip and day list for a person's own logs. */
function ownWeek(
  logs: LoggedWorkout[],
  me: Member,
  todayKey: string,
  joinedOn: string,
): { strip: WeekStripDay[]; rows: WeekRow[]; movedDays: number } {
  const days = new Set(logs.map((l) => l.localDate));
  const todayIdx = weekdayIndex(todayKey);
  const monday = addDays(todayKey, -todayIdx);
  const strip: WeekStripDay[] = [];
  const rows: WeekRow[] = [];
  let movedDays = 0;
  for (let i = 0; i < 7; i++) {
    const key = addDays(monday, i);
    const moved = days.has(key);
    if (moved) movedDays += 1;
    const isToday = key === todayKey;
    const state = isToday && !moved ? 'today' : moved ? 'kept' : 'missed';
    strip.push({ label: WEEKDAY_LETTER[i], state });
    if (i <= todayIdx && key >= joinedOn) {
      rows.push({
        dow: WEEKDAY_SHORT[i],
        date: `${fromKey(key).getDate()}`,
        state: isToday && moved ? 'today' : state,
        avatars: moved ? [me.id] : [],
        badge: isToday ? 'Today' : undefined,
      });
    }
  }
  return { strip, rows, movedDays };
}

function ownProfile(
  logs: LoggedWorkout[],
  todayKey: string,
  familyName: string,
  me: Member,
): AppView['profile'] {
  const { current, longest } = personalStreaks(logs, todayKey);
  const month = todayKey.slice(0, 7);
  const thisMonth = logs.filter((l) => l.localDate.startsWith(month));
  const activeDays = new Set(thisMonth.map((l) => l.localDate)).size;
  const dayOfMonth = fromKey(todayKey).getDate();
  return {
    subtitle: familyName,
    stats: [
      { label: 'Current streak', value: current > 0 ? `${current}` : '–', unit: current > 0 ? (current === 1 ? 'day' : 'days') : undefined },
      { label: 'Longest streak', value: longest > 0 ? `${longest}` : '–', unit: longest > 0 ? (longest === 1 ? 'day' : 'days') : undefined },
      { label: 'Workouts this month', value: `${thisMonth.length}` },
      { label: 'Active days', value: `${activeDays}`, unit: `of ${dayOfMonth}` },
    ],
    recentWorkouts: newestFirst(logs)
      .slice(0, 3)
      .map((l) => toDetail(l, me.id, todayKey)),
    milestones: [30, 20, 10, 7].filter((n) => n <= longest),
  };
}

// ─── The two kinds of family ─────────────────────────────────────────────────

function founderView(session: SavedSession, now: Date): AppView {
  const todayKey = dayKey(now);
  const logs = session.workouts;
  const { current, longest } = personalStreaks(logs, todayKey);
  const me = meMember(session, logs, todayKey, current);
  const invited: Member[] = session.family.invited.map((p, i) => ({
    id: p.id,
    name: p.name,
    color: memberColor(i + 1),
    streak: 0,
    today: 'still',
    meta: 'Invited · hasn’t joined yet',
    relationship: 'Invited',
    invited: true,
  }));
  const iKeptToday = me.today === 'kept';
  const wk = ownWeek(logs, me, todayKey, session.me.joinedOn);
  const waitingFor = invited.length ? `Waiting for ${joinNames(invited.map((m) => m.name))} to join.` : 'Invite someone and their days will show up here too.';

  return {
    familyName: session.family.name,
    joinCode: session.family.joinCode,
    me,
    allMembers: [me, ...invited],
    members: Object.fromEntries([me, ...invited].map((m) => [m.id, m])),
    familyList: [me],
    invitedList: invited,
    joinedCount: 1,
    keptCount: iKeptToday ? 1 : 0,
    iKeptToday,
    today: { dateLabel: dateLabel(now), greeting: `${greetingFor(now)}, ${me.name}.`, pending: null },
    feed: newestFirst(logs)
      .filter((l) => l.localDate >= addDays(todayKey, -1))
      .map((l) => feedItem(l, me, todayKey)),
    week: {
      headline: wk.movedDays === 0 ? 'Your week is open.' : `You’ve moved ${wk.movedDays} ${wk.movedDays === 1 ? 'day' : 'days'} this week.`,
      summary: waitingFor,
      strip: wk.strip,
      rows: wk.rows,
    },
    profile: ownProfile(logs, todayKey, session.family.name, me),
    workouts: Object.fromEntries(logs.map((l) => [l.id, toDetail(l, me.id, todayKey)])),
    streak: { kind: 'solo', current, longest, daysTogether: null, restartDay: false },
    goal: { status: 'waiting', day: 0, total: GOAL_DAYS },
    milestone: familyMilestone,
    usuallyLine: `usually ${SLOT_WORD[session.me.reminder]}`,
  };
}

/**
 * The preview family: Bryce, Darcey and Whit. With `preview` set, you are Bryce.
 * Without it, you're an invitee who joined them as the fourth member.
 */
function previewFamilyView(session: SavedSession, preview: Preview | null, now: Date): AppView {
  const todayKey = dayKey(now);
  const logs = session.workouts;
  const myLogsToday = newestFirst(logs).filter((l) => l.localDate === todayKey);
  const base = familyMembersList.map((m) => ({ ...m }));
  const byId = Object.fromEntries(base.map((m) => [m.id, m])) as Record<string, Member>;

  // The moment being previewed.
  if (preview === 'afterBreak') {
    byId.bryce.today = 'still';
    byId.bryce.meta = 'Still has today · usually mornings';
  }
  if (preview === 'goalDone') {
    byId.darcey.today = 'kept';
    byId.darcey.meta = 'Walk · 30 min · 5:40 PM';
  }

  // Who has a post in the demo feed is decided before anything you log.
  const baseToday = Object.fromEntries(base.map((m) => [m.id, m.today])) as Record<string, Member['today']>;

  // Who "me" is.
  let me: Member;
  let members: Member[];
  if (preview) {
    me = byId.bryce;
    members = base;
  } else {
    byId.bryce.relationship = undefined;
    byId.darcey.relationship = undefined;
    byId.whit.relationship = undefined;
    me = meMember(session, logs, todayKey, personalStreaks(logs, todayKey).current);
    members = [...base, me];
  }
  if (preview && myLogsToday[0]) {
    me.today = 'kept';
    me.meta = `${workoutSummary({ type: myLogsToday[0].type, duration: minutesLabel(myLogsToday[0].minutes) })} · ${timeLabel(new Date(myLogsToday[0].loggedAt))}`;
  }

  const iKeptToday = me.today === 'kept';
  const keptCount = members.filter((m) => m.today === 'kept').length;
  const allKept = keptCount === members.length;
  const familyList = [...members].sort((a, b) => Number(b.today === 'kept') - Number(a.today === 'kept'));
  const nudgeTarget = members.find((m) => m.id !== me.id && m.today === 'still');

  // Streak and goal for the moment being previewed.
  const demoStreak = 24;
  let streak: StreakView = { kind: 'building', current: demoStreak, longest: 31, daysTogether: 158, restartDay: false };
  let goal: GoalView = { status: 'active', day: demoStreak, total: GOAL_DAYS };
  if (preview === 'afterBreak') {
    streak = allKept
      ? { kind: 'building', current: 1, longest: 31, daysTogether: 159, restartDay: true }
      : { kind: 'afterBreak', current: 0, longest: 31, daysTogether: 158, restartDay: true };
    goal = { status: 'none', day: GOAL_DAYS, total: GOAL_DAYS };
  }
  if (preview === 'goalDone') {
    streak = { kind: 'building', current: 30, longest: 30, daysTogether: 30, restartDay: false };
    goal = { status: 'done', day: GOAL_DAYS, total: GOAL_DAYS };
  }

  // Pending line under the summary card.
  let pending: AppView['today']['pending'] = null;
  if (nudgeTarget && iKeptToday && preview !== 'afterBreak') {
    pending = { id: nudgeTarget.id, prompt: `${nudgeTarget.name}’s still got today`, cta: nudgeTarget.id === 'darcey' ? 'cheer her on' : 'cheer them on' };
  }

  // Feed: the demo posts that still match, plus anything you logged.
  const feedItems = demoFeed.filter((f) => baseToday[f.memberId] === (f.kind === 'still' ? 'still' : 'kept'));
  // In the preview you're Bryce, and his demo post already stands in for a workout you logged.
  const bryceHasPost = !!preview && baseToday.bryce === 'kept';
  const myItems = bryceHasPost
    ? []
    : newestFirst(logs)
        .filter((l) => l.localDate >= addDays(todayKey, -1))
        .map((l) => feedItem(l, me, todayKey));

  // Week: add you to today's row once you've moved.
  const week = {
    ...demoWeek,
    rows: demoWeek.rows.map((r) =>
      r.state === 'today' && iKeptToday && !r.avatars.includes(me.id) ? { ...r, avatars: [...r.avatars, me.id] } : r,
    ),
  };

  const detail: Record<string, WorkoutDetail> = { ...demoWorkouts };
  for (const l of logs) detail[l.id] = toDetail(l, me.id, todayKey);

  return {
    familyName: preview ? 'Home crew' : session.family.name,
    joinCode: preview ? 'HOME42' : session.family.joinCode,
    me,
    allMembers: members,
    members: Object.fromEntries(members.map((m) => [m.id, m])),
    familyList,
    invitedList: [],
    joinedCount: members.length,
    keptCount,
    iKeptToday,
    nudgeTarget,
    today: {
      dateLabel: demoToday.dateLabel,
      greeting: `Good morning, ${me.name}.`,
      pending,
    },
    feed: [...myItems, ...feedItems],
    week,
    profile: preview
      ? { subtitle: demoProfile.location, stats: demoProfile.stats, recentWorkouts: demoProfile.recentWorkouts, milestones: demoProfile.milestones }
      : ownProfile(logs, todayKey, session.family.name, me),
    workouts: detail,
    streak,
    goal,
    milestone: familyMilestone,
    usuallyLine: `usually ${SLOT_WORD[session.me.reminder]}`,
  };
}

// ─── A real family from the server ───────────────────────────────────────────

function asLogged(w: RemoteWorkout, photos: Record<string, string> | undefined): LoggedWorkout {
  return {
    id: w.id,
    localDate: w.localDate,
    loggedAt: w.createdAt,
    type: w.type,
    minutes: w.minutes,
    note: w.note,
    photoUri: photos?.[w.id] ?? null,
  };
}

/**
 * The view for a family on the server. Streaks, freezes and "days together" come from
 * the server; labels, the week and the feed are worked out here from recent workouts.
 */
function familyView(session: SavedSession, family: RemoteFamily, now: Date): AppView {
  const todayKey = dayKey(now);
  const myId = session.remote!.memberId;
  const logsBy = (memberId: string) =>
    family.workouts.filter((w) => w.memberId === memberId).map((w) => asLogged(w, session.photos));

  const joined: Member[] = family.members.map((m) => {
    const mine = m.id === myId;
    const latestToday = family.workouts.find((w) => w.memberId === m.id && w.localDate === todayKey);
    const server = family.memberStreaks[m.id];
    const moved = server?.movedToday ?? !!latestToday;
    return {
      id: m.id,
      name: m.name,
      color: m.color,
      streak: server?.personalStreak ?? 0,
      today: moved ? 'kept' : 'still',
      meta: latestToday
        ? `${workoutSummary({ type: latestToday.type, duration: minutesLabel(latestToday.minutes) })} · ${timeLabel(new Date(latestToday.createdAt))}`
        : mine
          ? `Still has today · usually ${SLOT_WORD[session.me.reminder]}`
          : 'Still has today',
      relationship: mine ? 'You' : undefined,
      // Only your own photo, from this phone, until Storage is set up.
      photoUri: mine ? session.me.photoUri : null,
    };
  });
  const me = joined.find((m) => m.id === myId) ?? joined[0];

  // People you invited by name who haven't joined. The server doesn't know names, so this list stays on the phone.
  const joinedNames = new Set(joined.map((m) => m.name.trim().toLowerCase()));
  const invited: Member[] = session.family.invited
    .filter((p) => !joinedNames.has(p.name.trim().toLowerCase()))
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      color: memberColor(joined.length + i),
      streak: 0,
      today: 'still',
      meta: 'Invited · hasn’t joined yet',
      relationship: 'Invited',
      invited: true,
    }));

  const solo = joined.length < 2;
  const keptCount = joined.filter((m) => m.today === 'kept').length;
  const iKeptToday = me.today === 'kept';
  const nudgeTarget = joined.find((m) => m.id !== me.id && m.today === 'still');
  const myLogs = logsBy(myId);

  // Streak and the first-30-days goal.
  const s = family.streak;
  const mineLongest = personalStreaks(myLogs, todayKey).longest;
  const streak: StreakView = solo
    ? { kind: 'solo', current: me.streak, longest: Math.max(mineLongest, me.streak), daysTogether: null, restartDay: false }
    : {
        kind: s.current === 0 && s.longest > 0 ? 'afterBreak' : 'building',
        current: s.current,
        longest: s.longest,
        daysTogether: s.daysTogetherThisYear,
        restartDay: s.current <= 1 && s.longest > 1,
      };
  const goal: GoalView = solo
    ? { status: 'waiting', day: 0, total: GOAL_DAYS }
    : s.longest >= GOAL_DAYS
      ? { status: s.current === s.longest && s.current <= GOAL_DAYS + 1 ? 'done' : 'none', day: GOAL_DAYS, total: GOAL_DAYS }
      : { status: 'active', day: s.current, total: GOAL_DAYS };

  // This week, Monday to Sunday. A past day where someone didn't move but the family
  // streak still runs through it was covered by a freeze.
  const movedOn = (day: string) => new Set(family.workouts.filter((w) => w.localDate === day).map((w) => w.memberId));
  const todayIdx = weekdayIndex(todayKey);
  const monday = addDays(todayKey, -todayIdx);
  const firstJoined = family.members.reduce((min, m) => (m.joinedOn < min ? m.joinedOn : min), todayKey);
  // Once today counts, it's the newest day of the streak; until then the streak ends yesterday.
  const streakDaysBack = joined.every((m) => m.today === 'kept') ? s.current - 1 : s.current;
  const strip: WeekStripDay[] = [];
  const rows: WeekRow[] = [];
  let togetherDays = 0;
  for (let i = 0; i < 7; i++) {
    const key = addDays(monday, i);
    const movers = movedOn(key);
    const expected = family.members.filter((m) => m.joinedOn < key || movers.has(m.id));
    const everyone = expected.length > 0 && expected.every((m) => movers.has(m.id));
    const daysBack = daysBetween(key, todayKey);
    const inStreak = !solo && daysBack >= 1 && daysBack <= streakDaysBack;
    const state: WeekRow['state'] =
      key === todayKey ? 'today' : key > todayKey ? 'missed' : everyone ? 'kept' : inStreak ? 'freeze' : 'missed';
    if (key < todayKey && (state === 'kept' || state === 'freeze')) togetherDays += 1;
    strip.push({ label: WEEKDAY_LETTER[i], state: key === todayKey && everyone ? 'kept' : state });
    if (i <= todayIdx && key >= firstJoined) {
      rows.push({
        dow: WEEKDAY_SHORT[i],
        date: `${fromKey(key).getDate()}`,
        state,
        avatars: joined.filter((m) => movers.has(m.id)).map((m) => m.id),
        badge: key === todayKey ? 'Today' : state === 'freeze' ? 'Freeze day' : undefined,
      });
    }
  }
  const waitingFor = invited.length
    ? `Waiting for ${joinNames(invited.map((m) => m.name))} to join.`
    : 'Invite someone and their days will show up here too.';
  const myWeek = ownWeek(myLogs, me, todayKey, session.me.joinedOn);

  const details: Record<string, WorkoutDetail> = {};
  for (const w of family.workouts) {
    details[w.id] = { ...toDetail(asLogged(w, session.photos), w.memberId, todayKey), source: w.source, cheeredBy: w.cheeredBy };
  }

  const profile = ownProfile(myLogs, todayKey, family.name, me);
  // The server's personal streak counts freeze days; the local count can't.
  const streakStat = (n: number) => ({ value: n > 0 ? `${n}` : '–', unit: n > 0 ? (n === 1 ? 'day' : 'days') : undefined });
  profile.stats[0] = { ...profile.stats[0], ...streakStat(me.streak) };
  profile.stats[1] = { ...profile.stats[1], ...streakStat(Math.max(mineLongest, me.streak)) };
  profile.recentWorkouts = profile.recentWorkouts.map((r) => details[r.id] ?? r);

  return {
    familyName: family.name,
    joinCode: family.joinCode,
    me,
    allMembers: [...joined, ...invited],
    members: Object.fromEntries([...joined, ...invited].map((m) => [m.id, m])),
    familyList: [...joined].sort((a, b) => Number(b.today === 'kept') - Number(a.today === 'kept')),
    invitedList: invited,
    joinedCount: joined.length,
    keptCount,
    iKeptToday,
    nudgeTarget,
    today: {
      dateLabel: dateLabel(now),
      greeting: `${greetingFor(now)}, ${me.name}.`,
      pending:
        nudgeTarget && iKeptToday ? { id: nudgeTarget.id, prompt: `${nudgeTarget.name}’s still got today`, cta: 'cheer them on' } : null,
    },
    feed: family.workouts
      .filter((w) => w.localDate >= addDays(todayKey, -1))
      .map((w) => {
        const who = joined.find((m) => m.id === w.memberId);
        return {
          ...feedItem(asLogged(w, session.photos), who ?? me, todayKey),
          hearts: w.cheeredBy.length || undefined,
        };
      }),
    week: solo
      ? {
          headline:
            myWeek.movedDays === 0
              ? 'Your week is open.'
              : `You’ve moved ${myWeek.movedDays} ${myWeek.movedDays === 1 ? 'day' : 'days'} this week.`,
          summary: waitingFor,
          strip: myWeek.strip,
          rows: myWeek.rows,
        }
      : {
          headline:
            togetherDays === 0
              ? 'This week is open.'
              : `${togetherDays} ${togetherDays === 1 ? 'day' : 'days'} together this week.`,
          summary: s.current > 0 ? `${s.current}-day family streak.` : 'The family streak starts again with today.',
          strip,
          rows,
        },
    profile,
    workouts: details,
    streak,
    goal,
    milestone: familyMilestone,
    usuallyLine: `usually ${SLOT_WORD[session.me.reminder]}`,
  };
}

/**
 * The preview family (Settings > Prototype preview) always wins, so App Review and
 * empty-state checks can see a full family. Then the server's family, then local state.
 */
export function buildView(
  session: SavedSession,
  preview: Preview | null,
  family: RemoteFamily | null = null,
  now: Date = new Date(),
): AppView {
  if (preview) return previewFamilyView(session, preview, now);
  // A server family that hasn't loaded yet (first launch offline) shows just you.
  if (session.remote) return family ? familyView(session, family, now) : founderView(session, now);
  if (session.role === 'invitee') return previewFamilyView(session, null, now);
  return founderView(session, now);
}
