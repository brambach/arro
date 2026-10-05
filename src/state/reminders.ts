/**
 * When the daily reminder fires. iOS can't ask Arro "moved today?" at the moment
 * a local notification goes off, so the app schedules one reminder per day ahead
 * and leaves today's out once this person has moved. Opening the app, logging a
 * workout or a Health sync schedules the list again.
 */
import { ReminderSlot } from '../data/types';
import { addDays, dayKey, fromKey } from './dates';

/** The clock time for each slot. Mirrors SLOT_TIMES in backend.ts (members.reminder_time). */
export const REMINDER_CLOCK: Record<ReminderSlot, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  lunch: { hour: 12, minute: 30 },
  evening: { hour: 18, minute: 30 },
};

/**
 * Two weeks ahead, well under iOS's 64 pending local notifications. Someone who
 * doesn't open Arro for longer than that stops getting reminders, which is fine.
 */
export const REMINDER_DAYS_AHEAD = 14;

export const REMINDER_COPY = {
  title: 'You still have today',
  body: 'A short walk counts. Your family will see it.',
};

/**
 * The local times the reminder should fire, soonest first: today's (if it's still
 * ahead and you haven't moved) and then one a day. Built from the local calendar
 * day, so it stays at 6:30 PM across a daylight-saving change.
 */
export function reminderTimes(
  slot: ReminderSlot,
  movedToday: boolean,
  now: Date = new Date(),
  days: number = REMINDER_DAYS_AHEAD,
): Date[] {
  const { hour, minute } = REMINDER_CLOCK[slot];
  const today = dayKey(now);
  const times: Date[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0 && movedToday) continue;
    const day = fromKey(addDays(today, i));
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    if (at.getTime() > now.getTime()) times.push(at);
  }
  return times;
}
