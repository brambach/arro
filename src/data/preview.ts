/**
 * The preview family, "Sunday sauna": Sam (you, who started it), Maya and Jo,
 * with eight weeks of believable sessions and one freeze. Every screen can
 * render from it without Supabase: the dev-only Prototype preview in Settings,
 * the web build, Jest, and later agents' screenshots.
 *
 * Statuses and streaks aren't typed in by hand. The sessions and breaks are,
 * and src/state/weeks.ts works the weeks out by the same rules as the server.
 *
 * The preview runs on its own clock (previewNow): Thursday of the real current
 * week at 4:10 PM, so screenshots look the same whatever day they're taken.
 * Scenarios change the clock, the family or the app state around it.
 * Names are the sample names only; places are generic.
 */
import { addDays, dayKey, fromKey, weekStart } from '../state/dates';
import { computeWeeks, WeekFamily } from '../state/weeks';
import type { OutboxEntry, SessionDraft } from '../state/outbox';
import type { TimerState } from '../state/timer';
import { paletteColor } from './palette';
import { recentPlaces } from './saunas';
import {
  AppConfig,
  FamilyMember,
  FamilySnapshot,
  Pause,
  PlusStatus,
  SaunaType,
  Session,
  SessionCheer,
  SessionComment,
  SessionStats,
  WeekStartsOn,
} from './types';

export const PREVIEW_ME = 'sam';
export const PREVIEW_FAMILY_NAME = 'Sunday sauna';
export const PREVIEW_JOIN_CODE = 'SAUNA234';

export type PreviewScenarioId =
  | 'family'
  | 'solo'
  | 'newFamily'
  | 'brokenStreak'
  | 'onBreak'
  | 'mondayOpen'
  | 'milestone'
  | 'timerRunning'
  | 'timerStale'
  | 'offline'
  | 'draft'
  | 'plusEnabled'
  | 'plusActive'
  | 'sundayStart'
  | 'updateRequired'
  | 'loading'
  | 'error';

/** Every scenario, in the order the Prototype preview lists them. */
export const PREVIEW_SCENARIOS: { id: PreviewScenarioId; label: string }[] = [
  { id: 'family', label: 'Sunday sauna, 8 weeks together' },
  { id: 'solo', label: 'Solo founder' },
  { id: 'newFamily', label: 'New family, nothing logged' },
  { id: 'brokenStreak', label: 'After a broken streak' },
  { id: 'onBreak', label: 'Jo on a break' },
  { id: 'mondayOpen', label: 'Monday, last week not kept' },
  { id: 'milestone', label: '8-week milestone due' },
  { id: 'timerRunning', label: 'Timer running' },
  { id: 'timerStale', label: 'Timer 3 hours old' },
  { id: 'offline', label: 'Offline, one session waiting' },
  { id: 'draft', label: 'A session the server refused' },
  { id: 'plusEnabled', label: 'Plus switched on, quiet card due' },
  { id: 'plusActive', label: 'Plus, from Maya' },
  { id: 'sundayStart', label: 'Week starts on Sunday' },
  { id: 'updateRequired', label: 'Update required' },
  { id: 'loading', label: 'Loading, nothing cached' },
  { id: 'error', label: 'Couldn’t load, nothing cached' },
];

export interface PreviewScenario {
  id: PreviewScenarioId;
  /** The preview's clock. */
  now: Date;
  /** null for loading and error. */
  family: FamilySnapshot | null;
  status: 'ready' | 'loading' | 'error';
  offline: boolean;
  config: AppConfig;
  /** People invited by name who haven't joined. */
  invited: { id: string; name: string }[];
  timer: TimerState | null;
  outbox: OutboxEntry[];
  drafts: SessionDraft[];
  /** Whether milestones up to now count as already shown (only "milestone" says no). */
  milestonesShown: boolean;
}

// ─── The family ──────────────────────────────────────────────────────────────

/** members.colour as the server hands them out, in join order. */
const PALETTE = { sam: paletteColor(0), maya: paletteColor(1), jo: paletteColor(2) };

