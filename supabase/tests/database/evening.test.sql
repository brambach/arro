-- The evening "X still has today" push (migration 20261005000008). Rolled back, like arro.test.sql.
-- Times are fixed with p_now, so the test doesn't depend on when it runs.
-- 2026-10-05 09:00 UTC is 19:00 in Brisbane (UTC+10, no DST) and 10:00 in London (BST).

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, aud, role) values
  ('e1100000-0000-0000-0000-000000000000', 'mum@arro.test', 'authenticated', 'authenticated'),
  ('e1200000-0000-0000-0000-000000000000', 'dad@arro.test', 'authenticated', 'authenticated'),
  ('e1300000-0000-0000-0000-000000000000', 'gran@arro.test', 'authenticated', 'authenticated'),
  ('e1400000-0000-0000-0000-000000000000', 'kid@arro.test', 'authenticated', 'authenticated');

insert into public.families (id, name) values ('e1000000-0000-0000-0000-000000000000', 'Home crew');

-- Joined in this order, a minute apart, so names come out in join order.
insert into public.members (id, family_id, user_id, display_name, colour, timezone, joined_at) values
  ('e1110000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000',
   'e1100000-0000-0000-0000-000000000000', 'Mum', '#EF6C1A', 'Australia/Brisbane', now() - interval '4 minutes'),
  ('e1220000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000',
   'e1200000-0000-0000-0000-000000000000', 'Dad', '#DF6B96', 'Australia/Brisbane', now() - interval '3 minutes'),
  ('e1330000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000',
   'e1300000-0000-0000-0000-000000000000', 'Gran', '#4F97CF', 'Europe/London', now() - interval '2 minutes'),
  ('e1440000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000',
   'e1400000-0000-0000-0000-000000000000', 'Kid', '#4FA06B', 'Australia/Brisbane', now() - interval '1 minute');

-- Join pushes aren't what this file tests.
delete from private.push_outbox;

insert into public.push_tokens (token, user_id) values
  ('ExponentPushToken[mum]', 'e1100000-0000-0000-0000-000000000000'),
  ('ExponentPushToken[dad]', 'e1200000-0000-0000-0000-000000000000'),
  ('ExponentPushToken[gran]', 'e1300000-0000-0000-0000-000000000000');

-- Workouts are dated directly; the date trigger checks against the real now().
alter table public.workouts disable trigger user;
-- Mum moved on her 5 October. Kid moved but has no phone registered.
-- Gran moved on her 4 October (yesterday for her), so she still has today.
insert into public.workouts (member_id, local_date, type, source) values
  ('e1110000-0000-0000-0000-000000000000', '2026-10-05', 'walk', 'manual'),
  ('e1440000-0000-0000-0000-000000000000', '2026-10-05', 'run', 'manual'),
  ('e1330000-0000-0000-0000-000000000000', '2026-10-04', 'swim', 'manual');
alter table public.workouts enable trigger user;

-- Before the window ------------------------------------------------------------------
select is(private.queue_evening_nudges('2026-10-05 08:59 UTC'), 0, 'Nothing at 18:59 Brisbane time');

-- In the window ----------------------------------------------------------------------
select is(private.queue_evening_nudges('2026-10-05 09:00 UTC'), 1, 'At 19:00 one push is queued');
select results_eq(
  $$ select user_id, title, body, local_date, data->>'memberId' from private.push_outbox $$,
  $$ values ('e1100000-0000-0000-0000-000000000000'::uuid, 'Dad and Gran still have today'::text,
             'A cheer from you might help.'::text, '2026-10-05'::date, 'e1220000-0000-0000-0000-000000000000'::text) $$,
  'Mum, who moved, hears about Dad and Gran; not Kid, who moved; the tap opens Dad');
select is(
  (select count(*)::integer from private.push_outbox where user_id in
     ('e1200000-0000-0000-0000-000000000000', 'e1300000-0000-0000-0000-000000000000')),
  0, 'Dad and Gran, who haven''t moved, get nothing');
select is(
  (select count(*)::integer from private.push_outbox where user_id = 'e1400000-0000-0000-0000-000000000000'),
  0, 'Kid moved but has no phone registered, so nothing is queued');

-- Once a day -------------------------------------------------------------------------
select is(private.queue_evening_nudges('2026-10-05 09:15 UTC'), 0, 'A later run the same evening queues nothing');
select is(private.queue_evening_nudges('2026-10-05 10:45 UTC'), 0, 'Nor does 20:45');

-- Dad moves; a fresh evening only names Gran.
delete from private.push_outbox;
alter table public.workouts disable trigger user;
insert into public.workouts (member_id, local_date, type, source) values
  ('e1220000-0000-0000-0000-000000000000', '2026-10-05', 'gym', 'manual');
alter table public.workouts enable trigger user;
select is(private.queue_evening_nudges('2026-10-05 10:00 UTC'), 2, 'At 20:00 Mum and Dad are both queued');
select results_eq(
  $$ select user_id, title from private.push_outbox order by user_id $$,
  $$ values ('e1100000-0000-0000-0000-000000000000'::uuid, 'Gran still has today'::text),
            ('e1200000-0000-0000-0000-000000000000'::uuid, 'Gran still has today'::text) $$,
  'With Dad done, both hear only about Gran');

-- After the window -------------------------------------------------------------------
delete from private.push_outbox;
select is(private.queue_evening_nudges('2026-10-05 11:00 UTC'), 0, 'Nothing at 21:00');

-- Everyone moved ----------------------------------------------------------------------
alter table public.workouts disable trigger user;
insert into public.workouts (member_id, local_date, type, source) values
  ('e1330000-0000-0000-0000-000000000000', '2026-10-05', 'walk', 'manual');
alter table public.workouts enable trigger user;
select is(private.queue_evening_nudges('2026-10-05 09:30 UTC'), 0, 'Once everyone has moved, nobody is told anything');

-- Titles for three or more ------------------------------------------------------------
select is(private.still_has_today_title(array['Dad', 'Gran', 'Kid']), 'Dad and 2 others still have today',
  'Three or more names read as "and N others"');

select * from finish();
rollback;
