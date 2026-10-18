-- The build 7 review fixes (migration 20261018000001): comment quiet hours, comment
-- length, owners deleting comments on their workouts, one cheer push each, and the
-- limits on breaks. Rolled back, like arro.test.sql. Quiet hours follow the real
-- now(), so members get fixed-offset zones at midday ("awake") or 03:00 ("asleep").

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

create temp table zones on commit drop as
with offsets as (
  select ((12 - extract(hour from now() at time zone 'UTC')::integer + 36) % 24) - 12 as awake,
         ((3 - extract(hour from now() at time zone 'UTC')::integer + 36) % 24) - 12 as asleep
)
select case when awake = 0 then 'UTC' else format('Etc/GMT%s%s', case when awake > 0 then '-' else '+' end, abs(awake)) end as awake,
       case when asleep = 0 then 'UTC' else format('Etc/GMT%s%s', case when asleep > 0 then '-' else '+' end, abs(asleep)) end as asleep
  from offsets;

insert into auth.users (id, email, aud, role) values
  ('e1000000-0000-0000-0000-000000000000', 'mum@arro.test', 'authenticated', 'authenticated'),
  ('e2000000-0000-0000-0000-000000000000', 'dad@arro.test', 'authenticated', 'authenticated'),
  ('e3000000-0000-0000-0000-000000000000', 'gran@arro.test', 'authenticated', 'authenticated'),
  ('e5000000-0000-0000-0000-000000000000', 'r@arro.test', 'authenticated', 'authenticated'),
  ('e6000000-0000-0000-0000-000000000000', 's@arro.test', 'authenticated', 'authenticated'),
  ('e7000000-0000-0000-0000-000000000000', 't@arro.test', 'authenticated', 'authenticated');

insert into public.families (id, name) values
  ('e0000000-0000-0000-0000-000000000000', 'Home crew'),
  ('ef000000-0000-0000-0000-000000000000', 'Break crew');

