-- Saunafam build 9, part 5: pushes.
--   1. Arro's workout pushes stop: the triggers on workouts, cheers and comments
--      go, and the 'arro-evening-nudge' schedule is removed. The functions stay
--      until build 10, and build 8 keeps working, it just stops getting them.
--   2. New push kinds: session, shared, session_cheer, session_comment, weekend.
--   3. Who gets what (design/copy/notifications.md has the exact copy):
--      session          family members who weren't in it; the mover's first
--                       session of their day only; not for yesterday's or short
--                       sessions
--      shared           everyone added to a session by the logger
--      session_cheer    everyone in the session but the cheerer, once per
--                       session, cheerer and person
--      session_comment  everyone in the session but the commenter
--      nudge            the person nudged; at most 2 pushes a week, never on a break
--      weekend          Saturday 17:00 to 18:00, to people who kept the week,
--                       naming who can still make it
--      All of them only between 07:00 and 21:00 in the recipient's own zone.
--      Outside that the thing itself (session, cheer, comment, nudge) is still
--      saved; only the push is skipped.
--   4. members.weekend_checkin: the "Weekend check-in" switch in Settings.
--   5. A 'saunafam-weekend' schedule every 15 minutes queues the weekend push and
--      sends anything queued.

-- 1. Arro's pushes off ------------------------------------------------------------
drop trigger workouts_queue_moved_push on public.workouts;
drop trigger cheers_queue_push on public.cheers;
drop trigger comments_queue_push on public.comments;

do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'arro-evening-nudge') then
      perform cron.unschedule('arro-evening-nudge');
    end if;
  end if;
end;
$$;

-- 2. Kinds ---------------------------------------------------------------------------
alter table private.push_outbox drop constraint push_outbox_kind_check;
alter table private.push_outbox
  add constraint push_outbox_kind_check check (kind in (
    'cheer', 'joined', 'evening', 'nudge', 'moved', 'comment',
    'session', 'shared', 'weekend', 'session_cheer', 'session_comment'));

-- session rows carry the mover's local day; weekend rows the recipient's week start.
alter table private.push_outbox drop constraint push_outbox_local_date;
alter table private.push_outbox
  add constraint push_outbox_local_date
  check ((kind in ('evening', 'moved', 'session', 'weekend')) = (local_date is not null));

create unique index push_outbox_one_session_a_day
  on private.push_outbox (user_id, (data->>'memberId'), local_date) where kind = 'session';
create unique index push_outbox_one_weekend_a_week
  on private.push_outbox (user_id, local_date) where kind = 'weekend';
create unique index push_outbox_one_session_cheer_each
  on private.push_outbox (user_id, (data->>'sessionId'), (data->>'cheererId')) where kind = 'session_cheer';

