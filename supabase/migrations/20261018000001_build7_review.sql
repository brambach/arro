-- Fixes from the build 7 review (18 October), on top of 20261017000001,
-- 20261017000003 and 20261017000004:
--   1. Comment pushes keep the workout owner's quiet hours (07:00 to 21:00 in their
--      own zone), like cheers, nudges and "went for a run". The comment still shows.
--   2. A comment over 200 characters is refused as sent, spaces included. Before,
--      only the trimmed length counted, so any amount of padding got through.
--   3. The owner of a workout can delete comments on it, not only the people who
--      wrote them.
--   4. One cheer push per workout and person is a unique index, so two cheers
--      saved at once can't both push.
--   5. pause_me: a break is at most 14 days counted from the day it started, so
--      changing the length of a running one can't stretch it (ARB14), and nobody
--      is on a break for more than 14 days in any 30 (ARB30). Both used to fail on
--      the table's check constraint or not at all.

-- 1. Quiet hours for comment pushes ----------------------------------------------
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
     and owner.user_id <> writer.user_id
     and (now() at time zone owner.timezone)::time >= time '07:00'
     and (now() at time zone owner.timezone)::time < time '21:00';
  return null;
end;
$$;

revoke all on function private.queue_comment_push() from public;

-- 2. Comment length as sent --------------------------------------------------------
alter table public.comments drop constraint comments_body_check;
alter table public.comments
  add constraint comments_body_check check (char_length(body) <= 200 and char_length(btrim(body)) >= 1);

-- 3. Owners tidy their own workout -------------------------------------------------
drop policy "Members delete their own comments" on public.comments;

create policy "Members delete their own comments and comments on their workouts" on public.comments
  for delete to authenticated
  using (
    member_id in (select private.my_member_ids())
    or workout_id in (
      select w.id from public.workouts w where w.member_id in (select private.my_member_ids())
    )
  );

-- 4. One cheer push per workout and person -------------------------------------------
-- Build 6's cheer rows have no cheererId, so they never collide.
create unique index push_outbox_one_cheer_each
  on private.push_outbox (user_id, (data->>'workoutId'), (data->>'cheererId')) where kind = 'cheer';

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
  on conflict (user_id, (data->>'workoutId'), (data->>'cheererId')) where kind = 'cheer' do nothing;
  return null;
end;
$$;

revoke all on function private.queue_cheer_push() from public;

-- 5. Limits on breaks -----------------------------------------------------------------
-- Same as before, plus the two limits. The app (src/state/breaks.ts) only offers
-- lengths that pass them and shows these messages if one is refused anyway.
create or replace function public.pause_me(p_member_id uuid, p_days integer)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.members;
  member_today date;
  first_day date;
  last_day date;
  current_id uuid;
  current_start date;
  most integer;
begin
  select * into m from public.members where id = p_member_id;
  if not found or m.user_id is distinct from auth.uid() then
    raise exception 'you can only pause yourself' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 14 then
    raise exception 'a break is 1 to 14 days' using errcode = '22023';
  end if;

  member_today := (now() at time zone m.timezone)::date;
  last_day := member_today + p_days - 1;

  select p.id, p.starts_on into current_id, current_start from public.pauses p
   where p.member_id = p_member_id and member_today between p.starts_on and p.ends_on
   order by p.starts_on
   limit 1;
  first_day := coalesce(current_start, member_today);

  if last_day - first_day >= 14 then
    raise exception 'a break can be up to 14 days, counted from the day it started' using errcode = 'ARB14';
  end if;

  -- The most paused days in any 30-day window this break touches, with it.
  with spans as (
    select p.starts_on, p.ends_on from public.pauses p
     where p.member_id = p_member_id and p.id is distinct from current_id
    union all
    select first_day, last_day
  ),
  paused as (
    select distinct g::date as day
      from spans, generate_series(spans.starts_on, spans.ends_on, interval '1 day') g
  )
  select max(n) into most
    from (
      select (select count(*) from paused where paused.day between w::date and w::date + 29) as n
        from generate_series(first_day - 29, last_day, interval '1 day') w
    ) windows;
  if most > 14 then
    raise exception 'at most 14 days on a break in any 30' using errcode = 'ARB30';
  end if;

  if current_id is not null then
    -- Already on a break: it keeps its start and ends p_days from today.
    update public.pauses set ends_on = last_day where id = current_id;
  else
    insert into public.pauses (member_id, starts_on, ends_on) values (p_member_id, member_today, last_day);
  end if;
  return last_day;
end;
$$;

revoke all on function public.pause_me(uuid, integer) from public, anon;
grant execute on function public.pause_me(uuid, integer) to authenticated;
