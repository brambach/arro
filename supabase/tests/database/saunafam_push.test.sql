-- Saunafam pushes, cheers and comments (migrations 20261021000004 and
-- 20261021000005). Rolled back, like arro.test.sql. Each push's recipients,
-- quiet hours, caps and exact copy; design/copy/notifications.md lists the same
-- strings. Quiet hours follow the real now(), so members get fixed-offset zones
-- that are at midday ("awake") or 03:00 ("asleep") right now. The weekend push
-- and the nudge cap take a pinned time.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(59);

create temp table zones on commit drop as
with offsets as (
  select ((12 - extract(hour from now() at time zone 'UTC')::integer + 36) % 24) - 12 as awake,
         ((3 - extract(hour from now() at time zone 'UTC')::integer + 36) % 24) - 12 as asleep
)
select case when awake = 0 then 'UTC' else format('Etc/GMT%s%s', case when awake > 0 then '-' else '+' end, abs(awake)) end as awake,
       case when asleep = 0 then 'UTC' else format('Etc/GMT%s%s', case when asleep > 0 then '-' else '+' end, abs(asleep)) end as asleep
  from offsets;

insert into auth.users (id, email, aud, role)
select ('8a000000-0000-0000-0000-00000000000' || n)::uuid, 'p' || n || '@saunafam.test', 'authenticated', 'authenticated'
  from generate_series(1, 6) n;

insert into public.families (id, name) values
  ('8f000000-0000-0000-0000-000000000001', 'Sunday sauna'),
  ('8f000000-0000-0000-0000-000000000002', 'Other family');

-- Sam, Maya and Jo are awake; P4 is asleep; Out (another family) is awake.
-- P5 is in Sunday sauna, awake, for the comment limit.
insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at)
select ('8b000000-0000-0000-0000-00000000000' || v.n)::uuid, v.family_id::uuid,
       ('8a000000-0000-0000-0000-00000000000' || v.n)::uuid, v.name, '#5F8794',
       case v.zone when 'awake' then z.awake else z.asleep end,
       now() - (10 - v.n) * interval '1 day'
  from zones z,
       (values
         (1, '8f000000-0000-0000-0000-000000000001', 'Sam', 'awake'),
         (2, '8f000000-0000-0000-0000-000000000001', 'Maya', 'awake'),
         (3, '8f000000-0000-0000-0000-000000000001', 'Jo', 'awake'),
         (4, '8f000000-0000-0000-0000-000000000001', 'P4', 'asleep'),
         (5, '8f000000-0000-0000-0000-000000000002', 'Out', 'awake'),
         (6, '8f000000-0000-0000-0000-000000000001', 'P5', 'awake')
       ) as v(n, family_id, name, zone);

-- Join pushes aren't what this file tests.
delete from private.push_outbox;

-- Arro's pushes are off --------------------------------------------------------------------
insert into public.workouts (member_id, local_date, type, source)
select '8b000000-0000-0000-0000-000000000002', (now() at time zone awake)::date, 'run', 'manual' from zones;
select is((select count(*)::integer from private.push_outbox), 0, 'a build 8 workout no longer pushes "went for a run"');
select is((select count(*)::integer from cron.job where jobname = 'arro-evening-nudge'), 0,
  'the arro-evening-nudge schedule is gone');
select is((select schedule from cron.job where jobname = 'saunafam-weekend'), '*/15 * * * *',
  'saunafam-weekend runs every 15 minutes');
delete from public.workouts;

-- session -------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ select * from public.log_session('8f000000-0000-0000-0000-000000000001', now() - interval '20 minutes', 20,
                                      'traditional', p_client_id => '8c000000-0000-0000-0000-000000000001') $$,
  'Sam logs a session');
