// The revenuecat-webhook logic, with the database passed in so the Deno tests
// can run it against an in-memory store. index.ts wires the real one.
//
// Request: POST from RevenueCat, body { api_version, event }, with the
// Authorization header Bryce sets in the RevenueCat dashboard. It must equal
// REVENUECAT_WEBHOOK_SECRET (a "Bearer " prefix is accepted too).
// Responses: 200 for anything handled, including duplicates and events that
// don't change Plus (RevenueCat retries anything else, up to 5 times over about
// 80 minutes); 401 for a wrong secret; 400 for a body without an event; 500 when
// the secret isn't set or the database fails (the event row is removed again,
// so the retry is processed).
import {
  applyProductChange,
  applyTransfer,
  candidateUserIds,
  decide,
  mapEvent,
  resolveFamily,
  type RevenueCatWebhookBody,
  safeEqual,
} from '../_shared/plus.ts';
import type { PlusStore } from '../_shared/plusStore.ts';

export interface WebhookDeps {
  secret: string | undefined;
  store: PlusStore;
  now?: () => Date;
  log?: (message: string, detail?: Record<string, unknown>) => void;
}

export interface WebhookResult {
  ok: boolean;
  duplicate?: boolean;
  applied?: boolean;
  familyId?: string | null;
  reason?: string;
  error?: string;
}

const reply = (body: WebhookResult, status = 200) => Response.json(body, { status });

export async function handleWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  const now = deps.now?.() ?? new Date();
  const log = deps.log ?? ((m: string, d?: Record<string, unknown>) => console.log(m, d ?? {}));

  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  if (!deps.secret) return reply({ ok: false, error: 'REVENUECAT_WEBHOOK_SECRET is not set' }, 500);

  const header = (req.headers.get('Authorization') ?? '').trim();
  const given = header.replace(/^Bearer\s+/i, '');
  if (!safeEqual(header, deps.secret) && !safeEqual(given, deps.secret)) {
    return reply({ ok: false, error: 'wrong secret' }, 401);
  }

  const body = (await req.json().catch(() => null)) as RevenueCatWebhookBody | null;
  const event = body?.event;
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') {
    return reply({ ok: false, error: 'no event in the body' }, 400);
  }

  const mapped = mapEvent(event, now);
  const store = deps.store;

  // Who and which family, for the event log and for applying it.
  const userIds = candidateUserIds(event);
  let familyId: string | null = null;
  let payerMemberId: string | null = null;
  if (mapped.kind === 'plan' || mapped.kind === 'product_change') {
    const memberships = await store.membershipsFor(userIds);
    // Only the first id that's in any family counts as the payer.
    const payerUserId = userIds.find((id) => memberships.some((m) => m.userId === id));
    const mine = memberships.filter((m) => m.userId === payerUserId);
    const target = resolveFamily(mine, event.subscriber_attributes?.family_id?.value);
    familyId = target?.familyId ?? null;
    payerMemberId = target?.memberId ?? null;
  }

  const recorded = await store.recordEvent({
    eventId: event.id,
    type: event.type,
    appUserId: event.app_user_id ?? null,
    familyId,
    payload: body,
  });
  if (recorded === 'duplicate') return reply({ ok: true, duplicate: true, applied: false, reason: 'already handled' });

  try {
    switch (mapped.kind) {
      case 'ignore':
        return reply({ ok: true, applied: false, reason: mapped.reason });

      case 'transfer': {
        const paid = await store.plansPaidBy(mapped.from.filter((id) => /^[0-9a-f-]{36}$/i.test(id)));
        const heirs = await store.membershipsFor(mapped.to.filter((id) => /^[0-9a-f-]{36}$/i.test(id)));
        const { updated, leftAlone } = applyTransfer(paid, heirs, mapped.eventAt);
        for (const plan of updated) await store.savePlan(plan);
        if (leftAlone.length > 0) {
          log('TRANSFER to someone outside the family; plan left as it was', {
            eventId: event.id,
            families: leftAlone.map((p) => p.familyId),
          });
        }
        return reply({
          ok: true,
          applied: updated.length > 0,
          reason: updated.length > 0 ? 'payer moved within the family' : 'transfer logged only',
        });
      }

      case 'plan':
      case 'product_change': {
        if (!familyId) {
          log('Plus event for someone with no single family; logged only', { eventId: event.id, type: event.type });
          return reply({ ok: true, applied: false, familyId: null, reason: 'no family found for this payer' });
        }
        const existing = await store.getPlan(familyId);
        const decision = mapped.kind === 'plan'
          ? decide(existing, mapped.update, familyId, payerMemberId, now)
          : applyProductChange(existing, mapped, payerMemberId);
        if (decision.plan) await store.savePlan(decision.plan);
        return reply({ ok: true, applied: decision.plan !== null, familyId, reason: decision.reason });
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log('revenuecat-webhook failed', { eventId: event.id, message });
    await store.forgetEvent(event.id).catch(() => {});
    return reply({ ok: false, error: message }, 500);
  }
}
