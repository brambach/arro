import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { MoveMethod, ReminderSlot, WorkoutType } from '../data/types';
import { memberColor } from '../theme/tokens';
import * as backend from './backend';
import { InvitePreview, RemoteFamily } from './backend';
import { AppView, Preview, buildView } from './buildView';
import { dayKey, addDays, deviceTimezone } from './dates';
import { connectHealth, onHealthWorkoutsChanged, readRecentHealthWorkouts } from './health';
import { syncHealthWorkouts } from './healthSync';
import {
  NotificationPermission,
  expoPushToken,
  requestNotificationPermission,
  scheduleReminders,
  showNotificationsInForeground,
} from './notifications';
import {
  LoggedWorkout,
  SavedSession,
  clearMoveMethod,
  clearSession,
  loadCachedFamily,
  loadMoveMethod,
  loadSession,
  saveCachedFamily,
  saveMoveMethod,
  saveSession,
} from './session';

/**
 * Everything the screens share: the saved session, the half-finished onboarding
 * answers, and the view the screens read. With Supabase configured and signed in,
 * the family lives on the server (backend.ts); otherwise it's local, as in phase 1.
 */

/** What onboarding collects before it's saved as a session. */
export interface Draft {
  role: 'founder' | 'invitee';
  name: string;
  familyName: string;
  photoUri: string | null;
  moveMethod: MoveMethod;
  reminder: ReminderSlot;
  joinCode: string;
  invited: { id: string; name: string }[];
  /** Signed in with Apple (server mode only). */
  userId: string | null;
  /** The founder's family, made on the server once it's named, so the invite has a real code. */
  remote: { memberId: string; familyId: string } | null;
  /** What the invitee's code opened (server mode only). */
  invite: InvitePreview | null;
}

export interface LogInput {
  day: 'today' | 'yesterday';
  type: WorkoutType;
  minutes?: number;
  note?: string;
  photoUri?: string | null;
}

/** The family people join with any code in the local preview. */
export const DEMO_FAMILY_NAME = 'Home crew';
const DEMO_MEMBER_COUNT = 3;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function makeJoinCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

const emptyDraft = (role: Draft['role']): Draft => ({
  role,
  name: '',
  familyName: role === 'invitee' && !backend.backendEnabled ? DEMO_FAMILY_NAME : '',
  photoUri: null,
  moveMethod: 'manual',
  reminder: 'evening',
  // Signed in, saveFamilyName swaps this for the real code from the invites table.
  joinCode: role === 'founder' ? makeJoinCode() : '',
  invited: [],
  userId: null,
  remote: null,
  invite: null,
});

interface AppContextValue {
  /** False until the saved session has been read. */
  ready: boolean;
  /** True when the app talks to Supabase; false runs everything on this phone. */
  online: boolean;
  session: SavedSession | null;
  /** The screens' data. null before anyone has signed in; after sign-out it's the last view, until the screens are gone. */
  view: AppView | null;
  draft: Draft;
  startFlow: (role: Draft['role']) => void;
  updateDraft: (patch: Partial<Draft>) => void;
  /** Sign in with Apple. 'done' when an existing account went straight to its family. */
  signIn: () => Promise<'cancelled' | 'continue' | 'done'>;
  /** Founder, server mode: make (or rename) the family so the invite step has a real code. */
  saveFamilyName: () => Promise<void>;
  /** Invitee: look up the code on the server. Throws backend.InviteError. */
  lookUpInvite: () => Promise<void>;
  completeOnboarding: (remindersWanted: boolean) => Promise<void>;
  /** Throws backend.WorkoutDateError when the server refuses the date. */
  logWorkout: (input: LogInput) => Promise<void>;
  updateProfile: (patch: { name?: string; photoUri?: string | null }) => Promise<void>;
  /** Settings: switch how moving counts. Apple Health shows Apple's sheet, then syncs. */
  setMoveMethod: (method: MoveMethod) => Promise<void>;
  /** Settings: the daily reminder on or off, and its time. Turning it on asks iOS first. */
  setReminder: (patch: { wanted?: boolean; slot?: ReminderSlot }) => Promise<NotificationPermission | null>;
  /** Invite someone (name optional). Works during onboarding and afterwards. */
  addInvite: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account on the server (or the local family) and signs out. */
  deleteAccount: () => Promise<void>;
  preview: Preview | null;
  setPreview: (preview: Preview | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [family, setFamily] = useState<RemoteFamily | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft('founder'));
  const [preview, setPreview] = useState<Preview | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const familyRef = useRef(family);
  familyRef.current = family;
  /** The push token registered for whoever is signed in, so signing out can remove it. */
  const pushTokenRef = useRef<string | null>(null);

