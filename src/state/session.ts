/**
 * The saved session — the ONLY place the app reads or writes what survives a
 * restart. Phase 1 keeps it on the phone in AsyncStorage. Phase 2 replaces these
 * three functions with the real Supabase session; nothing else should touch storage.
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
  await AsyncStorage.removeItem(KEY);
}