reset role;
select results_eq(
  $$ select user_id, title, body, data->>'kind', data->>'memberId', local_date
       from private.push_outbox where kind = 'session' order by user_id $$,
  $$ select u::uuid, 'Sam had a sauna'::text, 'Send a cheer.'::text, 'session'::text,
            '8b000000-0000-0000-0000-000000000001'::text, ((now() - interval '20 minutes') at time zone z.awake)::date
       from zones z, unnest(array['8a000000-0000-0000-0000-000000000002', '8a000000-0000-0000-0000-000000000003',
                                  '8a000000-0000-0000-0000-000000000006']) u order by 1 $$,
  'Sam''s session tells Maya, Jo and P5: not Sam, not P4 who''s asleep, not another family');
select is(
  (select data->>'sessionId' from private.push_outbox where kind = 'session' limit 1),
  (select id::text from public.sessions where client_id = '8c000000-0000-0000-0000-000000000001'),
  'the tap opens the session');

set local role authenticated;
select lives_ok(
  $$ select * from public.log_session('8f000000-0000-0000-0000-000000000001', now() - interval '2 hours', 30,
                                      'infrared', p_client_id => '8c000000-0000-0000-0000-000000000002') $$,
  'Sam logs a second session today');
reset role;
select is((select count(*)::integer from private.push_outbox where kind = 'session'), 3,
  'only the first session of the day pushes');

set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select lives_ok(
  $$ select * from public.log_session('8f000000-0000-0000-0000-000000000001', now() - interval '3 hours', 5,
                                      'steam', p_client_id => '8c000000-0000-0000-0000-000000000003') $$,
  'Maya logs a 5-minute session');
reset role;
select is((select count(*)::integer from private.push_outbox where data->>'memberId' = '8b000000-0000-0000-0000-000000000002'), 0,
  'a session under the family minimum doesn''t push');

set local role authenticated;
select lives_ok(
  $$ select * from public.log_session('8f000000-0000-0000-0000-000000000001', now() - interval '20 hours', 20,
                                      'steam', p_client_id => '8c000000-0000-0000-0000-000000000004') $$,
  'Maya logs yesterday''s session');
reset role;
select is((select count(*)::integer from private.push_outbox where data->>'memberId' = '8b000000-0000-0000-0000-000000000002'), 0,
  'a session logged for yesterday doesn''t push');

-- shared and a shared session ------------------------------------------------------------------
delete from private.push_outbox;
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select lives_ok(
  $$ select * from public.log_session('8f000000-0000-0000-0000-000000000001', now() - interval '45 minutes', 25,
       'wood_fired', p_with => array['8b000000-0000-0000-0000-000000000004', '8b000000-0000-0000-0000-000000000002']::uuid[],
       p_client_id => '8c000000-0000-0000-0000-000000000005') $$,
  'Jo logs a session with P4 and Maya');
reset role;
create temp table jo on commit drop as
select id from public.sessions where client_id = '8c000000-0000-0000-0000-000000000005' and member_id = '8b000000-0000-0000-0000-000000000003';
grant select on jo to authenticated;

select results_eq(
  $$ select user_id, title, body, data->>'sessionId', data->>'memberId' from private.push_outbox where kind = 'shared' $$,
  $$ select '8a000000-0000-0000-0000-000000000002'::uuid, 'Jo logged a sauna with you'::text,
            'It counts toward your week.'::text, (select id::text from jo), '8b000000-0000-0000-0000-000000000003'::text $$,
  'Maya hears Jo logged a sauna with her; P4 is asleep');
select results_eq(
  $$ select user_id, title, body from private.push_outbox where kind = 'session' order by user_id $$,
  $$ values ('8a000000-0000-0000-0000-000000000001'::uuid, 'Jo, Maya and P4 had a sauna together'::text, 'Send a cheer.'::text),
            ('8a000000-0000-0000-0000-000000000006'::uuid, 'Jo, Maya and P4 had a sauna together'::text, 'Send a cheer.'::text) $$,
  'the rest of the family hears it as one session: the logger first, then join order');

-- A short shared session: "It counts toward your week" would be wrong.
delete from private.push_outbox;
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ select * from public.log_session('8f000000-0000-0000-0000-000000000001', now() - interval '6 hours', 5,
       'smoke', p_with => array['8b000000-0000-0000-0000-000000000006']::uuid[],
       p_client_id => '8c000000-0000-0000-0000-000000000006') $$,
  'Sam logs a 5-minute session with P5');
