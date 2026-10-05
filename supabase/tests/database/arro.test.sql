-- Family privacy, streak rules and account deletion. Runs in one transaction
-- that's rolled back, so the test users and families never stay in the database.
--   supabase test db                         (local, needs Docker)
--   psql "$DB_URL" -f supabase/tests/database/arro.test.sql   (any database)

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(69);

-- Users -----------------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('a1000000-0000-0000-0000-000000000000', 'a1@arro.test', 'authenticated', 'authenticated'),
  ('a2000000-0000-0000-0000-000000000000', 'a2@arro.test', 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000000', 'b1@arro.test', 'authenticated', 'authenticated'),
  ('b2000000-0000-0000-0000-000000000000', 'b2@arro.test', 'authenticated', 'authenticated'),
  ('c1000000-0000-0000-0000-000000000000', 'c1@arro.test', 'authenticated', 'authenticated'),
  ('d1000000-0000-0000-0000-000000000000', 'd1@arro.test', 'authenticated', 'authenticated'),
  ('e1000000-0000-0000-0000-000000000000', 'e1@arro.test', 'authenticated', 'authenticated'),
  ('e2000000-0000-0000-0000-000000000000', 'e2@arro.test', 'authenticated', 'authenticated'),
  ('f1000000-0000-0000-0000-000000000000', 'f1@arro.test', 'authenticated', 'authenticated');

-- Family A: both in Brisbane. A1 joins 1 June, A2 joins 3 June.
insert into public.families (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Family A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Family B'),
  ('cccccccc-0000-0000-0000-000000000000', 'Family C'),
  ('eeeeeeee-0000-0000-0000-000000000000', 'Family E'),
  ('ffffffff-0000-0000-0000-000000000000', 'Family F');

insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at) values
  ('a1111111-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000',
   'a1000000-0000-0000-0000-000000000000', 'A1', '#EF6C1A', 'Australia/Brisbane', '2026-06-01 09:00+10'),
  ('a2222222-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000',
   'a2000000-0000-0000-0000-000000000000', 'A2', '#DF6B96', 'Australia/Brisbane', '2026-06-03 09:00+10'),
  -- Family B: one in Brisbane, one in California.
  ('b1111111-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000',
   'b1000000-0000-0000-0000-000000000000', 'B1', '#EF6C1A', 'Australia/Brisbane', '2026-06-01 09:00+10'),
  ('b2222222-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000',
   'b2000000-0000-0000-0000-000000000000', 'B2', '#DF6B96', 'America/Los_Angeles', '2026-06-01 10:00-07'),
  -- Family C: one member, so no family streak yet.
  ('c1111111-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000',
   'c1000000-0000-0000-0000-000000000000', 'C1', '#EF6C1A', 'Europe/London', '2026-06-01 09:00+01'),
  -- Family E (UTC, dates relative to now): E1 joined 6 days ago, E2 5 days ago.
  ('e1111111-0000-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000',
   'e1000000-0000-0000-0000-000000000000', 'E1', '#EF6C1A', 'UTC', now() - interval '6 days'),
  ('e2222222-0000-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000',
   'e2000000-0000-0000-0000-000000000000', 'E2', '#DF6B96', 'UTC', now() - interval '5 days'),
  -- Family F: one member who joined 1 July and then stopped, for the weekly freeze.
  ('f1111111-0000-0000-0000-000000000000', 'ffffffff-0000-0000-0000-000000000000',
   'f1000000-0000-0000-0000-000000000000', 'F1', '#EF6C1A', 'UTC', '2026-07-01 09:00+00');

-- Fixture workouts below are older than yesterday, which the date trigger rejects
-- for real clients. It's switched off while the fixtures go in (inside this
-- transaction only) and back on before any role is set.
alter table public.workouts disable trigger workouts_check_date;

-- A1 moves every day 1-10 June except the 5th and the 7th.
insert into public.workouts (member_id, local_date, type, source)
select 'a1111111-0000-0000-0000-000000000000', d::date, 'walk', 'manual'
  from generate_series('2026-06-01'::date, '2026-06-10', interval '1 day') d
 where d::date not in ('2026-06-05', '2026-06-07');
