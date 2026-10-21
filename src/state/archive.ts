/**
 * The family's whole history, for the Plus extras that go past 12 weeks:
 * Every week and the wall poster. Pure, and tested.
 */
import type { MemberId, PastWeekRow } from '../data/types';
import type { PosterWeek } from '../components/posterLayout';
import { historySlats, Slat } from './buildView';
import { addDays, shortDate } from './dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** How a past week reads on the wall and the poster. Same rule as Week's wall (slatStateOf). */
export function weekLook(s: Slat): PosterWeek {
  if (s.state === 'counted') return s.freezeUsed ? 'frozen' : 'kept';
  if (s.state === 'skip') return 'paused';
  if (s.state === 'solo' && s.freezeUsed) return 'frozen';
  return 'open';
}

/** "Mar 2, 2026" */
export function longDate(day: string): string {
  return `${shortDate(day)}, ${day.slice(0, 4)}`;
}

export interface MonthRow {
  /** "2026-10" */
  key: string;
  /** "October 2026" */
  label: string;
  weeks: { weekStart: string; look: PosterWeek }[];
  kept: number;
}

/** Every week, grouped by the month it starts in, newest month first, oldest week first inside it. */
export function monthRows(history: PastWeekRow[], myId: MemberId): MonthRow[] {
  const byMonth = new Map<string, MonthRow>();
  for (const s of historySlats(history, myId)) {
    const key = s.weekStart.slice(0, 7);
    const row = byMonth.get(key) ?? { key, label: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`, weeks: [], kept: 0 };
    const look = weekLook(s);
    row.weeks.push({ weekStart: s.weekStart, look });
    if (look === 'kept' || look === 'frozen') row.kept += 1;
    byMonth.set(key, row);
  }
  return [...byMonth.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export interface PosterData {
  weeks: PosterWeek[];
  dates: string;
  summary: string;
  kept: number;
}

/** The poster's weeks, oldest first, its date line and its count. */
export function posterData(history: PastWeekRow[], myId: MemberId): PosterData {
  const slats = historySlats(history, myId);
  const weeks = slats.map(weekLook);
  const kept = weeks.filter((w) => w === 'kept' || w === 'frozen').length;
  const first = slats[0]?.weekStart;
  const last = slats[slats.length - 1]?.weekStart;
  return {
    weeks,
    kept,
    dates: first && last ? `${longDate(first)} to ${longDate(addDays(last, 6))}` : '',
    summary: kept === 1 ? '1 week kept, together' : `${kept} weeks kept, together`,
  };
}
