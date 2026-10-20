-- Saunafam families, rules, app config and sessions (migrations 20261021000001
-- and 20261021000002). Rolled back, like arro.test.sql. Session dates follow the
-- real now(), because log_session checks the today-or-yesterday window against it.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(68);

insert into auth.users (id, email, aud, role) values
  ('5a000000-0000-0000-0000-000000000001', 'sam@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000002', 'maya@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000003', 'jo@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000004', 'p4@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000005', 'p5@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000006', 'out@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000007', 'new@saunafam.test', 'authenticated', 'authenticated'),
  ('5a000000-0000-0000-0000-000000000008', 'old@saunafam.test', 'authenticated', 'authenticated');

insert into public.families (id, name) values
  ('5f000000-0000-0000-0000-000000000001', 'Sunday sauna'),
  ('5f000000-0000-0000-0000-000000000002', 'Other family');

-- Sam started Sunday sauna. Jo lives on UTC-10, everyone else on UTC+10.
insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at) values
  ('5b000000-0000-0000-0000-000000000001', '5f000000-0000-0000-0000-000000000001',
   '5a000000-0000-0000-0000-000000000001', 'Sam', '#5F8794', 'Etc/GMT-10', now() - interval '5 days'),
  ('5b000000-0000-0000-0000-000000000002', '5f000000-0000-0000-0000-000000000001',
   '5a000000-0000-0000-0000-000000000002', 'Maya', '#B58A3C', 'Etc/GMT-10', now() - interval '4 days'),
  ('5b000000-0000-0000-0000-000000000003', '5f000000-0000-0000-0000-000000000001',
   '5a000000-0000-0000-0000-000000000003', 'Jo', '#7B6A93', 'Etc/GMT+10', now() - interval '3 days'),
  ('5b000000-0000-0000-0000-000000000004', '5f000000-0000-0000-0000-000000000001',
   '5a000000-0000-0000-0000-000000000004', 'P4', '#6E7F5C', 'Etc/GMT-10', now() - interval '2 days'),
  ('5b000000-0000-0000-0000-000000000005', '5f000000-0000-0000-0000-000000000001',
   '5a000000-0000-0000-0000-000000000005', 'P5', '#B66A78', 'Etc/GMT-10', now() - interval '1 day'),
  ('5b000000-0000-0000-0000-000000000006', '5f000000-0000-0000-0000-000000000002',
   '5a000000-0000-0000-0000-000000000006', 'Out', '#5F8794', 'Etc/GMT-10', now() - interval '5 days');

-- Families, rules and app config ------------------------------------------------------
select results_eq(
  $$ select goal_per_week, min_minutes, week_starts_on, saunafam_started_on
       from public.families where id = '5f000000-0000-0000-0000-000000000001' $$,
  $$ values (3::smallint, 10::smallint, 1::smallint, current_date) $$,
  'a family starts at 3 sessions a week, 10 minutes, Monday weeks, from today');

select results_eq(
  $$ select effective_from, goal_per_week, min_minutes from public.family_rules
      where family_id = '5f000000-0000-0000-0000-000000000001' $$,
  $$ values ('2000-01-03'::date, 3::smallint, 10::smallint) $$,
  'every new family gets its first rule, effective from 2000-01-03');

select is(private.week_start('2026-10-22', 1::smallint), '2026-10-19'::date, 'a Thursday''s Monday week starts on the Monday before');
select is(private.week_start('2026-10-22', 7::smallint), '2026-10-18'::date, 'and its Sunday week on the Sunday before');
select is(private.week_start('2026-10-18', 7::smallint), '2026-10-18'::date, 'a Sunday starts its own Sunday week');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select results_eq($$ select min_ios_build from public.app_config() $$, $$ values (9) $$,
  'app_config() answers before sign-in, with min_ios_build 9');
select throws_ok($$ select * from public.app_config $$, '42501', null, 'the app_config table itself is closed to clients');

set local role authenticated;
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000007", "role": "authenticated"}';
select results_eq(
  $$ select display_name, colour from public.create_family('Lake crew', 'New', 'Etc/GMT-10', null) $$,
  $$ values ('New'::text, '#5F8794'::text) $$,
  'build 8''s four-argument create_family still works, and the founder gets lake');
select results_eq(
  $$ select f.goal_per_week, f.min_minutes, f.week_starts_on from public.families f where f.name = 'Lake crew' $$,
  $$ values (3::smallint, 10::smallint, 1::smallint) $$,
  'with the default rhythm');

