-- Arro schema: families, members, invites, workouts, cheers, nudges, family_plans.
-- Every row hangs off a family, and every member row hangs off auth.users, so
-- deleting an account removes that person's members, workouts, cheers and nudges
-- by cascade. A family with no members left is deleted with its invites and plan.

create schema if not exists private;
revoke all on schema private from public;
-- Policies call helpers in here, so signed-in users need to reach the schema.
-- It isn't exposed through the Data API.
grant usage on schema private to authenticated;

create or replace function private.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- Member colours, in join order. Mirrors memberPalette in src/theme/tokens.ts.
create or replace function private.member_palette()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['#EF6C1A', '#DF6B96', '#4F97CF', '#4FA06B', '#7B7FD0', '#D9A23A'];
$$;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  colour text not null check (colour ~ '^#[0-9A-Fa-f]{6}$'),
  -- Path in Supabase Storage, not a URL.
  photo_path text,
  -- IANA name, such as 'Australia/Brisbane'. "Today" is this zone's calendar day.
  timezone text not null check (private.is_valid_timezone(timezone)),
  reminder_time time,
  joined_at timestamptz not null default now(),
  -- The member's local date when they joined, fixed even if they move zones later.
  joined_on date not null,
  unique (family_id, user_id)
);

create index members_user_id_idx on public.members (user_id);

create or replace function private.set_member_joined_on()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.joined_on := (new.joined_at at time zone new.timezone)::date;
  return new;
end;
$$;

create trigger members_set_joined_on
before insert on public.members
for each row execute function private.set_member_joined_on();

-- Short codes people can read out or type: no 0/O or 1/I/L.
create or replace function private.new_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      into candidate
      from generate_series(1, 6);
    exit when not exists (select 1 from public.invites where code = candidate);
  end loop;
  return candidate;
end;
$$;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default private.new_join_code(),
  family_id uuid not null references public.families (id) on delete cascade,
  invited_by uuid references public.members (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

create index invites_family_id_idx on public.invites (family_id);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  -- The member's own calendar day for the workout, set by the app.
  local_date date not null,
  type text not null check (type in ('walk', 'run', 'gym', 'yoga', 'swim', 'ride', 'other')),
  duration_minutes integer check (duration_minutes between 1 and 1440),
  source text not null check (source in ('health', 'manual')),
  -- HealthKit workout UUID, so a re-sync doesn't add the same workout twice.
  health_workout_id text,
  photo_path text,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check ((source = 'health') = (health_workout_id is not null)),
  unique (member_id, health_workout_id)
);

create index workouts_member_date_idx on public.workouts (member_id, local_date);

-- A workout can't be dated after the member's own today.
create or replace function private.check_workout_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_today date;
begin
  select (now() at time zone m.timezone)::date into member_today
    from public.members m where m.id = new.member_id;
  if new.local_date > member_today then
    raise exception 'local_date % is after the member''s today (%)', new.local_date, member_today
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger workouts_check_date
before insert or update of local_date on public.workouts
for each row execute function private.check_workout_date();

create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  -- Who cheered.
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workout_id, member_id)
);

create index cheers_member_id_idx on public.cheers (member_id);

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references public.members (id) on delete cascade,
  to_member_id uuid not null references public.members (id) on delete cascade,
  -- The recipient's local day, set by trigger.
  local_date date not null,
  created_at timestamptz not null default now(),
  check (from_member_id <> to_member_id),
  -- At most one nudge per person per day (healthy-contact rule 4).
  unique (to_member_id, local_date)
);

create index nudges_from_member_id_idx on public.nudges (from_member_id);

create or replace function private.set_nudge_local_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select (now() at time zone m.timezone)::date into new.local_date
    from public.members m where m.id = new.to_member_id;
  return new;
end;
$$;

create trigger nudges_set_local_date
before insert on public.nudges
for each row execute function private.set_nudge_local_date();

-- Arro Family subscription state, written only by the RevenueCat webhook (service
-- role). Empty until the paid plan ships.
create table public.family_plans (
  family_id uuid primary key references public.families (id) on delete cascade,
  -- Kept as null if the payer leaves; the plan runs to expires_at, then lapses.
  payer_member_id uuid references public.members (id) on delete set null,
  product text not null,
  status text not null check (status in ('trial', 'active', 'grace_period', 'billing_issue', 'cancelled', 'expired')),
  expires_at timestamptz,
  last_event text,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

create index family_plans_payer_member_id_idx on public.family_plans (payer_member_id);

-- When the last member leaves or deletes their account, the family goes too.
create or replace function private.delete_empty_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.families f
   where f.id = old.family_id
     and not exists (select 1 from public.members m where m.family_id = old.family_id);
  return null;
end;
$$;

create trigger members_delete_empty_family
after delete on public.members
for each row execute function private.delete_empty_family();
