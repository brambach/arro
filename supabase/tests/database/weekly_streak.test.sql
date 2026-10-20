-- Weekly streaks (migration 20261021000003): every rule and edge case in the
-- spec's "Weekly streak rules" and "Edge cases", with "now" pinned through
-- p_as_of. Rolled back, like arro.test.sql.
-- Calendar: Mondays are Aug 24, Aug 31, Sep 7, 14, 21, 28, Oct 5, 12 (2026).
-- Most members are on Etc/GMT-10 (UTC+10, no DST).

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(52);

-- Helpers (this transaction only) -------------------------------------------------------
create function pg_temp.fam(p_id uuid, p_name text, p_wso smallint default 1, p_started date default '2026-01-01')
returns void language sql as $$
  insert into public.families (id, name, week_starts_on, saunafam_started_on) values (p_id, p_name, p_wso, p_started);
$$;

create function pg_temp.mem(p_id uuid, p_family uuid, p_name text, p_joined timestamptz, p_tz text default 'Etc/GMT-10')
returns void language sql as $$
  insert into auth.users (id, email, aud, role)
  values (p_id, replace(p_id::text, '-', '') || '@saunafam.test', 'authenticated', 'authenticated');
  insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at)
  values (p_id, p_family, p_id, p_name, '#5F8794', p_tz, p_joined);
$$;

-- A session at noon on the member's own date d.
create function pg_temp.s(p_member uuid, p_day date, p_minutes integer default 20)
returns void language sql as $$
  insert into public.sessions (member_id, logged_by, started_at, duration_minutes, sauna_type, source, client_id)
  select p_member, p_member, (p_day + time '12:00') at time zone m.timezone, p_minutes, 'traditional', 'manual',
         gen_random_uuid()
    from public.members m where m.id = p_member;
$$;

-- Sessions on the given days of the week starting p_week (0 = first day).
create function pg_temp.wk(p_member uuid, p_week date, p_days integer[])
returns void language sql as $$
  select pg_temp.s(p_member, p_week + d) from unnest(p_days) d;
$$;

-- Fixture sessions are older than yesterday, which the date trigger refuses
-- for real clients. It's off while they go in, inside this transaction only.
alter table public.sessions disable trigger sessions_20_check_date;
-- Join pushes and session pushes aren't what this file tests.
delete from private.push_outbox;

-- 1. Basics: kept, frozen, missed, freeze timing, short and same-day sessions ------------
-- Sam and Maya joined Tuesday Aug 25, so Aug 24 is their join week.
select pg_temp.fam('71000000-0000-0000-0000-000000000000', 'Sunday sauna');
select pg_temp.mem('71000000-0000-0000-0000-00000000000a', '71000000-0000-0000-0000-000000000000', 'Sam', '2026-08-25 09:00+10');
select pg_temp.mem('71000000-0000-0000-0000-00000000000b', '71000000-0000-0000-0000-000000000000', 'Maya', '2026-08-25 10:00+10');
-- Maya keeps every week from Aug 31 to Oct 5, and Oct 12 too.
select pg_temp.wk('71000000-0000-0000-0000-00000000000b', g::date, '{0,1,2}')
  from generate_series('2026-08-31'::date, '2026-10-12', interval '7 days') g;