-- Helpers ------------------------------------------------------------------------------
-- 07:00 to 21:00 in the given zone.
create or replace function private.is_waking_hours(p_timezone text, p_at timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select (p_at at time zone p_timezone)::time >= time '07:00'
     and (p_at at time zone p_timezone)::time < time '21:00';
$$;

-- "Maya", "Maya and Jo", "Maya, Jo and Sam".
create or replace function private.join_names(p_names text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when cardinality(p_names) <= 1 then coalesce(p_names[1], '')
    else array_to_string(p_names[1:cardinality(p_names) - 1], ', ') || ' and ' || p_names[cardinality(p_names)]
  end;
$$;

-- "Maya still has this week", "Maya and Jo still have this week",
-- "Maya, Jo and 1 other still have this week", "Maya, Jo and 2 others ...".
create or replace function private.still_have_this_week_title(p_names text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case cardinality(p_names)
    when 1 then p_names[1] || ' still has this week'
    when 2 then p_names[1] || ' and ' || p_names[2] || ' still have this week'
    when 3 then p_names[1] || ', ' || p_names[2] || ' and 1 other still have this week'
    else p_names[1] || ', ' || p_names[2] || ' and ' || (cardinality(p_names) - 2) || ' others still have this week'
  end;
$$;

revoke all on function private.is_waking_hours(text, timestamptz) from public;
revoke all on function private.join_names(text[]) from public;
revoke all on function private.still_have_this_week_title(text[]) from public;

-- 3a. session and shared ----------------------------------------------------------------
-- log_session calls this once, after every row of a new session is in.
create or replace function private.after_session_logged(p_anchor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.sessions;
  logger public.members;
  wso smallint;
  group_ids uuid[];
  group_names text[];
  is_short boolean;
  title text;
begin
  select * into a from public.sessions where id = p_anchor_id;
  if not found then
    return;
  end if;
  select * into logger from public.members where id = a.member_id;
  select f.week_starts_on into wso from public.families f where f.id = logger.family_id;

  -- The logger first, then the others in join order.
  select array_agg(m.id order by (m.id = logger.id) desc, m.joined_at, m.id),
         array_agg(m.display_name order by (m.id = logger.id) desc, m.joined_at, m.id)
    into group_ids, group_names
    from public.sessions s join public.members m on m.id = s.member_id
   where s.id = a.id or s.shared_id = a.id;

  is_short := a.duration_minutes < (
    select r.min_minutes from private.rule_for_week(logger.family_id, private.week_start(a.local_date, wso)) r);

  -- "Maya logged a sauna with you", to everyone she added.
  insert into private.push_outbox (user_id, kind, title, body, data)
  select m.user_id,
         'shared',
         logger.display_name || ' logged a sauna with you',
         case when is_short then 'Tap to see it.' else 'It counts toward your week.' end,
         jsonb_build_object('kind', 'shared', 'sessionId', a.id, 'memberId', logger.id)
    from public.sessions s
    join public.members m on m.id = s.member_id
   where s.shared_id = a.id and s.id <> a.id
     and m.user_id <> logger.user_id
     and private.is_waking_hours(m.timezone);

  -- "Maya had a sauna", to the rest of the family: today's first, not short.
  if a.local_date <> (now() at time zone logger.timezone)::date or is_short then
    return;
  end if;
  title := case when cardinality(group_names) = 1
                then logger.display_name || ' had a sauna'
                else private.join_names(group_names) || ' had a sauna together' end;

  insert into private.push_outbox (user_id, kind, title, body, data, local_date)
  select m.user_id,
         'session',
         title,
         'Send a cheer.',
         jsonb_build_object('kind', 'session', 'sessionId', a.id, 'memberId', logger.id),
         a.local_date
    from public.members m
   where m.family_id = logger.family_id
     and m.id <> all (group_ids)
     and m.user_id <> logger.user_id
     and private.is_waking_hours(m.timezone)
  on conflict (user_id, (data->>'memberId'), local_date) where kind = 'session' do nothing;
end;
$$;

revoke all on function private.after_session_logged(uuid) from public;

-- 3b. session_cheer --------------------------------------------------------------------------
create or replace function private.queue_session_cheer_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select m.user_id,
         'session_cheer',
         cheerer.display_name || ' cheered you on',
         'For your sauna.',
         jsonb_build_object('kind', 'session_cheer', 'sessionId', new.session_id, 'cheererId', cheerer.id)
    from public.sessions s
    join public.members m on m.id = s.member_id
    join public.members cheerer on cheerer.id = new.member_id
   where (s.id = new.session_id or s.shared_id = new.session_id)
     and m.id <> cheerer.id
     and m.user_id <> cheerer.user_id
     and private.is_waking_hours(m.timezone)
  on conflict (user_id, (data->>'sessionId'), (data->>'cheererId')) where kind = 'session_cheer' do nothing;
  return null;
end;
$$;

create trigger session_cheers_queue_push
after insert on public.session_cheers
for each row execute function private.queue_session_cheer_push();

-- 3c. session_comment --------------------------------------------------------------------------
create or replace function private.queue_session_comment_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select m.user_id,
         'session_comment',
         writer.display_name || ' on your sauna',
         btrim(new.body),
         jsonb_build_object('kind', 'session_comment', 'sessionId', new.session_id, 'commentId', new.id)
    from public.sessions s
    join public.members m on m.id = s.member_id
    join public.members writer on writer.id = new.member_id
   where (s.id = new.session_id or s.shared_id = new.session_id)
     and m.id <> writer.id
     and m.user_id <> writer.user_id
     and private.is_waking_hours(m.timezone);
  return null;
end;
$$;

create trigger session_comments_queue_push
after insert on public.session_comments
for each row execute function private.queue_session_comment_push();

revoke all on function private.queue_session_cheer_push() from public;
revoke all on function private.queue_session_comment_push() from public;

-- 3d. nudge ---------------------------------------------------------------------------------------
-- public.nudges already allows one per person per day. A nudge pushes only if
-- it's at most the second one that person has had this week (their own week,
-- their own zone), they aren't on a break today, and it's daytime for them.
-- p_as_of is for tests.
create or replace function private.nudge_push_allowed(p_member_id uuid, p_as_of timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select not private.is_paused(m.id, (p_as_of at time zone m.timezone)::date)
     and (select count(*) from public.nudges n
           where n.to_member_id = m.id
             and n.local_date between private.week_start((p_as_of at time zone m.timezone)::date, f.week_starts_on)
                                  and (p_as_of at time zone m.timezone)::date) <= 2
    from public.members m join public.families f on f.id = m.family_id
   where m.id = p_member_id;
$$;

create or replace function private.queue_nudge_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select them.user_id,
         'nudge',
         sender.display_name || ' is cheering you on',
         'There’s still time this week.',
         jsonb_build_object('kind', 'nudge', 'memberId', sender.id)
    from public.members them
    join public.members sender on sender.id = new.from_member_id
   where them.id = new.to_member_id
     and them.user_id <> sender.user_id
     and private.is_waking_hours(them.timezone)
     and private.nudge_push_allowed(them.id);
  return null;
end;
$$;

revoke all on function private.nudge_push_allowed(uuid, timestamptz) from public;
revoke all on function private.queue_nudge_push() from public;

-- 4. Weekend check-in switch -------------------------------------------------------------------------
alter table public.members add column weekend_checkin boolean not null default true;
grant update (weekend_checkin) on public.members to authenticated;

-- 3e. weekend ----------------------------------------------------------------------------------------
-- Queues Saturday's "Maya still has this week" and returns how many. p_now is
-- for tests. Modeled on queue_evening_nudges (20261005000008).
-- A recipient: Saturday between 17:00 and 18:00 in their zone, a phone
-- registered, weekend_checkin on, and they've kept this week.
-- Someone named: in the same family, not them, hasn't kept their own week, isn't
-- on a break today, isn't in their first week, and can still make it (sessions
-- still needed are no more than the days left in their week, today included).
-- One a week per recipient (local_date is their week start). Nobody to name, no push.
create or replace function private.queue_weekend_nudges(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued integer;
begin
  with recipients as (
    select r.id, r.user_id, r.family_id, s.week_start
      from public.members r
      cross join lateral private.member_week_summary(r.id, p_now) s
     where extract(isodow from (p_now at time zone r.timezone)) = 6
       and (p_now at time zone r.timezone)::time >= time '17:00'
       and (p_now at time zone r.timezone)::time < time '18:00'
       and r.weekend_checkin
       and exists (select 1 from public.push_tokens t where t.user_id = r.user_id)
       and s.kept_this_week
  ),
  candidates as (
    select m.id, m.family_id, m.user_id, m.display_name, m.joined_at, s.*,
           private.member_first_week(m.joined_on, f.saunafam_started_on, f.week_starts_on) as first_week
      from public.members m
      join public.families f on f.id = m.family_id
      cross join lateral private.member_week_summary(m.id, p_now) s
     where m.family_id in (select family_id from recipients)
  ),
  still as (
    select rc.id as recipient_id,
           array_agg(c.display_name order by c.joined_at, c.id) as names,
           array_agg(c.id order by c.joined_at, c.id) as ids
      from recipients rc
      join candidates c on c.family_id = rc.family_id and c.id <> rc.id and c.user_id <> rc.user_id
     where not c.kept_this_week
       and c.paused_until is null
       and c.first_week < c.week_start
       and c.goal - c.counted_days <= c.week_start + 6 - c.local_today + 1
     group by rc.id
  ),
  inserted as (
    insert into private.push_outbox (user_id, kind, title, body, data, local_date, created_at)
    select rc.user_id,
           'weekend',
           private.still_have_this_week_title(s.names),
           'A cheer from you might help.',
           jsonb_build_object('kind', 'weekend', 'memberId', s.ids[1], 'weekStart', rc.week_start),
           rc.week_start,
           p_now
      from recipients rc
      join still s on s.recipient_id = rc.id
    on conflict (user_id, local_date) where kind = 'weekend' do nothing
    returning 1
  )
  select count(*) into queued from inserted;
  return queued;
end;
$$;

-- 5. Schedule -------------------------------------------------------------------------------------------
-- Same shape as private.run_evening_nudges: clears pushes older than a week,
-- queues the weekend push, then asks send-push to send whatever is queued
-- (so a push queued by a trigger whose send-push call failed still goes out).
create or replace function private.run_saunafam_pushes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  anon_key text;
begin
  delete from private.push_outbox where created_at < now() - interval '7 days';
  perform private.queue_weekend_nudges();
  if not exists (
    select 1 from private.push_outbox
     where sent_at is null and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into anon_key from vault.decrypted_secrets where name = 'anon_key';
  if project_url is null or anon_key is null then
    raise warning 'Vault secrets project_url and anon_key are missing; pushes stay queued';
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.queue_weekend_nudges(timestamptz) from public;
revoke all on function private.run_saunafam_pushes() from public;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron or pg_net not available; the Saunafam schedule is not set';
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  create extension if not exists pg_net with schema extensions;
  -- Every 15 minutes, so :30 and :45 zones still get their Saturday window.
  perform cron.schedule('saunafam-weekend', '*/15 * * * *', 'select private.run_saunafam_pushes()');
end;
$$;
