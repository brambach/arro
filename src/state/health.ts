/**
 * Apple Health, write only. Saunafam never reads from Health (spec, section 3,
 * "Apple Health"). When the person has turned it on, each of their sessions is
 * saved as a Mindful Minutes sample (HKCategoryTypeIdentifierMindfulSession)
 * for its heat minutes, starting at the session's start. No calories, no heart
 * rate.
 *
 * Through @appeeky/expo-healthkit 0.4: `requestAuthorization({ toShare })`
 * asks for write access alone, `getAuthorizationStatus` says what iOS answered
 * (HealthKit does tell an app about write access, never about read access), and
 * `saveCategorySample` writes. The read permission string is gone from app.json
 * (the plugin's `healthSharePermission: false`).
 *
 * Fire and forget: a failed write never blocks a save. The ids written are kept
 * on the phone (`saunafam.healthWritten.v1`), so an edit, a refresh or a retry
 * never writes a session twice.
 *
 * The native module is loaded only when it's there: Jest, the web preview and
 * an old dev client don't have it, and there Health is simply unavailable.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as HealthKitModule from '@appeeky/expo-healthkit';
import type { Session } from '../data/types';

type HealthKit = typeof HealthKitModule;

export type HealthSession = Pick<Session, 'id' | 'startedAt' | 'durationMinutes'>;

/** What iOS says about writing mindful minutes. */
export type HealthPermission = 'granted' | 'denied' | 'notAsked' | 'unavailable';

export const HEALTH_SETTING_KEY = 'saunafam.health.v1';
export const HEALTH_WRITTEN_KEY = 'saunafam.healthWritten.v1';
export const MINDFUL_SESSION = 'HKCategoryTypeIdentifierMindfulSession';
/** Sessions that started up to this long before the switch went on are saved too. */
export const HEALTH_BACKFILL_DAYS = 7;
/** How many written ids to remember. Far more than a person logs in the backfill window. */
export const HEALTH_WRITTEN_CAP = 400;

const DAY_MS = 24 * 60 * 60 * 1000;

let loaded: HealthKit | null | undefined;

function healthKit(): HealthKit | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoHealthKit')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const hk = require('@appeeky/expo-healthkit') as HealthKit;
      loaded = hk.isAvailable() ? hk : null;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

/** For tests: put in a fake HealthKit, or null for none. */
export function setHealthKitForTests(fake: HealthKit | null | undefined): void {
  loaded = fake;
}

/** True on an iPhone with Health. False on iPad without it, the web preview and in Jest. */
export function healthAvailable(): boolean {
  return healthKit() !== null;
}

// ─── The switch ─────────────────────────────────────────────────────────────

export interface HealthSetting {
  enabled: boolean;
  /** ISO time the switch last went on. Older settings (M10) don't have it. */
  since: string | null;
}

export function parseHealthSetting(raw: string | null): HealthSetting {
  try {
    const d = raw ? JSON.parse(raw) : null;
    return {
      enabled: d?.enabled === true,
      since: typeof d?.since === 'string' && !Number.isNaN(Date.parse(d.since)) ? d.since : null,
    };
  } catch {
    return { enabled: false, since: null };
  }
}

export async function loadHealthSettingFull(): Promise<HealthSetting> {
  try {
    return parseHealthSetting(await AsyncStorage.getItem(HEALTH_SETTING_KEY));
  } catch {
    return { enabled: false, since: null };
  }
}

export async function loadHealthSetting(): Promise<boolean> {
  return (await loadHealthSettingFull()).enabled;
}

export async function saveHealthSetting(enabled: boolean, now: Date = new Date()): Promise<void> {
  const value: HealthSetting = { enabled, since: enabled ? now.toISOString() : null };
  await AsyncStorage.setItem(HEALTH_SETTING_KEY, JSON.stringify(value));
}

// ─── Permission ─────────────────────────────────────────────────────────────

function toPermission(hk: HealthKit, status: number): HealthPermission {
  if (status === hk.AuthorizationStatus.sharingAuthorized) return 'granted';
  if (status === hk.AuthorizationStatus.sharingDenied) return 'denied';
  return 'notAsked';
}

/** iOS's answer about writing mindful minutes, without asking. */
export async function healthPermission(): Promise<HealthPermission> {
  const hk = healthKit();
  if (!hk) return 'unavailable';
  try {
    return toPermission(hk, await hk.getAuthorizationStatus(MINDFUL_SESSION));
  } catch {
    return 'unavailable';
  }
}

/**
 * Shows iOS's Health sheet for mindful minutes, write only. iOS shows it once;
 * after that only the Health app can change the answer, and this just reports it.
 */
