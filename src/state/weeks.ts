/**
 * Weekly streak math on the phone. The server is the source of truth
 * (supabase/migrations/20261021000003_weekly_streaks.sql); this mirrors it so:
 *   * the preview family and its scenarios get real statuses and streaks from
 *     believable sessions, with no server;
 *   * a session still in the outbox can fill your dots straight away
 *     (overlayPendingSessions), before the server has it.
 * One simplification: everyone shares one "today" here, where the server uses
 * each member's own time zone.
 */
import {
  FamilyRule,
  FamilyWeekState,
  FamilyWeekSummary,
  MemberId,
  MemberWeek,
  MemberWeekStatus,
  PastWeekRow,
  Pause,
  Session,
  WeekStartsOn,
} from '../data/types';
import { addDays, weekStart } from './dates';

/** A freeze used in week W is back from week W+4 (private.freeze_refill_weeks). */
export const FREEZE_REFILL_WEEKS = 4;
/** A week with this many break days doesn't count against you. */
export const PAUSED_DAYS_FOR_WEEK = 4;
/** Past weeks the Week screen shows without Plus. */
export const HISTORY_WEEKS = 12;

export interface WeekFamily {
  weekStartsOn: WeekStartsOn;
  saunafamStartedOn: string;
  goalPerWeek: number;
  minMinutes: number;
  rules: FamilyRule[];
  /** In join order. */
  members: { id: MemberId; joinedOn: string; joinedAt: string }[];
  sessions: Pick<Session, 'memberId' | 'localDate' | 'durationMinutes'>[];
  pauses: Pause[];
}

export interface MemberWeekRow {
  weekStart: string;
  countedDays: number;
  goal: number;
  minMinutes: number;
  pausedDays: number;
  days: string[];
  status: MemberWeekStatus;
}

/** The rule in force for a week: the latest one on or before it (private.rule_for_week). */
export function ruleForWeek(family: Pick<WeekFamily, 'rules' | 'goalPerWeek' | 'minMinutes'>, ws: string) {
  const rule = [...family.rules]
    .filter((r) => r.effectiveFrom <= ws)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return { goal: rule?.goalPerWeek ?? family.goalPerWeek, minMinutes: rule?.minMinutes ?? family.minMinutes };
}

/** A member's first week: their join week, or the build 9 reset week if later. */
export function memberFirstWeek(joinedOn: string, startedOn: string, weekStartsOn: number): string {
  const a = weekStart(joinedOn, weekStartsOn);
  const b = weekStart(startedOn, weekStartsOn);
  return a > b ? a : b;
}

/** Days of the week starting `ws` that fall inside one of the member's breaks. */
function pausedDaysIn(pauses: Pause[], memberId: MemberId, ws: string): number {
  const days = new Set<string>();
  const end = addDays(ws, 6);
  for (const p of pauses) {
    if (p.memberId !== memberId || p.startsOn > end || p.endsOn < ws) continue;
    for (let d = p.startsOn > ws ? p.startsOn : ws; d <= end && d <= p.endsOn; d = addDays(d, 1)) days.add(d);
  }
  return days.size;
}

/** Every week from the member's first to their current one, with its status (private.member_weeks). */
export function memberWeeks(family: WeekFamily, memberId: MemberId, today: string): MemberWeekRow[] {
  const member = family.members.find((m) => m.id === memberId);
  if (!member) return [];
  const cur = weekStart(today, family.weekStartsOn);
  const first = memberFirstWeek(member.joinedOn, family.saunafamStartedOn, family.weekStartsOn);
  const mine = family.sessions.filter((s) => s.memberId === memberId && s.localDate >= family.saunafamStartedOn);
  const rows: MemberWeekRow[] = [];
  let lastFreeze: string | null = null;
  for (let ws = first; ws <= cur; ws = addDays(ws, 7)) {
    const { goal, minMinutes } = ruleForWeek(family, ws);
    const end = addDays(ws, 6);
    const days = [
      ...new Set(mine.filter((s) => s.localDate >= ws && s.localDate <= end && s.durationMinutes >= minMinutes).map((s) => s.localDate)),
    ].sort();
    const pausedDays = pausedDaysIn(family.pauses, memberId, ws);
    let status: MemberWeekStatus;
    if (days.length >= goal) status = 'kept';
    else if (today <= end) status = 'pending';
    else if (ws === first) status = 'joined';
    else if (pausedDays >= PAUSED_DAYS_FOR_WEEK) status = 'paused';
    else if (lastFreeze === null || ws >= addDays(lastFreeze, FREEZE_REFILL_WEEKS * 7)) {
      status = 'frozen';
      lastFreeze = ws;
    } else status = 'missed';
    rows.push({ weekStart: ws, countedDays: days.length, goal, minMinutes, pausedDays, days, status });
  }
  return rows;
}