reset role;
select results_eq(
  $$ select user_id, kind, title, body from private.push_outbox $$,
  $$ values ('8a000000-0000-0000-0000-000000000006'::uuid, 'shared'::text, 'Sam logged a sauna with you'::text, 'Tap to see it.'::text) $$,
  'P5 still hears she was added, without the claim that it counts');

-- Cheers -----------------------------------------------------------------------------------------
delete from private.push_outbox;
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.session_cheers (session_id, member_id) select id, '8b000000-0000-0000-0000-000000000002' from jo $$,
  'Maya cheers the session she was in');
select lives_ok(
  $$ delete from public.session_cheers where member_id = '8b000000-0000-0000-0000-000000000002' $$,
  'takes it back');
select lives_ok(
  $$ insert into public.session_cheers (session_id, member_id) select id, '8b000000-0000-0000-0000-000000000002' from jo $$,
  'and cheers again');
select throws_ok(
  $$ insert into public.session_cheers (session_id, member_id)
     select id, '8b000000-0000-0000-0000-000000000002' from public.sessions
      where client_id = '8c000000-0000-0000-0000-000000000005' and member_id = '8b000000-0000-0000-0000-000000000002' $$,
  '22023', 'cheers and comments go on the shared session''s anchor row',
  'nobody can cheer a shared row that isn''t the anchor');
select throws_ok(
  $$ insert into public.session_cheers (session_id, member_id) select id, '8b000000-0000-0000-0000-000000000003' from jo $$,
  '42501', null, 'Maya can''t cheer as Jo');
select throws_ok(
  $$ insert into public.session_cheers (session_id, member_id) select id, '8b000000-0000-0000-0000-000000000002' from jo $$,
  '23505', null, 'one cheer per person per session');
reset role;
select results_eq(
  $$ select user_id, title, body, data->>'sessionId', data->>'cheererId' from private.push_outbox where kind = 'session_cheer' $$,
  $$ select '8a000000-0000-0000-0000-000000000003'::uuid, 'Maya cheered you on'::text, 'For your sauna.'::text,
            (select id::text from jo), '8b000000-0000-0000-0000-000000000002'::text $$,
  'Jo hears about Maya''s cheer once; not Maya herself, not P4 who''s asleep');

set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000005", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.session_cheers (session_id, member_id) select id, '8b000000-0000-0000-0000-000000000005' from jo $$,
  '42501', null, 'someone in another family can''t cheer');
select is((select count(*)::integer from public.session_cheers), 0, 'or see the cheers');

-- Comments ---------------------------------------------------------------------------------------
reset role;
delete from private.push_outbox;
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.session_comments (session_id, member_id, body) select id, '8b000000-0000-0000-0000-000000000001', ' Nice heat ' from jo $$,
  'Sam comments on Jo''s shared session');
reset role;
select results_eq(
  $$ select user_id, title, body, data->>'kind', data->>'sessionId' from private.push_outbox where kind = 'session_comment' order by user_id $$,
  $$ select u::uuid, 'Sam on your sauna'::text, 'Nice heat'::text, 'session_comment'::text, (select id::text from jo)
       from unnest(array['8a000000-0000-0000-0000-000000000002', '8a000000-0000-0000-0000-000000000003']) u order by 1 $$,
  'everyone in the session hears it but P4, who''s asleep');
select is(
  (select data->>'commentId' from private.push_outbox where kind = 'session_comment' limit 1),
  (select id::text from public.session_comments), 'the push carries the comment id');

set local role authenticated;
select throws_ok(
  $$ insert into public.session_comments (session_id, member_id, body) select id, '8b000000-0000-0000-0000-000000000001', repeat('a', 201) from jo $$,
  '23514', null, 'a comment over 200 characters is refused');
select throws_ok(
  $$ insert into public.session_comments (session_id, member_id, body) select id, '8b000000-0000-0000-0000-000000000001', '   ' from jo $$,
  '23514', null, 'a blank comment is refused');