  const persist = useCallback(async (next: SavedSession) => {
    setSession(next);
    try {
      await saveSession(next);
      await saveMoveMethod(next.me.moveMethod);
    } catch {
      // Storage full or unavailable: the app keeps working for this launch.
    }
  }, []);

  /** Fetch the family again. Keeps the last one if the phone is offline. */
  const refresh = useCallback(async () => {
    const remote = sessionRef.current?.remote;
    if (!remote) return;
    try {
      const next = await backend.fetchFamily(remote.familyId, remote.memberId);
      setFamily(next);
      saveCachedFamily(next).catch(() => undefined);
      // "Today" on the server follows the member's timezone, so keep it on this phone's.
      const tz = deviceTimezone();
      const mine = next.members.find((m) => m.id === remote.memberId);
      if (mine && mine.timezone !== tz) {
        await backend.updateMember(remote.memberId, { timezone: tz });
      }
    } catch {
      // Offline or the server is down: the cached family stays on screen.
    }
  }, []);

  /**
   * Sends today's and yesterday's Apple Health workouts to the server, for people
   * who chose Apple Health. Reads the session from storage when it hasn't loaded
   * yet, because iOS can wake Arro in the background for a new workout.
   */
  const syncHealth = useCallback(async () => {
    const current = sessionRef.current ?? (await loadSession());
    if (!current?.remote || current.me.moveMethod !== 'health') return;
    try {
      const workouts = await readRecentHealthWorkouts();
      const result = await syncHealthWorkouts(current.remote.memberId, workouts);
      if (result.added > 0) await refresh();
    } catch {
      // Offline or Health unavailable: the next launch or Health update tries again.
    }
  }, [refresh]);

  // Register early: on a background relaunch, iOS's queued Health update waits for this listener.
  useEffect(() => {
    const sub = onHealthWorkoutsChanged(syncHealth);
    return () => sub.remove();
  }, [syncHealth]);

