import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, AppState as RNAppState } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig, FamilySnapshot, MemberId, PastWeekRow, PlusProduct, SaunaType, SessionComment, WallWood, WeekStartsOn } from '../data/types';
import { deviceTemperatureUnit } from '../data/saunas';
import { paletteColor } from '../data/palette';
import { PREVIEW_ME, PreviewScenario, PreviewScenarioId, buildPreviewScenario } from '../data/preview';
import * as backend from './backend';
import { InvitePreview, LogSessionInput, SessionChanges } from './backend';
import { APP_BUILD } from './appBuild';
import { AppView, NO_OPTIMISTIC, Optimistic, buildView, placeholderFamily, startingLabel } from './buildView';
import { showError } from './confirm';
import { addDays, dayKey, deviceTimezone, weekStart, yesterdayOpen } from './dates';
import { saveMindfulMinutes } from './health';
import { makeJoinCode } from './joinCode';
import { MilestoneMemory, loadMilestones, markShown, saveMilestones } from './milestones';
import {
  NotificationPermission,
  cancelAllLocalNotifications,
  cancelLegacyNotifications,
  cancelTimerNotifications,
  expoPushToken,
  requestNotificationPermission,
  notificationPermission,
  scheduleTimerNotifications,
  scheduleWeeklyReminders,
  showNotificationsInForeground,
} from './notifications';
import { FlushResult, Outbox, OutboxEntry, SessionDraft } from './outbox';
import { PhotoShape, photoForUpload } from './photos';
import { EMPTY_NAG, NagMemory, dismissNag, loadNagMemory, recordNagShown, saveNagMemory, turnOffNag } from './plus';
import { PackageId, PlusOffering, PreviewBehavior, PurchasesKind, PurchasesSwitch, loadRevenueCat } from './purchases';
import { BuyOutcome, RestoreOutcome, SyncOutcome, buyWith, restoreWith } from './plusFlow';
import { DEFAULT_LOOK, Look, effectiveLook, loadLooks, saveLooks } from './look';
import { applyAppIcon, currentAppIcon } from './appIcon';
import type { HeatSession } from './heatLog';
import { DEFAULT_REMINDER_DAYS, DEFAULT_REMINDER_TIME, weeklyReminders } from './reminders';
import {
  SavedSession,
  clearLegacyStorage,
  clearSession,
  loadCachedFamily,
  loadSession,
  loadWelcomed,
  saveCachedFamily,
  saveSession,
  saveWelcomed,
} from './session';
import * as timerMath from './timer';
import { TimerResult, TimerState } from './timer';
import { uuid } from './uuid';

/**
 * Everything the screens share: the saved session, the cached family, the
 * outbox, the timer, optimistic changes, the onboarding answers and the view the
 * screens read (buildView). docs/saunafam/DATA-LAYER.md is the guide.
 *
 * With Supabase configured and signed in, the family comes from the server and
 * is cached (arro.family.v2). Without Supabase, or with a Prototype preview
 * scenario on, it's the preview family "Sunday sauna" (src/data/preview.ts) and
 * every action works in memory.
 */

/** What onboarding collects before it's saved as a session. */
export interface Draft {
  role: 'founder' | 'invitee';
  name: string;
  familyName: string;
  photoUri: string | null;
  goal: number;
  minMinutes: number;
  weekStartsOn: WeekStartsOn;
  reminderDays: number[];
  reminderTime: string;
  /** "Remind me if I'm behind", or "No reminders" (the Reminders step). */
  remindersWanted: boolean;
  joinCode: string;
  invited: { id: string; name: string }[];
  /** Signed in with Apple (server mode only). */
  userId: string | null;
  /** The family on the server, once made or joined. */
  remote: { memberId: string; familyId: string } | null;
  /** What the invitee's code opened (server mode only). */
  invite: InvitePreview | null;
}

/** The log form's answers. The form converts °F to °C before this. */
export interface SessionForm {
  startedAt: string;
  durationMinutes: number;
  saunaType: SaunaType;
  rounds?: number;
  tempC?: number | null;
  humidityPct?: number | null;
  coldPlunge?: boolean;
  coldMinutes?: number | null;
  place?: string | null;
  note?: string | null;
  source?: 'timer' | 'manual';
  withIds?: MemberId[];
  photoUri?: string | null;
}

/** What happened to a logged session after the first try to send it. It shows on Today either way. */
export type LogOutcome =
  | { status: 'saved'; skippedNames: string[] }
  | { status: 'waiting' }
  | { status: 'refused'; message: string };

export type ScreenStatus = AppView['status'];

const emptyDraft = (role: Draft['role']): Draft => ({
  role,
  name: '',
  familyName: '',
  photoUri: null,
  goal: 3,
  minMinutes: 10,
  weekStartsOn: 1,
  reminderDays: [...DEFAULT_REMINDER_DAYS],
  reminderTime: DEFAULT_REMINDER_TIME,
  remindersWanted: true,
  joinCode: role === 'founder' ? makeJoinCode() : '',
  invited: [],
  userId: null,
  remote: null,
  invite: null,
});

interface AppContextValue {
  /** False until the saved session has been read. */
  ready: boolean;
  /** True when the app talks to Supabase. */
  online: boolean;
  session: SavedSession | null;
  /** The screens' data; null before anyone has signed in. */
  view: AppView | null;
  /** A quiet message after an optimistic change was rolled back. */
  notice: string | null;
  clearNotice: () => void;
  /** Show a quiet message the same way ("Jo already logged this one", after a save). */
  showNotice: (message: string) => void;
  /** Build 8 testers, once: "Arro is now Saunafam". */
  welcomeDue: boolean;
  dismissWelcome: () => void;

