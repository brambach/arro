-- Saunafam build 9, part 1: the family's weekly rhythm, app config and member colors.
--   1. families gets goal_per_week, min_minutes, week_starts_on and
--      saunafam_started_on (the build 9 reset line).
--   2. family_rules keeps every rhythm a family has had, so past weeks are always
--      judged by the rule in effect then. set_family_rules changes it from next week.
--   3. app_config holds min_ios_build, read by anyone through public.app_config().
--   4. create_family takes the rhythm as optional arguments; build 8's call still works.
--   5. The member palette changes to the Löyly colors.
-- Build 9 only adds. Nothing build 8 reads is dropped or changed in shape.

-- 1. Families ------------------------------------------------------------------
-- The current values, for display. The history lives in family_rules.
-- saunafam_started_on defaults to the day this runs (UTC), so every existing
-- family starts fresh at week one; the week containing it is week one.
alter table public.families
  add column goal_per_week smallint not null default 3 check (goal_per_week between 1 and 7),
  add column min_minutes smallint not null default 10 check (min_minutes between 1 and 60),
  add column week_starts_on smallint not null default 1 check (week_starts_on in (1, 7)),
  add column saunafam_started_on date not null default current_date;

-- The first day of the week containing d, for a week that starts on ISO weekday
-- starts_on (1 = Monday, 7 = Sunday).
create or replace function private.week_start(d date, starts_on smallint)
returns date
language sql
immutable
set search_path = ''
as $$
  select d - ((extract(isodow from d)::integer - starts_on + 7) % 7);
$$;

revoke all on function private.week_start(date, smallint) from public;

-- 2. Family rules ----------------------------------------------------------------
create table public.family_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  -- A week start date. The rule applies to that week and every week after it,
  -- until a later row takes over.
  effective_from date not null,
  goal_per_week smallint not null check (goal_per_week between 1 and 7),
  min_minutes smallint not null check (min_minutes between 1 and 60),
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, effective_from)
);

create index family_rules_created_by_idx on public.family_rules (created_by);

alter table public.family_rules enable row level security;
revoke all on public.family_rules from anon, authenticated;
-- Written only by the family trigger below and set_family_rules.
grant select on public.family_rules to authenticated;

create policy "Members read their family's rules" on public.family_rules
  for select to authenticated
  using (family_id in (select private.my_family_ids()));

-- Every family's first rule. 2000-01-03 is a Monday, so it's before any week
-- anyone will ever log; a Sunday-start family gets the Sunday before it.
create or replace function private.first_rule_date(p_week_starts_on smallint)
returns date
language sql
immutable
set search_path = ''
as $$
  select private.week_start(date '2000-01-03', p_week_starts_on);
$$;

revoke all on function private.first_rule_date(smallint) from public;

insert into public.family_rules (family_id, effective_from, goal_per_week, min_minutes)
select f.id, private.first_rule_date(f.week_starts_on), f.goal_per_week, f.min_minutes
  from public.families f;

-- Every new family gets its first rule from its own columns, however it's made
-- (create_family, or a test fixture).
create or replace function private.seed_family_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.family_rules (family_id, effective_from, goal_per_week, min_minutes)
  values (new.id, private.first_rule_date(new.week_starts_on), new.goal_per_week, new.min_minutes)
  on conflict (family_id, effective_from) do nothing;
  return null;
end;
$$;

create trigger families_seed_rules
after insert on public.families
for each row execute function private.seed_family_rules();

revoke all on function private.seed_family_rules() from public;

