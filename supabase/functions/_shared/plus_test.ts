// Deno tests for the pure Plus rules in plus.ts. Run from the repo root:
//   DENO_NO_PACKAGE_JSON=1 deno test --allow-read=supabase/functions supabase/functions/
import { assert, assertEquals } from 'jsr:@std/assert@1';
import {
  candidateUserIds,
  decide,
  givesPlus,
  mapEvent,
  type Plan,
  planFromSubscriber,
  PLUS_ANNUAL,
  PLUS_LIFETIME,
  renewingPlans,
  resolveFamily,
  type RevenueCatEvent,
  safeEqual,
} from './plus.ts';

const NOW = new Date('2026-10-21T00:00:00Z');
const base: RevenueCatEvent = {
  id: 'e',
  type: 'INITIAL_PURCHASE',
  event_timestamp_ms: Date.parse('2026-10-20T10:00:00Z'),
  product_id: PLUS_ANNUAL,
  entitlement_ids: ['plus'],
  period_type: 'NORMAL',
  expiration_at_ms: Date.parse('2027-10-20T10:00:00Z'),
};

Deno.test('mapEvent: each event type', () => {
  const status = (e: Partial<RevenueCatEvent>) => {
    const m = mapEvent({ ...base, ...e }, NOW);
    return m.kind === 'plan' ? `${m.update.status}:${m.update.expiresAt}` : m.kind;
  };
  const exp = '2027-10-20T10:00:00.000Z';
  assertEquals(status({ type: 'INITIAL_PURCHASE' }), `active:${exp}`);
  assertEquals(status({ type: 'INITIAL_PURCHASE', period_type: 'TRIAL' }), `trial:${exp}`);
  assertEquals(status({ type: 'RENEWAL' }), `active:${exp}`);
  assertEquals(status({ type: 'UNCANCELLATION' }), `active:${exp}`);
  assertEquals(status({ type: 'SUBSCRIPTION_EXTENDED' }), `active:${exp}`);
  assertEquals(status({ type: 'NON_RENEWING_PURCHASE', product_id: PLUS_LIFETIME, expiration_at_ms: null }), 'active:null');
  assertEquals(status({ type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }), `cancelled:${exp}`);
  assertEquals(status({ type: 'CANCELLATION', cancel_reason: 'BILLING_ERROR' }), `cancelled:${exp}`);
  assertEquals(status({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }), 'expired:2026-10-20T10:00:00.000Z');
  assertEquals(
    status({ type: 'BILLING_ISSUE', grace_period_expiration_at_ms: Date.parse('2026-11-01T00:00:00Z') }),
    'grace_period:2026-11-01T00:00:00.000Z',
  );
  assertEquals(
    status({ type: 'BILLING_ISSUE', grace_period_expiration_at_ms: Date.parse('2026-10-20T00:00:00Z') }),
    `billing_issue:${exp}`,
  );
  assertEquals(status({ type: 'EXPIRATION' }), `expired:${exp}`);
  assertEquals(status({ type: 'PRODUCT_CHANGE', new_product_id: PLUS_LIFETIME }), 'product_change');
  assertEquals(status({ type: 'TRANSFER' }), 'transfer');
  assertEquals(status({ type: 'TEST' }), 'ignore');
  assertEquals(status({ type: 'SUBSCRIPTION_PAUSED' }), 'ignore');
  assertEquals(status({ type: 'EXPERIMENT_ENROLLMENT' }), 'ignore');
  assertEquals(status({ type: 'NON_RENEWING_PURCHASE', product_id: 'saunafam.tip.large', entitlement_ids: null }), 'ignore');
});

Deno.test('givesPlus mirrors private.plan_gives_plus', () => {
  const g = (product: string, status: Plan['status'], expiresAt: string | null) => givesPlus({ product, status, expiresAt }, NOW);
  assert(g(PLUS_ANNUAL, 'active', '2027-01-01T00:00:00Z'));
  assert(g(PLUS_ANNUAL, 'trial', '2026-10-25T00:00:00Z'));
  assert(g(PLUS_ANNUAL, 'grace_period', '2026-10-25T00:00:00Z'));
  assert(!g(PLUS_ANNUAL, 'billing_issue', '2026-10-25T00:00:00Z'));
  assert(g(PLUS_ANNUAL, 'cancelled', '2026-11-01T00:00:00Z'));
  assert(!g(PLUS_ANNUAL, 'cancelled', '2026-10-01T00:00:00Z'));
  assert(!g(PLUS_ANNUAL, 'expired', '2027-01-01T00:00:00Z'));
  assert(!g(PLUS_ANNUAL, 'active', '2026-10-01T00:00:00Z'), 'past its end with no event');
  assert(g(PLUS_LIFETIME, 'active', null));
  assert(g(PLUS_LIFETIME, 'cancelled', null));
  assert(!g(PLUS_LIFETIME, 'expired', null));
});