/** Thursday of the real week at 4:10 PM, or Monday 8:10 AM for "mondayOpen". */
export function previewNow(realNow: Date, monday = false): Date {
  const monday0 = weekStart(dayKey(realNow), 1);
  const day = fromKey(monday ? monday0 : addDays(monday0, 3));
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), monday ? 8 : 16, 10);
}

interface Plan {
  weekStartsOn: WeekStartsOn;
  /** Weeks before the current one the family has been on Saunafam. */
  pastWeeks: number;
  members: ('sam' | 'maya' | 'jo')[];
  /** Per member, per week offset (-pastWeeks .. 0), the day offsets in that week they went. */
  days: (member: string, week: number) => number[];
  /** The day offset of "today" in the current week. */
  todayOffset: number;
  pauses?: (ws0: string) => Pause[];
  /** Jo's short session this week (saved, shown, doesn't count). On unless false. */
  extras?: boolean;
}

const PLACES = ['Home', 'The Y', 'Lake cabin', 'Gym sauna'];
const TYPES: SaunaType[] = ['traditional', 'traditional', 'wood_fired', 'infrared', 'steam', 'traditional', 'smoke'];

function iso(day: string, hour: number, minute: number): string {
  const d = fromKey(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString();
}

/** A deterministic little hash, so the same plan always makes the same sessions. */
function pick(seed: string, n: number): number {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 100_003;
  return h % n;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function makeSession(memberId: string, day: string, overrides: Partial<Session> = {}): Session {
  const seed = `${memberId}${day}`;
  const hour = [7, 12, 18, 19, 20][pick(seed, 5)];
  const minutes = [15, 20, 20, 25, 30][pick(`${seed}m`, 5)];
  const type = TYPES[pick(`${seed}t`, TYPES.length)];
  const startedAt = iso(day, hour, [0, 10, 20, 40][pick(`${seed}h`, 4)]);
  const id = overrides.id ?? nextId(`${memberId}-${day}`);
  return {
    id,
    memberId,
    sharedId: null,
    loggedBy: memberId,
    startedAt,
    localDate: day,
    durationMinutes: minutes,
    rounds: 1 + pick(`${seed}r`, 3),
    saunaType: type,
    tempC: type === 'infrared' ? 60 : type === 'steam' ? 45 : [80, 85, 90][pick(`${seed}c`, 3)],
    humidityPct: type === 'steam' ? 100 : null,
    coldPlunge: pick(`${seed}p`, 3) === 0,
    coldMinutes: null,
    place: PLACES[pick(`${seed}l`, PLACES.length)],
    note: null,
    photoPath: null,
    photoUrl: null,
    source: pick(`${seed}s`, 2) === 0 ? 'timer' : 'manual',
    clientId: `00000000-0000-4000-8000-${`${idCounter}`.padStart(12, '0')}`,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
}

function members(ids: Plan['members'], startedOn: string): FamilyMember[] {
  return ids.map((id, i) => ({
    id,
    userId: `user-${id}`,
    name: id === 'sam' ? 'Sam' : id === 'maya' ? 'Maya' : 'Jo',
    color: PALETTE[id],
    photoPath: null,
    photoUrl: null,
    timezone: 'America/Los_Angeles',
    joinedAt: `${addDays(startedOn, -60 + i)}T17:00:00.000Z`,
    joinedOn: addDays(startedOn, -60 + i),
    weekendCheckin: true,
  }));
}

/** Who went when, for the default "Sunday sauna": everyone keeps 3 a week; Maya's freeze covered week -5. */
function defaultDays(member: string, week: number): number[] {
  if (week === 0) {
    // This week, to Thursday: Sam 2 of 3, Maya kept, Jo 1 of 3 (plus a short one that doesn't count).
    return member === 'sam' ? [0, 2] : member === 'maya' ? [0, 2, 3] : [2];
  }
  if (member === 'maya' && week === -5) return [5];
  const rotations: Record<string, number[][]> = {
    sam: [[1, 3, 5], [0, 2, 6], [1, 4, 6]],
    maya: [[0, 2, 4], [2, 3, 6], [0, 4, 5]],
    jo: [[1, 5, 6], [0, 3, 5], [2, 4, 6]],
  };
  return rotations[member][Math.abs(week) % 3];
}

function buildFamily(plan: Plan, now: Date, extra?: (f: FamilySnapshot) => void): FamilySnapshot {
  idCounter = 0;
  const today = dayKey(now);
  const ws0 = weekStart(today, plan.weekStartsOn);
  const startedOn = addDays(ws0, -7 * plan.pastWeeks);
  const memberRows = members(plan.members, startedOn);
  const sessions: Session[] = [];
  for (let week = -plan.pastWeeks; week <= 0; week++) {
    const ws = addDays(ws0, week * 7);
    for (const m of plan.members) {
      for (const offset of plan.days(m, week)) {
        const day = addDays(ws, offset);
        if (day < startedOn || day > today || (week === 0 && offset > plan.todayOffset)) continue;
        // Today's sessions happened before the preview clock: late morning.
        const earlier = day === today ? { startedAt: iso(day, 7 + plan.members.indexOf(m) * 2, 15) } : {};
        sessions.push(makeSession(m, day, { ...earlier, ...('startedAt' in earlier ? { createdAt: earlier.startedAt, updatedAt: earlier.startedAt } : {}) }));
      }
    }
  }

  // This week's shared session: Maya logged it for herself, Jo and Sam, on day 2.
  const sharedDay = addDays(ws0, 2);
  const cheers: SessionCheer[] = [];
  const comments: SessionComment[] = [];
  if (plan.members.length === 3 && sharedDay <= today) {
    const together = sessions.filter((s) => s.localDate === sharedDay);
    const anchor = together.find((s) => s.memberId === 'maya');
    if (anchor && together.length > 1) {
      const base = {
        startedAt: iso(sharedDay, 19, 30),
        durationMinutes: 25,
        rounds: 3,
        saunaType: 'wood_fired' as SaunaType,
        tempC: 85,
        coldPlunge: true,
        coldMinutes: 2,
        place: 'Lake cabin',
        clientId: '00000000-0000-4000-8000-00000000beef',
      };
      for (const s of together) {
        Object.assign(s, base, { sharedId: anchor.id, loggedBy: 'maya', note: s === anchor ? 'Three rounds and the lake. Perfect.' : null });
      }
      cheers.push({ id: 'cheer-1', sessionId: anchor.id, memberId: 'sam', createdAt: iso(sharedDay, 21, 0) });
      comments.push(
        { id: 'comment-1', sessionId: anchor.id, memberId: 'jo', body: 'Cold plunge hero', createdAt: iso(sharedDay, 21, 5) },
        { id: 'comment-2', sessionId: anchor.id, memberId: 'sam', body: 'Needed that', createdAt: iso(sharedDay, 21, 20) },
      );
    }
    // Jo's short one on day 1: saved, shown, doesn't count.
    if (plan.extras !== false && addDays(ws0, 1) <= today) sessions.push(makeSession('jo', addDays(ws0, 1), { durationMinutes: 8, place: 'Gym sauna', saunaType: 'traditional' }));
    const mayaToday = sessions.find((s) => s.memberId === 'maya' && s.localDate === addDays(ws0, 3));
    if (mayaToday) {
      mayaToday.note = 'Quiet one after work.';
      cheers.push({ id: 'cheer-2', sessionId: mayaToday.id, memberId: 'jo', createdAt: mayaToday.startedAt });
    }
  }

  const pauses = plan.pauses?.(ws0) ?? [];
  const engineFamily: WeekFamily = {
    weekStartsOn: plan.weekStartsOn,
    saunafamStartedOn: startedOn,
    goalPerWeek: 3,
    minMinutes: 10,
    rules: [{ effectiveFrom: weekStart(startedOn, plan.weekStartsOn), goalPerWeek: 3, minMinutes: 10 }],
    members: memberRows,
    sessions,
    pauses,
  };
  const weeks = computeWeeks(engineFamily, PREVIEW_ME, today);
  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const lastWeek = addDays(ws0, -7);
  const mine = sorted.filter((s) => s.memberId === PREVIEW_ME);
  const month = today.slice(0, 7);
  const typeCounts = new Map<SaunaType, number>();
  for (const s of mine) typeCounts.set(s.saunaType, (typeCounts.get(s.saunaType) ?? 0) + 1);
  const stats: SessionStats = {
    sessionsThisMonth: mine.filter((s) => s.localDate.startsWith(month)).length,
    minutesThisYear: mine.filter((s) => s.localDate.startsWith(today.slice(0, 4))).reduce((n, s) => n + s.durationMinutes, 0),
    favoriteSaunaType: [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    favoritePlace: mine.length ? 'Home' : null,
  };
  const family: FamilySnapshot = {
    id: 'preview-family',
    name: PREVIEW_FAMILY_NAME,
    joinCode: PREVIEW_JOIN_CODE,
    weekStartsOn: plan.weekStartsOn,
    goalPerWeek: 3,
    minMinutes: 10,
    saunafamStartedOn: startedOn,
    members: memberRows,
    rules: engineFamily.rules,
    sessions: sorted.filter((s) => s.localDate >= lastWeek),
    myRecent: mine.slice(0, 3),
    cheers,
    comments,
    pauses,
    week: weeks.week,
    memberWeeks: weeks.memberWeeks,
    history: weeks.history,
    stats,
    plus: NO_PREVIEW_PLUS,
    recentPlaces: recentPlaces(sorted),
    fetchedAt: now.toISOString(),
  };
  extra?.(family);
  return family;
}

const NO_PREVIEW_PLUS: PlusStatus = {
  active: false,
  product: null,
  status: null,
  expiresAt: null,
  payerName: null,
  payerIsMe: false,
  wallWood: 'birch',
};

const CONFIG: AppConfig = { minIosBuild: 9, plusEnabled: false };

const DEFAULT_PLAN: Plan = {
  weekStartsOn: 1,
  pastWeeks: 8,
  members: ['sam', 'maya', 'jo'],
  days: defaultDays,
  todayOffset: 3,
};

/** The default family on a given clock: what most scenarios start from. */
export function previewFamily(now: Date, plan: Partial<Plan> = {}, extra?: (f: FamilySnapshot) => void): FamilySnapshot {
  return buildFamily({ ...DEFAULT_PLAN, ...plan }, now, extra);
}

function pendingEntry(now: Date): OutboxEntry {
  const startedAt = new Date(now.getTime() - 50 * 60_000).toISOString();
  return {
    input: {
      familyId: 'preview-family',
      clientId: '00000000-0000-4000-8000-0000000c0ffe',
      startedAt,
      durationMinutes: 20,
      saunaType: 'traditional',
      rounds: 2,
      tempC: 82,
      humidityPct: null,
      coldPlunge: false,
      coldMinutes: null,
      place: 'Home',
      note: null,
      source: 'timer',
      withIds: [],
    },
    memberId: PREVIEW_ME,
    photoUri: null,
    createdAt: startedAt,
    attempts: 3,
    nextAttemptAt: now.getTime() + 20_000,
    lastError: 'Network request failed',
  };
}

/** One scenario, built fresh. `realNow` drives the timer (which always runs on the real clock). */
export function buildPreviewScenario(id: PreviewScenarioId, realNow: Date = new Date()): PreviewScenario {
  const now = previewNow(realNow, id === 'mondayOpen');
  const base: PreviewScenario = {
    id,
    now,
    family: null,
    status: 'ready',
    offline: false,
    config: CONFIG,
    invited: [],
    timer: null,
    outbox: [],
    drafts: [],
    milestonesShown: true,
  };
  switch (id) {
    case 'loading':
      return { ...base, status: 'loading' };
    case 'error':
      return { ...base, status: 'error', offline: true };
    case 'solo':
      return {
        ...base,
        family: previewFamily(now, { members: ['sam'] }),
        invited: [{ id: 'invite-maya', name: 'Maya' }],
      };
    case 'newFamily':
      return { ...base, family: previewFamily(now, { pastWeeks: 0, days: () => [], extras: false }) };
    case 'brokenStreak':
      return {
        ...base,
        family: previewFamily(now, {
          days: (m, w) => (m === 'jo' && (w === -3 || w === -1) ? [2] : w === 0 && m !== 'maya' ? [] : defaultDays(m, w)),
        }),
      };
    case 'onBreak':
      return {
        ...base,
        family: previewFamily(now, {
          days: (m, w) => (m === 'jo' && w === 0 ? [] : defaultDays(m, w)),
          pauses: (ws0) => [{ memberId: 'jo', startsOn: addDays(ws0, 1), endsOn: addDays(ws0, 5) }],
        }),
      };
    case 'mondayOpen':
      return {
        ...base,
        family: previewFamily(now, {
          todayOffset: 0,
          days: (m, w) => (m === 'sam' && w === -1 ? [1, 3] : w === 0 ? [] : defaultDays(m, w)),
        }),
      };
    case 'milestone':
      return { ...base, family: previewFamily(now), milestonesShown: false };
    case 'timerRunning':
      return {
        ...base,
        family: previewFamily(now),
        timer: {
          startedAt: new Date(realNow.getTime() - (12 * 60 + 4) * 1000).toISOString(),
          rounds: [{ start: new Date(realNow.getTime() - (12 * 60 + 4) * 1000).toISOString(), end: null }],
          targetMinutes: 15,
          saunaType: 'traditional',
        },
      };
    case 'timerStale': {
      const start = new Date(realNow.getTime() - (3 * 60 + 10) * 60_000).toISOString();
      return { ...base, family: previewFamily(now), timer: { startedAt: start, rounds: [{ start, end: null }], targetMinutes: 15, saunaType: 'wood_fired' } };
    }
    case 'offline':
      return { ...base, family: previewFamily(now), offline: true, outbox: [pendingEntry(now)] };
    case 'draft': {
      const entry = pendingEntry(now);
      return {
        ...base,
        family: previewFamily(now),
        drafts: [
          {
            input: { ...entry.input, startedAt: addDaysIso(entry.input.startedAt, -3) },
            memberId: PREVIEW_ME,
            photoUri: null,
            refusedAt: now.toISOString(),
            code: '22023',
            message: 'sessions can only be logged for today or yesterday',
          },
        ],
      };
    }
    case 'plusEnabled':
      return { ...base, family: previewFamily(now), config: { ...CONFIG, plusEnabled: true } };
    case 'plusActive':
      return {
        ...base,
        config: { ...CONFIG, plusEnabled: true },
        family: previewFamily(now, {}, (f) => {
          f.plus = {
            active: true,
            product: 'saunafam.plus.annual',
            status: 'active',
            expiresAt: new Date(now.getTime() + 300 * 86_400_000).toISOString(),
            payerName: 'Maya',
            payerIsMe: false,
            wallWood: 'cedar',
          };
        }),
      };
    case 'sundayStart':
      return { ...base, family: previewFamily(now, { weekStartsOn: 7, todayOffset: 4 }) };
    case 'updateRequired':
      return { ...base, family: previewFamily(now), config: { ...CONFIG, minIosBuild: 99 } };
    default:
      return { ...base, family: previewFamily(now) };
  }
}

function addDaysIso(isoTime: string, days: number): string {
  return new Date(new Date(isoTime).getTime() + days * 86_400_000).toISOString();
}

/** The preview family's people, for onboarding's "Meet the family" without a server. */
export const PREVIEW_MEMBERS = [
  { name: 'Sam', color: PALETTE.sam },
  { name: 'Maya', color: PALETTE.maya },
  { name: 'Jo', color: PALETTE.jo },
];
