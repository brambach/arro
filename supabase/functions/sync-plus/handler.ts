// The sync-plus logic, with the database, the caller lookup and RevenueCat
// passed in so the Deno tests can run it. index.ts wires the real ones.
//
// The app calls it right after a purchase or a restore, so the family doesn't
// wait for the webhook. It reads the caller's subscriber record from RevenueCat
// and writes family_plans by the same rules as the webhook (decide in
// ../_shared/plus.ts), treating the record as an event that happened now.
//
// Request: POST, Authorization: Bearer <the user's Supabase JWT>,
//   body { "familyId"?: string } (optional; the family the app is showing).
// Responses (200 unless noted):
//   { synced: true,  familyId, applied, reason, plus: { active, product, status, expiresAt } }
//   { synced: false, reason: 'no_purchase' }      nothing Plus on this Apple ID
//   { synced: false, reason: 'pick_a_family' }    in several families, no familyId,
//                                                 and no family_id attribute
//   401 { error: 'sign in first' }
//   403 { error: 'not a member of that family' }  familyId given but not theirs
//   502 { error }                                 RevenueCat couldn't be reached
import { decide, givesPlus, planFromSubscriber, type RevenueCatSubscriberResponse, resolveFamily } from '../_shared/plus.ts';
import type { PlusStore } from '../_shared/plusStore.ts';

export interface SyncDeps {
  /** The auth user id for a JWT, or null when it isn't valid. */
  userIdFromJwt: (jwt: string) => Promise<string | null>;
  /** GET /v1/subscribers/{id}; throws when RevenueCat can't be reached. */
  fetchSubscriber: (appUserId: string) => Promise<RevenueCatSubscriberResponse>;
  store: PlusStore;
  now?: () => Date;
}

export async function handleSync(req: Request, deps: SyncDeps): Promise<Response> {
  const now = deps.now?.() ?? new Date();
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const userId = jwt ? await deps.userIdFromJwt(jwt) : null;
  if (!userId) return Response.json({ error: 'sign in first' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { familyId?: unknown };
  const askedFamily = typeof body.familyId === 'string' ? body.familyId : null;

  const memberships = await deps.store.membershipsFor([userId]);
  if (askedFamily && !memberships.some((m) => m.familyId === askedFamily)) {
    return Response.json({ error: 'not a member of that family' }, { status: 403 });
  }

  let subscriber: RevenueCatSubscriberResponse;
  try {
    subscriber = await deps.fetchSubscriber(userId);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const snapshot = planFromSubscriber(subscriber, now);
  if (!snapshot) return Response.json({ synced: false, reason: 'no_purchase' });

  const target = resolveFamily(
    memberships,
    askedFamily ?? subscriber.subscriber?.subscriber_attributes?.family_id?.value,
  );
  if (!target) return Response.json({ synced: false, reason: 'pick_a_family' });

  const existing = await deps.store.getPlan(target.familyId);
  const decision = decide(
    existing,
    { ...snapshot, eventAt: now.toISOString(), eventType: 'SYNC' },
    target.familyId,
    target.memberId,
    now,
  );
  if (decision.plan) await deps.store.savePlan(decision.plan);
  const plan = decision.plan ?? existing;

  return Response.json({
    synced: true,
    familyId: target.familyId,
    applied: decision.plan !== null,
    reason: decision.reason,
    plus: plan
      ? { active: givesPlus(plan, now), product: plan.product, status: plan.status, expiresAt: plan.expiresAt }
      : { active: false, product: null, status: null, expiresAt: null },
  });
}
