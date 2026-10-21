/**
 * Every call Saunafam makes to Supabase. Screens never import this; AppState.tsx
 * calls it and buildView.ts turns what comes back into the screens' view. The
 * exact contract is docs/saunafam/API.md.
 *
 * The database spells it `colour`; the app spells it `color`. Rows are mapped to
 * the camelCase types in src/data/types.ts here and nowhere else.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import {
  AppConfig,
  FamilyMember,
  FamilyRule,
  FamilySnapshot,
  FamilyWeekState,
  FamilyWeekSummary,
  HistoryStatus,
  MemberWeek,
  MemberWeekStatus,
  PastWeekRow,
  PlusPlanStatus,
  PlusProduct,
  PlusStatus,
  SaunaType,
  Session,
  SessionCheer,
  SessionComment,
  SessionSource,
  WallWood,
  WeekStartsOn,
} from '../data/types';
import { isSaunaType, recentPlaces } from '../data/saunas';
import { addDays, dayKey, weekStart } from './dates';
import { HISTORY_WEEKS } from './weeks';
import type { HeatSession } from './heatLog';
import { supabase } from './supabase';

// ─── Errors ──────────────────────────────────────────────────────────────────

/** A join code that doesn't exist or has expired, too many wrong codes, or a full family. */
export class InviteError extends Error {
  constructor(public kind: 'notFound' | 'tooMany' | 'full') {
    super(
      kind === 'tooMany'
        ? 'Too many tries. Wait a few minutes and try again.'
        : kind === 'full'
          ? 'That family already has 12 people, which is as many as Saunafam allows.'
          : 'That code has expired or doesn’t exist.',
    );
  }
}

/** pause_me refused the break: longer than 14 days, or over 14 days in 30. */
export class BreakError extends Error {
  constructor(public kind: 'tooLong' | 'tooMany') {
    super(
      kind === 'tooLong'
        ? 'A break can be up to two weeks long, counted from the day it started.'
        : 'You can be on a break for up to 14 days in any 30.',
    );
  }
}

/** set_wall_wood without Plus (SF402): show the try-on instead of an error. */
export class NeedsPlusError extends Error {}

/** The server answered and said no (a value or date it won't take). Retrying won't help. */
export class RefusedError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ServerError {
  code?: string;
  message?: string;
  status?: number;
}

/** Codes where the server refused the input itself (API.md, error table). */
const REFUSAL_CODES = new Set(['22023', '23514', '22P02', '42501', 'P0001']);

/**
 * True when the server read the request and refused it, so the outbox should
 * keep a draft instead of retrying. "sign in first" is a lapsed login, not a
 * refusal: a refresh fixes it.
 */
export function isRefusal(error: unknown): boolean {
  if (error instanceof RefusedError) return true;
  const e = (error ?? {}) as ServerError;
  if (!e.code || !REFUSAL_CODES.has(e.code)) return false;
  return !/sign in first/i.test(e.message ?? '');
}

/** True for "couldn't reach the server": no response at all. */
export function isNetworkError(error: unknown): boolean {
  const e = (error ?? {}) as ServerError & { name?: string };
  if (e.code) return false;
  return /network|fetch|timed? ?out|offline|connection|abort/i.test(`${e.name ?? ''} ${e.message ?? ''}`);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export const backendEnabled = supabase !== null;

function client() {
  if (!supabase) throw new Error('Supabase isn’t configured');
  return supabase;
}

/** Throws the PostgREST error as is, so isRefusal and isNetworkError can read it. */
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

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
  weekend_checkin?: boolean | null;
};

function toMember(row: MemberRow): FamilyMember {
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
    weekendCheckin: row.weekend_checkin !== false,
  };
}

const SESSION_COLUMNS =
  'id, member_id, shared_id, logged_by, started_at, local_date, duration_minutes, rounds, sauna_type, temp_c, humidity_pct, cold_plunge, cold_minutes, place, note, photo_path, source, client_id, created_at, updated_at';
const SOCIAL_COLUMNS = 'session_cheers (id, member_id, created_at), session_comments (id, member_id, body, created_at)';