select throws_ok(
  $$ insert into public.session_comments (session_id, member_id, body)
     select id, '8b000000-0000-0000-0000-000000000001', 'Hi' from public.sessions
      where client_id = '8c000000-0000-0000-0000-000000000005' and member_id = '8b000000-0000-0000-0000-000000000002' $$,
  '22023', null, 'comments only go on the anchor');

-- Delete rules: Maya (in the session, didn't log it) can't remove Sam's comment; Jo (the logger) can.
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000002", "role": "authenticated"}';
delete from public.session_comments;
select is((select count(*)::integer from public.session_comments), 1, 'Maya can''t delete Sam''s comment');
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000003", "role": "authenticated"}';
delete from public.session_comments;
select is((select count(*)::integer from public.session_comments), 0, 'Jo, who logged the session, can');

-- 20 a day.
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000006", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.session_comments (session_id, member_id, body)
     select jo.id, '8b000000-0000-0000-0000-000000000006', 'Comment ' || n from jo, generate_series(1, 20) n $$,
  'P5 writes 20 comments today');
select throws_ok(
  $$ insert into public.session_comments (session_id, member_id, body) select id, '8b000000-0000-0000-0000-000000000006', 'One more' from jo $$,
  'P0001', 'too many comments today', 'the 21st is refused');

-- Deleting a session takes its cheers and comments.
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is(public.delete_session((select id from jo)), 3, 'Jo deletes the shared session');
reset role;
select results_eq(
  $$ select (select count(*)::integer from public.session_cheers), (select count(*)::integer from public.session_comments) $$,
  $$ values (0, 0) $$,
  'its cheers and comments go with it');

-- Nudges -------------------------------------------------------------------------------------------
delete from private.push_outbox;
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000002'),
            ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000004') $$,
  'Sam nudges Maya and P4');
reset role;
select results_eq(
  $$ select user_id, title, body, data->>'kind', data->>'memberId' from private.push_outbox $$,
  $$ values ('8a000000-0000-0000-0000-000000000002'::uuid, 'Sam is cheering you on'::text, 'There’s still time this week.'::text,
             'nudge'::text, '8b000000-0000-0000-0000-000000000001'::text) $$,
  'Maya hears it; P4''s nudge waits in silence for her quiet hours');

-- Jo is on a break today.
insert into public.pauses (member_id, starts_on, ends_on)
select '8b000000-0000-0000-0000-000000000003', (now() at time zone awake)::date, (now() at time zone awake)::date + 2 from zones;
set local role authenticated;
select lives_ok(
  $$ insert into public.nudges (from_member_id, to_member_id)
     values ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000003') $$,
  'Sam nudges Jo, who''s on a break');
reset role;
select is((select count(*)::integer from private.push_outbox where user_id = '8a000000-0000-0000-0000-000000000003'), 0,
  'nobody is pushed while on a break');

-- At most 2 nudge pushes a week (pinned: Mon Sep 7, Tue Sep 8 and Wed Sep 9, 2026, on UTC+10).
create temp table capped (id uuid) on commit drop;
insert into capped values ('8b000000-0000-0000-0000-000000000007');
insert into auth.users (id, email, aud, role)
values ('8a000000-0000-0000-0000-000000000007', 'p7@saunafam.test', 'authenticated', 'authenticated');
insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at)
values ('8b000000-0000-0000-0000-000000000007', '8f000000-0000-0000-0000-000000000001',
        '8a000000-0000-0000-0000-000000000007', 'P7', '#5F8794', 'Etc/GMT-10', '2026-08-01 09:00+10');
alter table public.nudges disable trigger nudges_set_local_date;
insert into public.nudges (from_member_id, to_member_id, local_date) values
  ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000007', '2026-09-07'),
  ('8b000000-0000-0000-0000-000000000002', '8b000000-0000-0000-0000-000000000007', '2026-09-08'),
  ('8b000000-0000-0000-0000-000000000003', '8b000000-0000-0000-0000-000000000007', '2026-09-09');
