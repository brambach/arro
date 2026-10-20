/**
 * The log form as data: what it starts with (blank, yesterday, from the timer,
 * or a refused draft), how it checks itself, and the SessionForm it hands to
 * app.logSession. Pure, so Jest covers it (src/state/__tests__/logForm.test.ts);
 * the sheet in src/screens/LogSessionScreen.tsx only draws it.
 *
 * Text fields stay text while you type, so "1" on the way to "120" is never
 * fought. Temperatures are typed in your unit and stored in °C.
 */
import { LIMITS, cToF, fToC, joinNames, temperatureRange } from '../data/saunas';
import { SaunaType, TemperatureUnit } from '../data/types';
import { addDays, dayKey, fromKey, timeLabel, yesterdayClosedAt, yesterdayOpen } from './dates';
import type { SessionForm } from './AppState';
import type { SessionDraft } from './outbox';
import type { TimerResult } from './timer';

export type LogDay = 'today' | 'yesterday';

export interface LogFormState {
  day: LogDay;
  /** Start time on that day, in minutes after midnight. */
  startMinutes: number;
  /** False until the start time is changed by hand: until then it follows "now minus the minutes". */
  startTouched: boolean;
  minutes: string;
  saunaType: SaunaType;
  temp: string;
  humidity: string;
  rounds: number;
  coldPlunge: boolean;
  coldMinutes: string;
  place: string;
  withIds: string[];
  photoUri: string | null;
  note: string;
}

export type LogFormField = 'when' | 'minutes' | 'temp' | 'humidity' | 'coldMinutes' | 'place' | 'note' | 'with';
export type LogFormErrors = Partial<Record<LogFormField, string>>;

/** The start time moves in 5-minute steps. */
export const START_STEP = 5;
/** Others you can add to a session: 4 people in all. */
export const MAX_COMPANIONS = LIMITS.people - 1;
/** Where a session for yesterday starts if nothing says otherwise: 6:00 PM. */
export const YESTERDAY_DEFAULT_START = 18 * 60;

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** The day key a form day means, on this phone. */
export function dayKeyFor(day: LogDay, now: Date): string {
  return day === 'today' ? dayKey(now) : addDays(dayKey(now), -1);
}

/** A whole number from a field, or null if it isn't one. */
export function parseWhole(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/** "Now minus the duration", floored to the step, for today. Never before midnight. */
export function defaultStartMinutes(now: Date, durationMinutes: number): number {
  const start = minutesOfDay(now) - Math.max(0, durationMinutes);
  return Math.max(0, Math.floor(start / START_STEP) * START_STEP);
}

/** The ISO start time for a day and a time of day, on this phone. */
export function startIso(day: LogDay, startMinutes: number, now: Date): string {
  const d = fromKey(dayKeyFor(day, now));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(startMinutes / 60), startMinutes % 60).toISOString();
}

/** "6:45 PM" */
export function startLabel(startMinutes: number): string {
  const d = new Date(2026, 0, 1, Math.floor(startMinutes / 60), startMinutes % 60);
  return timeLabel(d);
}

/** One step earlier or later, kept inside the day and, for today, not after now. */
export function stepStart(state: LogFormState, direction: -1 | 1, now: Date): number {
  const latest = state.day === 'today' ? minutesOfDay(now) : 24 * 60 - START_STEP;
  const next = state.startMinutes + direction * START_STEP;
  // Snap to the step grid, so a start of 6:47 steps to 6:45 or 6:50.
  const snapped = direction < 0 ? Math.ceil(next / START_STEP) * START_STEP : Math.floor(next / START_STEP) * START_STEP;
  return Math.min(latest, Math.max(0, snapped));
}

/** Can the start go one step later? */
export function canStepLater(state: LogFormState, now: Date): boolean {
  return stepStart(state, 1, now) > state.startMinutes;
}

function tempText(tempC: number | null | undefined, unit: TemperatureUnit): string {
  if (tempC == null) return '';
  return String(Math.round(unit === 'F' ? cToF(tempC) : tempC));
}

function dayOf(iso: string, now: Date): LogDay | null {
  const key = dayKey(new Date(iso));
  if (key === dayKey(now)) return 'today';
  if (key === addDays(dayKey(now), -1)) return 'yesterday';
  return null;
}

export interface InitialOptions {
  now: Date;
  unit: TemperatureUnit;
  lastSaunaType: SaunaType;
  /** "Log yesterday's" opens on yesterday. */
  day?: LogDay;
  /** Done on the timer. */
  prefill?: TimerResult;
  /** The 3-hour prompt's "Log it": the timer's minutes aren't real, so ask for them. */
  askTime?: boolean;
  /** A refused draft being fixed. */
  draft?: SessionDraft | null;
  /** The family minimum, as the blank form's starting minutes (at least 15, like the timer's target). */
  defaultMinutes?: number;
}

