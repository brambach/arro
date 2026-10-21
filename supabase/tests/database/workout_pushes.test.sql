-- "Went for a run" pushes, one cheer push per person, and comments (migration 20261017000004).
-- Rolled back, like arro.test.sql. Quiet hours follow the real now(), so members get
-- fixed-offset zones picked to be at midday ("awake") or 03:00 ("asleep") right now.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

-- Build 9 (20261021000005) drops Arro's push triggers on workouts, cheers and
-- comments. Their functions stay until build 10, so this file attaches them
-- again inside its own rolled-back transaction and keeps testing them.
create trigger workouts_queue_moved_push after insert on public.workouts
  for each row execute function private.queue_moved_push();
create trigger cheers_queue_push after insert on public.cheers
  for each row execute function private.queue_cheer_push();
create trigger comments_queue_push after insert on public.comments
  for each row execute function private.queue_comment_push();

create temp table zones on commit drop as
with offsets as (
  select ((12 - extract(hour from now() at time zone 'UTC')::integer + 36) % 24) - 12 as awake,
         ((3 - extract(hour from now() at time zone 'UTC')::integer + 36) % 24) - 12 as asleep
)
select case when awake = 0 then 'UTC' else format('Etc/GMT%s%s', case when awake > 0 then '-' else '+' end, abs(awake)) end as awake,
       case when asleep = 0 then 'UTC' else format('Etc/GMT%s%s', case when asleep > 0 then '-' else '+' end, abs(asleep)) end as asleep
  from offsets;

insert into auth.users (id, email, aud, role) values
  ('c1000000-0000-0000-0000-000000000000', 'mum@arro.test', 'authenticated', 'authenticated'),
  ('c2000000-0000-0000-0000-000000000000', 'dad@arro.test', 'authenticated', 'authenticated'),
  ('c3000000-0000-0000-0000-000000000000', 'gran@arro.test', 'authenticated', 'authenticated'),
  ('c4000000-0000-0000-0000-000000000000', 'out@arro.test', 'authenticated', 'authenticated');

insert into public.families (id, name) values
  ('c0000000-0000-0000-0000-000000000000', 'Home crew'),
  ('cf000000-0000-0000-0000-000000000000', 'Other crew');

-- Mum and Dad are awake; Gran is asleep; Out is in another family.
insert into public.members (id, family_id, user_id, display_name, colour, timezone)
select v.id::uuid, v.family_id::uuid, v.user_id::uuid, v.name, '#EF6C1A',
       case v.zone when 'awake' then z.awake else z.asleep end
  from zones z,
       (values
         ('c1110000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Mum', 'awake'),
         ('c2220000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Dad', 'awake'),
         ('c3330000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000000', 'Gran', 'asleep'),
         ('c4440000-0000-0000-0000-000000000000', 'cf000000-0000-0000-0000-000000000000', 'c4000000-0000-0000-0000-000000000000', 'Out', 'awake')
       ) as v(id, family_id, user_id, name, zone);

-- Join pushes aren't what this file tests.
delete from private.push_outbox;

-- Went for a run -----------------------------------------------------------------------
insert into public.workouts (id, member_id, local_date, type, source)
select 'ca000000-0000-0000-0000-000000000000', 'c2220000-0000-0000-0000-000000000000',
       (now() at time zone awake)::date, 'run', 'manual'
  from zones;

select results_eq(
  $$ select user_id, title, body, data->>'workoutId', data->>'memberId' from private.push_outbox where kind = 'moved' $$,
  $$ values ('c1000000-0000-0000-0000-000000000000'::uuid, 'Dad went for a run'::text, 'Send them a cheer.'::text,
             'ca000000-0000-0000-0000-000000000000'::text, 'c2220000-0000-0000-0000-000000000000'::text) $$,
  'Dad''s run tells Mum; not Dad, not Gran who''s asleep, not another family');

insert into public.workouts (member_id, local_date, type, source)
select 'c2220000-0000-0000-0000-000000000000', (now() at time zone awake)::date, 'gym', 'manual' from zones;
select is(
  (select count(*)::integer from private.push_outbox where kind = 'moved'),
  1, 'Dad''s second workout today sends nothing more');

insert into public.workouts (member_id, local_date, type, source)
select 'c1110000-0000-0000-0000-000000000000', (now() at time zone awake)::date - 1, 'walk', 'manual' from zones;
select is(
  (select count(*)::integer from private.push_outbox where kind = 'moved' and data->>'memberId' = 'c1110000-0000-0000-0000-000000000000'),
  0, 'A workout saved for yesterday sends nothing');