-- Sam: kept Aug 31; 2 sessions Sep 7 (freeze); kept Sep 14; none Sep 21 (W+2,
-- missed); kept Sep 28; none Oct 5 (W+4, freeze again).
select pg_temp.wk('71000000-0000-0000-0000-00000000000a', '2026-08-31', '{0,2,4}');
select pg_temp.wk('71000000-0000-0000-0000-00000000000a', '2026-09-07', '{0,2}');
select pg_temp.wk('71000000-0000-0000-0000-00000000000a', '2026-09-14', '{0,2,4}');
select pg_temp.wk('71000000-0000-0000-0000-00000000000a', '2026-09-28', '{1,3,5}');
-- This week (Oct 12): two on Monday (count once) and a 5-minute one on Tuesday (doesn't count).
select pg_temp.s('71000000-0000-0000-0000-00000000000a', '2026-10-12', 20);
select pg_temp.s('71000000-0000-0000-0000-00000000000a', '2026-10-12', 25);
select pg_temp.s('71000000-0000-0000-0000-00000000000a', '2026-10-13', 5);

select results_eq(
  $$ select week_start, counted_days, status
       from private.member_weeks('71000000-0000-0000-0000-00000000000a', '2026-10-15 20:00+10') $$,
  $$ values ('2026-08-24'::date, 0, 'joined'), ('2026-08-31', 3, 'kept'), ('2026-09-07', 2, 'frozen'),
            ('2026-09-14', 3, 'kept'), ('2026-09-21', 0, 'missed'), ('2026-09-28', 3, 'kept'),
            ('2026-10-05', 0, 'frozen'), ('2026-10-12', 1, 'pending') $$,
  'Sam: join week, kept, freeze, kept, a miss at W+2, kept, the freeze again at W+4, then pending');
select is(
  (select days from private.member_weeks('71000000-0000-0000-0000-00000000000a', '2026-10-15 20:00+10')
    where week_start = '2026-10-12'),
  array['2026-10-12'::date],
  'two sessions on one day count once, and a short session doesn''t count');
select is(
  (select count(*)::integer from public.sessions where member_id = '71000000-0000-0000-0000-00000000000a'
      and local_date = '2026-10-13'),
  1, 'the short session is still saved');
select results_eq(
  $$ select personal_streak, longest_personal_streak, kept_this_week, counted_days, goal, min_minutes,
            freeze_available, freeze_back_on, last_week_status
       from private.member_week_summary('71000000-0000-0000-0000-00000000000a', '2026-10-15 20:00+10') $$,
  $$ values (2, 3, false, 1, 3, 10, false, '2026-11-02'::date, 'frozen') $$,
  'Sam: personal streak 2 (longest 3), 1 of 3 this week, freeze back on Nov 2');
select results_eq(
  $$ select week_start, state, freeze_used
       from private.family_weeks('71000000-0000-0000-0000-000000000000', '2026-10-15 20:00+10') $$,
  $$ values ('2026-08-24'::date, 'skip', false), ('2026-08-31', 'counted', false), ('2026-09-07', 'counted', true),
            ('2026-09-14', 'counted', false), ('2026-09-21', 'broken', false), ('2026-09-28', 'counted', false),
            ('2026-10-05', 'counted', true), ('2026-10-12', 'pending', false) $$,
  'family weeks: a freeze covers Sam, his miss breaks Sep 21, this week is pending');
select results_eq(
  $$ select family_streak, longest_streak, weeks_together_this_year, started_on, latest_week_state
       from private.family_week_summary('71000000-0000-0000-0000-000000000000', '2026-10-15 20:00+10') $$,
  $$ values (2, 3, 5, '2026-08-24'::date, 'pending') $$,
  'family streak 2, longest 3, 5 weeks together this year, started Aug 24');
select results_eq(
  $$ select personal_streak, kept_this_week, counted_days
       from private.member_week_summary('71000000-0000-0000-0000-00000000000b', '2026-10-15 20:00+10') $$,
  $$ values (7, true, 3) $$,
  'Maya kept this week by Thursday: kept can happen mid-week');

-- History: newest first, the caller's own freeze named, everyone else's hidden.
select results_eq(
  $$ select week_start, family_state, freeze_used, member_id, status
       from private.family_week_history('71000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-00000000000a',
                                         3, '2026-10-15 20:00+10') $$,
  $$ values ('2026-10-05'::date, 'counted', true, '71000000-0000-0000-0000-00000000000a'::uuid, 'frozen'),
            ('2026-10-05'::date, 'counted', true, '71000000-0000-0000-0000-00000000000b'::uuid, 'kept'),
            ('2026-09-28'::date, 'counted', false, '71000000-0000-0000-0000-00000000000a'::uuid, 'kept'),
            ('2026-09-28'::date, 'counted', false, '71000000-0000-0000-0000-00000000000b'::uuid, 'kept'),
            ('2026-09-21'::date, 'broken', false, '71000000-0000-0000-0000-00000000000a'::uuid, 'missed'),
            ('2026-09-21'::date, 'broken', false, '71000000-0000-0000-0000-00000000000b'::uuid, 'kept') $$,
  'Sam''s history: 3 past weeks, newest first, his own freeze and miss named');
select results_eq(
  $$ select status from private.family_week_history('71000000-0000-0000-0000-000000000000',
       '71000000-0000-0000-0000-00000000000b', 3, '2026-10-15 20:00+10')
      where member_id = '71000000-0000-0000-0000-00000000000a' $$,
  $$ values ('not_kept'), ('kept'), ('not_kept') $$,
  'Maya''s history never says Sam used a freeze or missed');
select is(
  (select count(distinct week_start)::integer from private.family_week_history('71000000-0000-0000-0000-000000000000',
     '71000000-0000-0000-0000-00000000000a', 100, '2026-10-15 20:00+10')),
  7, 'asking for more weeks than there are stops at the family''s first week');
select is(
  (select days from private.family_week_history('71000000-0000-0000-0000-000000000000',
     '71000000-0000-0000-0000-00000000000a', 100, '2026-10-15 20:00+10')
    where member_id = '71000000-0000-0000-0000-00000000000a' and week_start = '2026-09-07'),
  array['2026-09-07'::date, '2026-09-09'], 'a past week lists the days someone went');

-- 2. Monday morning, yesterday still open: the freeze comes back -------------------------
select pg_temp.fam('72000000-0000-0000-0000-000000000000', 'Monday crew');
select pg_temp.mem('72000000-0000-0000-0000-00000000000a', '72000000-0000-0000-0000-000000000000', 'Sam', '2026-09-01 09:00+10');
select pg_temp.wk('72000000-0000-0000-0000-00000000000a', '2026-09-07', '{0,2,4}');
select pg_temp.wk('72000000-0000-0000-0000-00000000000a', '2026-09-14', '{0,2}');
select results_eq(
  $$ select last_week_status, freeze_available, freeze_back_on
       from private.member_week_summary('72000000-0000-0000-0000-00000000000a', '2026-09-21 08:00+10') $$,
  $$ values ('frozen', false, '2026-10-12'::date) $$,
  'Monday morning: last week ended on 2 of 3, so the freeze is used');
select pg_temp.s('72000000-0000-0000-0000-00000000000a', '2026-09-20');
select results_eq(
  $$ select last_week_status, freeze_available, freeze_back_on
       from private.member_week_summary('72000000-0000-0000-0000-00000000000a', '2026-09-21 08:00+10') $$,
  $$ values ('kept', true, null::date) $$,
  'logging Sunday''s session flips last week to kept and gives the freeze back');

-- 3. Solo founder ----------------------------------------------------------------------
select pg_temp.fam('73000000-0000-0000-0000-000000000000', 'Just me');
select pg_temp.mem('73000000-0000-0000-0000-00000000000a', '73000000-0000-0000-0000-000000000000', 'Sam', '2026-09-01 09:00+10');
select pg_temp.wk('73000000-0000-0000-0000-00000000000a', '2026-09-07', '{0,2,4}');
select results_eq(
  $$ select family_streak, longest_streak, weeks_together_this_year, started_on, latest_week_state
       from private.family_week_summary('73000000-0000-0000-0000-000000000000', '2026-09-15 08:00+10') $$,
  $$ values (0, 0, 0, null::date, null::text) $$,
  'a solo founder has no family streak yet');
select is(
  (select personal_streak from private.member_week_summary('73000000-0000-0000-0000-00000000000a', '2026-09-15 08:00+10')),
  1, 'but their own weeks run normally');

-- 4. Joins on a Thursday ---------------------------------------------------------------
select pg_temp.fam('74000000-0000-0000-0000-000000000000', 'Thursday crew');
select pg_temp.mem('74000000-0000-0000-0000-00000000000a', '74000000-0000-0000-0000-000000000000', 'Sam', '2026-08-25 09:00+10');
select pg_temp.mem('74000000-0000-0000-0000-00000000000b', '74000000-0000-0000-0000-000000000000', 'Maya', '2026-08-25 10:00+10');
select pg_temp.mem('74000000-0000-0000-0000-00000000000c', '74000000-0000-0000-0000-000000000000', 'Jo', '2026-09-10 09:00+10');
select pg_temp.wk(m, g::date, '{0,2,4}')
  from unnest(array['74000000-0000-0000-0000-00000000000a', '74000000-0000-0000-0000-00000000000b']::uuid[]) m,
       generate_series('2026-08-31'::date, '2026-09-14', interval '7 days') g;
select is(
  (select status from private.member_weeks('74000000-0000-0000-0000-00000000000c', '2026-09-22 08:00+10')
    where week_start = '2026-09-07'),
  'joined', 'Jo joined on Thursday Sep 10 and didn''t keep that week: joined, not missed');
select is(
  (select state from private.family_weeks('74000000-0000-0000-0000-000000000000', '2026-09-22 08:00+10')
    where week_start = '2026-09-07'),
  'counted', 'the family week only expected Sam and Maya');
select results_eq(
  $$ select status from private.member_weeks('74000000-0000-0000-0000-00000000000c', '2026-09-22 08:00+10')
      where week_start = '2026-09-14' $$,
  $$ values ('frozen') $$,
  'from the next week Jo is expected (her freeze covers it)');

-- 5. Time zones: Tokyo has finished the week, Los Angeles is still on Sunday --------------
select pg_temp.fam('75000000-0000-0000-0000-000000000000', 'Two coasts');
select pg_temp.mem('75000000-0000-0000-0000-00000000000a', '75000000-0000-0000-0000-000000000000', 'Sam', '2026-09-01 09:00+09', 'Asia/Tokyo');
select pg_temp.mem('75000000-0000-0000-0000-00000000000b', '75000000-0000-0000-0000-000000000000', 'Maya', '2026-09-01 09:00-07', 'America/Los_Angeles');
select pg_temp.wk('75000000-0000-0000-0000-00000000000a', '2026-09-07', '{0,2,4}');
select pg_temp.wk('75000000-0000-0000-0000-00000000000b', '2026-09-07', '{0,2}');
-- 2026-09-14 03:00 UTC: Monday noon in Tokyo, Sunday 20:00 in Los Angeles.
select results_eq(
  $$ select week_start, state from private.family_weeks('75000000-0000-0000-0000-000000000000', '2026-09-14 03:00+00')
      where week_start >= '2026-09-07' $$,
  $$ values ('2026-09-07'::date, 'pending'), ('2026-09-14', 'pending') $$,
  'Tokyo is in a new week but Los Angeles is still on Sunday, so the week stays pending');
select is(
  (select state from private.family_weeks('75000000-0000-0000-0000-000000000000', '2026-09-14 15:00+00')
    where week_start = '2026-09-07'),
  'counted', 'once Los Angeles''s Sunday ends, the week is settled (Maya''s freeze covers it)');

-- 6. Breaks: 3 days doesn't pause, 4 does, 7 from Wednesday pauses only the first week ------
select pg_temp.fam('76000000-0000-0000-0000-000000000000', 'Break crew');
select pg_temp.mem('76000000-0000-0000-0000-00000000000a', '76000000-0000-0000-0000-000000000000', 'Sam', '2026-08-25 09:00+10');
select pg_temp.mem('76000000-0000-0000-0000-00000000000b', '76000000-0000-0000-0000-000000000000', 'Maya', '2026-08-25 10:00+10');
insert into public.pauses (member_id, starts_on, ends_on) values
  ('76000000-0000-0000-0000-00000000000a', '2026-09-08', '2026-09-10'),
  ('76000000-0000-0000-0000-00000000000a', '2026-09-24', '2026-09-27'),
  ('76000000-0000-0000-0000-00000000000b', '2026-09-16', '2026-09-22');
select pg_temp.wk(m, '2026-08-31', '{0,2,4}')
  from unnest(array['76000000-0000-0000-0000-00000000000a', '76000000-0000-0000-0000-00000000000b']::uuid[]) m;
select pg_temp.s('76000000-0000-0000-0000-00000000000a', '2026-09-07');
select pg_temp.wk('76000000-0000-0000-0000-00000000000b', '2026-09-07', '{0,2,4}');
select pg_temp.wk('76000000-0000-0000-0000-00000000000a', '2026-09-14', '{0,2,4}');
select results_eq(
  $$ select week_start, paused_days, status
       from private.member_weeks('76000000-0000-0000-0000-00000000000a', '2026-09-29 08:00+10')
      where week_start between '2026-09-07' and '2026-09-21' $$,
  $$ values ('2026-09-07'::date, 3, 'frozen'), ('2026-09-14', 0, 'kept'), ('2026-09-21', 4, 'paused') $$,
  'Sam: a 3-day break doesn''t pause the week (his freeze is used); a 4-day break does');
select results_eq(
  $$ select week_start, paused_days, status
       from private.member_weeks('76000000-0000-0000-0000-00000000000b', '2026-09-29 08:00+10')
      where week_start between '2026-09-14' and '2026-09-21' $$,
  $$ values ('2026-09-14'::date, 5, 'paused'), ('2026-09-21', 2, 'frozen') $$,
  'Maya: a 7-day break from Wednesday pauses that week (5 days) but not the next (2 days)');
select results_eq(
  $$ select week_start, state from private.family_weeks('76000000-0000-0000-0000-000000000000', '2026-09-29 08:00+10')
      where week_start between '2026-09-07' and '2026-09-21' $$,
  $$ values ('2026-09-07'::date, 'counted'), ('2026-09-14', 'counted'), ('2026-09-21', 'counted') $$,
  'a paused member isn''t expected, so the others carry the week');
select results_eq(
  $$ select personal_streak, freeze_available
       from private.member_week_summary('76000000-0000-0000-0000-00000000000a', '2026-09-29 08:00+10') $$,
  $$ values (3, false) $$,
  'a paused week holds Sam''s streak without growing it, and uses no freeze');
select results_eq(
  $$ select paused_until from private.member_week_summary('76000000-0000-0000-0000-00000000000b', '2026-09-18 08:00+10') $$,
  $$ values ('2026-09-22'::date) $$,
  'paused_until is the last day of the break she''s on');

-- 7. Everyone on a break: skip, and the streak holds -----------------------------------------
select pg_temp.fam('77000000-0000-0000-0000-000000000000', 'Holiday crew');
select pg_temp.mem('77000000-0000-0000-0000-00000000000a', '77000000-0000-0000-0000-000000000000', 'Sam', '2026-09-01 09:00+10');
select pg_temp.mem('77000000-0000-0000-0000-00000000000b', '77000000-0000-0000-0000-000000000000', 'Maya', '2026-09-01 10:00+10');
insert into public.pauses (member_id, starts_on, ends_on) values
  ('77000000-0000-0000-0000-00000000000a', '2026-09-14', '2026-09-20'),
  ('77000000-0000-0000-0000-00000000000b', '2026-09-14', '2026-09-20');
select pg_temp.wk(m, g::date, '{0,2,4}')
  from unnest(array['77000000-0000-0000-0000-00000000000a', '77000000-0000-0000-0000-00000000000b']::uuid[]) m,
       unnest(array['2026-09-07', '2026-09-21']::date[]) g;
select results_eq(
  $$ select week_start, state from private.family_weeks('77000000-0000-0000-0000-000000000000', '2026-09-29 08:00+10') $$,
  $$ values ('2026-08-31'::date, 'skip'), ('2026-09-07', 'counted'), ('2026-09-14', 'skip'),
            ('2026-09-21', 'counted'), ('2026-09-28', 'pending') $$,
  'everyone on a break: the week is skip');
select is(
  (select family_streak from private.family_week_summary('77000000-0000-0000-0000-000000000000', '2026-09-29 08:00+10')),
  2, 'a skip week neither counts nor breaks the streak');

-- 8. Goal change mid-week ----------------------------------------------------------------
select pg_temp.fam('78000000-0000-0000-0000-000000000000', 'Rule crew');
select pg_temp.mem('78000000-0000-0000-0000-00000000000a', '78000000-0000-0000-0000-000000000000', 'Sam', '2026-08-25 09:00+10');
-- On Wednesday Sep 16 the goal went from 3 to 2; set_family_rules writes it for next Monday.
insert into public.family_rules (family_id, effective_from, goal_per_week, min_minutes)
values ('78000000-0000-0000-0000-000000000000', '2026-09-21', 2, 10);
select pg_temp.wk('78000000-0000-0000-0000-00000000000a', g::date, '{0,2,4}')
  from unnest(array['2026-08-31', '2026-09-07']::date[]) g;
select pg_temp.wk('78000000-0000-0000-0000-00000000000a', '2026-09-14', '{0,2}');
select pg_temp.wk('78000000-0000-0000-0000-00000000000a', '2026-09-21', '{0,2}');
select results_eq(
  $$ select week_start, goal, status from private.member_weeks('78000000-0000-0000-0000-00000000000a', '2026-09-29 08:00+10')
      where week_start between '2026-09-14' and '2026-09-21' $$,
  $$ values ('2026-09-14'::date, 3, 'frozen'), ('2026-09-21', 2, 'kept') $$,
  'the week of the change still needs 3; the next needs 2');
select results_eq(
  $$ select goal_per_week, min_minutes from private.rule_for_week('78000000-0000-0000-0000-000000000000', '2026-09-14') $$,
  $$ values (3, 10) $$,
  'past weeks keep the rule that was in effect then');
-- A higher minimum from Sep 28: a 15-minute session no longer counts.
insert into public.family_rules (family_id, effective_from, goal_per_week, min_minutes)
values ('78000000-0000-0000-0000-000000000000', '2026-09-28', 2, 20);
select pg_temp.s('78000000-0000-0000-0000-00000000000a', '2026-09-28', 15);
select pg_temp.s('78000000-0000-0000-0000-00000000000a', '2026-09-22', 15);
select results_eq(
  $$ select week_start, counted_days from private.member_weeks('78000000-0000-0000-0000-00000000000a', '2026-09-29 08:00+10')
      where week_start >= '2026-09-21' $$,
  $$ values ('2026-09-21'::date, 3), ('2026-09-28', 0) $$,
  'the minimum is the one in force that week');

-- 9. Shared session: a participant removes themselves -------------------------------------
select pg_temp.fam('79000000-0000-0000-0000-000000000000', 'Shared crew');
select pg_temp.mem('79000000-0000-0000-0000-00000000000a', '79000000-0000-0000-0000-000000000000', 'Sam', '2026-09-01 09:00+10');
select pg_temp.mem('79000000-0000-0000-0000-00000000000b', '79000000-0000-0000-0000-000000000000', 'Maya', '2026-09-01 10:00+10');
insert into public.sessions (id, member_id, shared_id, logged_by, started_at, duration_minutes, sauna_type, source, client_id)
select a.id, a.member_id, a.anchor, '79000000-0000-0000-0000-00000000000a',
       (d + time '18:00') at time zone 'Etc/GMT-10', 20, 'traditional', 'manual', a.anchor
  from unnest(array['2026-09-07', '2026-09-09', '2026-09-11']::date[]) with ordinality as x (d, n),
       lateral (values
         (('79a00000-0000-0000-0000-00000000000' || x.n)::uuid, '79000000-0000-0000-0000-00000000000a'::uuid,
          ('79a00000-0000-0000-0000-00000000000' || x.n)::uuid),
         (('79b00000-0000-0000-0000-00000000000' || x.n)::uuid, '79000000-0000-0000-0000-00000000000b'::uuid,
          ('79a00000-0000-0000-0000-00000000000' || x.n)::uuid)
       ) as a (id, member_id, anchor);
select results_eq(
  $$ select m, status from unnest(array['79000000-0000-0000-0000-00000000000a', '79000000-0000-0000-0000-00000000000b']::uuid[]) m,
            private.member_weeks(m, '2026-09-15 08:00+10') w where w.week_start = '2026-09-07' $$,
  $$ values ('79000000-0000-0000-0000-00000000000a'::uuid, 'kept'), ('79000000-0000-0000-0000-00000000000b'::uuid, 'kept') $$,
  'three shared sessions count for both people');
delete from public.sessions where id = '79b00000-0000-0000-0000-000000000003';
select results_eq(
  $$ select m, counted_days, status from unnest(array['79000000-0000-0000-0000-00000000000a', '79000000-0000-0000-0000-00000000000b']::uuid[]) m,
            private.member_weeks(m, '2026-09-15 08:00+10') w where w.week_start = '2026-09-07' $$,
  $$ values ('79000000-0000-0000-0000-00000000000a'::uuid, 3, 'kept'), ('79000000-0000-0000-0000-00000000000b'::uuid, 2, 'frozen') $$,
  'Maya removes herself from one: only her week changes');

-- 10. Removing a member recomputes past weeks -----------------------------------------------
select pg_temp.fam('7a000000-0000-0000-0000-000000000000', 'Three crew');
select pg_temp.mem('7a000000-0000-0000-0000-00000000000a', '7a000000-0000-0000-0000-000000000000', 'Sam', '2026-09-01 09:00+10');
select pg_temp.mem('7a000000-0000-0000-0000-00000000000b', '7a000000-0000-0000-0000-000000000000', 'Maya', '2026-09-01 10:00+10');
select pg_temp.mem('7a000000-0000-0000-0000-00000000000c', '7a000000-0000-0000-0000-000000000000', 'Jo', '2026-09-01 11:00+10');
select pg_temp.wk(m, g::date, '{0,2,4}')
  from unnest(array['7a000000-0000-0000-0000-00000000000a', '7a000000-0000-0000-0000-00000000000b']::uuid[]) m,
       unnest(array['2026-09-07', '2026-09-14']::date[]) g;
select results_eq(
  $$ select family_streak, longest_streak, latest_week_state
       from private.family_week_summary('7a000000-0000-0000-0000-000000000000', '2026-09-22 08:00+10') $$,
  $$ values (0, 1, 'pending') $$,
  'Jo''s second missed week broke the streak');
delete from public.members where id = '7a000000-0000-0000-0000-00000000000c';
select results_eq(
  $$ select family_streak, longest_streak
       from private.family_week_summary('7a000000-0000-0000-0000-000000000000', '2026-09-22 08:00+10') $$,
  $$ values (2, 2) $$,
  'once Jo is removed, the broken week counts');

-- 11. A family whose week starts on Sunday ---------------------------------------------------
select pg_temp.fam('7b000000-0000-0000-0000-000000000000', 'Sunday start', 7::smallint);
select pg_temp.mem('7b000000-0000-0000-0000-00000000000a', '7b000000-0000-0000-0000-000000000000', 'Sam', '2026-09-02 09:00+10');
-- Sun Sep 6, Tue Sep 8, Sat Sep 12, then Sun Sep 13.
select pg_temp.wk('7b000000-0000-0000-0000-00000000000a', '2026-09-06', '{0,2,6,7}');
select results_eq(
  $$ select week_start, counted_days, status
       from private.member_weeks('7b000000-0000-0000-0000-00000000000a', '2026-09-14 08:00+10') $$,
  $$ values ('2026-08-30'::date, 0, 'joined'), ('2026-09-06', 3, 'kept'), ('2026-09-13', 1, 'pending') $$,
  'Sunday weeks run Sunday to Saturday');
select is(
  (select effective_from from public.family_rules where family_id = '7b000000-0000-0000-0000-000000000000'),
  '2000-01-02'::date, 'a Sunday family''s first rule starts on a Sunday');

-- 12. The build 9 reset line ------------------------------------------------------------------
-- Sam and Maya joined in July; Saunafam started Wednesday Sep 9.
select pg_temp.fam('7c000000-0000-0000-0000-000000000000', 'Old crew', 1::smallint, '2026-09-09');
select pg_temp.mem('7c000000-0000-0000-0000-00000000000a', '7c000000-0000-0000-0000-000000000000', 'Sam', '2026-07-01 09:00+10');
select pg_temp.mem('7c000000-0000-0000-0000-00000000000b', '7c000000-0000-0000-0000-000000000000', 'Maya', '2026-07-01 10:00+10');
-- Sam has sessions before the line (Sep 1, Sep 7, Sep 8) and two after it.
select pg_temp.s('7c000000-0000-0000-0000-00000000000a', d)
  from unnest(array['2026-09-01', '2026-09-07', '2026-09-08', '2026-09-10', '2026-09-12']::date[]) d;
select results_eq(
  $$ select week_start, counted_days, status
       from private.member_weeks('7c000000-0000-0000-0000-00000000000a', '2026-09-15 08:00+10') $$,
  $$ values ('2026-09-07'::date, 2, 'joined'), ('2026-09-14', 0, 'pending') $$,
  'nothing before saunafam_started_on counts, and its week is week one, like a join week');
select results_eq(
  $$ select family_streak, started_on, latest_week_state
       from private.family_week_summary('7c000000-0000-0000-0000-000000000000', '2026-09-15 08:00+10') $$,
  $$ values (0, '2026-09-07'::date, 'pending') $$,
  'the family starts at zero from the reset week');
select is(
  (select state from private.family_weeks('7c000000-0000-0000-0000-000000000000', '2026-09-15 08:00+10')
    where week_start = '2026-09-07'),
  'skip', 'week one neither counts nor breaks unless someone keeps it');

-- 13. Public wrappers ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "71000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is((select count(*)::integer from public.family_week_streak('71000000-0000-0000-0000-000000000000')), 1,
  'a member reads their family''s week streak');