export type SessionRow = {
  id: string;
  member_id: string;
  shared_id: string | null;
  logged_by: string | null;
  started_at: string;
  local_date: string;
  duration_minutes: number;
  rounds: number;
  sauna_type: string;
  temp_c: number | string | null;
  humidity_pct: number | null;
  cold_plunge: boolean;
  cold_minutes: number | null;
  place: string | null;
  note: string | null;
  photo_path: string | null;
  source: string;
  client_id: string;
  created_at: string;
  updated_at: string;
  session_cheers?: { id: string; member_id: string; created_at: string }[];
  session_comments?: { id: string; member_id: string; body: string; created_at: string }[];
};

export function toSession(row: SessionRow, photoUrls: Record<string, string> = {}): Session {
  return {
    id: row.id,
    memberId: row.member_id,
    sharedId: row.shared_id,
    loggedBy: row.logged_by,
    startedAt: row.started_at,
    localDate: row.local_date,
    durationMinutes: row.duration_minutes,
    rounds: row.rounds,
    saunaType: (isSaunaType(row.sauna_type) ? row.sauna_type : 'other') as SaunaType,
    tempC: row.temp_c == null ? null : Number(row.temp_c),
    humidityPct: row.humidity_pct,
    coldPlunge: row.cold_plunge,
    coldMinutes: row.cold_minutes,
    place: row.place,
    note: row.note,
    photoPath: row.photo_path,
    photoUrl: (row.photo_path && photoUrls[row.photo_path]) || null,
    source: (row.source === 'timer' ? 'timer' : 'manual') as SessionSource,
    clientId: row.client_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type MemberWeekRow = {
  member_id: string;
  local_today: string;
  week_start: string;
  counted_days: number;
  counted_dates: string[] | null;
  goal: number;
  min_minutes: number;
  personal_streak: number;
  longest_personal_streak: number;
  kept_this_week: boolean;
  last_week_status: string | null;
  freeze_available: boolean;
  freeze_back_on: string | null;
  paused_until: string | null;
};

export function toMemberWeek(r: MemberWeekRow): MemberWeek {
  return {
    memberId: r.member_id,
    localToday: r.local_today,
    weekStart: r.week_start,
    countedDays: r.counted_days,
    countedDates: r.counted_dates ?? [],
    goal: r.goal,
    minMinutes: r.min_minutes,
    personalStreak: r.personal_streak,
    longestPersonalStreak: r.longest_personal_streak,
    keptThisWeek: r.kept_this_week,
    lastWeekStatus: (r.last_week_status as MemberWeekStatus | null) ?? null,
    freezeAvailable: r.freeze_available,
    freezeBackOn: r.freeze_back_on,
    pausedUntil: r.paused_until,
  };
}

type FamilyWeekRow = {
  family_streak: number;
  longest_streak: number;
  weeks_together_this_year: number;
  started_on: string | null;
  latest_week_state: string | null;
};

export function toFamilyWeek(r: FamilyWeekRow | undefined): FamilyWeekSummary {
  return {
    familyStreak: r?.family_streak ?? 0,
    longestStreak: r?.longest_streak ?? 0,
    weeksTogetherThisYear: r?.weeks_together_this_year ?? 0,
    startedOn: r?.started_on ?? null,
    latestWeekState: (r?.latest_week_state as FamilyWeekState | null) ?? null,
  };
}

type HistoryRow = {
  week_start: string;
  family_state: string | null;
  freeze_used: boolean;
  member_id: string;
  status: string;
  counted_days: number;
  goal: number;
  days: string[] | null;
};

export function toPastWeek(r: HistoryRow): PastWeekRow {
  return {
    weekStart: r.week_start,
    familyState: (r.family_state as FamilyWeekState | null) ?? null,
    freezeUsed: r.freeze_used,
    memberId: r.member_id,
    status: r.status as HistoryStatus,
    countedDays: r.counted_days,
    goal: r.goal,
    days: r.days ?? [],
  };
}

type PlusRow = {
  active: boolean;
  product: string | null;
  status: string | null;
  expires_at: string | null;
  payer_name: string | null;
  payer_is_me: boolean;
  wall_wood: string | null;
};

export const NO_PLUS: PlusStatus = {
  active: false,
  product: null,
  status: null,
  expiresAt: null,
  payerName: null,
  payerIsMe: false,
  wallWood: 'birch',
};

export function toPlus(r: PlusRow | undefined): PlusStatus {
  if (!r) return NO_PLUS;
  return {
    active: r.active,
    product: (r.product as PlusProduct | null) ?? null,
    status: (r.status as PlusPlanStatus | null) ?? null,
    expiresAt: r.expires_at,
    payerName: r.payer_name,
    payerIsMe: r.payer_is_me,
    wallWood: (r.wall_wood as WallWood | null) ?? 'birch',
  };
}

// ─── Sign-in and account ─────────────────────────────────────────────────────

/** Sign in with Apple is iPhone-only, and needs a development build or Expo Go on a device. */
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
 * sends the name the first time, so givenName is often null. Null if cancelled.
 */
export async function signInWithApple(): Promise<{ userId: string; givenName: string | null } | null> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
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

export interface PlusPlanForDeletion {
  familyId: string;
  familyName: string;
  product: PlusProduct | null;
  status: PlusPlanStatus | null;
  expiresAt: string | null;
}

/**
 * delete-account's dry run, before asking: deletes nothing. paysForPlus means
 * "You pay for Saunafam Plus. Deleting your account doesn't cancel it..."
 */
export async function deleteAccountDryRun(): Promise<{ paysForPlus: boolean; plans: PlusPlanForDeletion[] }> {
  const { data, error } = await client().functions.invoke('delete-account', { body: { dryRun: true } });
  if (error) throw error;
  const body = (data ?? {}) as { paysForPlus?: boolean; plans?: PlusPlanForDeletion[] };
  return { paysForPlus: body.paysForPlus === true, plans: body.plans ?? [] };
}

/**
 * Deletes the account through the delete-account edge function: photos, the
 * Sign in with Apple token, then the auth user (members, sessions, cheers,
 * comments and nudges cascade). Apple's sheet comes up first for a fresh
 * authorization code. 'cancelled' when the person closes it.
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
  await client().auth.signOut({ scope: 'local' }).catch(() => undefined);
  return 'deleted';
}

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

// ─── App config ──────────────────────────────────────────────────────────────

export const DEFAULT_APP_CONFIG: AppConfig = { minIosBuild: 9, plusEnabled: false };

/** app_config(): works signed out too. */
export async function fetchAppConfig(): Promise<AppConfig> {
  const data = check(await client().rpc('app_config')) as { min_ios_build: number; plus_enabled: boolean }[] | null;
  const row = data?.[0];
  return row ? { minIosBuild: row.min_ios_build, plusEnabled: row.plus_enabled } : DEFAULT_APP_CONFIG;
}

// ─── Families ────────────────────────────────────────────────────────────────

/** The family this person is already in, for someone signing in again on a new phone. */
export async function myMembership(userId: string): Promise<{ memberId: string; familyId: string } | null> {
  const data = check(
    await client().from('members').select('id, family_id').eq('user_id', userId).order('joined_at', { ascending: true }).limit(1),
  ) as { id: string; family_id: string }[];
  return data[0] ? { memberId: data[0].id, familyId: data[0].family_id } : null;
}

export interface NewFamily {
  familyName: string;
  displayName: string;
  timezone: string;
  /** "18:30" */
  reminderTime: string | null;
  goal: number;
  minMinutes: number;
  weekStartsOn: WeekStartsOn;
}

export async function createFamily(input: NewFamily): Promise<{ memberId: string; familyId: string }> {
  const row = check(
    await client().rpc('create_family', {
      p_family_name: input.familyName,
      p_display_name: input.displayName,
      p_timezone: input.timezone,
      p_reminder_time: input.reminderTime,
      p_goal: input.goal,
      p_min_minutes: input.minMinutes,
      p_week_starts_on: input.weekStartsOn,
    }),
  ) as MemberRow;
  return { memberId: row.id, familyId: row.family_id };
}

export async function renameFamily(familyId: string, name: string): Promise<void> {
  check(await client().from('families').update({ name }).eq('id', familyId));
}

/** The founder changes the rhythm from next week. Returns the date it starts. */
export async function setFamilyRules(familyId: string, goal: number, minMinutes: number): Promise<string> {
  return check(await client().rpc('set_family_rules', { p_family_id: familyId, p_goal: goal, p_min_minutes: minMinutes })) as string;
}

export interface InvitePreview {
  familyName: string;
  memberCount: number;
  /** The rest is only filled in once signed in. */
  invitedBy: string | null;
  members: { name: string; color: string }[];
  /** The weekly family streak. */
  weekStreak: number | null;
  goalPerWeek: number | null;
  minMinutes: number | null;
}

/** What a join code opens. Before sign-in only the name and member count come back. */
export async function previewInvite(code: string): Promise<InvitePreview> {
  const { data, error, status } = await client().rpc('preview_invite', { p_code: code });
  if (error) {
    if (status === 429 || error.code === 'PT429') throw new InviteError('tooMany');
    throw error;
  }
  const row = (data as {
    family_name: string;
    member_count: number;
    invited_by_name: string | null;
    member_names: string[] | null;
    member_colours: string[] | null;
    week_streak: number | null;
    goal_per_week: number | null;
    min_minutes: number | null;
  }[])[0];
  if (!row) throw new InviteError('notFound');
  return {
    familyName: row.family_name,
    memberCount: row.member_count,
    invitedBy: row.invited_by_name,
    members: (row.member_names ?? []).map((name, i) => ({ name, color: row.member_colours?.[i] ?? '#999999' })),
    weekStreak: row.week_streak,
    goalPerWeek: row.goal_per_week,
    minMinutes: row.min_minutes,
  };
}

/** Joins with a code. A wrong code comes back as no row, so the server can log the attempt. */
export async function joinFamily(
  code: string,
  displayName: string,
  timezone: string,
  reminderTime: string | null,
): Promise<{ memberId: string; familyId: string }> {
  const { data, error, status } = await client().rpc('join_family', {
    p_code: code,
    p_display_name: displayName,
    p_timezone: timezone,
    p_reminder_time: reminderTime,
  });
  if (error) {
    if (status === 429 || error.code === 'PT429') throw new InviteError('tooMany');
    if (error.code === 'AR409') throw new InviteError('full');
    throw error;
  }
  const row = data as MemberRow | null;
  if (!row?.id) throw new InviteError('notFound');
  return { memberId: row.id, familyId: row.family_id };
}

/** Removes someone (the founder only) through remove-member, which also deletes their photos. */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await client().functions.invoke('remove-member', { body: { memberId } });
  if (!error) return;
  if (!(error instanceof FunctionsHttpError && error.context?.status === 404)) throw error;
  check(await client().rpc('remove_member', { p_member_id: memberId }));
}

/** The newest unexpired code for the family, making one if there's none. Codes last 14 days. */
export async function ensureInviteCode(familyId: string, memberId: string): Promise<string> {
  const db = client();
  const data = check(
    await db
      .from('invites')
      .select('code')
      .eq('family_id', familyId)
      .gt('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1),
  ) as { code: string }[];
  if (data[0]) return data[0].code;
  const made = check(await db.from('invites').insert({ family_id: familyId, invited_by: memberId }).select('code').single()) as {
    code: string;
  };
  return made.code;
}

/**
 * Everything the screens need for one family, in one go. Sessions cover this
 * week and last week (a day of slack for time zones), plus your own last three.
 */
export async function fetchFamily(familyId: string, myMemberId: string, historyWeeks = HISTORY_WEEKS): Promise<FamilySnapshot> {
  const db = client();
  const [family, members, rules, week, memberWeeks, history, stats, plus, joinCode] = await Promise.all([
    db.from('families').select('id, name, goal_per_week, min_minutes, week_starts_on, saunafam_started_on').eq('id', familyId).single(),
    db.from('members').select('*').eq('family_id', familyId).order('joined_at', { ascending: true }),
    db.from('family_rules').select('effective_from, goal_per_week, min_minutes').eq('family_id', familyId),
    db.rpc('family_week_streak', { p_family_id: familyId }),
    db.rpc('member_week_streaks', { p_family_id: familyId }),
    db.rpc('family_week_history', { p_family_id: familyId, p_weeks: historyWeeks }),
    db.rpc('my_session_stats', { p_family_id: familyId }),
    db.rpc('family_plus', { p_family_id: familyId }),
    ensureInviteCode(familyId, myMemberId),
  ]);
  const f = check(family) as {
    id: string;
    name: string;
    goal_per_week: number;
    min_minutes: number;
    week_starts_on: number;
    saunafam_started_on: string;
  };
  const memberRows = (check(members) as MemberRow[]).map(toMember);
  const memberIds = memberRows.map((m) => m.id);
  const weekStartsOn: WeekStartsOn = f.week_starts_on === 7 ? 7 : 1;
  const since = addDays(weekStart(dayKey(), weekStartsOn), -8);

  const [sessions, mine, places, pauses] = await Promise.all([
    db
      .from('sessions')
      .select(`${SESSION_COLUMNS}, ${SOCIAL_COLUMNS}`)
      .in('member_id', memberIds)
      .gte('local_date', since)
      .order('started_at', { ascending: false }),
    db
      .from('sessions')
      .select(`${SESSION_COLUMNS}, ${SOCIAL_COLUMNS}`)
      .eq('member_id', myMemberId)
      .order('started_at', { ascending: false })
      .limit(3),
    db
      .from('sessions')
      .select('place, started_at')
      .in('member_id', memberIds)
      .not('place', 'is', null)
      .order('started_at', { ascending: false })
      .limit(40),
    db.from('pauses').select('member_id, starts_on, ends_on').in('member_id', memberIds).gte('ends_on', addDays(dayKey(), -62)),
  ]);
  const sessionRows = check(sessions) as SessionRow[];
  const myRows = check(mine) as SessionRow[];
  const urls = await signPhotos([...memberRows.map((m) => m.photoPath), ...sessionRows.map((s) => s.photo_path), ...myRows.map((s) => s.photo_path)]);
  for (const m of memberRows) m.photoUrl = (m.photoPath && urls[m.photoPath]) || null;

  const cheers: SessionCheer[] = [];
  const comments: SessionComment[] = [];
  const seen = new Set<string>();
  for (const s of [...sessionRows, ...myRows]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    for (const c of s.session_cheers ?? []) cheers.push({ id: c.id, sessionId: s.id, memberId: c.member_id, createdAt: c.created_at });
    for (const c of s.session_comments ?? []) {
      comments.push({ id: c.id, sessionId: s.id, memberId: c.member_id, body: c.body, createdAt: c.created_at });
    }
  }
  comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const statsRow = (check(stats) as {
    sessions_this_month: number;
    minutes_this_year: number;
    favorite_sauna_type: string | null;
    favorite_place: string | null;
  }[])[0];

  return {
    id: f.id,
    name: f.name,
    joinCode,
    weekStartsOn,
    goalPerWeek: f.goal_per_week,
    minMinutes: f.min_minutes,
    saunafamStartedOn: f.saunafam_started_on,
    members: memberRows,
    rules: (check(rules) as { effective_from: string; goal_per_week: number; min_minutes: number }[]).map(
      (r): FamilyRule => ({ effectiveFrom: r.effective_from, goalPerWeek: r.goal_per_week, minMinutes: r.min_minutes }),
    ),
    sessions: sessionRows.map((s) => toSession(s, urls)),
    myRecent: myRows.map((s) => toSession(s, urls)),
    cheers,
    comments,
    pauses: (check(pauses) as { member_id: string; starts_on: string; ends_on: string }[]).map((p) => ({
      memberId: p.member_id,
      startsOn: p.starts_on,
      endsOn: p.ends_on,
    })),
    week: toFamilyWeek((check(week) as FamilyWeekRow[])[0]),
    memberWeeks: Object.fromEntries((check(memberWeeks) as MemberWeekRow[]).map((r) => [r.member_id, toMemberWeek(r)])),
    history: (check(history) as HistoryRow[]).map(toPastWeek),
    stats: {
      sessionsThisMonth: statsRow?.sessions_this_month ?? 0,
      minutesThisYear: statsRow?.minutes_this_year ?? 0,
      favoriteSaunaType: isSaunaType(statsRow?.favorite_sauna_type) ? (statsRow.favorite_sauna_type as SaunaType) : null,
      favoritePlace: statsRow?.favorite_place ?? null,
    },
    plus: toPlus((check(plus) as PlusRow[])[0]),
    recentPlaces: recentPlaces(
      (check(places) as { place: string | null; started_at: string }[]).map((p) => ({ place: p.place, startedAt: p.started_at })),
    ),
    fetchedAt: new Date().toISOString(),
  };
}

/** Past weeks only, for "See every week" (Plus clamps the count on the server). */
export async function fetchHistory(familyId: string, weeks: number): Promise<PastWeekRow[]> {
  return (check(await client().rpc('family_week_history', { p_family_id: familyId, p_weeks: weeks })) as HistoryRow[]).map(toPastWeek);
}

/**
 * Every session in the family, lightly, for the Heat log (Plus): who, when,
 * how long, what kind, where. Newest first, up to 5,000 rows.
 */
export async function fetchHeatSessions(memberIds: string[]): Promise<HeatSession[]> {
  if (!memberIds.length) return [];
  const rows = check(
    await client()
      .from('sessions')
      .select('id, member_id, shared_id, local_date, duration_minutes, sauna_type, place')
      .in('member_id', memberIds)
      .order('started_at', { ascending: false })
      .limit(5000),
  ) as { id: string; member_id: string; shared_id: string | null; local_date: string; duration_minutes: number; sauna_type: string; place: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    memberId: r.member_id,
    sharedId: r.shared_id,
    localDate: r.local_date,
    durationMinutes: r.duration_minutes,
    saunaType: (isSaunaType(r.sauna_type) ? r.sauna_type : 'other') as SaunaType,
    place: r.place,
  }));
}

