-- Saunafam build 9, part 3: weekly streaks, worked out from sessions on every
-- read, like Arro's daily streaks (20261005000003). The rules are the spec's
-- "Weekly streak rules" (design/saunafam-spec.md, section 3):
--   * Weeks start on the family's week_starts_on and run on each member's own
--     local calendar dates.
--   * A day counts if the member has a session that day at or above the family
--     minimum in force that week. Two sessions on one day count once.
--   * Member week status, in order: kept, pending, joined, paused (4 or more
--     break days that week), frozen (one freeze, back 4 weeks after it's used),
--     missed.
--   * Personal streak: kept and frozen add one, missed resets, the rest hold.
--   * Family week, from the week the second member joined: broken if an expected
--     member missed, else pending if one is pending, else skip if nobody was
--     expected, else counted. A member is expected from the week after they join.
--   * Nothing before families.saunafam_started_on counts. The week containing it
--     is treated like a join week for everyone: it counts if kept and never
--     breaks, because nobody can log a session until they have build 9.
-- The private functions take p_as_of so tests can pin "now". Public wrappers
-- check membership through private.my_family_ids().
-- Arro's daily functions (family_streak, member_streaks) stay for build 8.

create or replace function private.freeze_refill_weeks()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 4;
$$;

comment on function private.freeze_refill_weeks() is
  'A freeze used in week W is available again from week W+4. Changing it recalculates every streak, past weeks included.';

-- The rule in force for a week: the latest family_rules row on or before it.
-- Falls back to the family's own columns if there's no row at all.
create or replace function private.rule_for_week(p_family_id uuid, p_week_start date)
returns table (goal_per_week integer, min_minutes integer)
language sql
stable
set search_path = ''
as $$
  select coalesce(r.goal_per_week, f.goal_per_week)::integer, coalesce(r.min_minutes, f.min_minutes)::integer
    from public.families f
    left join lateral (
      select fr.goal_per_week, fr.min_minutes from public.family_rules fr
       where fr.family_id = f.id and fr.effective_from <= p_week_start
       order by fr.effective_from desc
       limit 1
    ) r on true
   where f.id = p_family_id;
$$;

-- A member's first week: their join week, or the build 9 reset week if later.
create or replace function private.member_first_week(p_joined_on date, p_started_on date, p_week_starts_on smallint)
returns date
language sql
immutable
set search_path = ''
as $$
  select greatest(private.week_start(p_joined_on, p_week_starts_on), private.week_start(p_started_on, p_week_starts_on));
$$;

-- One row per week from the member's first week to their current week.
--   counted_days  distinct days with a session at or above that week's minimum
--   days          those dates
--   paused_days   days of that week inside a break
--   status        kept, pending, joined, paused, frozen or missed
create or replace function private.member_weeks(p_member_id uuid, p_as_of timestamptz default now())
returns table (
  week_start date,
  counted_days integer,
  goal integer,
  min_minutes integer,
  paused_days integer,
  days date[],
  status text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  m public.members;
  f public.families;
  member_today date;
  cur date;
  first date;
  last_freeze date;
  refill integer := private.freeze_refill_weeks() * 7;
  r record;
begin
  select * into m from public.members where id = p_member_id;
  if not found then
    return;
  end if;
  select * into f from public.families where id = m.family_id;

  member_today := (p_as_of at time zone m.timezone)::date;
  cur := private.week_start(member_today, f.week_starts_on);
  first := private.member_first_week(m.joined_on, f.saunafam_started_on, f.week_starts_on);

  for r in
    with weeks as (
      select g::date as ws from generate_series(first, cur, interval '7 days') g
    ),
    rules as (
      select w.ws, ru.goal_per_week as goal, ru.min_minutes as min_minutes
        from weeks w cross join lateral private.rule_for_week(f.id, w.ws) ru
    ),
    counted as (
      select ru.ws, array_agg(distinct s.local_date order by s.local_date) as days
        from rules ru
        join public.sessions s
          on s.member_id = p_member_id
         and s.local_date between ru.ws and ru.ws + 6
         and s.local_date >= f.saunafam_started_on
         and s.duration_minutes >= ru.min_minutes
       group by ru.ws
    ),
    paused as (
      select w.ws, count(distinct d)::integer as n
        from weeks w
        join public.pauses p
          on p.member_id = p_member_id and p.starts_on <= w.ws + 6 and p.ends_on >= w.ws
        cross join lateral generate_series(greatest(p.starts_on, w.ws), least(p.ends_on, w.ws + 6), interval '1 day') d
       group by w.ws
    )
    select ru.ws, ru.goal, ru.min_minutes, coalesce(c.days, '{}') as days,
           coalesce(cardinality(c.days), 0) as n, coalesce(pa.n, 0) as paused_n
      from rules ru
      left join counted c on c.ws = ru.ws
      left join paused pa on pa.ws = ru.ws
     order by ru.ws
  loop
    week_start := r.ws;
    counted_days := r.n;
    goal := r.goal;
    min_minutes := r.min_minutes;
    paused_days := r.paused_n;
    days := r.days;
    if r.n >= r.goal then
      status := 'kept';
    elsif member_today <= r.ws + 6 then
      status := 'pending';
    elsif r.ws = first then
      status := 'joined';
    elsif r.paused_n >= 4 then
      status := 'paused';
    elsif last_freeze is null or r.ws >= last_freeze + refill then
      status := 'frozen';
      last_freeze := r.ws;
    else
      status := 'missed';
    end if;
    return next;
  end loop;
end;
$$;

-- One row per family week, from the week the second member joined (or the reset
-- week, if later) to the latest current week across the family's time zones.
-- freeze_used is true when an expected member's freeze covered the week.
create or replace function private.family_weeks(p_family_id uuid, p_as_of timestamptz default now())
returns table (week_start date, state text, freeze_used boolean)
language sql
stable
set search_path = ''
as $$
  with fam as (
    select f.id, f.week_starts_on, f.saunafam_started_on from public.families f where f.id = p_family_id
  ),
  mem as (
    select m.id, m.joined_at,
           private.member_first_week(m.joined_on, fam.saunafam_started_on, fam.week_starts_on) as first_week,
           private.week_start((p_as_of at time zone m.timezone)::date, fam.week_starts_on) as cur_week
      from public.members m join fam on m.family_id = fam.id
  ),
  bounds as (
    select (select max(t.first_week) from (select first_week from mem order by joined_at, id limit 2) t) as start_week,
           (select max(cur_week) from mem) as end_week,
           (select count(*) from mem) as member_count
  ),
  weeks as (
    select g::date as ws
      from bounds, generate_series(bounds.start_week, bounds.end_week, interval '7 days') g
     where bounds.member_count >= 2
  ),
  member_status as (
    select mem.id, w.week_start, w.status
      from mem cross join lateral private.member_weeks(mem.id, p_as_of) w
  ),
  expected as (
    -- A week past a member's own current week is pending for them. In the week
    -- someone joins they're only counted if they keep it.
    select weeks.ws, mem.id, coalesce(ms.status, 'pending') as status
      from weeks
      join mem on mem.first_week <= weeks.ws
      left join member_status ms on ms.id = mem.id and ms.week_start = weeks.ws
     where mem.first_week < weeks.ws or ms.status = 'kept'
  )
  select weeks.ws,
         case
           when bool_or(e.status = 'missed') then 'broken'
           when bool_or(e.status = 'pending') then 'pending'
           when count(e.id) filter (where e.status <> 'paused') = 0 then 'skip'
           else 'counted'
         end,
         coalesce(bool_or(e.status = 'frozen'), false)
    from weeks
    left join expected e on e.ws = weeks.ws
   group by weeks.ws
   order by weeks.ws;
$$;

create or replace function private.family_week_summary(p_family_id uuid, p_as_of timestamptz default now())
returns table (
  family_streak integer,
  longest_streak integer,
  weeks_together_this_year integer,
  started_on date,
  latest_week_state text
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
  weeks_together_this_year := 0;

  select extract(year from max((p_as_of at time zone m.timezone)::date))::integer into this_year
    from public.members m where m.family_id = p_family_id;

  for r in select * from private.family_weeks(p_family_id, p_as_of) loop
    started_on := coalesce(started_on, r.week_start);
    latest_week_state := r.state;
    if r.state = 'counted' then
      family_streak := family_streak + 1;
      longest_streak := greatest(longest_streak, family_streak);
      if extract(year from r.week_start) = this_year then
        weeks_together_this_year := weeks_together_this_year + 1;
      end if;
    elsif r.state = 'broken' then
      family_streak := 0;
    end if;
  end loop;

  return next;
end;
$$;

-- A member's current week and streak.
--   week_start, counted_days, counted_dates, goal, min_minutes: this week
--   kept_this_week     counted_days >= goal
--   last_week_status   last week's status (null if they weren't here), for
--                      "Did you sauna on Sunday?" on Monday morning
--   freeze_back_on     the week start the freeze returns, when it's used
--   paused_until       the last day of the break they're on today, or null
create or replace function private.member_week_summary(p_member_id uuid, p_as_of timestamptz default now())
returns table (
  member_id uuid,
  local_today date,
  week_start date,
  counted_days integer,
  counted_dates date[],
  goal integer,
  min_minutes integer,
  personal_streak integer,
  longest_personal_streak integer,
  kept_this_week boolean,
  last_week_status text,
  freeze_available boolean,
  freeze_back_on date,
  paused_until date
)
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  m public.members;
  wso smallint;
  last_freeze date;
  refill integer := private.freeze_refill_weeks() * 7;
begin
  select * into m from public.members where id = p_member_id;
  if not found then
    return;
  end if;
  select f.week_starts_on into wso from public.families f where f.id = m.family_id;

  member_id := p_member_id;
  local_today := (p_as_of at time zone m.timezone)::date;
  week_start := private.week_start(local_today, wso);
  counted_days := 0;
  counted_dates := '{}';
  personal_streak := 0;
  longest_personal_streak := 0;
  select ru.goal_per_week, ru.min_minutes into goal, min_minutes from private.rule_for_week(m.family_id, week_start) ru;

  for r in select * from private.member_weeks(p_member_id, p_as_of) loop
    if r.status in ('kept', 'frozen') then
      personal_streak := personal_streak + 1;
      longest_personal_streak := greatest(longest_personal_streak, personal_streak);
    elsif r.status = 'missed' then
      personal_streak := 0;
    end if;
    if r.status = 'frozen' then
      last_freeze := r.week_start;
    end if;
    if r.week_start = week_start - 7 then
      last_week_status := r.status;
    end if;
    if r.week_start = week_start then
      counted_days := r.counted_days;
      counted_dates := r.days;
    end if;
  end loop;

  kept_this_week := counted_days >= goal;
  freeze_available := last_freeze is null or week_start >= last_freeze + refill;
  freeze_back_on := case when freeze_available then null else last_freeze + refill end;
  select max(p.ends_on) into paused_until from public.pauses p
   where p.member_id = p_member_id and local_today between p.starts_on and p.ends_on;
  return next;
end;
$$;

-- How many past weeks the history may return. Build 9 free: any number asked
-- for, at least 1. The Plus migration (20261021000006) replaces this to clamp
-- to 12 weeks unless the family has Plus.
create or replace function private.history_weeks_allowed(p_family_id uuid, p_weeks integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select greatest(1, least(coalesce(p_weeks, 12), 520));
$$;

-- Past weeks for the Week screen, newest first: one row per member per week,
-- for weeks before the caller's current week, back to the family's first week.
-- p_weeks is how many weeks (see history_weeks_allowed).
--   family_state  counted, broken, skip or pending; null before the family
--                 streak started (fewer than two people)
--   freeze_used   someone's freeze covered the week (never says whose)
--   status        the member's week. The caller sees their own as it is; for
--                 everyone else frozen and missed both read 'not_kept', so a
--                 missed week is never pinned on anyone.
create or replace function private.family_week_history(
  p_family_id uuid,
  p_member_id uuid,
  p_weeks integer,
  p_as_of timestamptz default now()
)
returns table (
  week_start date,
  family_state text,
  freeze_used boolean,
  member_id uuid,
  status text,
  counted_days integer,
  goal integer,
  days date[]
)
language sql
stable
set search_path = ''
as $$
  with fam as (
    select f.id, f.week_starts_on, f.saunafam_started_on from public.families f where f.id = p_family_id
  ),
  me as (
    select private.week_start((p_as_of at time zone m.timezone)::date, fam.week_starts_on) as cur_week
      from public.members m, fam where m.id = p_member_id
  ),
  first as (
    select min(private.member_first_week(m.joined_on, fam.saunafam_started_on, fam.week_starts_on)) as first_week
      from public.members m, fam where m.family_id = fam.id
  ),
  weeks as (
    select g::date as ws
      from me, first,
           generate_series(me.cur_week - 7, first.first_week, interval '-7 days') g
     limit private.history_weeks_allowed(p_family_id, p_weeks)
  ),
  fw as (
    select * from private.family_weeks(p_family_id, p_as_of)
  ),
  mw as (
    select m.id, m.joined_at, w.*
      from public.members m
      cross join lateral private.member_weeks(m.id, p_as_of) w
     where m.family_id = p_family_id
       and w.week_start in (select ws from weeks)
  )
  select weeks.ws, fw.state, coalesce(fw.freeze_used, false), mw.id,
         case when mw.id = p_member_id or mw.status not in ('frozen', 'missed') then mw.status else 'not_kept' end,
         mw.counted_days, mw.goal, mw.days
    from weeks
    left join fw on fw.week_start = weeks.ws
    join mw on mw.week_start = weeks.ws
   order by weeks.ws desc, mw.joined_at, mw.id;
$$;

-- Wrappers the app calls ---------------------------------------------------------------
create or replace function public.family_week_streak(p_family_id uuid)
returns table (
  family_streak integer,
  longest_streak integer,
  weeks_together_this_year integer,
  started_on date,
  latest_week_state text
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
  return query select * from private.family_week_summary(p_family_id, now());
end;
$$;

create or replace function public.member_week_streaks(p_family_id uuid)
returns table (
  member_id uuid,
  local_today date,
  week_start date,
  counted_days integer,
  counted_dates date[],
  goal integer,
  min_minutes integer,
  personal_streak integer,
  longest_personal_streak integer,
  kept_this_week boolean,
  last_week_status text,
  freeze_available boolean,
  freeze_back_on date,
  paused_until date
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
      cross join lateral private.member_week_summary(m.id, now()) s
     where m.family_id = p_family_id
     order by m.joined_at, m.id;
end;
$$;

create or replace function public.family_week_history(p_family_id uuid, p_weeks integer default 12)
returns table (
  week_start date,
  family_state text,
  freeze_used boolean,
  member_id uuid,
  status text,
  counted_days integer,
  goal integer,
  days date[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid;
begin
  select m.id into me from public.members m where m.family_id = p_family_id and m.user_id = auth.uid();
  if me is null then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  return query select * from private.family_week_history(p_family_id, me, p_weeks, now());
end;
$$;

-- The caller's own numbers for the Me screen, in their own time zone:
-- sessions this calendar month, heat minutes this calendar year, and their most
-- logged sauna type and place (ties go to the most recent). Short sessions count
-- here; they only don't count toward the week.
create or replace function public.my_session_stats(p_family_id uuid)
returns table (
  sessions_this_month integer,
  minutes_this_year integer,
  favorite_sauna_type text,
  favorite_place text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.members;
  today date;
begin
  select * into me from public.members m where m.family_id = p_family_id and m.user_id = auth.uid();
  if not found then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  today := (now() at time zone me.timezone)::date;

  return query
    select
      (select count(*)::integer from public.sessions s
        where s.member_id = me.id and s.local_date >= date_trunc('month', today)::date),
      (select coalesce(sum(s.duration_minutes), 0)::integer from public.sessions s
        where s.member_id = me.id and s.local_date >= date_trunc('year', today)::date),
      (select s.sauna_type from public.sessions s where s.member_id = me.id
        group by s.sauna_type order by count(*) desc, max(s.started_at) desc limit 1),
      (select min(s.place) from public.sessions s where s.member_id = me.id and s.place is not null
        group by lower(s.place) order by count(*) desc, max(s.started_at) desc limit 1);
end;
$$;

-- preview_invite: the invitee's "Meet the family" step shows the weekly streak
-- and the family's rhythm. Same as 20261017000001 plus three columns at the end;
-- family_streak keeps Arro's daily number for build 8. Signed out, the new
-- columns are null like the other family details.
drop function public.preview_invite(text);

create function public.preview_invite(p_code text)
returns table (
  family_name text,
  member_count integer,
  invited_by_name text,
  member_names text[],
  member_colours text[],
  member_photo_paths text[],
  family_streak integer,
  expires_at timestamptz,
  week_streak integer,
  goal_per_week integer,
  min_minutes integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  inv public.invites;
  v_caller text := private.invite_caller();
  signed_in boolean := auth.uid() is not null;
begin
  if private.too_many_invite_attempts(v_caller) then
    raise exception 'too many attempts, try again later' using errcode = 'PT429';
  end if;

  select * into inv from public.invites i
   where i.code = upper(btrim(p_code)) and i.expires_at > now();
  if not found then
    perform private.log_invite_attempt(v_caller);
    return;
  end if;

  if not signed_in then
    return query
      select f.name,
             count(m.id)::integer,
             null::text,
             null::text[],
             null::text[],
             null::text[],
             null::integer,
             inv.expires_at,
             null::integer,
             null::integer,
             null::integer
        from public.families f
        join public.members m on m.family_id = f.id
       where f.id = inv.family_id
       group by f.id, f.name;
    return;
  end if;

  return query
    select f.name,
           count(m.id)::integer,
           (select im.display_name from public.members im where im.id = inv.invited_by),
           array_agg(m.display_name order by m.joined_at),
           array_agg(m.colour order by m.joined_at),
           array_agg(m.photo_path order by m.joined_at),
           (select s.family_streak from private.family_summary(f.id, now()) s),
           inv.expires_at,
           (select s.family_streak from private.family_week_summary(f.id, now()) s),
           f.goal_per_week::integer,
           f.min_minutes::integer
      from public.families f
      join public.members m on m.family_id = f.id
     where f.id = inv.family_id
     group by f.id, f.name;
end;
$$;

revoke all on function public.preview_invite(text) from public;
-- The invitee may not have signed in yet when they open the link.
grant execute on function public.preview_invite(text) to anon, authenticated;

revoke all on function private.freeze_refill_weeks() from public;
revoke all on function private.rule_for_week(uuid, date) from public;
revoke all on function private.member_first_week(date, date, smallint) from public;
revoke all on function private.member_weeks(uuid, timestamptz) from public;
revoke all on function private.family_weeks(uuid, timestamptz) from public;
revoke all on function private.family_week_summary(uuid, timestamptz) from public;
revoke all on function private.member_week_summary(uuid, timestamptz) from public;
revoke all on function private.history_weeks_allowed(uuid, integer) from public;
revoke all on function private.family_week_history(uuid, uuid, integer, timestamptz) from public;
revoke all on function public.family_week_streak(uuid) from public, anon;
revoke all on function public.member_week_streaks(uuid) from public, anon;
revoke all on function public.family_week_history(uuid, integer) from public, anon;
revoke all on function public.my_session_stats(uuid) from public, anon;
grant execute on function public.family_week_streak(uuid) to authenticated;
grant execute on function public.member_week_streaks(uuid) to authenticated;
grant execute on function public.family_week_history(uuid, integer) to authenticated;
grant execute on function public.my_session_stats(uuid) to authenticated;
