-- Saunafam Plus on the server (migration 20261021000006): family_plus for every
-- status, set_wall_wood, the 12-week history clamp, app_config and who can touch
-- plus_events and family_plans. Rolled back, like arro.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(32);

insert into auth.users (id, email, aud, role) values
  ('9a000000-0000-0000-0000-000000000001', 'sam@saunafam.test', 'authenticated', 'authenticated'),
  ('9a000000-0000-0000-0000-000000000002', 'maya@saunafam.test', 'authenticated', 'authenticated'),
  ('9a000000-0000-0000-0000-000000000003', 'jo@saunafam.test', 'authenticated', 'authenticated');

-- Sunday sauna has been going since January, so it has more than 12 past weeks.
insert into public.families (id, name, saunafam_started_on) values
  ('9f000000-0000-0000-0000-000000000001', 'Sunday sauna', '2026-01-01'),
  ('9f000000-0000-0000-0000-000000000002', 'Other family', '2026-01-01');

insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at) values
  ('9b000000-0000-0000-0000-000000000001', '9f000000-0000-0000-0000-000000000001',
   '9a000000-0000-0000-0000-000000000001', 'Sam', '#5F8794', 'Etc/GMT-10', '2026-01-05 09:00+10'),
  ('9b000000-0000-0000-0000-000000000002', '9f000000-0000-0000-0000-000000000001',
   '9a000000-0000-0000-0000-000000000002', 'Maya', '#B58A3C', 'Etc/GMT-10', '2026-01-05 10:00+10'),
  ('9b000000-0000-0000-0000-000000000003', '9f000000-0000-0000-0000-000000000002',
   '9a000000-0000-0000-0000-000000000003', 'Jo', '#5F8794', 'Etc/GMT-10', '2026-01-05 09:00+10');

-- app_config ------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select results_eq($$ select min_ios_build, plus_enabled from public.app_config() $$, $$ values (9, false) $$,
  'app_config() answers before sign-in: build 9, Plus switched off');

-- No plan -----------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "9a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select results_eq(
  $$ select active, product, status, expires_at, payer_name, payer_is_me, wall_wood
       from public.family_plus('9f000000-0000-0000-0000-000000000001') $$,
  $$ values (false, null::text, null::text, null::timestamptz, null::text, false, 'birch'::text) $$,
  'a family with no plan: one row, not active, birch');

-- Each status ---------------------------------------------------------------------------------
reset role;
insert into public.family_plans (family_id, payer_member_id, product, status, expires_at)
values ('9f000000-0000-0000-0000-000000000001', '9b000000-0000-0000-0000-000000000001',
        'saunafam.plus.annual', 'active', now() + interval '300 days');
create temp table cases (status text, product text, expires_at timestamptz, want boolean, label text) on commit drop;
insert into cases values
  ('active', 'saunafam.plus.annual', now() + interval '300 days', true, 'yearly, active'),
  ('trial', 'saunafam.plus.annual', now() + interval '3 days', true, 'yearly, in a trial'),
  ('grace_period', 'saunafam.plus.annual', now() + interval '6 days', true, 'yearly, in a billing grace period'),
  ('billing_issue', 'saunafam.plus.annual', now() + interval '6 days', false, 'yearly, billing issue with no grace period'),
  ('cancelled', 'saunafam.plus.annual', now() + interval '30 days', true, 'yearly, cancelled but not yet expired'),
  ('cancelled', 'saunafam.plus.annual', now() - interval '1 day', false, 'yearly, cancelled and past its end'),
  ('expired', 'saunafam.plus.annual', now() - interval '1 day', false, 'yearly, expired'),
  ('active', 'saunafam.plus.annual', now() - interval '1 day', false, 'yearly, still marked active past its end (payer moved family)'),
  ('active', 'saunafam.plus.lifetime', null, true, 'Founding family'),
  ('cancelled', 'saunafam.plus.lifetime', null, true, 'Founding family, marked cancelled'),
  ('expired', 'saunafam.plus.lifetime', null, false, 'Founding family, refunded (expired)');

select is(
  private.plan_gives_plus(c.product, c.status, c.expires_at),
  c.want,
  'family_plus: ' || c.label || ' gives Plus: ' || c.want)
  from cases c;

