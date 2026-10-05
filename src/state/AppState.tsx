import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MoveMethod, ReminderSlot, WorkoutType } from '../data/types';
import { memberColor } from '../theme/tokens';
import { AppView, Preview, buildView } from './buildView';
import { dayKey, addDays } from './dates';
import { LoggedWorkout, SavedSession, clearSession, loadSession, saveSession } from './session';

/**
 * Everything the screens share while the backend is still fake: the saved session,
 * the half-finished onboarding answers, and the view the screens read.
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
}

export interface LogInput {
  day: 'today' | 'yesterday';
  type: WorkoutType;
  minutes?: number;
  note?: string;
  photoUri?: string | null;
}

/** The family people join with the demo code, until phase 2 looks codes up on the server. */
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
  familyName: role === 'invitee' ? DEMO_FAMILY_NAME : '',
  photoUri: null,
  moveMethod: 'manual',
  reminder: 'evening',
  joinCode: role === 'founder' ? makeJoinCode() : '',
  invited: [],
});

interface AppContextValue {
  /** False until the saved session has been read. */
  ready: boolean;
  session: SavedSession | null;
  /** The screens' data. null before anyone has signed in; after sign-out it's the last view, until the screens are gone. */
  view: AppView | null;
  draft: Draft;
  startFlow: (role: Draft['role']) => void;
  updateDraft: (patch: Partial<Draft>) => void;
  completeOnboarding: (remindersWanted: boolean) => Promise<void>;
  logWorkout: (input: LogInput) => Promise<void>;
  updateProfile: (patch: { name?: string; photoUri?: string | null }) => Promise<void>;
  /** Invite someone (name optional). Works during onboarding and afterwards. */
  addInvite: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  preview: Preview | null;
  setPreview: (preview: Preview | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft('founder'));
  const [preview, setPreview] = useState<Preview | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    let alive = true;
    loadSession().then((saved) => {
      if (!alive) return;
      setSession(saved);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (next: SavedSession) => {
    setSession(next);
    try {
      await saveSession(next);
    } catch {
      // Storage full or unavailable: the app keeps working for this launch.
    }
  }, []);

  const startFlow = useCallback((role: Draft['role']) => setDraft(emptyDraft(role)), []);
  const updateDraft = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  const completeOnboarding = useCallback(
    async (remindersWanted: boolean) => {
      const d = draftRef.current;
      const founder = d.role === 'founder';
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
    [persist],
  );

  const logWorkout = useCallback(
    async (input: LogInput) => {
      const current = sessionRef.current;
      if (!current) return;
      const now = new Date();
      const workout: LoggedWorkout = {
        id: `w-${now.getTime()}`,
        localDate: input.day === 'today' ? dayKey(now) : addDays(dayKey(now), -1),
        loggedAt: now.toISOString(),
        type: input.type,
        minutes: input.minutes,
        note: input.note?.trim() || undefined,
        photoUri: input.photoUri ?? null,
      };
      await persist({ ...current, workouts: [...current.workouts, workout] });
    },
    [persist],
  );

  const updateProfile = useCallback(
    async (patch: { name?: string; photoUri?: string | null }) => {
      const current = sessionRef.current;
      if (!current) return;
      await persist({
        ...current,
        me: {
          ...current.me,
          name: patch.name?.trim() || current.me.name,
          photoUri: patch.photoUri === undefined ? current.me.photoUri : patch.photoUri,
        },
      });
    },
    [persist],
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
    setPreview(null);
    setSession(null);
    setDraft(emptyDraft('founder'));
    try {
      await clearSession();
    } catch {
      // Nothing to clear.
    }
  }, []);

  const builtView = useMemo(() => (session ? buildView(session, preview) : null), [session, preview]);
  // Keep the last view while signed out so screens that are animating away don't read null.
  const lastView = useRef<AppView | null>(null);
  if (builtView) lastView.current = builtView;
  const view = builtView ?? lastView.current;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      session,
      view,
      draft,
      startFlow,
      updateDraft,
      completeOnboarding,
      logWorkout,
      updateProfile,
      addInvite,
      signOut,
      preview,
      setPreview,
    }),
    [ready, session, view, draft, startFlow, updateDraft, completeOnboarding, logWorkout, updateProfile, addInvite, signOut, preview],
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