-- Changes the family's goal and minimum from the start of next week, in the
-- caller's own time zone. The founder only. Calling it again in the same week
-- replaces that pending change. Returns the date the change takes effect.
create or replace function public.set_family_rules(p_family_id uuid, p_goal integer, p_min_minutes integer)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam public.families;
  me public.members;
  next_week date;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;

  select * into me from public.members m where m.family_id = p_family_id and m.user_id = auth.uid();
  if not found then
    raise exception 'only the person who started the family can change its rules' using errcode = '42501';
  end if;

  select * into fam from public.families f where f.id = p_family_id for update;
  if private.family_founder(p_family_id) is distinct from auth.uid() then
    raise exception 'only the person who started the family can change its rules' using errcode = '42501';
  end if;

  if p_goal is null or p_goal < 1 or p_goal > 7 then
    raise exception 'the goal is 1 to 7 sessions a week' using errcode = '22023';
  end if;
  if p_min_minutes is null or p_min_minutes < 1 or p_min_minutes > 60 then
    raise exception 'the minimum is 1 to 60 minutes' using errcode = '22023';
  end if;

  next_week := private.week_start((now() at time zone me.timezone)::date, fam.week_starts_on) + 7;

  insert into public.family_rules (family_id, effective_from, goal_per_week, min_minutes, created_by)
  values (p_family_id, next_week, p_goal, p_min_minutes, me.id)
  on conflict (family_id, effective_from) do update
    set goal_per_week = excluded.goal_per_week,
        min_minutes = excluded.min_minutes,
        created_by = excluded.created_by,
        created_at = now();

  update public.families
     set goal_per_week = p_goal, min_minutes = p_min_minutes
   where id = p_family_id;

  return next_week;
end;
$$;

revoke all on function public.set_family_rules(uuid, integer, integer) from public, anon;
grant execute on function public.set_family_rules(uuid, integer, integer) to authenticated;

-- 3. App config ----------------------------------------------------------------
-- One row. The app reads it on launch through public.app_config().
create table public.app_config (
  id boolean primary key default true check (id),
  min_ios_build integer not null default 9
);

insert into public.app_config (id) values (true);

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- Callable before sign-in, like preview_invite.
create or replace function public.app_config()
returns table (min_ios_build integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.min_ios_build from public.app_config c where c.id;
$$;

revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated;

-- 4. create_family ---------------------------------------------------------------
-- Build 8 calls create_family(p_family_name, p_display_name, p_timezone,
-- p_reminder_time). The new arguments have defaults, so that call still works.
-- The old four-argument function is dropped first; leaving it beside this one
-- would make a four-argument call ambiguous.
drop function public.create_family(text, text, text, time);

create function public.create_family(
  p_family_name text,
  p_display_name text,
  p_timezone text,
  p_reminder_time time default null,
  p_goal integer default 3,
  p_min_minutes integer default 10,
  p_week_starts_on integer default 1
)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family public.families;
  founder public.members;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if p_goal is null or p_goal < 1 or p_goal > 7 then
    raise exception 'the goal is 1 to 7 sessions a week' using errcode = '22023';
  end if;
  if p_min_minutes is null or p_min_minutes < 1 or p_min_minutes > 60 then
    raise exception 'the minimum is 1 to 60 minutes' using errcode = '22023';
  end if;
  if p_week_starts_on is null or p_week_starts_on not in (1, 7) then
    raise exception 'a week starts on Monday (1) or Sunday (7)' using errcode = '22023';
  end if;

  -- The families trigger writes the first family_rules row from these columns.
  insert into public.families (name, goal_per_week, min_minutes, week_starts_on)
  values (btrim(p_family_name), p_goal, p_min_minutes, p_week_starts_on)
  returning * into new_family;

  insert into public.members (family_id, user_id, display_name, colour, timezone, reminder_time)
  values (new_family.id, auth.uid(), btrim(p_display_name), private.next_member_colour(new_family.id),
          p_timezone, p_reminder_time)
  returning * into founder;

  return founder;
end;
$$;

revoke all on function public.create_family(text, text, text, time, integer, integer, integer) from public, anon;
grant execute on function public.create_family(text, text, text, time, integer, integer, integer) to authenticated;

-- 5. Member palette --------------------------------------------------------------
-- Löyly: lake, brass, heather, moss, lingonberry, ember. Ember goes last so the
-- founder's face never matches the main button. Mirrors memberPalette in
-- src/theme/tokens.ts. Existing members keep the color they have; only people
-- who join from now on get these.
create or replace function private.member_palette()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['#5F8794', '#B58A3C', '#7B6A93', '#6E7F5C', '#B66A78', '#C9542A'];
$$;
