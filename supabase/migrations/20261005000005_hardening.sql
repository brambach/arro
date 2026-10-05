-- Hardening after the first four migrations:
--   1. A workout can only be dated the member's own today or yesterday.
--   2. Join codes come from a secure random source, and guessing them is limited.
--   3. Clients can't choose an invite's expiry.
--   4. The weekly freeze refill is decided; the comment says so.

-- 1. Backdating ----------------------------------------------------------------
-- Nobody can log an older day to repair a broken family streak. The same rule
-- covers Health workouts: the app supplies source and health_workout_id, so the
-- server can't tell a real Health workout from a made-up one. The cost is that a
-- phone offline for more than a day loses those workouts, and Arro can't import
-- Health history from before someone joined.
--
-- Updates only check the date when local_date actually changes, so editing the
-- note or type of an old workout, or an app sending the whole row back, still works.
-- A member can still change their own timezone, which moves "today" by up to a day.
create or replace function private.check_workout_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_today date;
begin
  if tg_op = 'UPDATE' and new.local_date = old.local_date then
    return new;
  end if;

  select (now() at time zone m.timezone)::date into member_today
    from public.members m where m.id = new.member_id;
  -- No such member: the foreign key reports that.
  if member_today is null then
    return new;
  end if;

  if new.local_date > member_today then
    raise exception 'local_date % is after the member''s today (%)', new.local_date, member_today
      using errcode = '22023';
  end if;
  if new.local_date < member_today - 1 then
    raise exception 'local_date % is older than yesterday (%); workouts can only be logged for today or yesterday',
      new.local_date, member_today - 1
      using errcode = '22023';
  end if;
  return new;
end;
$$;

-- 2. Join codes ----------------------------------------------------------------
-- pgcrypto lives in the extensions schema on Supabase.
create extension if not exists pgcrypto with schema extensions;

-- Six characters from a 31-character alphabet. Bytes of 248 or more are skipped
-- so every character is equally likely (248 = 31 * 8).
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
  random_bytes bytea;
  i integer;
  b integer;
begin
  loop
    candidate := '';
    while length(candidate) < 6 loop
      random_bytes := extensions.gen_random_bytes(16);
      i := 0;
      while i < 16 and length(candidate) < 6 loop
        b := get_byte(random_bytes, i);
        i := i + 1;
        if b < 248 then
          candidate := candidate || substr(alphabet, 1 + b % 31, 1);
        end if;
      end loop;
    end loop;
    exit when not exists (select 1 from public.invites where code = candidate);
  end loop;
  return candidate;
end;
$$;

-- Failed code lookups, so guessing can be slowed down. Written only by
-- preview_invite, which runs as the owner. Nobody else can read or write it.
create table private.invite_attempts (
  id bigint generated always as identity primary key,
  caller text not null,
  attempted_at timestamptz not null default now()
);

create index invite_attempts_caller_idx on private.invite_attempts (caller, attempted_at);
create index invite_attempts_attempted_at_idx on private.invite_attempts (attempted_at);

alter table private.invite_attempts enable row level security;
revoke all on private.invite_attempts from public, anon, authenticated;

-- Who is asking: the signed-in user, else the IP address PostgREST passes along.
-- The proxy headers can be forged by a client, so this is a best-effort key and
-- the global cap in preview_invite is what actually holds.
create or replace function private.invite_caller()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  headers json := nullif(current_setting('request.headers', true), '')::json;
begin
  if uid is not null then
    return 'user:' || uid::text;
  end if;
  return 'ip:' || coalesce(
    nullif(btrim(headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'unknown'
  );
end;
$$;

-- The return type changes (member_count), so the function is dropped and rebuilt.
-- It's volatile now because it records failed lookups.
--
-- Before sign-in (no user) it gives only the family name, how many people are in
-- it and the expiry. Signed in, with a valid code, it also gives the inviter, the
-- members' names, colours and photo paths, and the family streak.
--
-- Limits, counted over failed lookups only:
--   10 per caller per 15 minutes, and 200 across everyone per hour.
-- Past a limit it raises PT429 (PostgREST answers HTTP 429). The global cap means
-- someone cycling through forged IP headers still can't scan the code space, but
-- it also means a flood of bad guesses can lock everyone out of previews for up to
-- an hour. A real per-IP limit needs an edge function (or the API gateway) in front
-- of this call; SQL can't see a trustworthy client address.
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
  expires_at timestamptz
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
  if (select count(*) from private.invite_attempts a
       where a.caller = v_caller and a.attempted_at > now() - interval '15 minutes') >= 10
     or (select count(*) from private.invite_attempts a
          where a.attempted_at > now() - interval '1 hour') >= 200 then
    raise exception 'too many attempts, try again later' using errcode = 'PT429';
  end if;

  select * into inv from public.invites i
   where i.code = upper(btrim(p_code)) and i.expires_at > now();
  if not found then
    delete from private.invite_attempts a where a.attempted_at < now() - interval '1 day';
    insert into private.invite_attempts (caller) values (v_caller);
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
             inv.expires_at
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
           inv.expires_at
      from public.families f
      join public.members m on m.family_id = f.id
     where f.id = inv.family_id
     group by f.id, f.name;
end;
$$;

revoke all on function private.invite_caller() from public;
revoke all on function public.preview_invite(text) from public;
-- The invitee may not have signed in yet when they open the link.
grant execute on function public.preview_invite(text) to anon, authenticated;

-- 3. Invite expiry -------------------------------------------------------------
-- Nothing sets expires_at on purpose, so the 14-day default always applies.
revoke insert (family_id, invited_by, expires_at) on public.invites from authenticated;
grant insert (family_id, invited_by) on public.invites to authenticated;

-- 4. Freeze --------------------------------------------------------------------
-- Same body as before. Only the comment changes: the decision is made.
create or replace function private.freeze_refill_days()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 7;
$$;

comment on function private.freeze_refill_days() is
  'Decided Oct 2026: a used freeze comes back 7 days later, so each person gets one a week. Changing it recalculates every streak, past days included.';