// ─── Sessions ────────────────────────────────────────────────────────────────

/** What log_session takes, in the app's words. clientId is made on the phone. */
export interface LogSessionInput {
  familyId: string;
  clientId: string;
  startedAt: string;
  durationMinutes: number;
  saunaType: SaunaType;
  rounds: number;
  tempC: number | null;
  humidityPct: number | null;
  coldPlunge: boolean;
  coldMinutes: number | null;
  place: string | null;
  note: string | null;
  source: SessionSource;
  /** Up to 3 other members. */
  withIds: string[];
}

/** One person's outcome: skipped means "Jo already logged this one". */
export interface LoggedRow {
  sessionId: string | null;
  memberId: string;
  skipped: boolean;
}

/** log_session. Idempotent on clientId: a retry returns the same rows and pushes nothing. */
export async function logSession(input: LogSessionInput): Promise<LoggedRow[]> {
  const data = check(
    await client().rpc('log_session', {
      p_family_id: input.familyId,
      p_started_at: input.startedAt,
      p_duration_minutes: input.durationMinutes,
      p_sauna_type: input.saunaType,
      p_rounds: input.rounds,
      p_temp_c: input.tempC,
      p_humidity_pct: input.humidityPct,
      p_cold_plunge: input.coldPlunge,
      p_cold_minutes: input.coldPlunge ? input.coldMinutes : null,
      p_place: input.place,
      p_note: input.note,
      p_source: input.source,
      p_with: input.withIds,
      p_client_id: input.clientId,
    }),
  ) as { session_id: string | null; member_id: string; skipped: boolean }[];
  return data.map((r) => ({ sessionId: r.session_id, memberId: r.member_id, skipped: r.skipped }));
}