export interface InitialForm {
  state: LogFormState;
  /** A note under "When" when the stored date can't be kept (a draft from three days ago). */
  whenNote: string | null;
}

/**
 * The form's first state.
 * - From the timer: the timer's start, minutes, rounds and type. A session is
 *   dated by its start, so one started at 11:50 PM yesterday stays yesterday.
 * - From a draft: everything the draft had, in your unit.
 * - Blank: today (or yesterday), the last type you used, starting "now minus the minutes".
 */
export function initialForm(o: InitialOptions): InitialForm {
  const base: LogFormState = {
    day: o.day ?? 'today',
    startMinutes: 0,
    startTouched: false,
    minutes: String(o.defaultMinutes ?? 15),
    saunaType: o.lastSaunaType,
    temp: '',
    humidity: '',
    rounds: 1,
    coldPlunge: false,
    coldMinutes: '',
    place: '',
    withIds: [],
    photoUri: null,
    note: '',
  };

  if (o.draft) {
    const input = o.draft.input;
    const day = dayOf(input.startedAt, o.now);
    const start = new Date(input.startedAt);
    return {
      state: {
        ...base,
        day: day ?? 'today',
        startMinutes: day ? minutesOfDay(start) : defaultStartMinutes(o.now, input.durationMinutes),
        startTouched: !!day,
        minutes: String(input.durationMinutes),
        saunaType: input.saunaType,
        temp: tempText(input.tempC, o.unit),
        humidity: input.humidityPct == null ? '' : String(input.humidityPct),
        rounds: input.rounds ?? 1,
        coldPlunge: !!input.coldPlunge,
        coldMinutes: input.coldMinutes == null ? '' : String(input.coldMinutes),
        place: input.place ?? '',
        withIds: input.withIds ?? [],
        photoUri: o.draft.photoUri ?? null,
        note: input.note ?? '',
      },
      whenNote: day ? null : 'Sessions can only be logged for today or yesterday. Pick one.',
    };
  }

  if (o.prefill) {
    const day = dayOf(o.prefill.startedAt, o.now);
    return {
      state: {
        ...base,
        day: day ?? 'today',
        startMinutes: day ? minutesOfDay(new Date(o.prefill.startedAt)) : defaultStartMinutes(o.now, o.prefill.durationMinutes),
        startTouched: !!day,
        minutes: o.askTime ? '' : String(o.prefill.durationMinutes),
        saunaType: o.prefill.saunaType,
        rounds: o.prefill.rounds,
      },
      whenNote: day ? null : 'Sessions can only be logged for today or yesterday. Pick one.',
    };
  }

  const minutes = parseWhole(base.minutes) ?? 15;
  return {
    state: {
      ...base,
      startMinutes: base.day === 'today' ? defaultStartMinutes(o.now, minutes) : YESTERDAY_DEFAULT_START,
    },
    whenNote: null,
  };
}

/** Changing the minutes moves an untouched start, so it stays "now minus the minutes" on today. */
export function withMinutes(state: LogFormState, minutes: string, now: Date): LogFormState {
  const next = { ...state, minutes };
  const n = parseWhole(minutes);
  if (!state.startTouched && state.day === 'today' && n != null) next.startMinutes = defaultStartMinutes(now, n);
  return next;
}

/** Switching the day. An untouched start follows: now minus the minutes today, 6 PM yesterday. */
export function withDay(state: LogFormState, day: LogDay, now: Date): LogFormState {
  if (day === state.day) return state;
  const next = { ...state, day };
  if (!state.startTouched) {
    next.startMinutes = day === 'today' ? defaultStartMinutes(now, parseWhole(state.minutes) ?? 0) : YESTERDAY_DEFAULT_START;
  } else if (day === 'today') {
    next.startMinutes = Math.min(state.startMinutes, minutesOfDay(now));
  }
  return next;
}

/** Picking someone, up to 3 others. Picking a fourth does nothing. */
export function toggleCompanion(state: LogFormState, id: string): LogFormState {
  if (state.withIds.includes(id)) return { ...state, withIds: state.withIds.filter((x) => x !== id) };
  if (state.withIds.length >= MAX_COMPANIONS) return state;
  return { ...state, withIds: [...state.withIds, id] };
}