-- ...and on 8 June also has a Health workout, which mustn't count twice.
insert into public.workouts (member_id, local_date, type, source, health_workout_id)
values ('a1111111-0000-0000-0000-000000000000', '2026-06-08', 'run', 'health', 'HK-0001');

-- A2 moves every day 3-10 June except the 6th.
insert into public.workouts (member_id, local_date, type, source)
select 'a2222222-0000-0000-0000-000000000000', d::date, 'gym', 'manual'
  from generate_series('2026-06-03'::date, '2026-06-10', interval '1 day') d
 where d::date <> '2026-06-06';

-- B1 (Brisbane) moves 1-4 June. B2 (California) moves 1-3 June.
insert into public.workouts (member_id, local_date, type, source)
select 'b1111111-0000-0000-0000-000000000000', d::date, 'swim', 'manual'
  from generate_series('2026-06-01'::date, '2026-06-04', interval '1 day') d;
insert into public.workouts (member_id, local_date, type, source)
select 'b2222222-0000-0000-0000-000000000000', d::date, 'yoga', 'manual'
  from generate_series('2026-06-01'::date, '2026-06-03', interval '1 day') d;

-- E1 moves every day from 6 days ago to today. E2 moves once, 4 days ago: their
-- freeze covers 3 days ago, then 2 days ago and yesterday are real misses.
insert into public.workouts (member_id, local_date, type, source)
select 'e1111111-0000-0000-0000-000000000000', d::date, 'walk', 'manual'
  from generate_series((now() at time zone 'UTC')::date - 6, (now() at time zone 'UTC')::date, interval '1 day') d;
