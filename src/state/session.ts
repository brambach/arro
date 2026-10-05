/**
 * The saved session — the ONLY place the app reads or writes what survives a
 * restart, apart from the Supabase login, which supabase-js keeps under its own key.
 * With `remote` set, the family lives on the server and `workouts` stays empty;
 * without it, everything is on this phone as in phase 1.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoveMethod, ReminderSlot, WorkoutType } from '../data/types';

const KEY = 'arro.session.v1';

/** One workout this person logged. `localDate` is their own calendar day: today or yesterday only. */
export interface LoggedWorkout {
  id: string;
  localDate: string; // "2026-10-05"
  loggedAt: string; // ISO time, for the "6:21 AM" label
  type: WorkoutType;
  minutes?: number;
  note?: string;
  photoUri?: string | null;
}

export interface SavedSession {
  version: 1;
  /** Founders start a family; invitees join one that already has people in it. */
  role: 'founder' | 'invitee';
  me: {
    id: string;
    name: string;
    color: string;
    photoUri: string | null;
    moveMethod: MoveMethod;
    reminder: ReminderSlot;
    remindersWanted: boolean;
    joinedOn: string; // day key
  };
  family: {
    name: string;
    joinCode: string;
    /** People the founder invited who haven't joined. Phase 2 reads these from the server. */
    invited: { id: string; name: string }[];
  };
  workouts: LoggedWorkout[];
  /** Set once signed in with Apple and in a family on the server. */
  remote?: { userId: string; memberId: string; familyId: string };
  /** Photos for server workouts, by workout id. They stay on this phone until Storage is set up. */
  photos?: Record<string, string>;
}

const FAMILY_KEY = 'arro.family.v1';

/** The last family the server sent, so Today opens straight away and works offline. */
export async function loadCachedFamily<T>(): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(FAMILY_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveCachedFamily(family: unknown): Promise<void> {
  await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(family));
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: SavedSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([KEY, FAMILY_KEY]);
}

const MOVE_METHOD_KEY = 'arro.moveMethod.v1';

/**
 * How this person moves, kept apart from the session so signing out doesn't
 * forget it: Apple Health belongs to the phone, and the server doesn't store it.
 */
export async function loadMoveMethod(): Promise<MoveMethod | null> {
  try {
    const raw = await AsyncStorage.getItem(MOVE_METHOD_KEY);
    return raw === 'health' || raw === 'manual' ? raw : null;
  } catch {
    return null;
  }
}

export async function saveMoveMethod(method: MoveMethod): Promise<void> {
  await AsyncStorage.setItem(MOVE_METHOD_KEY, method);
}

export async function clearMoveMethod(): Promise<void> {
  await AsyncStorage.removeItem(MOVE_METHOD_KEY);
}
