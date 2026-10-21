/**
 * The Heat log (spec, Paid tier, "Family stats"): hours in the heat by month,
 * sessions by type and by place, the family's best run, and the longest
 * session by person. No ranking: people are listed alphabetically.
 *
 * Worked out on the phone from the family's sessions (the sessions table is
 * readable by every member). Plus is checked on the phone for this one, as the
 * spec allows for the visual extras.
 */
import type { MemberId, SaunaType, Session } from '../data/types';
import { saunaTypeLabels } from '../data/saunas';
import { shortDate } from './dates';

export type HeatSession = Pick<Session, 'id' | 'memberId' | 'sharedId' | 'localDate' | 'durationMinutes' | 'saunaType' | 'place'>;

export interface HeatLog {
  /** The last 12 months, oldest first. Person-minutes: two people in one session count twice. */
  months: { key: string; label: string; minutes: number }[];
  /** The biggest month, for scaling the bars. */
  maxMinutes: number;
  hoursThisYear: number;
  /** Sessions (a shared one counts once), most first. */
  types: { type: SaunaType; label: string; count: number }[];
  places: { place: string; count: number }[];
  /** The family's longest run of kept weeks. */
  bestRun: number;
  /** Alphabetical, everyone with at least one session. */
  longest: { memberId: MemberId; name: string; minutes: number; date: string }[];
  sessions: number;
  empty: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKeys(today: string, count: number): string[] {
  const [y, m] = today.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const back = count - 1 - i;
    const total = y * 12 + (m - 1) - back;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
}

export function heatLog(
  sessions: HeatSession[],
  members: { id: MemberId; name: string }[],
  bestRun: number,
  today: string,
): HeatLog {
  const keys = monthKeys(today, 12);
  const minutes = new Map(keys.map((k) => [k, 0]));
  const year = today.slice(0, 4);
  let yearMinutes = 0;
  for (const s of sessions) {
    const k = s.localDate.slice(0, 7);
    if (minutes.has(k)) minutes.set(k, (minutes.get(k) ?? 0) + s.durationMinutes);
    if (s.localDate.startsWith(year) && s.localDate <= today) yearMinutes += s.durationMinutes;
  }

  // One count per session: a shared session's rows all carry its sharedId.
  const unique = new Map<string, HeatSession>();
  for (const s of sessions) unique.set(s.sharedId ?? s.id, s);
  const typeCount = new Map<SaunaType, number>();
  const placeCount = new Map<string, { place: string; count: number }>();
  for (const s of unique.values()) {
    typeCount.set(s.saunaType, (typeCount.get(s.saunaType) ?? 0) + 1);
    const place = s.place?.trim();
    if (place) {
      const key = place.toLowerCase();
      const cur = placeCount.get(key);
      placeCount.set(key, { place: cur?.place ?? place, count: (cur?.count ?? 0) + 1 });
    }
  }

  const names = new Map(members.map((m) => [m.id, m.name]));
  const best = new Map<MemberId, HeatSession>();
  for (const s of sessions) {
    const cur = best.get(s.memberId);
    if (!cur || s.durationMinutes > cur.durationMinutes || (s.durationMinutes === cur.durationMinutes && s.localDate > cur.localDate)) {
      best.set(s.memberId, s);
    }
  }

  const months = keys.map((k) => ({ key: k, label: MONTHS[Number(k.slice(5)) - 1], minutes: minutes.get(k) ?? 0 }));
  return {
    months,
    maxMinutes: Math.max(0, ...months.map((m) => m.minutes)),
    hoursThisYear: Math.round(yearMinutes / 6) / 10,
    types: [...typeCount.entries()]
      .map(([type, count]) => ({ type, label: saunaTypeLabels[type], count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    places: [...placeCount.values()].sort((a, b) => b.count - a.count || a.place.localeCompare(b.place)).slice(0, 5),
    bestRun,
    longest: [...best.entries()]
      .filter(([id]) => names.has(id))
      .map(([id, s]) => ({ memberId: id, name: names.get(id) ?? '', minutes: s.durationMinutes, date: shortDate(s.localDate) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    sessions: unique.size,
    empty: sessions.length === 0,
  };
}

/** "6.5 hours", "1 hour", "40 minutes". */
export function hoursLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const h = Math.round(minutes / 6) / 10;
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}

/** The Heat log's blurred preview, shown without Plus: made-up but plausible numbers, never the family's. */
export function sampleHeatLog(today: string): HeatLog {
  const minutes = [180, 240, 310, 420, 520, 460, 300, 260, 340, 480, 560, 410];
  const keys = monthKeys(today, 12);
  return {
    months: keys.map((k, i) => ({ key: k, label: MONTHS[Number(k.slice(5)) - 1], minutes: minutes[i] })),
    maxMinutes: 560,
    hoursThisYear: 64.5,
    types: [
      { type: 'traditional', label: saunaTypeLabels.traditional, count: 41 },
      { type: 'wood_fired', label: saunaTypeLabels.wood_fired, count: 17 },
      { type: 'infrared', label: saunaTypeLabels.infrared, count: 9 },
    ],
    places: [
      { place: 'Home', count: 38 },
      { place: 'Gym sauna', count: 21 },
    ],
    bestRun: 12,
    longest: [],
    sessions: 67,
    empty: false,
  };
}