set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000008", "role": "authenticated"}';
select lives_ok(
  $$ select public.create_family(p_family_name => 'Sun crew', p_display_name => 'Old', p_timezone => 'Etc/GMT-10',
                                 p_goal => 2, p_min_minutes => 15, p_week_starts_on => 7) $$,
  'create_family takes a goal, a minimum and a Sunday week start');
select results_eq(
  $$ select f.goal_per_week, f.min_minutes, f.week_starts_on, r.effective_from, r.goal_per_week, r.min_minutes
       from public.families f join public.family_rules r on r.family_id = f.id where f.name = 'Sun crew' $$,
  $$ values (2::smallint, 15::smallint, 7::smallint, '2000-01-02'::date, 2::smallint, 15::smallint) $$,
  'and its first rule starts on a Sunday');
select throws_ok(
  $$ select public.create_family('Bad', 'Old', 'Etc/GMT-10', null, 3, 10, 3) $$,
  '22023', 'a week starts on Monday (1) or Sunday (7)', 'a week can only start on Monday or Sunday');
select throws_ok(
  $$ select public.create_family('Bad', 'Old', 'Etc/GMT-10', null, 8) $$,
  '22023', 'the goal is 1 to 7 sessions a week', 'a goal over 7 is refused');

-- set_family_rules: Sam is the founder.
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is(
  public.set_family_rules('5f000000-0000-0000-0000-000000000001', 2, 15),
  (select d - (extract(isodow from d)::integer - 1) + 7 from (select (now() at time zone 'Etc/GMT-10')::date as d) t),
  'the founder''s change starts next Monday, in their time zone');
select results_eq(
  $$ select goal_per_week, min_minutes from public.families where id = '5f000000-0000-0000-0000-000000000001' $$,
  $$ values (2::smallint, 15::smallint) $$,
  'the family shows the new rhythm');
select is(
  (select count(*)::integer from public.family_rules where family_id = '5f000000-0000-0000-0000-000000000001'),
  2, 'and keeps the old rule for this week');
select lives_ok(
  $$ select public.set_family_rules('5f000000-0000-0000-0000-000000000001', 3, 10) $$,
  'changing it again the same week replaces the pending change');
select is(
  (select count(*)::integer from public.family_rules where family_id = '5f000000-0000-0000-0000-000000000001'),
  2, 'so there are still two rules');
select throws_ok(
  $$ select public.set_family_rules('5f000000-0000-0000-0000-000000000001', 0, 10) $$,
  '22023', 'the goal is 1 to 7 sessions a week', 'a goal of 0 is refused');
select throws_ok(
  $$ select public.set_family_rules('5f000000-0000-0000-0000-000000000001', 3, 61) $$,
  '22023', 'the minimum is 1 to 60 minutes', 'a minimum over 60 is refused');
select throws_ok(
  $$ insert into public.family_rules (family_id, effective_from, goal_per_week, min_minutes)
     values ('5f000000-0000-0000-0000-000000000001', '2030-01-07', 1, 1) $$,
  '42501', null, 'nobody writes family_rules directly');
select throws_ok(
  $$ update public.families set goal_per_week = 1 where id = '5f000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'nobody changes the goal on families directly');

set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.set_family_rules('5f000000-0000-0000-0000-000000000001', 2, 10) $$,
  '42501', 'only the person who started the family can change its rules', 'Maya isn''t the founder, so she can''t');
select is(
  (select count(*)::integer from public.family_rules where family_id = '5f000000-0000-0000-0000-000000000001'),
  2, 'but she can read the rules');

set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000006", "role": "authenticated"}';
select throws_ok(
  $$ select public.set_family_rules('5f000000-0000-0000-0000-000000000001', 2, 10) $$,
  '42501', 'only the person who started the family can change its rules', 'someone in another family can''t either');
select is(
  (select count(*)::integer from public.family_rules where family_id = '5f000000-0000-0000-0000-000000000001'),
  0, 'and can''t read them');

-- Solo session ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select member_id, skipped, session_id is not null
       from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '3 hours', 20, 'traditional',
                               p_temp_c => 85, p_place => '  Home ', p_note => 'Felt great', p_source => 'timer',
                               p_client_id => '5c000000-0000-0000-0000-000000000001') $$,
  $$ values ('5b000000-0000-0000-0000-000000000001'::uuid, false, true) $$,
  'Sam logs a solo session');
select results_eq(
  $$ select shared_id, logged_by, local_date, duration_minutes, sauna_type, temp_c, place, note, source
       from public.sessions where client_id = '5c000000-0000-0000-0000-000000000001' $$,
  $$ values (null::uuid, '5b000000-0000-0000-0000-000000000001'::uuid,
             ((now() - interval '3 hours') at time zone 'Etc/GMT-10')::date, 20::smallint, 'traditional'::text,
             85.0::numeric(4, 1), 'Home'::text, 'Felt great'::text, 'timer'::text) $$,
  'stored solo, dated in Sam''s zone, with the place trimmed');

