-- The evening "X still has today" push (phase 4).
-- It goes to people who already moved today, about family members who haven't,
-- in the recipient's evening (19:00 to 21:00 their time), at most once a day each.
-- pg_cron queues it every 15 minutes into private.push_outbox and calls send-push
-- through pg_net. Both extensions exist on hosted Supabase; a plain Postgres
-- (the scratch test database) skips the schedule and keeps the functions.

-- 1. Queue ---------------------------------------------------------------------
alter table private.push_outbox drop constraint push_outbox_kind_check;
alter table private.push_outbox
  add constraint push_outbox_kind_check check (kind in ('cheer', 'joined', 'evening'));

-- The recipient's local day, for evening pushes only. One a day per person.
alter table private.push_outbox add column local_date date;
alter table private.push_outbox
  add constraint push_outbox_evening_date check ((kind = 'evening') = (local_date is not null));
create unique index push_outbox_one_evening_a_day
  on private.push_outbox (user_id, local_date) where kind = 'evening';

-- "Dad still has today", "Dad and Mum still have today", "Dad and 2 others still have today".
create or replace function private.still_has_today_title(p_names text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case cardinality(p_names)
    when 1 then p_names[1] || ' still has today'
    when 2 then p_names[1] || ' and ' || p_names[2] || ' still have today'
    else p_names[1] || ' and ' || (cardinality(p_names) - 1) || ' others still have today'
  end;
$$;

-- Queues tonight's evening pushes and returns how many. p_now is for tests.
-- A recipient: has a phone registered, is between 19:00 and 21:00 in their own
-- zone, has a workout on their own today, and hasn't had one of these today.
-- Someone they're told about: in the same family, not them, and no workout on
-- their own today (their zone, not the recipient's).
create or replace function private.queue_evening_nudges(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued integer;
begin
  with recipients as (
    select r.id, r.user_id, r.family_id, (p_now at time zone r.timezone)::date as today
      from public.members r
     where (p_now at time zone r.timezone)::time >= time '19:00'
       and (p_now at time zone r.timezone)::time < time '21:00'
       and exists (select 1 from public.push_tokens t where t.user_id = r.user_id)
       and exists (
         select 1 from public.workouts w
          where w.member_id = r.id and w.local_date = (p_now at time zone r.timezone)::date)
  ),
  still as (
    select rc.id as recipient_id,
           array_agg(m.display_name order by m.joined_at) as names,
           array_agg(m.id order by m.joined_at) as ids
      from recipients rc
      join public.members m
        on m.family_id = rc.family_id and m.id <> rc.id and m.user_id <> rc.user_id
     where not exists (
       select 1 from public.workouts w
        where w.member_id = m.id and w.local_date = (p_now at time zone m.timezone)::date)
     group by rc.id
  ),
  inserted as (
    insert into private.push_outbox (user_id, kind, title, body, data, local_date, created_at)
    select rc.user_id,
           'evening',
           private.still_has_today_title(s.names),
           'A cheer from you might help.',
           jsonb_build_object('kind', 'evening', 'memberId', s.ids[1]),
           rc.today,
           p_now
      from recipients rc
      join still s on s.recipient_id = rc.id
    on conflict (user_id, local_date) where kind = 'evening' do nothing
    returning 1
  )
  select count(*) into queued from inserted;
  return queued;
end;
$$;

-- What the schedule runs: queue, then ask send-push to send. Also clears pushes
-- older than a week; the evening rows only need to live for their own day.
-- send-push's address and the anon key it checks come from Vault secrets
-- 'project_url' and 'anon_key'. Without them nothing is sent from here, and the
-- queued rows go out with the next cheer or join, or are dropped after an hour.
create or replace function private.run_evening_nudges()
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
  if private.queue_evening_nudges() = 0 then
    return;
  end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into anon_key from vault.decrypted_secrets where name = 'anon_key';
  if project_url is null or anon_key is null then
    raise warning 'Vault secrets project_url and anon_key are missing; evening pushes stay queued';
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.still_has_today_title(text[]) from public;
revoke all on function private.queue_evening_nudges(timestamptz) from public;
revoke all on function private.run_evening_nudges() from public;

-- 2. Schedule ------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron or pg_net not available; the evening push is not scheduled';
    return;
  end if;
  create extension if not exists pg_cron with schema pg_catalog;
  create extension if not exists pg_net with schema extensions;
  -- Every 15 minutes, so a :30 or :45 zone still gets its 19:00 window.
  perform cron.schedule('arro-evening-nudge', '*/15 * * * *', 'select private.run_evening_nudges()');
end;
$$;
