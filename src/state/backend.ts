/**
 * Every call Arro makes to the hosted Supabase project. Screens never import this;
 * AppState.tsx calls it and buildView.ts turns what comes back into the screens' view.
 *
 * The database spells it `colour`; the app's Member type spells it `color`. The
 * mapping happens here and nowhere else.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { ReminderSlot, WorkoutSource, WorkoutType } from '../data/types';
import { addDays, dayKey } from './dates';
import { supabase } from './supabase';

/** The server refused the workout's date (migration 20261005000006: today or yesterday, never before yesterday in UTC). */
export class WorkoutDateError extends Error {}

/** A join code that doesn't exist or has expired, too many wrong codes, or a family that's full (migration 20261017000001). */
export class InviteError extends Error {
  constructor(public kind: 'notFound' | 'tooMany' | 'full') {
    super(
      kind === 'tooMany'
        ? 'Too many tries. Wait a few minutes and try again.'
        : kind === 'full'
          ? 'That family already has 12 people, which is as many as Arro allows.'
          : 'That code has expired or doesn’t exist.',
    );
  }
}

/** pause_me refused the break (migration 20261018000001): longer than 14 days, or over 14 days in 30. */
export class BreakError extends Error {
  constructor(public kind: 'tooLong' | 'tooMany') {
    super(
      kind === 'tooLong'
        ? 'A break can be up to two weeks long, counted from the day it started.'
        : 'You can be on a break for up to 14 days in any 30.',
    );
  }
}

export interface RemoteMember {
  id: string;
  userId: string;
  name: string;
  color: string;
  photoPath: string | null;
  /** A signed link to the profile photo, for anyone in the family. */
  photoUrl: string | null;
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
  /** When a Health workout actually started. Check-ins don't have one. */
  startedAt?: string;
  distanceMeters?: number;
  /** The trimmed route as an encoded polyline (routes.ts). */
  route?: string;
  photoPath?: string;
  /** A signed link to the photo, for anyone in the family. */
  photoUrl?: string;
  /** Member ids of everyone who cheered it. */
  cheeredBy: string[];
  /** Oldest first. */
  comments: RemoteComment[];
  /** HealthKit's UUID, for Health workouts. */
  healthWorkoutId?: string;
  /** The app or device that recorded a Health workout, such as "WHOOP". */
  sourceApp?: string;
}

/** One of your Health workouts as saved, for a sync to compare with Health. */
export interface SavedHealthWorkout {
  id: string;
  healthWorkoutId: string;
  localDate: string;
  startedAt?: string;
  minutes?: number;
}

export interface RemoteComment {
  id: string;
  memberId: string;
  body: string;
  createdAt: string;
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

/** A member's break ("Pause me"): their local dates, both inclusive. */
export interface RemotePause {
  memberId: string;
  startsOn: string;
  endsOn: string;
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
  /** Breaks that ended in the last two months, are on now or are coming up. Missing in a family cached by an older build. */
  pauses?: RemotePause[];
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
    photoUrl: null,
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
 * Deletes the account through the delete-account edge function: every photo, the
 * Sign in with Apple token, then the auth user, which removes their member rows,
 * workouts, cheers and nudges, and any family they leave empty.
 *
 * Apple's sheet comes up first for a fresh authorization code, which the function
 * needs to revoke the token. 'cancelled' when the person closes it.
 */
export async function deleteAccount(me: { familyId: string; memberId: string }): Promise<'deleted' | 'cancelled'> {
  const code = await appleCodeForDeletion();
  if (code === 'cancelled') return 'cancelled';
  const { error } = await client().functions.invoke('delete-account', { body: { appleAuthorizationCode: code } });
  if (error) {
    // Until the function is deployed: photos from the phone, then the delete_my_account RPC.
    if (!(error instanceof FunctionsHttpError && error.context?.status === 404)) throw error;
    await deleteMyPhotos(me.familyId, me.memberId).catch(() => undefined);
    const { error: rpcError } = await client().rpc('delete_my_account');
    if (rpcError) throw rpcError;
  }
  // The user no longer exists, so a server-side sign-out would fail. Clear the local login only.
  await client().auth.signOut({ scope: 'local' }).catch(() => undefined);
  return 'deleted';
}

/** A fresh Sign in with Apple authorization code; null where there's no Apple sign-in or it failed. */
async function appleCodeForDeletion(): Promise<string | null | 'cancelled'> {
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync().catch(() => false))) return null;
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    return credential.authorizationCode ?? null;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    // Deleting matters more than revoking: carry on without the code.
    return null;
  }
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
 * Joins with a code. Wrong codes count toward the same limit as previews. A wrong
 * code comes back as no row rather than an error, so the server can log the attempt.
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
    if (isTooMany(error, status)) throw new InviteError('tooMany');
    if (error.code === 'AR409') throw new InviteError('full');
    throw error;
  }
  // PostgREST sends a null row back as null or as an object of nulls.
  const row = data as MemberRow | null;
  if (!row?.id) throw new InviteError('notFound');
  return { memberId: row.id, familyId: row.family_id };
}

