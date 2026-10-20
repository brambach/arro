// Saunafam Plus: the rules for turning RevenueCat events and subscriber records
// into a family's row in public.family_plans. Pure functions only, no I/O, so
// revenuecat-webhook, sync-plus and delete-account share them and the Deno tests
// can run them directly. The SQL side (20261021000006) has the same "gives Plus"
// rule in private.plan_gives_plus; change both together.
//
// RevenueCat's app user id is the Supabase auth user id (the app calls
// Purchases.logIn after sign-in). Event names and fields were checked against
// https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
// on 20 Oct 2026.

export const PLUS_ANNUAL = 'saunafam.plus.annual';
export const PLUS_LIFETIME = 'saunafam.plus.lifetime';
export const PLUS_PRODUCTS: readonly string[] = [PLUS_ANNUAL, PLUS_LIFETIME];
export const PLUS_ENTITLEMENT = 'plus';

export type PlanStatus = 'trial' | 'active' | 'grace_period' | 'billing_issue' | 'cancelled' | 'expired';

/** One row of public.family_plans, in camelCase. Times are ISO strings. */
export interface Plan {
  familyId: string;
  payerMemberId: string | null;
  product: string;
  status: PlanStatus;
  expiresAt: string | null;
  lastEvent: string | null;
  lastEventAt: string | null;
}

/** A member row: who someone is in which family. */
export interface Membership {
  memberId: string;
  familyId: string;
  userId: string;
}

/** What one payer's purchase says right now, from an event or a subscriber record. */
export interface PlanUpdate {
  product: string;
  status: PlanStatus;
  expiresAt: string | null;
  /** When it happened: the event's timestamp, or "now" for a sync. */
  eventAt: string;
  /** The RevenueCat event type, or 'SYNC'. */
  eventType: string;
}

/** The RevenueCat webhook body is { api_version, event }. */
export interface RevenueCatWebhookBody {
  api_version?: string;
  event?: RevenueCatEvent;
}

export interface RevenueCatEvent {
  id: string;
  type: string;
  event_timestamp_ms: number;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: string;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  cancel_reason?: string;
  expiration_reason?: string;
  transferred_from?: string[];
  transferred_to?: string[];
  subscriber_attributes?: Record<string, { value: string; updated_at_ms?: number }>;
  environment?: string;
  store?: string;
}

/** What an event asks for. */
export type MappedEvent =
  | { kind: 'plan'; update: PlanUpdate }
  | { kind: 'product_change'; fromProduct: string; toProduct: string; eventAt: string; eventType: string }
  | { kind: 'transfer'; from: string[]; to: string[]; eventAt: string }
  | { kind: 'ignore'; reason: string };

const iso = (ms: number | null | undefined): string | null =>
  typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null;

const time = (s: string | null | undefined): number => (s ? Date.parse(s) : Number.NaN);

/** Mirrors private.plan_gives_plus. */
export function givesPlus(
  plan: Pick<Plan, 'product' | 'status' | 'expiresAt'>,
  now: Date,
): boolean {
  const expires = time(plan.expiresAt);
  const notPast = Number.isNaN(expires) || expires > now.getTime();
  if (plan.product === PLUS_LIFETIME && plan.status !== 'expired') return true;
  if (plan.status === 'trial' || plan.status === 'active' || plan.status === 'grace_period') return notPast;
  if (plan.status === 'cancelled') return !Number.isNaN(expires) && expires > now.getTime();
  return false;
}

function isPlusProduct(e: RevenueCatEvent): boolean {
  return (
    (!!e.product_id && PLUS_PRODUCTS.includes(e.product_id)) ||
    (e.entitlement_ids ?? []).includes(PLUS_ENTITLEMENT)
  );
}

/**
 * Turns a webhook event into what it means for a family's plan.
 *   INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, NON_RENEWING_PURCHASE,
 *   SUBSCRIPTION_EXTENDED, REFUND_REVERSED   -> active (trial in a trial period)
 *   CANCELLATION                              -> cancelled, keeping expires_at;
 *                                                a refund (cancel_reason
 *                                                CUSTOMER_SUPPORT) -> expired now
 *   BILLING_ISSUE                             -> grace_period while a grace period
 *                                                runs, else billing_issue
 *   EXPIRATION                                -> expired
 *   PRODUCT_CHANGE                            -> the product changes
 *   TRANSFER                                  -> handled separately
 * Anything else (TEST, tips, SUBSCRIPTION_PAUSED, ...) is only logged.
 */