export type SessionChanges = Partial<{
  startedAt: string;
  durationMinutes: number;
  rounds: number;
  saunaType: SaunaType;
  tempC: number | null;
  humidityPct: number | null;
  coldPlunge: boolean;
  coldMinutes: number | null;
  place: string | null;
  note: string | null;
  photoPath: string | null;
}>;

const CHANGE_KEYS: Record<keyof SessionChanges, string> = {
  startedAt: 'started_at',
  durationMinutes: 'duration_minutes',
  rounds: 'rounds',
  saunaType: 'sauna_type',
  tempC: 'temp_c',
  humidityPct: 'humidity_pct',
  coldPlunge: 'cold_plunge',
  coldMinutes: 'cold_minutes',
  place: 'place',
  note: 'note',
  photoPath: 'photo_path',
};

/** The JSON update_session takes: only keys present change; null clears. */
export function changesJson(changes: SessionChanges): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    out[CHANGE_KEYS[key as keyof SessionChanges]] = value;
  }
  return out;
}

/** The logger changes a session for everyone in it. Returns every row, anchor first. */
export async function updateSession(sessionId: string, changes: SessionChanges): Promise<Session[]> {
  const rows = check(await client().rpc('update_session', { p_session_id: sessionId, p_changes: changesJson(changes) })) as SessionRow[];
  return rows.map((r) => toSession(r));
}

