// PlusStore on top of Supabase, with the service role. RLS doesn't apply to the
// service role, and only it can write family_plans and plus_events.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Membership, Plan, PlanStatus } from './plus.ts';
import type { PlusEventRecord, PlusStore } from './plusStore.ts';

interface PlanRow {
  family_id: string;
  payer_member_id: string | null;
  product: string;
  status: PlanStatus;
  expires_at: string | null;
  last_event: string | null;
  last_event_at: string | null;
}

const PLAN_COLUMNS = 'family_id, payer_member_id, product, status, expires_at, last_event, last_event_at';

const toPlan = (r: PlanRow): Plan => ({
  familyId: r.family_id,
  payerMemberId: r.payer_member_id,
  product: r.product,
  status: r.status,
  expiresAt: r.expires_at,
  lastEvent: r.last_event,
  lastEventAt: r.last_event_at,
});

export function supabasePlusStore(db: SupabaseClient): PlusStore {
  return {
    async recordEvent(e: PlusEventRecord) {
      const { error } = await db.from('plus_events').insert({
        event_id: e.eventId,
        type: e.type,
        app_user_id: e.appUserId,
        family_id: e.familyId,
        payload: e.payload,
      });
      if (!error) return 'inserted';
      if (error.code === '23505') return 'duplicate';
      throw new Error(`plus_events insert: ${error.message}`);
    },

    async forgetEvent(eventId: string) {
      const { error } = await db.from('plus_events').delete().eq('event_id', eventId);
      if (error) throw new Error(`plus_events delete: ${error.message}`);
    },

    async membershipsFor(userIds: string[]) {
      if (userIds.length === 0) return [];
      const { data, error } = await db.from('members').select('id, family_id, user_id').in('user_id', userIds);
      if (error) throw new Error(`members: ${error.message}`);
      return (data ?? []).map((m: { id: string; family_id: string; user_id: string }): Membership => ({
        memberId: m.id,
        familyId: m.family_id,
        userId: m.user_id,
      }));
    },

    async getPlan(familyId: string) {
      const { data, error } = await db.from('family_plans').select(PLAN_COLUMNS).eq('family_id', familyId).maybeSingle();
      if (error) throw new Error(`family_plans: ${error.message}`);
      return data ? toPlan(data as PlanRow) : null;
    },

    async savePlan(p: Plan) {
      const { error } = await db.from('family_plans').upsert(
        {
          family_id: p.familyId,
          payer_member_id: p.payerMemberId,
          product: p.product,
          status: p.status,
          expires_at: p.expiresAt,
          last_event: p.lastEvent,
          last_event_at: p.lastEventAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id' },
      );
      if (error) throw new Error(`family_plans upsert: ${error.message}`);
    },

    async plansPaidBy(userIds: string[]) {
      const members = await this.membershipsFor(userIds);
      if (members.length === 0) return [];
      const { data, error } = await db
        .from('family_plans')
        .select(PLAN_COLUMNS)
        .in('payer_member_id', members.map((m) => m.memberId));
      if (error) throw new Error(`family_plans: ${error.message}`);
      return ((data ?? []) as PlanRow[]).map((r) => ({
        plan: toPlan(r),
        // The query only returns rows whose payer is one of these members.
        payerUserId: members.find((m) => m.memberId === r.payer_member_id)?.userId ?? '',
      }));
    },
  };
}
