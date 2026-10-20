// What the Plus handlers need from the database. The real one is
// supabasePlusStore in plusSupabase.ts (service role); the Deno tests use an
// in-memory one. No imports, so tests don't pull in supabase-js.
import type { Membership, Plan } from './plus.ts';

export interface PlusEventRecord {
  eventId: string;
  type: string;
  appUserId: string | null;
  familyId: string | null;
  payload: unknown;
}

export interface PlusStore {
  /** Inserts into plus_events. 'duplicate' when the event id is already there. */
  recordEvent(event: PlusEventRecord): Promise<'inserted' | 'duplicate'>;
  /** Removes an event row again, so RevenueCat's retry is processed after a failure. */
  forgetEvent(eventId: string): Promise<void>;
  /** Every member row for these auth user ids. */
  membershipsFor(userIds: string[]): Promise<Membership[]>;
  getPlan(familyId: string): Promise<Plan | null>;
  savePlan(plan: Plan): Promise<void>;
  /** Plans whose payer is one of these auth users, with the payer's user id. */
  plansPaidBy(userIds: string[]): Promise<Array<{ plan: Plan; payerUserId: string }>>;
}