Deno.test('decide: out of order from the same payer is ignored', () => {
  const plan: Plan = {
    familyId: 'f', payerMemberId: 'm', product: PLUS_ANNUAL, status: 'cancelled',
    expiresAt: '2027-10-20T10:00:00Z', lastEvent: 'CANCELLATION', lastEventAt: '2026-11-01T00:00:00.000Z',
  };
  const d = decide(plan, { product: PLUS_ANNUAL, status: 'active', expiresAt: '2027-10-20T10:00:00Z', eventAt: '2026-10-20T00:00:00.000Z', eventType: 'RENEWAL' }, 'f', 'm', NOW);
  assertEquals(d.plan, null);
});

Deno.test('resolveFamily and candidateUserIds', () => {
  const ms = [
    { memberId: 'a', familyId: 'A', userId: 'u' },
    { memberId: 'b', familyId: 'B', userId: 'u' },
  ];
  assertEquals(resolveFamily(ms, 'B')?.memberId, 'b');
  assertEquals(resolveFamily(ms, 'C'), null);
  assertEquals(resolveFamily([ms[0]], 'C')?.memberId, 'a');
  assertEquals(resolveFamily([], null), null);
  const id = '11111111-0000-4000-8000-000000000001';
  assertEquals(candidateUserIds({ app_user_id: '$RCAnonymousID:x', original_app_user_id: id, aliases: [id] }), [id]);
});

Deno.test('planFromSubscriber reads the REST record', () => {
  const sub = (f: Record<string, string | null>) =>
    planFromSubscriber({ subscriber: { subscriptions: { [PLUS_ANNUAL]: { expires_date: '2027-10-20T10:00:00Z', ...f } } } }, NOW);
  assertEquals(sub({})?.status, 'active');
  assertEquals(sub({ period_type: 'trial' })?.status, 'trial');
  assertEquals(sub({ unsubscribe_detected_at: '2026-10-20T00:00:00Z' })?.status, 'cancelled');
  assertEquals(sub({ refunded_at: '2026-10-20T00:00:00Z' })?.status, 'expired');
  assertEquals(sub({ expires_date: '2026-10-01T00:00:00Z' })?.status, 'expired');
  assertEquals(
    sub({ expires_date: '2026-10-19T00:00:00Z', billing_issues_detected_at: '2026-10-19T00:00:00Z', grace_period_expires_date: '2026-11-02T00:00:00Z' }),
    { product: PLUS_ANNUAL, status: 'grace_period', expiresAt: '2026-11-02T00:00:00Z' },
  );
  assertEquals(sub({ billing_issues_detected_at: '2026-10-19T00:00:00Z' })?.status, 'billing_issue');
  assertEquals(planFromSubscriber({ subscriber: {} }, NOW), null);
  assertEquals(
    planFromSubscriber({ subscriber: { non_subscriptions: { [PLUS_LIFETIME]: [{ id: 'x' }] }, subscriptions: { [PLUS_ANNUAL]: { expires_date: '2027-01-01T00:00:00Z' } } } }, NOW)?.product,
    PLUS_LIFETIME,
    'Founding family comes first',
  );
});

Deno.test('renewingPlans: only yearly plans this person pays that will charge again (delete-account warning)', () => {
  const p = (payerMemberId: string | null, product: string, status: Plan['status']): Plan => ({
    familyId: `f-${payerMemberId}-${product}-${status}`, payerMemberId, product, status, expiresAt: null, lastEvent: null, lastEventAt: null,
  });
  const plans = [
    p('me', PLUS_ANNUAL, 'active'),
    p('me', PLUS_ANNUAL, 'grace_period'),
    p('me', PLUS_ANNUAL, 'billing_issue'),
    p('me', PLUS_ANNUAL, 'cancelled'),
    p('me', PLUS_ANNUAL, 'expired'),
    p('me', PLUS_LIFETIME, 'active'),
    p('someone', PLUS_ANNUAL, 'active'),
    p(null, PLUS_ANNUAL, 'active'),
  ];
  assertEquals(renewingPlans(plans, ['me']).map((x) => x.status), ['active', 'grace_period', 'billing_issue']);
  assertEquals(renewingPlans(plans, []), []);
});

Deno.test('safeEqual', () => {
  assert(safeEqual('abc', 'abc'));
  assert(!safeEqual('abc', 'abd'));
  assert(!safeEqual('abc', 'abcd'));
  assert(!safeEqual('', 'a'));
});