select results_eq(
  $$ select session_id, member_id, skipped
       from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '3 hours', 20, 'traditional',
                               p_client_id => '5c000000-0000-0000-0000-000000000001') $$,
  $$ select id, member_id, false from public.sessions where client_id = '5c000000-0000-0000-0000-000000000001' $$,
  'a retry with the same client_id returns the same row');
select is(
  (select count(*)::integer from public.sessions where client_id = '5c000000-0000-0000-0000-000000000001'),
  1, 'and logs nothing new');

-- Shared sessions ------------------------------------------------------------------------
-- Sam, Maya and Jo (3 people). Jo is on UTC-10, so her row is dated in her zone.
select results_eq(
  $$ select member_id, skipped
       from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '1 hour', 15, 'wood_fired',
                               p_cold_plunge => true, p_cold_minutes => 3, p_note => 'Lake was cold',
                               p_with => array['5b000000-0000-0000-0000-000000000002',
                                               '5b000000-0000-0000-0000-000000000003']::uuid[],
                               p_client_id => '5c000000-0000-0000-0000-000000000002') $$,
  $$ values ('5b000000-0000-0000-0000-000000000001'::uuid, false),
            ('5b000000-0000-0000-0000-000000000002'::uuid, false),
            ('5b000000-0000-0000-0000-000000000003'::uuid, false) $$,
  'Sam logs a session with Maya and Jo: three rows, anchor first');

reset role;
create temp table s3 on commit drop as
select s.* from public.sessions s where s.client_id = '5c000000-0000-0000-0000-000000000002';
grant select on s3 to authenticated;

select is(
  (select count(*)::integer from s3 where shared_id = (select id from s3 where member_id = '5b000000-0000-0000-0000-000000000001')),
  3, 'all three rows share the anchor''s id, the anchor included');
select results_eq(
  $$ select member_id, logged_by, cold_plunge, cold_minutes, note from s3 order by member_id $$,
  $$ values ('5b000000-0000-0000-0000-000000000001'::uuid, '5b000000-0000-0000-0000-000000000001'::uuid, true, 3::smallint, 'Lake was cold'::text),
            ('5b000000-0000-0000-0000-000000000002'::uuid, '5b000000-0000-0000-0000-000000000001'::uuid, true, 3::smallint, null),
            ('5b000000-0000-0000-0000-000000000003'::uuid, '5b000000-0000-0000-0000-000000000001'::uuid, true, 3::smallint, null) $$,
  'details are copied to everyone; the note stays on the anchor');
select is(
  (select local_date from s3 where member_id = '5b000000-0000-0000-0000-000000000003'),
  ((now() - interval '1 hour') at time zone 'Etc/GMT+10')::date,
  'Jo''s row is dated in her own time zone');

set local role authenticated;
-- Four people is the most.
select results_eq(
  $$ select count(*)::integer
       from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '6 hours', 10, 'steam',
                               p_with => array['5b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000004',
                                               '5b000000-0000-0000-0000-000000000005']::uuid[],
                               p_client_id => '5c000000-0000-0000-0000-000000000003') $$,
  $$ values (4) $$,
  'a session of four is allowed');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '8 hours', 10, 'steam',
       p_with => array['5b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000003',
                       '5b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000005']::uuid[],
       p_client_id => '5c000000-0000-0000-0000-000000000004') $$,
  '22023', 'a session is at most 4 people', 'a fifth person is refused');
select lives_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '10 hours', 10, 'steam',
       p_with => array['5b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000004']::uuid[],
       p_client_id => '5c000000-0000-0000-0000-000000000005') $$,
  'the same person listed twice counts once');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '8 hours', 10, 'steam',
       p_with => array['5b000000-0000-0000-0000-000000000006']::uuid[],
       p_client_id => '5c000000-0000-0000-0000-000000000006') $$,
  '42501', 'everyone in a session must be in your family', 'someone from another family is refused');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '8 hours', 10, 'steam',
       p_with => array['5b000000-0000-0000-0000-000000000001']::uuid[],
       p_client_id => '5c000000-0000-0000-0000-000000000007') $$,
  '22023', null, 'listing yourself in p_with is refused');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '8 hours', 10, 'steam') $$,
  '22023', 'p_client_id is required', 'a session needs a client_id');

