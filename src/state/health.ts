/**
 * Apple Health, write only. Saunafam never reads from Health (spec, section 3,
 * "Apple Health"). This is the seam M11 fills in: save a Mindful Minutes sample
 * (HKCategoryTypeIdentifierMindfulSession) for a session's heat minutes,
 * starting at its start, when the person has turned it on.
 *
 * Fire and forget: a failed write never blocks a save. M11 also remembers which
 * session ids were written so an edit doesn't write one twice.
 */
import type { Session } from '../data/types';

export type HealthSession = Pick<Session, 'id' | 'startedAt' | 'durationMinutes'>;

/** False until M11 wires @appeeky/expo-healthkit's write. */
export function healthAvailable(): boolean {
  return false;
}

/** Saves a session to Apple Health if that's on. Never throws, never waits. */
export function saveMindfulMinutes(session: HealthSession): void {
  // M11: check the setting, request write-only permission once, save the sample.
  void session;
}