/** The logger deletes the whole session, with its cheers and comments. */
export async function deleteSession(sessionId: string): Promise<number> {
  return check(await client().rpc('delete_session', { p_session_id: sessionId })) as number;
}

/** "Remove me from this session": deletes only your own row. */
export async function removeMeFromSession(myRowId: string): Promise<void> {
  check(await client().from('sessions').delete().eq('id', myRowId));
}

// ─── Cheers, comments, nudges ────────────────────────────────────────────────

/** One cheer per person per session, on the anchor. A second is fine (23505). */
export async function cheerSession(memberId: string, anchorId: string): Promise<void> {
  const { error } = await client().from('session_cheers').insert({ session_id: anchorId, member_id: memberId });
  if (error && error.code !== '23505') throw error;
}

export async function uncheerSession(memberId: string, anchorId: string): Promise<void> {
  check(await client().from('session_cheers').delete().eq('session_id', anchorId).eq('member_id', memberId));
}

/** A comment on the anchor, 1 to 200 characters, 20 a day. Returns the new comment. */
export async function addComment(memberId: string, anchorId: string, body: string): Promise<SessionComment> {
  const row = check(
    await client().from('session_comments').insert({ session_id: anchorId, member_id: memberId, body }).select('id, created_at').single(),
  ) as { id: string; created_at: string };
  return { id: row.id, sessionId: anchorId, memberId, body, createdAt: row.created_at };
}

