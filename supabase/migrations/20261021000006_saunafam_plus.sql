-- Saunafam build 9, part 6: Saunafam Plus, built switched off.
--   1. families.wall_wood: the family's slat wall. Birch is free, the rest need Plus.
--   2. app_config.plus_enabled (false), returned by public.app_config().
--   3. plus_events: every RevenueCat webhook event, by id, so a duplicate does
--      nothing. Service role only.
--   4. family_plus(p_family_id): whether the family has Plus, and from whom.
--   5. set_wall_wood(p_family_id, p_wood): any member; anything but birch needs Plus.
--   6. Week history is clamped to 12 weeks unless the family has Plus.
-- family_plans itself is unchanged (20261005000001): one row per family, written
-- only by the revenuecat-webhook and sync-plus edge functions with the service role.

-- The two Plus products (App Store product ids). Tips have no entitlement.
create or replace function private.plus_annual_product()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'saunafam.plus.annual';
$$;

create or replace function private.plus_lifetime_product()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'saunafam.plus.lifetime';
$$;

-- 1. Wall wood --------------------------------------------------------------------
alter table public.families
  add column wall_wood text not null default 'birch'
  check (wall_wood in ('birch', 'cedar', 'alder', 'charred_pine'));

-- 2. App config -------------------------------------------------------------------
alter table public.app_config add column plus_enabled boolean not null default false;

-- The return type changes, so the function is dropped and made again.
drop function public.app_config();

create function public.app_config()
returns table (min_ios_build integer, plus_enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.min_ios_build, c.plus_enabled from public.app_config c where c.id;
$$;

revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated;

-- 3. Webhook events ----------------------------------------------------------------
create table public.plus_events (
  -- RevenueCat's event id. Retries reuse it.
  event_id text primary key,
  type text not null,
  app_user_id text,
  -- The family the event was applied to, when one was found.
  family_id uuid references public.families (id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index plus_events_family_id_idx on public.plus_events (family_id);

alter table public.plus_events enable row level security;
revoke all on public.plus_events from anon, authenticated;
grant all on public.plus_events to service_role;
grant all on public.family_plans to service_role;

-- 4. family_plus ---------------------------------------------------------------------
-- A plan gives Plus when:
--   * it's Founding family (lifetime) and not expired (a refund expires it), or
--   * it's trial, active or grace_period and expires_at hasn't passed, or
--   * it's cancelled and expires_at hasn't passed.
-- The spec doesn't check expires_at for trial, active and grace_period. It's
-- checked here because a plan whose payer moved to another family gets no more
-- events for the old family, so without it the old family would keep Plus forever.
create or replace function private.plan_gives_plus(
  p_product text,
  p_status text,
  p_expires_at timestamptz,
  p_as_of timestamptz default now()
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (p_product = private.plus_lifetime_product() and p_status <> 'expired')
    or (p_status in ('trial', 'active', 'grace_period') and (p_expires_at is null or p_expires_at > p_as_of))
    or (p_status = 'cancelled' and p_expires_at > p_as_of),
    false);
$$;

create or replace function private.family_has_plus(p_family_id uuid, p_as_of timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select private.plan_gives_plus(p.product, p.status, p.expires_at, p_as_of)
       from public.family_plans p where p.family_id = p_family_id),
    false);
$$;

-- Always one row. With no plan: active false and everything else null.
--   payer_name   the payer's display name, or null if they've left
--   payer_is_me  the caller pays
--   wall_wood    the wood to show: the family's pick while it has Plus, else birch
create or replace function public.family_plus(p_family_id uuid)
returns table (
  active boolean,
  product text,
  status text,
  expires_at timestamptz,
  payer_name text,
  payer_is_me boolean,
  wall_wood text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_family_id not in (select private.my_family_ids()) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  return query
    select private.family_has_plus(f.id),
           p.product,
           p.status,
           p.expires_at,
           payer.display_name,
           coalesce(payer.user_id = auth.uid(), false),
           case when private.family_has_plus(f.id) then f.wall_wood else 'birch' end
      from public.families f
      left join public.family_plans p on p.family_id = f.id
      left join public.members payer on payer.id = p.payer_member_id
     where f.id = p_family_id;
end;
$$;

-- 5. set_wall_wood ----------------------------------------------------------------------
-- Any member picks the family's wall wood. Birch always works; cedar, alder and
-- charred_pine need Plus (SF402). Returns the new wood. No feed post, no push.
create or replace function public.set_wall_wood(p_family_id uuid, p_wood text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_family_id not in (select private.my_family_ids()) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  if p_wood is null or p_wood not in ('birch', 'cedar', 'alder', 'charred_pine') then
    raise exception 'the wall can be birch, cedar, alder or charred_pine' using errcode = '22023';
  end if;
  if p_wood <> 'birch' and not private.family_has_plus(p_family_id) then
    raise exception 'that wood needs Saunafam Plus' using errcode = 'SF402';
  end if;
  update public.families set wall_wood = p_wood where id = p_family_id;
  return p_wood;
end;
$$;

-- 6. The history clamp ---------------------------------------------------------------------
-- Replaces the build 9 free version from 20261021000003.
create or replace function private.history_weeks_allowed(p_family_id uuid, p_weeks integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(1, least(
    coalesce(p_weeks, 12),
    case when private.family_has_plus(p_family_id) then 520 else 12 end));
$$;

revoke all on function private.plus_annual_product() from public;
revoke all on function private.plus_lifetime_product() from public;
revoke all on function private.plan_gives_plus(text, text, timestamptz, timestamptz) from public;
revoke all on function private.family_has_plus(uuid, timestamptz) from public;
revoke all on function private.history_weeks_allowed(uuid, integer) from public;
revoke all on function public.family_plus(uuid) from public, anon;
revoke all on function public.set_wall_wood(uuid, text) from public, anon;
grant execute on function public.family_plus(uuid) to authenticated;
grant execute on function public.set_wall_wood(uuid, text) to authenticated;
