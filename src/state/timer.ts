/**
 * The sauna timer, as data. Elapsed heat time is always worked out from the
 * stored timestamps, never from a ticking counter, so the timer survives
 * backgrounding, the app being killed and a reboot (spec, section 3, "Timer").
 *
 * A timer is a list of rounds. Each round is a stretch in the heat with a start
 * and, once you step out to cool off, an end. Cooling off is the gap after the
 * last closed round; tapping resume opens the next round. Session minutes are
 * heat minutes only. Finishing while cooling off drops that open cooling stretch
 * simply because it was never heat.
 *
 * Everything here is pure; the AsyncStorage part is at the bottom.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SaunaType } from '../data/types';
import { LIMITS, TARGET_CHOICES, isSaunaType } from '../data/saunas';
import { dayKey } from './dates';

export const TIMER_KEY = 'saunafam.timer.v1';
export const LAST_SAUNA_TYPE_KEY = 'saunafam.lastSaunaType.v1';

const MINUTE = 60_000;
/** "Still going? It's been 3 hours" */
export const STALE_AFTER_MS = 3 * 60 * MINUTE;
/** "Still in there? Time for water and fresh air." after this much continuous heat. */
export const SAFETY_AFTER_MS = 45 * MINUTE;

export interface TimerRound {
  /** ISO time. */
  start: string;
  /** ISO time, or null while this round is in the heat. */
  end: string | null;
}

export interface TimerState {
  startedAt: string;
  rounds: TimerRound[];
  targetMinutes: number;
  saunaType: SaunaType;
}

export type TimerPhase = 'heat' | 'cooling';

const t = (iso: string) => new Date(iso).getTime();

/**
 * The default target: the family minimum, rounded up to at least 15, then up to
 * the next one-tap choice (10, 15, 20, 30). A minimum over 30 stays as it is.
 */
export function defaultTargetMinutes(familyMinMinutes: number): number {
  const wanted = Math.max(15, familyMinMinutes);
  return TARGET_CHOICES.find((c) => c >= wanted) ?? wanted;
}

export function startTimer(now: Date, opts: { targetMinutes: number; saunaType: SaunaType }): TimerState {
  const at = now.toISOString();
  return { startedAt: at, rounds: [{ start: at, end: null }], targetMinutes: opts.targetMinutes, saunaType: opts.saunaType };
}

export function phase(state: TimerState): TimerPhase {
  const last = state.rounds[state.rounds.length - 1];
  return last && last.end === null ? 'heat' : 'cooling';
}

/** Heat time so far: the closed rounds plus the open one up to now. */
export function heatMs(state: TimerState, now: Date): number {
  return state.rounds.reduce((sum, r) => {
    const end = r.end ? t(r.end) : now.getTime();
    return sum + Math.max(0, end - t(r.start));
  }, 0);
}

/** How long you've been cooling off, or 0 in the heat. */
export function coolingMs(state: TimerState, now: Date): number {
  const last = state.rounds[state.rounds.length - 1];
  if (!last?.end) return 0;
  return Math.max(0, now.getTime() - t(last.end));
}

/** The current stretch in the heat, for the 45-minute safety line. 0 while cooling. */
export function continuousHeatMs(state: TimerState, now: Date): number {
  const last = state.rounds[state.rounds.length - 1];
  if (!last || last.end) return 0;
  return Math.max(0, now.getTime() - t(last.start));
}

/** "Add a round": step out and cool off. Does nothing while already cooling. */
export function coolOff(state: TimerState, now: Date): TimerState {
  if (phase(state) === 'cooling') return state;
  const rounds = state.rounds.map((r, i) => (i === state.rounds.length - 1 ? { ...r, end: now.toISOString() } : r));
  return { ...state, rounds };
}

/** Back into the heat: the next round. Does nothing while in the heat, or past 10 rounds. */
export function resume(state: TimerState, now: Date): TimerState {
  if (phase(state) === 'heat' || state.rounds.length >= LIMITS.rounds.max) return state;
  return { ...state, rounds: [...state.rounds, { start: now.toISOString(), end: null }] };
}

export function setTarget(state: TimerState, targetMinutes: number): TimerState {
  return { ...state, targetMinutes };
}

export function setSaunaType(state: TimerState, saunaType: SaunaType): TimerState {
  return { ...state, saunaType };
}