insert into public.workouts (member_id, local_date, type, source)
values ('e2222222-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 4, 'walk', 'manual');

-- F1 moves on 1 and 2 July, then nothing.
insert into public.workouts (member_id, local_date, type, source) values
  ('f1111111-0000-0000-0000-000000000000', '2026-07-01', 'walk', 'manual'),
  ('f1111111-0000-0000-0000-000000000000', '2026-07-02', 'walk', 'manual');

alter table public.workouts enable trigger workouts_check_date;

-- Streaks: missed day and freeze ---------------------------------------------
-- As of 10 June, 8pm in Brisbane.
-- A1: 5th frozen, 7th missed (freeze not back for 7 days). A2: 6th frozen.
-- Family days 3-10 June: 3,4,5,6 count; 7 breaks; 8,9,10 count.
select results_eq(
  $$ select family_streak, longest_streak, days_together_this_year, started_on, latest_day_state
       from private.family_summary('aaaaaaaa-0000-0000-0000-000000000000', '2026-06-10 20:00+10') $$,
  $$ values (3, 4, 7, '2026-06-03'::date, 'counted') $$,
  'family A: freezes cover the 5th and 6th, the 7th breaks it, streak is 3, longest 4, 7 days together'
);

select results_eq(
  $$ select day, status from private.member_days('a1111111-0000-0000-0000-000000000000', '2026-06-10 20:00+10')
      where day between '2026-06-04' and '2026-06-08' $$,
  $$ values ('2026-06-04'::date, 'moved'), ('2026-06-05', 'frozen'), ('2026-06-06', 'moved'),
            ('2026-06-07', 'missed'), ('2026-06-08', 'moved') $$,
  'A1: first miss uses the freeze, a second miss two days later is a real miss'
);

select results_eq(
  $$ select personal_streak, moved_today, freeze_available, freeze_back_on
       from private.member_summary('a1111111-0000-0000-0000-000000000000', '2026-06-10 20:00+10') $$,
  $$ values (3, true, false, '2026-06-12'::date) $$,
  'A1: personal streak 3 (Health and manual on the 8th count once), freeze back on the 12th'
);

select is(
  (select count(*)::integer from private.member_days('a1111111-0000-0000-0000-000000000000', '2026-06-10 20:00+10')
    where day = '2026-06-08'),
  1,
  'A1: a Health workout and a manual check-in on the same day make one day'
);

select results_eq(
  $$ select personal_streak, freeze_available
       from private.member_summary('a2222222-0000-0000-0000-000000000000', '2026-06-10 20:00+10') $$,
  $$ values (8, false) $$,
  'A2: 8 days in a row, with the freeze used on the 6th'
);

select results_eq(
  $$ select personal_streak, freeze_available, freeze_back_on
       from private.member_summary('a1111111-0000-0000-0000-000000000000', '2026-06-13 08:00+10') $$,
  $$ values (1, false, '2026-06-19'::date) $$,
  'A1: nothing logged after the 10th, so the 11th is missed (no freeze yet), the 12th uses the refilled freeze'
);

-- Today not done yet doesn't break the streak: as of 11 June 8am, neither has moved.
select results_eq(
  $$ select family_streak, latest_day_state
       from private.family_summary('aaaaaaaa-0000-0000-0000-000000000000', '2026-06-11 08:00+10') $$,
  $$ values (3, 'pending') $$,
  'family A: today in progress keeps the streak at 3'
);

-- Cross-timezone family --------------------------------------------------------
-- 5 June 01:00 UTC: 11am 5 June in Brisbane, 6pm 4 June in California.
-- B2 hasn't moved on the 4th yet but it's still the 4th for them.
select results_eq(
  $$ select family_streak, latest_day_state
       from private.family_summary('bbbbbbbb-0000-0000-0000-000000000000', '2026-06-05 01:00+00') $$,
  $$ values (3, 'pending') $$,
  'family B: still the 4th in California, so the 4th is pending, streak 3'
);

select results_eq(
  $$ select day, state from private.family_days('bbbbbbbb-0000-0000-0000-000000000000', '2026-06-05 01:00+00')
      where day >= '2026-06-04' $$,
  $$ values ('2026-06-04'::date, 'pending'), ('2026-06-05', 'pending') $$,
  'family B: the 4th and the 5th are both still open'
);

-- 5 June 08:00 UTC: 1am 5 June in California. B2's 4th is over with nothing
-- logged, so their freeze covers it and the family day counts.
select results_eq(
  $$ select family_streak, latest_day_state
       from private.family_summary('bbbbbbbb-0000-0000-0000-000000000000', '2026-06-05 08:00+00') $$,
  $$ values (4, 'pending') $$,
  'family B: once the 4th ends in California, B2''s freeze covers it, streak 4'
);

select results_eq(
  $$ select local_today, freeze_available, freeze_back_on
       from private.member_summary('b2222222-0000-0000-0000-000000000000', '2026-06-05 08:00+00') $$,
  $$ values ('2026-06-05'::date, false, '2026-06-11'::date) $$,
  'B2: today is the 5th in California and the freeze is back on the 11th'
);

-- A day later B2 still hasn't moved: the 5th is a real miss, the family streak breaks,
-- but days together this year stays at 4.
select results_eq(
  $$ select family_streak, longest_streak, days_together_this_year
       from private.family_summary('bbbbbbbb-0000-0000-0000-000000000000', '2026-06-06 08:00+00') $$,
  $$ values (0, 4, 4) $$,
  'family B: a miss with no freeze left breaks the streak, days together stays 4'
);

-- One member: no family streak yet ---------------------------------------------
select results_eq(
  $$ select family_streak, started_on from private.family_summary('cccccccc-0000-0000-0000-000000000000', '2026-06-10 12:00+00') $$,
  $$ values (0, null::date) $$,
  'family C: one member, so the family streak hasn''t started'
);

-- Row-level security -------------------------------------------------------------
insert into public.family_plans (family_id, product, status) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'arro_family_annual', 'active');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000000", "role": "authenticated"}';

select results_eq('select name from public.families', $$ values ('Family A') $$,
  'A1 sees only their own family');
select is((select count(*)::integer from public.members), 2, 'A1 sees the two members of family A only');
select is((select count(*)::integer from public.workouts
            where member_id not in ('a1111111-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000')),
  0, 'A1 sees no workouts from family B or C');
select is((select count(*)::integer from public.family_plans), 1, 'A1 can read family A''s plan');

select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('b1111111-0000-0000-0000-000000000000', current_date, 'walk', 'manual') $$,
  '42501', null, 'A1 can''t log a workout as someone in family B');
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('a2222222-0000-0000-0000-000000000000', current_date, 'walk', 'manual') $$,
  '42501', null, 'A1 can''t log a workout as A2 either');