alter table public.nudges enable trigger nudges_set_local_date;
select ok(private.nudge_push_allowed('8b000000-0000-0000-0000-000000000007', '2026-09-08 12:00+10'),
  'the second nudge of the week still pushes');
select ok(not private.nudge_push_allowed('8b000000-0000-0000-0000-000000000007', '2026-09-09 12:00+10'),
  'the third in a week doesn''t');
select ok(private.nudge_push_allowed('8b000000-0000-0000-0000-000000000007', '2026-09-14 12:00+10'),
  'a new week starts the count again');

-- weekend --------------------------------------------------------------------------------------------
-- Fixed family on UTC+10, week of Monday Sep 7, 2026. Saturday Sep 12 17:00 on UTC+10 is 07:00 UTC.
--   W1 kept (3), has a phone      -> recipient
--   W2 kept (3), has a phone      -> recipient
--   W3 kept, phone, switch off    -> not a recipient
--   W4 1 of 3 (2 to go, 2 days)   -> named
--   W5 0 of 3 (3 to go, 2 days)   -> can't make it, not named
--   W6 on a break today           -> not named
--   W7 joined this week           -> not named
--   W8 1 of 3, phone              -> named, but not a recipient (hasn't kept)
delete from private.push_outbox;
insert into public.families (id, name, saunafam_started_on) values ('8f000000-0000-0000-0000-000000000003', 'Weekend crew', '2026-01-01');
insert into auth.users (id, email, aud, role)
select ('8d000000-0000-0000-0000-00000000000' || n)::uuid, 'w' || n || '@saunafam.test', 'authenticated', 'authenticated'
  from generate_series(1, 8) n;
insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at)
select ('8e000000-0000-0000-0000-00000000000' || n)::uuid, '8f000000-0000-0000-0000-000000000003',
       ('8d000000-0000-0000-0000-00000000000' || n)::uuid, 'W' || n, '#5F8794', 'Etc/GMT-10',
       case when n = 7 then '2026-09-10 09:00+10'::timestamptz else '2026-08-01 09:00+10'::timestamptz + n * interval '1 minute' end
  from generate_series(1, 8) n;
update public.members set weekend_checkin = false where id = '8e000000-0000-0000-0000-000000000003';
insert into public.push_tokens (token, user_id)
select 'ExponentPushToken[w' || n || ']', ('8d000000-0000-0000-0000-00000000000' || n)::uuid from unnest(array[1, 2, 3, 8]) n;
insert into public.pauses (member_id, starts_on, ends_on) values ('8e000000-0000-0000-0000-000000000006', '2026-09-11', '2026-09-13');
alter table public.sessions disable trigger sessions_20_check_date;
insert into public.sessions (member_id, logged_by, started_at, duration_minutes, sauna_type, source, client_id)
select m, m, ('2026-09-07'::date + d + time '12:00') at time zone 'Etc/GMT-10', 20, 'traditional', 'manual', gen_random_uuid()
  from (values ('8e000000-0000-0000-0000-000000000001'::uuid, array[0, 1, 2]),
               ('8e000000-0000-0000-0000-000000000002'::uuid, array[0, 2, 4]),
               ('8e000000-0000-0000-0000-000000000003'::uuid, array[1, 2, 3]),
               ('8e000000-0000-0000-0000-000000000004'::uuid, array[1]),
               ('8e000000-0000-0000-0000-000000000008'::uuid, array[2])) as v (m, ds),
       unnest(v.ds) d;
alter table public.sessions enable trigger sessions_20_check_date;
delete from private.push_outbox;

