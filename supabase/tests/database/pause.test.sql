-- Breaks ("Pause me", migration 20261017000003). Rolled back, like arro.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

insert into auth.users (id, email, aud, role) values
  ('61000000-0000-0000-0000-000000000000', 'p1@arro.test', 'authenticated', 'authenticated'),
  ('62000000-0000-0000-0000-000000000000', 'p2@arro.test', 'authenticated', 'authenticated'),
  ('63000000-0000-0000-0000-000000000000', 'q1@arro.test', 'authenticated', 'authenticated'),
  ('64000000-0000-0000-0000-000000000000', 'q2@arro.test', 'authenticated', 'authenticated'),
  ('65000000-0000-0000-0000-000000000000', 'r1@arro.test', 'authenticated', 'authenticated'),
  ('66000000-0000-0000-0000-000000000000', 'r2@arro.test', 'authenticated', 'authenticated');

insert into public.families (id, name) values
  ('66666666-0000-0000-0000-000000000001', 'Family P'),
  ('66666666-0000-0000-0000-000000000002', 'Family Q'),
  ('66666666-0000-0000-0000-000000000003', 'Family R');

insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at) values
  ('61111111-0000-0000-0000-000000000000', '66666666-0000-0000-0000-000000000001',
   '61000000-0000-0000-0000-000000000000', 'P1', '#EF6C1A', 'Australia/Brisbane', '2026-06-01 09:00+10'),
  ('62222222-0000-0000-0000-000000000000', '66666666-0000-0000-0000-000000000001',
   '62000000-0000-0000-0000-000000000000', 'P2', '#DF6B96', 'Australia/Brisbane', '2026-06-01 10:00+10'),
  ('63333333-0000-0000-0000-000000000000', '66666666-0000-0000-0000-000000000002',
   '63000000-0000-0000-0000-000000000000', 'Q1', '#EF6C1A', 'Australia/Brisbane', '2026-06-01 09:00+10'),
  ('64444444-0000-0000-0000-000000000000', '66666666-0000-0000-0000-000000000002',
   '64000000-0000-0000-0000-000000000000', 'Q2', '#DF6B96', 'Australia/Brisbane', '2026-06-01 10:00+10'),
  ('65555555-0000-0000-0000-000000000000', '66666666-0000-0000-0000-000000000003',
   '65000000-0000-0000-0000-000000000000', 'R1', '#EF6C1A', 'UTC', now() - interval '5 days'),
  ('66666666-0000-0000-0000-000000000000', '66666666-0000-0000-0000-000000000003',
   '66000000-0000-0000-0000-000000000000', 'R2', '#DF6B96', 'UTC', now() - interval '5 days');

alter table public.workouts disable trigger workouts_check_date;
-- P1 moves every day 1-10 June. P2 moves 1-3 and 9-10 June, on a break 4-8 June.
insert into public.workouts (member_id, local_date, type, source)
select '61111111-0000-0000-0000-000000000000', d::date, 'walk', 'manual'
  from generate_series('2026-06-01'::date, '2026-06-10', interval '1 day') d;
insert into public.workouts (member_id, local_date, type, source)
select '62222222-0000-0000-0000-000000000000', d::date, 'walk', 'manual'
  from generate_series('2026-06-01'::date, '2026-06-10', interval '1 day') d
 where d::date not between '2026-06-04' and '2026-06-08';
-- Q1 and Q2 both move 1-3 and 6-7 June, and both take 4-5 June off.
insert into public.workouts (member_id, local_date, type, source)
select m, d::date, 'walk', 'manual'
  from unnest(array['63333333-0000-0000-0000-000000000000', '64444444-0000-0000-0000-000000000000']::uuid[]) m,
       generate_series('2026-06-01'::date, '2026-06-07', interval '1 day') d
 where d::date not between '2026-06-04' and '2026-06-05';
alter table public.workouts enable trigger workouts_check_date;

insert into public.pauses (member_id, starts_on, ends_on) values
  ('62222222-0000-0000-0000-000000000000', '2026-06-04', '2026-06-08'),
  -- P1 is on a break on the 2nd too, but moves anyway.
  ('61111111-0000-0000-0000-000000000000', '2026-06-02', '2026-06-02'),
  ('63333333-0000-0000-0000-000000000000', '2026-06-04', '2026-06-05'),
  ('64444444-0000-0000-0000-000000000000', '2026-06-04', '2026-06-05');