set local role authenticated;
select results_eq(
  $$ select active, product, status, payer_name, payer_is_me, wall_wood
       from public.family_plus('9f000000-0000-0000-0000-000000000001') $$,
  $$ values (true, 'saunafam.plus.annual'::text, 'active'::text, 'Sam'::text, false, 'birch'::text) $$,
  'Maya sees Plus, from Sam');
set local request.jwt.claims = '{"sub": "9a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is((select payer_is_me from public.family_plus('9f000000-0000-0000-0000-000000000001')), true,
  'Sam sees that he pays');
set local request.jwt.claims = '{"sub": "9a000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_ok($$ select * from public.family_plus('9f000000-0000-0000-0000-000000000001') $$,
  '42501', 'not a member of this family', 'another family can''t read it');

-- set_wall_wood with Plus ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "9a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is(public.set_wall_wood('9f000000-0000-0000-0000-000000000001', 'cedar'), 'cedar',
  'with Plus, any member picks cedar');
select is((select wall_wood from public.families where id = '9f000000-0000-0000-0000-000000000001'), 'cedar',
  'and the family has a cedar wall');
select throws_ok($$ select public.set_wall_wood('9f000000-0000-0000-0000-000000000001', 'oak') $$,
  '22023', 'the wall can be birch, cedar, alder or charred_pine', 'an unknown wood is refused');
set local request.jwt.claims = '{"sub": "9a000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_ok($$ select public.set_wall_wood('9f000000-0000-0000-0000-000000000001', 'birch') $$,
  '42501', 'not a member of this family', 'someone from another family can''t change it');

-- The history clamp, with Plus ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "9a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select ok(
  (select count(distinct week_start) from public.family_week_history('9f000000-0000-0000-0000-000000000001', 52)) > 12,
  'with Plus, the history goes past 12 weeks');

-- Plus ends ------------------------------------------------------------------------------------------
reset role;
update public.family_plans set status = 'expired', expires_at = now() - interval '1 minute'
 where family_id = '9f000000-0000-0000-0000-000000000001';
set local role authenticated;
select results_eq(
  $$ select active, wall_wood from public.family_plus('9f000000-0000-0000-0000-000000000001') $$,
  $$ values (false, 'birch'::text) $$,
  'once Plus ends the wall shows birch again');
select is((select wall_wood from public.families where id = '9f000000-0000-0000-0000-000000000001'), 'cedar',
  'the family''s pick is kept for if Plus comes back');
select throws_ok($$ select public.set_wall_wood('9f000000-0000-0000-0000-000000000001', 'alder') $$,
  'SF402', 'that wood needs Saunafam Plus', 'without Plus, alder is refused');
select is(public.set_wall_wood('9f000000-0000-0000-0000-000000000001', 'birch'), 'birch',
  'birch always works');
select is(
  (select count(distinct week_start)::integer from public.family_week_history('9f000000-0000-0000-0000-000000000001', 52)),
  12, 'without Plus, asking for 52 weeks of history gives 12');
select is(
  (select count(distinct week_start)::integer from public.family_week_history('9f000000-0000-0000-0000-000000000001', 4)),
  4, 'and asking for fewer gives fewer');

-- Who can touch what ------------------------------------------------------------------------------------
select throws_ok($$ select * from public.plus_events $$, '42501', null, 'clients can''t read plus_events');
select throws_ok(
  $$ insert into public.plus_events (event_id, type, payload) values ('x', 'TEST', '{}') $$,
  '42501', null, 'or write it');
select throws_ok(
  $$ insert into public.family_plans (family_id, product, status) values ('9f000000-0000-0000-0000-000000000002', 'saunafam.plus.lifetime', 'active') $$,
  '42501', null, 'clients can''t give themselves Plus');
select throws_ok(
  $$ update public.family_plans set status = 'active', expires_at = null $$,
  '42501', null, 'or revive an expired plan');
select throws_ok(
  $$ update public.families set wall_wood = 'charred_pine' $$,
  '42501', null, 'or set the wall wood directly');

select * from finish();
rollback;
