// Deno tests for sync-plus, with RevenueCat and the caller lookup faked. Run
// from the repo root: DENO_NO_PACKAGE_JSON=1 deno test --allow-read=supabase/functions supabase/functions/
import { assertEquals } from 'jsr:@std/assert@1';
import { FAM_A, FAM_B, MAYA, member, MemoryStore, OUT, SAM } from '../_shared/testing/memoryStore.ts';
import { PLUS_ANNUAL, PLUS_LIFETIME, type RevenueCatSubscriberResponse } from '../_shared/plus.ts';
import { handleSync } from './handler.ts';

const NOW = new Date('2026-10-21T00:00:00Z');
const JWT_SAM = 'jwt-sam';

interface SyncBody {
  synced?: boolean;
  reason?: string;
  familyId?: string;
  applied?: boolean;
  plus?: { active: boolean; product: string | null; status: string | null; expiresAt: string | null };
  error?: string;
}

const annual = (fields: Record<string, string | null> = {}): RevenueCatSubscriberResponse => ({
  subscriber: {
    subscriptions: {
      [PLUS_ANNUAL]: {
        expires_date: '2027-10-20T10:00:00Z',
        purchase_date: '2026-10-20T10:00:00Z',
        period_type: 'normal',
        unsubscribe_detected_at: null,
        billing_issues_detected_at: null,
        grace_period_expires_date: null,
        refunded_at: null,
        ...fields,
      },
    },
    non_subscriptions: {},
    subscriber_attributes: { family_id: { value: FAM_A } },
  },
});

async function sync(
  store: MemoryStore,
  opts: { jwt?: string | null; body?: unknown; subscriber?: RevenueCatSubscriberResponse | Error; userId?: string } = {},
) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const jwt = opts.jwt === undefined ? JWT_SAM : opts.jwt;
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
  const res = await handleSync(
    new Request('http://localhost/sync-plus', { method: 'POST', headers, body: JSON.stringify(opts.body ?? {}) }),
    {
      store,
      now: () => NOW,
      userIdFromJwt: (t) => Promise.resolve(t === JWT_SAM ? (opts.userId ?? SAM) : null),
      fetchSubscriber: () =>
        opts.subscriber instanceof Error
          ? Promise.reject(opts.subscriber)
          : Promise.resolve(opts.subscriber ?? { subscriber: {} }),
    },
  );
  return { status: res.status, json: (await res.json()) as SyncBody };
}

Deno.test('sync-plus needs a valid JWT', async () => {
  assertEquals((await sync(new MemoryStore(), { jwt: null })).status, 401);
  assertEquals((await sync(new MemoryStore(), { jwt: 'forged' })).status, 401);
});

Deno.test('sync-plus refuses a family the caller isn\'t in', async () => {
  const r = await sync(new MemoryStore(), { body: { familyId: FAM_B }, subscriber: annual() });
  assertEquals(r.status, 403);
});

Deno.test('sync-plus answers 502 when RevenueCat can\'t be reached', async () => {
  const r = await sync(new MemoryStore(), { subscriber: new Error('RevenueCat answered 503') });
  assertEquals(r.status, 502);
});

Deno.test('nothing bought: no_purchase, nothing written', async () => {
  const store = new MemoryStore();
  const r = await sync(store);
  assertEquals([r.status, r.json.synced, r.json.reason], [200, false, 'no_purchase']);
  assertEquals(store.plans.size, 0);
});

Deno.test('a yearly purchase is written for the family straight away', async () => {
  const store = new MemoryStore();
  const r = await sync(store, { subscriber: annual() });
  assertEquals([r.json.synced, r.json.familyId, r.json.applied], [true, FAM_A, true]);
  assertEquals(r.json.plus, { active: true, product: PLUS_ANNUAL, status: 'active', expiresAt: '2027-10-20T10:00:00Z' });
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.payerMemberId, plan.lastEvent, plan.lastEventAt], [member(SAM, FAM_A), 'SYNC', NOW.toISOString()]);
});

Deno.test('a Founding family purchase is written with no expiry', async () => {
  const store = new MemoryStore();
  const r = await sync(store, {
    subscriber: { subscriber: { non_subscriptions: { [PLUS_LIFETIME]: [{ id: 'p1', purchase_date: '2026-10-20T10:00:00Z' }] } } },
  });
  assertEquals(r.json.plus, { active: true, product: PLUS_LIFETIME, status: 'active', expiresAt: null });
});

Deno.test('restore when the family already has Plus from someone else: the family keeps it', async () => {
  const store = new MemoryStore();
  store.plans.set(FAM_A, {
    familyId: FAM_A,
    payerMemberId: member(MAYA, FAM_A),
    product: PLUS_LIFETIME,
    status: 'active',
    expiresAt: null,
    lastEvent: 'NON_RENEWING_PURCHASE',
    lastEventAt: '2026-10-19T00:00:00.000Z',
  });
  const r = await sync(store, { subscriber: annual() });
  assertEquals([r.json.synced, r.json.applied, r.json.plus?.product], [true, false, PLUS_LIFETIME]);
  assertEquals(store.plans.get(FAM_A)?.payerMemberId, member(MAYA, FAM_A));
});

Deno.test('in several families with no familyId and no attribute: pick_a_family', async () => {
  const store = new MemoryStore([
    { memberId: 'm-sam-a', familyId: FAM_A, userId: SAM },
    { memberId: 'm-sam-b', familyId: FAM_B, userId: SAM },
  ]);
  const sub = annual();
  sub.subscriber!.subscriber_attributes = {};
  const r = await sync(store, { subscriber: sub });
  assertEquals([r.json.synced, r.json.reason], [false, 'pick_a_family']);
  const chosen = await sync(store, { subscriber: sub, body: { familyId: FAM_B } });
  assertEquals([chosen.json.synced, chosen.json.familyId], [true, FAM_B]);
});

Deno.test('a cancelled subscription syncs as cancelled, and someone else\'s sync leaves it alone', async () => {
  const store = new MemoryStore();
  await sync(store, { subscriber: annual({ unsubscribe_detected_at: '2026-10-20T20:00:00Z' }) });
  assertEquals(store.plans.get(FAM_A)?.status, 'cancelled');
  // Out (family B) syncing writes family B, not Sunday sauna.
  const outsider = await sync(store, { subscriber: annual(), userId: OUT });
  assertEquals(outsider.json.familyId, FAM_B);
  assertEquals(store.plans.get(FAM_A)?.status, 'cancelled');
});
