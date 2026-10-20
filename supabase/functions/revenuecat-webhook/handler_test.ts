// Deno tests for revenuecat-webhook, on fixture events shaped like RevenueCat's
// documented payload. Run from the repo root:
//   DENO_NO_PACKAGE_JSON=1 deno test --allow-read=supabase/functions supabase/functions/
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { FAM_A, FAM_B, JO, MAYA, member, MemoryStore, OUT, SAM } from '../_shared/testing/memoryStore.ts';
import { givesPlus, PLUS_ANNUAL, PLUS_LIFETIME, type RevenueCatWebhookBody } from '../_shared/plus.ts';
import { handleWebhook, type WebhookResult } from './handler.ts';

const SECRET = 'whsec-test-value';
const NOW = new Date('2026-10-21T00:00:00Z');

async function fixture(name: string): Promise<RevenueCatWebhookBody> {
  return JSON.parse(await Deno.readTextFile(new URL(`./fixtures/${name}.json`, import.meta.url)));
}

/** A fixture with a fresh event id and any fields changed. */
async function variant(name: string, id: string, changes: Record<string, unknown>): Promise<RevenueCatWebhookBody> {
  const body = await fixture(name);
  return { ...body, event: { ...body.event!, id, ...changes } };
}

function post(body: unknown, auth: string | null = SECRET, method = 'POST'): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (auth !== null) headers.set('Authorization', auth);
  return new Request('http://localhost/revenuecat-webhook', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

const logs: string[] = [];
async function send(store: MemoryStore, body: unknown, auth: string | null = SECRET) {
  const res = await handleWebhook(post(body, auth), {
    secret: SECRET,
    store,
    now: () => NOW,
    log: (m) => logs.push(m),
  });
  return { status: res.status, json: (await res.json()) as WebhookResult };
}

// Auth and shape -------------------------------------------------------------------

Deno.test('a wrong secret gets 401 and touches nothing', async () => {
  const store = new MemoryStore();
  const r = await send(store, await fixture('initial_purchase_annual'), 'not-the-secret');
  assertEquals(r.status, 401);
  assertEquals(store.events.size, 0);
  assertEquals(store.plans.size, 0);
});

Deno.test('no Authorization header gets 401', async () => {
  const r = await send(new MemoryStore(), await fixture('initial_purchase_annual'), null);
  assertEquals(r.status, 401);
});

Deno.test('the secret is accepted with a Bearer prefix too', async () => {
  const r = await send(new MemoryStore(), await fixture('initial_purchase_annual'), `Bearer ${SECRET}`);
  assertEquals(r.status, 200);
});

Deno.test('without REVENUECAT_WEBHOOK_SECRET set, everything is refused with 500', async () => {
  const res = await handleWebhook(post(await fixture('initial_purchase_annual')), { secret: undefined, store: new MemoryStore() });
  assertEquals(res.status, 500);
});

Deno.test('GET is 405 and a body with no event is 400', async () => {
  const store = new MemoryStore();
  const get = await handleWebhook(post(null, SECRET, 'GET'), { secret: SECRET, store });
  assertEquals(get.status, 405);
  const empty = await send(store, { api_version: '1.0' });
  assertEquals(empty.status, 400);
});

// Each event type ----------------------------------------------------------------------

Deno.test('INITIAL_PURCHASE: the family gets yearly Plus, paid by Sam', async () => {
  const store = new MemoryStore();
  const r = await send(store, await fixture('initial_purchase_annual'));
  assertEquals(r.status, 200);
  assertEquals(r.json.applied, true);
  assertEquals(store.plans.get(FAM_A), {
    familyId: FAM_A,
    payerMemberId: member(SAM, FAM_A),
    product: PLUS_ANNUAL,
    status: 'active',
    expiresAt: '2027-10-20T10:00:00.000Z',
    lastEvent: 'INITIAL_PURCHASE',
    lastEventAt: '2026-10-20T10:00:00.000Z',
  });
  assertEquals(store.events.get('evt-0001')?.familyId, FAM_A);
});

Deno.test('INITIAL_PURCHASE in a trial period is stored as trial', async () => {
  const store = new MemoryStore();
  await send(store, await variant('initial_purchase_annual', 'evt-trial', { period_type: 'TRIAL' }));
  assertEquals(store.plans.get(FAM_A)?.status, 'trial');
});

Deno.test('RENEWAL moves expires_at on', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('renewal_annual'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.status, plan.expiresAt, plan.lastEvent], ['active', '2028-10-20T10:00:00.000Z', 'RENEWAL']);
});

Deno.test('CANCELLATION keeps Plus to expires_at; UNCANCELLATION makes it active again', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('cancellation_annual'));
  let plan = store.plans.get(FAM_A)!;
  assertEquals([plan.status, plan.expiresAt], ['cancelled', '2027-10-20T10:00:00.000Z']);
  assert(givesPlus(plan, NOW), 'cancelled but not expired still gives Plus');
  await send(store, await fixture('uncancellation_annual'));
  plan = store.plans.get(FAM_A)!;
  assertEquals(plan.status, 'active');
});