export async function deleteComment(commentId: string): Promise<void> {
  check(await client().from('session_comments').delete().eq('id', commentId));
}

/** A nudge. 'already' when they've had one today from you (one per person per day). */
export async function sendNudge(fromMemberId: string, toMemberId: string): Promise<'sent' | 'already'> {
  const { error } = await client().from('nudges').insert({ from_member_id: fromMemberId, to_member_id: toMemberId });
  if (error) {
    if (error.code === '23505') return 'already';
    throw error;
  }
  return 'sent';
}

// ─── Breaks ──────────────────────────────────────────────────────────────────

/** Takes a break from today for `days` days counting today, or changes the current one. Returns its last day. */
export async function pauseMe(memberId: string, days: number): Promise<string> {
  const { data, error } = await client().rpc('pause_me', { p_member_id: memberId, p_days: days });
  if (error?.code === 'ARB14') throw new BreakError('tooLong');
  if (error?.code === 'ARB30') throw new BreakError('tooMany');
  if (error) throw error;
  return data as string;
}

export async function endMyPause(memberId: string): Promise<void> {
  check(await client().rpc('end_my_pause', { p_member_id: memberId }));
}

// ─── Your own row ────────────────────────────────────────────────────────────

export async function updateMember(
  memberId: string,
  patch: { name?: string; timezone?: string; reminderTime?: string | null; weekendCheckin?: boolean },
): Promise<void> {
  const row: Record<string, string | boolean | null> = {};
  if (patch.name) row.display_name = patch.name;
  if (patch.timezone) row.timezone = patch.timezone;
  if (patch.reminderTime !== undefined) row.reminder_time = patch.reminderTime;
  if (patch.weekendCheckin !== undefined) row.weekend_checkin = patch.weekendCheckin;
  if (!Object.keys(row).length) return;
  check(await client().from('members').update(row).eq('id', memberId));
}

