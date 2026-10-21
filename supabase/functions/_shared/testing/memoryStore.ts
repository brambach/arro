// An in-memory PlusStore for the Deno tests. Not deployed: only test files import it.
import type { Membership, Plan } from '../plus.ts';
import type { PlusEventRecord, PlusStore } from '../plusStore.ts';

export const SAM = '11111111-0000-4000-8000-000000000001';
export const MAYA = '11111111-0000-4000-8000-000000000002';
export const JO = '11111111-0000-4000-8000-000000000003';
export const OUT = '11111111-0000-4000-8000-000000000009';
export const FAM_A = 'aaaaaaaa-0000-4000-8000-000000000001';
export const FAM_B = 'aaaaaaaa-0000-4000-8000-000000000002';

/** Member ids: m-<user>-<family>, readable in assertions. */
export const member = (user: string, family: string) => `m-${user.slice(-1)}-${family.slice(-1)}`;

export class MemoryStore implements PlusStore {
  events = new Map<string, PlusEventRecord>();
  plans = new Map<string, Plan>();
  memberships: Membership[];
  failSave = false;

  constructor(memberships?: Membership[]) {
    // Sam, Maya and Jo are in Sunday sauna (A); Out is in family B.
    this.memberships = memberships ?? [
      { memberId: member(SAM, FAM_A), familyId: FAM_A, userId: SAM },
      { memberId: member(MAYA, FAM_A), familyId: FAM_A, userId: MAYA },
      { memberId: member(JO, FAM_A), familyId: FAM_A, userId: JO },
      { memberId: member(OUT, FAM_B), familyId: FAM_B, userId: OUT },
    ];
  }

  recordEvent(e: PlusEventRecord) {
    if (this.events.has(e.eventId)) return Promise.resolve('duplicate' as const);
    this.events.set(e.eventId, e);
    return Promise.resolve('inserted' as const);
  }
  forgetEvent(id: string) {
    this.events.delete(id);
    return Promise.resolve();
  }
  membershipsFor(userIds: string[]) {
    return Promise.resolve(this.memberships.filter((m) => userIds.includes(m.userId)));
  }
  getPlan(familyId: string) {
    return Promise.resolve(this.plans.get(familyId) ?? null);
  }
  savePlan(plan: Plan) {
    if (this.failSave) return Promise.reject(new Error('database is down'));
    this.plans.set(plan.familyId, { ...plan });
    return Promise.resolve();
  }
  plansPaidBy(userIds: string[]) {
    const mine = this.memberships.filter((m) => userIds.includes(m.userId));
    return Promise.resolve(
      [...this.plans.values()]
        .filter((p) => mine.some((m) => m.memberId === p.payerMemberId))
        .map((plan) => ({ plan, payerUserId: mine.find((m) => m.memberId === plan.payerMemberId)?.userId ?? '' })),
    );
  }
}
