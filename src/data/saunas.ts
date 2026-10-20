/**
 * Sauna words: types and their labels, minute and target choices, places,
 * temperatures and the name lists the copy is built from.
 */
import * as Localization from 'expo-localization';
import { SaunaType, Session, TemperatureUnit } from './types';

/** In the order the log form's 2-column grid shows them. */
export const SAUNA_TYPES: SaunaType[] = ['traditional', 'wood_fired', 'infrared', 'steam', 'smoke', 'banya', 'other'];

export const saunaTypeLabels: Record<SaunaType, string> = {
  traditional: 'Traditional',
  wood_fired: 'Wood-fired',
  infrared: 'Infrared',
  steam: 'Steam room',
  smoke: 'Smoke',
  banya: 'Banya',
  other: 'Other',
};

export function isSaunaType(value: unknown): value is SaunaType {
  return typeof value === 'string' && (SAUNA_TYPES as string[]).includes(value);
}

/** Minute chips on the log form. */
export const MINUTE_CHIPS = [10, 15, 20, 30] as const;
/** The timer's one-tap targets. */
export const TARGET_CHOICES = [10, 15, 20, 30] as const;

/** The server's limits (sessions table checks). */
export const LIMITS = {
  minutes: { min: 1, max: 240 },
  rounds: { min: 1, max: 10 },
  tempC: { min: 30, max: 130 },
  humidity: { min: 0, max: 100 },
  coldMinutes: { min: 0, max: 30 },
  place: 60,
  note: 140,
  comment: 200,
  /** People in one session, the logger included. */
  people: 4,
} as const;

/** Examples for the empty place field. Never real places. */
export const PLACE_EXAMPLES = ['Home', 'The Y'];

/**
 * The family's most recent places for the chips: newest first, one per spelling
 * regardless of case, at most `limit`.
 */
export function recentPlaces(sessions: Pick<Session, 'place' | 'startedAt'>[], limit = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
    const place = s.place?.trim();
    if (!place || seen.has(place.toLowerCase())) continue;
    seen.add(place.toLowerCase());
    out.push(place);
    if (out.length === limit) break;
  }
  return out;
}

// ─── Temperature ─────────────────────────────────────────────────────────────

/** Regions that use °F when expo-localization can't say: the US, Liberia and Myanmar. */
const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'MM']);

/** The fallback rule, from a locale tag such as "en-US". */
export function unitForLocaleTag(tag: string | null | undefined): TemperatureUnit {
  const region = (tag ?? '').split(/[-_]/).find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part));
  return region && FAHRENHEIT_REGIONS.has(region) ? 'F' : 'C';
}

/**
 * °F or °C by region: the phone's own setting through expo-localization
 * (`getLocales()[0].temperatureUnit`, SDK 57), else the region rule above.
 */
export function deviceTemperatureUnit(): TemperatureUnit {
  try {
    const locale = Localization.getLocales()[0];
    if (locale?.temperatureUnit === 'fahrenheit') return 'F';
    if (locale?.temperatureUnit === 'celsius') return 'C';
    if (locale?.regionCode) return FAHRENHEIT_REGIONS.has(locale.regionCode) ? 'F' : 'C';
    return unitForLocaleTag(locale?.languageTag);
  } catch {
    try {
      return unitForLocaleTag(Intl.DateTimeFormat().resolvedOptions().locale);
    } catch {
      return 'C';
    }
  }
}

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

/** °F typed on the form to the °C the server stores, to one decimal. */
export function fToC(f: number): number {
  return Math.round((((f - 32) * 5) / 9) * 10) / 10;
}

/** "85°C" or "185°F", rounded to whole degrees. */
export function temperatureLabel(tempC: number, unit: TemperatureUnit): string {
  return unit === 'F' ? `${Math.round(cToF(tempC))}°F` : `${Math.round(tempC)}°C`;
}

/** The form's range in the person's unit: 30 to 130 °C, 86 to 266 °F. */
export function temperatureRange(unit: TemperatureUnit): { min: number; max: number } {
  return unit === 'F'
    ? { min: Math.round(cToF(LIMITS.tempC.min)), max: Math.round(cToF(LIMITS.tempC.max)) }
    : { min: LIMITS.tempC.min, max: LIMITS.tempC.max };
}

// ─── Words ───────────────────────────────────────────────────────────────────

/** "20 min · Traditional · 85°C": the details line on a card. */
export function sessionDetails(
  s: Pick<Session, 'durationMinutes' | 'saunaType' | 'tempC'>,
  unit: TemperatureUnit,
): string {
  return [`${s.durationMinutes} min`, saunaTypeLabels[s.saunaType], s.tempC != null ? temperatureLabel(s.tempC, unit) : null]
    .filter(Boolean)
    .join(' · ');
}

/** "Maya", "Maya and Jo", "Maya, Jo and Sam". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const NUMBER_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty'];

/** 10 -> "Ten", 25 -> "Twenty-five", up to 60 (the family minimum's range). */
export function numberWord(n: number): string {
  if (n < 20) return NUMBER_WORDS[n] ?? String(n);
  if (n > 60) return String(n);
  const tens = TENS[Math.floor(n / 10)];
  const ones = n % 10;
  return ones ? `${tens}-${NUMBER_WORDS[ones].toLowerCase()}` : tens;
}

/** "2 rounds", "1 round". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