export async function requestHealthPermission(): Promise<HealthPermission> {
  const hk = healthKit();
  if (!hk) return 'unavailable';
  try {
    await hk.requestAuthorization({ toShare: [MINDFUL_SESSION] });
  } catch {
    // Fall through: the status says what happened.
  }
  return healthPermission();
}

// ─── Writing ────────────────────────────────────────────────────────────────

export interface MindfulSample {
  type: typeof MINDFUL_SESSION;
  /** HKCategoryValue.notApplicable */
  value: 0;
  startDate: string;
  endDate: string;
  metadata: Record<string, string>;
}

/** Pure, for tests: the sample for a session, or null if its times make no sense. */
export function mindfulSample(session: HealthSession): MindfulSample | null {
  const start = Date.parse(session.startedAt);
  const minutes = Math.min(240, Math.round(session.durationMinutes));
  if (Number.isNaN(start) || !(minutes > 0)) return null;
  return {
    type: MINDFUL_SESSION,
    value: 0,
    startDate: new Date(start).toISOString(),
    endDate: new Date(start + minutes * 60_000).toISOString(),
    // HKMetadataKeyExternalUUID: the session's id, so a sample can be traced back to it.
    metadata: { HKExternalUUID: session.id },
  };
}

/**
 * Pure, for tests: which of these sessions to write now. Only ones not written
 * yet, saved (not still in the outbox), and started no more than a week before
 * the switch went on. Soonest first.
 */
export function sessionsToWrite<T extends HealthSession & { pending?: boolean }>(
  sessions: T[],
  setting: HealthSetting,
  written: ReadonlySet<string>,
  now: Date = new Date(),
): T[] {
  if (!setting.enabled) return [];
  const on = setting.since ? Date.parse(setting.since) : now.getTime();
  const from = on - HEALTH_BACKFILL_DAYS * DAY_MS;
  const seen = new Set<string>();
  return sessions
    .filter((s) => {
      if (s.pending || written.has(s.id) || seen.has(s.id)) return false;
      seen.add(s.id);
      const t = Date.parse(s.startedAt);
      return !Number.isNaN(t) && t >= from && t <= now.getTime();
    })
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

export function parseWritten(raw: string | null): string[] {
  try {
    const d = raw ? JSON.parse(raw) : null;
    return Array.isArray(d) ? d.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function loadWritten(): Promise<string[]> {
  try {
    return parseWritten(await AsyncStorage.getItem(HEALTH_WRITTEN_KEY));
  } catch {
    return [];
  }
}

async function rememberWritten(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(HEALTH_WRITTEN_KEY, JSON.stringify(ids.slice(-HEALTH_WRITTEN_CAP)));
}

export type HealthWriteResult = { written: string[]; skipped: 'off' | 'unavailable' | 'notAllowed' | null; failed: number };

// One write at a time, so a refresh and an outbox send can't both write the same session.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Writes whichever of `sessions` are due (see sessionsToWrite) and remembers
 * them. Resolves with what happened; never rejects.
 */
export function writeMindfulMinutes(sessions: (HealthSession & { pending?: boolean })[], now: Date = new Date()): Promise<HealthWriteResult> {
  const run = queue.then(async (): Promise<HealthWriteResult> => {
    const setting = await loadHealthSettingFull();
    if (!setting.enabled) return { written: [], skipped: 'off', failed: 0 };
    const hk = healthKit();
    if (!hk) return { written: [], skipped: 'unavailable', failed: 0 };
    const written = await loadWritten();
    const due = sessionsToWrite(sessions, setting, new Set(written), now);
    if (!due.length) return { written: [], skipped: null, failed: 0 };
    if ((await healthPermission()) !== 'granted') return { written: [], skipped: 'notAllowed', failed: 0 };
    const done: string[] = [];
    let failed = 0;
    for (const s of due) {
      const sample = mindfulSample(s);
      if (!sample) continue;
      try {
        await hk.saveCategorySample(sample);
        done.push(s.id);
      } catch {
        // Not written this time; the next refresh tries again.
        failed += 1;
      }
    }
    if (done.length) await rememberWritten([...written, ...done]).catch(() => undefined);
    return { written: done, skipped: null, failed };
  });
  queue = run.catch(() => undefined);
  return run.catch(() => ({ written: [], skipped: null, failed: sessions.length }));
}

/** Saves sessions to Apple Health if that's on. Never throws, never waits. */
export function saveMindfulMinutes(...sessions: (HealthSession & { pending?: boolean })[]): void {
  void writeMindfulMinutes(sessions);
}