/** The quiet line under minutes, when the session is under the family minimum. */
export function isShort(state: LogFormState, familyMinMinutes: number): boolean {
  const n = parseWhole(state.minutes);
  return n != null && n >= LIMITS.minutes.min && n < familyMinMinutes;
}

/**
 * Inline checks, in plain words. Empty optional fields are fine. Nothing here
 * is an alarm: the sheet shows each line under its field in coal.
 */
export function validate(state: LogFormState, unit: TemperatureUnit, now: Date): LogFormErrors {
  const errors: LogFormErrors = {};

  const minutes = parseWhole(state.minutes);
  if (state.minutes.trim() === '') errors.minutes = 'How many minutes were you in?';
  else if (minutes == null || minutes < LIMITS.minutes.min) errors.minutes = 'Minutes take a whole number, 1 or more.';
  else if (minutes > LIMITS.minutes.max) errors.minutes = `Sessions go up to ${LIMITS.minutes.max} minutes.`;

  if (state.day === 'yesterday' && !yesterdayOpen(now)) {
    errors.when = `Yesterday closed at ${yesterdayClosedAt(now)}. This one can go on today.`;
  } else if (state.day === 'today' && state.startMinutes > minutesOfDay(now)) {
    errors.when = 'That’s later than now. Pick an earlier time.';
  }

  if (state.temp.trim() !== '') {
    const range = temperatureRange(unit);
    const t = parseWhole(state.temp);
    if (t == null || t < range.min || t > range.max) errors.temp = `Somewhere from ${range.min} to ${range.max}°${unit}.`;
  }

  if (state.humidity.trim() !== '') {
    const h = parseWhole(state.humidity);
    if (h == null || h < LIMITS.humidity.min || h > LIMITS.humidity.max) errors.humidity = 'Somewhere from 0 to 100%.';
  }

  if (state.coldPlunge && state.coldMinutes.trim() !== '') {
    const c = parseWhole(state.coldMinutes);
    if (c == null || c < LIMITS.coldMinutes.min || c > LIMITS.coldMinutes.max) errors.coldMinutes = `Up to ${LIMITS.coldMinutes.max} minutes.`;
  }

  if (state.place.trim().length > LIMITS.place) errors.place = `Up to ${LIMITS.place} characters.`;
  if (state.note.length > LIMITS.note) errors.note = `Up to ${LIMITS.note} characters.`;
  if (state.withIds.length > MAX_COMPANIONS) errors.with = `Up to ${MAX_COMPANIONS} people with you.`;

  return errors;
}

/** The order the sheet scrolls to when Save finds something to fix. */
export const FIELD_ORDER: LogFormField[] = ['when', 'minutes', 'temp', 'humidity', 'coldMinutes', 'place', 'with', 'note'];

export function firstError(errors: LogFormErrors): LogFormField | null {
  return FIELD_ORDER.find((f) => errors[f]) ?? null;
}

/** °C as the server stores it: typed °F converted to one decimal, °C kept whole. */
export function toTempC(text: string, unit: TemperatureUnit): number | null {
  const n = parseWhole(text);
  if (n == null) return null;
  return unit === 'F' ? fToC(n) : n;
}

/** What app.logSession takes. Call after validate() comes back empty. */
export function toSessionForm(state: LogFormState, unit: TemperatureUnit, now: Date, source: 'timer' | 'manual'): SessionForm {
  const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    startedAt: startIso(state.day, state.startMinutes, now),
    durationMinutes: parseWhole(state.minutes) ?? LIMITS.minutes.min,
    saunaType: state.saunaType,
    rounds: state.rounds,
    tempC: toTempC(state.temp, unit),
    humidityPct: parseWhole(state.humidity),
    coldPlunge: state.coldPlunge,
    coldMinutes: state.coldPlunge ? parseWhole(state.coldMinutes) : null,
    place: blankToNull(state.place),
    note: blankToNull(state.note),
    source,
    withIds: state.withIds,
    photoUri: state.photoUri,
  };
}

/** Has anything been entered that closing would lose? */
export function isDirty(state: LogFormState, initial: LogFormState): boolean {
  return JSON.stringify({ ...state, startTouched: false }) !== JSON.stringify({ ...initial, startTouched: false });
}

/** "Jo already logged this one", "Maya and Jo already logged this one". */
export function skippedLine(names: string[]): string | null {
  if (!names.length) return null;
  return `${joinNames(names)} already logged this one`;
}

/** A refused draft's reason, as a sentence: the server's words, capitalized, with a full stop. */
export function draftReason(message: string): string {
  const m = message.trim();
  if (!m) return 'The server didn’t take it. Check the details and save again.';
  const sentence = m[0].toUpperCase() + m.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