/** A member's current week and streaks (private.member_week_summary). */
export function memberWeekSummary(family: WeekFamily, memberId: MemberId, today: string): MemberWeek {
  const ws = weekStart(today, family.weekStartsOn);
  const { goal, minMinutes } = ruleForWeek(family, ws);
  let personal = 0;
  let longest = 0;
  let lastFreeze: string | null = null;
  let lastWeekStatus: MemberWeekStatus | null = null;
  let countedDates: string[] = [];
  for (const r of memberWeeks(family, memberId, today)) {
    if (r.status === 'kept' || r.status === 'frozen') {
      personal += 1;
      longest = Math.max(longest, personal);
    } else if (r.status === 'missed') personal = 0;
    if (r.status === 'frozen') lastFreeze = r.weekStart;
    if (r.weekStart === addDays(ws, -7)) lastWeekStatus = r.status;
    if (r.weekStart === ws) countedDates = r.days;
  }
  const refill = FREEZE_REFILL_WEEKS * 7;
  const freezeAvailable = lastFreeze === null || ws >= addDays(lastFreeze, refill);
  const onBreak = family.pauses
    .filter((p) => p.memberId === memberId && p.startsOn <= today && today <= p.endsOn)
    .map((p) => p.endsOn)
    .sort();
  return {
    memberId,
    localToday: today,
    weekStart: ws,
    countedDays: countedDates.length,
    countedDates,
    goal,
    minMinutes,
    personalStreak: personal,
    longestPersonalStreak: longest,
    keptThisWeek: countedDates.length >= goal,
    lastWeekStatus,
    freezeAvailable,
    freezeBackOn: freezeAvailable || !lastFreeze ? null : addDays(lastFreeze, refill),
    pausedUntil: onBreak.length ? onBreak[onBreak.length - 1] : null,
  };
}

export interface FamilyWeekRow {
  weekStart: string;
  state: FamilyWeekState;
  freezeUsed: boolean;
}

/** One row per family week, from the second member's first week (private.family_weeks). */
export function familyWeeks(family: WeekFamily, today: string): FamilyWeekRow[] {
  if (family.members.length < 2) return [];
  const byJoin = [...family.members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id));
  const firstWeeks = new Map(
    byJoin.map((m) => [m.id, memberFirstWeek(m.joinedOn, family.saunafamStartedOn, family.weekStartsOn)]),
  );
  const start = byJoin
    .slice(0, 2)
    .map((m) => firstWeeks.get(m.id) as string)
    .sort()[1];
  const cur = weekStart(today, family.weekStartsOn);
  const statuses = new Map(byJoin.map((m) => [m.id, new Map(memberWeeks(family, m.id, today).map((r) => [r.weekStart, r.status]))]));
  const rows: FamilyWeekRow[] = [];
  for (let ws = start; ws <= cur; ws = addDays(ws, 7)) {
    const expected: MemberWeekStatus[] = [];
    for (const m of byJoin) {
      const first = firstWeeks.get(m.id) as string;
      if (first > ws) continue;
      const status = statuses.get(m.id)?.get(ws) ?? 'pending';
      // In the week someone joins they only count if they keep it.
      if (first < ws || status === 'kept') expected.push(status);
    }
    const state: FamilyWeekState = expected.includes('missed')
      ? 'broken'
      : expected.includes('pending')
        ? 'pending'
        : expected.filter((s) => s !== 'paused').length === 0
          ? 'skip'
          : 'counted';
    rows.push({ weekStart: ws, state, freezeUsed: expected.includes('frozen') });
  }
  return rows;
}