-- Duplicates: Maya already has a session 20 minutes from this one.
select results_eq(
  $$ select member_id, skipped, session_id is null
       from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '40 minutes', 20, 'infrared',
                               p_with => array['5b000000-0000-0000-0000-000000000002',
                                               '5b000000-0000-0000-0000-000000000005']::uuid[],
                               p_client_id => '5c000000-0000-0000-0000-000000000008') $$,
  $$ values ('5b000000-0000-0000-0000-000000000001'::uuid, false, false),
            ('5b000000-0000-0000-0000-000000000002'::uuid, true, true),
            ('5b000000-0000-0000-0000-000000000005'::uuid, false, false) $$,
  'Maya already logged one within 30 minutes, so she''s skipped and P5 is added; rows follow p_with''s order');
select results_eq(
  $$ select member_id, skipped
       from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '40 minutes', 20, 'infrared',
                               p_with => array['5b000000-0000-0000-0000-000000000002',
                                               '5b000000-0000-0000-0000-000000000005']::uuid[],
                               p_client_id => '5c000000-0000-0000-0000-000000000008') $$,
  $$ values ('5b000000-0000-0000-0000-000000000001'::uuid, false),
            ('5b000000-0000-0000-0000-000000000002'::uuid, true),
            ('5b000000-0000-0000-0000-000000000005'::uuid, false) $$,
  'a retry of a shared session returns the same people and the same skip');
select is(
  (select count(*)::integer from public.sessions where client_id = '5c000000-0000-0000-0000-000000000008'),
  2, 'and inserts nothing new');

-- Dates ------------------------------------------------------------------------------------
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '3 days', 20, 'traditional',
       p_client_id => '5c000000-0000-0000-0000-000000000009') $$,
  '22023', null, 'a session older than yesterday is refused');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() + interval '2 days', 20, 'traditional',
       p_client_id => '5c000000-0000-0000-0000-000000000010') $$,
  '22023', null, 'a session dated in the future is refused');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '2 hours', 241, 'traditional',
       p_client_id => '5c000000-0000-0000-0000-000000000011') $$,
  '23514', null, 'a session over 240 minutes is refused');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '2 hours', 20, 'hot_tub',
       p_client_id => '5c000000-0000-0000-0000-000000000012') $$,
  '23514', null, 'an unknown sauna type is refused');
select lives_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '12 hours', 5, 'smoke',
       p_client_id => '5c000000-0000-0000-0000-000000000013') $$,
  'a short session is still saved');

-- Row-level security --------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000006", "role": "authenticated"}';
select is((select count(*)::integer from public.sessions where member_id <> '5b000000-0000-0000-0000-000000000006'), 0,
  'family B can''t read family A''s sessions');
select throws_ok(
  $$ select * from public.log_session('5f000000-0000-0000-0000-000000000001', now() - interval '1 hour', 20, 'traditional',
       p_client_id => '5c000000-0000-0000-0000-000000000020') $$,
  '42501', 'not a member of this family', 'family B can''t log a session into family A');
select throws_ok(
  $$ insert into public.sessions (member_id, logged_by, started_at, local_date, duration_minutes, sauna_type, source, client_id)
     values ('5b000000-0000-0000-0000-000000000006', '5b000000-0000-0000-0000-000000000006', now(), current_date, 20,
             'traditional', 'manual', gen_random_uuid()) $$,
  '42501', null, 'nobody inserts into sessions directly');

set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
update public.sessions set note = 'Hijacked' where client_id = '5c000000-0000-0000-0000-000000000001';
select is((select note from public.sessions where client_id = '5c000000-0000-0000-0000-000000000001'), 'Felt great',
  'Maya can''t change Sam''s note');
update public.sessions set note = 'Mine now' where member_id = '5b000000-0000-0000-0000-000000000002'
   and client_id = '5c000000-0000-0000-0000-000000000002';
select is((select x.note from public.sessions x join s3 on s3.id = x.id where s3.member_id = '5b000000-0000-0000-0000-000000000002'), null,
  'Maya can''t put a note on her row of Sam''s shared session');
