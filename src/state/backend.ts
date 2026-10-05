/**
 * Every call Arro makes to the hosted Supabase project. Screens never import this;
 * AppState.tsx calls it and buildView.ts turns what comes back into the screens' view.
 *
 * The database spells it `colour`; the app's Member type spells it `color`. The
 * mapping happens here and nowhere else.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { ReminderSlot, WorkoutSource, WorkoutType } from '../data/types';
import { addDays, dayKey } from './dates';
import { supabase } from './supabase';

/** The server refused the workout's date (migration 20261005000006: today or yesterday, never before yesterday in UTC). */
export class WorkoutDateError extends Error {}

/** A join code that doesn't exist or has expired, or too many wrong codes (preview_invite's limits). */
export class InviteError extends Error {
  constructor(public kind: 'notFound' | 'tooMany') {
    super(kind === 'tooMany' ? 'Too many tries. Wait a few minutes and try again.' : 'That code has expired or doesn’t exist.');
  }
}

export interface RemoteMember {
  id: string;
  userId: string;
  name: string;
  color: string;
  photoPath: string | null;
  timezone: string;
  joinedAt: string;
  joinedOn: string;
}

export interface RemoteWorkout {
  id: string;
  memberId: string;
  localDate: string;
  type: WorkoutType;
  minutes?: number;
  source: WorkoutSource;
  note?: string;
  createdAt: string;
  /** Member ids of everyone who cheered it. */
  cheeredBy: string[];
}

export interface FamilyStreak {
  current: number;
  longest: number;
  daysTogetherThisYear: number;
  startedOn: string | null;
}

export interface MemberStreak {
  personalStreak: number;
  movedToday: boolean;
  freezeAvailable: boolean;
  freezeBackOn: string | null;
}

/** One family as the server sees it right now. */
export interface RemoteFamily {
  id: string;
  name: string;
  joinCode: string;
  members: RemoteMember[];
  /** The last two months, enough for This Week and this month's profile stats. */
  workouts: RemoteWorkout[];
  streak: FamilyStreak;
  memberStreaks: Record<string, MemberStreak>;
}

export interface InvitePreview {
  familyName: string;
  memberCount: number;
  /** The rest is only filled in once signed in. */
  invitedBy: string | null;
  members: { name: string; color: string }[];
  familyStreak: number | null;
}

/** Reminder slots as the `time` the members table stores. */
const SLOT_TIMES: Record<ReminderSlot, string> = { morning: '08:00', lunch: '12:30', evening: '18:30' };

export const backendEnabled = supabase !== null;

function client() {
  if (!supabase) throw new Error('Supabase isn’t configured');
  return supabase;
}

type MemberRow = {
  id: string;
  user_id: string;
  family_id: string;
  display_name: string;
  colour: string;
  photo_path: string | null;
  timezone: string;
  joined_at: string;
  joined_on: string;
};

function toMember(row: MemberRow): RemoteMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
    color: row.colour,
    photoPath: row.photo_path,
    timezone: row.timezone,
    joinedAt: row.joined_at,
    joinedOn: row.joined_on,
  };
}

// ─── Sign-in ─────────────────────────────────────────────────────────────────

/** Sign in with Apple is iPhone-only here, and needs a development build or Expo Go on a device. */
export async function appleSignInAvailable(): Promise<boolean> {
  if (!supabase || Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Shows Apple's sheet and signs in to Supabase with the identity token. Apple only
 * sends the name the first time someone signs in to Arro, so givenName is often null.
 * Returns null if the person cancelled.
 */
export async function signInWithApple(): Promise<{ userId: string; givenName: string | null } | null> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      // Supabase's Apple sign-in expects the email scope; people can still hide it behind Apple's relay.
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple didn’t return an identity token');
  const { data, error } = await client().auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw error;
  return { userId: data.user.id, givenName: credential.fullName?.givenName ?? null };
}

/** The signed-in user's id, or null if the saved login is gone or expired. */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: 'local' });
}