-- Streaks --------------------------------------------------------------------------
select results_eq(
  $$ select day, status from private.member_days('62222222-0000-0000-0000-000000000000', '2026-06-10 20:00+10')
      where day between '2026-06-03' and '2026-06-09' $$,
  $$ values ('2026-06-03'::date, 'moved'), ('2026-06-04', 'paused'), ('2026-06-05', 'paused'), ('2026-06-06', 'paused'),
            ('2026-06-07', 'paused'), ('2026-06-08', 'paused'), ('2026-06-09', 'moved') $$,
  'P2''s break days are paused, not missed or frozen');
select is(
  (select status from private.member_days('61111111-0000-0000-0000-000000000000', '2026-06-10 20:00+10') where day = '2026-06-02'),
  'moved', 'moving on a break day still counts as moving');
select results_eq(
  $$ select family_streak, longest_streak, latest_day_state
       from private.family_summary('66666666-0000-0000-0000-000000000001', '2026-06-10 20:00+10') $$,
  $$ values (10, 10, 'counted') $$,
  'family P: P1 kept every day while P2 was away, so all ten days count');
select results_eq(
  $$ select personal_streak, freeze_available
       from private.member_summary('62222222-0000-0000-0000-000000000000', '2026-06-10 20:00+10') $$,
  $$ values (5, true) $$,
  'P2''s own streak holds through the break, and no freeze was used');
select results_eq(
  $$ select day, state from private.family_days('66666666-0000-0000-0000-000000000002', '2026-06-07 20:00+10')
      where day between '2026-06-03' and '2026-06-06' $$,
  $$ values ('2026-06-03'::date, 'counted'), ('2026-06-04', 'skip'), ('2026-06-05', 'skip'), ('2026-06-06', 'counted') $$,
  'family Q: days when everyone is away are skipped');
select results_eq(
  $$ select family_streak, longest_streak
       from private.family_summary('66666666-0000-0000-0000-000000000002', '2026-06-07 20:00+10') $$,
  $$ values (5, 5) $$,
  'family Q: skipped days neither count nor break the streak');

-- Taking and ending a break ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "65000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is(public.pause_me('65555555-0000-0000-0000-000000000000', 3), (now() at time zone 'UTC')::date + 2,
  'R1 takes three days off, ending the day after tomorrow');
select is(public.pause_me('65555555-0000-0000-0000-000000000000', 7), (now() at time zone 'UTC')::date + 6,
  'R1 makes it a week');
select is((select count(*)::integer from public.pauses where member_id = '65555555-0000-0000-0000-000000000000'), 1,
  'changing the length keeps one break');
select throws_ok($$ select public.pause_me('65555555-0000-0000-0000-000000000000', 15) $$, '22023', null,
  'a break is at most 14 days');
select throws_ok($$ select public.pause_me('66666666-0000-0000-0000-000000000000', 3) $$, '42501', null,
  'R1 can''t put R2 on a break');
select throws_ok(
  $$ insert into public.pauses (member_id, starts_on, ends_on)
     values ('65555555-0000-0000-0000-000000000000', '2026-01-01', '2026-01-02') $$,
  '42501', null, 'nobody writes a break directly, so none starts in the past');

set local request.jwt.claims = '{"sub": "66000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is((select count(*)::integer from public.pauses), 1, 'R2 sees R1''s break');
set local request.jwt.claims = '{"sub": "61000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select is((select count(*)::integer from public.pauses where member_id = '65555555-0000-0000-0000-000000000000'), 0,
  'someone in another family doesn''t');
reset role;

-- The evening push ----------------------------------------------------------------------
-- R2 moved today and has a phone; R1 hasn't moved and is on a break.
insert into public.push_tokens (token, user_id) values ('ExponentPushToken[r2]', '66000000-0000-0000-0000-000000000000');
insert into public.workouts (member_id, local_date, type, source)
values ('66666666-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date, 'run', 'manual');
select is(private.queue_evening_nudges(date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' + interval '19 hours 30 minutes'),
  0, 'nobody is told about someone on a break');

set local role authenticated;
set local request.jwt.claims = '{"sub": "65000000-0000-0000-0000-000000000000", "role": "authenticated"}';
select lives_ok($$ select public.end_my_pause('65555555-0000-0000-0000-000000000000') $$, 'R1 ends the break early');
reset role;
select is(private.is_paused('65555555-0000-0000-0000-000000000000', (now() at time zone 'UTC')::date), false,
  'today counts as normal again');
select is((select count(*)::integer from public.pauses where member_id = '65555555-0000-0000-0000-000000000000'), 0,
  'a break that started today is gone once ended');
select is(private.queue_evening_nudges(date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' + interval '19 hours 30 minutes'),
  1, 'back from the break, R1 is named in the evening push again');

select * from finish();
rollback;
