/**
 * The limits on breaks ("Pause me"), the same ones pause_me enforces on the server
 * (migration 20261018000001), so Take a break only offers lengths that will save:
 *   * one break is at most 14 days, counted from the day it started, so changing
 *     the length of a break that's already running can't stretch it past that;
 *   * at most 14 paused days in any 30, so breaks can't be chained to stay away for good.
 */
import { addDays, daysBetween } from './dates';

export const MAX_BREAK_DAYS = 14;
export const BREAK_WINDOW_DAYS = 30;

export interface BreakSpan {
  /** Local dates, both inclusive. */
  startsOn: string;
  endsOn: string;
}

/** The break `days` long from today would be: the running one, changed, or a new one. */
function proposedBreak(pauses: BreakSpan[], today: string, days: number): { span: BreakSpan; others: BreakSpan[] } {
  const current = pauses
    .filter((p) => p.startsOn <= today && today <= p.endsOn)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
  const span = { startsOn: current?.startsOn ?? today, endsOn: addDays(today, days - 1) };
  return { span, others: pauses.filter((p) => p !== current) };
}

function pausedDays(spans: BreakSpan[]): Set<string> {
  const days = new Set<string>();
  for (const s of spans) {
    for (let d = s.startsOn; d <= s.endsOn; d = addDays(d, 1)) days.add(d);
  }
  return days;
}

/** Why a break of `days` from today wouldn't save, or null when it would. */
export function breakProblem(pauses: BreakSpan[], today: string, days: number): 'tooLong' | 'tooMany' | null {
  const { span, others } = proposedBreak(pauses, today, days);
  if (daysBetween(span.startsOn, span.endsOn) >= MAX_BREAK_DAYS) return 'tooLong';
  const paused = pausedDays([...others, span]);
  for (let start = addDays(span.startsOn, -(BREAK_WINDOW_DAYS - 1)); start <= span.endsOn; start = addDays(start, 1)) {
    const end = addDays(start, BREAK_WINDOW_DAYS - 1);
    let n = 0;
    for (const d of paused) if (d >= start && d <= end) n += 1;
    if (n > MAX_BREAK_DAYS) return 'tooMany';
  }
  return null;
}

/** The first day from today a one-day break would fit, for "You can take one from Friday". */
export function nextBreakDay(pauses: BreakSpan[], today: string): string | null {
  for (let i = 0; i <= BREAK_WINDOW_DAYS; i++) {
    const day = addDays(today, i);
    if (!breakProblem(pauses, day, 1)) return day;
  }
  return null;
}
