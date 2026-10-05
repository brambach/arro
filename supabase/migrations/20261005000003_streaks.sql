-- Streaks and freezes, worked out from workouts on every read so the app never
-- has to. The rules (design/refactor-plan.md, "Decisions made"):
--   * "Today" is each member's own local calendar day.
--   * A member's day counts if they logged anything that day. A Health workout and
--     a manual check-in on the same day count once.
--   * Each member has one automatic freeze. It's used without asking on a missed
--     day and comes back freeze_refill_days() days after it was used.
--   * The family streak starts on the day the second member joins. A family day
--     counts when every member moved or used a freeze. A member is expected from
--     the day after they join; on the day they join they count only if they moved.
--   * A day nobody has finished yet doesn't break anything, so the streak holds
--     while it's still today somewhere in the family.
--   * "Days together this year" counts family days that counted this calendar
--     year and never goes down after a break.
--
-- The private.* functions take an as_of time so tests can pin "now".

-- How many days a used freeze takes to come back. Still an open decision
-- (refactor-plan.md, open decision 2); weekly is the recommendation. Changing it
-- recalculates every streak, past days included.
create or replace function private.freeze_refill_days()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 7;
$$;

-- One row per day from the member's join date to their local today.
-- status: 'moved', 'frozen', 'missed', 'joined' (join day, nothing logged, not
-- expected) or 'pending' (today, nothing logged yet).
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

-- One row per family day from the streak start to the latest local today in the
-- family. state: 'counted', 'broken', 'pending' (someone's day isn't over and
-- they haven't moved yet) or 'skip' (nobody was expected yet).
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
    -- Days past a member's own today are 'pending' for them.
    select days.day, mem.id, coalesce(ms.status, 'pending') as status
      from days
      join mem on mem.joined_on <= days.day
      left join member_status ms on ms.id = mem.id and ms.day = days.day
     where mem.joined_on < days.day or ms.status = 'moved'
  )
  select days.day,
         case
           when bool_or(e.status = 'missed') then 'broken'
           when bool_or(e.status = 'pending') then 'pending'
           when count(e.id) = 0 then 'skip'
           else 'counted'
         end
    from days
    left join expected e on e.day = days.day
   group by days.day
   order by days.day;
$$;

create or replace function private.family_summary(p_family_id uuid, p_as_of timestamptz default now())
returns table (
  family_streak integer,
  longest_streak integer,
  days_together_this_year integer,
  started_on date,
  latest_day_state text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  this_year integer;
begin
  family_streak := 0;
  longest_streak := 0;
  days_together_this_year := 0;

  select extract(year from max((p_as_of at time zone m.timezone)::date))::integer into this_year
    from public.members m where m.family_id = p_family_id;

  for r in select * from private.family_days(p_family_id, p_as_of) loop
    started_on := coalesce(started_on, r.day);
    latest_day_state := r.state;
    if r.state = 'counted' then
      family_streak := family_streak + 1;
      longest_streak := greatest(longest_streak, family_streak);
      if extract(year from r.day) = this_year then
        days_together_this_year := days_together_this_year + 1;
      end if;
    elsif r.state = 'broken' then
      family_streak := 0;
    end if;
  end loop;

  return next;
end;
$$;

create or replace function private.member_summary(p_member_id uuid, p_as_of timestamptz default now())
returns table (
  member_id uuid,
  local_today date,
  personal_streak integer,
  moved_today boolean,
  freeze_available boolean,
  freeze_back_on date
)
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  last_freeze date;
begin
  member_id := p_member_id;
  personal_streak := 0;
  moved_today := false;

  for r in select * from private.member_days(p_member_id, p_as_of) loop
    local_today := r.day;
    if r.status in ('moved', 'frozen') then
      personal_streak := personal_streak + 1;
    elsif r.status = 'missed' then
      personal_streak := 0;
    end if;
    if r.status = 'frozen' then
      last_freeze := r.day;
    end if;
    moved_today := r.status = 'moved';
  end loop;

  if local_today is null then
    return;
  end if;

  freeze_available := last_freeze is null or local_today - last_freeze >= private.freeze_refill_days();
  freeze_back_on := case when freeze_available then null else last_freeze + private.freeze_refill_days() end;
  return next;
end;
$$;

-- What the app calls. Only members of the family get an answer.
create or replace function public.family_streak(p_family_id uuid)
returns table (
  family_streak integer,
  longest_streak integer,
  days_together_this_year integer,
  started_on date,
  latest_day_state text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_family_id not in (select private.my_family_ids()) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  return query select * from private.family_summary(p_family_id, now());
end;
$$;

create or replace function public.member_streaks(p_family_id uuid)
returns table (
  member_id uuid,
  local_today date,
  personal_streak integer,
  moved_today boolean,
  freeze_available boolean,
  freeze_back_on date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_family_id not in (select private.my_family_ids()) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  return query
    select s.*
      from public.members m
      cross join lateral private.member_summary(m.id, now()) s
     where m.family_id = p_family_id
     order by m.joined_at;
end;
$$;

revoke all on function public.family_streak(uuid) from public, anon;
revoke all on function public.member_streaks(uuid) from public, anon;
grant execute on function public.family_streak(uuid) to authenticated;
grant execute on function public.member_streaks(uuid) to authenticated;

revoke all on function private.freeze_refill_days() from public;
revoke all on function private.member_days(uuid, timestamptz) from public;
revoke all on function private.family_days(uuid, timestamptz) from public;
revoke all on function private.family_summary(uuid, timestamptz) from public;
revoke all on function private.member_summary(uuid, timestamptz) from public;