select lives_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('a1111111-0000-0000-0000-000000000000', current_date, 'other', 'manual') $$,
  'A1 can log their own workout');
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('a1111111-0000-0000-0000-000000000000', current_date + 3, 'walk', 'manual') $$,
  '22023', null, 'A1 can''t log a workout dated after their own today');

with renamed as (
  update public.members set display_name = 'Hacked' where id = 'a2222222-0000-0000-0000-000000000000' returning 1
)
select is((select count(*)::integer from renamed), 0, 'A1 can''t rename A2');
select throws_ok(
  $$ update public.members set family_id = 'bbbbbbbb-0000-0000-0000-000000000000'
      where id = 'a1111111-0000-0000-0000-000000000000' $$,
  '42501', null, 'A1 can''t move themselves into family B');
select throws_ok(
  $$ insert into public.family_plans (family_id, product, status)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'free_upgrade', 'active') $$,
  '42501', null, 'A1 can''t write a family plan');
select throws_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('a1111111-0000-0000-0000-000000000000', 'b1111111-0000-0000-0000-000000000000') $$,
  '42501', null, 'A1 can''t nudge someone in family B');
select lives_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('a1111111-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000') $$,
  'A1 can nudge A2');
select throws_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('a1111111-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000') $$,
  '23505', null, 'A2 gets at most one nudge a day');
select throws_ok(
  $$ select * from public.family_streak('bbbbbbbb-0000-0000-0000-000000000000') $$,
  '42501', null, 'A1 can''t read family B''s streak');
select lives_ok(
  $$ select * from public.family_streak('aaaaaaaa-0000-0000-0000-000000000000') $$,
  'A1 can read family A''s streak');
select is((select count(*)::integer from public.member_streaks('aaaaaaaa-0000-0000-0000-000000000000')), 2,
  'member_streaks gives one row per member of family A');

-- B1 can't see family A, nor the nudge A1 sent.
set local request.jwt.claims = '{"sub": "b1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is((select count(*)::integer from public.workouts
            where member_id in ('a1111111-0000-0000-0000-000000000000', 'a2222222-0000-0000-0000-000000000000')),
  0, 'B1 sees no workouts from family A');
select is((select count(*)::integer from public.family_plans), 0, 'B1 can''t read family A''s plan');
select is((select count(*)::integer from public.nudges), 0, 'B1 can''t see family A''s nudges');

-- Signed-out clients get nothing.
set local role anon;
select throws_ok('select count(*) from public.families', '42501', null, 'signed-out clients can''t read families');

-- Invites, joining and account deletion -----------------------------------------
reset role;
insert into public.invites (code, family_id, invited_by)
values ('TEST42', 'aaaaaaaa-0000-0000-0000-000000000000', 'a1111111-0000-0000-0000-000000000000');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
set local request.headers = '{"cf-connecting-ip": "203.0.113.1"}';
select results_eq(
  $$ select family_name, member_count, invited_by_name, member_names, member_colours, member_photo_paths, family_streak
       from public.preview_invite('test42') $$,
  $$ values ('Family A', 2, null::text, null::text[], null::text[], null::text[], null::integer) $$,
  'before signing in a code shows only the family name and member count');

set local role authenticated;
set local request.jwt.claims = '{"sub": "d1000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select results_eq(
  $$ select display_name, colour, timezone from public.join_family('TEST42', 'D1', 'America/Los_Angeles') $$,
  $$ values ('D1', '#4F97CF', 'America/Los_Angeles') $$,
  'joining with the code adds D1 with the next palette colour');

select lives_ok('select public.delete_my_account()', 'D1 can delete their account');

reset role;
select is((select count(*)::integer from public.members where user_id = 'd1000000-0000-0000-0000-000000000000'),
  0, 'deleting the account removed D1''s member row');

-- Deleting C1, the only member of family C, removes the family too.
delete from auth.users where id = 'c1000000-0000-0000-0000-000000000000';
select is((select count(*)::integer from public.families where id = 'cccccccc-0000-0000-0000-000000000000'),
  0, 'a family with no members left is deleted');