  // Onboarding and account
  draft: Draft;
  startFlow: (role: Draft['role']) => void;
  updateDraft: (patch: Partial<Draft>) => void;
  signIn: () => Promise<'cancelled' | 'continue' | 'done' | 'ask'>;
  finishSignIn: () => Promise<void>;
  saveFamilyName: () => Promise<void>;
  /**
   * Founder onboarding, Your rhythm: makes the family on the server with its
   * name and rhythm (the week start is fixed from then on). Going back and
   * changing the goal or minimum afterwards saves it as the family's rules.
   */
  saveRhythm: () => Promise<void>;
  lookUpInvite: () => Promise<void>;
  joinInvitedFamily: () => Promise<void>;
  completeOnboarding: (remindersWanted: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  /** delete-account's dry run: whether to warn about a Plus subscription first. */
  checkBeforeDelete: () => Promise<{ paysForPlus: boolean }>;
  deleteAccount: () => Promise<'deleted' | 'cancelled'>;
  refresh: () => Promise<void>;

  // Sessions
  /** Shows at once (outbox), then sends. Resolves after the first try. */
  logSession: (form: SessionForm) => Promise<LogOutcome>;
  /** A refused draft, fixed: back into the outbox with the same client id. */
  resendDraft: (clientId: string, form: SessionForm) => Promise<LogOutcome>;
  discardDraft: (clientId: string) => Promise<void>;
  /** The refused draft, for the form to prefill. */
  draftFor: (clientId: string) => SessionDraft | null;
  /** The logger changes shared details. Throws backend errors (the form shows them). */
  editSession: (anchorId: string, changes: SessionChanges) => Promise<void>;
  /** Adds, replaces (a local uri) or removes (null) the photo on your session. */
  setSessionPhoto: (anchorId: string, photoUri: string | null) => Promise<void>;
  /** The logger deletes the whole session. Optimistic. */
  deleteSession: (anchorId: string) => Promise<void>;
  /** Remove me from this session. Optimistic. */
  removeMe: (anchorId: string) => Promise<void>;
  cheer: (anchorId: string) => Promise<void>;
  uncheer: (anchorId: string) => Promise<void>;
  comment: (anchorId: string, body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  nudge: (memberId: string) => Promise<'sent' | 'already'>;

  // Timer
  /** One timer at a time: starting again returns the running one. */
  /** `at`: when it started (the tap), if that was a moment ago; now by default. */
  startTimer: (opts?: { targetMinutes?: number; saunaType?: SaunaType; at?: Date }) => Promise<TimerState>;
  coolOff: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  setTimerTarget: (minutes: number) => Promise<void>;
  setTimerSaunaType: (type: SaunaType) => Promise<void>;
  /** Done: clears the timer and hands back what the log form prefills. */
  finishTimer: () => Promise<TimerResult | null>;
  discardTimer: () => Promise<void>;
  /**
   * Dev builds only (captures): put a timer in place as if it had been running,
   * such as 12:40 into a 15 minute target. Does nothing in a release build.
   */
  devSetTimer: (state: TimerState | null) => void;
  /** The last sauna type used, for the timer's default. */
  lastSaunaType: SaunaType;

  // Me, family, settings
  updateProfile: (patch: { name?: string; photoUri?: string | null }) => Promise<void>;
  takeBreak: (days: number) => Promise<void>;
  endBreak: () => Promise<void>;
  /** Founder only. Returns "Starting Monday, Oct 26". */
  setRules: (goal: number, minMinutes: number) => Promise<string>;
  setReminders: (patch: { wanted?: boolean; days?: number[]; time?: string }) => Promise<NotificationPermission | null>;
  setWeekendCheckin: (on: boolean) => Promise<void>;
  turnOnNotifications: () => Promise<NotificationPermission>;
  addInvite: (name: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  markMilestoneShown: () => void;

  // Plus
  /** 'preview' while the fake store is in use: the sheet says "Preview, no real purchase". */
  purchasesKind: PurchasesKind;
  /** Prices from the offering; null when the App Store can't be reached. */
  loadOffering: () => Promise<PlusOffering | null>;
  /** Buys, then asks the server (sync-plus, family_plus). Tips skip the server. */
  buyPlus: (pkg: PackageId) => Promise<BuyOutcome>;
  restorePurchases: () => Promise<RestoreOutcome>;
  /** Every week and every session (Every week, the Heat log, the poster). */
  loadArchive: () => Promise<Archive>;
  /** Your own timer face and app icon pick, and what shows (the pick only while the family has Plus). */
  myLook: Look;
  look: Look;
  setLook: (patch: Partial<Look>) => void;
  /** Throws backend.NeedsPlusError without Plus. */
  setWallWood: (wood: WallWood) => Promise<void>;
  recordNagShown: () => void;
  dismissNag: () => void;
  turnOffNag: () => void;

  // Prototype preview
  preview: PreviewScenarioId | null;
  setPreview: (id: PreviewScenarioId | null) => void;
  /** What the preview's fake App Store does next, how long it takes, and how long the pretend server waits. */
  setPreviewPurchases: (behavior: PreviewBehavior, timing?: { storeMs?: number; serverMs?: number }) => void;
}

export interface Archive {
  history: PastWeekRow[];
  sessions: HeatSession[];
}

const AppContext = createContext<AppContextValue | null>(null);

/** Reads the outbox and drafts from AsyncStorage. */
const asyncStore = {
  getItem: (k: string) => AsyncStorage.getItem(k),
  setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
  removeItem: (k: string) => AsyncStorage.removeItem(k),
};

function toInput(familyId: string, clientId: string, form: SessionForm): LogSessionInput {
  return {
    familyId,
    clientId,
    startedAt: form.startedAt,
    durationMinutes: form.durationMinutes,
    saunaType: form.saunaType,
    rounds: form.rounds ?? 1,
    tempC: form.tempC ?? null,
    humidityPct: form.humidityPct ?? null,
    coldPlunge: form.coldPlunge ?? false,
    coldMinutes: form.coldPlunge ? (form.coldMinutes ?? null) : null,
    place: form.place?.trim() || null,
    note: form.note?.trim() || null,
    source: form.source ?? 'manual',
    withIds: form.withIds ?? [],
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [family, setFamily] = useState<FamilySnapshot | null>(null);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [offline, setOffline] = useState(false);
  const [config, setConfig] = useState<AppConfig>(backend.DEFAULT_APP_CONFIG);
  const [queue, setQueue] = useState<{ entries: OutboxEntry[]; drafts: SessionDraft[] }>({ entries: [], drafts: [] });
  const [optimistic, setOptimistic] = useState<Optimistic>(NO_OPTIMISTIC);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [lastSaunaType, setLastSaunaType] = useState<SaunaType>('traditional');
  const [milestones, setMilestones] = useState<MilestoneMemory>({});
  const [nagMemory, setNagMemory] = useState<Record<MemberId, NagMemory>>({});
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('founder'));
  const [notice, setNotice] = useState<string | null>(null);
  const [welcomeDue, setWelcomeDue] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [unit] = useState(deviceTemperatureUnit);
  const [frozenView, setFrozenView] = useState<AppView | null>(null);

  // Prototype preview: a scenario, plus what you've done inside it.
  const [previewId, setPreviewId] = useState<PreviewScenarioId | null>(null);
  const [scenario, setScenario] = useState<PreviewScenario | null>(null);
  const [previewLogged, setPreviewLogged] = useState<OutboxEntry[]>([]);

  // Latest values for callbacks. Written only from event handlers and effects.
  const sessionRef = useRef<SavedSession | null>(null);
  const familyRef = useRef<FamilySnapshot | null>(null);
  const draftRef = useRef<Draft>(draft);
  const timerRef = useRef<TimerState | null>(null);
  const previewRef = useRef<PreviewScenarioId | null>(null);
  const pushTokenRef = useRef<string | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSignInRef = useRef<SavedSession | null>(null);
  const scenarioRef = useRef<PreviewScenario | null>(null);
  const lastSaunaTypeRef = useRef<SaunaType>('traditional');
  const viewRef = useRef<AppView | null>(null);

  const [outbox] = useState(() => new Outbox({ store: asyncStore, send: backend.logSession, isRefusal: backend.isRefusal }));
  const [purchases] = useState(() => new PurchasesSwitch());
  const [looks, setLooks] = useState<Record<MemberId, Look>>({});
  const previewServerDelay = useRef(0);
  /** Bumped each time a preview scenario is picked. */
  const previewGen = useRef(0);

  const commitSession = useCallback((next: SavedSession | null) => {
    sessionRef.current = next;
    setSession(next);
    if (next) saveSession(next).catch(() => undefined);
  }, []);

  const commitFamily = useCallback((next: FamilySnapshot | null) => {
    familyRef.current = next;
    setFamily(next);
  }, []);

  const commitScenario = useCallback((update: (s: PreviewScenario) => PreviewScenario) => {
    const current = scenarioRef.current;
    if (!current) return;
    const next = update(current);
    scenarioRef.current = next;
    setScenario(next);
  }, []);

  /** Preview or no server: actions change what's on screen and nothing else. */
  const inPreview = useCallback(() => !!previewRef.current || !sessionRef.current?.remote, []);
  const myIdNow = useCallback(
    () => (previewRef.current ? PREVIEW_ME : (sessionRef.current?.remote?.memberId ?? sessionRef.current?.me.id ?? '')),
    [],
  );

  const commitDraft = useCallback((update: (d: Draft) => Draft) => {
    const next = update(draftRef.current);
    draftRef.current = next;
    setDraft(next);
  }, []);

  const commitTimer = useCallback((next: TimerState | null) => {
    timerRef.current = next;
    setTimer(next);
    // A Prototype preview scenario's timer stays in memory. Your own timer, with or
    // without a server, is stored, so it survives the app being killed.
    if (!previewRef.current) timerMath.saveTimer(next).catch(() => undefined);
  }, []);

  const syncQueue = useCallback(() => setQueue({ entries: outbox.pending(), drafts: outbox.refusedDrafts() }), [outbox]);
  const tick = useCallback(() => setClock(new Date()), []);

  // The clock buildView reads: each 30 s, and on every return to the app.
  useEffect(() => {
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [tick]);

  /** Shrinks a picked photo and uploads it to your folder, returning its path. */
  const uploadMine = useCallback(async (remote: NonNullable<SavedSession['remote']>, uri: string, shape: PhotoShape, prefix: string) => {
    const jpeg = await photoForUpload(uri, shape);
    return backend.uploadPhoto(remote.familyId, remote.memberId, `${prefix}-${Date.now()}`, jpeg);
  }, []);

  // ─── Sign out (needed by refresh, for someone removed from the family) ──────

  const clearAll = useCallback(async () => {
    setPreviewId(null);
    previewRef.current = null;
    setScenario(null);
    commitSession(null);
    commitFamily(null);
    commitTimer(null);
    setOptimistic(NO_OPTIMISTIC);
    commitDraft(() => emptyDraft('founder'));
    await Promise.all([
      clearSession().catch(() => undefined),
      timerMath.saveTimer(null).catch(() => undefined),
      outbox.clear().catch(() => undefined),
      cancelAllLocalNotifications(),
    ]);
    syncQueue();
  }, [commitDraft, commitFamily, commitSession, commitTimer, outbox, syncQueue]);

  const signOutNow = useCallback(async () => {
    const token = pushTokenRef.current;
    if (token) await backend.forgetPushToken(token).catch(() => undefined);
    pushTokenRef.current = null;
    await purchases.logOut().catch(() => undefined);
    await backend.signOut().catch(() => undefined);
    await clearAll();
  }, [clearAll, purchases]);

  // ─── Refresh and the outbox ────────────────────────────────────────────────

  const flushOutbox = useRef<(force?: boolean) => Promise<FlushResult | null>>(async () => null);

  /** Fetch the family again. Keeps the cached one if the phone is offline. */
  const refresh = useCallback(async () => {
    const remote = sessionRef.current?.remote;
    if (!remote || previewRef.current) return;
    backend.fetchAppConfig().then(setConfig).catch(() => undefined);
    try {
      const next = await backend.fetchFamily(remote.familyId, remote.memberId);
      commitFamily(next);
      setStatus('ready');
      setOffline(false);
      saveCachedFamily(next).catch(() => undefined);
      tick();
      // A request that worked: anything waiting goes now.
      flushOutbox.current().catch(() => undefined);
      const mine = next.members.find((m) => m.id === remote.memberId);
      const tz = deviceTimezone();
      if (mine && mine.timezone !== tz) await backend.updateMember(remote.memberId, { timezone: tz }).catch(() => undefined);
    } catch (error) {
      if (backend.isNetworkError(error)) setOffline(true);
      setStatus(familyRef.current ? 'ready' : 'error');
      const membership = await backend.myMembership(remote.userId).catch(() => undefined);
      if (membership === null) {
        const name = familyRef.current?.name ?? 'your family';
        await signOutNow();
        showError(`You’re no longer in ${name}`, 'To join again, ask someone in the family for a new code.');
      }
    }
  }, [commitFamily, signOutNow, tick]);

  useEffect(() => {
    flushOutbox.current = async (force = false) => {
      const current = sessionRef.current;
      if (!current?.remote || previewRef.current) return null;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
      const result = await outbox.flush(force);
      syncQueue();
      if (result.sent.length) {
        setOffline(false);
        backend.sendQueuedPushes().catch(() => undefined);
        for (const { entry, rows } of result.sent) {
          const anchorId = rows[0]?.sessionId;
          if (!anchorId) continue;
          saveMindfulMinutes({ id: anchorId, startedAt: entry.input.startedAt, durationMinutes: entry.input.durationMinutes });
          if (entry.photoUri) {
            try {
              const path = await uploadMine(current.remote, entry.photoUri, 'landscape', `session-${anchorId}`);
              await backend.setSessionPhoto(anchorId, path);
              const s = sessionRef.current;
              if (s?.photos?.[entry.input.clientId]) {
                const photos = { ...s.photos };
                delete photos[entry.input.clientId];
                commitSession({ ...s, photos });
              }
            } catch {
              // Saved without it; the photo stays on this phone and can be added again from the session.
              const s = sessionRef.current;
              if (s) commitSession({ ...s, photos: { ...s.photos, [anchorId]: entry.photoUri } });
            }
          }
        }
        refresh().catch(() => undefined);
      }
      if (result.error && backend.isNetworkError(result.error)) setOffline(true);
      const due = outbox.nextDueAt();
      if (due !== null) {
        retryTimer.current = setTimeout(() => {
          flushOutbox.current().catch(() => undefined);
        }, Math.max(1000, due - Date.now()));
      }
      return result;
    };
  }, [commitSession, outbox, refresh, syncQueue, uploadMine]);

  // ─── Reminders ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.remote || previewId || !family) return;
    if (!session.me.remindersWanted) {
      scheduleWeeklyReminders([]);
      return;
    }
    const week = family.memberWeeks[session.remote.memberId];
    scheduleWeeklyReminders(
      weeklyReminders({
        days: session.me.reminderDays,
        time: session.me.reminderTime,
        weekStartsOn: family.weekStartsOn,
        goal: week?.goal ?? family.goalPerWeek,
        countedDays: week?.countedDays ?? 0,
        minMinutes: week?.minMinutes ?? family.minMinutes,
        pauses: family.pauses.filter((p) => p.memberId === session.remote?.memberId),
      }),
    );
  }, [session, family, previewId]);

  /** Gives the server this phone's push token, once there's permission and a family. */
  const registerPush = useCallback(async () => {
    if (!sessionRef.current?.remote) return;
    const token = await expoPushToken();
    if (!token) return;
    try {
      await backend.registerPushToken(token);
      pushTokenRef.current = token;
    } catch {
      // Offline: the next launch registers it.
    }
  }, []);

  // ─── Launch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;
    showNotificationsInForeground();
    clearLegacyStorage().catch(() => undefined);
    cancelLegacyNotifications();
    (async () => {
      let saved = await loadSession();
      const [welcomed, lastType, memory, nag, savedLooks] = await Promise.all([
        loadWelcomed(),
        timerMath.loadLastSaunaType(),
        loadMilestones(),
        loadNagMemory(),
        loadLooks(),
      ]);
      if (saved?.remote) {
        const remote = saved.remote;
        // The Supabase login is gone (signed out elsewhere, account deleted): back to onboarding.
        const userId = await backend.currentUserId().catch(() => remote.userId);
        if (userId !== remote.userId) {
          await clearSession().catch(() => undefined);
          saved = null;
        } else {
          const cached = await loadCachedFamily();
          if (alive && cached?.id === remote.familyId) {
            commitFamily(cached);
            setStatus('ready');
          }
          const storedTimer = await timerMath.loadTimer();
          if (alive && storedTimer) commitTimer(storedTimer);
          await outbox.load();
          purchases.logIn(remote.userId).catch(() => undefined);
        }
      }
      if (saved && !saved.remote) {
        // No server (a dev build without .env.local): the timer is still yours.
        const storedTimer = await timerMath.loadTimer();
        if (alive && storedTimer) commitTimer(storedTimer);
      }
      if (!alive) return;
      sessionRef.current = saved;
      setSession(saved);
      setLastSaunaType(lastType);
      setMilestones(memory);
      setNagMemory(nag);
      setLooks(savedLooks);
      // Someone already signed in from Arro sees "Arro is now Saunafam" once.
      setWelcomeDue(!!saved && !welcomed);
      syncQueue();
      setReady(true);
      if (saved?.remote) {
        refresh();
        registerPush();
        flushOutbox.current(true).catch(() => undefined);
      }
    })();
    return () => {
      alive = false;
    };
  }, [commitFamily, commitTimer, outbox, purchases, refresh, registerPush, syncQueue]);