select results_eq(
  $$ select member_id from public.member_week_streaks('71000000-0000-0000-0000-000000000000') $$,
  $$ values ('71000000-0000-0000-0000-00000000000a'::uuid), ('71000000-0000-0000-0000-00000000000b'::uuid) $$,
  'member_week_streaks lists the family in join order');
select is((select count(distinct week_start)::integer from public.family_week_history('71000000-0000-0000-0000-000000000000', 2)), 2,
  'family_week_history returns the weeks asked for');
select throws_ok($$ select * from public.family_week_streak('72000000-0000-0000-0000-000000000000') $$,
  '42501', 'not a member of this family', 'another family''s streak is refused');
select throws_ok($$ select * from public.member_week_streaks('72000000-0000-0000-0000-000000000000') $$,
  '42501', 'not a member of this family', 'and its members'' streaks');
select throws_ok($$ select * from public.family_week_history('72000000-0000-0000-0000-000000000000') $$,
  '42501', 'not a member of this family', 'and its history');
select throws_ok($$ select * from private.member_weeks('71000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'the private functions aren''t callable by clients');
select results_eq(
  $$ select sessions_this_month >= 0, minutes_this_year >= 0, favorite_sauna_type
       from public.my_session_stats('71000000-0000-0000-0000-000000000000') $$,
  $$ values (true, true, 'traditional'::text) $$,
  'my_session_stats answers for the caller');
reset role;
insert into public.invites (code, family_id, invited_by)
values ('WEEKLY42', '71000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-00000000000a');
set local role authenticated;
set local request.jwt.claims = '{"sub": "72000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select family_name, week_streak is not null, goal_per_week, min_minutes from public.preview_invite('weekly42') $$,
  $$ values ('Sunday sauna'::text, true, 3, 10) $$,
  'preview_invite shows a signed-in invitee the weekly streak and the family''s rhythm');
reset role;

-- 14. Twelve members, 52 weeks: under 200 ms -----------------------------------------------------
select pg_temp.fam('7d000000-0000-0000-0000-000000000000', 'Big crew', 1::smallint, '2025-01-01');
select pg_temp.mem(('7d000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
                   '7d000000-0000-0000-0000-000000000000', 'P' || n, '2025-10-01 09:00+10'::timestamptz + n * interval '1 minute')
  from generate_series(1, 12) n;
insert into public.sessions (member_id, logged_by, started_at, duration_minutes, sauna_type, source, client_id)
select m.id, m.id, ((g::date + d) + time '18:00') at time zone 'Etc/GMT-10', 20, 'traditional', 'manual', gen_random_uuid()
  from public.members m,
       generate_series('2025-10-06'::date, '2026-09-28', interval '7 days') g,
       unnest(array[0, 2, 4]) d
 where m.family_id = '7d000000-0000-0000-0000-000000000000';
select is((select count(*)::integer from public.sessions s join public.members m on m.id = s.member_id
            where m.family_id = '7d000000-0000-0000-0000-000000000000'), 12 * 52 * 3, '12 members with 52 weeks of sessions');

create temp table timing (what text, took interval) on commit drop;
do $$
declare t0 timestamptz;
begin
  t0 := clock_timestamp();
  perform * from private.family_week_summary('7d000000-0000-0000-0000-000000000000', '2026-10-01 08:00+10');
  insert into timing values ('family', clock_timestamp() - t0);
  t0 := clock_timestamp();
  perform s.* from public.members m
    cross join lateral private.member_week_summary(m.id, '2026-10-01 08:00+10') s
   where m.family_id = '7d000000-0000-0000-0000-000000000000';
  insert into timing values ('members', clock_timestamp() - t0);
end;
$$;
select is(
  (select family_streak from private.family_week_summary('7d000000-0000-0000-0000-000000000000', '2026-10-01 08:00+10')),
  52, 'every member kept every week, so the family streak is 52');
select ok((select took from timing where what = 'family') < interval '200 milliseconds',
  'family_week_summary for 12 members and 52 weeks runs in under 200 ms: '
  || (select took::text from timing where what = 'family'));
select ok((select took from timing where what = 'members') < interval '200 milliseconds',
  'all 12 member summaries run in under 200 ms: ' || (select took::text from timing where what = 'members'));

select * from finish();
rollback;