export async function registerPushToken(token: string): Promise<void> {
  check(await client().rpc('register_push_token', { p_token: token }));
}

export async function forgetPushToken(token: string): Promise<void> {
  check(await client().from('push_tokens').delete().eq('token', token));
}

/** Sends whatever pushes are queued. Called after logging, cheering, commenting, nudging or joining. */
export async function sendQueuedPushes(): Promise<void> {
  const { error } = await client().functions.invoke('send-push');
  if (error) throw error;
}

// ─── Plus ────────────────────────────────────────────────────────────────────

export async function fetchPlus(familyId: string): Promise<PlusStatus> {
  return toPlus((check(await client().rpc('family_plus', { p_family_id: familyId })) as PlusRow[])[0]);
}

/** Any member picks the wall. Anything but birch needs Plus: NeedsPlusError. */
export async function setWallWood(familyId: string, wood: WallWood): Promise<WallWood> {
  const { data, error } = await client().rpc('set_wall_wood', { p_family_id: familyId, p_wood: wood });
  if (error?.code === 'SF402') throw new NeedsPlusError(error.message);
  if (error) throw error;
  return data as WallWood;
}

export type SyncPlusResult =
  | { synced: true; applied: boolean; reason: string }
  | { synced: false; reason: 'no_purchase' | 'pick_a_family' }
  | { synced: false; reason: 'store_unreachable' };