insert into public.workouts (member_id, local_date, type, source)
select 'c1110000-0000-0000-0000-000000000000', (now() at time zone awake)::date, 'yoga', 'manual' from zones;
select results_eq(
  $$ select user_id, title from private.push_outbox where kind = 'moved' and data->>'memberId' = 'c1110000-0000-0000-0000-000000000000' $$,
  $$ values ('c2000000-0000-0000-0000-000000000000'::uuid, 'Mum did yoga'::text) $$,
  'Mum''s yoga today tells Dad');

select is(private.moved_phrase('gym'), 'went to the gym', 'A gym session reads "went to the gym"');
select is(private.moved_phrase('other'), 'moved today', 'Anything else reads "moved today"');

-- One cheer push per person -------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.cheers (workout_id, member_id)
     values ('ca000000-0000-0000-0000-000000000000', 'c1110000-0000-0000-0000-000000000000') $$,
  'Mum cheers Dad''s run');
select lives_ok(
  $$ delete from public.cheers where workout_id = 'ca000000-0000-0000-0000-000000000000' $$,
  'Mum takes the cheer back');
select lives_ok(
  $$ insert into public.cheers (workout_id, member_id)
     values ('ca000000-0000-0000-0000-000000000000', 'c1110000-0000-0000-0000-000000000000') $$,
  'and cheers again');
reset role;
select is(
  (select count(*)::integer from private.push_outbox where kind = 'cheer'),
  1, 'Dad hears about Mum''s cheer once');

-- Comments --------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "c1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.comments (workout_id, member_id, body)
     values ('ca000000-0000-0000-0000-000000000000', 'c1110000-0000-0000-0000-000000000000', 'Proud of you') $$,
  'Mum comments on Dad''s run');
select throws_ok(
  $$ insert into public.comments (workout_id, member_id, body)
     values ('ca000000-0000-0000-0000-000000000000', 'c1110000-0000-0000-0000-000000000000', '   ') $$,
  '23514', null, 'A blank comment is refused');
select throws_ok(
  $$ insert into public.comments (workout_id, member_id, body)
     values ('ca000000-0000-0000-0000-000000000000', 'c2220000-0000-0000-0000-000000000000', 'Fake') $$,
  '42501', null, 'Mum can''t comment as Dad');

set local request.jwt.claims = '{"sub": "c4000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.comments (workout_id, member_id, body)
     values ('ca000000-0000-0000-0000-000000000000', 'c4440000-0000-0000-0000-000000000000', 'Hi') $$,
  '42501', null, 'Someone in another family can''t comment');
select is(
  (select count(*)::integer from public.comments),
  0, 'and can''t read the family''s comments');
reset role;

select results_eq(
  $$ select user_id, title, body, data->>'workoutId' from private.push_outbox where kind = 'comment' $$,
  $$ values ('c2000000-0000-0000-0000-000000000000'::uuid, 'Mum on your run'::text, 'Proud of you'::text,
             'ca000000-0000-0000-0000-000000000000'::text) $$,
  'Dad is told what Mum said');

-- 19 more makes 20 today; the 21st is refused.
insert into public.comments (workout_id, member_id, body)
select 'ca000000-0000-0000-0000-000000000000', 'c1110000-0000-0000-0000-000000000000', 'Go you'
  from generate_series(1, 19);
select throws_ok(
  $$ insert into public.comments (workout_id, member_id, body)
     values ('ca000000-0000-0000-0000-000000000000', 'c1110000-0000-0000-0000-000000000000', 'One more') $$,
  'P0001', 'too many comments today', 'At most 20 comments a day from one person');

-- Which app recorded it -----------------------------------------------------------------
insert into public.workouts (id, member_id, local_date, type, source, health_workout_id, source_app)
select 'cb000000-0000-0000-0000-000000000000', 'c2220000-0000-0000-0000-000000000000',
       (now() at time zone awake)::date, 'run', 'health', 'whoop-copy', 'WHOOP'
  from zones;

set local role authenticated;
set local request.jwt.claims = '{"sub": "c2000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select results_eq(
  $$ update public.workouts set health_workout_id = 'watch-copy', source_app = 'Dad''s Apple Watch'
      where id = 'cb000000-0000-0000-0000-000000000000' returning health_workout_id, source_app $$,
  $$ values ('watch-copy'::text, 'Dad''s Apple Watch'::text) $$,
  'Dad can point his own Health workout at a better copy');
select throws_ok(
  $$ update public.workouts set source = 'manual' where id = 'cb000000-0000-0000-0000-000000000000' $$,
  '42501', null, 'but can''t change where it came from');
reset role;

select * from finish();
rollback;