export function mapEvent(e: RevenueCatEvent, now: Date): MappedEvent {
  const eventAt = iso(e.event_timestamp_ms) ?? now.toISOString();
  if (e.type === 'TRANSFER') {
    return { kind: 'transfer', from: e.transferred_from ?? [], to: e.transferred_to ?? [], eventAt };
  }
  if (e.type === 'TEST') return { kind: 'ignore', reason: 'test event' };
  if (!isPlusProduct(e) || !e.product_id) return { kind: 'ignore', reason: 'not a Plus product' };

  const product = e.product_id;
  const lifetime = product === PLUS_LIFETIME;
  const expiresAt = lifetime ? null : iso(e.expiration_at_ms);
  const plan = (status: PlanStatus, at: string | null = expiresAt): MappedEvent => ({
    kind: 'plan',
    update: { product, status, expiresAt: at, eventAt, eventType: e.type },
  });

  switch (e.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'REFUND_REVERSED':
      return plan(e.period_type === 'TRIAL' ? 'trial' : 'active');
    case 'CANCELLATION':
      // A refund ends Plus at once, Founding family included.
      return e.cancel_reason === 'CUSTOMER_SUPPORT' ? plan('expired', eventAt) : plan('cancelled');
    case 'BILLING_ISSUE': {
      const grace = iso(e.grace_period_expiration_at_ms);
      return grace && Date.parse(grace) > now.getTime() ? plan('grace_period', grace) : plan('billing_issue');
    }
    case 'EXPIRATION':
      return plan('expired');
    case 'PRODUCT_CHANGE':
      if (!e.new_product_id || !PLUS_PRODUCTS.includes(e.new_product_id)) {
        return { kind: 'ignore', reason: 'product change to a product that isn\'t Plus' };
      }
      return { kind: 'product_change', fromProduct: product, toProduct: e.new_product_id, eventAt, eventType: e.type };
    default:
      return { kind: 'ignore', reason: `${e.type} doesn't change Plus` };
  }
}

/** Every id RevenueCat knows this person by, most likely first. */
export function candidateUserIds(e: Pick<RevenueCatEvent, 'app_user_id' | 'original_app_user_id' | 'aliases'>): string[] {
  const ids = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])].filter(
    (id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id),
  );
  return [...new Set(ids)];
}

/**
 * Which family a purchase is for: the family_id subscriber attribute (the app
 * sets it just before buying) if the payer is in that family, otherwise the
 * payer's only family. Null when neither works.
 */
export function resolveFamily(memberships: Membership[], attributeFamilyId: string | null | undefined): Membership | null {
  if (attributeFamilyId) {
    const m = memberships.find((x) => x.familyId === attributeFamilyId);
    if (m) return m;
  }
  return memberships.length === 1 ? memberships[0] : null;
}

export interface Decision {
  /** The row to save, or null to leave the family's plan alone. */
  plan: Plan | null;
  reason: string;
}

/**
 * Applies one payer's update to a family's plan.
 *   * Same payer and product as the plan: applied, unless it's older than the
 *     last event applied (out of order), which is ignored.
 *   * Anyone or anything else, while the plan gives Plus: only something that
 *     gives Plus can replace it. Founding family beats yearly; between two
 *     yearly plans the later expires_at wins. A second payer's cancellation or
 *     expiry never touches the family's plan.
 *   * The plan doesn't give Plus: anything that gives Plus replaces it.
 *   * No plan yet: written as it is, so an early CANCELLATION still blocks an
 *     older INITIAL_PURCHASE that arrives after it.
 */
export function decide(existing: Plan | null, update: PlanUpdate, familyId: string, payerMemberId: string | null, now: Date): Decision {
  const next: Plan = {
    familyId,
    payerMemberId,
    product: update.product,
    status: update.status,
    expiresAt: update.product === PLUS_LIFETIME ? null : update.expiresAt,
    lastEvent: update.eventType,
    lastEventAt: update.eventAt,
  };
  if (!existing) return { plan: next, reason: 'first plan for this family' };

  const sameSource = existing.payerMemberId === payerMemberId && existing.product === update.product;
  if (sameSource) {
    if (existing.lastEventAt && time(update.eventAt) < time(existing.lastEventAt)) {
      return { plan: null, reason: 'out of order: older than the last event applied' };
    }
    return { plan: next, reason: 'update from the current payer' };
  }

  const incomingGives = givesPlus(next, now);
  if (!givesPlus(existing, now)) {
    return incomingGives
      ? { plan: next, reason: 'replaces a plan that no longer gives Plus' }
      : { plan: null, reason: 'neither plan gives Plus; the current row stays' };
  }
  if (!incomingGives) return { plan: null, reason: 'another payer\'s plan ending doesn\'t touch this family' };
  if (existing.product === PLUS_LIFETIME) return { plan: null, reason: 'the family already has Founding family' };
  if (update.product === PLUS_LIFETIME) return { plan: next, reason: 'Founding family beats yearly' };
  if (time(next.expiresAt) > time(existing.expiresAt)) return { plan: next, reason: 'later expires_at wins' };
  return { plan: null, reason: 'the current yearly plan runs longer' };
}