  /**
   * Schedules the daily reminder from the session and today's workouts: two weeks
   * ahead, without today's once this person has moved. Clears it when reminders are off.
   */
  const rescheduleReminders = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.me.remindersWanted) return scheduleReminders(null, false);
    const today = dayKey();
    const fam = familyRef.current;
    const movedToday = current.remote
      ? (fam?.memberStreaks[current.remote.memberId]?.movedToday ??
        !!fam?.workouts.some((w) => w.memberId === current.remote!.memberId && w.localDate === today))
      : current.workouts.some((w) => w.localDate === today);
    return scheduleReminders(current.me.reminder, movedToday);
  }, []);

  useEffect(() => {
    rescheduleReminders();
  }, [session, family, rescheduleReminders]);

  /** Gives the server this phone's push token, once there's permission and a family on the server. */
  const registerPush = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.remote) return;
    const token = await expoPushToken();
    if (!token) return;
    try {
      await backend.registerPushToken(token);
      pushTokenRef.current = token;
    } catch {
      // Offline: the next launch registers it.
    }
  }, []);

  useEffect(() => {
    showNotificationsInForeground();
  }, []);

  const clearAll = useCallback(async () => {
    setPreview(null);
    setSession(null);
    setFamily(null);
    setDraft(emptyDraft('founder'));
    try {
      await clearSession();
    } catch {
      // Nothing to clear.
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      let saved = await loadSession();
      if (saved?.remote) {
        // The Supabase login is gone (signed out elsewhere, account deleted): back to onboarding.
        const userId = await backend.currentUserId().catch(() => saved!.remote!.userId);
        if (userId !== saved.remote.userId) {
          await clearSession().catch(() => undefined);
          saved = null;
        } else {
          const cached = await loadCachedFamily<RemoteFamily>();
          if (alive && cached?.id === saved.remote.familyId) setFamily(cached);
        }
      }
      if (!alive) return;
      setSession(saved);
      sessionRef.current = saved;
      setReady(true);
      if (saved?.remote) {
        refresh();
        registerPush();
      }
      if (saved?.remote && saved.me.moveMethod === 'health') {
        // Asks once for people who chose Apple Health before it connected; iOS skips the sheet after that.
        connectHealth()
          .catch(() => undefined)
          .then(() => syncHealth());
      }
    })();
    return () => {
      alive = false;
    };
  }, [refresh, registerPush, syncHealth]);

  // Coming back to the app picks up what the family did meanwhile, and any new Health workouts.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        syncHealth();
        // A new day may have started since the last schedule.
        rescheduleReminders();
      }
    });
    return () => sub.remove();
  }, [refresh, rescheduleReminders, syncHealth]);

  const startFlow = useCallback((role: Draft['role']) => setDraft(emptyDraft(role)), []);
  const updateDraft = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  /** The session for someone in a family on the server. */
  const remoteSession = useCallback(
    (d: Draft, remote: SavedSession['remote'] & {}, remindersWanted: boolean, familyName: string): SavedSession => ({
      version: 1,
      role: d.role,
      me: {
        id: remote.memberId,
        name: d.name.trim() || 'You',
        color: memberColor(0), // the server's colour replaces this once the family loads
        photoUri: d.photoUri,
        moveMethod: d.moveMethod,
        reminder: d.reminder,
        remindersWanted,
        joinedOn: dayKey(),
      },
      family: { name: familyName, joinCode: '', invited: d.invited },
      workouts: [],
      remote,
      photos: {},
    }),
    [],
  );

  const signIn = useCallback(async (): Promise<'cancelled' | 'continue' | 'done'> => {
    const result = await backend.signInWithApple();
    if (!result) return 'cancelled';
    const d = draftRef.current;
    const existing = await backend.myMembership(result.userId);
    if (existing) {
      // Signed in before, on this phone or another: straight to the family.
      // Onboarding's "How you move" was skipped, so keep what this phone chose last.
      const moveMethod = (await loadMoveMethod()) ?? d.moveMethod;
      const next = remoteSession(
        { ...d, name: d.name || result.givenName || '', moveMethod },
        { userId: result.userId, ...existing },
        false,
        '',
      );
      sessionRef.current = next;
      await persist(next);
      await refresh();
      registerPush();
      if (moveMethod === 'health') {
        connectHealth()
          .catch(() => undefined)
          .then(() => syncHealth());
      }
      return 'done';
    }
    setDraft((cur) => ({ ...cur, userId: result.userId, name: cur.name || result.givenName || '' }));
    return 'continue';
  }, [persist, refresh, registerPush, remoteSession, syncHealth]);

  const saveFamilyName = useCallback(async () => {
    const d = draftRef.current;
    if (!backend.backendEnabled || !d.userId) return;
    const name = d.familyName.trim();
    if (d.remote) {
      await backend.renameFamily(d.remote.familyId, name);
      return;
    }
    const remote = await backend.createFamily(name, d.name.trim() || 'Me', deviceTimezone(), d.reminder);
    const code = await backend.ensureInviteCode(remote.familyId, remote.memberId);
    setDraft((cur) => ({ ...cur, remote, joinCode: code }));
  }, []);

  const lookUpInvite = useCallback(async () => {
    if (!backend.backendEnabled) return;
    const invite = await backend.previewInvite(draftRef.current.joinCode);
    setDraft((cur) => ({ ...cur, invite, familyName: invite.familyName }));
  }, []);

  const completeOnboarding = useCallback(
    async (remindersWanted: boolean) => {
      const d = draftRef.current;
      const founder = d.role === 'founder';

      if (backend.backendEnabled && d.userId) {
        let remote = d.remote;
        if (founder && remote) {
          await backend.updateMember(remote.memberId, { reminder: d.reminder });
        } else if (!founder) {
          remote = await backend.joinFamily(d.joinCode, d.name.trim() || 'Me', deviceTimezone(), d.reminder);
          // Joining queued "<name> joined" for everyone already in the family.
          backend.sendQueuedPushes().catch(() => undefined);
        }
        if (!remote) throw new Error('No family yet');
        const next = remoteSession(d, { userId: d.userId, ...remote }, remindersWanted, d.familyName.trim());
        sessionRef.current = next;
        await persist(next);
        await refresh();
        registerPush();
        // Health access was asked for at "How you move"; a workout from today counts straight away.
        if (d.moveMethod === 'health') await syncHealth();
        return;
      }

      await persist({
        version: 1,
        role: d.role,
        me: {
          id: 'me',
          name: d.name.trim() || 'You',
          color: memberColor(founder ? 0 : DEMO_MEMBER_COUNT), // join order: founder first, invitee after the three already in
          photoUri: d.photoUri,
          moveMethod: d.moveMethod,
          reminder: d.reminder,
          remindersWanted,
          joinedOn: dayKey(),
        },
        family: {
          name: founder ? d.familyName.trim() || 'Our family' : d.familyName,
          joinCode: d.joinCode,
          invited: d.invited,
        },
        workouts: [],
      });
    },
    [persist, refresh, registerPush, remoteSession, syncHealth],
  );

  const logWorkout = useCallback(
    async (input: LogInput) => {
      const current = sessionRef.current;
      if (!current) return;
      const now = new Date();
      const localDate = input.day === 'today' ? dayKey(now) : addDays(dayKey(now), -1);

      if (current.remote) {
        const id = await backend.insertWorkout(current.remote.memberId, {
          localDate,
          type: input.type,
          minutes: input.minutes,
          note: input.note?.trim() || undefined,
        });
        if (input.photoUri) await persist({ ...current, photos: { ...current.photos, [id]: input.photoUri } });
        await refresh();
        return;
      }

      const workout: LoggedWorkout = {
        id: `w-${now.getTime()}`,
        localDate,
        loggedAt: now.toISOString(),
        type: input.type,
        minutes: input.minutes,
        note: input.note?.trim() || undefined,
        photoUri: input.photoUri ?? null,
      };
      await persist({ ...current, workouts: [...current.workouts, workout] });
    },
    [persist, refresh],
  );

  const updateProfile = useCallback(
    async (patch: { name?: string; photoUri?: string | null }) => {
      const current = sessionRef.current;
      if (!current) return;
      const name = patch.name?.trim();
      if (current.remote && name && name !== current.me.name) {
        await backend.updateMember(current.remote.memberId, { name });
      }
      await persist({
        ...current,
        me: {
          ...current.me,
          name: name || current.me.name,
          photoUri: patch.photoUri === undefined ? current.me.photoUri : patch.photoUri,
        },
      });
      if (current.remote) await refresh();
    },
    [persist, refresh],
  );

  const setMoveMethod = useCallback(
    async (method: MoveMethod) => {
      const current = sessionRef.current;
      if (!current) return;
      const next = { ...current, me: { ...current.me, moveMethod: method } };
      sessionRef.current = next;
      await persist(next);
      if (method !== 'health') return;
      // iOS shows the sheet only the first time; after that this just starts watching.
      await connectHealth().catch(() => false);
      await syncHealth();
    },
    [persist, syncHealth],
  );

  const setReminder = useCallback(
    async (patch: { wanted?: boolean; slot?: ReminderSlot }): Promise<NotificationPermission | null> => {
      const current = sessionRef.current;
      if (!current) return null;
      const slot = patch.slot ?? current.me.reminder;
      if (current.remote && slot !== current.me.reminder) {
        await backend.updateMember(current.remote.memberId, { reminder: slot });
      }
      const wanted = patch.wanted ?? current.me.remindersWanted;
      // iOS shows its sheet only the first time; after that this just reads the answer.
      const permission = wanted ? await requestNotificationPermission() : null;
      const next = { ...current, me: { ...current.me, reminder: slot, remindersWanted: wanted } };
      sessionRef.current = next;
      await persist(next);
      if (permission === 'granted') registerPush();
      return permission;
    },
    [persist, registerPush],
  );

  const addInvite = useCallback(
    async (name: string) => {
      const person = { id: `invite-${Date.now()}`, name: name.trim() };
      if (!person.name) return;
      const current = sessionRef.current;
      if (!current) {
        setDraft((d) => ({ ...d, invited: [...d.invited, person] }));
        return;
      }
      await persist({ ...current, family: { ...current.family, invited: [...current.family.invited, person] } });
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    // While still signed in: RLS only lets you delete your own token.
    const token = pushTokenRef.current;
    if (token) await backend.forgetPushToken(token).catch(() => undefined);
    pushTokenRef.current = null;
    await scheduleReminders(null, false);
    await backend.signOut().catch(() => undefined);
    await clearAll();
  }, [clearAll]);

  const deleteAccount = useCallback(async () => {
    // Deleting the account removes its push tokens on the server too.
    if (sessionRef.current?.remote) await backend.deleteAccount();
    pushTokenRef.current = null;
    await scheduleReminders(null, false);
    await clearMoveMethod().catch(() => undefined);
    await clearAll();
  }, [clearAll]);

  const builtView = useMemo(() => (session ? buildView(session, preview, family) : null), [session, preview, family]);
  // Keep the last view while signed out so screens that are animating away don't read null.
  const lastView = useRef<AppView | null>(null);
  if (builtView) lastView.current = builtView;
  const view = builtView ?? lastView.current;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      online: backend.backendEnabled,
      session,
      view,
      draft,
      startFlow,
      updateDraft,
      signIn,
      saveFamilyName,
      lookUpInvite,
      completeOnboarding,
      logWorkout,
      updateProfile,
      setMoveMethod,
      setReminder,
      addInvite,
      refresh,
      signOut,
      deleteAccount,
      preview,
      setPreview,
    }),
    [
      ready,
      session,
      view,
      draft,
      startFlow,
      updateDraft,
      signIn,
      saveFamilyName,
      lookUpInvite,
      completeOnboarding,
      logWorkout,
      updateProfile,
      setMoveMethod,
      setReminder,
      addInvite,
      refresh,
      signOut,
      deleteAccount,
      preview,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}

/** The signed-in view. Only call from screens that exist after onboarding. */
export function useView(): AppView {
  const { view } = useApp();
  if (!view) throw new Error('useView needs a saved session');
  return view;
}
