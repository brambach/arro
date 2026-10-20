/** Local calendar-day helpers. A "day" is always the person's own local midnight-to-midnight. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-05" for a Date, in the device's local time zone. */
export function dayKey(d: Date = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "2026-10-05" for a Date, in UTC. */
export function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** The device's IANA time zone, such as "America/New_York". The server keeps each member's "today" in it. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Whether the server will take a workout dated yesterday right now. It allows the
 * member's own today and yesterday, but never a date before yesterday in UTC
 * (migration 20261005000006). West of UTC that closes "yesterday" once the UTC date
 * has moved past the local one: about 8pm in New York in summer, 5pm in Los Angeles.
 */
export function yesterdayOpen(now: Date = new Date()): boolean {
  return dayKey(now) >= utcDayKey(now);
}

/** Local time when "yesterday" stopped being loggable today (the last UTC midnight), such as "8:00 PM". */
export function yesterdayClosedAt(now: Date = new Date()): string {
  const midnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return timeLabel(midnightUtc);
}

/** Parse a day key back to a local Date at noon (noon dodges daylight-saving edges). */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, n: number): string {
  return dayKey(new Date(fromKey(key).getTime() + n * DAY_MS));
}

/** Whole days from a to b (b later = positive). */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / DAY_MS);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Monday, October 5" */
export function dateLabel(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "6:21 AM" */
export function timeLabel(d: Date): string {
  const h = d.getHours();
  const m = `${d.getMinutes()}`.padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** 07:00 to 21:00 on this phone, the same window the server keeps for pushes. */
export function inWakingHours(d: Date = new Date()): boolean {
  const h = d.getHours();
  return h >= 7 && h < 21;
}

export function greetingFor(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Mon=0 … Sun=6 */
export function weekdayIndex(key: string): number {
  return (fromKey(key).getDay() + 6) % 7;
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** When a break ends, from today: "today", "tomorrow", "Friday", or "Friday 31 Oct" further out. */
export function untilLabel(endKey: string, todayKey: string = dayKey()): string {
  const days = daysBetween(todayKey, endKey);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  const d = fromKey(endKey);
  return d.toLocaleDateString(undefined, days < 7 ? { weekday: 'long' } : { weekday: 'long', day: 'numeric', month: 'short' });
}

// ─── Weeks ───────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO weekday of a day key: Monday 1 to Sunday 7. */
export function isoWeekday(key: string): number {
  return weekdayIndex(key) + 1;
}

/**
 * The first day of the week a day falls in, for a family whose weeks start on
 * `weekStartsOn` (1 Monday, 7 Sunday). The same sum as private.week_start.
 */
export function weekStart(key: string, weekStartsOn: number): string {
  return addDays(key, -((isoWeekday(key) - weekStartsOn + 7) % 7));
}

/** The seven day keys of the week starting `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "Oct 5" */
export function shortDate(key: string): string {
  const d = fromKey(key);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "Monday" */
export function weekdayName(key: string): string {
  return WEEKDAYS[fromKey(key).getDay()];
}

/** The local day key of an ISO time on this phone. */
export function dayKeyOf(iso: string): string {
  return dayKey(new Date(iso));
}