Deno.test('BILLING_ISSUE with a grace period running is grace_period, to the end of the grace', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('billing_issue_grace'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.status, plan.expiresAt], ['grace_period', '2026-11-05T12:00:00.000Z']);
  assert(givesPlus(plan, NOW));
});

Deno.test('BILLING_ISSUE with no grace period is billing_issue, which ends Plus', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('billing_issue_no_grace'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals(plan.status, 'billing_issue');
  assert(!givesPlus(plan, NOW));
});

Deno.test('EXPIRATION ends it', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('expiration_annual'));
  assertEquals(store.plans.get(FAM_A)?.status, 'expired');
});

Deno.test('NON_RENEWING_PURCHASE of Founding family is active with no expiry', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('non_renewing_lifetime'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.product, plan.status, plan.expiresAt, plan.payerMemberId], [PLUS_LIFETIME, 'active', null, member(MAYA, FAM_A)]);
});

Deno.test('a refund (CANCELLATION, CUSTOMER_SUPPORT) ends Founding family at once', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('non_renewing_lifetime'));
  await send(store, await fixture('refund_lifetime'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals(plan.status, 'expired');
  assert(!givesPlus(plan, NOW));
});

Deno.test('PRODUCT_CHANGE updates the product on the current payer\'s plan', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  const r = await send(store, await fixture('product_change'));
  assertEquals(r.json.applied, true);
  assertEquals(store.plans.get(FAM_A)?.product, PLUS_LIFETIME);
});

Deno.test('PRODUCT_CHANGE to something that isn\'t Plus is logged only', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  const r = await send(store, await variant('product_change', 'evt-pc2', { new_product_id: 'saunafam.tip.small' }));
  assertEquals(r.json.applied, false);
  assertEquals(store.plans.get(FAM_A)?.product, PLUS_ANNUAL);
});

Deno.test('tips, TEST and SUBSCRIPTION_PAUSED are logged and change nothing', async () => {
  const store = new MemoryStore();
  for (const name of ['tip', 'test', 'subscription_paused']) {
    const r = await send(store, await fixture(name));
    assertEquals([r.status, r.json.applied], [200, false], name);
  }
  assertEquals(store.plans.size, 0);
  assertEquals(store.events.size, 3);
});

// Duplicates and order ----------------------------------------------------------------------

Deno.test('a duplicate event returns 200 and does nothing', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  store.plans.set(FAM_A, { ...store.plans.get(FAM_A)!, status: 'expired' });
  const r = await send(store, await fixture('initial_purchase_annual'));
  assertEquals([r.status, r.json.duplicate, r.json.applied], [200, true, false]);
  assertEquals(store.plans.get(FAM_A)?.status, 'expired');
});

Deno.test('an event older than the last one applied is ignored', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('cancellation_annual'));
  const r = await send(store, await fixture('initial_purchase_annual'));
  assertEquals(r.json.applied, false);
  assertEquals(store.plans.get(FAM_A)?.status, 'cancelled');
});

Deno.test('if saving fails, the event is forgotten so RevenueCat\'s retry is processed', async () => {
  const store = new MemoryStore();
  store.failSave = true;
  const first = await send(store, await fixture('initial_purchase_annual'));
  assertEquals(first.status, 500);
  assertEquals(store.events.size, 0);
  store.failSave = false;
  const retry = await send(store, await fixture('initial_purchase_annual'));
  assertEquals([retry.status, retry.json.applied], [200, true]);
});

// Two payers --------------------------------------------------------------------------------

Deno.test('two payers race: Founding family beats yearly, in either order', async () => {
  const a = new MemoryStore();
  await send(a, await fixture('initial_purchase_annual'));
  await send(a, await fixture('non_renewing_lifetime'));
  assertEquals([a.plans.get(FAM_A)?.product, a.plans.get(FAM_A)?.payerMemberId], [PLUS_LIFETIME, member(MAYA, FAM_A)]);

  const b = new MemoryStore();
  await send(b, await fixture('non_renewing_lifetime'));
  const r = await send(b, await fixture('initial_purchase_annual'));
  assertEquals(r.json.applied, false);
  assertEquals(b.plans.get(FAM_A)?.product, PLUS_LIFETIME);
});

Deno.test('two yearly payers: the later expires_at wins', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('initial_purchase_annual_maya'));
  assertEquals(store.plans.get(FAM_A)?.payerMemberId, member(MAYA, FAM_A), 'Maya\'s runs to Nov 1, Sam\'s to Oct 20');

  const r = await send(store, await variant('initial_purchase_annual', 'evt-sam-short', {
    app_user_id: JO,
    original_app_user_id: JO,
    aliases: [JO],
    event_timestamp_ms: Date.parse('2026-10-20T11:00:00Z'),
    expiration_at_ms: Date.parse('2027-06-01T00:00:00Z'),
  }));
  assertEquals(r.json.applied, false);
  assertEquals(store.plans.get(FAM_A)?.payerMemberId, member(MAYA, FAM_A), 'Jo\'s shorter one doesn\'t replace it');
});