/**
 * Deletes the auth user on the server, which removes their member rows, workouts,
 * cheers and nudges, and any family they leave empty (delete_my_account).
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await client().rpc('delete_my_account');
  if (error) throw error;
  // The user no longer exists, so a server-side sign-out would fail. Clear the local login only.
  await client().auth.signOut({ scope: 'local' }).catch(() => undefined);
}

// ─── Families ────────────────────────────────────────────────────────────────

/** The family this person is already in, for someone signing in again on a new phone. */
export async function myMembership(userId: string): Promise<{ memberId: string; familyId: string } | null> {
  const { data, error } = await client()
    .from('members')
    .select('id, family_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return data[0] ? { memberId: data[0].id, familyId: data[0].family_id } : null;
}

export async function createFamily(
  familyName: string,
  displayName: string,
  timezone: string,
  reminder: ReminderSlot,
): Promise<{ memberId: string; familyId: string }> {
  const { data, error } = await client().rpc('create_family', {
    p_family_name: familyName,
    p_display_name: displayName,
    p_timezone: timezone,
    p_reminder_time: SLOT_TIMES[reminder],
  });
  if (error) throw error;
  const row = data as MemberRow;
  return { memberId: row.id, familyId: row.family_id };
}

export async function renameFamily(familyId: string, name: string): Promise<void> {
  const { error } = await client().from('families').update({ name }).eq('id', familyId);
  if (error) throw error;
}

function isTooMany(error: { code?: string; message?: string }, status?: number): boolean {
  return status === 429 || error.code === 'PT429';
}

/** What a join code opens. Before sign-in only the name and member count come back. */
export async function previewInvite(code: string): Promise<InvitePreview> {
  const { data, error, status } = await client().rpc('preview_invite', { p_code: code });
  if (error) {
    if (isTooMany(error, status)) throw new InviteError('tooMany');
    throw error;
  }
  const row = (data as {
    family_name: string;
    member_count: number;
    invited_by_name: string | null;
    member_names: string[] | null;
    member_colours: string[] | null;
    family_streak: number | null;
  }[])[0];
  if (!row) throw new InviteError('notFound');
  return {
    familyName: row.family_name,
    memberCount: row.member_count,
    invitedBy: row.invited_by_name,
    members: (row.member_names ?? []).map((name, i) => ({ name, color: row.member_colours?.[i] ?? '#999999' })),
    familyStreak: row.family_streak,
  };
}

/**
 * Joins with a code. Not rate-limited yet: join_family has no throttle of its own,
 * so a signed-in person can try codes here without the limits preview_invite has.
 */
export async function joinFamily(
  code: string,
  displayName: string,
  timezone: string,
  reminder: ReminderSlot,
): Promise<{ memberId: string; familyId: string }> {
  const { data, error, status } = await client().rpc('join_family', {
    p_code: code,
    p_display_name: displayName,
    p_timezone: timezone,
    p_reminder_time: SLOT_TIMES[reminder],
  });
  if (error) {
    if (error.code === 'P0002') throw new InviteError('notFound');
    if (isTooMany(error, status)) throw new InviteError('tooMany');
    throw error;
  }
  const row = data as MemberRow;
  return { memberId: row.id, familyId: row.family_id };
}

/** The newest unexpired code for the family, making one if there's none. Codes last 14 days. */
export async function ensureInviteCode(familyId: string, memberId: string): Promise<string> {
  const db = client();
  const { data, error } = await db
    .from('invites')
    .select('code')
    .eq('family_id', familyId)
    .gt('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (data[0]) return data[0].code;
  const made = await db.from('invites').insert({ family_id: familyId, invited_by: memberId }).select('code').single();
  if (made.error) throw made.error;
  return made.data.code;
}

/** Everything the screens need for one family. */
export async function fetchFamily(familyId: string, myMemberId: string): Promise<RemoteFamily> {
  const db = client();
  const since = addDays(dayKey(), -62);

  const [family, members, streak, memberStreaks, joinCode] = await Promise.all([
    db.from('families').select('id, name').eq('id', familyId).single(),
    db.from('members').select('*').eq('family_id', familyId).order('joined_at', { ascending: true }),
    db.rpc('family_streak', { p_family_id: familyId }),
    db.rpc('member_streaks', { p_family_id: familyId }),
    ensureInviteCode(familyId, myMemberId),
  ]);
  if (family.error) throw family.error;
  if (members.error) throw members.error;
  if (streak.error) throw streak.error;
  if (memberStreaks.error) throw memberStreaks.error;

  const memberRows = (members.data as MemberRow[]).map(toMember);
  const memberIds = memberRows.map((m) => m.id);

  const workouts = await db
    .from('workouts')
    .select('id, member_id, local_date, type, duration_minutes, source, note, created_at, cheers (member_id)')
    .in('member_id', memberIds)
    .gte('local_date', since)
    .order('created_at', { ascending: false });
  if (workouts.error) throw workouts.error;

  const s = (streak.data as {
    family_streak: number;
    longest_streak: number;
    days_together_this_year: number;
    started_on: string | null;
  }[])[0];

  return {
    id: family.data.id,
    name: family.data.name,
    joinCode,
    members: memberRows,
    workouts: (workouts.data as {
      id: string;
      member_id: string;
      local_date: string;
      type: WorkoutType;
      duration_minutes: number | null;
      source: WorkoutSource;
      note: string | null;
      created_at: string;
      cheers: { member_id: string }[];
    }[]).map((w) => ({
      id: w.id,
      memberId: w.member_id,
      localDate: w.local_date,
      type: w.type,
      minutes: w.duration_minutes ?? undefined,
      source: w.source,
      note: w.note ?? undefined,
      createdAt: w.created_at,
      cheeredBy: w.cheers.map((c) => c.member_id),
    })),
    streak: {
      current: s?.family_streak ?? 0,
      longest: s?.longest_streak ?? 0,
      daysTogetherThisYear: s?.days_together_this_year ?? 0,
      startedOn: s?.started_on ?? null,
    },
    memberStreaks: Object.fromEntries(
      (memberStreaks.data as {
        member_id: string;
        personal_streak: number;
        moved_today: boolean;
        freeze_available: boolean;
        freeze_back_on: string | null;
      }[]).map((r) => [
        r.member_id,
        {
          personalStreak: r.personal_streak,
          movedToday: r.moved_today,
          freezeAvailable: r.freeze_available,
          freezeBackOn: r.freeze_back_on,
        },
      ]),
    ),
  };
}

// ─── Your own row and workouts ───────────────────────────────────────────────

export async function updateMember(
  memberId: string,
  patch: { name?: string; timezone?: string; reminder?: ReminderSlot },
): Promise<void> {
  const row: Record<string, string> = {};
  if (patch.name) row.display_name = patch.name;
  if (patch.timezone) row.timezone = patch.timezone;
  if (patch.reminder) row.reminder_time = SLOT_TIMES[patch.reminder];
  if (!Object.keys(row).length) return;
  const { error } = await client().from('members').update(row).eq('id', memberId);
  if (error) throw error;
}

/** A manual "I moved today" check-in. Photos stay on the phone until Storage is set up. */
export async function insertWorkout(
  memberId: string,
  input: { localDate: string; type: WorkoutType; minutes?: number; note?: string },
): Promise<string> {
  const { data, error } = await client()
    .from('workouts')
    .insert({
      member_id: memberId,
      local_date: input.localDate,
      type: input.type,
      duration_minutes: input.minutes ?? null,
      source: 'manual',
      note: input.note ?? null,
    })
    .select('id')
    .single();
  if (error) {
    // 22023: the check_workout_date trigger refused the date.
    if (error.code === '22023') throw new WorkoutDateError(error.message);
    throw error;
  }
  return data.id;
}
