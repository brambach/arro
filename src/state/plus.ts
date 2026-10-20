/**
 * When Saunafam Plus may appear (spec, "Paid tier", "When the paywall appears").
 * Pure functions; the nag memory is stored per member on this phone
 * (saunafam.plusNag.v1). A reinstall can show one extra card at most, which the
 * spec accepts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyWeekState, MemberId, PlusStatus } from '../data/types';
import { addDays, daysBetween, isoWeekday } from './dates';

export const PLUS_NAG_KEY = 'saunafam.plusNag.v1';
export const NAG_EVERY_DAYS = 60;
export const NAG_MAX_EVER = 3;
export const NAG_AFTER_KEPT_WEEKS = 8;
/** Nobody who joined less than 4 weeks ago sees an unprompted card. */
export const NAG_MIN_MEMBERSHIP_DAYS = 28;

export const PLUS_CARD_COPY = {
  body: 'Eight weeks of heat, together. Saunafam is free and always will be. If you’d like to make the wall your own, there’s Plus.',
  action: 'See Plus',
  notNow: 'Not now',
  never: 'Don’t show this again',
};

/**
 * Whether any Plus row, lock, wood or face may exist at all. While
 * app_config.plus_enabled is false: nothing, anywhere.
 */
export function plusVisible(config: { plusEnabled: boolean }): boolean {
  return config.plusEnabled;
}

/** Settings' Plus row: "Plus, from Maya", "Plus" for the payer, or null to offer the sheet. */
export function plusRowLabel(plus: PlusStatus): string | null {
  if (!plus.active) return null;
  if (plus.payerIsMe || !plus.payerName) return 'Plus';
  return `Plus, from ${plus.payerName}`;
}

/** The first Tuesday after a week (starting `ws`) has ended. */
export function tuesdayAfterWeek(ws: string): string {
  const after = addDays(ws, 7);
  return addDays(after, (2 - isoWeekday(after) + 7) % 7);
}

/**
 * The first day the quiet card may appear: the Tuesday after the family's 8th
 * counted week. `weeks` is the family's weeks oldest first, as far as the phone
 * knows. If fewer than 8 are known to be counted but the server says the family
 * has had at least 8 (an older history), it's eligible now: `fallbackToday`.
 */
export function nagEligibleFrom(
  weeks: { weekStart: string; state: FamilyWeekState | null }[],
  countedEver: number,
  fallbackToday: string,
): string | null {
  const counted = weeks.filter((w) => w.state === 'counted').sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const missingOlder = Math.max(0, countedEver - counted.length);
  const index = NAG_AFTER_KEPT_WEEKS - 1 - missingOlder;
  if (index < 0) return fallbackToday;
  const eighth = counted[index];
  return eighth ? tuesdayAfterWeek(eighth.weekStart) : null;
}

export interface NagMemory {
  /** Each time the card was shown: the day, and whether "Not now" closed it. */
  shows: { on: string; dismissed: boolean }[];
  /** "Don't show this again". */
  off: boolean;
}

export const EMPTY_NAG: NagMemory = { shows: [], off: false };

export interface NagInput {
  plusEnabled: boolean;
  familyHasPlus: boolean;
  /** Your own joined_on. */
  joinedOn: string;
  today: string;
  /** From nagEligibleFrom. */
  eligibleFrom: string | null;
  memory: NagMemory;
}

/**
 * 'hidden'; 'showing' (the current showing, not dismissed yet); or 'new' (show it
 * and call recordNagShown). At most once every 60 days per person, 3 times ever,
 * never after "Don't show this again".
 */
export function nagCardState(input: NagInput): 'hidden' | 'showing' | 'new' {
  const { memory } = input;
  if (!input.plusEnabled || input.familyHasPlus || memory.off) return 'hidden';
  if (daysBetween(input.joinedOn, input.today) < NAG_MIN_MEMBERSHIP_DAYS) return 'hidden';
  if (!input.eligibleFrom || input.today < input.eligibleFrom) return 'hidden';
  const last = memory.shows[memory.shows.length - 1];
  if (last && !last.dismissed) return 'showing';
  if (memory.shows.length >= NAG_MAX_EVER) return 'hidden';
  if (last && daysBetween(last.on, input.today) < NAG_EVERY_DAYS) return 'hidden';
  return 'new';
}

export function recordNagShown(memory: NagMemory, today: string): NagMemory {
  return { ...memory, shows: [...memory.shows, { on: today, dismissed: false }] };
}

/** "Not now": closes the current showing. */
export function dismissNag(memory: NagMemory): NagMemory {
  return { ...memory, shows: memory.shows.map((s, i) => (i === memory.shows.length - 1 ? { ...s, dismissed: true } : s)) };
}

/** "Don't show this again". */
export function turnOffNag(memory: NagMemory): NagMemory {
  return { shows: memory.shows.map((s) => ({ ...s, dismissed: true })), off: true };
}

export function parseNagMemory(raw: string | null): Record<MemberId, NagMemory> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, Partial<NagMemory>>;
    const out: Record<MemberId, NagMemory> = {};
    for (const [id, m] of Object.entries(v ?? {})) {
      out[id] = {
        off: m?.off === true,
        shows: Array.isArray(m?.shows)
          ? m.shows.filter((s) => s && typeof s.on === 'string').map((s) => ({ on: s.on, dismissed: s.dismissed === true }))
          : [],
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function loadNagMemory(): Promise<Record<MemberId, NagMemory>> {
  try {
    return parseNagMemory(await AsyncStorage.getItem(PLUS_NAG_KEY));
  } catch {
    return {};
  }
}

export async function saveNagMemory(memory: Record<MemberId, NagMemory>): Promise<void> {
  await AsyncStorage.setItem(PLUS_NAG_KEY, JSON.stringify(memory));
}
