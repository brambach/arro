-- Pushes that bring people back after a workout.
--   1. "Dad went for a run": when someone's first workout of their day is saved,
--      everyone else in the family hears about it, once a day per person they're
--      told about, and never in the recipient's quiet hours (outside 07:00 to 21:00
--      in their own zone). Yesterday's workouts saved late don't push.
--   2. Cheer pushes go out once per workout and person, so cheering, un-cheering
--      and cheering again doesn't send another. Like nudges, they never go out in
--      the owner's quiet hours; the cheer still shows in the app.
--   3. Comments: a short line on someone's workout ("Proud of you"), seen by the
--      family, with a push to the workout's owner.
--   4. The 15-minute schedule sends anything still queued, not only evening rows,
--      so a push queued by a background Health sync that couldn't call send-push
--      still goes out within the hour.
--   5. Health workouts remember which app recorded them (Whoop, Apple Watch,
--      Strava), and a sync can swap in the better copy of a workout recorded twice.

-- 1. "Went for a run" ------------------------------------------------------------
alter table private.push_outbox drop constraint push_outbox_kind_check;
alter table private.push_outbox
  add constraint push_outbox_kind_check check (kind in ('cheer', 'joined', 'evening', 'nudge', 'moved'));

-- Evening rows carry the recipient's day; moved rows carry the mover's day.
alter table private.push_outbox drop constraint push_outbox_evening_date;
alter table private.push_outbox
  add constraint push_outbox_local_date check ((kind in ('evening', 'moved')) = (local_date is not null));

create unique index push_outbox_one_moved_a_day
  on private.push_outbox (user_id, (data->>'memberId'), local_date) where kind = 'moved';

-- "went for a run", "went to the gym", "did yoga", "moved today".
create or replace function private.moved_phrase(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'walk' then 'went for a walk'
    when 'run' then 'went for a run'
    when 'ride' then 'went for a ride'
    when 'swim' then 'went for a swim'
    when 'gym' then 'went to the gym'
    when 'yoga' then 'did yoga'
    else 'moved today'
  end;
$$;

create or replace function private.queue_moved_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data, local_date)
  select them.user_id,
         'moved',
         mover.display_name || ' ' || private.moved_phrase(new.type),
         'Send them a cheer.',
         jsonb_build_object('kind', 'moved', 'workoutId', new.id, 'memberId', mover.id),
         new.local_date
    from public.members mover
    join public.members them on them.family_id = mover.family_id
   where mover.id = new.member_id
     and new.local_date = (now() at time zone mover.timezone)::date
     and them.id <> mover.id
     and them.user_id <> mover.user_id
     and (now() at time zone them.timezone)::time >= time '07:00'
     and (now() at time zone them.timezone)::time < time '21:00'
  on conflict (user_id, (data->>'memberId'), local_date) where kind = 'moved' do nothing;
  return null;
end;
$$;

create trigger workouts_queue_moved_push
after insert on public.workouts
for each row execute function private.queue_moved_push();

-- 2. One cheer push per workout and person -----------------------------------------
create or replace function private.queue_cheer_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select owner.user_id,
         'cheer',
         cheerer.display_name || ' cheered you on',
         'For your ' || private.workout_noun(w.type) || '.',
         jsonb_build_object('kind', 'cheer', 'workoutId', w.id, 'cheererId', cheerer.id)
    from public.workouts w
    join public.members owner on owner.id = w.member_id
    join public.members cheerer on cheerer.id = new.member_id
   where w.id = new.workout_id
     and owner.id <> cheerer.id
     and (now() at time zone owner.timezone)::time >= time '07:00'
     and (now() at time zone owner.timezone)::time < time '21:00'
     and not exists (
       select 1 from private.push_outbox o
        where o.kind = 'cheer'
          and o.data->>'workoutId' = w.id::text
          and o.data->>'cheererId' = cheerer.id::text);
  return null;
end;
$$;

-- 3. Comments ---------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  -- Who wrote it.
  member_id uuid not null references public.members (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now()
);

create index comments_workout_id_idx on public.comments (workout_id, created_at);
create index comments_member_id_idx on public.comments (member_id);

alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select, delete on public.comments to authenticated;
grant insert (workout_id, member_id, body) on public.comments to authenticated;

create policy "Members read comments in their family" on public.comments
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

create policy "Members comment on workouts in the same family" on public.comments
  for insert to authenticated
  with check (
    exists (
      select 1
        from public.workouts w
        join public.members owner on owner.id = w.member_id
        join public.members me on me.family_id = owner.family_id
       where w.id = comments.workout_id
         and me.id = comments.member_id
         and me.user_id = (select auth.uid())
    )
  );

create policy "Members delete their own comments" on public.comments
  for delete to authenticated
  using (member_id in (select private.my_member_ids()));

-- At most 20 comments a day from one person, so a stuck button can't flood a family.
create or replace function private.check_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.comments c
       where c.member_id = new.member_id and c.created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many comments today' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
before insert on public.comments
for each row execute function private.check_comment_rate();

alter table private.push_outbox drop constraint push_outbox_kind_check;
alter table private.push_outbox
  add constraint push_outbox_kind_check check (kind in ('cheer', 'joined', 'evening', 'nudge', 'moved', 'comment'));

-- "Mum: Proud of you" to the person whose workout it is. Not for your own workout.
create or replace function private.queue_comment_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.push_outbox (user_id, kind, title, body, data)
  select owner.user_id,
         'comment',
         writer.display_name || ' on your ' || private.workout_noun(w.type),
         btrim(new.body),
         jsonb_build_object('kind', 'comment', 'workoutId', w.id)
    from public.workouts w
    join public.members owner on owner.id = w.member_id
    join public.members writer on writer.id = new.member_id
   where w.id = new.workout_id
     and owner.user_id <> writer.user_id;
  return null;
end;
$$;

create trigger comments_queue_push
after insert on public.comments
for each row execute function private.queue_comment_push();

-- 4. The schedule sends whatever is queued ------------------------------------------
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
  perform private.queue_evening_nudges();
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

revoke all on function private.moved_phrase(text) from public;
revoke all on function private.queue_moved_push() from public;
revoke all on function private.queue_cheer_push() from public;
revoke all on function private.run_evening_nudges() from public;
revoke all on function private.check_comment_rate() from public;
revoke all on function private.queue_comment_push() from public;

-- 5. Which app recorded a Health workout ---------------------------------------------
-- HealthKit's source name, such as "WHOOP" or "Bryce’s Apple Watch". When two apps
-- record the same workout, the app keeps one row and points it at the better copy
-- (health_workout_id), so cheers and comments on it stay.
alter table public.workouts add column source_app text check (char_length(source_app) <= 60);
grant insert (source_app) on public.workouts to authenticated;
grant update (health_workout_id, source_app) on public.workouts to authenticated;