/** The family's numbers (private.family_week_summary). */
export function familyWeekSummary(family: WeekFamily, today: string): FamilyWeekSummary {
  const year = today.slice(0, 4);
  let streak = 0;
  let longest = 0;
  let together = 0;
  let startedOn: string | null = null;
  let latest: FamilyWeekState | null = null;
  for (const r of familyWeeks(family, today)) {
    startedOn = startedOn ?? r.weekStart;
    latest = r.state;
    if (r.state === 'counted') {
      streak += 1;
      longest = Math.max(longest, streak);
      if (r.weekStart.slice(0, 4) === year) together += 1;
    } else if (r.state === 'broken') streak = 0;
  }
  return { familyStreak: streak, longestStreak: longest, weeksTogetherThisYear: together, startedOn, latestWeekState: latest };
}

/**
 * Past weeks, newest first, one row per member per week (private.family_week_history).
 * Others' frozen and missed read not_kept; only your own row names your freeze.
 */
export function familyWeekHistory(family: WeekFamily, myId: MemberId, today: string, weeks = HISTORY_WEEKS): PastWeekRow[] {
  const cur = weekStart(today, family.weekStartsOn);
  const first = family.members
    .map((m) => memberFirstWeek(m.joinedOn, family.saunafamStartedOn, family.weekStartsOn))
    .sort()[0];
  if (!first) return [];
  const fw = new Map(familyWeeks(family, today).map((r) => [r.weekStart, r]));
  const byJoin = [...family.members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id));
  const perMember = new Map(byJoin.map((m) => [m.id, new Map(memberWeeks(family, m.id, today).map((r) => [r.weekStart, r]))]));
  const rows: PastWeekRow[] = [];
  let n = 0;
  for (let ws = addDays(cur, -7); ws >= first && n < Math.max(1, weeks); ws = addDays(ws, -7), n++) {
    const f = fw.get(ws);
    for (const m of byJoin) {
      const r = perMember.get(m.id)?.get(ws);
      if (!r) continue;
      rows.push({
        weekStart: ws,
        familyState: f?.state ?? null,
        freezeUsed: f?.freezeUsed ?? false,
        memberId: m.id,
        status: m.id === myId || (r.status !== 'frozen' && r.status !== 'missed') ? r.status : 'not_kept',
        countedDays: r.countedDays,
        goal: r.goal,
        days: r.days,
      });
    }
  }
  return rows;
}

/** Everything the server's three week RPCs would return, worked out here. */
export function computeWeeks(family: WeekFamily, myId: MemberId, today: string, historyWeeks = HISTORY_WEEKS) {
  return {
    week: familyWeekSummary(family, today),
    memberWeeks: Object.fromEntries(family.members.map((m) => [m.id, memberWeekSummary(family, m.id, today)])) as Record<
      MemberId,
      MemberWeek
    >,
    history: familyWeekHistory(family, myId, today, historyWeeks),
  };
}

/**
 * A member's current week with sessions the server doesn't have yet (the outbox):
 * their days fill in and the week can turn kept straight away. Only the current
 * week moves; the next refresh brings the server's full answer.
 */
export function overlayPendingSessions(
  week: MemberWeek,
  pending: Pick<Session, 'memberId' | 'localDate' | 'durationMinutes'>[],
): MemberWeek {
  const end = addDays(week.weekStart, 6);
  const extra = pending
    .filter(
      (s) =>
        s.memberId === week.memberId &&
        s.localDate >= week.weekStart &&
        s.localDate <= end &&
        s.durationMinutes >= week.minMinutes,
    )
    .map((s) => s.localDate);
  if (!extra.length) return week;
  const countedDates = [...new Set([...week.countedDates, ...extra])].sort();
  const kept = countedDates.length >= week.goal;
  const newlyKept = kept && !week.keptThisWeek;
  const personalStreak = week.personalStreak + (newlyKept ? 1 : 0);
  return {
    ...week,
    countedDates,
    countedDays: countedDates.length,
    keptThisWeek: kept,
    personalStreak,
    longestPersonalStreak: Math.max(week.longestPersonalStreak, personalStreak),
  };
}