/** A product change from the current payer: same plan, new product. */
export function applyProductChange(
  existing: Plan | null,
  change: { fromProduct: string; toProduct: string; eventAt: string; eventType: string },
  payerMemberId: string | null,
): Decision {
  if (!existing || existing.payerMemberId !== payerMemberId || existing.product !== change.fromProduct) {
    return { plan: null, reason: 'product change for a plan this family doesn\'t have' };
  }
  if (existing.lastEventAt && time(change.eventAt) < time(existing.lastEventAt)) {
    return { plan: null, reason: 'out of order: older than the last event applied' };
  }
  return {
    plan: {
      ...existing,
      product: change.toProduct,
      expiresAt: change.toProduct === PLUS_LIFETIME ? null : existing.expiresAt,
      lastEvent: change.eventType,
      lastEventAt: change.eventAt,
    },
    reason: 'product changed',
  };
}

/**
 * TRANSFER: purchases moved from some app user ids to others (usually a restore
 * on a different account). For each family whose payer is one of the "from"
 * people: if one of the "to" people is in that same family, they become the
 * payer. Otherwise the row is left alone and the event is only logged; Bryce
 * sorts those out by hand.
 */
export function applyTransfer(
  paidPlans: Array<{ plan: Plan; payerUserId: string }>,
  toMemberships: Membership[],
  eventAt: string,
): { updated: Plan[]; leftAlone: Plan[] } {
  const updated: Plan[] = [];
  const leftAlone: Plan[] = [];
  for (const { plan } of paidPlans) {
    const heir = toMemberships.find((m) => m.familyId === plan.familyId);
    if (heir) updated.push({ ...plan, payerMemberId: heir.memberId, lastEvent: 'TRANSFER', lastEventAt: eventAt });
    else leftAlone.push(plan);
  }
  return { updated, leftAlone };
}

// RevenueCat REST API v1, GET /v1/subscribers/{app_user_id} (secret key). Only
// the fields used here. Dates are ISO strings.
export interface RevenueCatSubscriberResponse {
  subscriber?: {
    subscriptions?: Record<string, {
      expires_date?: string | null;
      purchase_date?: string | null;
      period_type?: string | null;
      unsubscribe_detected_at?: string | null;
      billing_issues_detected_at?: string | null;
      grace_period_expires_date?: string | null;
      refunded_at?: string | null;
    }>;
    non_subscriptions?: Record<string, Array<{ id?: string; purchase_date?: string | null }>>;
    subscriber_attributes?: Record<string, { value: string; updated_at_ms?: number }>;
  };
}

/**
 * What a subscriber record says about Plus right now, or null when there's no
 * Plus purchase. Founding family first, then the yearly subscription.
 */
export function planFromSubscriber(
  res: RevenueCatSubscriberResponse,
  now: Date,
): Omit<PlanUpdate, 'eventAt' | 'eventType'> | null {
  const s = res.subscriber ?? {};
  const lifetime = s.non_subscriptions?.[PLUS_LIFETIME] ?? [];
  if (lifetime.length > 0) return { product: PLUS_LIFETIME, status: 'active', expiresAt: null };

  const a = s.subscriptions?.[PLUS_ANNUAL];
  if (!a) return null;
  const expiresAt = a.expires_date ?? null;
  const grace = a.grace_period_expires_date ?? null;
  const t = now.getTime();
  if (a.refunded_at) return { product: PLUS_ANNUAL, status: 'expired', expiresAt: a.refunded_at };
  if (a.billing_issues_detected_at && grace && Date.parse(grace) > t) {
    return { product: PLUS_ANNUAL, status: 'grace_period', expiresAt: grace };
  }
  if (expiresAt && Date.parse(expiresAt) <= t) return { product: PLUS_ANNUAL, status: 'expired', expiresAt };
  if (a.billing_issues_detected_at) return { product: PLUS_ANNUAL, status: 'billing_issue', expiresAt };
  if (a.unsubscribe_detected_at) return { product: PLUS_ANNUAL, status: 'cancelled', expiresAt };
  if ((a.period_type ?? '').toLowerCase() === 'trial') return { product: PLUS_ANNUAL, status: 'trial', expiresAt };
  return { product: PLUS_ANNUAL, status: 'active', expiresAt };
}

/**
 * For delete-account: the yearly plans this person pays for that will renew.
 * Deleting the account doesn't cancel them, so the app warns first. Founding
 * family never renews, and a cancelled or expired plan won't charge again.
 */
export function renewingPlans(plans: Plan[], memberIds: string[]): Plan[] {
  return plans.filter(
    (p) =>
      p.payerMemberId !== null &&
      memberIds.includes(p.payerMemberId) &&
      p.product === PLUS_ANNUAL &&
      (p.status === 'trial' || p.status === 'active' || p.status === 'grace_period' || p.status === 'billing_issue'),
  );
}

/** Constant-time string compare, for the webhook secret. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