  // Coming back to the app: a new clock, the family, and anything waiting to send.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      tick();
      refresh();
      flushOutbox.current(true).catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh, tick]);

  // ─── Onboarding ────────────────────────────────────────────────────────────

  const startFlow = useCallback((role: Draft['role']) => commitDraft(() => emptyDraft(role)), [commitDraft]);
  const updateDraft = useCallback((patch: Partial<Draft>) => commitDraft((d) => ({ ...d, ...patch })), [commitDraft]);

  const remoteSession = useCallback(
    (d: Draft, remote: NonNullable<SavedSession['remote']>, remindersWanted: boolean, familyName: string): SavedSession => ({
      version: 1,
      role: d.role,
      me: {
        id: remote.memberId,
        name: d.name.trim() || 'You',
        color: paletteColor(0),
        photoUri: d.photoUri,
        reminderDays: d.reminderDays,
        reminderTime: d.reminderTime,
        remindersWanted,
        joinedOn: dayKey(),
      },
      family: { name: familyName, joinCode: '', invited: d.invited },
      remote,
      photos: {},
    }),
    [],
  );

  const openExisting = useCallback(
    async (next: SavedSession) => {
      commitSession(next);
      // Signing in on a new phone isn't the Arro-to-Saunafam moment.
      saveWelcomed().catch(() => undefined);
      if (next.remote) purchases.logIn(next.remote.userId).catch(() => undefined);
      await refresh();
      registerPush();
    },
    [commitSession, purchases, refresh, registerPush],
  );

  const signIn = useCallback(async (): Promise<'cancelled' | 'continue' | 'done' | 'ask'> => {
    const result = await backend.signInWithApple();
    if (!result) return 'cancelled';
    const d = draftRef.current;
    const existing = await backend.myMembership(result.userId);
    if (existing) {
      const next = remoteSession({ ...d, name: d.name || result.givenName || '' }, { userId: result.userId, ...existing }, false, '');
      if ((await notificationPermission()) === 'undetermined') {
        pendingSignInRef.current = next;
        return 'ask';
      }
      await openExisting(next);
      return 'done';
    }
    commitDraft((cur) => ({ ...cur, userId: result.userId, name: cur.name || result.givenName || '' }));
    return 'continue';
  }, [commitDraft, openExisting, remoteSession]);

  const finishSignIn = useCallback(async () => {
    const next = pendingSignInRef.current;
    if (!next) return;
    pendingSignInRef.current = null;
    await openExisting(next);
  }, [openExisting]);

  /** Name your family: only a rename once the family exists. It's made at Your rhythm (saveRhythm). */
  const saveFamilyName = useCallback(async () => {
    const d = draftRef.current;
    if (!backend.backendEnabled || !d.userId || !d.remote) return;
    await backend.renameFamily(d.remote.familyId, d.familyName.trim());
  }, []);

  const saveRhythm = useCallback(async () => {
    const d = draftRef.current;
    if (!backend.backendEnabled || !d.userId) return;
    if (d.remote) {
      await backend.setFamilyRules(d.remote.familyId, d.goal, d.minMinutes);
      return;
    }
    const remote = await backend.createFamily({
      familyName: d.familyName.trim(),
      displayName: d.name.trim() || 'Me',
      timezone: deviceTimezone(),
      reminderTime: d.reminderTime,
      goal: d.goal,
      minMinutes: d.minMinutes,
      weekStartsOn: d.weekStartsOn,
    });
    const code = await backend.ensureInviteCode(remote.familyId, remote.memberId);
    commitDraft((cur) => ({ ...cur, remote, joinCode: code }));
  }, [commitDraft]);

  const lookUpInvite = useCallback(async () => {
    if (!backend.backendEnabled) return;
    const invite = await backend.previewInvite(draftRef.current.joinCode);
    commitDraft((cur) => ({ ...cur, invite, familyName: invite.familyName }));
  }, [commitDraft]);

  const joinInvitedFamily = useCallback(async () => {
    const d = draftRef.current;
    if (!backend.backendEnabled || !d.userId || d.remote) return;
    const remote = await backend.joinFamily(d.joinCode, d.name.trim() || 'Me', deviceTimezone(), d.reminderTime);
    commitDraft((cur) => ({ ...cur, remote }));
    backend.sendQueuedPushes().catch(() => undefined);
  }, [commitDraft]);

  const completeOnboarding = useCallback(
    async (remindersWanted: boolean) => {
      const d = draftRef.current;
      saveWelcomed().catch(() => undefined);
      if (backend.backendEnabled && d.userId) {
        let remote = d.remote;
        if (remote) {
          await backend.updateMember(remote.memberId, { reminderTime: d.reminderTime });
        } else if (d.role === 'invitee') {
          remote = await backend.joinFamily(d.joinCode, d.name.trim() || 'Me', deviceTimezone(), d.reminderTime);
          backend.sendQueuedPushes().catch(() => undefined);
        }
        if (!remote) throw new Error('No family yet');
        const fullRemote = { userId: d.userId, ...remote };
        const next = remoteSession(d, fullRemote, remindersWanted, d.familyName.trim());
        commitSession(next);
        purchases.logIn(d.userId).catch(() => undefined);
        if (d.photoUri) {
          try {
            const path = await uploadMine(fullRemote, d.photoUri, 'square', 'avatar');
            await backend.setMemberPhoto(remote.memberId, path);
          } catch {
            // Offline or Storage isn't set up yet: it stays on this phone.
          }
        }
        await refresh();
        registerPush();
        return;
      }
      // No server: the preview family, with you as Sam.
      commitSession({
        version: 1,
        role: d.role,
        me: {
          id: PREVIEW_ME,
          name: d.name.trim() || 'Sam',
          color: paletteColor(0),
          photoUri: d.photoUri,
          reminderDays: d.reminderDays,
          reminderTime: d.reminderTime,
          remindersWanted,
          joinedOn: dayKey(),
        },
        family: { name: d.familyName.trim() || 'Sunday sauna', joinCode: d.joinCode, invited: d.invited },
      });
    },
    [commitSession, purchases, refresh, registerPush, remoteSession, uploadMine],
  );

  const signOut = useCallback(async () => {
    setFrozenView(viewRef.current);
    await signOutNow();
  }, [signOutNow]);

  const checkBeforeDelete = useCallback(async () => {
    if (!sessionRef.current?.remote || previewRef.current) return { paysForPlus: false };
    return backend.deleteAccountDryRun().catch(() => ({ paysForPlus: false }));
  }, []);

  const deleteAccount = useCallback(async () => {
    const remote = sessionRef.current?.remote;
    if (remote && (await backend.deleteAccount(remote)) === 'cancelled') return 'cancelled';
    setFrozenView(viewRef.current);
    pushTokenRef.current = null;
    await purchases.logOut().catch(() => undefined);
    await clearAll();
    return 'deleted';
  }, [clearAll, purchases]);

  // ─── Sessions ──────────────────────────────────────────────────────────────

  /** Roll an optimistic change back and say so quietly. */
  const rollBack = useCallback((undo: (o: Optimistic) => Optimistic, message: string) => {
    setOptimistic(undo);
    setNotice(message);
  }, []);

  const outcomeFor = useCallback(
    async (clientId: string): Promise<LogOutcome> => {
      const result = await flushOutbox.current(true);
      const draftHit = outbox.refusedDrafts().find((d) => d.input.clientId === clientId);
      if (draftHit) return { status: 'refused', message: draftHit.message };
      if (outbox.pending().some((e) => e.input.clientId === clientId)) return { status: 'waiting' };
      // "Jo already logged this one" for anyone the server skipped.
      const rows = result?.sent.find((x) => x.entry.input.clientId === clientId)?.rows ?? [];
      const names = familyRef.current?.members ?? [];
      return {
        status: 'saved',
        skippedNames: rows.filter((r) => r.skipped).map((r) => names.find((m) => m.id === r.memberId)?.name ?? 'Someone'),
      };
    },
    [outbox],
  );

  const enqueue = useCallback(
    async (clientId: string, form: SessionForm): Promise<LogOutcome> => {
      const current = sessionRef.current;
      if (!current) return { status: 'waiting' };
      timerMath.saveLastSaunaType(form.saunaType).catch(() => undefined);
      setLastSaunaType(form.saunaType);
      if (inPreview()) {
        const input = toInput('preview-family', clientId, form);
        setPreviewLogged((list) => [
          ...list,
          {
            input,
            memberId: previewRef.current ? PREVIEW_ME : current.me.id,
            photoUri: form.photoUri ?? null,
            createdAt: new Date().toISOString(),
            attempts: 0,
            nextAttemptAt: 0,
            lastError: null,
          },
        ]);
        tick();
        return { status: 'saved', skippedNames: [] };
      }
      const remote = current.remote as NonNullable<SavedSession['remote']>;
      // The photo shows from this phone until the uploaded copy loads.
      if (form.photoUri) commitSession({ ...current, photos: { ...current.photos, [clientId]: form.photoUri } });
      await outbox.enqueue(toInput(remote.familyId, clientId, form), remote.memberId, form.photoUri ?? null);
      syncQueue();
      tick();
      const outcome = await outcomeFor(clientId);
      return outcome;
    },
    [commitSession, inPreview, outbox, outcomeFor, syncQueue, tick],
  );

  const logSession = useCallback((form: SessionForm) => enqueue(uuid(), form), [enqueue]);

  const resendDraft = useCallback(
    async (clientId: string, form: SessionForm) => {
      if (inPreview()) commitScenario((s) => ({ ...s, drafts: s.drafts.filter((d) => d.input.clientId !== clientId) }));
      return enqueue(clientId, form);
    },
    [commitScenario, enqueue, inPreview],
  );

  const discardDraft = useCallback(
    async (clientId: string) => {
      if (previewRef.current) {
        commitScenario((s) => ({ ...s, drafts: s.drafts.filter((d) => d.input.clientId !== clientId) }));
        return;
      }
      await outbox.discardDraft(clientId);
      syncQueue();
    },
    [commitScenario, outbox, syncQueue],
  );

  const draftFor = useCallback(
    (clientId: string) =>
      [...outbox.refusedDrafts(), ...(scenarioRef.current?.drafts ?? [])].find((d) => d.input.clientId === clientId) ?? null,
    [outbox],
  );

  const editSession = useCallback(
    async (anchorId: string, changes: SessionChanges) => {
      if (inPreview()) return;
      await backend.updateSession(anchorId, changes);
      await refresh();
    },
    [inPreview, refresh],
  );

  const setSessionPhoto = useCallback(
    async (anchorId: string, photoUri: string | null) => {
      const current = sessionRef.current;
      if (!current?.remote || previewRef.current) return;
      const oldPath = familyRef.current?.sessions.find((s) => s.id === anchorId)?.photoPath;
      const path = photoUri ? await uploadMine(current.remote, photoUri, 'landscape', `session-${anchorId}`) : null;
      await backend.setSessionPhoto(anchorId, path);
      if (oldPath) backend.removePhoto(oldPath).catch(() => undefined);
      if (current.photos?.[anchorId]) {
        const photos = { ...current.photos };
        delete photos[anchorId];
        commitSession({ ...current, photos });
      }
      await refresh();
    },
    [commitSession, refresh, uploadMine],
  );

  const deleteSession = useCallback(
    async (anchorId: string) => {
      setOptimistic((o) => ({ ...o, removedSessions: [...o.removedSessions, anchorId] }));
      if (inPreview()) return;
      try {
        const photo = familyRef.current?.sessions.find((s) => s.id === anchorId)?.photoPath;
        await backend.deleteSession(anchorId);
        if (photo) backend.removePhoto(photo).catch(() => undefined);
        await refresh();
      } catch {
        rollBack((o) => ({ ...o, removedSessions: o.removedSessions.filter((id) => id !== anchorId) }), 'Couldn’t delete that session. Try again.');
      }
    },
    [inPreview, refresh, rollBack],
  );

  const removeMe = useCallback(
    async (anchorId: string) => {
      const myId = myIdNow();
      const fam = previewRef.current ? scenarioRef.current?.family : familyRef.current;
      const row = fam?.sessions.find((s) => (s.sharedId ?? s.id) === anchorId && s.memberId === myId);
      if (!row) return;
      setOptimistic((o) => ({ ...o, removedRows: [...o.removedRows, row.id] }));
      if (inPreview()) return;
      try {
        await backend.removeMeFromSession(row.id);
        await refresh();
      } catch {
        rollBack((o) => ({ ...o, removedRows: o.removedRows.filter((id) => id !== row.id) }), 'Couldn’t take you off that session. Try again.');
      }
    },
    [inPreview, myIdNow, refresh, rollBack],
  );

  const setCheer = useCallback(
    async (anchorId: string, on: boolean) => {
      setOptimistic((o) => ({ ...o, cheers: { ...o.cheers, [anchorId]: on } }));
      if (inPreview()) return;
      const myId = myIdNow();
      try {
        if (on) await backend.cheerSession(myId, anchorId);
        else await backend.uncheerSession(myId, anchorId);
        backend.sendQueuedPushes().catch(() => undefined);
      } catch {
        rollBack((o) => {
          const cheers = { ...o.cheers };
          delete cheers[anchorId];
          return { ...o, cheers };
        }, on ? 'Couldn’t send that cheer. Try again.' : 'Couldn’t take that cheer back. Try again.');
      }
    },
    [inPreview, myIdNow, rollBack],
  );
  const cheer = useCallback((anchorId: string) => setCheer(anchorId, true), [setCheer]);
  const uncheer = useCallback((anchorId: string) => setCheer(anchorId, false), [setCheer]);

  const comment = useCallback(
    async (anchorId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      const pendingComment: SessionComment = {
        id: `pending-comment-${uuid()}`,
        sessionId: anchorId,
        memberId: myIdNow(),
        body: text,
        createdAt: new Date().toISOString(),
        pending: !inPreview(),
      };
      setOptimistic((o) => ({ ...o, comments: [...o.comments, pendingComment] }));
      if (inPreview()) return;
      try {
        await backend.addComment(pendingComment.memberId, anchorId, text);
        backend.sendQueuedPushes().catch(() => undefined);
        await refresh();
        setOptimistic((o) => ({ ...o, comments: o.comments.filter((c) => c.id !== pendingComment.id) }));
      } catch (error) {
        const tooMany = (error as { code?: string })?.code === 'P0001';
        rollBack(
          (o) => ({ ...o, comments: o.comments.filter((c) => c.id !== pendingComment.id) }),
          tooMany ? 'That’s 20 comments today. Try again tomorrow.' : 'Couldn’t send that comment. Try again.',
        );
      }
    },
    [inPreview, myIdNow, refresh, rollBack],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      setOptimistic((o) => ({ ...o, deletedComments: [...o.deletedComments, commentId] }));
      if (inPreview() || commentId.startsWith('pending-')) return;
      try {
        await backend.deleteComment(commentId);
        await refresh();
      } catch {
        rollBack((o) => ({ ...o, deletedComments: o.deletedComments.filter((id) => id !== commentId) }), 'Couldn’t delete that comment. Try again.');
      }
    },
    [inPreview, refresh, rollBack],
  );

  const nudge = useCallback(async (memberId: string): Promise<'sent' | 'already'> => {
    const current = sessionRef.current;
    if (!current?.remote || previewRef.current) return 'sent';
    const result = await backend.sendNudge(current.remote.memberId, memberId);
    if (result === 'sent') backend.sendQueuedPushes().catch(() => undefined);
    return result;
  }, []);

  // ─── Timer ─────────────────────────────────────────────────────────────────

  const familyMin = useCallback(() => {
    const fam = previewRef.current ? scenarioRef.current?.family : familyRef.current;
    const id = myIdNow();
    return fam?.memberWeeks[id]?.minMinutes ?? fam?.minMinutes ?? 10;
  }, [myIdNow]);

  const startTimer = useCallback(
    async (opts: { targetMinutes?: number; saunaType?: SaunaType; at?: Date } = {}) => {
      if (timerRef.current) return timerRef.current;
      const now = new Date();
      const next = timerMath.startTimer(opts.at && opts.at.getTime() <= now.getTime() ? opts.at : now, {
        targetMinutes: opts.targetMinutes ?? timerMath.defaultTargetMinutes(familyMin()),
        saunaType: opts.saunaType ?? lastSaunaTypeRef.current,
      });
      commitTimer(next);
      scheduleTimerNotifications(timerMath.notificationTimes(next, now), next.targetMinutes);
      return next;
    },
    [commitTimer, familyMin],
  );

  const changeTimer = useCallback(
    async (change: (t: TimerState, now: Date) => TimerState) => {
      const current = timerRef.current;
      if (!current) return;
      const now = new Date();
      const next = change(current, now);
      commitTimer(next);
      tick();
      if (timerMath.phase(next) === 'heat') scheduleTimerNotifications(timerMath.notificationTimes(next, now), next.targetMinutes);
      else cancelTimerNotifications();
    },
    [commitTimer, tick],
  );

  const coolOff = useCallback(() => changeTimer(timerMath.coolOff), [changeTimer]);
  const resumeTimer = useCallback(() => changeTimer(timerMath.resume), [changeTimer]);
  const setTimerTarget = useCallback((m: number) => changeTimer((t) => timerMath.setTarget(t, m)), [changeTimer]);
  const setTimerSaunaType = useCallback((s: SaunaType) => changeTimer((t) => timerMath.setSaunaType(t, s)), [changeTimer]);

  const finishTimer = useCallback(async () => {
    const current = timerRef.current;
    if (!current) return null;
    const result = timerMath.finish(current, new Date());
    commitTimer(null);
    cancelTimerNotifications();
    return result;
  }, [commitTimer]);

  const discardTimer = useCallback(async () => {
    commitTimer(null);
    cancelTimerNotifications();
  }, [commitTimer]);

  const devSetTimer = useCallback(
    (state: TimerState | null) => {
      if (!__DEV__) return;
      commitTimer(state);
      tick();
    },
    [commitTimer, tick],
  );

  // ─── Me, family, settings ──────────────────────────────────────────────────

  const updateProfile = useCallback(
    async (patch: { name?: string; photoUri?: string | null }) => {
      const current = sessionRef.current;
      if (!current) return;
      const name = patch.name?.trim() || undefined;
      const before = current;
      setOptimistic((o) => ({ ...o, profile: { ...o.profile, ...(name ? { name } : {}), ...(patch.photoUri !== undefined ? { photoUri: patch.photoUri } : {}) } }));
      commitSession({ ...current, me: { ...current.me, name: name ?? current.me.name, photoUri: patch.photoUri === undefined ? current.me.photoUri : patch.photoUri } });
      if (inPreview()) return;
      const remote = current.remote as NonNullable<SavedSession['remote']>;
      try {
        if (name && name !== before.me.name) await backend.updateMember(remote.memberId, { name });
        if (patch.photoUri !== undefined && patch.photoUri !== before.me.photoUri) {
          const oldPath = familyRef.current?.members.find((m) => m.id === remote.memberId)?.photoPath;
          const path = patch.photoUri ? await uploadMine(remote, patch.photoUri, 'square', 'avatar') : null;
          await backend.setMemberPhoto(remote.memberId, path);
          if (oldPath) backend.removePhoto(oldPath).catch(() => undefined);
        }
        await refresh();
        setOptimistic((o) => ({ ...o, profile: null }));
      } catch {
        commitSession(before);
        rollBack((o) => ({ ...o, profile: null }), 'Couldn’t save your profile. Try again.');
      }
    },
    [commitSession, inPreview, refresh, rollBack, uploadMine],
  );

  /** Prototype preview: Settings' writes change the scenario's family in memory. */
  const changePreviewFamily = useCallback(
    (update: (f: FamilySnapshot, today: string) => FamilySnapshot) =>
      commitScenario((s) => (s.family ? { ...s, family: update(s.family, dayKey(s.now)) } : s)),
    [commitScenario],
  );

  const takeBreak = useCallback(
    async (days: number) => {
      const remote = sessionRef.current?.remote;
      if (previewRef.current) {
        changePreviewFamily((f, today) => {
          const current = f.pauses.find((p) => p.memberId === PREVIEW_ME && p.startsOn <= today && today <= p.endsOn);
          const others = f.pauses.filter((p) => p !== current);
          return { ...f, pauses: [...others, { memberId: PREVIEW_ME, startsOn: current?.startsOn ?? today, endsOn: addDays(today, days - 1) }] };
        });
        return;
      }
      if (!remote) return;
      await backend.pauseMe(remote.memberId, days);
      await refresh();
    },
    [changePreviewFamily, refresh],
  );

  const endBreak = useCallback(async () => {
    const remote = sessionRef.current?.remote;
    if (previewRef.current) {
      changePreviewFamily((f, today) => ({
        ...f,
        pauses: f.pauses
          .filter((p) => !(p.memberId === PREVIEW_ME && p.startsOn >= today))
          .map((p) => (p.memberId === PREVIEW_ME && p.startsOn < today && today <= p.endsOn ? { ...p, endsOn: addDays(today, -1) } : p)),
      }));
      return;
    }
    if (!remote) return;
    await backend.endMyPause(remote.memberId);
    await refresh();
  }, [changePreviewFamily, refresh]);

  const setRules = useCallback(
    async (goal: number, minMinutes: number) => {
      const remote = sessionRef.current?.remote;
      if (previewRef.current) {
        const today = dayKey(scenarioRef.current?.now ?? new Date());
        const next = addDays(weekStart(today, scenarioRef.current?.family?.weekStartsOn ?? 1), 7);
        changePreviewFamily((f) => ({
          ...f,
          goalPerWeek: goal,
          minMinutes,
          rules: [...f.rules.filter((r) => r.effectiveFrom < next), { effectiveFrom: next, goalPerWeek: goal, minMinutes }],
        }));
        return startingLabel(next);
      }
      if (!remote) return startingLabel(dayKey());
      const from = await backend.setFamilyRules(remote.familyId, goal, minMinutes);
      await refresh();
      return startingLabel(from);
    },
    [changePreviewFamily, refresh],
  );

  const setReminders = useCallback(
    async (patch: { wanted?: boolean; days?: number[]; time?: string }): Promise<NotificationPermission | null> => {
      const current = sessionRef.current;
      if (!current) return null;
      const time = patch.time ?? current.me.reminderTime;
      if (current.remote && time !== current.me.reminderTime) {
        await backend.updateMember(current.remote.memberId, { reminderTime: time });
      }
      const wanted = patch.wanted ?? current.me.remindersWanted;
      const permission = wanted ? await requestNotificationPermission() : null;
      commitSession({ ...current, me: { ...current.me, reminderTime: time, reminderDays: patch.days ?? current.me.reminderDays, remindersWanted: wanted } });
      if (permission === 'granted') registerPush();
      return permission;
    },
    [commitSession, registerPush],
  );

  const setWeekendCheckin = useCallback(
    async (on: boolean) => {
      const remote = sessionRef.current?.remote;
      if (previewRef.current) {
        changePreviewFamily((f) => ({ ...f, members: f.members.map((m) => (m.id === PREVIEW_ME ? { ...m, weekendCheckin: on } : m)) }));
        return;
      }
      if (!remote) return;
      await backend.updateMember(remote.memberId, { weekendCheckin: on });
      await refresh();
    },
    [changePreviewFamily, refresh],
  );

  const turnOnNotifications = useCallback(async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') registerPush();
    return permission;
  }, [registerPush]);

  const addInvite = useCallback(
    async (name: string) => {
      const person = { id: `invite-${Date.now()}`, name: name.trim() };
      if (!person.name) return;
      const current = sessionRef.current;
      if (!current) {
        commitDraft((d) => ({ ...d, invited: [...d.invited, person] }));
        return;
      }
      commitSession({ ...current, family: { ...current.family, invited: [...current.family.invited, person] } });
    },
    [commitDraft, commitSession],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      if (inPreview()) return;
      await backend.removeMember(memberId);
      await refresh();
    },
    [inPreview, refresh],
  );

  const markMilestoneShown = useCallback(() => {
    const due = viewRef.current?.milestone;
    if (!due) return;
    if (previewRef.current) {
      commitScenario((s) => ({ ...s, milestonesShown: true }));
      return;
    }
    setMilestones((m) => {
      const next = markShown(m, myIdNow(), due);
      saveMilestones(next).catch(() => undefined);
      return next;
    });
  }, [commitScenario, myIdNow]);

  // ─── Plus ──────────────────────────────────────────────────────────────────

  // RevenueCat only once app_config turns Plus on and the build has a key; the fake otherwise.
  const remoteUserId = session?.remote?.userId ?? null;
  // Decided during render on purpose: the sheet must never see the fake store's
  // label for a moment when the real one is in use. update() is idempotent.
  const purchasesKind = useMemo((): PurchasesKind => {
    purchases.update(
      {
        plusEnabled: config.plusEnabled,
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? null,
        platform: Platform.OS,
        expoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
        userId: remoteUserId,
        loadSdk: loadRevenueCat,
      },
      !!previewId,
    );
    return purchases.kind;
  }, [config.plusEnabled, remoteUserId, previewId, purchases]);

  /** The preview's pretend server: Plus turns on for the family after `previewServerDelay`. */
  const previewPlusOn = useCallback(
    (product: PlusProduct) => {
      const on = () =>
        commitScenario((s) =>
          s.family
            ? {
                ...s,
                family: {
                  ...s.family,
                  plus: {
                    ...s.family.plus,
                    active: true,
                    product,
                    status: 'active',
                    expiresAt: product === 'saunafam.plus.lifetime' ? null : new Date(s.now.getTime() + 365 * 86_400_000).toISOString(),
                    payerIsMe: true,
                    payerName: 'Sam',
                  },
                },
              }
            : s,
        );
      if (previewServerDelay.current > 0) setTimeout(on, previewServerDelay.current);
      else on();
    },
    [commitScenario],
  );

  /** sync-plus, then family_plus: the server decides, never this phone. */
  const confirmPlus = useCallback(
    async (product: PlusProduct | null): Promise<SyncOutcome> => {
      const remote = sessionRef.current?.remote;
      if (previewRef.current || !remote) {
        const fam = scenarioRef.current?.family;
        if (fam?.plus.active && !fam.plus.payerIsMe) return 'alreadyHad';
        const bought = product ?? purchases.preview.ownedPlus();
        if (!bought) return 'nothing';
        previewPlusOn(bought);
        return 'applied';
      }
      const r = await backend.syncPlus(remote.familyId);
      await refresh();
      if (!r.synced) return r.reason === 'no_purchase' ? 'nothing' : 'unconfirmed';
      return r.applied ? 'applied' : 'alreadyHad';
    },
    [previewPlusOn, purchases, refresh],
  );

  const familyIdNow = useCallback(() => (previewRef.current ? 'preview-family' : (sessionRef.current?.remote?.familyId ?? null)), []);

  const loadOffering = useCallback(() => purchases.getOffering(), [purchases]);

  /** A preview purchase that finishes after its scenario was swapped out changes nothing. */
  const sameScenario = useCallback(() => {
    const at = previewGen.current;
    return () => previewGen.current === at;
  }, []);

  const buyPlus = useCallback(
    (pkg: PackageId) => {
      const still = sameScenario();
      const product: PlusProduct = pkg === 'lifetime' ? 'saunafam.plus.lifetime' : 'saunafam.plus.annual';
      return buyWith(purchases, pkg, familyIdNow(), () => (still() ? confirmPlus(product) : Promise.resolve<SyncOutcome>('unconfirmed')));
    },
    [confirmPlus, familyIdNow, purchases, sameScenario],
  );

  const restorePurchases = useCallback(() => {
    const still = sameScenario();
    return restoreWith(purchases, () => (still() ? confirmPlus(null) : Promise.resolve<SyncOutcome>('unconfirmed')));
  }, [confirmPlus, purchases, sameScenario]);

  const setWallWood = useCallback(
    async (wood: WallWood) => {
      const remote = sessionRef.current?.remote;
      if (previewRef.current || !remote) {
        const fam = scenarioRef.current?.family;
        if (!fam) return;
        if (wood !== 'birch' && !fam.plus.active) throw new backend.NeedsPlusError('that wood needs Saunafam Plus');
        commitScenario((s) => (s.family ? { ...s, family: { ...s.family, plus: { ...s.family.plus, wallWood: wood } } } : s));
        return;
      }
      await backend.setWallWood(remote.familyId, wood);
      await refresh();
    },
    [commitScenario, refresh],
  );

  /** Every week and every session, for Every week, the Heat log and the poster. */
  const loadArchive = useCallback(async (): Promise<Archive> => {
    const remote = sessionRef.current?.remote;
    if (previewRef.current || !remote) {
      const a = (scenarioRef.current ?? buildPreviewScenario('family', new Date())).archive;
      return { history: a?.history ?? [], sessions: a?.sessions ?? [] };
    }
    const memberIds = familyRef.current?.members.map((m) => m.id) ?? [];
    const [history, sessions] = await Promise.all([backend.fetchHistory(remote.familyId, 520), backend.fetchHeatSessions(memberIds)]);
    return { history, sessions };
  }, []);

  const setLook = useCallback(
    (patch: Partial<Look>) => {
      const id = myIdNow();
      setLooks((all) => {
        const next = { ...all, [id]: { ...(all[id] ?? DEFAULT_LOOK), ...patch } };
        saveLooks(next).catch(() => undefined);
        return next;
      });
      if (patch.appIcon) applyAppIcon(patch.appIcon).catch(() => undefined);
    },
    [myIdNow],
  );

  const changeNag = useCallback((change: (m: NagMemory, today: string) => NagMemory) => {
    const id = myIdNow();
    const today = dayKey(previewRef.current ? (scenarioRef.current?.now ?? new Date()) : new Date());
    setNagMemory((all) => {
      const next = { ...all, [id]: change(all[id] ?? EMPTY_NAG, today) };
      if (!previewRef.current) saveNagMemory(next).catch(() => undefined);
      return next;
    });
  }, [myIdNow]);

  // ─── Preview ───────────────────────────────────────────────────────────────

  const setPreview = useCallback(
    (id: PreviewScenarioId | null) => {
      previewRef.current = id;
      previewGen.current += 1;
      setPreviewId(id);
      setPreviewLogged([]);
      setOptimistic(NO_OPTIMISTIC);
      if (id) {
        const next = buildPreviewScenario(id, new Date());
        scenarioRef.current = next;
        setScenario(next);
        timerRef.current = next.timer;
        setTimer(next.timer);
      } else {
        scenarioRef.current = null;
        setScenario(null);
        timerMath.loadTimer().then((t) => {
          timerRef.current = t;
          setTimer(t);
        });
      }
    },
    [],
  );

  const setPreviewPurchases = useCallback(
    (behavior: PreviewBehavior, t?: { storeMs?: number; serverMs?: number }) => {
      purchases.preview.setBehavior(behavior);
      if (t?.storeMs !== undefined) purchases.preview.setDelay(t.storeMs);
      if (t?.serverMs !== undefined) previewServerDelay.current = Math.max(0, t.serverMs);
    },
    [purchases],
  );

  const clearNotice = useCallback(() => setNotice(null), []);
  const showNotice = useCallback((message: string) => setNotice(message), []);
  const dismissWelcome = useCallback(() => {
    setWelcomeDue(false);
    saveWelcomed().catch(() => undefined);
  }, []);

  // ─── The view ──────────────────────────────────────────────────────────────

  // No server (a dev build without .env.local, the web preview): the preview family, always.
  const localOnly = !!session && !session.remote;
  const [localScenario] = useState(() => buildPreviewScenario('family', new Date()));
  const activeScenario = scenario ?? (localOnly ? localScenario : null);

  const builtView = useMemo((): AppView | null => {
    if (!session) return null;
    const meName = session.me.name;
    if (activeScenario) {
      const fam =
        activeScenario.family ??
        placeholderFamily({ id: PREVIEW_ME, name: 'Sam', color: paletteColor(0), joinedOn: dayKey(activeScenario.now) }, 'Sunday sauna', activeScenario.now);
      return buildView({
        myId: PREVIEW_ME,
        family: localOnly && !scenario ? { ...fam, name: session.family.name || fam.name, members: fam.members.map((m) => (m.id === PREVIEW_ME ? { ...m, name: meName } : m)) } : fam,
        now: activeScenario.now,
        status: activeScenario.status,
        offline: activeScenario.offline,
        outbox: [...activeScenario.outbox],
        previewSent: previewLogged,
        drafts: activeScenario.drafts,
        optimistic,
        invited: [...activeScenario.invited, ...(localOnly ? session.family.invited : [])],
        timer,
        config: activeScenario.config,
        appBuild: APP_BUILD,
        unit,
        yesterdayOpen: yesterdayOpen(activeScenario.now),
        milestones: activeScenario.milestonesShown ? undefined : {},
        nag: nagMemory[PREVIEW_ME],
      });
    }
    const remote = session.remote as NonNullable<SavedSession['remote']>;
    const fam =
      family ?? placeholderFamily({ id: remote.memberId, name: meName, color: session.me.color, joinedOn: session.me.joinedOn }, session.family.name, clock);
    return buildView({
      myId: remote.memberId,
      family: fam,
      now: clock,
      status: family ? 'ready' : status,
      offline,
      outbox: queue.entries,
      drafts: queue.drafts,
      optimistic,
      invited: session.family.invited,
      myPhotoUri: session.me.photoUri,
      localPhotos: session.photos,
      timer,
      config,
      appBuild: APP_BUILD,
      unit,
      yesterdayOpen: yesterdayOpen(clock),
      milestones,
      nag: nagMemory[remote.memberId],
    });
  }, [session, activeScenario, scenario, localOnly, previewLogged, optimistic, timer, unit, nagMemory, family, clock, status, offline, queue, config, milestones]);

  const view = builtView ?? frozenView;

  const myLook = looks[view?.me.id ?? ''] ?? DEFAULT_LOOK;
  const plusVisibleNow = !!view?.plus.visible;
  const plusActiveNow = !!view?.plus.active;
  const look = useMemo(() => effectiveLook(myLook, { visible: plusVisibleNow, active: plusActiveNow }), [myLook, plusVisibleNow, plusActiveNow]);
  // A plan that ends takes the icon back to the default, like the wall goes back to birch.
  useEffect(() => {
    if (!view || view.status !== 'ready') return;
    if (look.appIcon === 'default' && currentAppIcon() !== 'default') applyAppIcon('default').catch(() => undefined);
  }, [look.appIcon, view]);

  useEffect(() => {
    viewRef.current = view;
    lastSaunaTypeRef.current = lastSaunaType;
  }, [view, lastSaunaType]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      online: backend.backendEnabled,
      session,
      view,
      notice,
      clearNotice,
      showNotice,
      welcomeDue,
      dismissWelcome,
      draft,
      startFlow,
      updateDraft,
      signIn,
      finishSignIn,
      saveFamilyName,
      saveRhythm,
      lookUpInvite,
      joinInvitedFamily,
      completeOnboarding,
      signOut,
      checkBeforeDelete,
      deleteAccount,
      refresh,
      logSession,
      resendDraft,
      discardDraft,
      draftFor,
      editSession,
      setSessionPhoto,
      deleteSession,
      removeMe,
      cheer,
      uncheer,
      comment,
      deleteComment,
      nudge,
      startTimer,
      coolOff,
      resumeTimer,
      setTimerTarget,
      setTimerSaunaType,
      finishTimer,
      discardTimer,
      devSetTimer,
      lastSaunaType,
      updateProfile,
      takeBreak,
      endBreak,
      setRules,
      setReminders,
      setWeekendCheckin,
      turnOnNotifications,
      addInvite,
      removeMember,
      markMilestoneShown,
      purchasesKind,
      loadOffering,
      buyPlus,
      restorePurchases,
      loadArchive,
      myLook,
      look,
      setLook,
      setWallWood,
      recordNagShown: () => changeNag(recordNagShown),
      dismissNag: () => changeNag(dismissNag),
      turnOffNag: () => changeNag(turnOffNag),
      preview: previewId,
      setPreview,
      setPreviewPurchases,
    }),
    [
      ready, session, view, notice, clearNotice, showNotice, welcomeDue, dismissWelcome, draft, startFlow, updateDraft, signIn, finishSignIn,
      saveFamilyName, saveRhythm, lookUpInvite, joinInvitedFamily, completeOnboarding, signOut, checkBeforeDelete, deleteAccount, refresh,
      logSession, resendDraft, discardDraft, draftFor, editSession, setSessionPhoto, deleteSession, removeMe, cheer, uncheer,
      comment, deleteComment, nudge, startTimer, coolOff, resumeTimer, setTimerTarget, setTimerSaunaType, finishTimer,
      discardTimer, devSetTimer, lastSaunaType, updateProfile, takeBreak, endBreak, setRules, setReminders, setWeekendCheckin,
      turnOnNotifications, addInvite, removeMember, markMilestoneShown, purchasesKind, loadOffering, buyPlus, restorePurchases, loadArchive, myLook, look, setLook, setWallWood, changeNag,
      previewId, setPreview, setPreviewPurchases,
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
