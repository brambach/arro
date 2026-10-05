-- Push tokens and the push queue (migration 20261005000007). Rolled back, like arro.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(20);

insert into auth.users (id, email, aud, role) values
  ('91000000-0000-0000-0000-000000000000', 'p1@arro.test', 'authenticated', 'authenticated'),
  ('92000000-0000-0000-0000-000000000000', 'p2@arro.test', 'authenticated', 'authenticated'),
  ('93000000-0000-0000-0000-000000000000', 'p3@arro.test', 'authenticated', 'authenticated');

insert into public.families (id, name) values ('99999999-0000-0000-0000-000000000000', 'Home crew');

insert into public.members (id, family_id, user_id, display_name, colour, timezone) values
  ('91111111-0000-0000-0000-000000000000', '99999999-0000-0000-0000-000000000000',
   '91000000-0000-0000-0000-000000000000', 'Mum', '#EF6C1A', 'Australia/Brisbane');

select is(
  (select count(*)::integer from private.push_outbox where user_id = '91000000-0000-0000-0000-000000000000'),
  0, 'A founder alone gets no join push');

insert into public.members (id, family_id, user_id, display_name, colour, timezone) values
  ('92222222-0000-0000-0000-000000000000', '99999999-0000-0000-0000-000000000000',
   '92000000-0000-0000-0000-000000000000', 'Dad', '#DF6B96', 'Australia/Brisbane');

select results_eq(
  $$ select user_id, kind, title from private.push_outbox order by id $$,
  $$ values ('91000000-0000-0000-0000-000000000000'::uuid, 'joined'::text, 'Dad joined Home crew'::text) $$,
  'When Dad joins, only Mum is told');

-- Tokens --------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "91000000-0000-0000-0000-000000000000", "role": "authenticated"}';

select lives_ok(
  $$ select public.register_push_token('ExponentPushToken[mum-phone]') $$,
  'Mum registers her phone');
select throws_ok(
  $$ select public.register_push_token('not-a-token') $$,
  '23514', null, 'Something that isn''t an Expo token is refused');
select throws_ok(
  $$ insert into public.push_tokens (token, user_id) values ('ExponentPushToken[x]', '92000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'Nobody inserts a token row directly');
select throws_ok(
  $$ select * from public.claim_push_batch(10) $$,
  '42501', null, 'A signed-in person can''t drain the queue');
select throws_ok(
  $$ select public.forget_push_tokens(array['ExponentPushToken[mum-phone]']) $$,
  '42501', null, 'A signed-in person can''t forget tokens');

set local request.jwt.claims = '{"sub": "92000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ select public.register_push_token('ExponentPushToken[dad-phone]') $$,
  'Dad registers his phone');
select results_eq(
  $$ select token from public.push_tokens $$,
  $$ values ('ExponentPushToken[dad-phone]'::text) $$,
  'Dad sees only his own token');
reset role;

-- Cheers --------------------------------------------------------------------------
insert into public.workouts (id, member_id, local_date, type, source) values
  ('9aaaaaaa-0000-0000-0000-000000000000', '92222222-0000-0000-0000-000000000000',
   (now() at time zone 'Australia/Brisbane')::date, 'gym', 'manual');

set local role authenticated;
set local request.jwt.claims = '{"sub": "91000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.cheers (workout_id, member_id)
     values ('9aaaaaaa-0000-0000-0000-000000000000', '91111111-0000-0000-0000-000000000000') $$,
  'Mum cheers Dad''s workout');
set local request.jwt.claims = '{"sub": "92000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.cheers (workout_id, member_id)
     values ('9aaaaaaa-0000-0000-0000-000000000000', '92222222-0000-0000-0000-000000000000') $$,
  'Dad cheers his own workout');
reset role;

select results_eq(
  $$ select user_id, title, body, data->>'workoutId' from private.push_outbox where kind = 'cheer' $$,
  $$ values ('92000000-0000-0000-0000-000000000000'::uuid, 'Mum cheered you on'::text, 'For your gym session.'::text,
             '9aaaaaaa-0000-0000-0000-000000000000'::text) $$,
  'Dad is told once about Mum''s cheer, and cheering yourself sends nothing');

-- Draining ------------------------------------------------------------------------
-- Mum's join push is stale; it's dropped, not sent.
update private.push_outbox set created_at = now() - interval '2 hours' where kind = 'joined';

set local role service_role;
-- Claiming changes the queue, so claim once and compare the copy.
create temp table claimed on commit drop as select * from public.claim_push_batch(10);
select results_eq(
  $$ select token, title from claimed $$,
  $$ values ('ExponentPushToken[dad-phone]'::text, 'Mum cheered you on'::text) $$,
  'The service role gets the fresh cheer for Dad''s phone and not the stale join');
select is(
  (select count(*)::integer from public.claim_push_batch(10)),
  0, 'A second claim finds nothing left');
select lives_ok(
  $$ select public.forget_push_tokens(array['ExponentPushToken[dad-phone]']) $$,
  'The service role forgets a dead token');
reset role;

-- A new account on Mum's phone takes the token over.
set local role authenticated;
set local request.jwt.claims = '{"sub": "93000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select public.register_push_token('ExponentPushToken[mum-phone]');
reset role;
select results_eq(
  $$ select token, user_id from public.push_tokens $$,
  $$ values ('ExponentPushToken[mum-phone]'::text, '93000000-0000-0000-0000-000000000000'::uuid) $$,
  'The last account to sign in on a phone owns its token');

-- Nudges (migration 20261005000009) ----------------------------------------------
-- The push depends on the recipient's clock, so put Dad somewhere it's mid-afternoon
-- and Mum somewhere it's the middle of the night.
update public.members
   set timezone = (select name from pg_timezone_names
                    where (now() at time zone name)::time between time '13:00' and time '16:00' limit 1)
 where id = '92222222-0000-0000-0000-000000000000';
update public.members
   set timezone = (select name from pg_timezone_names
                    where (now() at time zone name)::time between time '01:00' and time '04:00' limit 1)
 where id = '91111111-0000-0000-0000-000000000000';

set local role authenticated;
set local request.jwt.claims = '{"sub": "91000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('91111111-0000-0000-0000-000000000000', '92222222-0000-0000-0000-000000000000') $$,
  'Mum nudges Dad');
select throws_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('91111111-0000-0000-0000-000000000000', '92222222-0000-0000-0000-000000000000') $$,
  '23505', null, 'A second nudge to Dad the same day is refused');
set local request.jwt.claims = '{"sub": "92000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('92222222-0000-0000-0000-000000000000', '91111111-0000-0000-0000-000000000000') $$,
  'Dad nudges Mum in her middle of the night');
reset role;

select results_eq(
  $$ select user_id, title, body, data->>'memberId' from private.push_outbox where kind = 'nudge' $$,
  $$ values ('92000000-0000-0000-0000-000000000000'::uuid, 'Mum is cheering you on'::text,
             'You’ve still got today.'::text, '91111111-0000-0000-0000-000000000000'::text) $$,
  'Dad is told about Mum''s nudge once, and Mum''s nudge waits in silence for her quiet hours');

select * from finish();
rollback;