select throws_ok(
  $$ update public.sessions set duration_minutes = 200 where member_id = '5b000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'nobody changes the minutes directly');
select throws_ok(
  $$ select * from public.update_session((select id from s3 where member_id = '5b000000-0000-0000-0000-000000000002'),
                                         '{"duration_minutes": 30}') $$,
  '42501', 'only the person who logged this session can change it', 'Maya can''t edit the shared session');
select throws_ok(
  $$ select public.delete_session((select id from s3 where member_id = '5b000000-0000-0000-0000-000000000002')) $$,
  '42501', 'only the person who logged this session can delete it', 'Maya can''t delete the shared session');

-- The logger edits ---------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select member_id, duration_minutes, cold_plunge, cold_minutes, temp_c, note
       from public.update_session((select id from s3 where member_id = '5b000000-0000-0000-0000-000000000001'),
                                  '{"duration_minutes": 25, "cold_plunge": false, "temp_c": 90, "note": "Fixed"}')
      order by member_id $$,
  $$ values ('5b000000-0000-0000-0000-000000000001'::uuid, 25::smallint, false, null::smallint, 90.0::numeric(4, 1), 'Fixed'::text),
            ('5b000000-0000-0000-0000-000000000002'::uuid, 25::smallint, false, null::smallint, 90.0::numeric(4, 1), null),
            ('5b000000-0000-0000-0000-000000000003'::uuid, 25::smallint, false, null::smallint, 90.0::numeric(4, 1), null) $$,
  'Sam''s edit changes everyone''s row; the note only the anchor; no plunge clears the plunge minutes');
select results_eq(
  $$ select temp_c from public.update_session((select id from s3 where member_id = '5b000000-0000-0000-0000-000000000001'),
                                              '{"temp_c": null}') where member_id = '5b000000-0000-0000-0000-000000000001' $$,
  $$ values (null::numeric(4, 1)) $$,
  'a JSON null clears an optional field');
select throws_ok(
  $$ select * from public.update_session((select id from s3 where member_id = '5b000000-0000-0000-0000-000000000001'),
                                         '{"member_id": "5b000000-0000-0000-0000-000000000006"}') $$,
  '22023', 'update_session can''t change member_id', 'update_session only takes the listed fields');
select throws_ok(
  $$ select * from public.update_session((select id from s3 where member_id = '5b000000-0000-0000-0000-000000000001'),
                                         '{"started_at": "2020-01-01T10:00:00Z"}') $$,
  '22023', null, 'moving a session out of the date window is refused');
reset role;
alter table public.sessions disable trigger sessions_30_touch_updated_at;
update public.sessions set updated_at = now() - interval '1 day' where client_id = '5c000000-0000-0000-0000-000000000001';
alter table public.sessions enable trigger sessions_30_touch_updated_at;
set local role authenticated;
select lives_ok(
  $$ update public.sessions set note = 'Edited directly' where client_id = '5c000000-0000-0000-0000-000000000001' $$,
  'Sam edits the note on his own solo session directly');
select results_eq(
  $$ select note, updated_at from public.sessions where client_id = '5c000000-0000-0000-0000-000000000001' $$,
  $$ values ('Edited directly'::text, now()) $$,
  'and updated_at moves');

-- Remove me ---------------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000003", "role": "authenticated"}';
delete from public.sessions where client_id = '5c000000-0000-0000-0000-000000000002';
select is(
  (select count(*)::integer from s3 s where exists (select 1 from public.sessions x where x.id = s.id)),
  2, 'Jo removes herself: only her row goes');

set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
delete from public.sessions where id = (select id from s3 where member_id = '5b000000-0000-0000-0000-000000000001');
select is(
  (select count(*)::integer from s3 s where exists (select 1 from public.sessions x where x.id = s.id)),
  2, 'Sam can''t delete the anchor row on its own while others are on it');

-- The last other person leaving makes it a solo session again.
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000005", "role": "authenticated"}';
delete from public.sessions where client_id = '5c000000-0000-0000-0000-000000000008';
reset role;
select is(
  (select shared_id from public.sessions where client_id = '5c000000-0000-0000-0000-000000000008'),
  null, 'when the last other person leaves, the anchor is solo again');

-- The logger deletes the whole session ----------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "5a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is(
  public.delete_session((select id from public.sessions where client_id = '5c000000-0000-0000-0000-000000000003'
                           and member_id = '5b000000-0000-0000-0000-000000000004')),
  4, 'Sam deletes the four-person session, passing anyone''s row id');
select is(
  (select count(*)::integer from public.sessions where client_id = '5c000000-0000-0000-0000-000000000003'),
  0, 'and every row is gone');

-- Removing a member ------------------------------------------------------------------------
-- Sam (the logger of the remaining shared session with Maya) leaves: his rows go,
-- and Maya's row becomes a solo session.
reset role;
delete from public.members where id = '5b000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select shared_id, logged_by from public.sessions where client_id = '5c000000-0000-0000-0000-000000000002' $$,
  $$ values (null::uuid, null::uuid) $$,
  'when the logger is removed, the others'' rows stay as solo sessions');

select * from finish();
rollback;