-- Workout dates: today or yesterday only ------------------------------------------------
-- E1 and E2 are in UTC, so their today is (now() at time zone 'UTC')::date.
set local role authenticated;
set local request.jwt.claims = '{"sub": "e1000000-0000-0000-0000-000000000000", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('e1111111-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date, 'yoga', 'manual') $$,
  'a workout dated today is accepted');
select lives_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('e1111111-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 1, 'yoga', 'manual') $$,
  'a workout dated yesterday is accepted');
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('e1111111-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 2, 'yoga', 'manual') $$,
  '22023', null, 'a workout dated two days ago is rejected');
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('e1111111-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date + 1, 'yoga', 'manual') $$,
  '22023', null, 'a workout dated tomorrow is rejected');
select lives_ok(
  $$ insert into public.workouts (member_id, local_date, type, source, health_workout_id)
     values ('e1111111-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 1, 'run', 'health', 'HK-E1-1') $$,
  'a Health sync from yesterday is accepted');
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source, health_workout_id)
     values ('e1111111-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 3, 'run', 'health', 'HK-E1-2') $$,
  '22023', null, 'a Health workout from three days ago is rejected like any other');

with edited as (
  update public.workouts set note = 'felt good'
   where member_id = 'e1111111-0000-0000-0000-000000000000' and local_date = (now() at time zone 'UTC')::date - 6
  returning 1
)
select is((select count(*)::integer from edited), 1, 'editing the note on an old workout still works');
with edited as (
  update public.workouts set local_date = local_date, note = 'felt great'
   where member_id = 'e1111111-0000-0000-0000-000000000000' and local_date = (now() at time zone 'UTC')::date - 6
  returning 1
)
select is((select count(*)::integer from edited), 1, 'sending an old workout back with the same date still works');
select throws_ok(
  $$ update public.workouts set local_date = (now() at time zone 'UTC')::date - 5
      where member_id = 'e1111111-0000-0000-0000-000000000000' and local_date = (now() at time zone 'UTC')::date - 6 $$,
  '22023', null, 'moving a workout to another old date is rejected');

-- E2 broke the family streak: 2 days ago and yesterday are real misses. No older
-- date can be filled in to repair it.
reset role;
select results_eq(
  $$ select day - (now() at time zone 'UTC')::date, state
       from private.family_days('eeeeeeee-0000-0000-0000-000000000000')
      where day between (now() at time zone 'UTC')::date - 3 and (now() at time zone 'UTC')::date - 1
      order by day $$,
  $$ values (-3, 'counted'), (-2, 'broken'), (-1, 'broken') $$,
  'family E: the freeze covers 3 days ago, then the streak breaks');

set local role authenticated;
set local request.jwt.claims = '{"sub": "e2000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('e2222222-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 2, 'walk', 'manual') $$,
  '22023', null, 'E2 can''t log the broken day afterwards');