/** Coming back 3 hours or more after it started: ask "Log it, Keep going or Discard". */
export function isStale(state: TimerState, now: Date): boolean {
  return now.getTime() - t(state.startedAt) >= STALE_AFTER_MS;
}

/** What Done hands the log form. */
export interface TimerResult {
  startedAt: string;
  /** Dated by the start: a session that starts at 11:50 PM belongs to that day. */
  localDate: string;
  /** Whole heat minutes, at least 1 and at most the server's 240. */
  durationMinutes: number;
  rounds: number;
  saunaType: SaunaType;
}

export function finish(state: TimerState, now: Date): TimerResult {
  const minutes = Math.round(heatMs(state, now) / MINUTE);
  const rounds = state.rounds.filter((r) => (r.end ? t(r.end) : now.getTime()) > t(r.start)).length;
  return {
    startedAt: state.startedAt,
    localDate: dayKey(new Date(state.startedAt)),
    durationMinutes: Math.min(LIMITS.minutes.max, Math.max(LIMITS.minutes.min, minutes)),
    rounds: Math.min(LIMITS.rounds.max, Math.max(LIMITS.rounds.min, rounds)),
    saunaType: state.saunaType,
  };
}

/**
 * When the two local notifications should fire from now, or null when they
 * shouldn't be scheduled: the target (heat time reaches targetMinutes, if you
 * stay in) and the safety line (45 minutes into this stretch). While cooling off
 * neither is scheduled; resuming schedules them again.
 */
export function notificationTimes(state: TimerState, now: Date): { target: Date | null; safety: Date | null } {
  if (phase(state) === 'cooling') return { target: null, safety: null };
  const remaining = state.targetMinutes * MINUTE - heatMs(state, now);
  const last = state.rounds[state.rounds.length - 1];
  const safetyAt = t(last.start) + SAFETY_AFTER_MS;
  return {
    target: remaining > 0 ? new Date(now.getTime() + remaining) : null,
    safety: safetyAt > now.getTime() ? new Date(safetyAt) : null,
  };
}

/** "12:04", or "1:02:09" past an hour. */
export function clockLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = `${s}`.padStart(2, '0');
  return h > 0 ? `${h}:${`${m}`.padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Today's slim bar: "In the heat · 12:04" or "Cooling off · 12:04" (heat time). */
export function timerBarLabel(state: TimerState, now: Date): string {
  return `${phase(state) === 'heat' ? 'In the heat' : 'Cooling off'} · ${clockLabel(heatMs(state, now))}`;
}

/** Every 5 minutes of heat, for VoiceOver: "10 minutes". null between announcements. */
export function announcement(state: TimerState, now: Date, lastAnnouncedMinutes: number): string | null {
  const minutes = Math.floor(heatMs(state, now) / MINUTE);
  const due = minutes - (minutes % 5);
  if (due <= 0 || due <= lastAnnouncedMinutes) return null;
  return `${due} minutes`;
}

/** A stored timer that isn't one (an older or broken value) reads as no timer. */
export function parseTimer(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<TimerState>;
    if (
      typeof v.startedAt !== 'string' ||
      !Array.isArray(v.rounds) ||
      !v.rounds.length ||
      typeof v.targetMinutes !== 'number' ||
      !isSaunaType(v.saunaType) ||
      Number.isNaN(t(v.startedAt))
    ) {
      return null;
    }
    const rounds = v.rounds.filter((r): r is TimerRound => !!r && typeof r.start === 'string' && (r.end === null || typeof r.end === 'string'));
    if (!rounds.length) return null;
    return { startedAt: v.startedAt, rounds, targetMinutes: v.targetMinutes, saunaType: v.saunaType };
  } catch {
    return null;
  }
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function loadTimer(): Promise<TimerState | null> {
  try {
    return parseTimer(await AsyncStorage.getItem(TIMER_KEY));
  } catch {
    return null;
  }
}

export async function saveTimer(state: TimerState | null): Promise<void> {
  if (state) await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(state));
  else await AsyncStorage.removeItem(TIMER_KEY);
}

export async function loadLastSaunaType(): Promise<SaunaType> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SAUNA_TYPE_KEY);
    return isSaunaType(raw) ? raw : 'traditional';
  } catch {
    return 'traditional';
  }
}

export async function saveLastSaunaType(type: SaunaType): Promise<void> {
  await AsyncStorage.setItem(LAST_SAUNA_TYPE_KEY, type);
}