Deno.test('the second payer cancelling doesn\'t touch the family\'s plan', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('non_renewing_lifetime'));
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('cancellation_annual'));
  await send(store, await fixture('expiration_annual'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.product, plan.status], [PLUS_LIFETIME, 'active']);
});

Deno.test('yearly, then Founding family from the same payer: Founding family replaces it', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await variant('non_renewing_lifetime', 'evt-sam-life', {
    app_user_id: SAM,
    original_app_user_id: SAM,
    aliases: [SAM],
  }));
  await send(store, await fixture('cancellation_annual'));
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.product, plan.status, plan.payerMemberId], [PLUS_LIFETIME, 'active', member(SAM, FAM_A)]);
});

Deno.test('a new purchase replaces a plan that has lapsed', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  await send(store, await fixture('expiration_annual'));
  await send(store, await variant('initial_purchase_annual_maya', 'evt-maya-later', {
    event_timestamp_ms: Date.parse('2027-10-21T00:00:00Z'),
    expiration_at_ms: Date.parse('2028-10-21T00:00:00Z'),
  }));
  assertEquals(store.plans.get(FAM_A)?.payerMemberId, member(MAYA, FAM_A));
});

// Transfers ---------------------------------------------------------------------------------

Deno.test('TRANSFER to someone in the same family makes them the payer', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  const r = await send(store, await fixture('transfer_same_family'));
  assertEquals(r.json.applied, true);
  const plan = store.plans.get(FAM_A)!;
  assertEquals([plan.payerMemberId, plan.status, plan.lastEvent], [member(MAYA, FAM_A), 'active', 'TRANSFER']);
});

Deno.test('TRANSFER to anyone else is logged and the row is left alone', async () => {
  const store = new MemoryStore();
  await send(store, await fixture('initial_purchase_annual'));
  const before = { ...store.plans.get(FAM_A)! };
  logs.length = 0;
  const r = await send(store, await fixture('transfer_other'));
  assertEquals([r.status, r.json.applied], [200, false]);
  assertEquals(store.plans.get(FAM_A), before);
  assertEquals(store.plans.has(FAM_B), false);
  assert(logs.some((l) => l.startsWith('TRANSFER to someone outside the family')));
});

// Finding the family -------------------------------------------------------------------------

Deno.test('the family comes from the family_id attribute when the payer is in it', async () => {
  const store = new MemoryStore([
    { memberId: 'm-sam-a', familyId: FAM_A, userId: SAM },
    { memberId: 'm-sam-b', familyId: FAM_B, userId: SAM },
  ]);
  await send(store, await variant('initial_purchase_annual', 'evt-attr-b', {
    subscriber_attributes: { family_id: { value: FAM_B } },
  }));
  assertEquals([store.plans.has(FAM_A), store.plans.get(FAM_B)?.payerMemberId], [false, 'm-sam-b']);
});

Deno.test('a payer who moved family: the renewal covers their new family', async () => {
  // Sam left Sunday sauna (A) and joined B. The attribute still names A.
  const store = new MemoryStore([{ memberId: 'm-sam-b', familyId: FAM_B, userId: SAM }]);
  await send(store, await fixture('renewal_annual'));
  assertEquals([store.plans.has(FAM_A), store.plans.get(FAM_B)?.payerMemberId], [false, 'm-sam-b']);
});

Deno.test('someone in several families with no usable attribute is logged only', async () => {
  const store = new MemoryStore([
    { memberId: 'm-sam-a', familyId: FAM_A, userId: SAM },
    { memberId: 'm-sam-b', familyId: FAM_B, userId: SAM },
  ]);
  const r = await send(store, await variant('initial_purchase_annual', 'evt-two-fams', { subscriber_attributes: {} }));
  assertEquals([r.status, r.json.applied, r.json.familyId], [200, false, null]);
  assertEquals(store.plans.size, 0);
  assertEquals(store.events.get('evt-two-fams')?.familyId, null);
});

Deno.test('an anonymous RevenueCat id falls back to the aliases', async () => {
  const store = new MemoryStore();
  await send(store, await variant('initial_purchase_annual', 'evt-anon', {
    app_user_id: '$RCAnonymousID:abc123',
    original_app_user_id: '$RCAnonymousID:abc123',
    aliases: ['$RCAnonymousID:abc123', SAM],
  }));
  assertEquals(store.plans.get(FAM_A)?.payerMemberId, member(SAM, FAM_A));
});

Deno.test('someone in no family at all is logged only', async () => {
  const store = new MemoryStore();
  const r = await send(store, await variant('initial_purchase_annual', 'evt-nobody', {
    app_user_id: OUT.replace('9', '7'),
    original_app_user_id: null,
    aliases: [],
  }));
  assertEquals([r.status, r.json.applied], [200, false]);
});
