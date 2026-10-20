/**
 * The offline outbox for logging sessions (spec, Quality bar, "Optimistic
 * updates"). Logging is the one write Saunafam retries:
 *
 *   1. enqueue() writes the session to saunafam.outbox.v1 with a client_id made
 *      on the phone, before anything is sent. It shows on Today and in the feed
 *      as yours straight away (pendingSessions).
 *   2. flush() sends what's due. The server's log_session is idempotent on
 *      (logged_by, client_id), so a retry after a lost answer, a killed app or a
 *      second phone call to flush can never log twice. On this phone flushes run
 *      one at a time as well.
 *   3. A network failure or a server error stays in the outbox with a backoff
 *      (5 s, 10 s, 20 s ... up to 5 minutes). AppState flushes on launch, on
 *      coming back to the app, after any request that worked, and on a timer
 *      for the next one due. No NetInfo: a request that works is the proof of
 *      being online.
 *   4. An outright refusal (the date window closed, a value out of range) moves
 *      it to saunafam.draft.v1: "Couldn't save this one. Tap to fix it".
 *
 * The class takes its storage and sender, so Jest drives it without a phone.
 */
import { MemberId, Session } from '../data/types';
import type { LogSessionInput, LoggedRow } from './backend';

export const OUTBOX_KEY = 'saunafam.outbox.v1';
export const DRAFTS_KEY = 'saunafam.draft.v1';

export const BACKOFF_START_MS = 5_000;
export const BACKOFF_MAX_MS = 5 * 60_000;

export const DRAFT_NOTICE = 'Couldn’t save this one. Tap to fix it';

/** A session waiting to be sent. `photoUri` is a local file, uploaded after it's saved. */
export interface OutboxEntry {
  input: LogSessionInput;
  /** Who logged it, so a pending session shows as theirs. */
  memberId: MemberId;
  photoUri: string | null;
  createdAt: string;
  attempts: number;
  /** Epoch ms: not before this. */
  nextAttemptAt: number;
  lastError: string | null;
}

/** A session the server refused, kept so it can be fixed and sent again. */
export interface SessionDraft {
  input: LogSessionInput;
  memberId: MemberId;
  photoUri: string | null;
  refusedAt: string;
  /** The server's code and message, for the form to point at the field. */
  code: string | null;
  message: string;
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface FlushResult {
  sent: { entry: OutboxEntry; rows: LoggedRow[] }[];
  refused: SessionDraft[];
  /** Still waiting, with a later nextAttemptAt. */
  waiting: OutboxEntry[];
  /** The last failure that kept something waiting. */
  error: unknown;
}

export interface OutboxDeps {
  store: KeyValueStore;
  send: (input: LogSessionInput) => Promise<LoggedRow[]>;
  isRefusal: (error: unknown) => boolean;
  now?: () => number;
}

export function backoffMs(attempts: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_START_MS * 2 ** Math.max(0, attempts - 1));
}

function errorText(error: unknown): string {
  const e = error as { message?: string } | null;
  return e?.message ?? String(error);
}

function errorCode(error: unknown): string | null {
  const e = error as { code?: string } | null;
  return typeof e?.code === 'string' ? e.code : null;
}

function parseList<T>(raw: string | null, valid: (v: T) => boolean): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as T[]).filter((x) => !!x && valid(x)) : [];
  } catch {
    return [];
  }
}

const hasInput = (x: { input?: { clientId?: unknown } }) => typeof x.input?.clientId === 'string';

export class Outbox {
  private entries: OutboxEntry[] = [];
  private drafts: SessionDraft[] = [];
  private loaded = false;
  private flushing: Promise<FlushResult> | null = null;
  private readonly now: () => number;

  constructor(private deps: OutboxDeps) {
    this.now = deps.now ?? Date.now;
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    const [outbox, drafts] = await Promise.all([
      this.deps.store.getItem(OUTBOX_KEY).catch(() => null),
      this.deps.store.getItem(DRAFTS_KEY).catch(() => null),
    ]);
    this.entries = parseList<OutboxEntry>(outbox, hasInput);
    this.drafts = parseList<SessionDraft>(drafts, hasInput);
    this.loaded = true;
  }

  pending(): OutboxEntry[] {
    return [...this.entries];
  }

  refusedDrafts(): SessionDraft[] {
    return [...this.drafts];
  }

  /** When the next waiting entry is due (epoch ms), or null when there's nothing. */
  nextDueAt(): number | null {
    if (!this.entries.length) return null;
    return Math.min(...this.entries.map((e) => e.nextAttemptAt));
  }

  private async persist(): Promise<void> {
    await Promise.all([
      this.entries.length
        ? this.deps.store.setItem(OUTBOX_KEY, JSON.stringify(this.entries))
        : this.deps.store.removeItem(OUTBOX_KEY),
      this.drafts.length
        ? this.deps.store.setItem(DRAFTS_KEY, JSON.stringify(this.drafts))
        : this.deps.store.removeItem(DRAFTS_KEY),
    ]);
  }