/** Right after a purchase or restore. Then fetchPlus for what to show. */
export async function syncPlus(familyId: string): Promise<SyncPlusResult> {
  const { data, error } = await client().functions.invoke('sync-plus', { body: { familyId } });
  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 502) return { synced: false, reason: 'store_unreachable' };
    throw error;
  }
  const body = (data ?? {}) as { synced?: boolean; applied?: boolean; reason?: string };
  if (body.synced) return { synced: true, applied: body.applied === true, reason: body.reason ?? '' };
  return { synced: false, reason: body.reason === 'pick_a_family' ? 'pick_a_family' : 'no_purchase' };
}

// ─── Photos (the private `photos` bucket) ────────────────────────────────────

const PHOTO_BUCKET = 'photos';
/** Signed links last a week; one is reused until it has less than a day left. */
const SIGNED_SECONDS = 7 * 24 * 60 * 60;
const signed = new Map<string, { url: string; expires: number }>();

/** Signed links by path. Reusing a link keeps the image cache warm. Paths that fail are left out. */
async function signPhotos(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const now = Date.now();
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const missing = unique.filter((p) => (signed.get(p)?.expires ?? 0) - now < 24 * 60 * 60 * 1000);
  if (missing.length) {
    const { data, error } = await client().storage.from(PHOTO_BUCKET).createSignedUrls(missing, SIGNED_SECONDS);
    if (!error && data) {
      for (const d of data) {
        if (d.path && d.signedUrl && !d.error) signed.set(d.path, { url: d.signedUrl, expires: now + SIGNED_SECONDS * 1000 });
      }
    }
  }
  const out: Record<string, string> = {};
  for (const p of unique) {
    const hit = signed.get(p);
    if (hit) out[p] = hit.url;
  }
  return out;
}

/**
 * Uploads a JPEG to `<family>/<member>/<name>.jpg` and returns its path. Session
 * photos go flat in the logger's own folder, which remove-member and
 * delete-account clear (PROGRESS.md D19).
 */
export async function uploadPhoto(familyId: string, memberId: string, name: string, jpeg: ArrayBuffer): Promise<string> {
  const path = `${familyId}/${memberId}/${name}.jpg`;
  check(await client().storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: true }));
  signed.delete(path);
  return path;
}

export async function removePhoto(path: string): Promise<void> {
  signed.delete(path);
  check(await client().storage.from(PHOTO_BUCKET).remove([path]));
}

export async function setMemberPhoto(memberId: string, path: string | null): Promise<void> {
  check(await client().from('members').update({ photo_path: path }).eq('id', memberId));
}

/** Sets the photo on your own anchor or solo row (a direct update the policies allow). */
export async function setSessionPhoto(anchorId: string, path: string | null): Promise<void> {
  check(await client().from('sessions').update({ photo_path: path }).eq('id', anchorId));
}

/** Removes every photo this member uploaded in one family: deleteAccount's fallback only. */
async function deleteMyPhotos(familyId: string, memberId: string): Promise<void> {
  const bucket = client().storage.from(PHOTO_BUCKET);
  const folder = `${familyId}/${memberId}`;
  for (let round = 0; round < 50; round++) {
    const { data, error } = await bucket.list(folder, { limit: 100 });
    if (error || !data?.length) return;
    const { error: removeError } = await bucket.remove(data.map((f) => `${folder}/${f.name}`));
    if (removeError) return;
  }
}
