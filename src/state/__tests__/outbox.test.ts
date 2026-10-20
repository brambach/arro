import { describe, expect, it, jest } from '@jest/globals';
import type { LogSessionInput, LoggedRow } from '../backend';
import { isRefusal, isNetworkError } from '../backend';
import { BACKOFF_MAX_MS, DRAFTS_KEY, KeyValueStore, OUTBOX_KEY, Outbox, backoffMs, pendingSessions } from '../outbox';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  async removeItem(k: string) {
    this.data.delete(k);
  }
}

function input(clientId: string, overrides: Partial<LogSessionInput> = {}): LogSessionInput {
  return {
    familyId: 'fam',
    clientId,
    startedAt: '2026-10-21T02:00:00.000Z',
    durationMinutes: 20,
    saunaType: 'traditional',
    rounds: 2,
    tempC: 85,
    humidityPct: null,
    coldPlunge: false,
    coldMinutes: null,
    place: 'Home',
    note: null,
    source: 'timer',
    withIds: [],
    ...overrides,
  };
}

const network = () => Object.assign(new TypeError('Network request failed'), {});
const refusal = () => ({ code: '22023', message: 'sessions can only be logged for today or yesterday' });

/**
 * A fake log_session with the server's idempotency: the same client id always
 * returns the same rows and never inserts twice.
 */
function fakeServer() {
  const inserted = new Map<string, LoggedRow[]>();
  let failNext: unknown[] = [];
  const send = jest.fn(async (i: LogSessionInput): Promise<LoggedRow[]> => {
    if (failNext.length) throw failNext.shift();
    const existing = inserted.get(i.clientId);
    if (existing) return existing;
    const rows = [{ sessionId: `s-${inserted.size + 1}`, memberId: 'sam', skipped: false }];
    inserted.set(i.clientId, rows);
    return rows;
  });
  return { send, inserted, fail: (...errors: unknown[]) => (failNext = errors) };
}

function setup() {
  const store = new MemoryStore();
  const server = fakeServer();
  let now = 1_000_000;
  const outbox = new Outbox({ store, send: server.send, isRefusal, now: () => now });
  return { store, server, outbox, advance: (ms: number) => (now += ms), now: () => now };
}