  /**
   * Adds a session, saved before it's sent. A client id already queued is
   * ignored, so tapping Save twice queues one session.
   */
  async enqueue(input: LogSessionInput, memberId: MemberId, photoUri: string | null = null): Promise<OutboxEntry> {
    await this.load();
    const existing = this.entries.find((e) => e.input.clientId === input.clientId);
    if (existing) return existing;
    const entry: OutboxEntry = {
      input,
      memberId,
      photoUri,
      createdAt: new Date(this.now()).toISOString(),
      attempts: 0,
      nextAttemptAt: this.now(),
      lastError: null,
    };
    this.entries.push(entry);
    // A sent draft that's being fixed leaves the drafts list as it goes back in.
    this.drafts = this.drafts.filter((d) => d.input.clientId !== input.clientId);
    await this.persist();
    return entry;
  }

  /** Throws away a refused draft ("Discard"). */
  async discardDraft(clientId: string): Promise<void> {
    await this.load();
    this.drafts = this.drafts.filter((d) => d.input.clientId !== clientId);
    await this.persist();
  }

  /**
   * Sends every entry that's due, oldest first (`force` ignores the backoff:
   * coming back to the app). Concurrent calls share one run.
   */
  flush(force = false): Promise<FlushResult> {
    if (this.flushing) return this.flushing;
    this.flushing = this.run(force).finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async run(force: boolean): Promise<FlushResult> {
    await this.load();
    const result: FlushResult = { sent: [], refused: [], waiting: [], error: null };
    const due = this.entries.filter((e) => force || e.nextAttemptAt <= this.now());
    let offline = false;
    for (const entry of due) {
      // One failure to reach the server is enough for this round.
      if (offline) continue;
      try {
        const rows = await this.deps.send(entry.input);
        this.entries = this.entries.filter((e) => e.input.clientId !== entry.input.clientId);
        result.sent.push({ entry, rows });
      } catch (error) {
        if (this.deps.isRefusal(error)) {
          const draft: SessionDraft = {
            input: entry.input,
            memberId: entry.memberId,
            photoUri: entry.photoUri,
            refusedAt: new Date(this.now()).toISOString(),
            code: errorCode(error),
            message: errorText(error),
          };
          this.entries = this.entries.filter((e) => e.input.clientId !== entry.input.clientId);
          this.drafts = [...this.drafts.filter((d) => d.input.clientId !== entry.input.clientId), draft];
          result.refused.push(draft);
        } else {
          const attempts = entry.attempts + 1;
          const updated: OutboxEntry = {
            ...entry,
            attempts,
            nextAttemptAt: this.now() + backoffMs(attempts),
            lastError: errorText(error),
          };
          this.entries = this.entries.map((e) => (e.input.clientId === entry.input.clientId ? updated : e));
          result.error = error;
          offline = true;
        }
      }
      await this.persist();
    }
    result.waiting = [...this.entries];
    return result;
  }

  /** Signing out: nothing queued belongs to the next person. */
  async clear(): Promise<void> {
    this.entries = [];
    this.drafts = [];
    this.loaded = true;
    await this.persist();
  }
}

/**
 * A queued session as the rows it will become, so Today and the feed can show
 * it now: an anchor for the logger and a row for each person they sat with,
 * all marked pending. `localDate` is the phone's own day for the start.
 */
export function pendingSessions(entries: OutboxEntry[], localDateOf: (iso: string) => string): Session[] {
  const out: Session[] = [];
  for (const e of entries) {
    const i = e.input;
    const anchorId = `pending-${i.clientId}`;
    const shared = i.withIds.length > 0;
    const base = {
      loggedBy: e.memberId,
      startedAt: i.startedAt,
      localDate: localDateOf(i.startedAt),
      durationMinutes: i.durationMinutes,
      rounds: i.rounds,
      saunaType: i.saunaType,
      tempC: i.tempC,
      humidityPct: i.humidityPct,
      coldPlunge: i.coldPlunge,
      coldMinutes: i.coldPlunge ? i.coldMinutes : null,
      place: i.place,
      source: i.source,
      clientId: i.clientId,
      createdAt: e.createdAt,
      updatedAt: e.createdAt,
      photoPath: null,
      pending: true,
    };
    out.push({
      ...base,
      id: anchorId,
      memberId: e.memberId,
      sharedId: shared ? anchorId : null,
      note: i.note,
      photoUrl: e.photoUri,
    });
    for (const other of i.withIds) {
      out.push({ ...base, id: `pending-${i.clientId}-${other}`, memberId: other, sharedId: anchorId, note: null, photoUrl: null });
    }
  }
  return out;
}
