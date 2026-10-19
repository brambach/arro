-- Joining limits, family size and removing a member (migration 20261017000001).
-- Rolled back, like arro.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

insert into auth.users (id, email, aud, role)
select ('7' || g || '000000-0000-0000-0000-000000000000')::uuid, 'j' || g || '@arro.test', 'authenticated', 'authenticated'
  from generate_series(1, 6) g;

-- Family J: J1 started it, J2 joined after.
insert into public.families (id, name) values ('77777777-0000-0000-0000-000000000000', 'Family J');
insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at) values
  ('71111111-0000-0000-0000-000000000000', '77777777-0000-0000-0000-000000000000',
   '71000000-0000-0000-0000-000000000000', 'J1', '#EF6C1A', 'UTC', now() - interval '3 days'),
  ('72222222-0000-0000-0000-000000000000', '77777777-0000-0000-0000-000000000000',
   '72000000-0000-0000-0000-000000000000', 'J2', '#DF6B96', 'UTC', now() - interval '2 days');
insert into public.invites (code, family_id, invited_by)
values ('JOINTEST', '77777777-0000-0000-0000-000000000000', '71111111-0000-0000-0000-000000000000');

-- Family K: already twelve people.
insert into auth.users (id, email, aud, role)
select ('8' || lpad(g::text, 7, '0') || '-0000-0000-0000-000000000000')::uuid, 'k' || g || '@arro.test', 'authenticated', 'authenticated'
  from generate_series(1, 12) g;
insert into public.families (id, name) values ('88888888-0000-0000-0000-000000000000', 'Family K');
insert into public.members (family_id, user_id, display_name, colour, timezone, joined_at)
select '88888888-0000-0000-0000-000000000000', ('8' || lpad(g::text, 7, '0') || '-0000-0000-0000-000000000000')::uuid,
       'K' || g, '#EF6C1A', 'UTC', now() - interval '1 day' + g * interval '1 minute'
  from generate_series(1, 12) g;
insert into public.invites (code, family_id) values ('FULLFAM1', '88888888-0000-0000-0000-000000000000');

select is(
  (select count(*)::integer from generate_series(1, 50) g where length(private.new_join_code()) = 8),
  50, 'new join codes are eight characters');

-- Guessing with join_family -------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "73000000-0000-0000-0000-000000000000", "role": "authenticated"}';

select is((public.join_family('WRONG000', 'J3', 'UTC')).id, null, 'a wrong code joins nothing');
select lives_ok(
  $$ select count(*) from generate_series(1, 9) g cross join lateral public.join_family('WRONG00' || g, 'J3', 'UTC') $$,
  'nine more wrong codes are answered with nothing');
reset role;
select is((select count(*)::integer from private.invite_attempts where caller = 'user:73000000-0000-0000-0000-000000000000'),
  10, 'each wrong code was logged against the signed-in person');
set local role authenticated;
select throws_ok($$ select public.join_family('WRONG999', 'J3', 'UTC') $$, 'PT429', null,
  'the eleventh wrong code is refused');
select throws_ok($$ select public.join_family('JOINTEST', 'J3', 'UTC') $$, 'PT429', null,
  'once blocked, even the right code is refused');
select throws_ok($$ select * from public.preview_invite('JOINTEST') $$, 'PT429', null,
  'the same limit covers previews');

-- 200 signed-out failures block signed-out callers, not signed-in ones.
reset role;
insert into private.invite_attempts (caller) select 'ip:198.51.100.' || g from generate_series(1, 200) g;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
set local request.headers = '{"cf-connecting-ip": "203.0.113.90"}';
select throws_ok($$ select * from public.preview_invite('JOINTEST') $$, 'PT429', null,
  'a signed-out caller is blocked by the global cap');
set local role authenticated;
set local request.jwt.claims = '{"sub": "74000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is((select family_name from public.preview_invite('JOINTEST')), 'Family J',
  'a signed-in person can still preview');
select is((public.join_family('jointest', 'J4', 'UTC')).display_name, 'J4',
  'a signed-in person can still join');

-- Family size --------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "75000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok($$ select public.join_family('FULLFAM1', 'J5', 'UTC') $$, 'AR409', null,
  'a thirteenth person can''t join');

-- Removing someone ---------------------------------------------------------------------
reset role;
insert into public.workouts (member_id, local_date, type, source)
select id, (now() at time zone 'UTC')::date, 'walk', 'manual' from public.members
 where user_id = '74000000-0000-0000-0000-000000000000';

set local role authenticated;
set local request.jwt.claims = '{"sub": "72000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok(
  $$ select public.remove_member(m.id) from public.members m where m.display_name = 'J4' $$,
  '42501', null, 'J2 didn''t start the family, so can''t remove anyone');

set local request.jwt.claims = '{"sub": "80000001-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok(
  $$ select public.remove_member('72222222-0000-0000-0000-000000000000') $$,
  '42501', null, 'K1 started a different family, so can''t remove J2');

set local request.jwt.claims = '{"sub": "71000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok($$ select public.remove_member(gen_random_uuid()) $$, '42501', null,
  'an unknown member id gives the same answer as someone else''s');
select throws_ok($$ select public.remove_member('71111111-0000-0000-0000-000000000000') $$, '22023', null,
  'J1 can''t remove themselves');
select lives_ok(
  $$ select public.remove_member(m.id) from public.members m where m.display_name = 'J4' $$,
  'J1 started the family, so can remove J4');

reset role;
select is((select count(*)::integer from public.members where user_id = '74000000-0000-0000-0000-000000000000'),
  0, 'J4 is no longer a member');
select is(
  (select count(*)::integer from public.workouts w
    where not exists (select 1 from public.members m where m.id = w.member_id)),
  0, 'J4''s workouts went with them');
select is((select count(*)::integer from public.invites where family_id = '77777777-0000-0000-0000-000000000000'),
  0, 'the family''s codes are withdrawn, since J4 knew them');

set local role authenticated;
set local request.jwt.claims = '{"sub": "74000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is((public.join_family('JOINTEST', 'J4', 'UTC')).id, null, 'J4 can''t rejoin with the old code');

-- When the founder deletes their account, the next longest member takes over.
reset role;
delete from auth.users where id = '71000000-0000-0000-0000-000000000000';
select is(private.family_founder('77777777-0000-0000-0000-000000000000'), '72000000-0000-0000-0000-000000000000'::uuid,
  'J2 takes over once J1 has gone');

select * from finish();
rollback;
