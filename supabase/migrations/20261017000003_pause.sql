-- "Pause me": a member takes a break (a holiday, being unwell) without breaking
-- the family streak for everyone. After the 17 October review:
--   * A break starts on the member's own today and lasts 1 to 14 days. It can't
--     start in the past, so it can't mend a day that's already broken.
--   * On a paused day the member isn't expected: the family day counts when
--     everyone else moved. Their own streak holds, and no freeze is used.
--     Moving on a paused day still counts as moving.
--   * If everyone is paused, the day neither counts nor breaks the streak.
--   * The evening push doesn't name someone who's on a break.
--   * The family sees that someone is on a break and until when, never why.

-- 1. Breaks --------------------------------------------------------------------
create table public.pauses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  -- The member's local dates, both inclusive.
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on < 14)
);

create index pauses_member_id_idx on public.pauses (member_id, ends_on);

alter table public.pauses enable row level security;
revoke all on public.pauses from anon, authenticated;
-- Written only through pause_me and end_my_pause.
grant select on public.pauses to authenticated;

create policy "Members see breaks in their family" on public.pauses
  for select to authenticated
  using (
    member_id in (
      select id from public.members where family_id in (select private.my_family_ids())
    )
  );

create or replace function private.is_paused(p_member_id uuid, p_day date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.pauses p
     where p.member_id = p_member_id and p_day between p.starts_on and p.ends_on
  );
$$;

-- Starts a break today, or changes the length of the current one, for p_days days
-- counting today. Returns the last day of the break.
create or replace function public.pause_me(p_member_id uuid, p_days integer)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.members;
  member_today date;
  last_day date;
  current_id uuid;
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

  select p.id into current_id from public.pauses p
   where p.member_id = p_member_id and member_today between p.starts_on and p.ends_on
   order by p.starts_on
   limit 1;

  if current_id is not null then
    -- Already on a break: it keeps its start and ends p_days from today.
    update public.pauses set ends_on = last_day where id = current_id;
  else
    insert into public.pauses (member_id, starts_on, ends_on) values (p_member_id, member_today, last_day);
  end if;
  return last_day;
end;
$$;

-- Ends the current break. Today counts as normal again; the days already paused stay paused.
create or replace function public.end_my_pause(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.members;
  member_today date;
begin
  select * into m from public.members where id = p_member_id;
  if not found or m.user_id is distinct from auth.uid() then
    raise exception 'you can only end your own break' using errcode = '42501';
  end if;
  member_today := (now() at time zone m.timezone)::date;

  delete from public.pauses p
   where p.member_id = p_member_id and p.starts_on >= member_today;
  update public.pauses p set ends_on = member_today - 1
   where p.member_id = p_member_id and p.starts_on < member_today and p.ends_on >= member_today;
end;
$$;

revoke all on function private.is_paused(uuid, date) from public;
revoke all on function public.pause_me(uuid, integer) from public, anon;
revoke all on function public.end_my_pause(uuid) from public, anon;
grant execute on function public.pause_me(uuid, integer) to authenticated;
grant execute on function public.end_my_pause(uuid) to authenticated;

-- 2. Streaks -------------------------------------------------------------------
-- member_days gains status 'paused': a day in a break with nothing logged. It
-- comes before 'pending', so a paused today doesn't hold the family day open.
create or replace function private.member_days(p_member_id uuid, p_as_of timestamptz default now())
returns table (day date, status text)
language plpgsql
stable
set search_path = ''
as $$
declare
  m public.members;
  member_today date;
  moved_days date[];
  last_freeze date;
  refill integer := private.freeze_refill_days();
begin
  select * into m from public.members where id = p_member_id;
  if not found then
    return;
  end if;

  member_today := (p_as_of at time zone m.timezone)::date;

  select coalesce(array_agg(distinct w.local_date), '{}') into moved_days
    from public.workouts w
   where w.member_id = p_member_id
     and w.local_date between m.joined_on and member_today;

  for day in
    select g::date from generate_series(m.joined_on, greatest(member_today, m.joined_on), interval '1 day') g
  loop
    if day = any (moved_days) then
      status := 'moved';
    elsif private.is_paused(p_member_id, day) then
      status := 'paused';
    elsif day = member_today then
      status := 'pending';
    elsif day = m.joined_on then
      status := 'joined';
    elsif last_freeze is null or day - last_freeze >= refill then
      status := 'frozen';
      last_freeze := day;
    else
      status := 'missed';
    end if;
    return next;
  end loop;
end;
$$;

-- A paused member isn't expected that day. A day with nobody expected is 'skip',
-- which neither counts nor breaks (family_summary). Otherwise the same as before.
create or replace function private.family_days(p_family_id uuid, p_as_of timestamptz default now())
returns table (day date, state text)
language sql
stable
set search_path = ''
as $$
  with mem as (
    select m.id, m.joined_on, m.joined_at, (p_as_of at time zone m.timezone)::date as today
      from public.members m
     where m.family_id = p_family_id
  ),
  bounds as (
    select
      (select max(joined_on) from (select joined_on from mem order by joined_at limit 2) first_two) as start_on,
      (select max(today) from mem) as end_on,
      (select count(*) from mem) as member_count
  ),
  days as (
    select g::date as day
      from bounds, generate_series(bounds.start_on, bounds.end_on, interval '1 day') g
     where bounds.member_count >= 2
  ),
  member_status as (
    select mem.id, d.day, d.status
      from mem cross join lateral private.member_days(mem.id, p_as_of) d
  ),
  expected as (
    -- Days past a member's own today are 'pending' for them, unless they're on a break.
    select days.day, mem.id,
           coalesce(ms.status, case when private.is_paused(mem.id, days.day) then 'paused' else 'pending' end) as status
      from days
      join mem on mem.joined_on <= days.day
      left join member_status ms on ms.id = mem.id and ms.day = days.day
     where mem.joined_on < days.day or ms.status = 'moved'
  )
  select days.day,
         case
           when bool_or(e.status = 'missed') then 'broken'
           when bool_or(e.status = 'pending') then 'pending'
           when count(e.id) filter (where e.status <> 'paused') = 0 then 'skip'
           else 'counted'
         end
    from days
    left join expected e on e.day = days.day
   group by days.day
   order by days.day;
$$;

-- 3. The evening push ----------------------------------------------------------
-- Same as before, except someone on a break isn't named.
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
       and not private.is_paused(m.id, (p_now at time zone m.timezone)::date)
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

-- 4. Nudges --------------------------------------------------------------------
-- Nobody is nudged while they're on a break. The app doesn't offer it; this
-- keeps the push from going out if an older build tries.
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
         'You’ve still got today.',
         jsonb_build_object('kind', 'nudge', 'memberId', sender.id)
    from public.members them
    join public.members sender on sender.id = new.from_member_id
   where them.id = new.to_member_id
     and them.user_id <> sender.user_id
     and (now() at time zone them.timezone)::time >= time '07:00'
     and (now() at time zone them.timezone)::time < time '21:00'
     and not private.is_paused(them.id, (now() at time zone them.timezone)::date);
  return null;
end;
$$;