/**
 * Removes someone from the family, with their workouts. Only the person who started
 * the family can (remove_member). The family's codes are withdrawn, so the next
 * refresh makes a new one.
 */
/**
 * Removes someone through the remove-member edge function, which also deletes
 * their photos. Until the function is deployed, the remove_member RPC alone.
 */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await client().functions.invoke('remove-member', { body: { memberId } });
  if (!error) return;
  if (!(error instanceof FunctionsHttpError && error.context?.status === 404)) throw error;
  const { error: rpcError } = await client().rpc('remove_member', { p_member_id: memberId });
  if (rpcError) throw rpcError;
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

  const pausesQuery = db
    .from('pauses')
    .select('member_id, starts_on, ends_on')
    .in('member_id', memberIds)
    .gte('ends_on', since);
  const workouts = await db
    .from('workouts')
    .select(
      'id, member_id, local_date, type, duration_minutes, source, note, created_at, started_at, distance_m, route, photo_path, health_workout_id, source_app, cheers (member_id), comments (id, member_id, body, created_at)',
    )
    .in('member_id', memberIds)
    .gte('local_date', since)
    .order('created_at', { ascending: false });
  if (workouts.error) throw workouts.error;
  const pauses = await pausesQuery;
  if (pauses.error) throw pauses.error;

  const workoutRows = workouts.data as {
    id: string;
    member_id: string;
    local_date: string;
    type: WorkoutType;
    duration_minutes: number | null;
    source: WorkoutSource;
    note: string | null;
    created_at: string;
    started_at: string | null;
    distance_m: number | null;
    route: string | null;
    photo_path: string | null;
    health_workout_id: string | null;
    source_app: string | null;
    cheers: { member_id: string }[];
    comments: { id: string; member_id: string; body: string; created_at: string }[];
  }[];
  const urls = await signPhotos([
    ...memberRows.map((m) => m.photoPath),
    ...workoutRows.map((w) => w.photo_path),
  ]);
  for (const m of memberRows) m.photoUrl = (m.photoPath && urls[m.photoPath]) || null;

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
    workouts: workoutRows.map((w) => ({
      id: w.id,
      memberId: w.member_id,
      localDate: w.local_date,
      type: w.type,
      minutes: w.duration_minutes ?? undefined,
      source: w.source,
      note: w.note ?? undefined,
      createdAt: w.created_at,
      startedAt: w.started_at ?? undefined,
      distanceMeters: w.distance_m ?? undefined,
      route: w.route ?? undefined,
      photoPath: w.photo_path ?? undefined,
      photoUrl: (w.photo_path && urls[w.photo_path]) || undefined,
      healthWorkoutId: w.health_workout_id ?? undefined,
      sourceApp: w.source_app ?? undefined,
      cheeredBy: w.cheers.map((c) => c.member_id),
      comments: w.comments
        .map((c) => ({ id: c.id, memberId: c.member_id, body: c.body, createdAt: c.created_at }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
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
    pauses: (pauses.data as { member_id: string; starts_on: string; ends_on: string }[]).map((p) => ({
      memberId: p.member_id,
      startsOn: p.starts_on,
      endsOn: p.ends_on,
    })),
  };
}

// ─── Breaks ("Pause me") ─────────────────────────────────────────────────────

/** Takes a break from today for `days` days counting today, or changes the current one. Returns its last day. */
export async function pauseMe(memberId: string, days: number): Promise<string> {
  const { data, error } = await client().rpc('pause_me', { p_member_id: memberId, p_days: days });
  if (error?.code === 'ARB14') throw new BreakError('tooLong');
  if (error?.code === 'ARB30') throw new BreakError('tooMany');
  if (error) throw error;
  return data as string;
}

/** Ends the current break; today counts as normal again. */
export async function endMyPause(memberId: string): Promise<void> {
  const { error } = await client().rpc('end_my_pause', { p_member_id: memberId });
  if (error) throw error;
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

/** Ties this phone's Expo push token to the signed-in person (register_push_token). */
export async function registerPushToken(token: string): Promise<void> {
  const { error } = await client().rpc('register_push_token', { p_token: token });
  if (error) throw error;
}

/** Before signing out, so the next person on this phone doesn't get the last one's pushes. */
export async function forgetPushToken(token: string): Promise<void> {
  const { error } = await client().from('push_tokens').delete().eq('token', token);
  if (error) throw error;
}

/** Sends whatever pushes are queued (the send-push edge function). Called after a join, a nudge, a workout, a cheer or a comment. */
export async function sendQueuedPushes(): Promise<void> {
  const { error } = await client().functions.invoke('send-push');
  if (error) throw error;
}

/**
 * "Send a cheer" for someone who hasn't moved yet: a nudge, which queues a push to
 * them (migration 20261005000009). 'already' when they've had one today from
 * anyone, since nudges are one per person per day.
 */
export async function sendNudge(fromMemberId: string, toMemberId: string): Promise<'sent' | 'already'> {
  const { error } = await client().from('nudges').insert({ from_member_id: fromMemberId, to_member_id: toMemberId });
  if (error) {
    // 23505: unique (to_member_id, local_date).
    if (error.code === '23505') return 'already';
    throw error;
  }
  return 'sent';
}

/**
 * A heart on someone's finished workout, which pushes to its owner once
 * (migration 20261017000004). Cheering twice is fine: unique (workout_id, member_id).
 */
export async function cheerWorkout(memberId: string, workoutId: string): Promise<void> {
  const { error } = await client().from('cheers').insert({ workout_id: workoutId, member_id: memberId });
  if (error && error.code !== '23505') throw error;
}

/** A short comment on a workout ("Proud of you"), which pushes to its owner. */
export async function addComment(memberId: string, workoutId: string, body: string): Promise<void> {
  const { error } = await client().from('comments').insert({ workout_id: workoutId, member_id: memberId, body });
  if (error) throw error;
}

/** Deletes one of your own comments. */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await client().from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

/** A manual "I moved today" check-in. A photo is uploaded separately (uploadPhoto, setWorkoutPhoto). */
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

/**
 * A workout read from Apple Health, keyed by its HealthKit UUID. 'added' (with the
 * new row's id) when it's new; 'synced' when it was already saved (unique
 * (member_id, health_workout_id)). Throws WorkoutDateError for a date outside today or yesterday.
 */
export async function insertHealthWorkout(
  memberId: string,
  input: {
    healthWorkoutId: string;
    localDate: string;
    type: WorkoutType;
    minutes?: number;
    startedAt?: string;
    distanceMeters?: number;
    route?: string;
    sourceApp?: string;
  },
): Promise<{ outcome: 'added'; id: string } | { outcome: 'synced' }> {
  const { data, error } = await client()
    .from('workouts')
    .insert({
      member_id: memberId,
      local_date: input.localDate,
      type: input.type,
      duration_minutes: input.minutes ?? null,
      source: 'health',
      health_workout_id: input.healthWorkoutId,
      started_at: input.startedAt ?? null,
      distance_m: input.distanceMeters ?? null,
      route: input.route ?? null,
      source_app: input.sourceApp ?? null,
    })
    .select('id')
    .single();
  if (error) {
    // 23505: unique violation, so this Health workout is already on the server.
    if (error.code === '23505') return { outcome: 'synced' };
    if (error.code === '22023') throw new WorkoutDateError(error.message);
    throw error;
  }
  return { outcome: 'added', id: data.id };
}

/**
 * Adds the start time, distance and route to a Health workout saved without them
 * (before its route arrived, or by a build that didn't read routes). Only touches
 * a row still missing what's being added, so repeat syncs change nothing. True when it did.
 */
export async function fillHealthWorkoutDetails(
  memberId: string,
  healthWorkoutId: string,
  details: { startedAt?: string; distanceMeters?: number; route?: string },
): Promise<boolean> {
  const patch: Record<string, string | number> = {};
  if (details.startedAt) patch.started_at = details.startedAt;
  if (details.distanceMeters) patch.distance_m = details.distanceMeters;
  if (details.route) patch.route = details.route;
  const { data, error } = await client()
    .from('workouts')
    .update(patch)
    .eq('member_id', memberId)
    .eq('health_workout_id', healthWorkoutId)
    .is(details.route ? 'route' : 'distance_m', null)
    .select('id');
  if (error) throw error;
  return data.length > 0;
}

/** Your Health workouts from a day on, for a sync to compare with what Health has now. */
export async function fetchMyHealthWorkouts(memberId: string, since: string): Promise<SavedHealthWorkout[]> {
  const { data, error } = await client()
    .from('workouts')
    .select('id, health_workout_id, local_date, started_at, duration_minutes')
    .eq('member_id', memberId)
    .eq('source', 'health')
    .gte('local_date', since);
  if (error) throw error;
  return (
    data as {
      id: string;
      health_workout_id: string;
      local_date: string;
      started_at: string | null;
      duration_minutes: number | null;
    }[]
  ).map((r) => ({
    id: r.id,
    healthWorkoutId: r.health_workout_id,
    localDate: r.local_date,
    startedAt: r.started_at ?? undefined,
    minutes: r.duration_minutes ?? undefined,
  }));
}

/**
 * Points a saved Health workout at a better copy of the same workout (another app
 * recorded it too), keeping its cheers, comments and photo.
 */
export async function replaceHealthWorkout(
  rowId: string,
  input: {
    healthWorkoutId: string;
    type: WorkoutType;
    minutes?: number;
    startedAt?: string;
    distanceMeters?: number;
    route?: string;
    sourceApp?: string;
  },
): Promise<void> {
  const { error } = await client()
    .from('workouts')
    .update({
      health_workout_id: input.healthWorkoutId,
      type: input.type,
      duration_minutes: input.minutes ?? null,
      started_at: input.startedAt ?? null,
      distance_m: input.distanceMeters ?? null,
      route: input.route ?? null,
      source_app: input.sourceApp ?? null,
    })
    .eq('id', rowId);
  if (error) {
    if (error.code === '22023') throw new WorkoutDateError(error.message);
    throw error;
  }
}

/** Deletes one of your workouts, with its cheers and comments. */
export async function deleteWorkout(workoutId: string): Promise<void> {
  const { error } = await client().from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

/** Corrects the kind of one of your workouts ("it was a ride, not a run"). */
export async function setWorkoutType(workoutId: string, type: WorkoutType): Promise<void> {
  const { error } = await client().from('workouts').update({ type }).eq('id', workoutId);
  if (error) throw error;
}

/** One member's routes since a day, newest first, for their map. */
export async function fetchRoutes(
  memberId: string,
  since: string | null,
): Promise<{ id: string; localDate: string; type: WorkoutType; distanceMeters?: number; route: string }[]> {
  let query = client()
    .from('workouts')
    .select('id, local_date, type, distance_m, route')
    .eq('member_id', memberId)
    .not('route', 'is', null)
    .order('local_date', { ascending: false })
    .limit(1000);
  if (since) query = query.gte('local_date', since);
  const { data, error } = await query;
  if (error) throw error;
  return (data as { id: string; local_date: string; type: WorkoutType; distance_m: number | null; route: string }[]).map(
    (w) => ({ id: w.id, localDate: w.local_date, type: w.type, distanceMeters: w.distance_m ?? undefined, route: w.route }),
  );
}

// ─── Photos (the private `photos` bucket, migration 20261008000001) ──────────

const PHOTO_BUCKET = 'photos';
/** Signed links last a week; one is reused until it has less than a day left. */
const SIGNED_SECONDS = 7 * 24 * 60 * 60;
const signed = new Map<string, { url: string; expires: number }>();

/**
 * Signed links for photo paths, by path. Reusing a link keeps the image cache
 * warm, since a new link is a new URL to the phone. Paths that fail are left out.
 */
async function signPhotos(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const now = Date.now();
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const missing = unique.filter((p) => (signed.get(p)?.expires ?? 0) - now < 24 * 60 * 60 * 1000);
  if (missing.length) {
    const { data, error } = await client().storage.from(PHOTO_BUCKET).createSignedUrls(missing, SIGNED_SECONDS);
    // No bucket yet (the migration hasn't run) or offline: show initials and no photos.
    if (!error && data) {
      for (const d of data) {
        if (d.path && d.signedUrl && !d.error) signed.set(d.path, { url: d.signedUrl, expires: now + SIGNED_SECONDS * 1000 });
      }
    }
  }
  return Object.fromEntries(unique.filter((p) => signed.has(p)).map((p) => [p, signed.get(p)!.url]));
}

/** Uploads a JPEG to `<family>/<member>/<name>.jpg` and returns its path. */
export async function uploadPhoto(familyId: string, memberId: string, name: string, jpeg: ArrayBuffer): Promise<string> {
  const path = `${familyId}/${memberId}/${name}.jpg`;
  const { error } = await client()
    .storage.from(PHOTO_BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  signed.delete(path);
  return path;
}

export async function removePhoto(path: string): Promise<void> {
  signed.delete(path);
  const { error } = await client().storage.from(PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}

export async function setMemberPhoto(memberId: string, path: string | null): Promise<void> {
  const { error } = await client().from('members').update({ photo_path: path }).eq('id', memberId);
  if (error) throw error;
}

export async function setWorkoutPhoto(workoutId: string, path: string | null): Promise<void> {
  const { error } = await client().from('workouts').update({ photo_path: path }).eq('id', workoutId);
  if (error) throw error;
}

/**
 * Removes every photo this member uploaded in one family. Only the fallback in
 * deleteAccount uses it now; the delete-account function does this on the server.
 */
async function deleteMyPhotos(familyId: string, memberId: string): Promise<void> {
  const bucket = client().storage.from(PHOTO_BUCKET);
  const folder = `${familyId}/${memberId}`;
  // Capped, in case Storage keeps listing files it won't remove.
  for (let round = 0; round < 50; round++) {
    const { data, error } = await bucket.list(folder, { limit: 100 });
    if (error || !data?.length) return;
    const { error: removeError } = await bucket.remove(data.map((f) => `${folder}/${f.name}`));
    if (removeError) return;
  }
}