select throws_ok(
  $$ insert into public.workouts (member_id, local_date, type, source)
     values ('e2222222-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date - 3, 'walk', 'manual') $$,
  '22023', null, 'E2 can''t log the frozen day either');

reset role;
select results_eq(
  $$ select day - (now() at time zone 'UTC')::date, state
       from private.family_days('eeeeeeee-0000-0000-0000-000000000000')
      where day between (now() at time zone 'UTC')::date - 3 and (now() at time zone 'UTC')::date - 1
      order by day $$,
  $$ values (-3, 'counted'), (-2, 'broken'), (-1, 'broken') $$,
  'family E: the broken day is still broken after the attempts');

-- Invites: codes, expiry and guessing ------------------------------------------------
select is(
  (select count(*)::integer from generate_series(1, 100) g
    where private.new_join_code() ~ '^[A-HJKMNP-Z2-9]{6}$'),
  100, '100 new join codes are all six characters from the code alphabet');
select is(
  (select prosrc !~ 'random\(\)' and prosrc ~ 'gen_random_bytes'
     from pg_proc where oid = 'private.new_join_code()'::regprocedure),
  true, 'join codes come from gen_random_bytes, not random()');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1000000-0000-0000-0000-000000000000", "role": "authenticated"}';

with made as (
  insert into public.invites (family_id, invited_by)
  values ('aaaaaaaa-0000-0000-0000-000000000000', 'a1111111-0000-0000-0000-000000000000')
  returning code, expires_at
)
select is(
  (select code ~ '^[A-HJKMNP-Z2-9]{6}$' and expires_at = now() + interval '14 days' from made),
  true, 'an invite made by a member gets a code and the 14-day expiry');
select throws_ok(
  $$ insert into public.invites (family_id, invited_by, expires_at)
     values ('aaaaaaaa-0000-0000-0000-000000000000', 'a1111111-0000-0000-0000-000000000000', now() + interval '365 days') $$,
  '42501', null, 'a member can''t choose an invite''s expiry');

select results_eq(
  $$ select family_name, member_count, invited_by_name, member_names, member_colours, family_streak
       from public.preview_invite('test42') $$,
  $$ values ('Family A', 2, 'A1', array['A1', 'A2'], array['#EF6C1A', '#DF6B96'], 0) $$,
  'signed in, a code also shows who invited and the members');
select throws_ok('select * from private.invite_attempts', '42501', null,
  'signed-in clients can''t read the failed-attempt log');

-- Ten failed guesses from one address, then it's blocked; others are not.
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
set local request.headers = '{"cf-connecting-ip": "203.0.113.50"}';
select is((select count(*)::integer from public.preview_invite('NOPE00')), 0, 'an unknown code shows nothing');
select lives_ok(
  $$ select count(*) from generate_series(1, 9) g cross join lateral public.preview_invite('NOPE0' || g) $$,
  'nine more wrong codes are answered with nothing');
reset role;
select is((select count(*)::integer from private.invite_attempts where caller = 'ip:203.0.113.50'), 10,
  'each wrong code was logged against the caller');
set local role anon;
select throws_ok($$ select * from public.preview_invite('NOPE99') $$, 'PT429', null,
  'the eleventh attempt from the same address is refused');
select throws_ok($$ select * from public.preview_invite('TEST42') $$, 'PT429', null,
  'a blocked address is refused even with a right code');
set local request.headers = '{"cf-connecting-ip": "203.0.113.51"}';
select results_eq($$ select family_name from public.preview_invite('TEST42') $$, $$ values ('Family A') $$,
  'another address still gets through');

-- Across everyone: 200 failures in an hour blocks every caller.
reset role;
insert into private.invite_attempts (caller)
select 'ip:198.51.100.' || g from generate_series(1, 200) g;
set local role anon;
set local request.headers = '{"cf-connecting-ip": "203.0.113.52"}';
select throws_ok($$ select * from public.preview_invite('TEST42') $$, 'PT429', null,
  'once 200 wrong codes came in within the hour, a fresh address is refused too');
reset role;

-- Freezes come back a week later ------------------------------------------------------------
-- F1 moved on 1 and 2 July. 3 July is their first miss, so the freeze covers it.
select is(private.freeze_refill_days(), 7, 'a used freeze comes back after 7 days');
select results_eq(
  $$ select day, status from private.member_days('f1111111-0000-0000-0000-000000000000', '2026-07-12 12:00+00')
      where day in ('2026-07-03', '2026-07-09', '2026-07-10') order by day $$,
  $$ values ('2026-07-03'::date, 'frozen'), ('2026-07-09', 'missed'), ('2026-07-10', 'frozen') $$,
  'F1: a freeze used on the 3rd covers nothing on the 9th (6 days) and is back on the 10th (7 days)');
select results_eq(
  $$ select freeze_available, freeze_back_on from private.member_summary('f1111111-0000-0000-0000-000000000000', '2026-07-09 12:00+00') $$,
  $$ values (false, '2026-07-10'::date) $$,
  'F1: six days after using the freeze it isn''t back yet');
select results_eq(
  $$ select freeze_available, freeze_back_on from private.member_summary('f1111111-0000-0000-0000-000000000000', '2026-07-10 12:00+00') $$,
  $$ values (true, null::date) $$,
  'F1: seven days after using the freeze it is back');

select * from finish();
rollback;