-- Mum and Dad are awake; Gran is asleep.
insert into public.members (id, family_id, user_id, display_name, colour, timezone)
select v.id::uuid, 'e0000000-0000-0000-0000-000000000000', v.user_id::uuid, v.name, '#EF6C1A',
       case v.zone when 'awake' then z.awake else z.asleep end
  from zones z,
       (values
         ('e1110000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'Mum', 'awake'),
         ('e2220000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000000', 'Dad', 'awake'),
         ('e3330000-0000-0000-0000-000000000000', 'e3000000-0000-0000-0000-000000000000', 'Gran', 'asleep')
       ) as v(id, user_id, name, zone);

insert into public.members (id, family_id, user_id, display_name, colour, timezone) values
  ('e5550000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000',
   'e5000000-0000-0000-0000-000000000000', 'R', '#EF6C1A', 'UTC'),
  ('e6660000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000',
   'e6000000-0000-0000-0000-000000000000', 'S', '#DF6B96', 'UTC'),
  ('e7770000-0000-0000-0000-000000000000', 'ef000000-0000-0000-0000-000000000000',
   'e7000000-0000-0000-0000-000000000000', 'T', '#4F97CF', 'UTC');

insert into public.workouts (id, member_id, local_date, type, source)
select 'ea000000-0000-0000-0000-000000000000', 'e2220000-0000-0000-0000-000000000000',
       (now() at time zone awake)::date, 'run', 'manual' from zones;
insert into public.workouts (id, member_id, local_date, type, source)
select 'eb000000-0000-0000-0000-000000000000', 'e3330000-0000-0000-0000-000000000000',
       (now() at time zone asleep)::date, 'walk', 'manual' from zones;

-- Join and "went for a run" pushes aren't what this file tests.
delete from private.push_outbox;

-- Comment pushes keep quiet hours ------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
insert into public.comments (workout_id, member_id, body) values
  ('ea000000-0000-0000-0000-000000000000', 'e1110000-0000-0000-0000-000000000000', 'Proud of you'),
  ('eb000000-0000-0000-0000-000000000000', 'e1110000-0000-0000-0000-000000000000', 'Lovely walk');
reset role;

select is(
  (select count(*)::integer from private.push_outbox where kind = 'comment' and user_id = 'e2000000-0000-0000-0000-000000000000'),
  1, 'Dad, awake, is told about Mum''s comment');
select is(
  (select count(*)::integer from private.push_outbox where kind = 'comment' and user_id = 'e3000000-0000-0000-0000-000000000000'),
  0, 'Gran, asleep, isn''t pushed');
select is((select count(*)::integer from public.comments), 2, 'Both comments are saved');

-- Length as sent ------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok(
  format($$ insert into public.comments (workout_id, member_id, body)
            values ('ea000000-0000-0000-0000-000000000000', 'e1110000-0000-0000-0000-000000000000', %L) $$,
         repeat(' ', 5000) || 'Hi'),
  '23514', null, 'Padding a short comment past 200 characters is refused');
select lives_ok(
  format($$ insert into public.comments (workout_id, member_id, body)
            values ('ea000000-0000-0000-0000-000000000000', 'e1110000-0000-0000-0000-000000000000', %L) $$,
         repeat('a', 200)),
  'A comment of exactly 200 characters is fine');

-- Who can delete a comment ----------------------------------------------------------------
-- Gran is in the family but neither wrote it nor owns the workout.
set local request.jwt.claims = '{"sub": "e3000000-0000-0000-0000-000000000000", "role": "authenticated"}';
delete from public.comments where body = 'Proud of you';
reset role;
select is((select count(*)::integer from public.comments where body = 'Proud of you'), 1,
  'Someone else in the family can''t delete Mum''s comment on Dad''s run');

set local role authenticated;
set local request.jwt.claims = '{"sub": "e2000000-0000-0000-0000-000000000000", "role": "authenticated"}';
delete from public.comments where body = 'Proud of you';
reset role;
select is((select count(*)::integer from public.comments where body = 'Proud of you'), 0,
  'Dad deletes Mum''s comment on his own run');

set local role authenticated;
set local request.jwt.claims = '{"sub": "e1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
delete from public.comments where body = 'Lovely walk';
reset role;
select is((select count(*)::integer from public.comments where body = 'Lovely walk'), 0,
  'Mum still deletes her own comment on Gran''s walk');

-- One cheer push each ------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "e1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
insert into public.cheers (workout_id, member_id)
values ('ea000000-0000-0000-0000-000000000000', 'e1110000-0000-0000-0000-000000000000');
delete from public.cheers where workout_id = 'ea000000-0000-0000-0000-000000000000';
insert into public.cheers (workout_id, member_id)
values ('ea000000-0000-0000-0000-000000000000', 'e1110000-0000-0000-0000-000000000000');
reset role;
select is((select count(*)::integer from private.push_outbox where kind = 'cheer'), 1,
  'Cheering, taking it back and cheering again pushes Dad once');
select throws_ok(
  $$ insert into private.push_outbox (user_id, kind, title, body, data)
     select user_id, kind, title, body, data from private.push_outbox where kind = 'cheer' $$,
  '23505', null, 'A second push for the same cheer can''t be queued, even at the same moment');

-- A break is at most 14 days from its start --------------------------------------------------
-- R's break started 10 days ago and runs until the day after tomorrow.
insert into public.pauses (member_id, starts_on, ends_on) values
  ('e5550000-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 10, (now() at time zone 'UTC')::date + 2);
set local role authenticated;
set local request.jwt.claims = '{"sub": "e5000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok($$ select public.pause_me('e5550000-0000-0000-0000-000000000000', 14) $$, 'ARB14', null,
  'Making a running break two weeks from today is refused clearly, not with a check-constraint error');
select throws_ok($$ select public.pause_me('e5550000-0000-0000-0000-000000000000', 5) $$, 'ARB14', null,
  'So is anything past 14 days from its start');
select is(public.pause_me('e5550000-0000-0000-0000-000000000000', 4), (now() at time zone 'UTC')::date + 3,
  'Up to the 14th day from its start is fine');
reset role;

-- At most 14 paused days in any 30 -----------------------------------------------------------
-- S had two weeks off that ended yesterday.
insert into public.pauses (member_id, starts_on, ends_on) values
  ('e6660000-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 14, (now() at time zone 'UTC')::date - 1);
set local role authenticated;
set local request.jwt.claims = '{"sub": "e6000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok($$ select public.pause_me('e6660000-0000-0000-0000-000000000000', 1) $$, 'ARB30', null,
  'A new break straight after two weeks off is refused');
select is((select count(*)::integer from public.pauses where member_id = 'e6660000-0000-0000-0000-000000000000'), 1,
  'and nothing is saved');
reset role;

-- T had 10 days off last week and a bit: 4 more fit, 5 don't.
insert into public.pauses (member_id, starts_on, ends_on) values
  ('e7770000-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 15, (now() at time zone 'UTC')::date - 6);
set local role authenticated;
set local request.jwt.claims = '{"sub": "e7000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is(public.pause_me('e7770000-0000-0000-0000-000000000000', 4), (now() at time zone 'UTC')::date + 3,
  'Four more days makes 14 in 30, which is fine');
select throws_ok($$ select public.pause_me('e7770000-0000-0000-0000-000000000000', 5) $$, 'ARB30', null,
  'Stretching it to five makes 15, which is refused');
select lives_ok($$ select public.end_my_pause('e7770000-0000-0000-0000-000000000000') $$,
  'Ending it early still works');
reset role;

select * from finish();
rollback;
