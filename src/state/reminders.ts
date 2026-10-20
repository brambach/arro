/**
 * Local notification copy and the weekly reminder schedule. The words are the
 * ones in design/copy/notifications.md, "Local notifications"; change both
 * together.
 *
 * iOS can't ask Saunafam "is the week kept?" when a reminder goes off, so the
 * app schedules them ahead and rebuilds the list on every refresh: on the days
 * the person picked, at their time, 4 weeks ahead, leaving out the rest of a
 * week once it's kept and any day they're on a break.
 */
import { numberWord } from '../data/saunas';
import { addDays, dayKey, fromKey, isoWeekday, weekStart } from './dates';

export const REMINDER_PREFIX = 'saunafam-reminder-';
export const TIMER_TARGET_ID = 'saunafam-timer-target';
export const TIMER_SAFETY_ID = 'saunafam-timer-safety';
/** Arro's identifiers ("arro-reminder-", "arro-saved-"), cancelled on build 9's first launch. */
export const LEGACY_PREFIX = 'arro-';

export const REMINDER_WEEKS_AHEAD = 4;
/** Thursday and Saturday (ISO weekdays), at 6:30 PM. */
export const DEFAULT_REMINDER_DAYS = [4, 6];
export const DEFAULT_REMINDER_TIME = '18:30';

export const NOTIFICATION_COPY = {
  /** "15 minutes in. Time to cool off." */
  timerTarget: (minutes: number) => `${minutes} minutes in. Time to cool off.`,
  timerSafety: 'Still in there? Time for water and fresh air.',
  /** "2 to go this week" */
  reminderTitle: (toGo: number) => `${toGo} to go this week`,
  /** "Ten minutes counts. Your family will see it." */
  reminderBody: (minMinutes: number) =>
    `${numberWord(minMinutes)} ${minMinutes === 1 ? 'minute' : 'minutes'} counts. Your family will see it.`,
} as const;

export interface ReminderPlan {
  /** ISO weekdays, 1 Monday to 7 Sunday. */
  days: number[];
  /** "18:30" */
  time: string;
  weekStartsOn: number;
  /** This week's goal and what's counted so far. */
  goal: number;
  countedDays: number;
  minMinutes: number;
  /** Breaks: local dates, both inclusive. No reminder on a day inside one. */
  pauses?: { startsOn: string; endsOn: string }[];
}

export interface ScheduledReminder {
  identifier: string;
  at: Date;
  title: string;
  body: string;
}

/** "18:30" to hours and minutes; anything else reads as 18:30. */
export function parseTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  const hour = m ? Number(m[1]) : 18;
  const minute = m ? Number(m[2]) : 30;
  return hour < 24 && minute < 60 ? { hour, minute } : { hour: 18, minute: 30 };
}

/**
 * The reminders to schedule, soonest first. This week's say how many are still
 * needed; later weeks assume the full goal, and the next refresh corrects them.
 * Built from local calendar days, so 6:30 PM stays 6:30 PM across a
 * daylight-saving change.
 */
export function weeklyReminders(plan: ReminderPlan, now: Date = new Date(), weeks = REMINDER_WEEKS_AHEAD): ScheduledReminder[] {
  if (!plan.days.length) return [];
  const { hour, minute } = parseTime(plan.time);
  const today = dayKey(now);
  const thisWeek = weekStart(today, plan.weekStartsOn);
  const lastDay = addDays(thisWeek, weeks * 7 - 1);
  const thisWeekToGo = Math.max(0, plan.goal - plan.countedDays);
  const onBreak = (d: string) => (plan.pauses ?? []).some((p) => p.startsOn <= d && d <= p.endsOn);
  const out: ScheduledReminder[] = [];
  for (let d = today; d <= lastDay; d = addDays(d, 1)) {
    if (!plan.days.includes(isoWeekday(d)) || onBreak(d)) continue;
    const inThisWeek = weekStart(d, plan.weekStartsOn) === thisWeek;
    const toGo = inThisWeek ? thisWeekToGo : plan.goal;
    if (toGo <= 0) continue;
    const day = fromKey(d);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    if (at.getTime() <= now.getTime()) continue;
    out.push({
      identifier: `${REMINDER_PREFIX}${d}`,
      at,
      title: NOTIFICATION_COPY.reminderTitle(toGo),
      body: NOTIFICATION_COPY.reminderBody(plan.minMinutes),
    });
  }
  return out;
}

/** Which scheduled identifiers are Arro's, to cancel. */
export function legacyIdentifiers(identifiers: string[]): string[] {
  return identifiers.filter((id) => id.startsWith(LEGACY_PREFIX));
}

/** "Thu and Sat" style labels are the screen's job; this keeps days valid and sorted. */
export function normalizeDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [...DEFAULT_REMINDER_DAYS];
  return [...new Set(days.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
}
