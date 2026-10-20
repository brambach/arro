/**
 * What the phone keeps between launches (spec, section 6, "Stored data on the phone"):
 *
 *   arro.session.v1   who you are and your family on the server. Kept from Arro
 *                     so testers stay signed in; older shapes are read and
 *                     filled in (normalizeSession).
 *   arro.family.v2    the last family the server sent (a FamilySnapshot), so
 *                     screens render from cache first. v1 had Arro's shape and
 *                     is deleted on launch.
 *   Supabase's own auth key, which supabase-js keeps.
 *
 * Arro's arro.family.v1 and arro.moveMethod.v1 are deleted on launch
 * (clearLegacyStorage). New keys use the saunafam. prefix and live with their
 * modules: timer.ts, outbox.ts, milestones.ts, plus.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilySnapshot } from '../data/types';
import { DEFAULT_REMINDER_DAYS, DEFAULT_REMINDER_TIME, normalizeDays } from './reminders';

export const SESSION_KEY = 'arro.session.v1';
export const FAMILY_KEY = 'arro.family.v2';
export const LEGACY_KEYS = ['arro.family.v1', 'arro.moveMethod.v1'];
/** "Arro is now Saunafam", shown once. */
export const WELCOMED_KEY = 'saunafam.welcomed.v1';

export interface SavedSession {
  version: 1;
  /** Founders start a family; invitees join one. */
  role: 'founder' | 'invitee';
  me: {
    id: string;
    name: string;
    color: string;
    photoUri: string | null;
    /** ISO weekdays for the weekly reminder, 1 Monday to 7 Sunday. */
    reminderDays: number[];
    /** "18:30" */
    reminderTime: string;
    remindersWanted: boolean;
    joinedOn: string;
  };
  family: {
    name: string;
    joinCode: string;
    /** People invited by name who haven't joined. The server doesn't know names, so this stays on the phone. */
    invited: { id: string; name: string }[];
  };
  /** Set once signed in with Apple and in a family on the server. */
  remote?: { userId: string; memberId: string; familyId: string };
  /** Session photos still on this phone (upload failed or pending), by session id or client id. */
  photos?: Record<string, string>;
}

/** Arro's reminder slots, read once from an older session. */
const SLOT_TIMES: Record<string, string> = { morning: '08:00', lunch: '12:30', evening: '18:30' };

/**
 * A stored session in any shape this key has had, as today's shape, or null if
 * it isn't one. Arro's `workouts`, `moveMethod`, `dismissedHealth` and
 * `reminder` slot are dropped; the slot becomes a time.
 */
export function normalizeSession(raw: unknown): SavedSession | null {
  const v = raw as Partial<SavedSession> & {
    me?: Partial<SavedSession['me']> & { reminder?: string };
  };
  if (!v || v.version !== 1 || !v.me || typeof v.me.id !== 'string' || !v.family) return null;
  const me = v.me;
  return {
    version: 1,
    role: v.role === 'invitee' ? 'invitee' : 'founder',
    me: {
      id: me.id as string,
      name: me.name ?? 'You',
      color: me.color ?? '#5F8794',
      photoUri: me.photoUri ?? null,
      reminderDays: me.reminderDays ? normalizeDays(me.reminderDays) : [...DEFAULT_REMINDER_DAYS],
      reminderTime: me.reminderTime ?? (me.reminder ? SLOT_TIMES[me.reminder] : undefined) ?? DEFAULT_REMINDER_TIME,
      remindersWanted: me.remindersWanted !== false,
      joinedOn: me.joinedOn ?? '2026-01-01',
    },
    family: {
      name: v.family.name ?? '',
      joinCode: v.family.joinCode ?? '',
      invited: Array.isArray(v.family.invited) ? v.family.invited : [],
    },
    ...(v.remote ? { remote: v.remote } : {}),
    photos: v.photos ?? {},
  };
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? normalizeSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: SavedSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** A cached family, or null for anything that isn't a v2 snapshot. */
export function parseCachedFamily(raw: string | null): FamilySnapshot | null {
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as Partial<FamilySnapshot>;
    if (!f || typeof f.id !== 'string' || !Array.isArray(f.members) || !Array.isArray(f.sessions) || !f.week || !f.memberWeeks) {
      return null;
    }
    return {
      ...(f as FamilySnapshot),
      myRecent: f.myRecent ?? [],
      cheers: f.cheers ?? [],
      comments: f.comments ?? [],
      pauses: f.pauses ?? [],
      rules: f.rules ?? [],
      history: f.history ?? [],
      recentPlaces: f.recentPlaces ?? [],
    };
  } catch {
    return null;
  }
}

export async function loadCachedFamily(): Promise<FamilySnapshot | null> {
  try {
    return parseCachedFamily(await AsyncStorage.getItem(FAMILY_KEY));
  } catch {
    return null;
  }
}

export async function saveCachedFamily(family: FamilySnapshot): Promise<void> {
  await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(family));
}

/** Arro's keys this build doesn't read. Safe on every launch. */
export async function clearLegacyStorage(): Promise<void> {
  await AsyncStorage.multiRemove(LEGACY_KEYS);
}

/** Signing out: the session and the cached family. The timer, outbox and drafts are cleared by AppState. */
export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_KEY, FAMILY_KEY]);
}

export async function loadWelcomed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOMED_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function saveWelcomed(): Promise<void> {
  await AsyncStorage.setItem(WELCOMED_KEY, '1');
}
