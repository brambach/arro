/**
 * Words and small sums for onboarding and Settings that don't belong in the
 * family view (buildView): reminder labels, the break lengths on offer, the
 * quiet Plus lines, the "Arro is now Saunafam" sheet. Pure, and tested in
 * src/state/__tests__/settingsCopy.test.ts. Every string here is also in
 * design/copy/app-copy.md.
 */
import type { PlusStatus } from '../data/types';
import { breakProblem, BreakSpan } from './breaks';
import { WEEKDAY_SHORT, addDays, daysBetween, shortDate, untilLabel, weekStart } from './dates';
import { clockTimeLabel, normalizeDays } from './reminders';

/** The week's days in the family's order: Monday first, or Sunday first. ISO weekdays. */
export function daysInOrder(weekStartsOn: number): number[] {
  return weekStartsOn === 7 ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
}

/** [4, 6] -> "Thu and Sat". Every day, weekdays and weekends get their own words. */
export function shortDaysLabel(days: number[]): string {
  const d = normalizeDays(days);
  if (d.length === 0) return 'No days';
  if (d.length === 7) return 'Every day';
  if (d.join() === '1,2,3,4,5') return 'Weekdays';
  if (d.join() === '6,7') return 'Weekends';
  const names = d.map((n) => WEEKDAY_SHORT[n - 1]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Settings' Notifications row: "Thu and Sat, 6:30 PM", or "Off". */
export function remindersValue(wanted: boolean, days: number[], time: string): string {
  if (!wanted || normalizeDays(days).length === 0) return 'Off';
  return `${shortDaysLabel(days)}, ${clockTimeLabel(time)}`;
}

/** The reminder line under the picker: "Thursday and Saturday at 6:30 PM, if you're behind." */
export function reminderSentence(days: number[], time: string): string {
  const d = normalizeDays(days);
  if (!d.length) return 'Pick at least one day.';
  return `${shortDaysLabel(d)} at ${clockTimeLabel(time)}, if your week isn’t kept yet.`;
}

/** Moves a "18:30" time by `minutes`, wrapping round the day. */
export function stepTime(time: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  const total = m ? Number(m[1]) * 60 + Number(m[2]) : 18 * 60 + 30;
  const next = (((total + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
}

export type BreakKey = 'rest' | 'week' | 'twoWeeks';

export interface BreakOption {
  key: BreakKey;
  title: string;
  /** "Until Sunday" */
  detail: string;
  /** Days counting today, as pause_me takes them. */
  days: number;
  /** False when the server's limits (14 days at once, 14 in any 30) wouldn't allow it. */
  fits: boolean;
}

/**
 * Take a break: Rest of this week, One week, Two weeks (spec, Settings). The
 * last day of the week follows the family's week start.
 */
export function breakOptions(pauses: BreakSpan[], today: string, weekStartsOn: number): BreakOption[] {
  const lastDay = addDays(weekStart(today, weekStartsOn), 6);
  const rest = daysBetween(today, lastDay) + 1;
  const make = (key: BreakKey, title: string, days: number): BreakOption => {
    const end = addDays(today, days - 1);
    return {
      key,
      title,
      days,
      detail: days === 1 ? 'Just today, back tomorrow' : `Until ${untilLabel(end, today)}`,
      fits: !breakProblem(pauses, today, days),
    };
  };
  return [make('rest', 'Rest of this week', rest), make('week', 'One week', 7), make('twoWeeks', 'Two weeks', 14)];
}

/**
 * The quiet Plus line under Settings' Plus rows, or null. Never a pop-up.
 * - The plan ended: "Plus ended on Oct 3. The wall is back to birch. Everything you logged is still here."
 * - Apple couldn't renew (the payer only, during the grace period).
 * - A yearly plan from someone who left ends within a week (everyone else).
 */
export function plusNotice(
  plus: Pick<PlusStatus, 'active' | 'status' | 'product' | 'expiresAt' | 'payerName' | 'payerIsMe'>,
  today: string,
): string | null {
  const ends = plus.expiresAt ? plus.expiresAt.slice(0, 10) : null;
  if (!plus.active && ends && (plus.status === 'expired' || plus.status === 'cancelled' || plus.status === 'billing_issue')) {
    return `Plus ended on ${shortDate(ends)}. The wall is back to birch. Everything you logged is still here.`;
  }
  if (plus.active && plus.payerIsMe && (plus.status === 'grace_period' || plus.status === 'billing_issue')) {
    return 'Apple couldn’t renew Plus. You can update your payment in Settings.';
  }
  if (
    plus.active &&
    !plus.payerIsMe &&
    plus.payerName === null &&
    plus.product === 'saunafam.plus.annual' &&
    ends &&
    daysBetween(today, ends) <= 7
  ) {
    return `Plus ends on ${shortDate(ends)}. The wall goes back to birch then, and everything you logged stays.`;
  }
  return null;
}

/** "Arro is now Saunafam" (spec, section 7). The rhythm follows the family's, which starts at 3 and 10. */
export const RENAMED_SHEET = {
  title: 'Arro is now Saunafam',
  body: (goal: number, minMinutes: number) =>
    `Your family is still here. We’ve moved from daily movement to a weekly sauna streak: ${goal} ${
      goal === 1 ? 'session' : 'sessions'
    } a week each, ${minMinutes} minutes or more. Everyone starts fresh at week one.`,
  gotIt: 'Got it',
  changeRhythm: 'Change the rhythm',
};

/** The sign-out confirm. A running timer and anything unsent are named, since signing out drops them. */
export function signOutBody(timerRunning: boolean, waiting: number): string {
  const parts = ['Your family and your streak stay. Sign in with Apple to come back.'];
  if (timerRunning) parts.push('The timer that’s running now will be thrown away.');
  if (waiting === 1) parts.push('One session hasn’t sent yet and will be lost.');
  if (waiting > 1) parts.push(`${waiting} sessions haven’t sent yet and will be lost.`);
  return parts.join(' ');
}

export const PLUS_PAYER_WARNING =
  'You pay for Saunafam Plus. Deleting your account doesn’t cancel it. Cancel in Settings, Apple ID, Subscriptions first.';