select is(private.queue_weekend_nudges('2026-09-12 06:59+00'), 0, 'nothing at 16:59 on Saturday');
select is(private.queue_weekend_nudges('2026-09-12 07:00+00'), 2, 'at 17:00 the two people who kept the week are queued');
select results_eq(
  $$ select user_id, title, body, data->>'kind', data->>'memberId', data->>'weekStart', local_date
       from private.push_outbox order by user_id $$,
  $$ values ('8d000000-0000-0000-0000-000000000001'::uuid, 'W4 and W8 still have this week'::text, 'A cheer from you might help.'::text,
             'weekend'::text, '8e000000-0000-0000-0000-000000000004'::text, '2026-09-07'::text, '2026-09-07'::date),
            ('8d000000-0000-0000-0000-000000000002'::uuid, 'W4 and W8 still have this week'::text, 'A cheer from you might help.'::text,
             'weekend'::text, '8e000000-0000-0000-0000-000000000004'::text, '2026-09-07'::text, '2026-09-07'::date) $$,
  'they hear about W4 and W8 only: not someone who can''t make it, on a break, or new this week');
select is(private.queue_weekend_nudges('2026-09-12 07:15+00'), 0, 'once a week: a later run queues nothing');
delete from private.push_outbox;
select is(private.queue_weekend_nudges('2026-09-12 08:00+00'), 0, 'nothing at 18:00');
select is(private.queue_weekend_nudges('2026-09-13 07:00+00'), 0, 'nothing on Sunday');
-- Everyone who can still make it does.
alter table public.sessions disable trigger sessions_20_check_date;
insert into public.sessions (member_id, logged_by, started_at, duration_minutes, sauna_type, source, client_id)
select m, m, ('2026-09-07'::date + d + time '12:00') at time zone 'Etc/GMT-10', 20, 'traditional', 'manual', gen_random_uuid()
  from (values ('8e000000-0000-0000-0000-000000000004'::uuid, array[2, 3]),
               ('8e000000-0000-0000-0000-000000000008'::uuid, array[3, 4])) as v (m, ds),
       unnest(v.ds) d;
alter table public.sessions enable trigger sessions_20_check_date;
select is(private.queue_weekend_nudges('2026-09-12 07:30+00'), 0,
  'skipped entirely when everyone who can still make it has kept the week');
select is(private.still_have_this_week_title(array['Maya']), 'Maya still has this week', 'one name');
select is(private.still_have_this_week_title(array['Maya', 'Jo', 'Sam']), 'Maya, Jo and 1 other still have this week',
  'three names: two, then "and 1 other"');
select is(private.still_have_this_week_title(array['Maya', 'Jo', 'Sam', 'P4']), 'Maya, Jo and 2 others still have this week',
  'four names: two, then "and 2 others"');
select is(private.join_names(array['Maya', 'Jo', 'Sam', 'P4']), 'Maya, Jo, Sam and P4', 'four people in a session read as a list');

-- The switch is the member's own --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "8a000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ update public.members set weekend_checkin = false where id = '8b000000-0000-0000-0000-000000000001' $$,
  'a member turns off the weekend check-in');
update public.members set weekend_checkin = false where id = '8b000000-0000-0000-0000-000000000002';
reset role;
select results_eq(
  $$ select id, weekend_checkin from public.members where id in ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000002') order by id $$,
  $$ values ('8b000000-0000-0000-0000-000000000001'::uuid, false), ('8b000000-0000-0000-0000-000000000002'::uuid, true) $$,
  'but can''t turn it off for someone else');

-- Joined push is unchanged ----------------------------------------------------------------------------
delete from private.push_outbox;
insert into auth.users (id, email, aud, role) values ('8a000000-0000-0000-0000-000000000009', 'p9@saunafam.test', 'authenticated', 'authenticated');
insert into public.members (id, family_id, user_id, display_name, colour, timezone)
values ('8b000000-0000-0000-0000-000000000009', '8f000000-0000-0000-0000-000000000002', '8a000000-0000-0000-0000-000000000009', 'Jo', '#5F8794', 'UTC');
select results_eq(
  $$ select user_id, title, body from private.push_outbox where kind = 'joined' $$,
  $$ values ('8a000000-0000-0000-0000-000000000005'::uuid, 'Jo joined Other family'::text, 'You’ll see them on Today from now on.'::text) $$,
  'joining still tells everyone already in the family');

select * from finish();
rollback;