describe('the outbox', () => {
  it('saves a session before sending it', async () => {
    const { store, outbox } = setup();
    await outbox.enqueue(input('a'), 'sam');
    expect(JSON.parse(store.data.get(OUTBOX_KEY) ?? '[]')).toHaveLength(1);
    expect(outbox.pending()).toHaveLength(1);
  });

  it('sends what’s due and forgets it once saved', async () => {
    const { store, server, outbox } = setup();
    await outbox.enqueue(input('a'), 'sam');
    const result = await outbox.flush();
    expect(result.sent.map((s) => s.rows[0].sessionId)).toEqual(['s-1']);
    expect(outbox.pending()).toEqual([]);
    expect(store.data.has(OUTBOX_KEY)).toBe(false);
    expect(server.inserted.size).toBe(1);
  });

  it('keeps it after a network failure and retries with a backoff', async () => {
    const { server, outbox, advance } = setup();
    server.fail(network());
    await outbox.enqueue(input('a'), 'sam');
    const first = await outbox.flush();
    expect(first.sent).toEqual([]);
    expect(first.waiting).toHaveLength(1);
    expect(isNetworkError(first.error)).toBe(true);
    expect(outbox.pending()[0]).toMatchObject({ attempts: 1, lastError: 'Network request failed' });

    // Not due yet: nothing is sent.
    expect((await outbox.flush()).sent).toEqual([]);
    expect(server.send).toHaveBeenCalledTimes(1);

    advance(backoffMs(1));
    const second = await outbox.flush();
    expect(second.sent).toHaveLength(1);
    expect(outbox.pending()).toEqual([]);
  });

  it('a forced flush (coming back to the app) ignores the backoff', async () => {
    const { server, outbox } = setup();
    server.fail(network());
    await outbox.enqueue(input('a'), 'sam');
    await outbox.flush();
    expect((await outbox.flush(true)).sent).toHaveLength(1);
  });

  it('backs off 5 s, 10 s, 20 s ... up to 5 minutes', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([5_000, 10_000, 20_000, 40_000]);
    expect(backoffMs(20)).toBe(BACKOFF_MAX_MS);
  });

  it('stops a round at the first network failure, so a queue doesn’t hammer a dead connection', async () => {
    const { server, outbox } = setup();
    server.fail(network());
    await outbox.enqueue(input('a'), 'sam');
    await outbox.enqueue(input('b'), 'sam');
    const result = await outbox.flush();
    expect(server.send).toHaveBeenCalledTimes(1);
    expect(result.waiting).toHaveLength(2);
  });

  it('never double logs: one session per client id, however often it’s sent', async () => {
    const { server, outbox } = setup();
    await outbox.enqueue(input('a'), 'sam');
    await outbox.enqueue(input('a'), 'sam'); // Save tapped twice
    expect(outbox.pending()).toHaveLength(1);
    // Two flushes at once share one run.
    const [x, y] = await Promise.all([outbox.flush(), outbox.flush()]);
    expect(x).toBe(y);
    expect(server.send).toHaveBeenCalledTimes(1);
    expect(server.inserted.size).toBe(1);
  });

  it('a lost answer and a relaunch: the retry gets the same rows back, still one session', async () => {
    const { store, server } = setup();
    let now = 0;
    const first = new Outbox({ store, send: server.send, isRefusal, now: () => now });
    await first.enqueue(input('a'), 'sam');
    // The server saves it, but the phone never hears back.
    await server.send(input('a'));
    server.send.mockClear();
    // The app is killed and opened again.
    now += 60_000;
    const relaunched = new Outbox({ store, send: server.send, isRefusal, now: () => now });
    await relaunched.load();
    expect(relaunched.pending()).toHaveLength(1);
    const result = await relaunched.flush();
    expect(result.sent[0].rows).toEqual([{ sessionId: 's-1', memberId: 'sam', skipped: false }]);
    expect(server.inserted.size).toBe(1);
  });

  it('an outright refusal becomes a draft, kept to fix', async () => {
    const { store, server, outbox } = setup();
    server.fail(refusal());
    await outbox.enqueue(input('a'), 'sam', 'file:///photo.jpg');
    const result = await outbox.flush();
    expect(result.refused).toHaveLength(1);
    expect(outbox.pending()).toEqual([]);
    expect(outbox.refusedDrafts()[0]).toMatchObject({ code: '22023', photoUri: 'file:///photo.jpg' });
    expect(JSON.parse(store.data.get(DRAFTS_KEY) ?? '[]')).toHaveLength(1);
  });

  it('a fixed draft goes back in with the same client id and leaves the drafts', async () => {
    const { server, outbox } = setup();
    server.fail(refusal());
    await outbox.enqueue(input('a'), 'sam');
    await outbox.flush();
    await outbox.enqueue(input('a', { startedAt: '2026-10-21T20:00:00.000Z' }), 'sam');
    expect(outbox.refusedDrafts()).toEqual([]);
    expect((await outbox.flush()).sent).toHaveLength(1);
  });

  it('a draft can be thrown away', async () => {
    const { server, outbox } = setup();
    server.fail(refusal());
    await outbox.enqueue(input('a'), 'sam');
    await outbox.flush();
    await outbox.discardDraft('a');
    expect(outbox.refusedDrafts()).toEqual([]);
  });

  it('a lapsed login isn’t a refusal; it waits for a refresh', () => {
    expect(isRefusal({ code: '42501', message: 'sign in first' })).toBe(false);
    expect(isRefusal({ code: '42501', message: 'everyone in a session must be in your family' })).toBe(true);
    expect(isRefusal({ code: '23514', message: 'check' })).toBe(true);
    expect(isRefusal({ code: '500', message: 'oops' })).toBe(false);
    expect(isRefusal(network())).toBe(false);
  });

  it('reads nothing odd from storage', async () => {
    const store = new MemoryStore();
    store.data.set(OUTBOX_KEY, '{not json');
    store.data.set(DRAFTS_KEY, JSON.stringify([{ nope: true }]));
    const outbox = new Outbox({ store, send: fakeServer().send, isRefusal });
    await outbox.load();
    expect(outbox.pending()).toEqual([]);
    expect(outbox.refusedDrafts()).toEqual([]);
  });

  it('knows when the next one is due', async () => {
    const { server, outbox, now } = setup();
    expect(outbox.nextDueAt()).toBeNull();
    server.fail(network());
    await outbox.enqueue(input('a'), 'sam');
    await outbox.flush();
    expect(outbox.nextDueAt()).toBe(now() + backoffMs(1));
  });

  it('clears on sign out', async () => {
    const { store, outbox } = setup();
    await outbox.enqueue(input('a'), 'sam');
    await outbox.clear();
    expect(outbox.pending()).toEqual([]);
    expect(store.data.size).toBe(0);
  });
});

describe('pending sessions', () => {
  it('show a queued shared session as an anchor and a row per person, marked pending', () => {
    const rows = pendingSessions(
      [
        {
          input: input('c1', { withIds: ['maya', 'jo'], note: 'Lake day' }),
          memberId: 'sam',
          photoUri: 'file:///p.jpg',
          createdAt: '2026-10-21T02:00:00.000Z',
          attempts: 0,
          nextAttemptAt: 0,
          lastError: null,
        },
      ],
      () => '2026-10-20',
    );
    expect(rows.map((r) => [r.id, r.memberId, r.sharedId, r.note, r.photoUrl])).toEqual([
      ['pending-c1', 'sam', 'pending-c1', 'Lake day', 'file:///p.jpg'],
      ['pending-c1-maya', 'maya', 'pending-c1', null, null],
      ['pending-c1-jo', 'jo', 'pending-c1', null, null],
    ]);
    expect(rows.every((r) => r.pending && r.loggedBy === 'sam' && r.localDate === '2026-10-20')).toBe(true);
  });

  it('a solo one has no shared id', () => {
    const [row] = pendingSessions(
      [{ input: input('c2'), memberId: 'sam', photoUri: null, createdAt: '', attempts: 0, nextAttemptAt: 0, lastError: null }],
      () => '2026-10-20',
    );
    expect(row.sharedId).toBeNull();
  });
});
